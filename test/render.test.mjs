// Renders the demo spec with a real Chrome and checks every file: it exists, it has the right
// pixel size, and the carousel PDF has one page per slide.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { render, pngSize, pdfPageCount } from '../src/render.mjs';
import { contactSheet } from '../src/contact-sheet.mjs';
import { loadSpec } from '../src/spec.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const demo = path.join(root, 'examples', 'northwind', 'spec.json');

test('renders every asset in the demo spec at the right size', { timeout: 120_000 }, async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'social-kit-test-'));
  try {
    const { spec } = loadSpec(demo);
    const result = await render(demo, out);
    assert.deepEqual(result.problems, [], 'no page should overflow');

    const expect = [];
    for (const deck of spec.carousel) {
      deck.slides.forEach((_, i) => expect.push([`${deck.name}/slide-${String(i + 1).padStart(2, '0')}.png`, 1080, 1350]));
    }
    spec.stories.forEach((s) => expect.push([`stories/${s.file}.png`, 1080, 1920]));
    spec.highlights.forEach((h) => expect.push([`highlights/${h.file}.png`, 1080, 1920]));
    expect.push(['linkedin-banner.png', 1584, 396], ['og.png', 1200, 630], ['quote.png', 1080, 1080]);

    for (const [file, width, height] of expect) {
      const full = path.join(out, file);
      assert.ok(fs.existsSync(full), `${file} should exist`);
      assert.deepEqual(pngSize(full), { width, height }, `${file} should be ${width}x${height}`);
    }

    const deck = spec.carousel[0];
    const pdf = path.join(out, deck.name, `${deck.name}.pdf`);
    assert.ok(fs.existsSync(pdf), 'the carousel PDF should exist');
    assert.equal(pdfPageCount(pdf), deck.slides.length, 'the PDF should have one page per slide');

    const sheet = await contactSheet(out);
    assert.equal(sheet.count, expect.length);
    assert.equal(pngSize(sheet.file).width, 2400);
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
