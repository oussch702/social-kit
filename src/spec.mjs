// Reads spec.json and checks it, returning plain-language errors a person (or an agent) can act on.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadBrand } from './brand.mjs';
import { ICONS, SLIDE_TYPES, STORY_TYPES, HIGHLIGHT_STYLES } from './templates.mjs';

const ASSETS = ['carousel', 'stories', 'highlights', 'banner', 'og', 'quote'];
const KNOWN = new Set(['brand', '$schema', ...ASSETS]);

const isText = (x) => typeof x === 'string' && x.trim() !== '';
const list = (x) => (x === undefined ? [] : Array.isArray(x) ? x : [x]);
const isPair = (x, n = 2) =>
  (Array.isArray(x) && x.length >= n && x.slice(0, n).every((v) => isText(String(v ?? '')))) ||
  (x && typeof x === 'object' && !Array.isArray(x) && isText(String(x.label ?? '')) && isText(String(x.value ?? '')));

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function checkSlide(s, where, errors) {
  if (!s || typeof s !== 'object') return errors.push(`${where} must be an object with a "type".`);
  if (!SLIDE_TYPES.includes(s.type)) return errors.push(`${where} has type "${s.type}". Use one of: ${SLIDE_TYPES.join(', ')}.`);
  const need = (key, hint) => !isText(s[key]) && errors.push(`${where} (${s.type}) needs "${key}"${hint ? `, ${hint}` : ''}.`);
  if (s.type !== 'math') need('title', 'the headline text');
  if (s.type === 'rows') {
    if (!Array.isArray(s.rows) || !s.rows.length) errors.push(`${where} (rows) needs "rows": a list like [["Basic", "$49", "250 minutes a month"]].`);
    else {
      s.rows.forEach((r, i) => !isPair(r) && errors.push(`${where} (rows) row ${i + 1} needs at least a label and a value, like ["Basic", "$49", "250 minutes"].`));
      if (s.rows.length > 6) errors.push(`${where} (rows) has ${s.rows.length} rows. Six is the most that fits; split it over two slides.`);
    }
  }
  if (s.type === 'math') {
    if (!Array.isArray(s.lines) || !s.lines.length) errors.push(`${where} (math) needs "lines": a list like [["Plan", "$150.00"], ["Extra calls", "$562.50"]].`);
    else {
      s.lines.forEach((l, i) => !isPair(l) && errors.push(`${where} (math) line ${i + 1} needs a label and an amount, like ["Plan", "$150.00"].`));
      if (s.lines.length > 5) errors.push(`${where} (math) has ${s.lines.length} lines. Five is the most that fits above the total.`);
    }
    if (!isPair(s.total)) errors.push(`${where} (math) needs "total", like ["Your bill", "$712.50"].`);
    if (!isText(s.kicker) && !isText(s.title)) errors.push(`${where} (math) needs a "kicker" or a "title" so people know what the sum is.`);
  }
  if (s.type === 'checklist') {
    if (!Array.isArray(s.items) || !s.items.length || !s.items.every(isText)) errors.push(`${where} (checklist) needs "items": a list of short lines of text.`);
    else if (s.items.length > 7) errors.push(`${where} (checklist) has ${s.items.length} items. Keep it to 7 or fewer, or split it over two slides.`);
  }
  if (s.type === 'cards') {
    if (!Array.isArray(s.cards) || !s.cards.length) errors.push(`${where} (cards) needs "cards": a list like [["Retell AI", "$0.07 a minute", "Short description"]].`);
    else {
      s.cards.forEach((c, i) => {
        const name = Array.isArray(c) ? c[0] : c?.title;
        if (!isText(name)) errors.push(`${where} (cards) card ${i + 1} needs a title, like ["Retell AI", "$0.07 a minute", "Short description"].`);
      });
      if (s.cards.length > 3) errors.push(`${where} (cards) has ${s.cards.length} cards. Three is the most that fits; split it over two slides.`);
    }
  }
}

function checkStory(s, where, errors) {
  if (!s || typeof s !== 'object') return errors.push(`${where} must be an object with a "type".`);
  if (!STORY_TYPES.includes(s.type)) return errors.push(`${where} has type "${s.type}". Use one of: ${STORY_TYPES.join(', ')}.`);
  if (s.type === 'stat' && !isText(String(s.number ?? ''))) errors.push(`${where} (stat) needs "number", the big figure, like "4.4M".`);
  if (s.type === 'quote' && !isText(s.quote)) errors.push(`${where} (quote) needs "quote", the words of the testimonial.`);
  if ((s.type === 'list' || s.type === 'cta') && !isText(s.title)) errors.push(`${where} (${s.type}) needs "title".`);
  if (s.type === 'list' && (!Array.isArray(s.items) || !s.items.length || !s.items.every(isText))) errors.push(`${where} (list) needs "items": a list of short lines of text.`);
  if (s.type === 'list' && Array.isArray(s.items) && s.items.length > 5) errors.push(`${where} (list) has ${s.items.length} items. A story fits 5 at most.`);
}

