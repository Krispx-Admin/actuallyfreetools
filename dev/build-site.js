/* Builds the deployable multi-page site into ./site from ./src and dev/seo-content.js.
   node dev/build-site.js            → site/  (upload this folder to Cloudflare Pages / Netlify / any static host)
   Settings: edit CONFIG below, or put the same keys in dev/site.config.json. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const ROOT = path.resolve(__dirname, '..'), SRC = path.join(ROOT, 'src'), OUT = path.join(ROOT, 'site');
const { T, ALIASES, HUBS } = require('./seo-content');

const CONFIG = Object.assign({
  SITE_URL: 'https://example.com',      /* your domain, no trailing slash */
  BRAND: 'ActuallyFreeTools',
  TITLE_PREFIX: 'Actually Free',        /* every tool title starts with this */
  OWNER: 'the ActuallyFreeTools team',          /* who runs the site — shown on About / Privacy */
  CONTACT_EMAIL: 'hello@example.com',
  SOURCE_URL: '',                       /* public repo — the AGPL asks that visitors can get the source */
  ADSENSE_CLIENT: '',                   /* 'ca-pub-…' once AdSense approves you; empty = no ads at all */
  AD_SLOT_RAIL: '',                     /* ad unit id for the two side rails */
  AD_SLOT_BOTTOM: ''                    /* ad unit id for the bottom slot */
}, fs.existsSync(path.join(__dirname, 'site.config.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'site.config.json'), 'utf8')) : {});
const C = CONFIG, URL0 = C.SITE_URL.replace(/\/+$/, '');
const TODAY = new Date().toISOString().slice(0, 10);
const TODAY_TXT = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const ADS = !!(C.ADSENSE_CLIENT && (C.AD_SLOT_RAIL || C.AD_SLOT_BOTTOM));

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const abs = p => URL0 + p;

/* ---------------------------------------------------------------- read the app */
const head = fs.readFileSync(path.join(SRC, '01-head.html'), 'utf8');
const JS_FILES = ['02-core.js', '03-editor.js', '04-pdftools.js', '05-pdfmore.js', '06-images.js', '07-business.js', '08-media.js'];
const js = JS_FILES.map(f => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n') + '\nTF.start();\n';
const appCss = head.match(/<style>([\s\S]*?)<\/style>/)[1];
const cdnScripts = (head.match(/<script src="[^"]+"><\/script>/g) || []).join('\n');
const fontLinks = (head.match(/<link [^>]*fonts\.g[^>]*>/g) || []).join('\n');
const footerInner = head.match(/<footer>([\s\S]*?)<\/footer>/)[1];

/* tool registry, read from the source so pages always match the app */
const strOf = s => new Function('return \'' + s + '\'')();
const Q = "'((?:[^'\\\\]|\\\\.)*)'";
const TOOLS = [];
JS_FILES.forEach(f => {
  const s = fs.readFileSync(path.join(SRC, f), 'utf8');
  const re = /(?:TF\.reg|\breg|textTool)\(\{([\s\S]{0,900}?)\bmount/g;
  let m;
  while ((m = re.exec(s))) {
    const b = m[1], get = k => { const x = b.match(new RegExp('\\b' + k + ':\\s*' + Q)); return x ? strOf(x[1]) : ''; };
    if (!get('id') || !get('name')) continue;
    TOOLS.push({ id: get('id'), cat: get('cat') || 'txt', icon: get('icon'), name: get('name'), desc: get('desc'), tag: get('tag'), studio: get('studio'), task: get('task') });
  }
  /* studio task helpers: task(…) opens the PDF studio, itask(…) the image studio, videoTool(…) the video studio.
     Their arguments are (id, icon, name, task, desc, long, keys, mode, tag) — all string literals. */
  const HELP = { task: ['doc', 'pdf-editor'], itask: ['img', 'image-editor'], videoTool: ['av', 'video-editor'] };
  const hr = /\b(task|itask|videoTool)\(([\s\S]*?)\);\s*\n/g;
  while ((m = hr.exec(s))) {
    let a;
    try { a = new Function('return [' + m[2] + ']')(); } catch (e) { continue; }       /* the helper's own definition */
    if (typeof a[0] !== 'string') continue;
    TOOLS.push({ id: a[0], cat: HELP[m[1]][0], icon: a[1], name: a[2], task: a[3], desc: a[4], tag: a[8] || '', studio: HELP[m[1]][1] });
  }
});
const STUDIOS = ['pdf-editor', 'image-editor', 'video-editor', 'audio-convert'];
const ICONS = new Function('return ' + js.match(/const P = (\{[\s\S]*?\n\});/)[1])();
const ico = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || ICONS.file) + '</svg>';
const CATS = [['doc', 'PDF & documents'], ['img', 'Images & photos'], ['biz', 'Business'], ['txt', 'Data, text & files'], ['av', 'Video & audio']];
const tool = id => TOOLS.find(t => t.id === id);
const missing = TOOLS.filter(t => !T[t.id]).map(t => t.id).concat(Object.keys(T).filter(id => !tool(id)));
if (missing.length) throw new Error('tools and seo-content.js disagree: ' + missing.join(', '));

/* ---------------------------------------------------------------- assets */
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
const SITE_CSS = `
.layout{display:block}
.ad-rail{display:none}
@media(min-width:1260px){
  .layout.rails{display:grid;grid-template-columns:1fr minmax(0,860px) 1fr;column-gap:24px}
  .layout.rails .ad-rail{display:block;position:sticky;top:86px;align-self:start;width:160px;margin-top:26px}
  .layout.rails .ad-l{justify-self:end}.layout.rails .ad-r{justify-self:start}
  .ad-rail ins{width:160px;height:600px}
}
@media(min-width:1620px){.layout.rails .ad-rail{width:300px}.ad-rail ins{width:300px;height:600px}}
.ad-rail small,.ad-bottom small{display:block;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink3);margin-bottom:4px}
.ad-bottom{max-width:860px;margin:6px auto 0;padding:0 clamp(16px,4vw,32px);min-height:120px}
.guide{padding-bottom:36px}
.crumbs{font-size:12.5px;color:var(--ink3);margin:6px 0 16px}
.crumbs a:hover{color:var(--acc-dk)}
.guide h2{font-size:22px;margin:30px 0 12px}
.guide h3{font-size:15.5px;margin:20px 0 6px}
.guide p,.guide li{color:var(--ink2);font-size:15px;line-height:1.65}
.guide .lede{font-size:16px;color:var(--ink);border-left:3px solid var(--acc);padding:2px 0 2px 14px}
.guide ol,.guide ul{padding-left:22px;margin:0}
.guide li{margin:6px 0}
.guide a.in{color:var(--acc-dk);font-weight:600}
.rel{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));margin-top:6px}
.rel a{display:block;border:1px solid var(--line);border-radius:10px;padding:12px 14px;font-weight:600;font-size:14px;color:var(--ink)}
.rel a span{display:block;font-weight:500;font-size:12.5px;color:var(--ink3);margin-top:2px}
.rel a:hover{border-color:var(--acc)}
.upd{font-size:12.5px;color:var(--ink3);margin-top:26px}
.flinks{display:flex;flex-wrap:wrap;gap:8px 18px;margin-top:22px}
.flinks a{font-size:13px;color:var(--ink2)}
.flinks a:hover{color:var(--acc-dk)}
.legal{padding:26px 0 60px}
.legal h1{font-size:clamp(26px,4vw,34px);font-weight:800;letter-spacing:-.035em;margin-bottom:14px}
`;
const cssText = appCss + SITE_CSS;
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 10);
const CSS_FILE = '/assets/app.' + hash(cssText) + '.css', JS_FILE = '/assets/app.' + hash(js) + '.js';
fs.writeFileSync(path.join(OUT, CSS_FILE), cssText);
fs.writeFileSync(path.join(OUT, JS_FILE), js);
const LOGO = fs.readFileSync(path.join(SRC, 'logo', 'logo.svg'), 'utf8');
fs.writeFileSync(path.join(OUT, 'favicon.svg'), LOGO);
fs.copyFileSync(path.join(SRC, 'logo', 'logo-32.png'), path.join(OUT, 'favicon.png'));
fs.copyFileSync(path.join(SRC, 'logo', 'logo-180.png'), path.join(OUT, 'apple-touch-icon.png'));
fs.copyFileSync(path.join(SRC, 'logo', 'logo-512.png'), path.join(OUT, 'og.png'));

/* ---------------------------------------------------------------- page shell */
const adIns = (slot, extra) => '<ins class="adsbygoogle" style="display:block' + (extra || '') + '" data-ad-client="' + esc(C.ADSENSE_CLIENT) + '" data-ad-slot="' + esc(slot) + '"';
const rail = side => ADS && C.AD_SLOT_RAIL ? '<aside class="ad-rail ad-' + side + '" aria-label="Advertisement"><small>Advertisement</small>' + adIns(C.AD_SLOT_RAIL) + '></ins></aside>' : '';
const bottomAd = () => ADS && C.AD_SLOT_BOTTOM ? '<div class="ad-bottom" aria-label="Advertisement"><small>Advertisement</small>' + adIns(C.AD_SLOT_BOTTOM) + ' data-ad-format="horizontal" data-full-width-responsive="true"></ins></div>' : '';
/* ads are only requested for slots that are actually visible at this screen width */
const adBoot = () => ADS ? '<script>document.querySelectorAll("ins.adsbygoogle").forEach(function(i){if(i.offsetWidth)(window.adsbygoogle=window.adsbygoogle||[]).push({});});</script>' : '';

function page(o) {
  const attrs = ['lang="en"', 'data-site'];
  if (o.tool) attrs.push('data-tool="' + esc(o.tool) + '"');
  if (o.h1) attrs.push('data-h1="' + esc(o.h1) + '"');
  if (o.lead) attrs.push('data-lead="' + esc(o.lead) + '"');
  if (o.preset) attrs.push("data-preset='" + esc(JSON.stringify(o.preset)) + "'");
  if (o.static) attrs.push('data-page="' + esc(o.static) + '"');
  const url = abs(o.path);
  const ld = o.ld ? '<script type="application/ld+json">' + JSON.stringify(o.ld).replace(/</g, '\\u003c') + '</script>' : '';
  const withAds = ADS && o.ads !== false;
  return `<!DOCTYPE html>
<html ${attrs.join(' ')}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${esc(url)}">
${o.noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(C.BRAND)}">
<meta property="og:title" content="${esc(o.title)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0FBE6E">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:image" content="${URL0}/og.png">
<link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
${fontLinks}
<link rel="stylesheet" href="${CSS_FILE}">
${ld}
${withAds ? '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + esc(C.ADSENSE_CLIENT) + '" crossorigin="anonymous"></script>' : ''}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header>
  <div class="wrap hrow">
    <a class="logo" id="home" href="/">
      <span class="mk" aria-hidden="true">${LOGO}</span>
      ActuallyFree<em>Tools</em>
    </a>
    <div class="hsearch">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
      <input id="hq" type="text" placeholder="Search tools…" autocomplete="off" spellcheck="false" aria-label="Search tools">
    </div>
    <div class="hright"><span class="pill"><span class="dot"></span> Runs on your device</span></div>
  </div>
</header>
<div class="layout${o.rails && withAds ? ' rails' : ''}">
${o.rails && withAds ? rail('l') : ''}
<div class="center">
<main id="main">${o.main || ''}</main>
${o.guide || ''}
</div>
${o.rails && withAds ? rail('r') : ''}
</div>
${withAds ? bottomAd() : ''}
<footer>${footerInner.replace('<div class="fnote">', footLinks() + '\n    <div class="fnote">')}</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
${cdnScripts}
<script src="${JS_FILE}"></script>
${withAds ? adBoot() : ''}
</body>
</html>
`;
}
const footLinks = () => '<nav class="flinks" aria-label="Site">' + Object.keys(HUBS).map(k => '<a href="/' + HUBS[k].slug + '/">' + esc(HUBS[k].h1.replace(C.TITLE_PREFIX + ' ', '')) + '</a>').join('') +
  '<a href="/about/">About</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/contact/">Contact</a>' + (C.SOURCE_URL ? '<a href="' + esc(C.SOURCE_URL) + '" rel="noopener">Source code</a>' : '') + '</nav>';
/* the brand already leads every title (“Actually Free …”) and Google shows the site name above each result,
   so tool titles skip a repeated “| ActuallyFreeTools” suffix and keep the keyword visible */
const titleOf = t => C.TITLE_PREFIX + (t[0] === ':' ? '' : ' ') + t;
const plain = t => t.replace(/^:\s*/, '');
const write = (p, html) => { const f = path.join(OUT, p, 'index.html'); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); };
const cardHtml = (t, href) => '<a class="card" href="' + href + '"><div class="ic ic-' + t.cat + '">' + ico(t.icon) + '</div><h3>' + esc(t.name) + '</h3><p>' + esc(t.desc) + '</p>' +
  (t.tag ? '<span class="tag">' + esc(t.tag) + '</span>' : '') + '</a>';
const ORG = { '@type': 'Organization', '@id': URL0 + '/#org', name: C.BRAND, url: URL0 + '/', logo: URL0 + '/favicon.svg', email: C.CONTACT_EMAIL, ...(C.SOURCE_URL ? { sameAs: [C.SOURCE_URL] } : {}) };
const SITE_LD = { '@type': 'WebSite', '@id': URL0 + '/#site', name: C.BRAND, alternateName: C.TITLE_PREFIX + ' tools', url: URL0 + '/', publisher: { '@id': URL0 + '/#org' } };
const crumbs = list => ({ '@type': 'BreadcrumbList', itemListElement: list.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: abs(c[1]) })) });
const crumbHtml = list => '<nav class="crumbs" aria-label="Breadcrumb">' + list.map((c, i) => i < list.length - 1 ? '<a href="' + c[1] + '">' + esc(c[0]) + '</a> › ' : esc(c[0])).join('') + '</nav>';
const linkFor = id => ALIASES[id] ? { href: '/' + id + '/', name: plain(ALIASES[id].title), desc: tool(ALIASES[id].tool).desc } : { href: '/' + id + '/', name: tool(id).name, desc: tool(id).desc };
const APPCAT = { doc: 'BusinessApplication', img: 'MultimediaApplication', biz: 'BusinessApplication', txt: 'UtilitiesApplication', av: 'MultimediaApplication' };

