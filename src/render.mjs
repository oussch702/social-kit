// Renders a checked spec to PNGs (and a PDF per carousel) with one headless Chrome.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch } from './chrome.mjs';
import { loadSpec } from './spec.mjs';
import { documentHtml, carousel, story, highlight, banner, og, quote } from './templates.mjs';

export function pngSize(file) {
  const fd = fs.openSync(file, 'r');
  const head = Buffer.alloc(24);
  fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  if (head.toString('ascii', 12, 16) !== 'IHDR') throw new Error(`${file} is not a PNG`);
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

export function pdfPageCount(file) {
  return (fs.readFileSync(file, 'latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

const pngName = (f) => String(f).replace(/\.png$/i, '') + '.png';

// One job is one HTML document: every page in it shares a format and is captured in one pass.
function jobs(spec, brand) {
  const out = [];
  for (const deck of spec.carousel) {
    out.push({
      format: carousel,
      dir: deck.name,
      pages: deck.slides.map((s, index) => ({ html: carousel.page(s, { brand, index, total: deck.slides.length, deck }), file: `slide-${String(index + 1).padStart(2, '0')}.png` })),
      pdf: `${deck.name}.pdf`,
    });
  }
  if (spec.stories.length) out.push({ format: story, dir: 'stories', pages: spec.stories.map((s) => ({ html: story.page(s, { brand }), file: pngName(s.file) })) });
  if (spec.highlights.length) out.push({ format: highlight, dir: 'highlights', pages: spec.highlights.map((h) => ({ html: highlight.page(h, { brand }), file: pngName(h.file) })) });
  if (spec.banner.length) out.push({ format: banner, dir: '', pages: spec.banner.map((b) => ({ html: banner.page(b, { brand }), file: pngName(b.file) })) });
  if (spec.og.length) out.push({ format: og, dir: '', pages: spec.og.map((o) => ({ html: og.page(o, { brand }), file: pngName(o.file) })) });
  if (spec.quote.length) out.push({ format: quote, dir: '', pages: spec.quote.map((q) => ({ html: quote.page(q, { brand }), file: pngName(q.file) })) });
  return out;
}

// Renders `specFile` into `outDir`. Returns { files, notes, problems }.
// `problems` lists pages whose text still overflows; `notes` lists pages where text was scaled down to fit.
export async function render(specFile, outDir, { onFile = () => {}, browser } = {}) {
  const loaded = loadSpec(specFile);
  if (loaded.errors.length) {
    const err = new Error(`The spec has ${loaded.errors.length} problem${loaded.errors.length > 1 ? 's' : ''}:\n${loaded.errors.map((e) => `  - ${e}`).join('\n')}`);
    err.specErrors = loaded.errors;
    throw err;
  }
  const { spec, brand, warnings } = loaded;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'social-kit-'));
  const own = !browser;
  const chrome = browser || (await launch());
  const files = [];
  const notes = [...warnings];
  const problems = [];
  try {
    for (const job of jobs(spec, brand)) {
      const { width, height } = job.format;
      const dir = path.join(outDir, job.dir);
      fs.mkdirSync(dir, { recursive: true });
      const html = path.join(tmp, `${job.dir || job.pages[0].file}.html`);
      fs.writeFileSync(html, documentHtml(brand, job.format, job.pages.map((p) => p.html)));
      await chrome.page.open(pathToFileURL(html).href, width, height);
      const fit = (await chrome.page.evaluate('window.__fit')) || [];
      for (const [i, p] of job.pages.entries()) {
        const target = path.join(dir, p.file);
        const shot = await chrome.page.pngAt(width, height, i * height);
        fs.writeFileSync(target, shot);
        files.push(target);
        onFile(target);
        const rel = path.relative(outDir, target);
        const f = fit[i];
        if (f?.overflow) problems.push(`${rel}: the text is ${f.overflow}px too tall for the space, even after shrinking. Shorten it or split it.`);
        else if (f && f.zoom < 1) notes.push(`${rel}: text was scaled to ${Math.round(f.zoom * 100)}% to fit. Shorter text would read better.`);
      }
      if (job.pdf) {
        const target = path.join(dir, job.pdf);
        fs.writeFileSync(target, await chrome.page.pdf(width, height));
        files.push(target);
        onFile(target);
      }
    }
  } finally {
    if (own) await chrome.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return { files, notes, problems };
}