// Returns { spec, brand, baseDir, errors, warnings }. `spec` has every asset as a list and file names filled in.
export function loadSpec(file) {
  const errors = [];
  const warnings = [];
  const specFile = path.resolve(file);
  if (!fs.existsSync(specFile)) return { errors: [`Spec file not found: ${specFile}`], warnings };
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  } catch (e) {
    return { errors: [`${specFile} is not valid JSON: ${e.message}`], warnings };
  }
  const baseDir = path.dirname(specFile);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { errors: ['The spec must be a JSON object.'], warnings };

  for (const key of Object.keys(raw)) if (!KNOWN.has(key)) warnings.push(`Ignoring unknown key "${key}". Known keys: brand, ${ASSETS.join(', ')}.`);
  if (!raw.brand) errors.push('The spec needs "brand": a path to brand.json, like "./brand.json".');
  if (!ASSETS.some((k) => raw[k] !== undefined)) errors.push(`The spec has nothing to render. Add at least one of: ${ASSETS.join(', ')}.`);

  let brand;
  if (raw.brand) {
    const b = loadBrand(raw.brand, baseDir);
    errors.push(...b.errors);
    warnings.push(...b.warnings);
    brand = b.brand;
  }

  const spec = { carousel: [], stories: [], highlights: [], banner: [], og: [], quote: [] };

  list(raw.carousel).forEach((deck, d) => {
    const where = Array.isArray(raw.carousel) ? `carousel[${d}]` : 'carousel';
    if (!deck || !Array.isArray(deck.slides) || !deck.slides.length) return errors.push(`${where} needs "slides": a list of slides, each with a "type".`);
    deck.slides.forEach((s, i) => checkSlide(s, `${where} slide ${i + 1}`, errors));
    const name = slug(deck.name || (d ? `carousel-${d + 1}` : 'carousel'));
    spec.carousel.push({ ...deck, name });
  });

  if (raw.stories !== undefined && !Array.isArray(raw.stories)) errors.push('"stories" must be a list of stories.');
  else
    list(raw.stories).forEach((s, i) => {
      checkStory(s, `story ${i + 1}`, errors);
      spec.stories.push({ ...s, file: s?.file || `story-${String(i + 1).padStart(2, '0')}-${s?.type}` });
    });

  if (raw.highlights !== undefined && !Array.isArray(raw.highlights)) errors.push('"highlights" must be a list, like ["star", "quote", "mail"].');
  else {
    const used = new Set();
    list(raw.highlights).forEach((h, i) => {
      const item = typeof h === 'string' ? { icon: h } : { ...h };
      const where = `highlight ${i + 1}`;
      if (item.svg) {
        const svg = path.resolve(baseDir, item.svg);
        if (!fs.existsSync(svg)) errors.push(`${where}: "svg" points to ${svg}, which does not exist.`);
        item.svg = pathToFileURL(svg).href;
      } else if (!ICONS[item.icon]) {
        errors.push(`${where} uses icon "${item.icon}". Built-in icons: ${Object.keys(ICONS).join(', ')}. Or give "svg": "path/to/icon.svg".`);
      }
      if (item.style && !HIGHLIGHT_STYLES.includes(item.style)) errors.push(`${where} has style "${item.style}". Use one of: ${HIGHLIGHT_STYLES.join(', ')}.`);
      let name = slug(item.file || item.name || item.icon || `highlight-${i + 1}`);
      while (used.has(name)) name += '-2';
      used.add(name);
      spec.highlights.push({ ...item, file: name });
    });
  }

  const singles = { banner: ['title', 'linkedin-banner'], og: ['title', 'og'], quote: ['quote', 'quote'] };
  for (const [key, [field, base]] of Object.entries(singles)) {
    const items = list(raw[key]);
    items.forEach((item, i) => {
      const where = items.length > 1 ? `${key}[${i}]` : key;
      if (!item || typeof item !== 'object') return errors.push(`"${where}" must be an object.`);
      if (!isText(item[field])) errors.push(`"${where}" needs "${field}".`);
      if (key === 'banner' && item.chips && item.chips.length > 4) errors.push(`"${where}" has ${item.chips.length} chips. Four is the most that fits on one line.`);
      spec[key].push({ ...item, file: item.file || (i ? `${base}-${i + 1}` : base) });
    });
  }

  return { spec, brand, baseDir, errors, warnings };
}
