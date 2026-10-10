#!/usr/bin/env node
// social-kit command line: render, check, init, contact-sheet, icons.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../src/brand.mjs';
import { launch } from '../src/chrome.mjs';
import { contactSheet, SHEET_NAME } from '../src/contact-sheet.mjs';
import { iconNames } from '../src/icons.mjs';
import { render } from '../src/render.mjs';
import { loadSpec } from '../src/spec.mjs';

const HELP = `social-kit: on-brand social media images from a brand file and plain text.

Usage
  social-kit init [folder]              Write a starter brand.json, spec.json, logo and fonts
  social-kit check <spec.json>          Check a spec without rendering
  social-kit render <spec.json> [--out out/] [--no-sheet]
                                        Render every asset, then a contact sheet for review
  social-kit contact-sheet <folder> [--out file.png]
                                        Tile every PNG in a folder into one image
  social-kit icons                      List the built-in highlight icons

Chrome, Chromium or Edge must be installed. Set CHROME_PATH to use a specific browser.
Docs: https://github.com/oussch702/social-kit`;

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name) => {
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = args.indexOf(name);
  if (i !== -1) args.splice(i, 1);
  return i !== -1;
};
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};
const rel = (p) => {
  const r = path.relative(process.cwd(), p);
  return r.startsWith('..') ? p : r || '.';
};

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') return console.log(HELP);

  if (cmd === 'icons') return console.log(iconNames.join('\n'));

  if (cmd === 'check') {
    const file = args[1];
    if (!file) fail('Usage: social-kit check <spec.json>');
    const { errors, warnings, spec } = loadSpec(file);
    warnings.forEach((w) => console.log(`note: ${w}`));
    if (errors.length) fail(`${errors.length} problem${errors.length > 1 ? 's' : ''}:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    const count = spec.carousel.reduce((n, d) => n + d.slides.length, 0) + spec.stories.length + spec.highlights.length + spec.banner.length + spec.og.length + spec.quote.length;
    return console.log(`Spec is valid: ${count} image${count === 1 ? '' : 's'} to render.`);
  }

  if (cmd === 'render') {
    const out = path.resolve(flag('--out') || 'out');
    const noSheet = has('--no-sheet');
    const file = args[1];
    if (!file) fail('Usage: social-kit render <spec.json> [--out out/]');
    const started = Date.now();
    const browser = await launch();
    try {
      let result;
      try {
        result = await render(file, out, { browser, onFile: (f) => console.log(`  ${rel(f)}`) });
      } catch (e) {
        if (e.specErrors) fail(e.message);
        throw e;
      }
      if (!noSheet) {
        const sheet = await contactSheet(out, path.join(out, SHEET_NAME), { browser });
        console.log(`  ${rel(sheet.file)} (contact sheet of ${sheet.count} images)`);
      }
      console.log(`Rendered ${result.files.length} files in ${((Date.now() - started) / 1000).toFixed(1)}s.`);
      result.notes.forEach((n) => console.log(`note: ${n}`));
      if (result.problems.length) {
        console.error(`\n${result.problems.length} image${result.problems.length > 1 ? 's' : ''} ${result.problems.length > 1 ? 'need' : 'needs'} shorter text:`);
        result.problems.forEach((p) => console.error(`  - ${p}`));
        process.exitCode = 2;
      }
    } finally {
      await browser.close();
    }
    return;
  }

  if (cmd === 'contact-sheet') {
    const outFile = flag('--out');
    const dir = path.resolve(args[1] || 'out');
    if (!fs.existsSync(dir)) fail(`Folder not found: ${dir}`);
    const sheet = await contactSheet(dir, outFile ? path.resolve(outFile) : undefined);
    return console.log(`${rel(sheet.file)}: ${sheet.count} images`);
  }

  if (cmd === 'init') {
    const force = has('--force');
    const dir = path.resolve(args[1] || '.');
    const demo = path.join(ROOT, 'examples', 'northwind');
    const brand = JSON.parse(fs.readFileSync(path.join(demo, 'brand.json'), 'utf8'));
    for (const role of Object.keys(brand.fonts || {})) brand.fonts[role].file = `./fonts/${path.basename(brand.fonts[role].file)}`;
    const writes = {
      'brand.json': JSON.stringify(brand, null, 2) + '\n',
      'spec.json': fs.readFileSync(path.join(demo, 'spec.json'), 'utf8'),
      'logo.svg': fs.readFileSync(path.join(demo, 'logo.svg'), 'utf8'),
    };
    const clash = Object.keys(writes).filter((f) => fs.existsSync(path.join(dir, f)));
    if (clash.length && !force) fail(`${clash.join(', ')} already exist in ${rel(dir)}. Use --force to overwrite.`);
    fs.mkdirSync(path.join(dir, 'fonts'), { recursive: true });
    for (const [f, body] of Object.entries(writes)) fs.writeFileSync(path.join(dir, f), body);
    for (const f of fs.readdirSync(path.join(ROOT, 'fonts'))) fs.copyFileSync(path.join(ROOT, 'fonts', f), path.join(dir, 'fonts', f));
    console.log(`Wrote brand.json, spec.json, logo.svg and fonts/ to ${rel(dir)}.

Next:
  1. Put your logo, colours and fonts in brand.json
  2. Write your text in spec.json
  3. node ${rel(path.join(ROOT, 'bin', 'social-kit.mjs'))} render ${rel(path.join(dir, 'spec.json'))} --out ${rel(path.join(dir, 'out'))}`);
    return;
  }

  fail(`Unknown command "${cmd}".\n\n${HELP}`);
}

main().catch((e) => fail(e.message || String(e)));