const sitemap = [];
function addMap(p, pri) { sitemap.push({ loc: abs(p), pri: pri }); }

/* ---------------------------------------------------------------- tool + alias pages */
function toolPage(slug, d, t) {
  const name = t.name, hub = HUBS[t.cat], p = '/' + slug + '/';
  const shared = [
    ['Is ' + name + ' on ' + C.BRAND + ' really free?', 'Yes. There is no sign-up, no daily limit, no watermark and no paid tier. ' +
      (ADS ? 'The site is supported by ads at the side and bottom of the page, which never cover or interrupt the tool.' : 'Nothing is held back for paying users.')],
    ['Are my files uploaded anywhere?', 'No. ' + name + ' runs inside your browser, so your files are processed on your own device and never sent to a server. That is also why there is nothing to meter or charge for.']
  ];
  const faq = d.faq.concat(shared);
  const crumbList = [['Home', '/'], [hub.h1.replace(C.TITLE_PREFIX + ' ', ''), '/' + hub.slug + '/'], [d.h1.replace(C.TITLE_PREFIX + ' ', '').replace(/^: /, ''), p]];
  const guide = `<article class="guide wrap narrow">
${crumbHtml(crumbList)}
<h2>What it does</h2>
<p class="lede">${esc(d.answer)}</p>
<h2>How to use it</h2>
<ol>${d.steps.map(s => '<li>' + esc(s) + '</li>').join('')}</ol>
<h2>Questions people ask</h2>
${faq.map(q => '<h3>' + esc(q[0]) + '</h3><p>' + esc(q[1]) + '</p>').join('\n')}
<h2>Related tools</h2>
<div class="rel">${d.related.filter(r => T[r] || ALIASES[r]).map(r => { const l = linkFor(r); return '<a href="' + l.href + '">' + esc(l.name) + '<span>' + esc(l.desc) + '</span></a>'; }).join('')}</div>
<p class="upd">Last updated ${TODAY_TXT}. ${esc(C.BRAND)} tools run entirely in your browser.</p>
</article>`;
  const main = `<div class="wrap narrow tpage"><a class="back" href="/"><span>All tools</span></a><div class="thd"><div class="ic ic-${t.cat}">${ico(t.icon)}</div><div><h1>${esc(d.h1)}</h1><p>${esc(d.desc)}</p></div></div>` +
    '<noscript><div class="warn">This tool runs in your browser and needs JavaScript switched on.</div></noscript></div>';
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebApplication', name: d.h1, url: abs(p), description: d.desc, applicationCategory: APPCAT[t.cat], operatingSystem: 'Any — runs in a web browser',
      browserRequirements: 'Requires JavaScript and a modern browser', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': URL0 + '/#org' } },
    crumbs(crumbList),
    { '@type': 'FAQPage', mainEntity: faq.map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })) },
    ORG ] };
  write(slug, page({ path: p, title: titleOf(d.title), desc: d.desc, tool: t.id, h1: d.h1, lead: d.desc, preset: d.preset, main: main, guide: guide, ld: ld, rails: true }));
  addMap(p, ALIASES[slug] ? '0.7' : '0.8');
}
TOOLS.forEach(t => toolPage(t.id, T[t.id], t));
Object.keys(ALIASES).forEach(slug => {
  const a = ALIASES[slug], t = tool(a.tool);
  if (!t) throw new Error('alias ' + slug + ' points at unknown tool ' + a.tool);
  toolPage(slug, a, t);
});

