/* ============================================================ ActuallyFreeTools core */
const TF = (function () {
'use strict';

/* ---------- tiny dom ---------- */
const $ = s => document.querySelector(s);
function h(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- icons ---------- */
const P = {
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M20 16v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5"/><path d="M20 16v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>',
  merge: '<path d="M8 3v6a3 3 0 003 3h8"/><path d="M8 21v-6a3 3 0 013-3h8"/><path d="M16 9l3 3-3 3"/>',
  split: '<path d="M16 3h5v5"/><path d="M8 21H3v-5"/><path d="M21 3l-8 8"/><path d="M3 21l8-8"/>',
  compress: '<path d="M4 9h6V3"/><path d="M20 15h-6v6"/><path d="M10 9L3 2"/><path d="M14 15l7 7"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  file: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
  stamp: '<path d="M5 21h14"/><path d="M7 17h10l-1-4H8z"/><path d="M12 13V9a3 3 0 10-3-3"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12h6"/>',
  eraser: '<path d="M4 20h16"/><path d="M14.5 3.5l6 6-9 9-6-6z"/><path d="M8 8l6 6"/>',
  crop: '<path d="M6 2v14a2 2 0 002 2h14"/><path d="M2 6h14a2 2 0 012 2v14"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14h1M14 20h3M20 17v4"/>',
  invoice: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  type: '<path d="M4 6V4h16v2"/><path d="M12 4v16"/><path d="M9 20h6"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9 2 2-2 2 2 2-3 3-2-2-2 2"/>',
  code: '<path d="M8 6l-6 6 6 6"/><path d="M16 6l6 6-6 6"/>',
  sign: '<path d="M3 18c4-1 5-9 8-9s2 7 5 7 3-3 5-3"/><path d="M3 21h18"/>',
  back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  grip: '<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  rotate: '<path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 3v6h-6"/>',
  resize: '<path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/>',
  pages: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.1 15.9M14.5 14.5L20 20M8.1 8.1l3 3"/>',
  refresh: '<path d="M21 12a9 9 0 01-15.4 6.4L3 16"/><path d="M3 12a9 9 0 0115.4-6.4L21 8"/><path d="M21 3v5h-5"/><path d="M3 21v-5h5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  unlock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.6-1.7"/>',
  form: '<rect x="4" y="3" width="16" height="18" rx="2"/><rect x="7.5" y="7" width="9" height="3" rx=".6"/><rect x="7.5" y="13" width="9" height="3" rx=".6"/>',
  scan: '<path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><path d="M7 12h10"/>',
  ocr: '<path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"/><path d="M8 8h8M12 8v8"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  diff: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="6" r="3"/><path d="M6 15V3"/><path d="M18 9a9 9 0 01-9 9"/>',
  barcode: '<path d="M4 5v14M7 5v14M10.5 5v14M13 5v14M16.5 5v14M20 5v14"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a2 2 0 002 2h10a2 2 0 002-2V9"/><path d="M10 13h4"/>',
  video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  blur: '<circle cx="12" cy="12" r="9"/><path d="M8 9h.01M12 9h.01M16 9h.01M8 12h.01M12 12h.01M16 12h.01M8 15h.01M12 15h.01M16 15h.01"/>',
  wand: '<path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8L19 13M17.8 6.2L19 5M12.2 6.2L11 5"/><path d="M3 21l9-9"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  idcard: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M6 16c.5-1.5 1.7-2.3 3-2.3s2.5.8 3 2.3M14 10h4M14 13h3"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor"/>',
  layout: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/>',
  gif: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 10H8v4h2v-1.5M13 10v4M16 14v-4h2M16 12h1.5"/>'
};
const ico = n => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
  'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || P.file) + '</svg>';

/* ---------- toast ---------- */
let tT;
function toast(title, msg, bad) {
  const t = $('#toast');
  t.className = 'toast up' + (bad ? ' bad' : '');
  t.innerHTML = '<b>' + esc(title) + '</b>' + esc(msg || '');
  clearTimeout(tT);
  tT = setTimeout(() => t.classList.remove('up'), bad ? 7000 : 3600);
}

/* ---------- misc helpers ---------- */
function bytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(0) + ' KB';
  return (n / 1048576).toFixed(n < 10485760 ? 2 : 1) + ' MB';
}
function dl(blob, name) {
  const u = URL.createObjectURL(blob), a = h('a');
  a.href = u; a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 8000);
}
const base = n => String(n).replace(/\.[a-z0-9]+$/i, '');
const ext = n => (String(n).match(/\.([a-z0-9]+)$/i) || ['', ''])[1].toLowerCase();
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
async function zipUp(items, name) {                       // [{name, blob}]
  const z = new JSZip();
  items.forEach(i => z.file(i.name, i.blob));
  dl(await z.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }), name);
}
const safeName = s => String(s || '').replace(/[\\/:*?"<>|\u0000-\u001F]+/g, '-').trim().slice(0, 120) || 'file';

/* small persistent preferences — per browser, never required */
const store = {
  get(k, d) { try { const v = localStorage.getItem('tf:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { if (v == null) localStorage.removeItem('tf:' + k); else localStorage.setItem('tf:' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- one-off engines, fetched the first time a tool needs them ---------- */
const libs = {};
function lib(url, name) {
  if (name && window[name]) return Promise.resolve(window[name]);
  if (libs[url]) return libs[url];
  libs[url] = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = url; s.async = true;
    s.onload = () => (!name || window[name]) ? res(name ? window[name] : true)
      : rej(new Error('The engine for this tool arrived damaged. Reload the page and try again.'));
    s.onerror = () => rej(new Error('The engine for this tool did not download. Check your connection and try again.'));
    document.head.append(s);
  });
  libs[url].catch(() => { delete libs[url]; });
  return libs[url];
}
/* pdf-lib fork that can encrypt and decrypt. It installs itself as window.PDFLib,
   so the original is put back the moment it loads and the fork is handed out privately. */
let cantooP = null;
function cantoo() {
  if (cantooP) return cantooP;
  cantooP = new Promise((res, rej) => {
    const keep = window.PDFLib, s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@cantoo/pdf-lib@2.11.1/dist/pdf-lib.min.js';
    s.onload = () => {
      const c = window.PDFLib;
      window.PDFLib = keep;
      c && c !== keep && c.PDFDocument ? res(c) : rej(new Error('The encryption engine arrived damaged. Reload and try again.'));
    };
    s.onerror = () => { window.PDFLib = keep; rej(new Error('The encryption engine did not download. Check your connection and try again.')); };
    document.head.append(s);
  });
  cantooP.catch(() => { cantooP = null; });
  return cantooP;
}

/* ---------- file typing ---------- */
const isPdf = f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
const isImg = f => (/^image\//.test(f.type) && !isPdf(f)) ||
  /\.(png|jpe?g|webp|gif|bmp|heic|heif|hif|avif|tiff?)$/i.test(f.name);

/* ---------- HEIC ---------- */
const HEIF = ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'];
function isHeic(buf, name) {
  if (/\.(heic|heif|hif)$/i.test(name || '')) return true;
  if (!buf || buf.length < 12) return false;
  if (String.fromCharCode(buf[4], buf[5], buf[6], buf[7]) !== 'ftyp') return false;
  return HEIF.indexOf(String.fromCharCode(buf[8], buf[9], buf[10], buf[11]).toLowerCase()) >= 0;
}
const heicLib = () => lib('https://cdnjs.cloudflare.com/ajax/libs/heic2any/0.0.1/index.min.js', 'heic2any');

const loadImg = url => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => rej(new Error('decode failed'));
  i.src = url;
});

/* Decode any supported image to {img, bytes, type, w, h, url}. Safari reads HEIC
   natively; elsewhere libheif is fetched once and used as a fallback. */
async function decodeImage(file, onNote) {
  let blob = file, buf = new Uint8Array(await file.arrayBuffer());
  const heic = isHeic(buf, file.name);
  let url = URL.createObjectURL(blob), img;
  try { img = await loadImg(url); }
  catch (e) {
    URL.revokeObjectURL(url);
    if (!heic) throw new Error('This file is not an image the browser can read.');
    if (onNote) onNote('Converting ' + file.name + ' — HEIC takes a moment');
    let conv;
    try { conv = await heicLib(); }
    catch (x) { throw new Error('HEIC needs a one-off decoder download, which did not arrive. Reconnect, or export the photo as JPEG first.'); }
    await nextFrame();
    const out = await conv({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    blob = Array.isArray(out) ? out[0] : out;
    buf = new Uint8Array(await blob.arrayBuffer());
    url = URL.createObjectURL(blob);
    img = await loadImg(url);
  }
  const png = buf[0] === 0x89 && buf[1] === 0x50, jpg = buf[0] === 0xFF && buf[1] === 0xD8;
  return { img: img, bytes: buf, type: png ? 'png' : jpg ? 'jpg' : 'other',
    w: img.naturalWidth, h: img.naturalHeight, url: url, heic: heic, name: file.name, size: file.size };
}

/* canvas → blob, always a real encode (this is also what strips EXIF).
   JPEG has no transparency, so transparent pixels are laid on white first —
   otherwise browsers turn them black. */
function canvasBlob(cv, mime, q) {
  if (mime === 'image/jpeg') {
    const c = h2c(cv.width, cv.height);
    c.ctx.fillStyle = '#fff'; c.ctx.fillRect(0, 0, c.cv.width, c.cv.height);
    c.ctx.drawImage(cv, 0, 0);
    cv = c.cv;
  }
  return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('encode failed')), mime, q));
}
function drawTo(src, w, h) {
  const c = h2c(w, h);
  c.ctx.drawImage(src, 0, 0, w, h);
  return c.cv;
}
function h2c(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(w)); cv.height = Math.max(1, Math.round(h));
  const ctx = cv.getContext('2d', { willReadFrequently: false });
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  return { cv: cv, ctx: ctx };
}
const fit = (w, h, mw, mh) => { const k = Math.min(mw / w, mh / h); return { w: w * k, h: h * k, k: k }; };
/* crop a canvas to the bounding box of its visible pixels */
function trimCanvas(cv, padFrac) {
  const ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    if (d[(y * cv.width + x) * 4 + 3] > 24) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * (padFrac == null ? .04 : padFrac));
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(cv.width - 1, x1 + pad); y1 = Math.min(cv.height - 1, y1 + pad);
  const t = h2c(x1 - x0 + 1, y1 - y0 + 1);
  t.ctx.drawImage(cv, x0, y0, t.cv.width, t.cv.height, 0, 0, t.cv.width, t.cv.height);
  return t.cv;
}
/* a canvas packaged like decodeImage's result, so it can be embedded anywhere */
async function canvasEntry(cv, name) {
  const b = await canvasBlob(cv, 'image/png');
  const buf = new Uint8Array(await b.arrayBuffer()), url = URL.createObjectURL(b);
  return { img: await loadImg(url), bytes: buf, type: 'png', w: cv.width, h: cv.height,
    url: url, name: name || 'image.png', size: b.size };
}
function grayCanvas(cv) {
  const ctx = cv.getContext('2d'), d = ctx.getImageData(0, 0, cv.width, cv.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const l = p[i] * .299 + p[i + 1] * .587 + p[i + 2] * .114;
    p[i] = p[i + 1] = p[i + 2] = l;
  }
  ctx.putImageData(d, 0, 0);
  return cv;
}

