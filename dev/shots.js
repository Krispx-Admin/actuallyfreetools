/* Screenshots of key screens with real files loaded, for design review.
   node dev/shots.js [name,name…]  → dev/shots/*.png */
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..'), OUTD = path.join(__dirname, 'shots');
fs.mkdirSync(OUTD, { recursive: true });
const only = process.argv[2] ? process.argv[2].split(',') : null;
const server = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/, '') || 'actuallyfreetools.html');
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': /\.html$/.test(f) ? 'text/html; charset=utf-8' : 'application/octet-stream' }); r.end(d); });
}).listen(8767);
const br = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--remote-debugging-port=9335',
  '--user-data-dir=' + path.join(require('os').tmpdir(), 'trulyfree-shots'), '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* in-page helpers, injected once */
const HELP = `
window.__mk = async (lines, n, w, h) => { const d = await PDFLib.PDFDocument.create(), f = await d.embedFont(PDFLib.StandardFonts.Helvetica), b = await d.embedFont(PDFLib.StandardFonts.HelveticaBold);
  for (let i = 0; i < n; i++) { const p = d.addPage([w || 595, h || 842]); p.drawText((lines[0] || 'Document') + ' — page ' + (i + 1), { x: 50, y: (h || 842) - 80, size: 22, font: b, color: PDFLib.rgb(.1,.15,.13) });
    for (let k = 1; k < 18; k++) p.drawText(lines[k % lines.length] || 'The quick brown fox jumps over the lazy dog, again and again.', { x: 50, y: (h || 842) - 120 - k * 22, size: 11, font: f }); }
  return new File([await d.save()], (lines[0] || 'doc') + '.pdf', { type: 'application/pdf' }); };
window.__drop = (files, idx) => { const ins = [...document.querySelectorAll('#main .drop')].filter(d => d.offsetParent).map(d => d.querySelector('input[type=file]')); const i = ins[idx || 0]; const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); i.files = dt.files; i.dispatchEvent(new Event('change')); };
window.__img = async (w, h, draw, name, type) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const b = await new Promise(r => c.toBlob(r, type || 'image/jpeg', .9)); return new File([b], name || 'photo.jpg', { type: b.type }); };
window.__photo = () => __img(1200, 800, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#9fd3ff'); g.addColorStop(1, '#f6e7c8'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#3d7a4a'; x.beginPath(); x.moveTo(0, 560); x.quadraticCurveTo(300, 420, 640, 540); x.quadraticCurveTo(900, 640, 1200, 500); x.lineTo(1200, 800); x.lineTo(0, 800); x.fill();
  x.fillStyle = '#c0392b'; x.beginPath(); x.arc(560, 430, 120, 0, 7); x.fill(); x.fillStyle = '#f1c40f'; x.beginPath(); x.arc(980, 150, 70, 0, 7); x.fill();
  x.fillStyle = '#222'; x.fillRect(220, 600, 220, 60); x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.fillText('AB 1234', 250, 642); });
window.__wait = async (sel, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { if (document.querySelector(sel)) return true; await new Promise(r => setTimeout(r, 100)); } return false; };
window.__click = label => { const b = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === label); if (b) b.click(); return !!b; };
`;
const SHOTS = [
  ['home', 1280, `/*ROUTE:*/ `, 700],
  ['merge', 1280, `/*ROUTE:#/merge-pdf*/ await __wait('#main .drop'); __drop([await __mk(['Contract'], 3), await __mk(['Invoice'], 2)]); await __wait('.e-legend');`, 1500],
  ['split', 1280, `/*ROUTE:#/split-pdf*/ await __wait('#main .drop'); __drop([await __mk(['Report'], 6)]); await __wait('.e-pg .cut'); document.querySelectorAll('.e-pg .cut')[2].click();`, 1500],
  ['image-crop', 1280, `/*ROUTE:#/crop-image*/ await __wait('#main .drop'); __drop([await __photo()]); await __wait('.tabs'); __click('UK / EU / Schengen — 35×45 mm');`, 1200],
  ['image-save', 1280, `/*ROUTE:#/compress-image*/ await __wait('#main .drop'); __drop([await __photo()]); await __wait('.ba', 20000);`, 1500],
  ['image-blur', 1280, `/*ROUTE:#/blur-image*/ await __wait('#main .drop'); __drop([await __photo()]); await __wait('.tabs');`, 900],
  ['video', 1280, `/*ROUTE:#/video-editor*/ await __wait('#main .drop'); const v = new File([await (await fetch('https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4')).blob()], 'bunny.mp4'); __drop([v]); await __wait('.tl', 20000);`, 6000],
  ['audio', 1280, `/*ROUTE:#/audio-convert*/ await __wait('#main .drop'); 
    const sr = 22050, n = sr * 6, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) { const env = Math.abs(Math.sin(i / sr * 1.7)) * (0.3 + 0.7 * Math.abs(Math.sin(i / sr * 7))); v.setInt16(44 + i * 2, Math.sin(i / sr * 2 * Math.PI * 220) * 14000 * env, true); }
    __drop([new File([buf], 'voice-note.wav', { type: 'audio/wav' })]); await __wait('.tl', 15000);`, 2500],
  ['watermark', 1280, `/*ROUTE:#/watermark-pdf*/ await __wait('#main .drop'); __drop([await __mk(['Proposal'], 3)]); await __wait('.livepv canvas');`, 1500],
  ['page-numbers', 1280, `/*ROUTE:#/page-numbers*/ await __wait('#main .drop'); __drop([await __mk(['Handbook'], 3)]); await __wait('.pospick');`, 1500],
  ['invoice', 1280, `/*ROUTE:#/invoice*/ await __wait('.livepv'); const t = [...document.querySelectorAll('#main input[type=text]')]; t[0].value = 'Acme Studio'; t[0].dispatchEvent(new Event('input', { bubbles: true }));`, 2000],
  ['pdf-to-office', 1280, `/*ROUTE:#/pdf-to-office*/ await __wait('#main .drop'); 
    const d = await PDFLib.PDFDocument.create(), f = await d.embedFont(PDFLib.StandardFonts.Helvetica), b = await d.embedFont(PDFLib.StandardFonts.HelveticaBold), p = d.addPage([595, 842]);
    p.drawText('Quarterly Report', { x: 50, y: 780, size: 24, font: b }); ['This report summarises sales for every region in the last quarter.', 'Figures are in units sold; prices are in dollars.'].forEach((l, i) => p.drawText(l, { x: 50, y: 740 - i * 16, size: 11, font: f }));
    [['Item', 'Qty', 'Price'], ['Apples', '3', '1.50'], ['Pears', '12', '2.25'], ['Plums', '1,200', '0.80'], ['Figs', '40', '3.10']].forEach((r, i) => r.forEach((c, j) => p.drawText(c, { x: 50 + j * 160, y: 680 - i * 18, size: 11, font: i ? f : b })));
    __drop([new File([await d.save()], 'report.pdf', { type: 'application/pdf' })]); await __wait('.livepv canvas');`, 2000],
  ['booklet', 1280, `/*ROUTE:#/page-layout*/ await __wait('#main .drop'); __drop([await __mk(['Zine'], 6)]); await __wait('.choice'); document.querySelector('.choice [data-v=booklet]').click();`, 2000],
  ['phone-home', 390, `/*ROUTE:*/ `, 700]
];
(async () => {
  let tgt;
  for (let i = 0; i < 60 && !tgt; i++) { await sleep(500); try { tgt = (await (await fetch('http://127.0.0.1:9335/json')).json()).find(t => t.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, errs = [];
  ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
    if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text);
    if (m.method === 'Page.loadEventFired' && pend.load) pend.load(); };
  const send = (method, params) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  for (const [name, w, js, wait] of SHOTS) {
    if (only && only.indexOf(name) < 0) continue;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
    const route = (js.match(/\/\*ROUTE:([^*]*)\*\//) || ['', ''])[1];
    const l = new Promise(r2 => pend.load = r2); await send('Page.navigate', { url: 'http://127.0.0.1:8767/actuallyfreetools.html?' + name + route }); await l; await sleep(900);
    await send('Runtime.evaluate', { expression: HELP });
    const r = await send('Runtime.evaluate', { expression: '(async()=>{' + js + '})()', awaitPromise: true });
    if (r.result.exceptionDetails) console.log(name, 'SETUP ERROR', JSON.stringify(r.result.exceptionDetails).slice(0, 300));
    await sleep(wait);
    const hgt = (await send('Runtime.evaluate', { expression: 'Math.min(3200, document.documentElement.scrollHeight)', returnByValue: true })).result.result.value;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: hgt, deviceScaleFactor: 1, mobile: w < 600 });
    await sleep(300);
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(path.join(OUTD, name + '.png'), Buffer.from(shot.result.data, 'base64'));
    console.log('shot', name, w + 'x' + hgt);
  }
  if (errs.length) console.log('PAGE ERRORS:\n  ' + [...new Set(errs)].join('\n  '));
  ws.close(); br.kill(); server.close(); process.exit(0);
})().catch(e => { console.log('ERR', e); br.kill(); server.close(); process.exit(1); });
