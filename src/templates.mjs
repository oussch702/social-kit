// HTML and CSS for every format. Each page is a .page with a .content box and a .stack inside it;
// the fit script shrinks [data-fit] headlines until the stack fits the box.
// Slide type classes are prefixed with t- (t-rows, t-math, t-cards) because plain .rows/.math/.cards
// collided with the component classes of the same name and broke the page size.
import { brandCss } from './brand.mjs';
import { icon, ICONS } from './icons.mjs';

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// *words* become the accent italic serif; a newline becomes a line break.
export const em = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\n/g, '<br>');

const pair = (x, keys) => (Array.isArray(x) ? x : keys.map((k) => x[k]));

const brandRow = (brand) =>
  `<div class="brand">${brand.logo ? `<img src="${brand.logo}" alt="">` : ''}${brand.showName ? `<span>${esc(brand.name)}</span>` : ''}</div>`;

const FIT_SCRIPT = `<script>
addEventListener('load', async () => {
  await Promise.all([...document.fonts].map((f) => f.load().catch(() => {})));
  await document.fonts.ready;
  const report = [];
  document.querySelectorAll('.page').forEach((page, index) => {
    const box = page.querySelector('.content');
    const stack = box && box.querySelector('.stack');
    if (!stack) return report.push({ index, overflow: 0, zoom: 1, shrunk: false });
    const fits = [...page.querySelectorAll('[data-fit]')];
    const over = () =>
      stack.getBoundingClientRect().height > box.clientHeight + 1 ||
      stack.scrollWidth > stack.clientWidth + 1 ||
      fits.some((e) => e.scrollWidth > e.clientWidth + 1);
    let shrunk = false;
    for (let i = 0; i < 80 && over(); i++) {
      let changed = false;
      for (const el of fits) {
        const size = parseFloat(getComputedStyle(el).fontSize);
        const min = parseFloat(el.dataset.fit);
        if (size > min + 0.1) {
          el.style.fontSize = Math.max(min, size * 0.96) + 'px';
          changed = shrunk = true;
        }
      }
      if (!changed) break;
    }
    let zoom = 1;
    while (over() && zoom > 0.8) {
      zoom = Math.round((zoom - 0.02) * 100) / 100;
      stack.style.zoom = zoom;
    }
    const extra = Math.ceil(stack.getBoundingClientRect().height - box.clientHeight);
    report.push({ index, shrunk, zoom, overflow: over() ? Math.max(extra, 1) : 0 });
  });
  window.__fit = report;
  document.body.dataset.ready = '1';
});
</script>`;

export const documentHtml = (brand, format, pages) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${brandCss(brand, { wide: format.wide })}
@page{size:${format.width}px ${format.height}px;margin:0}
.page{width:${format.width}px;height:${format.height}px}
${format.css(brand)}</style></head><body>${pages.join('')}${FIT_SCRIPT}</body></html>`;

// LinkedIn document carousel, 1080x1350 per slide.
export const carousel = {
  width: 1080,
  height: 1350,
  css: () => `