/* ---------- pdf helpers ---------- */
async function pdfjsDoc(bytes, password) {
  try { return await pdfjsLib.getDocument({ data: bytes.slice(0), password: password }).promise; }
  catch (e) {
    const locked = e && (e.name === 'PasswordException' || /password/i.test(e.message || ''));
    const err = new Error(locked
      ? (password ? 'That password is not right for this PDF.' : 'That PDF is password-protected. Use Unlock PDF first, then open it here.')
      : 'That PDF could not be opened — it may be damaged or incomplete.');
    err.locked = locked;
    throw err;
  }
}
const pdfLibDoc = bytes => PDFLib.PDFDocument.load(bytes.slice(0), { ignoreEncryption: true });
async function renderPage(page, scale, rotation) {
  const vp = page.getViewport({ scale: scale, rotation: rotation == null ? page.rotate : rotation });
  const c = h2c(vp.width, vp.height);
  c.ctx.fillStyle = '#fff'; c.ctx.fillRect(0, 0, c.cv.width, c.cv.height);
  await page.render({ canvasContext: c.ctx, viewport: vp }).promise;
  return c.cv;
}
/* embed a page using the area a viewer actually shows (its crop box) */
function embedShown(doc, page) {
  const b = page.getCropBox();
  return doc.embedPage(page, { left: b.x, bottom: b.y, right: b.x + b.width, top: b.y + b.height });
}
/* draw an embedded page into a box, honouring the source's /Rotate.
   (w, h) is the box as displayed; PDF /Rotate turns clockwise, pdf-lib's rotate anticlockwise. */
function placePage(page, emb, rot, x, y, w, h) {
  rot = ((rot % 360) + 360) % 360;
  const pos = rot === 90 ? [x, y + h] : rot === 180 ? [x + w, y + h] : rot === 270 ? [x + w, y] : [x, y];
  page.drawPage(emb, { x: pos[0], y: pos[1], width: rot % 180 ? h : w, height: rot % 180 ? w : h,
    rotate: PDFLib.degrees(-rot) });
}
/* re-render every page as a JPEG; the basis of flatten / grayscale / compress */
async function rasterPdf(doc, o) {
  o = o || {};
  const out = await PDFLib.PDFDocument.create(), n = doc.numPages;
  for (let i = 0; i < n; i++) {
    if (o.st) o.st.step(i, n, (o.label || 'Rendering') + ' — page ' + (i + 1) + ' of ' + n);
    await nextFrame();
    const pg = await doc.getPage(i + 1);
    const cv = await renderPage(pg, (o.dpi || 150) / 72);
    if (o.gray) grayCanvas(cv);
    const blob = await canvasBlob(cv, 'image/jpeg', o.q || .8);
    const img = await out.embedJpg(new Uint8Array(await blob.arrayBuffer()));
    const vp = pg.getViewport({ scale: 1 });
    out.addPage([vp.width, vp.height]).drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
    pg.cleanup();
  }
  return new Blob([await out.save()], { type: 'application/pdf' });
}

