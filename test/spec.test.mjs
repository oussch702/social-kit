// Checks that bad specs fail with messages a person can act on. No browser needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSpec } from '../src/spec.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brand = path.join(root, 'examples', 'northwind', 'brand.json');

const check = (spec) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'social-kit-spec-'));
  const file = path.join(dir, 'spec.json');
  fs.writeFileSync(file, JSON.stringify(spec));
  try {
    return loadSpec(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('both example specs are valid', () => {
  for (const name of ['northwind', 'ai-strike-force']) {
    const { errors } = loadSpec(path.join(root, 'examples', name, 'spec.json'));
    assert.deepEqual(errors, [], name);
  }
});

test('an empty spec says what is missing', () => {
  const { errors } = check({});
  assert.ok(errors.some((e) => e.includes('needs "brand"')));
  assert.ok(errors.some((e) => e.includes('nothing to render')));
});

test('slide problems name the slide and show an example', () => {
  const { errors } = check({
    brand,
    carousel: { slides: [{ type: 'rowz' }, { type: 'math', lines: [['Plan']] }, { type: 'checklist', title: 'x', items: [] }] },
  });
  assert.ok(errors.some((e) => e.startsWith('carousel slide 1') && e.includes('Use one of')));
  assert.ok(errors.some((e) => e.startsWith('carousel slide 2 (math) line 1')));
  assert.ok(errors.some((e) => e.startsWith('carousel slide 2 (math) needs "total"')));
  assert.ok(errors.some((e) => e.startsWith('carousel slide 3 (checklist)')));
});

test('unknown icons and bad colours are explained', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'social-kit-brand-'));
  const badBrand = path.join(dir, 'brand.json');
  fs.writeFileSync(badBrand, JSON.stringify({ name: 'X', colors: { bg: 'white', ink: '#000', muted: '#555', accent: '#00f' } }));
  const { errors } = check({ brand: badBrand, highlights: ['unicorn'] });
  fs.rmSync(dir, { recursive: true, force: true });
  assert.ok(errors.some((e) => e.includes('brand.colors.bg is "white"')));
  assert.ok(errors.some((e) => e.includes('brand.colors.accentInk is missing')));
});
