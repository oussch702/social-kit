// Builds the README images in docs/ from real renders of the two example specs.
// Run: npm run docs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch } from '../src/chrome.mjs';
import { render } from '../src/render.mjs';
import { iconNames } from '../src/icons.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docs = path.join(root, 'docs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'social-kit-docs-'));
const nw = path.join(tmp, 'northwind');
const asf = path.join(tmp, 'asf');
const icons = path.join(tmp, 'icons');

// Every built-in icon as a highlight cover, cycling through the three styles.
const iconSpec = path.join(tmp, 'icons.json');
fs.writeFileSync(
  iconSpec,
  JSON.stringify({
    brand: path.join(root, 'examples', 'northwind', 'brand.json'),
    highlights: iconNames.map((icon) => ({ icon })),
  }),
);

const url = (f) => pathToFileURL(f).href;
const BASE = `*{box-sizing:border-box}html,body{margin:0}body{font-family:system-ui,sans-serif}
.tile{display:block;border-radius:var(--r,18px);box-shadow:0 1px 2px rgb(20 22 30/.10),0 18px 48px -12px rgb(20 22 30/.22)}`;

const browser = await launch();
async function shot(name, width, height, body, css = '') {
  const file = path.join(tmp, `${name}.html`);
  fs.writeFileSync(file, `<!doctype html><html><head><meta charset="utf-8"><style>${BASE}${css}</style></head><body>${body}<script>addEventListener('load',()=>{document.body.dataset.ready='1'})</script></body></html>`);
  await browser.page.open(url(file), width, height);
  fs.writeFileSync(path.join(docs, `${name}.png`), await browser.page.pngAt(width, height, 0));
  console.log(`docs/${name}.png`);
}

try {
  for (const [spec, out] of [
    [path.join(root, 'examples', 'northwind', 'spec.json'), nw],
    [path.join(root, 'examples', 'ai-strike-force', 'spec.json'), asf],
    [iconSpec, icons],
  ]) {
    const r = await render(spec, out, { browser });
    if (r.problems.length) throw new Error(r.problems.join('\n'));
  }
  fs.mkdirSync(docs, { recursive: true });
  const deck = (d, n) => path.join(d, n);
  const slide = (i) => deck(path.join(nw, 'website-costs'), `slide-0${i}.png`);
  const asfSlide = (i) => deck(path.join(asf, 'ai-receptionist-cost'), `slide-0${i}.png`);
  const story = (n) => path.join(nw, 'stories', n);
  const cover = (n) => path.join(nw, 'highlights', `${n}.png`);
  // Instagram shows a highlight cover as the centre circle of the image.
  const circle = (f, size) =>
    `<div class="circle" style="width:${size}px;height:${size}px"><img src="${url(f)}" style="width:${size}px;height:${(size * 1920) / 1080}px;margin-top:${(-size * 420) / 1080}px"></div>`;
  const circleCss = `.circle{border-radius:50%;overflow:hidden;flex:none;box-shadow:0 0 0 6px #fff,0 0 0 8px rgb(20 22 30/.12),0 14px 30px -10px rgb(20 22 30/.3)}.circle img{display:block}`;

  // Hero: two brands, every format.
  await shot(
    'showcase',
    2400,
    1322,
    `<div class="stage">
  <div class="row">
    <img class="tile" src="${url(slide(1))}" style="width:608px">
    <img class="tile" src="${url(asfSlide(4))}" style="width:608px">
    <img class="tile" src="${url(story('story-01-stat.png'))}" style="width:428px">
    <img class="tile" src="${url(story('story-03-list.png'))}" style="width:428px">
  </div>
  <div class="row bottom">
    <img class="tile" src="${url(path.join(nw, 'linkedin-banner.png'))}" style="width:1320px">
    <div class="circles">${['star', 'quote', 'zap', 'chart', 'mail', 'calendar'].map((n) => circle(cover(n), 150)).join('')}</div>
  </div>
</div>`,
    `body{width:2400px;height:1322px;background:radial-gradient(60% 50% at 0% 0%,#e4e9ff,transparent 70%),radial-gradient(50% 50% at 100% 100%,#ffe6d6,transparent 70%),#f1f0eb}
.stage{padding:88px 80px;display:flex;flex-direction:column;gap:56px;align-items:center}
.row{display:flex;gap:40px;align-items:flex-start}
.bottom{align-items:center;gap:72px}
.circles{display:grid;grid-template-columns:repeat(3,150px);gap:34px 30px}
${circleCss}`,
  );

  await shot(
    'carousel',
    2400,
    810,
    `<div class="row">${[1, 2, 4, 6].map((i) => `<img class="tile" src="${url(slide(i))}" style="width:520px">`).join('')}</div>`,
    `body{background:#f1f0eb}.row{padding:80px;display:flex;gap:40px}`,
  );

  await shot(
    'stories',
    2400,
    1084,
    `<div class="row">${['story-01-stat', 'story-02-quote', 'story-03-list', 'story-04-cta'].map((n) => `<img class="tile" src="${url(story(n + '.png'))}" style="width:520px;--r:28px">`).join('')}</div>`,
    `body{background:#f1f0eb}.row{padding:80px 80px;display:flex;gap:40px}`,
  );

  await shot(
    'highlights',
    2400,
    612,
    `<div class="grid">${iconNames.map((n) => `<figure>${circle(path.join(icons, 'highlights', `${n}.png`), 168)}<figcaption>${n}</figcaption></figure>`).join('')}</div>`,
    `body{background:#f1f0eb}.grid{padding:72px 96px;display:grid;grid-template-columns:repeat(9,1fr);gap:40px 24px;justify-items:center}
figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:22px}figcaption{font:500 24px/1 system-ui;color:#5b6070}${circleCss}`,
  );

  await shot(
    'banner',
    1744,
    660,
    `<div class="wrap"><img class="tile" src="${url(path.join(nw, 'linkedin-banner.png'))}" style="width:1584px;--r:12px"><div class="photo">Profile photo</div></div>`,
    `body{background:#f1f0eb}.wrap{position:relative;margin:80px}.photo{position:absolute;left:32px;top:196px;width:300px;height:300px;border-radius:50%;border:4px dashed #9aa0b2;display:grid;place-items:center;font:500 26px/1 system-ui;color:#5b6070;background:rgb(255 255 255/.55)}`,
  );

  await shot(
    'og',
    1360,
    790,
    `<img class="tile" src="${url(path.join(nw, 'og.png'))}" style="width:1200px;margin:80px">`,
    `body{background:#f1f0eb}`,
  );

  await shot(
    'quote',
    1240,
    1240,
    `<img class="tile" src="${url(path.join(nw, 'quote.png'))}" style="width:1080px;margin:80px">`,
    `body{background:#f1f0eb}`,
  );

  await shot(
    'ai-strike-force-deck',
    2400,
    1450,
    `<div class="grid">${[1, 2, 3, 4, 5, 6, 7].map((i) => `<img class="tile" src="${url(asfSlide(i))}" style="width:500px">`).join('')}</div>`,
    `body{background:#f1f0eb}.grid{padding:80px;display:flex;flex-wrap:wrap;gap:40px 40px;justify-content:center}.grid img{width:500px}`,
  );
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