/* parse "1-3, 5, 9-" into 0-based page indexes */
function parseRanges(s, total) {
  const out = [];
  String(s || '').split(',').forEach(part => {
    const t = part.trim();
    if (!t) return;
    let m = t.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) { for (let i = +m[1]; i <= +m[2]; i++) if (i >= 1 && i <= total) out.push(i - 1); return; }
    m = t.match(/^(\d+)\s*-\s*$/);
    if (m) { for (let i = +m[1]; i <= total; i++) if (i >= 1) out.push(i - 1); return; }
    m = t.match(/^(\d+)$/);
    if (m && +m[1] >= 1 && +m[1] <= total) out.push(+m[1] - 1);
  });
  return [...new Set(out)];
}
/* split "1-3,4-8" into groups, each a list of 0-based indexes */
function parseGroups(s, total) {
  return String(s || '').split(',').map(p => parseRanges(p, total)).filter(g => g.length);
}

/* Reading order for a page: text items grouped into lines, and each line into
   cells wherever there is a wide horizontal gap (that is what makes tables work). */
async function pdfLines(doc, i) {
  const pg = await doc.getPage(i + 1), vp = pg.getViewport({ scale: 1 });
  const tc = await pg.getTextContent();
  const it = [];
  tc.items.forEach(t => {
    if (!t.str) return;
    const m = pdfjsLib.Util.transform(vp.transform, t.transform);
    it.push({ s: t.str, x: m[4], y: m[5], w: t.width || 0, h: Math.hypot(m[2], m[3]) || 10, dir: t.dir });
  });
  it.sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  it.forEach(t => {
    const L = lines[lines.length - 1];
    if (L && Math.abs(t.y - L.y) < Math.max(1.5, Math.min(t.h, L.h) * .45)) { L.items.push(t); L.h = Math.max(L.h, t.h); }
    else lines.push({ y: t.y, h: t.h, items: [t] });
  });
  lines.forEach(L => {
    const rtl = L.items.filter(t => t.dir === 'rtl').length > L.items.length / 2;
    const key = t => rtl ? -(t.x + t.w) : t.x;
    L.items.sort((a, b) => key(a) - key(b));
    const cells = [];
    let cur = null, end = null;
    L.items.forEach(t => {
      const k0 = key(t), k1 = k0 + t.w;
      if (!t.s.trim()) return;                 /* pdf.js fills gaps with space items; judge gaps from real text */
      const gap = end == null ? 0 : k0 - end;
      if (!cur || gap > Math.max(L.h * 1.1, 6)) { cur = { k: k0, s: '' }; cells.push(cur); }
      else if (gap > L.h * .16 && !/\s$/.test(cur.s) && !/^\s/.test(t.s)) cur.s += ' ';
      cur.s += t.s;
      end = end == null ? k1 : Math.max(end, k1);
    });
    L.rtl = rtl;
    const real = L.items.filter(t => t.s.trim());
    L.x0 = Math.min(...real.map(t => t.x)); L.x1 = Math.max(...real.map(t => t.x + t.w));
    L.cells = cells.map(c => ({ k: c.k, s: c.s.replace(/\s+/g, ' ').trim() })).filter(c => c.s);
    L.text = L.cells.map(c => c.s).join('    ');
  });
  pg.cleanup();
  return { w: vp.width, h: vp.height, lines: lines.filter(L => L.cells.length) };
}

/* Myers diff over two arrays → [['=', item] | ['-', item] | ['+', item]] */
function diff(a, b, limit) {
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let ea = a.length, eb = b.length;
  while (ea > s && eb > s && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
  const A = a.slice(s, ea), B = b.slice(s, eb), N = A.length, M = B.length;
  const head = a.slice(0, s).map(x => ['=', x]), tail = a.slice(ea).map(x => ['=', x]);
  const fallback = () => head.concat(A.map(x => ['-', x]), B.map(x => ['+', x]), tail);
  if (!N || !M) return fallback();
  const MAX = N + M, off = MAX + 1, V = new Int32Array(2 * MAX + 3), trace = [];
  const cap = Math.min(MAX, limit || 3000);
  let D = -1;
  outer: for (let d = 0; d <= cap; d++) {
    trace.push(V.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = (k === -d || (k !== d && V[off + k - 1] < V[off + k + 1])) ? V[off + k + 1] : V[off + k - 1] + 1;
      let y = x - k;
      while (x < N && y < M && A[x] === B[y]) { x++; y++; }
      V[off + k] = x;
      if (x >= N && y >= M) { D = d; break outer; }
    }
  }
  if (D < 0) return fallback();
  const rev = [];
  let x = N, y = M;
  for (let d = D; d > 0; d--) {
    const v = trace[d], k = x - y, at = kk => v[kk + d + 1];
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1));
    const pk = down ? k + 1 : k - 1, px = at(pk), py = px - pk;
    while (x > px && y > py) { rev.push(['=', A[x - 1]]); x--; y--; }
    if (down) { rev.push(['+', B[y - 1]]); y--; } else { rev.push(['-', A[x - 1]]); x--; }
  }
  while (x > 0 && y > 0) { rev.push(['=', A[x - 1]]); x--; y--; }
  return head.concat(rev.reverse(), tail);
}

/* ---------- text in any language ----------
   The 14 standard PDF fonts only know Western European characters. Anything else
   (Arabic, Hebrew, Hindi, Greek, Cyrillic, ₹ …) is set in Noto, fetched once.
   Arabic and Hebrew are shaped by fontkit; this splits mixed lines into runs so
   numbers and Latin words keep their own direction. */
const FONTKIT = 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js';
const NOTO = 'https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@NotoSansArabic-v2.011/fonts/';
const NOTO_FAM = { lat: 'NotoSans', ar: 'NotoSansArabic', he: 'NotoSansHebrew', dv: 'NotoSansDevanagari' };
const FAM = { lat: 'lat', ar: 'ar', an: 'ar', he: 'he', dv: 'dv' };
const WIN_X = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’' +
  '“”•–—˜™š›œžŸ';