.inner{position:relative;height:100%;padding:84px 96px 76px;display:flex;flex-direction:column}
.brand{gap:16px;font-size:34px}
.brand img{height:52px}
.foot{display:flex;justify-content:space-between;font:600 26px/1 var(--text);color:var(--muted)}
.kicker{align-self:flex-start;padding:14px 24px;border-radius:999px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--edge);font:600 28px/1.1 var(--text);color:var(--body);margin-bottom:36px}
h1{margin:0 0 48px;font:800 76px/1.02 var(--display);letter-spacing:-.045em;text-wrap:balance;overflow-wrap:break-word}
h1.xl{font-size:112px;line-height:.96;margin-bottom:0}
.lead{margin:48px 0 0;font:500 40px/1.35 var(--text);color:var(--body);max-width:860px;text-wrap:pretty}
.lead.small{font-size:34px;color:var(--muted);margin-top:40px}
.swipe{margin-top:64px;font:600 30px/1 var(--text);color:var(--muted);display:flex;align-items:center;gap:18px}
.swipe::after{content:'';width:56px;height:2px;background:currentColor}
.table{display:flex;flex-direction:column;border-top:2px solid var(--line)}
.row{display:flex;align-items:center;justify-content:space-between;gap:32px;padding:24px 0;border-bottom:2px solid var(--line)}
.row div{display:flex;flex-direction:column;gap:8px;min-width:0}
.row b{font:700 38px/1.1 var(--text)}
.row span{font:500 30px/1.3 var(--text);color:var(--muted)}
.row strong{flex:none;font:800 54px/1 var(--display);letter-spacing:-.03em;white-space:nowrap}
.note{margin:32px 0 0;font:500 30px/1.4 var(--text);color:var(--muted);text-wrap:pretty}
.sum{display:flex;flex-direction:column}
.line{display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding:34px 0;border-bottom:2px solid var(--line);font:500 38px/1.2 var(--text)}
.line b{flex:none;font:700 44px/1 var(--display);white-space:nowrap}
.line.total{border-bottom:0;padding-top:48px;align-items:center}
.line.total span{font-weight:700}
.line.total b{font:800 150px/1 var(--display);letter-spacing:-.05em}
.list{margin:0;padding:0;list-style:none;counter-reset:n;display:flex;flex-direction:column;gap:30px}
.list li{counter-increment:n;display:flex;gap:28px;align-items:baseline;font:600 44px/1.25 var(--text);text-wrap:pretty}
.list li::before{content:counter(n);flex:none;width:64px;height:64px;border-radius:50%;background:var(--ink);color:var(--bg);font:800 30px/64px var(--display);text-align:center;transform:translateY(-6px)}
.list.plain li::before{content:'';width:18px;height:18px;margin:0 8px;border-radius:3px;background:var(--accent);transform:translateY(-8px)}
.deck{display:flex;flex-direction:column;gap:32px}
.card{display:flex;flex-direction:column;gap:16px;padding:44px 48px;border-radius:32px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--edge)}
.card b{font:800 54px/1 var(--display);letter-spacing:-.03em}
.card strong{font:700 38px/1.2 var(--text);color:var(--accent-ink)}
.card span{font:500 32px/1.4 var(--text);color:var(--body)}
.link{align-self:flex-start;max-width:100%;padding:22px 32px;border-radius:20px;background:var(--ink);color:var(--bg);font:700 34px/1.2 var(--text);overflow-wrap:anywhere}
.who{padding:40px 0 48px;display:flex;flex-direction:column;gap:10px}
.who b{font:800 40px/1 var(--display);letter-spacing:-.02em}
.who span{font:500 30px/1.2 var(--text);color:var(--muted)}
.t-cta .content{justify-content:flex-start;padding-top:120px}
.t-cta h1{font-size:100px;line-height:.98}
.t-cta .foot span:first-child{visibility:hidden}`,
  page(s, { brand, index, total, deck }) {
    let body = '';
    let after = '';
    const note = s.note ? `<p class="note">${em(s.note)}</p>` : '';
    if (s.type === 'cover')
      body = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<h1 class="xl" data-fit="64">${em(s.title)}</h1>${s.swipe === false ? '' : `<div class="swipe">${esc(s.swipe || 'Swipe')}</div>`}`;
    if (s.type === 'statement') body = `<h1 class="xl" data-fit="64">${em(s.title)}</h1>${s.body ? `<p class="lead">${em(s.body)}</p>` : ''}`;
    if (s.type === 'rows')
      body = `<h1 data-fit="52">${em(s.title)}</h1><div class="table">${s.rows
        .map((r) => {
          const [label, value, detail] = pair(r, ['label', 'value', 'detail']);
          return `<div class="row"><div><b>${esc(label)}</b>${detail ? `<span>${esc(detail)}</span>` : ''}</div><strong>${esc(value)}</strong></div>`;
        })
        .join('')}</div>${note}`;
    if (s.type === 'math') {
      const [tl, tv] = pair(s.total, ['label', 'value']);
      body = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}${s.title ? `<h1 data-fit="52">${em(s.title)}</h1>` : ''}<div class="sum">${s.lines
        .map((l) => {
          const [a, b] = pair(l, ['label', 'value']);
          return `<div class="line"><span>${esc(a)}</span><b>${esc(b)}</b></div>`;
        })
        .join('')}<div class="line total"><span>${esc(tl)}</span><b data-fit="80">${esc(tv)}</b></div></div>${note}`;
    }
    if (s.type === 'checklist')
      body = `<h1 data-fit="52">${em(s.title)}</h1><ol class="${s.numbered === false ? 'list plain' : 'list'}">${s.items.map((t) => `<li>${em(t)}</li>`).join('')}</ol>${s.note ? `<p class="lead small">${em(s.note)}</p>` : ''}`;
    if (s.type === 'cards')
      body = `<h1 data-fit="52">${em(s.title)}</h1><div class="deck">${s.cards
        .map((c) => {
          const [name, value, text] = pair(c, ['title', 'value', 'text']);
          return `<div class="card"><b>${esc(name)}</b>${value ? `<strong>${esc(value)}</strong>` : ''}${text ? `<span>${esc(text)}</span>` : ''}</div>`;
        })
        .join('')}</div>${note}`;
    if (s.type === 'cta') {
      const link = s.link || deck.url;
      const author = s.author || deck.author;
      body = `<h1 data-fit="52">${em(s.title)}</h1>${link ? `<div class="link">${esc(link)}</div>` : ''}${s.hint === false ? '' : `<p class="lead small">${esc(s.hint || 'Link in the comments.')}</p>`}`;
      if (author) after = `<div class="who"><b>${esc(author.name)}</b>${author.role ? `<span>${esc(author.role)}</span>` : ''}</div>`;
    }
    return `<section class="page t-${s.type}">${glow(brand)}<div class="inner">${brandRow(brand)}