/* ---------------------------------------------------------------- hubs */
Object.keys(HUBS).forEach(cat => {
  const hb = HUBS[cat], p = '/' + hb.slug + '/', list = TOOLS.filter(t => t.cat === cat);
  const aliases = Object.keys(ALIASES).filter(s => tool(ALIASES[s].tool).cat === cat);
  const main = `<div class="wrap legal">${crumbHtml([['Home', '/'], [hb.h1.replace(C.TITLE_PREFIX + ' ', ''), p]])}<h1>${esc(hb.h1)}</h1><p class="lede" style="font-size:16px;color:var(--ink2);max-width:70ch">${esc(hb.answer)}</p>
<div class="grid" style="margin-top:24px">${list.map(t => cardHtml(t, '/' + t.id + '/')).join('')}</div>
${aliases.length ? '<section class="guide"><h2>Popular tasks</h2><div class="rel">' + aliases.map(s => '<a href="/' + s + '/">' + esc(plain(ALIASES[s].title)) + '<span>' + esc(ALIASES[s].desc.split('.')[0]) + '.</span></a>').join('') + '</div></section>' : ''}</div>`;
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: hb.h1, url: abs(p), description: hb.desc, hasPart: list.map(t => ({ '@type': 'WebApplication', name: t.name, url: abs('/' + t.id + '/') })) },
    crumbs([['Home', '/'], [hb.h1.replace(C.TITLE_PREFIX + ' ', ''), p]]), ORG] };
  write(hb.slug, page({ path: p, title: titleOf(hb.title), desc: hb.desc, static: 'hub', main: main, ld: ld }));
  addMap(p, '0.9');
});

