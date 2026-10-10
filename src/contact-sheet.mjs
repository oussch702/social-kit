// Tiles every PNG in a folder into one image, grouped by subfolder, so a person or an agent
// can review a whole render at a glance. Drawn by Chrome, so no image library is needed.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './chrome.mjs';
import { pngSize } from './render.mjs';
import { esc } from './templates.mjs';

export const SHEET_NAME = 'contact-sheet.png';

function findPngs(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.png') && e.name !== SHEET_NAME) out.push(p);
    }
  };
  walk(dir);
  return out;
}

export async function contactSheet(dir, outFile = path.join(dir, SHEET_NAME), { browser } = {}) {
  const pngs = findPngs(dir);
  if (!pngs.length) throw new Error(`No PNG files found in ${dir}.`);
  const groups = new Map();
  for (const p of pngs) {
    const key = path.relative(dir, path.dirname(p)) || 'single images';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const width = 2400;
  const tiles = (files) =>
    files
      .map((f) => {
        const { width: w, height: h } = pngSize(f);
        const scale = Math.min(520 / h, 900 / w);
        return `<figure><img src="${pathToFileURL(f).href}" width="${Math.round(w * scale)}" height="${Math.round(h * scale)}"><figcaption>${esc(path.basename(f))} <span>${w}×${h}</span></figcaption></figure>`;
      })
      .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;width:${width}px;padding:56px;box-sizing:border-box;background:#e8e8e3;font:500 22px/1.3 system-ui,sans-serif;color:#2b2d2a}
h2{margin:0 0 20px;font:700 26px/1 system-ui,sans-serif}
section{margin-bottom:56px}
.grid{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
figure{margin:0}
img{display:block;border-radius:6px;box-shadow:0 1px 2px rgb(0 0 0/.12),0 8px 24px rgb(0 0 0/.08)}
figcaption{margin-top:10px}
figcaption span{color:#7a7d76}
</style></head><body>${[...groups].sort(([a], [b]) => (a === 'single images') - (b === 'single images')).map(([g, files]) => `<section><h2>${esc(g)}</h2><div class="grid">${tiles(files)}</div></section>`).join('')}
<script>addEventListener('load',()=>{document.body.dataset.ready='1'})</script></body></html>`;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'social-kit-sheet-'));
  const own = !browser;
  const chrome = browser || (await launch());
  try {
    const file = path.join(tmp, 'sheet.html');
    fs.writeFileSync(file, html);
    await chrome.page.open(pathToFileURL(file).href, width, 800);
    const height = Math.ceil(await chrome.page.evaluate('document.documentElement.scrollHeight'));
    fs.writeFileSync(outFile, await chrome.page.pngAt(width, height, 0));
  } finally {
    if (own) await chrome.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { file: outFile, count: pngs.length };
}