<div class="content"><div class="stack">${body}</div></div>${after}
<div class="foot"><span>${esc(brand.url)}</span><span>${index + 1} / ${total}</span></div></div></section>`;
  },
};

const glow = (brand) => (brand.background.style === 'glow' ? '<div class="glow"></div>' : '');

// Instagram story, 1080x1920. Content stays out of the top 250px and bottom 330px,
// where Instagram draws the progress bar, the profile row and the reply box.
export const story = {
  width: 1080,
  height: 1920,
  css: () => `
.inner{position:relative;height:100%;padding:250px 96px 330px;display:flex;flex-direction:column}
.brand{gap:16px;font-size:36px}
.brand img{height:54px}
.group{margin-left:auto;padding-left:24px;font:600 28px/1 var(--text);color:var(--muted);letter-spacing:0}
.kicker{align-self:flex-start;padding:16px 26px;border-radius:999px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--edge);font:600 32px/1.1 var(--text);color:var(--body)}
.big{margin-top:40px;font:800 260px/.9 var(--display);letter-spacing:-.06em;white-space:nowrap}
.title{margin-top:28px;font:800 76px/1.02 var(--display);letter-spacing:-.04em;text-wrap:balance}
.sub{margin-top:44px;font:500 38px/1.3 var(--text);color:var(--muted);text-wrap:pretty}
.qm{width:120px;height:120px;border-radius:50%;background:var(--ink);display:grid;place-items:center;flex:none}
blockquote{margin:56px 0 0;font:700 72px/1.12 var(--display);letter-spacing:-.035em;text-wrap:pretty}
.who{margin-top:56px;font:700 40px/1.1 var(--text)}
.who span{display:block;margin-top:14px;font:500 32px/1.2 var(--text);color:var(--muted)}
h1{margin:0;font:800 96px/1 var(--display);letter-spacing:-.045em;text-wrap:balance}
ol{margin:64px 0 0;padding:0;list-style:none;counter-reset:n;display:flex;flex-direction:column;gap:40px}
li{counter-increment:n;display:flex;gap:30px;align-items:baseline;font:600 48px/1.25 var(--text);text-wrap:pretty}
li::before{content:counter(n);flex:none;width:70px;height:70px;border-radius:50%;background:var(--ink);color:var(--bg);font:800 34px/70px var(--display);text-align:center;transform:translateY(-6px)}
.link{margin-top:64px;align-self:flex-start;max-width:100%;padding:30px 44px;border-radius:24px;background:var(--ink);color:var(--bg);font:700 52px/1.1 var(--text);overflow-wrap:anywhere}
.hint{margin:36px 0 0;font:500 36px/1.3 var(--text);color:var(--muted)}`,
  page(s, { brand }) {
    let c = '';
    if (s.type === 'stat')
      c = `${s.kicker ? `<div class="kicker">${esc(s.kicker)}</div>` : ''}<div class="big" data-fit="120">${esc(s.number)}</div>${s.line ? `<div class="title" data-fit="52">${em(s.line)}</div>` : ''}${s.footnote ? `<div class="sub">${em(s.footnote)}</div>` : ''}`;
    if (s.type === 'quote')
      c = `<div class="qm">${icon('quote', 64, 'var(--accent)', 1.8)}</div><blockquote data-fit="44">${em(s.quote)}</blockquote>${s.name ? `<div class="who">${esc(s.name)}${s.role ? `<span>${esc(s.role)}</span>` : ''}</div>` : ''}`;
    if (s.type === 'list') c = `<h1 data-fit="60">${em(s.title)}</h1><ol>${s.items.map((t) => `<li>${em(t)}</li>`).join('')}</ol>`;
    if (s.type === 'cta')
      c = `<h1 data-fit="60">${em(s.title)}</h1>${s.link ? `<div class="link">${esc(s.link)}</div>` : ''}${s.hint ? `<p class="hint">${esc(s.hint)}</p>` : ''}`;
    const group = s.group ? `<span class="group">${esc(s.group)}</span>` : '';
    return `<section class="page t-${s.type}">${glow(brand)}<div class="inner">${brandRow(brand).replace(/<\/div>$/, `${group}</div>`)}<div class="content"><div class="stack">${c}</div></div></div></section>`;
  },
};

// Instagram highlight cover, 1080x1920. Instagram crops it to the centre circle, so the icon sits there.
export const highlight = {
  width: 1080,
  height: 1920,
  css: () => `