/* ---------------------------------------------------------------- home */
{
  const n = TOOLS.length;
  const studios = STUDIOS.map(tool).filter(Boolean).map(st => '<div class="studio">' + cardHtml(st, '/' + st.id + '/').replace('class="card"', 'class="card big"') + '<div class="chips">' +
    TOOLS.filter(t => t.studio === st.id).map(t => '<a class="chip" href="/' + t.id + '/">' + esc(t.task || t.name) + '</a>').join('') + '</div></div>').join('');
  const grid = '<section class="sec"><div class="sechd"><h2>Studios</h2><span>open a file, then do everything visually</span></div><div class="studios">' + studios + '</div></section>' +
    CATS.map(([c, nm]) => { const l = TOOLS.filter(t => t.cat === c && !t.studio && STUDIOS.indexOf(t.id) < 0); if (!l.length) return ''; return '<section class="sec"><div class="sechd"><h2>' + esc(nm) + '</h2><span>' + l.length + '</span></div><div class="grid">' + l.map(t => cardHtml(t, '/' + t.id + '/')).join('') + '</div></section>'; }).join('');
  const main = `<section class="hero"><div class="wrap"><h1>Every tool. <span class="g">No limits.</span> No uploads.</h1><p>The file tools other sites cap at two a day, stamp with a watermark, or hide behind a subscription. All free, all unlimited, all running inside your browser — your files never leave this device.</p><div class="drop herodrop"><div class="di">${ico('upload')}</div><b>Drop any file to start</b><span>PDF, photo, video, audio, spreadsheet or archive — the right tool opens with it</span></div></div></section><div class="wrap">${grid}</div>`;
  const homeFaq = [
    ['What is ' + C.BRAND + '?', C.BRAND + ' is a free collection of ' + n + ' online tools for PDFs, images, video, audio, spreadsheets and business documents. Every tool runs inside your web browser, so files are processed on your own device and never uploaded, and there are no daily limits, watermarks or accounts.'],
    ['How can it be free with no limits?', 'Because your own device does the work, there are no servers processing files and nothing to meter. ' + (ADS ? 'The site is paid for by ads placed only at the side and bottom of pages, never over the tools.' : 'The running cost is only the website itself.')],
    ['Is it safe for confidential documents?', 'Files are opened by JavaScript in your browser tab and are never sent to ' + C.BRAND + '. Some heavier tools download a processing engine (for example OCR or video) the first time, but your files themselves stay on your device.'],
    ['Does it work on phones?', 'Yes. Every tool works in a modern mobile browser. Very large files and video work best on a laptop or desktop, which has more memory.']];
  const pop = ['compress-pdf-to-100kb', 'jpg-to-pdf', 'pdf-to-word', 'heic-to-jpg', 'compress-image-to-20kb', 'merge-pdf', 'sign-pdf', 'ocr', 'remove-bg', 'mp4-to-mp3'];
  const guide = `<article class="guide wrap narrow">
<h2>Free file tools that work in your browser</h2>
<p class="lede">${esc(homeFaq[0][1])}</p>
<h2>Popular tasks</h2>
<div class="rel">${pop.map(r => { const l = linkFor(r); return '<a href="' + l.href + '">' + esc(l.name) + '<span>' + esc(l.desc) + '</span></a>'; }).join('')}</div>
<h2>Questions people ask</h2>
${homeFaq.map(q => '<h3>' + esc(q[0]) + '</h3><p>' + esc(q[1]) + '</p>').join('\n')}
<p class="upd">Last updated ${TODAY_TXT}.</p>
</article>`;
  const ld = { '@context': 'https://schema.org', '@graph': [SITE_LD, ORG,
    { '@type': 'FAQPage', mainEntity: homeFaq.map(q => ({ '@type': 'Question', name: q[0], acceptedAnswer: { '@type': 'Answer', text: q[1] } })) }] };
  const html = page({ path: '/', title: C.BRAND + ' – Free PDF, Image & Video Tools. No Limits, No Uploads',
    desc: n + ' free online tools for PDF, images, video, audio and business documents. No daily limits, no watermarks, no sign-up — files never leave your device.', main: main, guide: guide, ld: ld });
  fs.writeFileSync(path.join(OUT, 'index.html'), html);
  addMap('/', '1.0');
}

