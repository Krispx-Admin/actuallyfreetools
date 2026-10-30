/* checks the built ./site in headless Edge: page headings, presets on task pages,
   static pages left alone, internal navigation, and ad-rail layout at several widths.
   node dev/site-check.js            (uses a fake AdSense id so the ad slots are laid out) */
const http = require('http'), fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), SITE = path.join(ROOT, 'site-check-build');
/* build a throwaway copy with ad slots switched on, so their layout can be measured */
const cfgFile = path.join(__dirname, 'site.config.json'), hadCfg = fs.existsSync(cfgFile), oldCfg = hadCfg ? fs.readFileSync(cfgFile, 'utf8') : null;
const cfg = Object.assign(hadCfg ? JSON.parse(oldCfg) : {}, { ADSENSE_CLIENT: 'ca-pub-0000000000000000', AD_SLOT_RAIL: '1111111111', AD_SLOT_BOTTOM: '2222222222' });
fs.writeFileSync(cfgFile, JSON.stringify(cfg));
try { execFileSync(process.execPath, [path.join(__dirname, 'build-site.js')], { stdio: 'ignore' }); }
finally { if (hadCfg) fs.writeFileSync(cfgFile, oldCfg); else fs.unlinkSync(cfgFile); }
fs.rmSync(SITE, { recursive: true, force: true });
fs.renameSync(path.join(ROOT, 'site'), SITE);
execFileSync(process.execPath, [path.join(__dirname, 'build-site.js')], { stdio: 'ignore' });   /* restore the real build */