.cover{display:grid;place-items:center}
.ring{width:760px;height:760px;border-radius:50%;display:grid;place-items:center;position:relative}
.ring img{width:400px;height:400px;object-fit:contain}
.s-ink{background:var(--ink)}.s-ink .ring{background:var(--bg);color:var(--ink)}
.s-accent{background:var(--accent)}.s-accent .ring{background:var(--bg);color:var(--ink)}
.s-light .ring{background:var(--ink);color:var(--bg)}`,
  page(h, { brand }) {
    const style = h.style || 'ink';
    const mark = h.svg ? `<img src="${h.svg}" alt="">` : icon(h.icon, 400, 'currentColor', 1.6);
    return `<section class="page cover s-${style}">${style === 'light' ? glow(brand) : ''}<div class="ring">${mark}</div></section>`;
  },
};

// LinkedIn profile banner, 1584x396. The profile photo covers the bottom left, so the left 420px stay clear.
export const banner = {
  width: 1584,
  height: 396,
  wide: true,
  css: () => `
.inner{position:relative;height:100%;padding:48px 64px 48px 440px;display:flex}
.content{align-items:flex-end;text-align:right}
.stack{align-items:flex-end;max-width:100%}
.kick{margin-bottom:16px;font:700 24px/1 var(--text);letter-spacing:.08em;text-transform:uppercase;color:var(--accent-ink)}
h1{margin:0;font:800 60px/1.02 var(--display);letter-spacing:-.04em;max-width:1000px;text-wrap:balance}
.chips{margin-top:26px;display:flex;gap:12px;justify-content:flex-end}
.chips span{padding:12px 20px;border-radius:999px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--edge);font:600 22px/1 var(--text);color:var(--body);white-space:nowrap}
.url{margin-top:22px;font:700 26px/1 var(--text);color:var(--accent-ink)}`,
  page(b, { brand }) {
    return `<section class="page">${glow(brand)}<div class="inner"><div class="content"><div class="stack">${b.kicker ? `<div class="kick">${esc(b.kicker)}</div>` : ''}<h1 data-fit="40">${em(b.title)}</h1>${b.chips?.length ? `<div class="chips">${b.chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>` : ''}${b.url ? `<div class="url">${esc(b.url)}</div>` : ''}</div></div></div></section>`;
  },
};

// Open Graph share card, 1200x630.
export const og = {
  width: 1200,
  height: 630,
  wide: true,
  css: () => `