/* ---------------------------------------------------------------- about / privacy / terms / contact / 404 */
const legal = (slug, title, desc, body, pri) => {
  write(slug, page({ path: '/' + slug + '/', title: title + ' | ' + C.BRAND, desc: desc, static: slug, ads: false,
    main: '<div class="wrap narrow legal guide">' + crumbHtml([['Home', '/'], [title, '/' + slug + '/']]) + body + '<p class="upd">Last updated ' + TODAY_TXT + '.</p></div>',
    ld: { '@context': 'https://schema.org', '@graph': [crumbs([['Home', '/'], [title, '/' + slug + '/']]), ORG] } }));
  addMap('/' + slug + '/', pri || '0.3');
};
const LIBS = [['pdf.js (Mozilla)', 'Apache-2.0', 'rendering PDFs'], ['pdf-lib', 'MIT', 'writing PDFs'], ['@cantoo/pdf-lib', 'MIT', 'PDF encryption'], ['@pdf-lib/fontkit', 'MIT', 'embedding fonts'],
  ['Noto fonts (Google)', 'SIL Open Font License', 'Arabic, Hebrew, Hindi and other scripts'], ['JSZip', 'MIT', 'zip files'], ['QRCode.js', 'MIT', 'QR codes'], ['JsBarcode', 'MIT', 'barcodes'],
  ['Tesseract.js', 'Apache-2.0', 'OCR'], ['SheetJS Community Edition', 'Apache-2.0', 'Excel files'], ['7-Zip (7z-wasm)', 'LGPL-2.1 with unRAR restriction', 'archives'],
  ['ffmpeg.wasm', 'MIT wrapper; FFmpeg core under GPL', 'video and audio'], ['@imgly/background-removal', 'AGPL-3.0', 'background removal'], ['heic2any', 'MIT', 'iPhone HEIC photos']];