const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(SITE, p), (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p).slice(1)] || 'application/octet-stream' }); r.end(d); });
}).listen(8766);
const br = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--remote-debugging-port=9334',
  '--user-data-dir=' + path.join(require('os').tmpdir(), 'trulyfree-sitecheck'), '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tgt;
  for (let i = 0; i < 60 && !tgt; i++) { await sleep(500); try { tgt = (await (await fetch('http://127.0.0.1:9334/json')).json()).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text);
    if (m.method === 'Page.loadEventFired' && pend.load) pend.load(); };
  const send = (method, params) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  const open = async (p, w) => {
    await send('Emulation.setDeviceMetricsOverride', { width: w || 1280, height: 900, deviceScaleFactor: 1, mobile: (w || 1280) < 600 });
    const l = new Promise(r => pend.load = r); await send('Page.navigate', { url: 'http://127.0.0.1:8766' + p }); await l; await sleep(700);
  };
  const ev = async expr => { const r = await send('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true }); return r.result.result.value; };
  const R = [];
  const check = (name, ok, detail) => R.push((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  — ' + detail : ''));

  await open('/');
  let v = await ev('return { cards: document.querySelectorAll("#main a.card").length, chips: document.querySelectorAll("#main a.chip").length, studios: document.querySelectorAll("#main .studio").length, href: document.querySelector("#main a.card").getAttribute("href"), drop: !!document.querySelector("#main .herodrop"), guide: !!document.querySelector(".guide .lede") }');
  check('home: drop zone, 4 studios with task chips, real links', v.drop && v.studios === 4 && v.chips >= 15 && v.cards >= 30 && /^\/[a-z0-9-]+\/$/.test(v.href), JSON.stringify(v));
  check('home: guide content present', v.guide);

  await open('/ocr/');
  v = await ev('return { h1: document.querySelector("#main h1").textContent, drop: !!document.querySelector("#main .drop"), title: document.title, guide: document.querySelectorAll(".guide h3").length }');
  check('/ocr/: tool runs under its SEO heading', v.h1 === 'Actually Free OCR' && v.drop, v.h1 + ' | ' + v.title);
  check('/ocr/: FAQ visible in the page', v.guide >= 5, v.guide + ' questions');

  await open('/compress-pdf-to-100kb/');
  v = await ev(`const d = await PDFLib.PDFDocument.create(); d.addPage();
    const f = new File([await d.save()], 'a.pdf', { type: 'application/pdf' }), dt = new DataTransfer(); dt.items.add(f);
    const i = document.querySelector('#main .drop input'); i.files = dt.files; i.dispatchEvent(new Event('change'));
    for (let k = 0; k < 50 && !document.querySelector('.choice [aria-checked=true][data-v=target]'); k++) await new Promise(r => setTimeout(r, 100));
    const size = [...document.querySelectorAll('.seg button[aria-selected=true]')].map(b => b.textContent);
    return { mode: (document.querySelector('.choice [aria-checked=true]') || {}).dataset.v, size: size };`);
  check('/compress-pdf-to-100kb/: opens on “Fit a size limit” → 100 KB', v.mode === 'target' && v.size.indexOf('100 KB') >= 0, JSON.stringify(v));

  await open('/pdf-to-excel/');
  v = await ev(`const d = await PDFLib.PDFDocument.create(); d.addPage();
    const f = new File([await d.save()], 'a.pdf', { type: 'application/pdf' }), dt = new DataTransfer(); dt.items.add(f);
    const i = document.querySelector('#main .drop input'); i.files = dt.files; i.dispatchEvent(new Event('change'));
    for (let k = 0; k < 50 && !document.querySelector('.choice [aria-checked=true]'); k++) await new Promise(r => setTimeout(r, 100));
    return document.querySelector('.choice [aria-checked=true]').dataset.v;`);
  check('/pdf-to-excel/: opens with Excel selected', v === 'xlsx', v);

  await open('/jpg-to-png/');
  v = await ev(`const c = document.createElement('canvas'); c.width = c.height = 20; const b = await new Promise(r => c.toBlob(r, 'image/jpeg'));
    const dt = new DataTransfer(); dt.items.add(new File([b], 'x.jpg', { type: 'image/jpeg' }));
    const i = document.querySelector('#main .drop input'); i.files = dt.files; i.dispatchEvent(new Event('change'));
    for (let k = 0; k < 50 && !document.querySelector('.choice [aria-checked=true]'); k++) await new Promise(r => setTimeout(r, 100));
    return document.querySelector('.choice [aria-checked=true]').dataset.v;`);
  check('/jpg-to-png/: opens with PNG selected', v === 'png', v);

  await open('/privacy/');
  v = await ev('return { h1: document.querySelector("#main h1").textContent, ads: document.querySelectorAll("ins.adsbygoogle").length }');
  check('/privacy/: static page untouched, no ads', v.h1 === 'Privacy policy' && v.ads === 0, JSON.stringify(v));

  await open('/pdf-tools/');
  v = await ev('return { cards: document.querySelectorAll("#main a.card").length, tasks: document.querySelectorAll(".rel a").length }');
  check('/pdf-tools/: hub lists its tools and tasks', v.cards === 22 && v.tasks >= 5, JSON.stringify(v));

  for (const w of [1280, 1700]) {
    await open('/merge-pdf/', w);
    v = await ev(`const c = document.querySelector('.center').getBoundingClientRect(), r = [...document.querySelectorAll('.ad-rail')].map(a => a.getBoundingClientRect());
      const f = document.querySelector('footer').getBoundingClientRect(), drop = document.querySelector('#main .drop').getBoundingClientRect();
      return { center: [Math.round(c.left), Math.round(c.right)], rails: r.map(x => [Math.round(x.left), Math.round(x.right), Math.round(x.width)]),
        overlapTool: r.some(x => x.width && x.right > drop.left && x.left < drop.right), railBottomBeforeFooter: r.every(x => x.bottom <= f.top + 1),
        bottomAd: !!document.querySelector('.ad-bottom ins') };`);
    check('ad rails at ' + w + 'px: beside the tool, never over it', v.rails.length === 2 && v.rails.every(x => x[2] >= 160) && !v.overlapTool && v.railBottomBeforeFooter && v.bottomAd, JSON.stringify(v));
  }
  await open('/merge-pdf/', 390);
  v = await ev('return { rails: [...document.querySelectorAll(".ad-rail")].map(a => a.offsetWidth), bottom: !!document.querySelector(".ad-bottom"), scrollX: document.documentElement.scrollWidth > window.innerWidth }');
  check('phone (390px): no side rails, bottom slot only, no sideways scroll', v.rails.every(x => x === 0) && v.bottom && !v.scrollX, JSON.stringify(v));

  console.log(R.join('\n'));
  if (errs.length) console.log('PAGE ERRORS (ad script errors are expected — the id is fake):\n  ' + [...new Set(errs)].slice(0, 10).join('\n  '));
  ws.close(); br.kill(); server.close(); fs.rmSync(SITE, { recursive: true, force: true }); process.exit(0);
})().catch(e => { console.log('CHECK ERROR', e); br.kill(); server.close(); process.exit(1); });