.inner{position:relative;height:100%;padding:60px 76px 58px;display:flex;flex-direction:column}
.brand{gap:14px;font-size:30px}
.brand img{height:46px}
.content{justify-content:flex-end}
.kicker{align-self:flex-start;padding:11px 20px;border-radius:999px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--edge);font:600 23px/1.1 var(--text);color:var(--body)}
h1{margin:22px 0 0;max-width:1010px;font:800 76px/.98 var(--display);letter-spacing:-.045em;text-wrap:balance}
h1 em{font-size:1.08em}
.url{margin-top:30px;font:600 24px/1 var(--text);color:var(--muted)}`,
  page(o, { brand }) {
    const url = o.url ?? brand.url;
    return `<section class="page">${glow(brand)}<div class="inner">${brandRow(brand)}<div class="content"><div class="stack">${o.kicker ? `<div class="kicker">${esc(o.kicker)}</div>` : ''}<h1 data-fit="48">${em(o.title)}</h1>${url ? `<div class="url">${esc(url)}</div>` : ''}</div></div></div></section>`;
  },
};

// Square quote card, 1080x1080.
export const quote = {
  width: 1080,
  height: 1080,
  css: () => `
.inner{position:relative;height:100%;padding:88px 96px 80px;display:flex;flex-direction:column}
.qm{color:var(--accent);margin-left:-8px}
blockquote{margin:36px 0 0;font:700 68px/1.1 var(--display);letter-spacing:-.035em;text-wrap:pretty}
.who{margin-top:48px;display:flex;flex-direction:column;gap:12px}
.who b{font:700 36px/1.1 var(--text)}
.who span{font:500 30px/1.2 var(--text);color:var(--muted)}
.foot{display:flex;justify-content:space-between;align-items:center;padding-top:32px}
.brand{gap:14px;font-size:30px}
.brand img{height:46px}
.foot .url{font:600 26px/1 var(--text);color:var(--muted)}`,
  page(q, { brand }) {
    const url = q.url ?? brand.url;
    return `<section class="page">${glow(brand)}<div class="inner"><div class="content"><div class="stack"><div class="qm">${icon('quote', 112, 'currentColor', 1.6)}</div><blockquote data-fit="40">${em(q.quote)}</blockquote>${q.name ? `<div class="who"><b>${esc(q.name)}</b>${q.role ? `<span>${esc(q.role)}</span>` : ''}</div>` : ''}</div></div><div class="foot">${brandRow(brand)}${url ? `<span class="url">${esc(url)}</span>` : ''}</div></div></section>`;
  },
};

export const SLIDE_TYPES = ['cover', 'statement', 'rows', 'math', 'checklist', 'cards', 'cta'];
export const STORY_TYPES = ['stat', 'quote', 'list', 'cta'];
export const HIGHLIGHT_STYLES = ['ink', 'accent', 'light'];
export { ICONS };