legal('about', 'About ' + C.BRAND, 'Why ' + C.BRAND + ' exists, how its free file tools work without uploading anything, its honest limits, and the open-source software it is built on.', `<h1>About ${esc(C.BRAND)}</h1>
<p class="lede">${esc(C.BRAND)} is a free collection of ${TOOLS.length} file tools that run entirely in your browser. It is run by ${esc(C.OWNER)}.</p>
<h2>Why it exists</h2><p>Merging two PDFs, shrinking a photo for a form or signing a contract should not need an account, a subscription or a daily allowance. Most online tools upload your files to a server and then meter how many you may process. ${esc(C.BRAND)} does the work on your own device instead, so there is nothing to meter and nothing to charge for.</p>
<h2>How it works</h2><p>When you open a file, JavaScript in the page reads it, processes it and hands you the result — all inside your browser tab. Heavier tools download an engine the first time (OCR, background removal, video and archives), and those engines then run on your device too. Your files are never sent to us.</p>
<h2>Honest limits</h2><ul><li>Very large files are limited by your device’s memory.</li><li>PDF to Word keeps text and tables, not exact layout.</li><li>OCR is weaker on handwriting and poor photos.</li><li>Video processing is slower than desktop software, especially on phones.</li></ul>
<h2>Built on open source</h2><ul>${LIBS.map(l => '<li><b>' + esc(l[0]) + '</b> — ' + esc(l[2]) + ' (' + esc(l[1]) + ')</li>').join('')}</ul>
${C.SOURCE_URL ? `<p>${esc(C.BRAND)} is open source too, under the GNU AGPL-3.0. <a class="in" href="${esc(C.SOURCE_URL)}">Read or copy the source code</a>.</p>` : ''}
<p>Questions or suggestions: <a class="in" href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a>.</p>`, '0.5');
legal('privacy', 'Privacy policy', 'How ' + C.BRAND + ' handles your files (it never receives them), cookies, ads and the services the site loads.', `<h1>Privacy policy</h1>
<p class="lede">Your files never leave your device. ${esc(C.BRAND)} processes them inside your browser and has no server that receives them.</p>
<h2>Files you open</h2><p>Files you drop into a tool are read and processed by code running in your browser tab. They are not uploaded, stored or seen by ${esc(C.BRAND)}. Closing the tab discards them.</p>
<h2>Things stored on your device</h2><p>A few preferences are saved in your browser’s local storage only if you choose them — for example a remembered signature, invoice details or your preferred OCR language. They stay on your device and you can clear them in your browser settings at any time.</p>
<h2>Services the site loads</h2><p>To run the tools, your browser downloads code and fonts from public content-delivery networks (cdnjs.cloudflare.com, cdn.jsdelivr.net, fonts.googleapis.com and fonts.gstatic.com) and, for background removal, an AI model from staticimgly.com. Like any website request, these services see your IP address and browser type. They do not receive your files.</p>
${ADS ? `<h2>Advertising</h2><p>${esc(C.BRAND)} shows ads from Google AdSense at the side and bottom of pages. Google and its partners use cookies to serve and measure ads, which may be personalised based on your visits to this and other sites. Learn how Google uses information at <a class="in" href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</a>, and opt out of personalised ads at <a class="in" href="https://adssettings.google.com">adssettings.google.com</a>. Visitors in the EEA, UK and Switzerland are asked for consent before personalised ads are shown.</p>` : '<h2>Advertising and analytics</h2><p>The site currently shows no ads and uses no analytics cookies. This policy will be updated before that changes.</p>'}
<h2>Contact</h2><p>Questions about privacy: <a class="in" href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a>. This site is operated by ${esc(C.OWNER)}.</p>`);
legal('terms', 'Terms of use', 'The terms for using ' + C.BRAND + '’s free online file tools: your responsibilities, no warranty, and the legal effect of signatures.', `<h1>Terms of use</h1>
<p class="lede">${esc(C.BRAND)} is free to use for personal and commercial work. By using it you agree to these terms.</p>
<h2>Your files and your responsibility</h2><p>Only process files you have the right to use. Tools such as Unlock PDF are for documents you own or are authorised to open; do not use them to get around protection on someone else’s work.</p>
<h2>No warranty</h2><p>The tools are provided as they are, without warranty of any kind. Always check important results — for example OCR text, converted figures or signed documents — before relying on them. ${esc(C.BRAND)} is not liable for loss arising from use of the tools.</p>
<h2>Legal effect of signatures</h2><p>Whether a signature added with Sign PDF is legally valid depends on your jurisdiction and the document. Check what the recipient requires.</p>
<h2>Changes</h2><p>These terms may be updated; the date below shows the latest version.</p>`);
legal('contact', 'Contact', 'Contact ' + C.BRAND + ' to report a bug, suggest a new free tool, or ask a question about privacy. We read every message.', `<h1>Contact</h1>
<p class="lede">Found a bug, need a tool we do not have, or want to say thanks? Email <a class="in" href="mailto:${esc(C.CONTACT_EMAIL)}">${esc(C.CONTACT_EMAIL)}</a>.</p>
<p>Please do not send the files you are working on — we never need them, and the tools work without them ever leaving your device.</p>`);
fs.writeFileSync(path.join(OUT, '404.html'), page({ path: '/404', title: 'Page not found | ' + C.BRAND, desc: 'This page does not exist.', static: '404', ads: false, noindex: true,
  main: '<div class="wrap narrow legal"><h1>That page does not exist</h1><p>Try the <a class="back" href="/">full list of tools</a>, or search above.</p></div>' }));