const tnorm = s => String(s == null ? '' : s).replace(/\r/g, '').replace(/\t/g, '    ');
function winSafe(s) {
  for (const ch of String(s)) {
    const c = ch.charCodeAt(0);
    if (c === 10 || (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WIN_X.indexOf(ch) >= 0) continue;
    return false;
  }
  return true;
}
function scr(ch) {
  const c = ch.codePointAt(0);
  if ((c >= 0x660 && c <= 0x669) || (c >= 0x6F0 && c <= 0x6F9)) return 'an';
  if ((c >= 0x590 && c <= 0x5FF) || (c >= 0xFB1D && c <= 0xFB4F)) return 'he';
  if ((c >= 0x600 && c <= 0x8FF) || (c >= 0xFB50 && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF)) return 'ar';
  if ((c >= 0x900 && c <= 0x97F) || (c >= 0xA8E0 && c <= 0xA8FF)) return 'dv';
  if (/[\s!-\/:-@\[-`{-~ -¿ -⁯]/.test(ch)) return '';
  return 'lat';
}
function splitRuns(s) {
  const out = [];
  let cur = null;
  for (const ch of s) {
    const k = scr(ch);
    if (cur && (k === '' || k === cur.k || cur.k === '')) { cur.t += ch; if (!cur.k) cur.k = k; continue; }
    cur = { k: k, t: ch };
    out.push(cur);
  }
  out.forEach(r => { if (!r.k) r.k = 'lat'; });
  return out;
}
const fontBytes = {};
function notoBytes(fam, bold) {
  const k = fam + bold;
  if (!fontBytes[k]) {
    const n = NOTO_FAM[fam];
    fontBytes[k] = fetch(NOTO + n + '/hinted/ttf/' + n + '-' + (bold ? 'Bold' : 'Regular') + '.ttf')
      .then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(b => new Uint8Array(b))
      .catch(() => { delete fontBytes[k]; throw new Error('The font for this language did not download. Reconnect and try again.'); });
  }
  return fontBytes[k];
}
/* items: [[text, standardFontName], …] — every string the document will draw,
   so the right fonts are fetched and embedded up front. */
async function textKit(doc, items) {
  const STD = {}, U = {}, FK = {}, need = new Set();
  const kit = { dropped: false };
  const stdFont = async n => { if (!STD[n]) STD[n] = await doc.embedFont(PDFLib.StandardFonts[n] || PDFLib.StandardFonts.Helvetica); };
  await stdFont('Helvetica');
  for (const it of items || []) {
    const s = tnorm(it[0]), std = it[1] || 'Helvetica';
    await stdFont(std);
    if (winSafe(s)) continue;
    const b = /Bold/.test(std) ? 1 : 0;
    splitRuns(s.replace(/\n/g, ' ')).forEach(r => need.add(FAM[r.k] + b));
  }
  if (need.size) {
    /* fontkit's minified build expects Babel's generator helper as a global for script shaping */
    await lib('https://cdn.jsdelivr.net/npm/regenerator-runtime@0.14.1/runtime.js', 'regeneratorRuntime');
    const fk = await lib(FONTKIT, 'fontkit');
    doc.registerFontkit(fk);
    for (const key of need) {
      const fam = key.slice(0, -1), b = +key.slice(-1);
      const bs = await notoBytes(fam, b);
      U[key] = await doc.embedFont(bs, { subset: true });
      if (!FK[fam]) FK[fam] = fk.create(bs);
    }
  }
  function layout(str, std, size) {
    str = tnorm(str).replace(/\n/g, ' ');
    const sf = STD[std] || STD.Helvetica;
    if (winSafe(str)) return [{ t: str, f: sf, w: str ? sf.widthOfTextAtSize(str, size) : 0, gap: 0 }];
    const b = /Bold/.test(std) ? 1 : 0;
    const first = [...str].find(ch => /\p{L}/u.test(ch));
    const rtl = !!first && /^(ar|he)$/.test(scr(first));
    const parts = splitRuns(str).map(r => {
      const fam = FAM[r.k], f = U[fam + b] || U[fam + (1 - b)];
      let t = r.t;
      const m = t.match(/\s+$/), gapN = m ? m[0].length : 0;
      if (gapN) t = t.slice(0, -gapN);
      if (!f) {                                         /* not prepared for: keep what the standard font can set */
        const keep = [...t].filter(ch => winSafe(ch)).join('');
        if (keep.length !== [...t].length) kit.dropped = true;
        return { t: keep, f: sf, gapN: gapN };
      }
      const cov = FK[fam];
      t = [...t].filter(ch => {
        if (/\s/.test(ch) || cov.hasGlyphForCodePoint(ch.codePointAt(0))) return true;
        kit.dropped = true; return false;
      }).join('');
      if (r.k === 'an') t = [...t].reverse().join('');  /* fontkit mirrors Arabic digits; pre-mirror them back */
      return { t: t, f: f, gapN: gapN };
    });
    parts.forEach(p => {
      p.w = p.t ? p.f.widthOfTextAtSize(p.t, size) : 0;
      p.sp = p.f.widthOfTextAtSize(' ', size);
    });
    const n = parts.length;
    if (!rtl) { parts.forEach(p => { p.gap = p.gapN * p.sp; }); return parts; }
    const vis = parts.slice().reverse();
    vis.forEach((p, k) => { const L = parts[n - 2 - k]; p.gap = L ? L.gapN * L.sp : 0; });
    return vis;
  }
  kit.width = (s, size, std) => layout(s, std || 'Helvetica', size).reduce((a, p) => a + p.w + p.gap, 0);
  kit.draw = (page, s, o) => {
    const size = o.size || 12, parts = layout(s, o.std || 'Helvetica', size);
    const a = (o.rotate || 0) * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    let off = 0;
    parts.forEach(p => {
      if (p.t) page.drawText(p.t, { x: o.x + off * ca, y: o.y + off * sa, size: size, font: p.f,
        color: o.color || PDFLib.rgb(0, 0, 0), opacity: o.opacity,
        rotate: o.rotate ? PDFLib.degrees(o.rotate) : undefined });
      off += p.w + p.gap;
    });
    return off;
  };
  kit.wrap = (text, size, std, maxW) => {
    const out = [];
    tnorm(text).split('\n').forEach(par => {
      if (!par.trim()) { out.push(''); return; }
      let line = '';
      par.split(/ +/).forEach(word => {
        const t = line ? line + ' ' + word : word;
        if (!line || kit.width(t, size, std) <= maxW) line = t; else { out.push(line); line = word; }
      });
      out.push(line);
    });
    return out;
  };
  /* one font for a whole form field: the standard face when it can, else the script's Noto */
  kit.fieldFont = s => {
    if (winSafe(s)) return STD.Helvetica;
    const runs = splitRuns(tnorm(s));
    const r = runs.find(x => x.k !== 'lat') || runs[0];
    return U[FAM[r.k] + 0] || U[FAM[r.k] + 1] || STD.Helvetica;
  };
  return kit;
}

/* ---------- label sheets (pt) ---------- */
const MM = 72 / 25.4, IN = 72, A4 = [595.28, 841.89], LETTER = [612, 792];
const LABELS = [
  { id: 'a4-21', name: 'A4 — 21 per sheet (63.5 × 38.1 mm)', page: A4, cols: 3, rows: 7, w: 63.5 * MM, h: 38.1 * MM, left: 7.2 * MM, top: 15.15 * MM, gx: 2.5 * MM, gy: 0 },
  { id: 'a4-14', name: 'A4 — 14 per sheet (99.1 × 38.1 mm)', page: A4, cols: 2, rows: 7, w: 99.1 * MM, h: 38.1 * MM, left: 4.65 * MM, top: 15.15 * MM, gx: 2.5 * MM, gy: 0 },
  { id: 'a4-8', name: 'A4 — 8 per sheet (99.1 × 67.7 mm)', page: A4, cols: 2, rows: 4, w: 99.1 * MM, h: 67.7 * MM, left: 4.65 * MM, top: 13.1 * MM, gx: 2.5 * MM, gy: 0 },
  { id: 'a4-65', name: 'A4 — 65 per sheet (38.1 × 21.2 mm)', page: A4, cols: 5, rows: 13, w: 38.1 * MM, h: 21.2 * MM, left: 4.75 * MM, top: 10.7 * MM, gx: 2.5 * MM, gy: 0 },
  { id: 'us-30', name: 'US Letter — 30 per sheet (2⅝ × 1 in, 5160 size)', page: LETTER, cols: 3, rows: 10, w: 2.625 * IN, h: 1 * IN, left: .1875 * IN, top: .5 * IN, gx: .125 * IN, gy: 0 },
  { id: 'us-10', name: 'US Letter — 10 per sheet (4 × 2 in, 5163 size)', page: LETTER, cols: 2, rows: 5, w: 4 * IN, h: 2 * IN, left: .15625 * IN, top: .5 * IN, gx: .1875 * IN, gy: 0 },
  { id: 'us-80', name: 'US Letter — 80 per sheet (1¾ × ½ in, 5167 size)', page: LETTER, cols: 4, rows: 20, w: 1.75 * IN, h: .5 * IN, left: .28125 * IN, top: .5 * IN, gx: .3125 * IN, gy: 0 }
];
function labelRects(L) {                                   /* PDF coordinates, reading order */
  const out = [];
  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++)
    out.push({ x: L.left + c * (L.w + L.gx), y: L.page[1] - L.top - (r + 1) * L.h - r * L.gy, w: L.w, h: L.h });
  return out;
}

/* ============================================================ UI kit */

/* drop zone with its own hidden input */
function dropzone(o) {
  const el = h('div', 'drop' + (o.small ? ' sm' : ''));
  el.innerHTML = '<div class="di">' + ico(o.icon || 'upload') + '</div><b>' +
    esc(o.title) + '</b><span>' + esc(o.sub || '') + '</span>';
  const inp = h('input');
  inp.type = 'file'; inp.hidden = true;
  if (o.accept) inp.accept = o.accept;
  if (o.multiple) inp.multiple = true;
  if (o.capture) inp.setAttribute('capture', o.capture);
  inp.onclick = e => e.stopPropagation();
  inp.onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) o.onFiles(f); };
  el.append(inp);
  el.onclick = () => inp.click();
  el.setAttribute('role', 'button'); el.tabIndex = 0;
  el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); inp.click(); } };
  ['dragenter', 'dragover'].forEach(t => el.addEventListener(t, e => {
    e.preventDefault(); e.stopPropagation(); el.classList.add('hot');
  }));
  ['dragleave', 'drop'].forEach(t => el.addEventListener(t, e => {
    e.preventDefault(); e.stopPropagation(); el.classList.remove('hot');
  }));
  el.addEventListener('drop', e => {
    const f = [...e.dataTransfer.files];
    if (f.length) o.onFiles(o.multiple ? f : [f[0]]);
  });
  el.input = inp;
  /* files dropped on the home page land in the first drop zone of the tool they opened */
  if (pending && pending.id === currentTool && !pending.used) {
    const fs = takePending(currentTool);
    setTimeout(() => o.onFiles(o.multiple ? fs : [fs[0]]), 0);
  }
  return el;
}

/* reorderable list of picked files */
function fileList(files, o) {
  o = o || {};
  const box = h('div', 'flist');
  function paint() {
    box.innerHTML = '';
    files.forEach((f, i) => {
      const it = h('div', 'fitem');
      it.draggable = !!o.reorder;
      it.dataset.i = i;
      if (o.reorder) it.append(h('span', 'gr', ico('grip')));
      if (o.thumb && f.thumb) { const im = h('img'); im.src = f.thumb; it.append(im); }
      it.append(h('span', 'nm', esc(f.name)));
      it.append(h('span', 'mt', o.meta ? esc(o.meta(f)) : bytes(f.size || 0)));
      const x = h('button', 'x', ico('x'));
      x.title = 'Remove'; x.onclick = () => { files.splice(i, 1); paint(); if (o.onChange) o.onChange(); };
      it.append(x);
      box.append(it);
    });
  }
  if (o.reorder) {
    let from = null;
    box.addEventListener('dragstart', e => {
      const it = e.target.closest('.fitem'); if (!it) return;
      from = +it.dataset.i; it.classList.add('drag');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', String(from)); } catch (x) {}
    });
    box.addEventListener('dragover', e => {
      if (from == null) return;
      e.preventDefault();
      const it = e.target.closest('.fitem');
      [...box.children].forEach(c => c.classList.toggle('over', c === it && +c.dataset.i !== from));
    });
    box.addEventListener('drop', e => {
      if (from == null) return;
      e.preventDefault();
      const it = e.target.closest('.fitem');
      if (it) {
        const to = +it.dataset.i;
        if (to !== from) { const m = files.splice(from, 1)[0]; files.splice(to, 0, m); }
      }
      from = null; paint(); if (o.onChange) o.onChange();
    });
    box.addEventListener('dragend', () => {
      from = null;
      [...box.children].forEach(c => c.classList.remove('drag', 'over'));
    });
  }
  paint();
  box.repaint = paint;
  return box;
}

/* progress + result strip */
function stage(mount) {
  const wrap = h('div');
  mount.append(wrap);
  const api = {
    busy(label) {
      wrap.innerHTML = '';
      const p = h('div', 'prog', '<span class="spin"></span><span class="lb"></span>' +
        '<span class="bar"><i></i></span>');
      p.querySelector('.lb').textContent = label || 'Working…';
      wrap.append(p);
      api._p = p;
      return api;
    },
    step(done, total, label) {
      if (!api._p) return;
      const i = api._p.querySelector('i');
      if (i && total) i.style.width = Math.round(Math.min(1, done / total) * 100) + '%';
      if (label) api._p.querySelector('.lb').textContent = label;
    },
    clear() { wrap.innerHTML = ''; api._p = null; },
    ok(title, desc, actions) {
      wrap.innerHTML = '';
      const r = h('div', 'res');
      r.append(h('b', null, esc(title)));
      if (desc) r.append(h('p', null, esc(desc)));
      if (actions && actions.length) {
        const row = h('div', 'row');
        actions.forEach(a => {
          const b = h('button', 'btn ' + (a.pri ? 'pri' : ''), (a.icon ? ico(a.icon) : '') + '<span>' + esc(a.label) + '</span>');
          b.onclick = a.go;
          row.append(b);
        });
        r.append(row);
      }
      wrap.append(r);
      api._p = null;
      return r;
    },
    fail(msg) {
      wrap.innerHTML = '';
      const r = h('div', 'warn');
      r.textContent = msg;
      wrap.append(r);
      api._p = null;
    }
  };
  return api;
}

/* form field builders */
function field(label, ctrl, hint) {
  const f = h('div', 'f');
  const l = h('label', null, esc(label));
  if (ctrl.id) l.htmlFor = ctrl.id;
  f.append(l, ctrl);
  if (hint) f.append(h('span', 'hint', esc(hint)));
  return f;
}
function sel(opts, val) {
  const s = h('select');
  opts.forEach(o => {
    const op = h('option', null, esc(o[1]));
    op.value = o[0];
    s.append(op);
  });
  if (val != null) s.value = val;
  return s;
}
function num(v, min, max, step) {
  const i = h('input'); i.type = 'number'; i.value = v;
  if (min != null) i.min = min;
  if (max != null) i.max = max;
  i.step = step || 1;
  return i;
}
function txt(v, ph) { const i = h('input'); i.type = 'text'; i.value = v || ''; if (ph) i.placeholder = ph; return i; }
function pwd(ph) { const i = h('input'); i.type = 'password'; i.autocomplete = 'new-password'; if (ph) i.placeholder = ph; return i; }
function range(min, max, v, step) { const i = h('input'); i.type = 'range'; i.min = min; i.max = max; i.value = v; if (step) i.step = step; return i; }
function color(v) { const i = h('input'); i.type = 'color'; i.value = v; return i; }
function area(v, rows) { const t = h('textarea'); t.value = v || ''; t.rows = rows || 8; return t; }
function seg(opts, val, on) {
  const s = h('div', 'seg');
  opts.forEach(o => {
    const b = h('button', null, esc(o[1]));
    b.dataset.v = o[0];
    b.setAttribute('aria-selected', String(o[0] === val));
    b.onclick = () => {
      [...s.children].forEach(c => c.setAttribute('aria-selected', String(c === b)));
      on(o[0]);
    };
    s.append(b);
  });
  s.value = () => [...s.children].find(c => c.getAttribute('aria-selected') === 'true').dataset.v;
  s.set = v => { const b = [...s.children].find(c => c.dataset.v === v); if (b) b.click(); };
  return s;
}
function check(label, on) {
  const l = h('label', 'chk');
  const i = h('input'); i.type = 'checkbox'; i.checked = !!on;
  l.append(i, document.createTextNode(label));
  l.input = i;
  return l;
}
function panel(title, nodes) {
  const p = h('div', 'panel');
  if (title) p.append(h('h4', null, esc(title)));
  const g = h('div', 'fields');
  (nodes || []).forEach(n => g.append(n));
  p.append(g);
  return p;
}
function actions(list) {
  const r = h('div', 'row');
  r.style.marginTop = '16px';
  list.forEach(a => {
    const b = h('button', 'btn ' + (a.cls || ''), (a.icon ? ico(a.icon) : '') + '<span>' + esc(a.label) + '</span>');
    b.onclick = a.go;
    if (a.ref) a.ref(b);
    r.append(b);
  });
  return r;
}
function note(html) { const n = h('div', 'note'); n.innerHTML = html; return n; }
function table(rows, max) {                               /* rows[0] is the header */
  const w = h('div', 'tbl'), t = h('table');
  const show = rows.slice(0, (max || 100) + 1);
  t.innerHTML = show.map((r, i) => '<tr>' + (r || []).map(c => (i ? '<td>' : '<th>') + esc(c == null ? '' : c) + (i ? '</td>' : '</th>')).join('') + '</tr>').join('');
  w.append(t);
  return w;
}
function modal(title, build) {
  const ov = h('div', 'modal'), box = h('div', 'box');
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.append(h('h3', null, esc(title)));
  ov.append(box);
  document.body.append(ov);
  const key = e => { if (e.key === 'Escape') close(); };
  function close() { ov.remove(); document.removeEventListener('keydown', key, true); if (box.onclose) box.onclose(); }
  document.addEventListener('keydown', key, true);
  ov.addEventListener('pointerdown', e => { if (e.target === ov) close(); });
  build(box, close);
  return close;
}

/* shared: single-PDF picker that reports page count */
function onePdf(mount, o) {
  const box = h('div');
  const dz = dropzone({
    title: o.title || 'Drop a PDF here', sub: o.sub || 'or click to choose a file — nothing is uploaded',
    accept: 'application/pdf,.pdf', onFiles: async f => {
      if (!isPdf(f[0])) return toast('Not a PDF', 'This tool needs a .pdf file.', true);
      try {
        const bs = new Uint8Array(await f[0].arrayBuffer());
        const doc = await pdfjsDoc(bs);
        box.innerHTML = '';
        dz.hidden = true;
        o.onLoad({ file: f[0], bytes: bs, doc: doc, pages: doc.numPages, name: f[0].name }, box);
      } catch (e) { toast('Could not open that file', e.message, true); }
    }
  });
  mount.append(dz, box);
  return box;
}
function fileBar(info, onReset) {
  const b = h('div', 'fitem');
  b.append(h('span', 'gr', ico('file')));
  b.append(h('span', 'nm', esc(info.name)));
  b.append(h('span', 'mt', (info.pages != null ? info.pages + (info.pages === 1 ? ' page · ' : ' pages · ') : '') +
    bytes(info.bytes ? info.bytes.length : info.size || 0)));
  const x = h('button', 'x', ico('x'));
  x.title = 'Choose another file'; x.onclick = onReset;
  b.append(x);
  return b;
}
function remount(m, id) { m.innerHTML = ''; TOOLS.find(t => t.id === id).mount(m); }

/* ---------- visual building blocks ---------- */
/* page thumbnails, rendered once per document and width */
const thumbCache = new WeakMap();
function pageThumb(doc, i, w) {
  let c = thumbCache.get(doc);
  if (!c) thumbCache.set(doc, c = new Map());
  const k = i + '@' + w;
  if (!c.has(k)) c.set(k, (async () => {
    const pg = await doc.getPage(i + 1);
    const cv = await renderPage(pg, w / pg.getViewport({ scale: 1 }).width);
    pg.cleanup();
    return cv.toDataURL('image/jpeg', .78);
  })());
  return c.get(k);
}
/* click the pages you want — replaces typing ranges like "1-3, 7" */
function pagePicker(doc, o) {
  o = o || {};
  const n = doc.numPages, sel = new Set();
  if (o.initial !== 'none') for (let i = 0; i < n; i++) sel.add(i);
  const box = h('div', 'picker');
  const bar = h('div', 'row picker-bar'), count = h('span', 'picker-count');
  [['All', () => setAll(true)], ['None', () => setAll(false)], ['Odd', () => only(i => i % 2 === 0)], ['Even', () => only(i => i % 2 === 1)]].forEach(q => {
    const b = h('button', 'btn sm', esc(q[0])); b.type = 'button'; b.onclick = q[1]; bar.append(b);
  });
  bar.append(count);
  const grid = h('div', 'thumbs picker-grid');
  box.append(bar, grid);
  const io = new IntersectionObserver(ents => ents.forEach(async en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    try {
      const im = h('img'); im.alt = ''; im.width = 120; im.height = 160;
      im.src = await pageThumb(doc, +en.target.dataset.i, 180);
      en.target.prepend(im);
    } catch (e) {}
  }), { rootMargin: '300px 0px' });
  for (let i = 0; i < n; i++) {
    const b = h('button', 't');
    b.type = 'button'; b.dataset.i = i;
    b.setAttribute('aria-label', 'Page ' + (i + 1));
    b.append(h('span', null, String(i + 1)));
    grid.append(b); io.observe(b);
  }
  let last = null;
  grid.onclick = e => {
    const b = e.target.closest('.t'); if (!b) return;
    const i = +b.dataset.i;
    if (e.shiftKey && last != null) { for (let k = Math.min(last, i); k <= Math.max(last, i); k++) sel.add(k); }
    else if (sel.has(i)) sel.delete(i); else sel.add(i);
    last = i; paint();
  };
  function setAll(on) { sel.clear(); if (on) for (let i = 0; i < n; i++) sel.add(i); paint(); }
  function only(fn) { sel.clear(); for (let i = 0; i < n; i++) if (fn(i)) sel.add(i); paint(); }
  function paint() {
    [...grid.children].forEach(b => { const on = sel.has(+b.dataset.i); b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on)); });
    count.textContent = sel.size + ' of ' + n + (n === 1 ? ' page' : ' pages') + ' selected · shift-click selects a run';
    if (o.onChange) o.onChange(box.selected());
  }
  box.selected = () => [...sel].sort((a, b) => a - b);
  paint();
  return box;
}
/* drag the divider (or use arrow keys) to compare two versions of an image */
function beforeAfter(a, b, la, lb) {
  const w = h('div', 'ba');
  const i1 = h('img'), i2 = h('img'), top = h('div', 'ba-top'), line = h('div', 'ba-line');
  i1.src = a; i2.src = b; i1.alt = la || 'Before'; i2.alt = lb || 'After';
  top.append(i2);
  const r = h('input');
  r.type = 'range'; r.min = 0; r.max = 100; r.value = 50;
  r.setAttribute('aria-label', 'Slide to compare ' + (la || 'before') + ' and ' + (lb || 'after'));
  w.append(i1, top, line, h('span', 'ba-tag ba-l', esc(la || 'Before')), h('span', 'ba-tag ba-r', esc(lb || 'After')), r);
  const set = () => { top.style.clipPath = 'inset(0 0 0 ' + r.value + '%)'; line.style.left = r.value + '%'; };
  r.oninput = set; set();
  return w;
}
/* before/after file size as bars, with the limit drawn in when there is one */
function sizeGauge(before, after, limit) {
  const max = Math.max(before, after, limit || 0) * 1.04;
  const g = h('div', 'gauge');
  const row = (label, v, cls) => {
    const r = h('div', 'g-row');
    r.innerHTML = '<span class="g-l">' + label + '</span><span class="g-bar"><i class="' + cls + '" style="width:' + Math.max(1.5, v / max * 100) + '%"></i>' +
      (limit ? '<b class="g-lim" style="left:' + (limit / max * 100) + '%" title="Limit ' + bytes(limit) + '"></b>' : '') + '</span><span class="g-v">' + bytes(v) + '</span>';
    return r;
  };
  g.append(row('Before', before, 'gb'), row('After', after, limit && after > limit ? 'gx' : 'ga'));
  if (limit) g.append(h('div', 'g-note', 'Line = your ' + esc(bytes(limit)) + ' limit'));
  return g;
}
/* big picture-and-words options instead of a dropdown: [value, icon, title, explanation] */
function choice(list, value, on) {
  const g = h('div', 'opts choice');
  g.setAttribute('role', 'radiogroup');
  list.forEach(o => {
    const b = h('button', 'opt', ico(o[1]) + '<b>' + esc(o[2]) + '</b>' + (o[3] ? '<span>' + esc(o[3]) + '</span>' : ''));
    b.type = 'button'; b.dataset.v = o[0]; b.setAttribute('role', 'radio');
    b.onclick = () => g.set(o[0]);
    g.append(b);
  });
  const paint = () => [...g.children].forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === g.value)));
  g.set = v => { g.value = v; paint(); if (on) on(v); };
  g.value = value; paint();
  return g;
}
/* a mini page with clickable spots — for choosing where something goes */
function posPicker(spots, value, on) {
  const p = h('div', 'pospick');
  p.setAttribute('role', 'radiogroup');
  spots.forEach(s => {
    const b = h('button', 'spot');
    b.type = 'button'; b.dataset.v = s[0];
    b.style.left = s[1] + '%'; b.style.top = s[2] + '%';
    b.setAttribute('role', 'radio'); b.setAttribute('aria-label', s[3]);
    b.onclick = () => { p.value = s[0]; paint(); on(s[0]); };
    p.append(b);
  });
  p.value = value;
  const paint = () => [...p.children].forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === p.value)));
  paint();
  return p;
}

/* ---------- handing files from the home page to a tool ---------- */
let pending = null, currentTool = null;
function toolForFile(f) {
  const e = ext(f.name), t = f.type || '';
  if (isPdf(f)) return 'pdf-editor';
  if (isImg(f)) return 'image-editor';
  if (/^video\//.test(t) || /^(mp4|mov|mkv|webm|avi|m4v|3gp|wmv|flv|ts|mts)$/.test(e)) return 'video-editor';
  if (/^audio\//.test(t) || /^(mp3|wav|m4a|aac|flac|ogg|opus|wma|amr)$/.test(e)) return 'audio-convert';
  if (/^(zip|rar|7z|tar|gz|tgz|bz2|xz|iso|cab)$/.test(e)) return 'archive';
  if (/^(csv|tsv|xlsx|xls|ods|json)$/.test(e)) return 'sheets';
  return null;
}
function handOff(files) {
  const list = [...files], id = list.map(toolForFile).find(Boolean);
  if (!id) return toast('Not sure what to do with that', 'Pick a tool below for this kind of file.', true);
  pending = { id: id, files: id === 'pdf-editor' ? list.filter(f => isPdf(f) || isImg(f)) : list };
  location.hash = '#/' + id;
}
/* a tool takes the files the visitor dropped on the home page (once) */
function takePending(id) {
  if (!pending || pending.id !== id || pending.used) return null;
  pending.used = true;
  return pending.files;
}

/* ============================================================ registry + router */
/* Published as a site, every tool has its own page (/ocr/); the page's <html> carries
   data-site, data-tool, and optionally data-h1 / data-preset. As a single file, routes use #/ocr. */
const ROOT = document.documentElement;
const SITE = ROOT.hasAttribute('data-site');
const toolHref = id => SITE ? '/' + id + '/' : '#/' + id;
const PRESET = (() => { try { return JSON.parse(ROOT.dataset.preset || '{}'); } catch (e) { return {}; } })();
/* settings an SEO landing page asks a tool to start with, e.g. {target:'0.1'} on /compress-pdf-to-100kb/ */
const presetFor = id => (SITE && !location.hash && ROOT.dataset.tool === id) ? PRESET : {};
const TOOLS = [];
const CATS = [
  { id: 'doc', name: 'PDF & documents' },
  { id: 'img', name: 'Images & photos' },
  { id: 'biz', name: 'Business' },
  { id: 'txt', name: 'Data, text & files' },
  { id: 'av', name: 'Video & audio' }
];
const reg = t => TOOLS.push(t);

function card(t) {
  const a = h('a', 'card');
  a.href = toolHref(t.id);
  a.innerHTML = '<div class="ic ic-' + t.cat + '">' + ico(t.icon) + '</div>' +
    '<h3>' + esc(t.name) + '</h3><p>' + esc(t.desc) + '</p>' +
    (t.tag ? '<span class="tag">' + esc(t.tag) + '</span>' : '');
  return a;
}

/* the four studios carry most jobs; tools with `studio` set are tasks inside one of them */
const STUDIOS = ['pdf-editor', 'image-editor', 'video-editor', 'audio-convert'];
function studioCard(t) {
  const wrap = h('div', 'studio');
  const a = card(t);
  a.classList.add('big');
  const chips = h('div', 'chips');
  TOOLS.filter(x => x.studio === t.id).forEach(x => {
    const c = h('a', 'chip', esc(x.task || x.name));
    c.href = toolHref(x.id);
    chips.append(c);
  });
  wrap.append(a, chips);
  return wrap;
}
function home(q) {
  const m = $('#main');
  m.innerHTML = '';
  const hero = h('section', 'hero');
  hero.innerHTML =
    '<div class="wrap"><h1>Every tool. <span class="g">No limits.</span> No uploads.</h1>' +
    '<p>The file tools other sites cap at two a day, stamp with a watermark, or hide behind a subscription. ' +
    'All free, all unlimited, all running inside your browser — your files never leave this device.</p></div>';
  const drop = dropzone({ title: 'Drop any file to start', sub: 'PDF, photo, video, audio, spreadsheet or archive — the right tool opens with it',
    multiple: true, onFiles: handOff });
  drop.classList.add('herodrop');
  const tail = h('div', 'wrap');
  tail.innerHTML = '<div class="bigsearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
    '<input id="bq" type="search" placeholder="Or search ' + TOOLS.length + ' tools, like “compress pdf”…" autocomplete="off" spellcheck="false" aria-label="Search tools"></div>';
  hero.firstChild.append(drop);
  hero.append(tail);
  m.append(hero);

  const body = h('div', 'wrap');
  m.append(body);
  function paint(query) {
    body.innerHTML = '';
    const s = (query || '').trim().toLowerCase();
    if (s) {
      const list = TOOLS.filter(t => (t.name + ' ' + (t.task || '') + ' ' + t.desc + ' ' + (t.keys || '')).toLowerCase().includes(s));
      if (!list.length) { body.append(h('div', 'empty', 'No tool matches “' + esc(query) + '”. Try a shorter word, like “pdf” or “video”.')); return; }
      const sec = h('section', 'sec'), g = h('div', 'grid');
      sec.append(h('div', 'sechd', '<h2>Matching tools</h2><span>' + list.length + '</span>'));
      list.forEach(t => g.append(card(t)));
      sec.append(g); body.append(sec);
      return;
    }
    const st = h('section', 'sec'), sg = h('div', 'studios');
    st.append(h('div', 'sechd', '<h2>Studios</h2><span>open a file, then do everything visually</span>'));
    STUDIOS.map(id => TOOLS.find(t => t.id === id)).filter(Boolean).forEach(t => sg.append(studioCard(t)));
    st.append(sg); body.append(st);
    CATS.forEach(c => {
      const list = TOOLS.filter(t => t.cat === c.id && !t.studio && STUDIOS.indexOf(t.id) < 0);
      if (!list.length) return;
      const sec = h('section', 'sec');
      sec.append(h('div', 'sechd', '<h2>' + esc(c.name) + '</h2><span>' + list.length + '</span>'));
      const g = h('div', 'grid');
      list.forEach(t => g.append(card(t)));
      sec.append(g);
      body.append(sec);
    });
  }
  paint(q);
  const bq = $('#bq');
  bq.value = q || '';
  bq.oninput = () => { paint(bq.value); $('#hq').value = bq.value; };
  repaint = v => { bq.value = v; paint(v); };
}
let repaint = null;

function openTool(t) {
  const m = $('#main');
  m.innerHTML = '';
  const page = h('div', 'wrap narrow tpage');
  const back = h('a', 'back', ico('back') + '<span>All tools</span>');
  back.href = SITE ? '/' : '#';
  page.append(back);
  const own = SITE && !location.hash && ROOT.dataset.tool === t.id;   /* this page's own tool: keep its SEO heading */
  const hd = h('div', 'thd');
  hd.innerHTML = '<div class="ic ic-' + t.cat + '">' + ico(t.icon) + '</div>' +
    '<div><h1>' + esc(own && ROOT.dataset.h1 || t.name) + '</h1><p>' + esc(own && ROOT.dataset.lead || t.long || t.desc) + '</p></div>';
  page.append(hd);
  const body = h('div');
  page.append(body);
  m.append(page);
  if (location.hash) window.scrollTo(0, 0);
  if (!own) document.title = t.name + ' — ActuallyFreeTools';
  currentTool = t.id;
  try { t.mount(body); }
  catch (e) { console.error(e); body.append(h('div', 'warn', 'This tool failed to start: ' + esc(e.message))); }
}

const HOME_TITLE = document.title;
function route() {
  repaint = null;
  const id = (location.hash || '').replace(/^#\/?/, '') || (SITE ? ROOT.dataset.tool || '' : '');
  const t = TOOLS.find(x => x.id === id);
  if (t) openTool(t);
  else if (SITE && ROOT.dataset.page && !location.hash) return;   /* about / privacy / hub pages: static content only */
  else { document.title = HOME_TITLE; home(new URLSearchParams(location.search).get('q') || ''); }
}

function start() {
  if (!window.pdfjsLib || !window.PDFLib) {
    $('#main').innerHTML = '<div class="wrap tpage"><div class="warn">The engines this site runs on ' +
      'did not load. They come from a CDN the first time you open the page — reconnect and reload.</div></div>';
    return;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  $('#fcount').textContent = TOOLS.length + ' tools';
  if (!SITE) $('#home').onclick = () => { location.hash = ''; };
  const hq = $('#hq');
  hq.oninput = () => {
    if (repaint) repaint(hq.value);
    else if (!SITE && location.hash) { location.hash = ''; setTimeout(() => repaint && repaint(hq.value), 0); }
  };
  /* on a tool page of the published site, searching takes you to the home page's results */
  hq.onkeydown = e => { if (e.key === 'Enter' && SITE && !repaint) location.href = '/?q=' + encodeURIComponent(hq.value); };
  /* a file dropped outside a drop zone must not navigate the browser away */
  ['dragover', 'drop'].forEach(t => window.addEventListener(t, e => e.preventDefault()));
  window.addEventListener('hashchange', route);
  route();
}

return { h: h, esc: esc, ico: ico, toast: toast, bytes: bytes, dl: dl, base: base, ext: ext, zipUp: zipUp,
  safeName: safeName, store: store, lib: lib, cantoo: cantoo,
  isPdf: isPdf, isImg: isImg, decodeImage: decodeImage, loadImg: loadImg, canvasBlob: canvasBlob,
  h2c: h2c, drawTo: drawTo, fit: fit, nextFrame: nextFrame, trimCanvas: trimCanvas, canvasEntry: canvasEntry,
  grayCanvas: grayCanvas, pdfjsDoc: pdfjsDoc, pdfLibDoc: pdfLibDoc, renderPage: renderPage,
  embedShown: embedShown, placePage: placePage, rasterPdf: rasterPdf, parseRanges: parseRanges,
  parseGroups: parseGroups, pdfLines: pdfLines, diff: diff, textKit: textKit, winSafe: winSafe,
  LABELS: LABELS, labelRects: labelRects, MM: MM, A4: A4, LETTER: LETTER,
  dropzone: dropzone, fileList: fileList, stage: stage, field: field, sel: sel, num: num,
  txt: txt, pwd: pwd, range: range, color: color, area: area, seg: seg, check: check, panel: panel,
  actions: actions, note: note, table: table, modal: modal, onePdf: onePdf, fileBar: fileBar, remount: remount,
  reg: reg, start: start, TOOLS: TOOLS, CATS: CATS, presetFor: presetFor, toolHref: toolHref,
  pageThumb: pageThumb, pagePicker: pagePicker, choice: choice, beforeAfter: beforeAfter, sizeGauge: sizeGauge, posPicker: posPicker,
  takePending: takePending, peekPending: id => !!(pending && pending.id === id && !pending.used), STUDIOS: STUDIOS };
})();
