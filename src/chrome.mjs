// Finds a local Chrome (or Chromium, or Edge), starts it headless and talks to it over the
// DevTools protocol with Node's built-in WebSocket. No npm packages, no poppler.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function onPath(names) {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  for (const name of names) {
    try {
      const found = execFileSync(cmd, [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/)[0].trim();
      if (found) return found;
    } catch {}
  }
  return null;
}

export function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env) {
    if (fs.existsSync(env)) return env;
    throw new Error(`CHROME_PATH is set to ${env}, but there is no file there.`);
  }
  const home = os.homedir();
  const candidates = [];
  if (process.platform === 'darwin') {
    for (const root of ['/Applications', path.join(home, 'Applications')]) {
      candidates.push(
        `${root}/Google Chrome.app/Contents/MacOS/Google Chrome`,
        `${root}/Chromium.app/Contents/MacOS/Chromium`,
        `${root}/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary`,
        `${root}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
        `${root}/Brave Browser.app/Contents/MacOS/Brave Browser`,
      );
    }
  } else if (process.platform === 'win32') {
    const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
    for (const root of roots) {
      candidates.push(
        path.join(root, 'Google/Chrome/Application/chrome.exe'),
        path.join(root, 'Chromium/Application/chrome.exe'),
        path.join(root, 'Microsoft/Edge/Application/msedge.exe'),
      );
    }
  } else {
    const found = onPath(['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable']);
    if (found) return found;
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium', '/opt/google/chrome/chrome');
  }
  const hit = candidates.find((c) => fs.existsSync(c));
  if (hit) return hit;
  throw new Error('Could not find Chrome, Chromium or Edge. Install Chrome, or set CHROME_PATH to the browser executable.');
}

// One headless browser with one tab. Call close() when done.
export async function launch() {
  if (typeof WebSocket !== 'function') {
    throw new Error(`social-kit needs Node 22 or newer (it uses the built-in WebSocket). You are on Node ${process.versions.node}.`);
  }
  const exe = findChrome();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'social-kit-chrome-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--hide-scrollbars',
    '--disable-gpu',
    '--disable-extensions',
    '--font-render-hinting=none',
    '--allow-file-access-from-files',
  ];
  // Linux CI runners often block Chrome's sandbox; only skip it there.
  if (process.platform === 'linux' && (process.env.CI || process.env.SOCIAL_KIT_NO_SANDBOX)) args.push('--no-sandbox');
  args.push('about:blank');
  const child = spawn(exe, args, { stdio: 'ignore' });
  let exited = false;
  child.once('exit', () => (exited = true));

  // Chrome writes the port it picked into DevToolsActivePort.
  const portFile = path.join(profile, 'DevToolsActivePort');
  let port;
  for (let i = 0; i < 150 && !port; i++) {
    if (exited) break;
    if (fs.existsSync(portFile)) port = Number(fs.readFileSync(portFile, 'utf8').split('\n')[0]);
    if (!port) await sleep(100);
  }
  if (!port) {
    child.kill();
    throw new Error(`Chrome did not start (${exe}). Set CHROME_PATH if this is the wrong browser.`);
  }

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    try {
      target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
    } catch {
      await sleep(100);
    }
  }
  if (!target) throw new Error('Could not open a tab in Chrome.');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', () => reject(new Error('Could not connect to Chrome.')), { once: true });
  });
  let seq = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject, method } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${method}: ${msg.error.message}`));
      else resolve(msg.result);
    }
  });
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`Page script failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result?.value;
  };

  const page = {
    // Loads a file URL at the given viewport size and waits until the page sets body[data-ready].
    async open(url, width, height) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await send('Page.navigate', { url });
      for (let i = 0; i < 200; i++) {
        await sleep(50);
        try {
          if (await evaluate(`document.readyState === 'complete' && document.body?.dataset.ready === '1'`)) return;
        } catch {}
      }
      throw new Error(`Timed out waiting for ${url} to render.`);
    },
    evaluate,
    // Captures the width x height region starting `y` pixels down the page.
    async pngAt(width, height, y = 0) {
      const r = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y, width, height, scale: 1 }, captureBeyondViewport: true });
      return Buffer.from(r.data, 'base64');
    },
    async pdf(width, height) {
      const r = await send('Page.printToPDF', {
        printBackground: true,
        preferCSSPageSize: true,
        paperWidth: width / 96,
        paperHeight: height / 96,
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
      });
      return Buffer.from(r.data, 'base64');
    },
  };

  const close = async () => {
    try {
      ws.close();
    } catch {}
    const gone = exited ? Promise.resolve() : new Promise((r) => child.once('exit', r));
    child.kill();
    await Promise.race([gone, sleep(3000)]);
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  };

  return { page, close };
}