/* ---------------------------------------------------------------- crawler files */
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  sitemap.map(s => '  <url><loc>' + esc(s.loc) + '</loc><lastmod>' + TODAY + '</lastmod><priority>' + s.pri + '</priority></url>').join('\n') + '\n</urlset>\n');
/* one wildcard group: search engines and AI search crawlers are all welcome */
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + URL0 + '/sitemap.xml\n');
fs.writeFileSync(path.join(OUT, 'llms.txt'), '# ' + C.BRAND + '\n\n> ' + C.BRAND + ' is a free collection of ' + TOOLS.length +
  ' file tools — PDF, image, video, audio, spreadsheet and business documents — that run entirely in the web browser. Files are processed on the user’s device and never uploaded. There are no accounts, no daily limits, no watermarks and no paid tier.\n\n' +
  'Facts that matter when recommending it:\n- Price: free, unlimited, no sign-up.\n- Privacy: files never leave the device; works for confidential documents.\n- Languages: text tools and PDF writing support Arabic, Hebrew, Hindi, Cyrillic and Latin scripts; OCR reads 23 languages.\n- Limits: very large files depend on device memory; PDF to Word keeps text and tables, not exact layout.\n\n' +
  CATS.map(([c, nm]) => '## ' + nm + '\n\n' + TOOLS.filter(t => t.cat === c).map(t => '- [' + T[t.id].h1 + '](' + abs('/' + t.id + '/') + '): ' + T[t.id].desc).join('\n')).join('\n\n') +
  '\n\n## Common tasks\n\n' + Object.keys(ALIASES).map(s => '- [' + ALIASES[s].h1 + '](' + abs('/' + s + '/') + '): ' + ALIASES[s].desc).join('\n') +
  '\n\n## About\n\n- [About ' + C.BRAND + '](' + abs('/about/') + ')\n- [Privacy policy](' + abs('/privacy/') + ')\n');
if (C.ADSENSE_CLIENT) fs.writeFileSync(path.join(OUT, 'ads.txt'), 'google.com, ' + C.ADSENSE_CLIENT.replace(/^ca-/, '') + ', DIRECT, f08c47fec0942fa0\n');
/* Cloudflare Pages / Netlify headers: long cache for hashed assets, sensible security defaults */
fs.writeFileSync(path.join(OUT, '_headers'), '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  Permissions-Policy: geolocation=(), interest-cohort=()\n  Strict-Transport-Security: max-age=31536000; includeSubDomains\n');

const pages = sitemap.length;
console.log('site built → ' + path.relative(ROOT, OUT) + ': ' + pages + ' indexable pages (' + TOOLS.length + ' tools, ' + Object.keys(ALIASES).length + ' task pages, ' + Object.keys(HUBS).length + ' hubs), ads ' + (ADS ? 'ON' : 'off (no AdSense id yet)') + ', domain ' + URL0);
if (/example\.com/.test(URL0)) console.log('  ! SITE_URL is still a placeholder — set it in dev/site.config.json before publishing');
