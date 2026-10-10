// Loads brand.json, fills in defaults and turns it into CSS variables and @font-face rules.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLED = path.join(ROOT, 'fonts');

const DEFAULT_FONTS = {
  display: { family: 'Bricolage Grotesque', file: path.join(BUNDLED, 'BricolageGrotesque.woff2'), weight: '500 800' },
  body: { family: 'Figtree', file: path.join(BUNDLED, 'Figtree.woff2'), weight: '400 700' },
  accent: { family: 'Instrument Serif', file: path.join(BUNDLED, 'InstrumentSerif-Italic.woff2'), style: 'italic', weight: '400' },
};

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const REQUIRED_COLORS = ['bg', 'ink', 'muted', 'accent', 'accentInk'];

function luminance(hex) {
  let h = hex.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// Returns { brand, errors, warnings }. `input` is a path or an object; relative paths resolve against `baseDir`.
export function loadBrand(input, baseDir) {
  const errors = [];
  const warnings = [];
  let raw = input;
  let dir = baseDir;
  if (typeof input === 'string') {
    const file = path.resolve(baseDir, input);
    if (!fs.existsSync(file)) return { errors: [`Brand file not found: ${file}`], warnings };
    try {
      raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      return { errors: [`${file} is not valid JSON: ${e.message}`], warnings };
    }
    dir = path.dirname(file);
  }
  if (!raw || typeof raw !== 'object') return { errors: ['"brand" must be a path to brand.json or an object.'], warnings };

  if (!raw.name || typeof raw.name !== 'string') errors.push('brand.name is missing. Add your brand name, for example "Northwind Studio".');

  const colors = raw.colors || {};
  for (const key of REQUIRED_COLORS) {
    if (!colors[key]) errors.push(`brand.colors.${key} is missing. Use a hex colour like "#111412".`);
    else if (!HEX.test(colors[key])) errors.push(`brand.colors.${key} is "${colors[key]}". Use a hex colour like "#111412".`);
  }

  let logo = null;
  if (raw.logo) {
    const file = path.resolve(dir, raw.logo);
    if (!fs.existsSync(file)) errors.push(`brand.logo points to ${file}, which does not exist.`);
    else if (!/\.(svg|png|jpe?g|webp)$/i.test(file)) errors.push('brand.logo must be an SVG, PNG, JPG or WebP file.');
    else logo = pathToFileURL(file).href;
  }

  const fonts = {};
  for (const role of ['display', 'body', 'accent']) {
    const given = raw.fonts?.[role];
    const spec = typeof given === 'string' ? { file: given } : given || {};
    const def = DEFAULT_FONTS[role];
    const font = { ...(spec.file || spec.family ? {} : def), ...spec };
    if (spec.file) {
      font.file = path.resolve(dir, spec.file);
      if (!fs.existsSync(font.file)) errors.push(`brand.fonts.${role} points to ${font.file}, which does not exist.`);
      font.family ||= `SK ${role}`;
    }
    font.weight ||= role === 'accent' ? '400' : '100 900';
    font.style ||= role === 'accent' ? 'italic' : 'normal';
    fonts[role] = font;
  }

  const bg = raw.background || 'glow';
  const background = typeof bg === 'string' ? { style: bg } : { ...bg };
  if (!['glow', 'solid'].includes(background.style)) errors.push(`brand.background.style is "${background.style}". Use "glow" or "solid".`);
  if (background.colors && (!Array.isArray(background.colors) || background.colors.some((c) => !HEX.test(c)))) {
    errors.push('brand.background.colors must be a list of 1 to 3 hex colours.');
  }

  if (!errors.length) {
    const ratio = contrast(colors.ink, colors.bg);
    if (ratio < 4.5) warnings.push(`brand.colors.ink on brand.colors.bg has a contrast of ${ratio.toFixed(1)}:1. Aim for at least 4.5:1 so text stays readable.`);
    const m = contrast(colors.muted, colors.bg);
    if (m < 3) warnings.push(`brand.colors.muted on brand.colors.bg has a contrast of ${m.toFixed(1)}:1. Small grey text needs at least 3:1.`);
  }

  if (errors.length) return { errors, warnings };
  const dark = luminance(colors.bg) < 0.2;
  return {
    errors,
    warnings,
    brand: {
      name: raw.name,
      url: raw.url || '',
      showName: raw.showName !== false,
      logo,
      colors,
      dark,
      background,
      fonts,
    },
  };
}

// Up to three soft radial gradients: top left, bottom right and a small one top right.
function glowLayers(colors, wide) {
  const at = wide
    ? ['50% 65% at 8% 12%', '45% 60% at 96% 96%', '30% 40% at 78% 6%']
    : ['70% 42% at 0% 0%', '70% 42% at 100% 100%', '40% 22% at 90% 4%'];
  const alpha = [90, 95, 50];
  return colors
    .slice(0, 3)
    .map((c, i) => `radial-gradient(${at[i]},color-mix(in srgb,${c} ${alpha[i]}%,transparent),transparent ${i === 2 ? 70 : 72}%)`)
    .join(',');
}

// Base CSS shared by every format: fonts, colour variables, background and the *emphasis* style.
export function brandCss(brand, { wide = false } = {}) {
  const c = brand.colors;
  const face = (f) =>
    f.file
      ? `@font-face{font-family:'${f.family}';src:url('${pathToFileURL(f.file).href}') format('${f.file.endsWith('.woff2') ? 'woff2' : f.file.endsWith('.woff') ? 'woff' : f.file.endsWith('.otf') ? 'opentype' : 'truetype'}');font-weight:${f.weight};font-style:${f.style}}`
      : '';
  const glowColors = brand.background.colors || [`color-mix(in srgb,${c.accent} 35%,${c.bg})`, `color-mix(in srgb,${c.accent} 20%,${c.bg})`];
  const glow = brand.background.style === 'glow' ? glowLayers(glowColors, wide) : 'none';
  return `${face(brand.fonts.display)}${face(brand.fonts.body)}${face(brand.fonts.accent)}
:root{--bg:${c.bg};--ink:${c.ink};--muted:${c.muted};--accent:${c.accent};--accent-ink:${c.accentInk};
--body:color-mix(in srgb,${c.ink} 84%,${c.bg});--line:color-mix(in srgb,${c.ink} 13%,transparent);
--surface:${brand.dark ? `color-mix(in srgb,${c.ink} 8%,transparent)` : 'rgb(255 255 255/.78)'};--edge:color-mix(in srgb,${c.ink} 12%,transparent);
--display:'${brand.fonts.display.family}',system-ui,sans-serif;--text:'${brand.fonts.body.family}',system-ui,sans-serif;--serif:'${brand.fonts.accent.family}',Georgia,serif}
*{box-sizing:border-box}
html,body{margin:0;background:var(--bg)}
.page{position:relative;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--text);break-after:page;-webkit-font-smoothing:antialiased}
.page:last-child{break-after:auto}
.glow{position:absolute;inset:0;background:${glow}}
em{font-family:var(--serif);font-style:${brand.fonts.accent.style};font-weight:400;font-size:1.1em;line-height:1;letter-spacing:-.01em}
.brand{display:flex;align-items:center;font-family:var(--display);font-weight:800;letter-spacing:-.02em;white-space:nowrap}
.brand img{display:block;width:auto;object-fit:contain}
.content{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:safe center}
.stack{display:flex;flex-direction:column;min-width:0}`;
}
