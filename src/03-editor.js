/* ============================================================ PDF editor */
(function () {
'use strict';
const TFh = TF.h, esc = TF.esc, ico = TF.ico, toast = TF.toast, dl = TF.dl;
const { PDFDocument, rgb } = PDFLib;
const CAP = PDFLib.LineCapStyle ? PDFLib.LineCapStyle.Round : undefined;

const CSS = `
.e-wrap{border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:#fff}
.e-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 12px;
  background:var(--surf2);border-bottom:1px solid var(--line)}
.e-bar+.e-bar{border-top:0}
.e-bar .sp{width:1px;height:22px;background:var(--line);margin:0 2px}
.e-bar label{font-size:11.5px;font-weight:600;color:var(--ink3)}
.e-bar select,.e-bar input[type=number]{height:32px;font-size:13px;padding:0 8px;width:auto;min-width:60px}
.e-bar input[type=color]{width:34px;height:32px}
.e-meta{font-size:12.5px;color:var(--ink3);margin-left:auto;font-family:var(--mono)}
.e-body{background:var(--surf);min-height:340px;max-height:min(74vh,860px);overflow:auto;position:relative}
.e-start{padding:44px 24px;text-align:center}
.e-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(122px,1fr));padding:18px}
.e-pg{position:relative;background:none;border:0;padding:0;display:block}
.e-pg .sh{position:relative;width:100%;background:#fff;border-radius:3px;overflow:hidden;
  box-shadow:0 1px 2px rgba(15,20,18,.10),0 6px 16px -8px rgba(15,20,18,.22);
  aspect-ratio:1/1.414;transition:transform .16s,box-shadow .16s,opacity .16s}
.e-pg:hover .sh{transform:translateY(-2px);box-shadow:0 2px 4px rgba(15,20,18,.12),0 12px 24px -10px rgba(15,20,18,.3)}
.e-pg img{display:block;width:100%;height:100%;object-fit:contain}
.e-pg .ph{position:absolute;inset:0;display:grid;place-items:center;font-family:var(--mono);
  font-size:11px;color:var(--ink3)}
.e-pg .cap{display:flex;justify-content:space-between;gap:6px;margin-top:6px;
  font-family:var(--mono);font-size:11px;color:var(--ink3)}
.e-pg .cap .b{color:var(--acc-dk);font-weight:500}
.e-pg.sel .sh{outline:2px solid var(--acc);outline-offset:2px}
.e-pg.drag{opacity:.35}
.e-pg.over .sh{outline:2px dashed var(--acc);outline-offset:3px}
.e-pg .qk{position:absolute;top:5px;right:5px;display:flex;gap:3px;opacity:0;transition:.14s}
.e-pg:hover .qk,.e-pg:focus-within .qk{opacity:1}
.e-pg .qk button{width:24px;height:24px;display:grid;place-items:center;border-radius:6px;
  background:rgba(255,255,255,.95);border:1px solid var(--line);font-size:12px;color:var(--ink2)}
.e-pg .qk button:hover{background:var(--ink);color:#fff;border-color:var(--ink)}
.e-stage-wrap{display:flex;justify-content:center;padding:20px}
.e-stage{position:relative;background:#fff;box-shadow:0 2px 6px rgba(15,20,18,.12),0 20px 44px -20px rgba(15,20,18,.35)}
.e-stage canvas{display:block;width:100%;height:100%}
.e-layer{position:absolute;inset:0;overflow:hidden}
.e-layer.cross{cursor:crosshair}
.e-layer.txt{cursor:text}
.an{position:absolute}
.an.sel{outline:1.5px solid var(--acc);outline-offset:1px}
.an-text{min-height:1em}
.an-text .body{outline:none;white-space:pre-wrap;word-wrap:break-word;cursor:text}
.an-white{background:#fff}
.an-redact{background:#000}
.an-hl{mix-blend-mode:multiply}
.an-image img{display:block;width:100%;height:100%}
.an svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none}
.hdl{position:absolute;width:11px;height:11px;background:var(--acc);border:1.5px solid #fff;
  border-radius:3px;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.hdl.se{right:-6px;bottom:-6px;cursor:nwse-resize}
.hdl.e{right:-6px;top:calc(50% - 5px);cursor:ew-resize}
.thot{position:absolute;border-radius:2px;background:rgba(15,190,110,.16);
  outline:1px solid rgba(10,154,88,.5);cursor:text}
.thot:hover{background:rgba(15,190,110,.34)}
.ghost{position:absolute;border:1px solid var(--acc);background:rgba(15,190,110,.14);pointer-events:none}
.e-tip{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:var(--acc-soft);border-bottom:1px solid var(--line);
  font-size:13.5px;color:#05603A}
.e-tip b{font-weight:700}
.e-legend{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px 16px;font-size:12.5px;color:var(--ink2)}
.e-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:6px;vertical-align:-1px}
.e-pg .src{position:absolute;left:0;right:0;top:0;height:4px;z-index:1}
.e-pg .cut{position:absolute;right:-15px;top:38%;width:16px;height:28px;display:grid;place-items:center;border-radius:5px;
  font-size:12px;color:var(--ink3);background:var(--surf);border:1px solid transparent;z-index:2;opacity:0;transition:opacity .14s}
.e-grid:hover .e-pg .cut,.e-grid.split .e-pg .cut,.e-pg .cut:focus-visible{opacity:1}
.e-pg .cut:hover{color:var(--red);border-color:#F5C7C8;background:var(--red-soft)}
.e-pg.cutafter .cut{opacity:1;color:#fff;background:var(--red);border-color:var(--red)}
.e-pg.cutafter::after{content:"";position:absolute;right:-8px;top:-6px;bottom:20px;border-right:2px dashed var(--red)}
.e-grid.rot .e-pg .qk{opacity:1}
.e-start .drop{max-width:560px;margin:0 auto}
.e-foot{display:flex;align-items:center;gap:12px;padding:9px 12px;border-top:1px solid var(--line);
  background:var(--surf2);font-size:12.3px;color:var(--ink3);flex-wrap:wrap}
.e-foot .r{margin-left:auto;font-family:var(--mono)}
`;

const HTML = `
<div class="e-wrap">
  <div class="e-bar">
    <div class="seg" id="e_seg" hidden>
      <button id="e_tabPages" aria-selected="true">Pages</button>
      <button id="e_tabEdit" aria-selected="false">Edit page</button>
    </div>
    <button class="btn sm" id="e_open">Open PDF</button>
    <button class="btn sm" id="e_new">New</button>
    <span class="e-meta" id="e_meta"></span>
    <button class="btn sm pri" id="e_save" disabled>Save…</button>
  </div>

  <div class="e-bar" id="e_tools_pages" hidden>
    <button class="btn sm" id="e_all">Select all</button>
    <button class="btn sm" id="e_none">None</button>
    <span class="sp"></span>
    <button class="btn sm" id="e_left" aria-label="Move selected pages left" title="Move left">◀</button>
    <button class="btn sm" id="e_right" aria-label="Move selected pages right" title="Move right">▶</button>
    <button class="btn sm" id="e_rotl" aria-label="Rotate selected pages left" title="Rotate left">↺</button>
    <button class="btn sm" id="e_rotr" aria-label="Rotate selected pages right" title="Rotate right">↻</button>
    <button class="btn sm" id="e_dup">Duplicate</button>
    <button class="btn sm dgr" id="e_del">Delete</button>
    <span class="sp"></span>
    <button class="btn sm" id="e_insPdf">Insert PDF</button>
    <button class="btn sm" id="e_insImg">Insert images</button>
    <button class="btn sm" id="e_insBlank">Blank page</button>
    <button class="btn sm" id="e_extract">Save selection</button>
    <span class="sp"></span>
    <button class="btn sm" id="e_undo">Undo</button>
    <button class="btn sm" id="e_redo">Redo</button>
  </div>

  <div class="e-bar" id="e_tools_edit" hidden>
    <button class="btn sm" id="e_prev" aria-label="Previous page">◀</button>
    <span class="mono" id="e_pageno" style="min-width:7ch;text-align:center;font-size:12.5px">1 / 1</span>
    <button class="btn sm" id="e_next" aria-label="Next page">▶</button>
    <span class="sp"></span>
    <span class="row" id="e_toolbtns" style="gap:4px">
      <button class="btn sm on" data-tool="select">Select</button>
      <button class="btn sm" data-tool="retext">Edit text</button>
      <button class="btn sm" data-tool="text">Text</button>
      <button class="btn sm" data-tool="sign">Sign</button>
      <button class="btn sm" data-tool="ini">Initials</button>
      <button class="btn sm" data-tool="date">Date</button>
      <button class="btn sm" data-tool="pen">Draw</button>
      <button class="btn sm" data-tool="hl">Highlight</button>
      <button class="btn sm" data-tool="rect">Box</button>
      <button class="btn sm" data-tool="white">Whiteout</button>
      <button class="btn sm" data-tool="redact">Redact</button>
      <button class="btn sm" data-tool="image">Image</button>
    </span>
    <span class="sp"></span>
    <span class="row" id="e_pcolor" style="gap:6px"><label>colour</label><input type="color" id="e_color" value="#E5484D"></span>
    <span class="row" id="e_psize" style="gap:6px"><label>size</label><input type="number" id="e_size" min="1" max="200" value="14" style="width:62px"></span>
    <span class="row" id="e_pfont" style="gap:4px">
      <select id="e_font"><option value="sans">Sans</option><option value="serif">Serif</option><option value="mono">Mono</option></select>
      <button class="btn sm" id="e_bold" style="font-weight:800" aria-label="Bold">B</button>
      <button class="btn sm" id="e_ital" style="font-style:italic" aria-label="Italic">I</button>
    </span>
    <span class="row" id="e_psign" style="gap:4px">
      <button class="btn sm" id="e_resign">New signature</button>
      <button class="btn sm" id="e_iniAll" hidden>Add to every page</button>
    </span>
    <span class="sp"></span>
    <button class="btn sm dgr" id="e_delmark">Delete mark</button>
    <button class="btn sm" id="e_undo2">Undo</button>
    <span class="sp"></span>
    <button class="btn sm" id="e_zout" aria-label="Zoom out">−</button>
    <span class="mono" id="e_zlbl" style="min-width:5ch;text-align:center;font-size:12.5px">100%</span>
    <button class="btn sm" id="e_zin" aria-label="Zoom in">+</button>
    <button class="btn sm" id="e_fit">Fit</button>
  </div>

  <div class="e-tip" id="e_tip" hidden></div>
  <div class="e-body" id="e_body">
    <div class="e-start" id="e_start"></div>
    <div class="e-grid" id="e_grid" hidden></div>
    <div class="e-stage-wrap" id="e_swrap" hidden>
      <div class="e-stage" id="e_stage"><canvas id="e_canvas"></canvas><div class="e-layer" id="e_layer"></div></div>
    </div>
  </div>

  <div class="e-foot"><span id="e_statusL">Open a PDF, or build one from images.</span><span class="r" id="e_statusR"></span></div>
</div>
<input type="file" id="e_fPdf" accept="application/pdf,.pdf" hidden multiple>
<input type="file" id="e_fImg" accept="image/*,.heic,.heif" hidden multiple>
<input type="file" id="e_fStamp" accept="image/*,.heic,.heif" hidden>
`;

let root = null, ready = false;
const $ = id => root.querySelector('#e_' + id);
const el = (t, c) => { const n = document.createElement(t); if (c) n.className = c; return n; };

/* ---------- state ---------- */
const S = { name: 'Untitled.pdf', pages: [], sel: new Set(), view: 'start', cur: 0,
  tool: 'select', zoom: 1, color: '#E5484D', size: 14, font: 'sans', bold: false, ital: false, active: null,
  intent: null, mode: null, sigId: null, iniId: null, cuts: new Set() };
const SRC = [], IMG = new Map(), thumbs = new Map();
let uid = 0;
const nid = () => 'a' + (++uid);
const dW = p => (p.rot % 180 ? p.h : p.w);
const dH = p => (p.rot % 180 ? p.w : p.h);
const norm = r => ((r % 360) + 360) % 360;
const curPage = () => S.pages[S.cur];
let undo = [], redo = [], busyMsg = null;

function busy(m) { busyMsg = m; $('statusL').textContent = m; }
function idle() { busyMsg = null; chrome(); }

/* ---------- chrome ---------- */
function chrome() {
  const has = S.pages.length > 0;
  if (S.view !== 'pages' || !has) $('tip').hidden = true;
  $('seg').hidden = !has;
  $('save').disabled = !has;
  $('start').hidden = has;
  $('grid').hidden = !(has && S.view === 'pages');
  $('swrap').hidden = !(has && S.view === 'edit');
  $('tools_pages').hidden = !(has && S.view === 'pages');
  $('tools_edit').hidden = !(has && S.view === 'edit');
  $('tabPages').setAttribute('aria-selected', String(S.view === 'pages'));
  $('tabEdit').setAttribute('aria-selected', String(S.view === 'edit'));
  $('meta').textContent = has ? S.name + '  ·  ' + S.pages.length + (S.pages.length === 1 ? ' page' : ' pages') : '';
  $('undo').disabled = $('undo2').disabled = !undo.length;
  $('redo').disabled = !redo.length;
  const n = S.sel.size;
  ['left', 'right', 'rotl', 'rotr', 'dup', 'del', 'extract'].forEach(i => $(i).disabled = !n);
  if (S.view === 'pages' && !busyMsg) {
    $('statusL').textContent = n
      ? n + (n === 1 ? ' page selected' : ' pages selected') + ' · drag to reorder · double-click to edit'
      : 'Click to select, shift-click for a run, drag to reorder, double-click a page to edit it.';
    $('statusR').textContent = '';
  }
}

/* ---------- undo ---------- */
const snap = () => JSON.stringify({ n: S.name, p: S.pages, c: S.cur });
function push() { undo.push(snap()); if (undo.length > 60) undo.shift(); redo.length = 0; }
function apply(str) {
  const o = JSON.parse(str);
  S.name = o.n; S.pages = o.p; S.cur = Math.min(o.c, o.p.length - 1);
  S.sel.clear(); S.active = null;
  if (!S.pages.length) S.view = 'start';
  else if (S.view === 'edit') drawStage();
  paintGrid(); chrome();
}
const doUndo = () => { if (undo.length) { redo.push(snap()); apply(undo.pop()); } };
const doRedo = () => { if (redo.length) { undo.push(snap()); apply(redo.pop()); } };

/* ---------- loading ---------- */
async function readPdf(file) {
  const bs = new Uint8Array(await file.arrayBuffer());
  let doc;
  try { doc = await TF.pdfjsDoc(bs); }
  catch (e) { toast('Could not open ' + file.name, e.message, true); return null; }
  const id = SRC.length;
  SRC.push({ bytes: bs, doc: doc, name: file.name });
  const out = [];
  for (let i = 0; i < doc.numPages; i++) {
    const pg = await doc.getPage(i + 1);
    const vp = pg.getViewport({ scale: 1, rotation: 0 });
    out.push({ id: nid(), srcId: id, srcPage: i, imgId: null, rot: norm(pg.rotate || 0),
      w: Math.round(vp.width * 100) / 100, h: Math.round(vp.height * 100) / 100, annots: [] });
  }
  return out;
}
async function addImage(file) {
  const d = await TF.decodeImage(file, busy);
  const id = nid();
  IMG.set(id, d);
  return id;
}
function imagePage(imgId) {
  const im = IMG.get(imgId), land = im.w > im.h;
  return { id: nid(), srcId: null, srcPage: 0, imgId: imgId, rot: 0,
    w: land ? 842 : 595, h: land ? 595 : 842, annots: [] };
}
const blankPage = (w, hh) => ({ id: nid(), srcId: null, srcPage: 0, imgId: null, rot: 0, w: w, h: hh, annots: [] });

async function openFiles(files, at) {
  const list = [...files];
  const pdfs = list.filter(TF.isPdf), imgs = list.filter(f => !TF.isPdf(f) && TF.isImg(f));
  if (!pdfs.length && !imgs.length) return toast('Not supported', 'Open a PDF or an image.', true);
  const fresh = !S.pages.length;
  if (!fresh) push();
  const add = [];
  for (const f of pdfs) { const p = await readPdf(f); if (p) add.push.apply(add, p); }
  for (let i = 0; i < imgs.length; i++) {
    busy('Reading ' + imgs[i].name + (imgs.length > 1 ? ' (' + (i + 1) + '/' + imgs.length + ')' : ''));
    await TF.nextFrame();
    try { add.push(imagePage(await addImage(imgs[i]))); }
    catch (e) { toast(imgs[i].name + ' skipped', e.message, true); }
  }
  idle();
  if (!add.length) return;
  if (fresh) { S.name = pdfs[0] ? pdfs[0].name : 'images.pdf'; undo.length = 0; redo.length = 0; }
  const pos = at == null ? S.pages.length : at;
  S.pages.splice(pos, 0, ...add);
  S.view = 'pages'; S.sel.clear();
  if (!fresh) add.forEach(p => S.sel.add(p.id));          /* highlight what was just inserted into an open document */
  paintGrid(); chrome();
  if (S.intent) { const t = S.intent; S.intent = null; S.cur = pos; enterEdit(t); }
}

/* ---------- thumbnails ---------- */
const tkey = p => (p.imgId ? 'i' + p.imgId : p.srcId == null ? 'b' + p.w + 'x' + p.h : p.srcId + ':' + p.srcPage) + '@' + p.rot;
function thumb(p) {
  const k = tkey(p);
  if (thumbs.has(k)) return thumbs.get(k);
  const job = (async () => {
    const W = 240, scale = W / dW(p);
    if (p.srcId != null) {
      const pg = await SRC[p.srcId].doc.getPage(p.srcPage + 1);
      return (await TF.renderPage(pg, scale, p.rot)).toDataURL('image/jpeg', .72);
    }
    const c = TF.h2c(dW(p) * scale, dH(p) * scale);
    c.ctx.fillStyle = '#fff'; c.ctx.fillRect(0, 0, c.cv.width, c.cv.height);
    if (p.imgId) {
      const im = IMG.get(p.imgId), b = TF.fit(im.w, im.h, dW(p) - 48, dH(p) - 48);
      c.ctx.drawImage(im.img, (dW(p) - b.w) / 2 * scale, (dH(p) - b.h) / 2 * scale, b.w * scale, b.h * scale);
    }
    return c.cv.toDataURL('image/jpeg', .72);
  })();
  thumbs.set(k, job);
  return job;
}
let io = null;
function paintGrid() {
  const g = $('grid');
  g.innerHTML = '';
  if (!io) io = new IntersectionObserver(ents => ents.forEach(async en => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const p = S.pages.find(x => x.id === en.target.dataset.id);
    if (!p) return;
    try {
      const url = await thumb(p);
      const im = new Image();
      im.src = url; im.alt = '';
      const ph = en.target.querySelector('.ph');
      if (ph) ph.replaceWith(im);
    } catch (e) {}
  }), { root: $('body'), rootMargin: '400px 0px' });
  g.classList.toggle('split', S.mode === 'split');
  g.classList.toggle('rot', S.mode === 'rotate');
  /* colour-code pages by the file they came from, once there is more than one */
  const used = [...new Set(S.pages.map(p => p.srcId == null ? 'img' : p.srcId))];
  if (used.length > 1) {
    const lg = el('div', 'e-legend');
    used.forEach(k => {
      const n = S.pages.filter(p => (p.srcId == null ? 'img' : p.srcId) === k).length;
      const s = el('span');
      s.innerHTML = '<i style="background:' + srcColor(k) + '"></i>' + esc(k === 'img' ? 'Images & blank pages' : SRC[k].name) + ' · ' + n + (n === 1 ? ' page' : ' pages');
      lg.append(s);
    });
    g.append(lg);
  }
  S.pages.forEach((p, i) => {
    const w = el('div', 'e-pg' + (S.sel.has(p.id) ? ' sel' : '') + (S.cuts.has(p.id) && i < S.pages.length - 1 ? ' cutafter' : ''));
    w.dataset.id = p.id; w.draggable = true;
    const sh = el('div', 'sh');
    sh.style.aspectRatio = dW(p) + '/' + dH(p);
    const ph = el('div', 'ph');
    ph.textContent = i + 1;
    sh.append(ph);
    if (used.length > 1) { const sc = el('div', 'src'); sc.style.background = srcColor(p.srcId == null ? 'img' : p.srcId); sh.append(sc); }
    const q = el('div', 'qk');
    q.innerHTML = '<button data-q="rot" aria-label="Rotate page ' + (i + 1) + '" title="Rotate">↻</button><button data-q="dup" aria-label="Duplicate page ' + (i + 1) + '" title="Duplicate">⧉</button>' +
      '<button data-q="del" aria-label="Delete page ' + (i + 1) + '" title="Delete">✕</button>';
    const cap = el('div', 'cap');
    cap.innerHTML = '<span>' + (i + 1) + '</span><span class="b">' + (p.annots.length ? 'edited' : '') + '</span>';
    w.append(sh, q, cap);
    if (i < S.pages.length - 1) {
      const cut = el('button', 'cut');
      cut.dataset.q = 'cut'; cut.type = 'button'; cut.textContent = '✂';
      cut.setAttribute('aria-label', (S.cuts.has(p.id) ? 'Remove the split after page ' : 'Split after page ') + (i + 1));
      cut.title = S.cuts.has(p.id) ? 'Join again' : 'Split here';
      w.append(cut);
    }
    g.append(w);
    io.observe(w);
  });
  paintTip();
}
const SRC_COLORS = ['#0FBE6E', '#6247D6', '#C96A22', '#2A6FBD', '#C2307A', '#8A9A1E', '#0E9AA7'];
const srcColor = k => k === 'img' ? '#9AA5A1' : SRC_COLORS[k % SRC_COLORS.length];
/* pages split into the parts marked with ✂ */
function parts() {
  const out = [[]];
  S.pages.forEach((p, i) => { out[out.length - 1].push(p); if (S.cuts.has(p.id) && i < S.pages.length - 1) out.push([]); });
  return out.filter(x => x.length);
}

/* ---------- task modes: what the page is for, shown as a hint bar ---------- */
const MODES = {
  merge: { title: 'Drop the PDFs to merge', sub: 'Add two or more files — then drag pages into order', many: true },
  split: { title: 'Drop the PDF to split', sub: 'Then click ✂ between pages wherever a new file should start' },
  rotate: { title: 'Drop the PDF to rotate', sub: 'Then click ↻ on any page, or select several and turn them together' },
  images: { title: 'Drop your photos or scans', sub: 'Each image becomes a page — JPG, PNG, WebP or iPhone HEIC', many: true, images: true },
  sign: { title: 'Drop the PDF you need to sign', sub: 'You go straight to the page to place your signature' }
};
const ILLUS = {
  merge: '<rect x="8" y="10" width="26" height="34" rx="3"/><rect x="14" y="26" width="26" height="34" rx="3"/><path d="M50 40h18m-6-6l6 6-6 6"/><rect x="80" y="14" width="30" height="44" rx="3"/><path d="M87 26h16M87 34h16M87 42h10"/>',
  split: '<rect x="10" y="14" width="30" height="44" rx="3"/><path d="M17 26h16M17 34h16M17 42h10"/><path d="M52 8v56" stroke-dasharray="4 4"/><rect x="64" y="10" width="22" height="30" rx="3"/><rect x="92" y="32" width="22" height="30" rx="3"/>',
  rotate: '<rect x="40" y="14" width="30" height="44" rx="3"/><path d="M47 26h16M47 34h16"/><path d="M88 22a24 24 0 0 1-2 30"/><path d="M80 52l6 1 1-6"/>',
  images: '<rect x="6" y="18" width="32" height="26" rx="3"/><circle cx="16" cy="27" r="3"/><path d="M38 40l-9-8-15 12"/><path d="M48 36h18m-6-6l6 6-6 6"/><rect x="78" y="12" width="32" height="46" rx="3"/><rect x="84" y="20" width="20" height="16" rx="2"/>',
  sign: '<rect x="30" y="8" width="44" height="58" rx="3"/><path d="M38 20h28M38 28h28M38 36h18"/><path d="M38 54c4-2 6-10 9-10s2 8 5 8 4-5 7-5 3 4 6 4"/><path d="M84 30l18-18 6 6-18 18-8 2z"/>',
  edit: '<rect x="30" y="8" width="44" height="58" rx="3"/><path d="M38 20h28M38 28h28M38 36h18"/><path d="M80 48l22-22 6 6-22 22-8 2z"/>'
};
const illus = k => '<svg class="illus" viewBox="0 0 120 72" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ILLUS[k] || ILLUS.edit) + '</svg>';
function paintStart() {
  const m = MODES[S.mode] || null, box = $('start');
  box.innerHTML = '';
  box.insertAdjacentHTML('beforeend', illus(S.mode || 'edit'));
  box.append(TF.dropzone({ title: m ? m.title : 'Drop a PDF here', sub: m ? m.sub : 'or click to choose — you can also start from images or a blank page',
    accept: m && m.images ? 'image/*,.heic,.heif' : 'application/pdf,.pdf,image/*,.heic,.heif', multiple: true,
    onFiles: f => openFiles(f, null) }));
  if (!m) {
    const blank = (w, hh) => () => { resetDoc(); S.pages = [blankPage(w, hh)]; S.view = 'pages'; paintGrid(); chrome(); };
    const r = TF.actions([{ label: 'Blank A4 page', icon: 'file', go: blank(595, 842) }, { label: 'US Letter', go: blank(612, 792) }]);
    r.style.justifyContent = 'center';
    box.append(r);
  }
}
function paintTip() {
  const t = $('tip');
  t.innerHTML = '';
  if (!S.pages.length || S.view !== 'pages') { t.hidden = true; return; }
  const add = (label, go) => { const b = el('button', 'btn sm'); b.textContent = label; b.onclick = go; t.append(b); };
  const say = html => { const s = el('span'); s.innerHTML = html; t.append(s); };
  if (S.mode === 'merge') {
    const files = new Set(S.pages.map(p => p.srcId)).size;
    say(files < 2 ? '<b>Add the next PDF</b> to merge with this one.' : '<b>' + files + ' files, ' + S.pages.length + ' pages.</b> Drag pages into order — the colours show where each came from. Then Save.');
    add('+ Add PDFs', () => { insertAt = S.pages.length; $('fPdf').click(); });
  } else if (S.mode === 'split') {
    const n = parts().length;
    say(n < 2 ? '<b>Click ✂ between two pages</b> to split there.' : '<b>' + n + ' parts marked.</b> Save to get them as separate PDFs.');
    add('Split after every page', () => { S.pages.forEach(p => S.cuts.add(p.id)); paintGrid(); });
    if (n > 1) add('Clear the cuts', () => { S.cuts.clear(); paintGrid(); });
  } else if (S.mode === 'rotate') {
    say('<b>Click ↻ on a page</b> to turn it a quarter. Or turn them all:');
    add('↺ All', () => { push(); S.pages.forEach(p => p.rot = norm(p.rot - 90)); paintGrid(); chrome(); });
    add('↻ All', () => { push(); S.pages.forEach(p => p.rot = norm(p.rot + 90)); paintGrid(); chrome(); });
  } else if (S.mode === 'images') {
    say('<b>' + S.pages.length + (S.pages.length === 1 ? ' page.' : ' pages.') + '</b> Drag to reorder, then Save as one PDF.');
    add('+ Add images', () => { insertAt = S.pages.length; $('fImg').click(); });
  } else { t.hidden = true; return; }
  t.hidden = false;
}
let insertAt = null;
function resetDoc() {
  S.pages = []; S.sel.clear(); S.cuts.clear(); S.cur = 0; S.view = 'start'; S.active = null; S.name = 'Untitled.pdf';
  undo.length = 0; redo.length = 0;
}

/* ---------- pages interaction ---------- */
let lastPick = null;
const cloneP = p => { const c = JSON.parse(JSON.stringify(p)); c.id = nid(); c.annots.forEach(a => a.id = nid()); return c; };
const selIdx = () => S.pages.map((p, i) => S.sel.has(p.id) ? i : -1).filter(i => i >= 0);
const lastSel = () => { let n = -1; S.pages.forEach((p, i) => { if (S.sel.has(p.id)) n = i; }); return n; };

/* ---------- edit stage ---------- */
const FONTCSS = { sans: 'Helvetica,Arial,sans-serif', serif: '"Times New Roman",Times,serif', mono: '"Courier New",monospace' };
let renderTok = 0;
function fitZoom() {
  const p = curPage();
  if (!p) return;
  S.zoom = Math.max(.15, Math.min(2, ($('body').clientWidth - 56) / dW(p)));
}
function enterEdit(tool) {
  if (!S.pages.length) return;
  S.view = 'edit'; S.active = null;
  chrome(); fitZoom(); drawStage();
  if (tool) setTool(tool);
}
async function drawStage() {
  const p = curPage();
  if (!p) return;
  const tok = ++renderTok, W = dW(p), H = dH(p), RS = Math.min(2, 2600 / W);
  $('stage').style.width = (W * S.zoom) + 'px';
  $('stage').style.height = (H * S.zoom) + 'px';
  $('pageno').textContent = (S.cur + 1) + ' / ' + S.pages.length;
  $('zlbl').textContent = Math.round(S.zoom * 100) + '%';
  $('prev').disabled = !S.cur;
  $('next').disabled = S.cur === S.pages.length - 1;
  $('statusR').textContent = Math.round(W) + ' × ' + Math.round(H) + ' pt · ' + p.annots.length +
    (p.annots.length === 1 ? ' mark' : ' marks');
  const cv = $('canvas');
  cv.width = Math.ceil(W * RS); cv.height = Math.ceil(H * RS);
  const cx = cv.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, cv.width, cv.height);
  if (p.srcId != null) {
    const pg = await SRC[p.srcId].doc.getPage(p.srcPage + 1);
    if (tok !== renderTok) return;
    await pg.render({ canvasContext: cx, viewport: pg.getViewport({ scale: RS, rotation: p.rot }) }).promise;
  } else if (p.imgId) {
    const im = IMG.get(p.imgId), b = TF.fit(im.w, im.h, W - 48, H - 48);
    cx.drawImage(im.img, (W - b.w) / 2 * RS, (H - b.h) / 2 * RS, b.w * RS, b.h * RS);
  }
  if (tok !== renderTok) return;
  paintLayer();
  if (S.tool === 'retext') hotspots();
}
function paintLayer() {
  const p = curPage(), z = S.zoom, layer = $('layer');
  layer.innerHTML = '';
  if (!p) return;
  layer.className = 'e-layer ' + (S.tool === 'text' || S.tool === 'date' ? 'txt'
    : ['pen', 'hl', 'rect', 'white', 'redact', 'image', 'sign', 'ini'].indexOf(S.tool) >= 0 ? 'cross' : '');
  p.annots.forEach(a => layer.append(annotEl(a, z)));
}
const penD = a => 'M ' + a.pts.map(q => q[0] + ' ' + q[1]).join(' L ');
function penBox(a) {
  const xs = a.pts.map(q => q[0]), ys = a.pts.map(q => q[1]), m = a.width + 1;
  const x = Math.min.apply(null, xs) - m, y = Math.min.apply(null, ys) - m;
  return { x: x, y: y, w: Math.max.apply(null, xs) + m - x, h: Math.max.apply(null, ys) + m - y };
}
const handle = k => { const n = el('div', 'hdl ' + k); n.dataset.h = k; return n; };
function annotEl(a, z) {
  const n = el('div', 'an an-' + a.type + (S.active === a.id ? ' sel' : ''));
  n.dataset.id = a.id;
  n.style.left = a.x * z + 'px'; n.style.top = a.y * z + 'px';
  if (a.type !== 'pen') n.style.width = a.w * z + 'px';
  if (a.type !== 'text' && a.type !== 'pen') n.style.height = a.h * z + 'px';
  if (a.type === 'text') {
    const b = el('div', 'body');
    b.contentEditable = 'true'; b.spellcheck = false; b.dir = 'auto';
    b.style.font = (a.ital ? 'italic ' : '') + (a.bold ? '700 ' : '400 ') + (a.size * z) + 'px/1.18 ' + FONTCSS[a.font];
    b.style.color = a.color;
    b.textContent = a.text;
    let before = a.text;
    b.addEventListener('focus', () => before = a.text);
    b.addEventListener('input', () => a.text = b.innerText.replace(/\n$/, ''));
    b.addEventListener('blur', () => {
      if (!a.text.trim()) return removeAnnot(a.id);
      if (a.text !== before) { push(); before = a.text; }
    });
    n.append(b, handle('e'));
  } else if (a.type === 'white') { n.style.background = '#fff'; n.append(handle('se')); }
  else if (a.type === 'redact') { n.style.background = '#000'; n.append(handle('se')); }
  else if (a.type === 'hl') { n.style.background = a.color; n.style.opacity = .4; n.append(handle('se')); }
  else if (a.type === 'rect') { n.style.border = Math.max(1, a.width * z) + 'px solid ' + a.color; n.append(handle('se')); }
  else if (a.type === 'image') {
    const g = new Image();
    g.src = IMG.get(a.imgId).url; g.alt = '';
    n.append(g, handle('se'));
  } else if (a.type === 'pen') {
    const bb = penBox(a);
    n.style.left = bb.x * z + 'px'; n.style.top = bb.y * z + 'px';
    n.style.width = bb.w * z + 'px'; n.style.height = bb.h * z + 'px';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', bb.x + ' ' + bb.y + ' ' + bb.w + ' ' + bb.h);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', penD(a));
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', a.color);
    path.setAttribute('stroke-width', a.width);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path); n.append(svg);
  }
  return n;
}
function removeAnnot(id) {
  const p = curPage();
  p.annots = p.annots.filter(a => a.id !== id);
  if (S.active === id) S.active = null;
  paintLayer(); chrome();
  $('statusR').textContent = Math.round(dW(p)) + ' × ' + Math.round(dH(p)) + ' pt · ' + p.annots.length + ' marks';
}
const activeAnnot = () => { const p = curPage(); return p ? p.annots.find(a => a.id === S.active) : null; };

const TIPS = {
  select: 'Click a mark to select it, drag to move, drag the green handle to resize. Delete removes it.',
  retext: 'Click any highlighted text to cover it and retype it.',
  text: 'Click where the text should start, then type. Any language works.',
  sign: 'Click where your signature goes. The first click asks you to draw, type or upload it.',
  ini: 'Click where your initials go, or use “Add to every page”.',
  date: 'Click where today’s date should go.',
  pen: 'Draw freehand with the mouse, trackpad or a finger.',
  hl: 'Drag across the words you want highlighted.',
  rect: 'Drag to draw a box.',
  white: 'Drag over anything to cover it with white.',
  redact: 'Drag over anything that must be destroyed. On save, those pages are re-rendered as images so the text underneath is genuinely gone — not just hidden.',
  image: 'Click where the image goes, then choose the file.'
};
function setTool(t, quiet) {
  S.tool = t;
  if (!quiet) S.active = null;
  [...$('toolbtns').children].forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('pfont').hidden = t !== 'text';
  $('psize').hidden = ['text', 'pen', 'rect', 'date'].indexOf(t) < 0;
  $('pcolor').hidden = ['white', 'image', 'redact', 'sign', 'ini'].indexOf(t) >= 0;
  $('psign').hidden = t !== 'sign' && t !== 'ini';
  $('iniAll').hidden = t !== 'ini';
  $('resign').textContent = t === 'ini' ? 'New initials' : 'New signature';
  if (!quiet) { $('statusL').textContent = TIPS[t] || ''; paintLayer(); if (t === 'retext') hotspots(); }
}
function ptFrom(e) {
  const r = $('layer').getBoundingClientRect();
  return { x: (e.clientX - r.left) / S.zoom, y: (e.clientY - r.top) / S.zoom };
}
async function hotspots() {
  const p = curPage();
  if (p.srcId == null) { $('statusL').textContent = 'This page has no PDF text — use the Text tool instead.'; return; }
  if (p.rot % 180) { $('statusL').textContent = 'Text can only be replaced on upright pages. Rotate this one back first.'; return; }
  const pg = await SRC[p.srcId].doc.getPage(p.srcPage + 1);
  const vp = pg.getViewport({ scale: 1, rotation: p.rot });
  const tc = await pg.getTextContent();
  const layer = $('layer');
  let n = 0;
  tc.items.forEach(item => {
    if (!item.str || !item.str.trim()) return;
    const m = pdfjsLib.Util.transform(vp.transform, item.transform);
    if (Math.abs(m[1]) > .01 || Math.abs(m[2]) > .01) return;
    const size = Math.hypot(m[2], m[3]) || Math.abs(m[3]);
    const w = item.width, x = m[4], base = m[5];
    if (!(size > .5) || !(w > .5)) return;
    const hot = el('div', 'thot');
    hot.style.left = x * S.zoom + 'px';
    hot.style.top = (base - size * .88) * S.zoom + 'px';
    hot.style.width = w * S.zoom + 'px';
    hot.style.height = size * 1.2 * S.zoom + 'px';
    hot.title = 'Replace this text';
    hot.addEventListener('pointerdown', ev => {
      ev.stopPropagation(); ev.preventDefault();
      push();
      const fn = item.fontName || '';
      const guess = /mono|courier/i.test(fn) ? 'mono' : /times|serif|roman|georgia|garamond|book/i.test(fn) ? 'serif' : 'sans';
      p.annots.push({ id: nid(), type: 'white', x: x - .5, y: base - size * .92, w: w + 1.5, h: size * 1.24, color: '#ffffff' });
      const a = { id: nid(), type: 'text', x: x, y: base - size * .86, w: Math.max(w + 6, 24),
        size: Math.round(size * 10) / 10, color: '#000000', font: guess,
        bold: /bold|black|heavy/i.test(fn), ital: /italic|oblique/i.test(fn), text: item.str };
      p.annots.push(a);
      S.active = a.id;
      setTool('select', true);
      paintLayer();
      const b = layer.querySelector('[data-id="' + a.id + '"] .body');
      if (b) { b.focus(); try { document.execCommand('selectAll', false, null); } catch (x) {} }
    });
    layer.append(hot); n++;
  });
  $('statusL').textContent = n ? 'Click any highlighted run to replace it. ' + n + ' editable runs on this page.'
    : 'No selectable text here — this page is probably a scan. Use Whiteout or Redact plus Text.';
}

/* ---------- signatures ---------- */
const SIGFONTS = ['Dancing Script', 'Great Vibes', 'Caveat', 'Homemade Apple'];
let sigFontsP = null;
function sigFonts() {
  if (!sigFontsP) sigFontsP = new Promise(res => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat&family=Dancing+Script&family=Great+Vibes&family=Homemade+Apple&display=swap';
    l.onload = l.onerror = res;
    document.head.append(l);
  }).then(() => Promise.all(SIGFONTS.map(f => document.fonts.load('48px "' + f + '"').catch(() => null))));
  return sigFontsP;
}
async function entryFromDataUrl(u) {
  const im = await TF.loadImg(u);
  return TF.canvasEntry(TF.drawTo(im, im.naturalWidth, im.naturalHeight), 'signature.png');
}
/* returns a transparent PNG entry, or null if cancelled */
function signatureDialog(kind) {
  const ini = kind === 'ini';
  return new Promise(resolve => {
    let done = false;
    TF.modal(ini ? 'Your initials' : 'Your signature', (box, close) => {
      box.onclose = () => { if (!done) resolve(null); };
      let mode = 'draw', ink = TF.store.get('sigInk', '#0B2A6B'), font = SIGFONTS[0], strokes = [], upCv = null;
      const tabs = TF.seg([['draw', 'Draw'], ['type', 'Type'], ['upload', 'Photo of paper']], 'draw', v => { mode = v; show(); });
      const inkSeg = TF.seg([['#0F1412', 'Black'], ['#0B2A6B', 'Blue']], ink, v => { ink = v; TF.store.set('sigInk', v); redraw(); paintStyles(); recolorUp(); });
      const head = TFh('div', 'row');
      head.style.justifyContent = 'space-between';
      head.append(tabs, inkSeg);

      /* draw */
      const drawBox = TFh('div');
      const pad = TFh('canvas', 'pad');
      drawBox.append(pad, TF.actions([{ label: 'Clear', go: () => { strokes = []; redraw(); } }]));
      drawBox.firstChild.style.marginTop = '14px';
      const pctx = pad.getContext('2d');
      function sizePad() {
        const r = pad.getBoundingClientRect();
        pad.width = Math.max(1, Math.round(r.width * 2)); pad.height = Math.max(1, Math.round(r.height * 2));
        redraw();
      }
      function redraw() {
        pctx.clearRect(0, 0, pad.width, pad.height);
        pctx.strokeStyle = ink; pctx.lineCap = pctx.lineJoin = 'round'; pctx.lineWidth = 5.2;
        strokes.forEach(s => {
          pctx.beginPath(); pctx.moveTo(s[0][0] * 2, s[0][1] * 2);
          if (s.length < 3) s.forEach(q => pctx.lineTo(q[0] * 2 + .1, q[1] * 2));
          for (let i = 1; i < s.length - 1; i++) {
            const mx = (s[i][0] + s[i + 1][0]), my = (s[i][1] + s[i + 1][1]);
            pctx.quadraticCurveTo(s[i][0] * 2, s[i][1] * 2, mx, my);
          }
          if (s.length >= 3) pctx.lineTo(s[s.length - 1][0] * 2, s[s.length - 1][1] * 2);
          pctx.stroke();
        });
      }
      pad.addEventListener('pointerdown', e => {
        e.preventDefault();
        pad.setPointerCapture(e.pointerId);
        const r = pad.getBoundingClientRect(), s = [[e.clientX - r.left, e.clientY - r.top]];
        strokes.push(s);
        const mv = ev => { s.push([ev.clientX - r.left, ev.clientY - r.top]); redraw(); };
        const up = () => { pad.removeEventListener('pointermove', mv); pad.removeEventListener('pointerup', up); redraw(); };
        pad.addEventListener('pointermove', mv);
        pad.addEventListener('pointerup', up);
      });

      /* type */
      const typeBox = TFh('div');
      const name = TF.txt(TF.store.get(ini ? 'iniName' : 'sigName', ''), ini ? 'e.g. J.D.' : 'Type your name');
      name.style.marginTop = '14px';
      const styles = TFh('div', 'sigstyles');
      typeBox.append(name, styles);
      function paintStyles() {
        styles.innerHTML = '';
        SIGFONTS.forEach(f => {
          const b = TFh('button');
          b.textContent = name.value || (ini ? 'J.D.' : 'Your Name');
          b.style.fontFamily = '"' + f + '",cursive'; b.style.color = ink;
          b.setAttribute('aria-selected', String(f === font));
          b.onclick = () => { font = f; paintStyles(); };
          styles.append(b);
        });
      }
      name.oninput = paintStyles;
      sigFonts().then(paintStyles);

      /* upload */
      const upBox = TFh('div');
      const upPrev = TFh('div', 'checker');
      upPrev.style.cssText = 'margin-top:12px;border-radius:10px;border:1px solid var(--line);padding:10px;text-align:center;min-height:40px';
      let upSrc = null;
      upBox.append(TF.dropzone({ small: true, icon: 'image', title: 'Photo of your signature on white paper',
        sub: 'the paper is removed automatically', accept: 'image/*,.heic,.heif', onFiles: async f => {
          try { upSrc = await TF.decodeImage(f[0]); recolorUp(); }
          catch (e) { toast('Could not read that image', e.message, true); }
        } }), upPrev);
      upBox.firstChild.style.marginTop = '14px';
      function recolorUp() {
        if (!upSrc) return;
        const k = Math.min(1, 1600 / Math.max(upSrc.w, upSrc.h));
        const c = TF.h2c(upSrc.w * k, upSrc.h * k);
        c.ctx.drawImage(upSrc.img, 0, 0, c.cv.width, c.cv.height);
        const d = c.ctx.getImageData(0, 0, c.cv.width, c.cv.height), px = d.data;
        const r0 = parseInt(ink.slice(1, 3), 16), g0 = parseInt(ink.slice(3, 5), 16), b0 = parseInt(ink.slice(5, 7), 16);
        for (let i = 0; i < px.length; i += 4) {
          const lum = px[i] * .299 + px[i + 1] * .587 + px[i + 2] * .114;
          const a = Math.max(0, Math.min(1, (150 - lum) / 82));
          px[i] = r0; px[i + 1] = g0; px[i + 2] = b0; px[i + 3] = Math.round(a * 255);
        }
        c.ctx.putImageData(d, 0, 0);
        upCv = c.cv;
        upPrev.innerHTML = '';
        const im = TFh('img');
        im.src = c.cv.toDataURL('image/png');
        im.style.cssText = 'max-width:100%;max-height:160px';
        upPrev.append(im);
      }

      const remember = TF.check('Remember on this device', !!TF.store.get(ini ? 'ini' : 'sig', null));
      remember.style.marginTop = '14px';
      const foot = TF.actions([
        { label: ini ? 'Use these initials' : 'Use this signature', cls: 'pri', icon: 'sign', go: finish },
        { label: 'Cancel', go: close }
      ]);
      box.append(head, drawBox, typeBox, upBox, remember, foot);
      function show() {
        drawBox.hidden = mode !== 'draw'; typeBox.hidden = mode !== 'type'; upBox.hidden = mode !== 'upload';
        if (mode === 'draw') requestAnimationFrame(sizePad);
        if (mode === 'type') { paintStyles(); name.focus(); }
      }
      show();

      async function finish() {
        let cv = null;
        if (mode === 'draw') cv = strokes.length ? TF.trimCanvas(pad) : null;
        else if (mode === 'type') {
          const t = name.value.trim();
          if (t) {
            await sigFonts();
            const c = TF.h2c(10, 10), f = '120px "' + font + '",cursive';
            c.ctx.font = f;
            const w = Math.ceil(c.ctx.measureText(t).width) + 120;
            const c2 = TF.h2c(w, 240);
            c2.ctx.font = f; c2.ctx.fillStyle = ink; c2.ctx.textBaseline = 'middle';
            c2.ctx.fillText(t, 60, 125);
            cv = TF.trimCanvas(c2.cv);
            TF.store.set(ini ? 'iniName' : 'sigName', t);
          }
        } else if (upCv) cv = TF.trimCanvas(upCv);
        if (!cv) return toast('Nothing to use yet', mode === 'draw' ? 'Draw in the box first.' : mode === 'type' ? 'Type your name first.' : 'Add a photo first.', true);
        TF.store.set(ini ? 'ini' : 'sig', remember.input.checked ? cv.toDataURL('image/png') : null);
        done = true;
        close();
        resolve(await TF.canvasEntry(cv, ini ? 'initials.png' : 'signature.png'));
      }
    });
  });
}
async function ensureSig(kind, fresh) {
  const key = kind === 'ini' ? 'iniId' : 'sigId';
  if (S[key] && !fresh) return S[key];
  let entry = null;
  const saved = !fresh && TF.store.get(kind === 'ini' ? 'ini' : 'sig', null);
  if (saved) { try { entry = await entryFromDataUrl(saved); } catch (e) { entry = null; } }
  if (!entry) entry = await signatureDialog(kind);
  if (!entry) return null;
  const id = nid();
  IMG.set(id, entry);
  S[key] = id;
  return id;
}
function placeImage(p, imgId, cx, cy, maxW, maxH) {
  const im = IMG.get(imgId), b = TF.fit(im.w, im.h, maxW, maxH);
  const a = { id: nid(), type: 'image', imgId: imgId,
    x: Math.max(0, Math.min(dW(p) - b.w, cx - b.w / 2)), y: Math.max(0, Math.min(dH(p) - b.h, cy - b.h / 2)), w: b.w, h: b.h };
  p.annots.push(a);
  return a;
}

/* ---------- export ---------- */
const HEXC = hx => {
  const v = hx.replace('#', ''), f = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
  return rgb(parseInt(f.slice(0, 2), 16) / 255, parseInt(f.slice(2, 4), 16) / 255, parseInt(f.slice(4, 6), 16) / 255);
};
const FK = a => (a.font === 'serif' ? 'Times' : a.font === 'mono' ? 'Courier' : 'Helvetica') +
  (a.bold && a.ital ? 'BI' : a.bold ? 'B' : a.ital ? 'I' : '');
const FM = { Helvetica: 'Helvetica', HelveticaB: 'HelveticaBold', HelveticaI: 'HelveticaOblique',
  HelveticaBI: 'HelveticaBoldOblique', Times: 'TimesRoman', TimesB: 'TimesRomanBold',
  TimesI: 'TimesRomanItalic', TimesBI: 'TimesRomanBoldItalic', Courier: 'Courier',
  CourierB: 'CourierBold', CourierI: 'CourierOblique', CourierBI: 'CourierBoldOblique' };
const RTL_START = /^[^\p{L}]*[֐-ࣿיִ-﷿ﹰ-﻿]/u;
let dropped = false;

async function build(list, onStep) {
  const out = await PDFDocument.create();
  const libs = new Map(), imgs = new Map();
  const texts = [];
  list.forEach(p => p.annots.forEach(a => { if (a.type === 'text') texts.push([a.text, FM[FK(a)]]); }));
  const kit = await TF.textKit(out, texts);
  const getLib = async id => {
    if (!libs.has(id)) libs.set(id, await TF.pdfLibDoc(SRC[id].bytes));
    return libs.get(id);
  };
  const getImg = async id => {
    if (!imgs.has(id)) {
      const im = IMG.get(id);
      let bytes = im.bytes, png = im.type === 'png';
      if (im.type !== 'png' && im.type !== 'jpg') {
        const b = await TF.canvasBlob(TF.drawTo(im.img, im.w, im.h), 'image/jpeg', .92);
        bytes = new Uint8Array(await b.arrayBuffer()); png = false;
      }
      imgs.set(id, png ? await out.embedPng(bytes.slice(0)) : await out.embedJpg(bytes.slice(0)));
    }
    return imgs.get(id);
  };

  for (let n = 0; n < list.length; n++) {
    const p = list[n];
    if (onStep) onStep(n, list.length);
    await TF.nextFrame();
    const Wd = dW(p), Hd = dH(p);
    const redacts = p.annots.filter(a => a.type === 'redact');
    if (p.srcId != null && !p.annots.length) {
      const lib = await getLib(p.srcId);
      const cp = (await out.copyPages(lib, [p.srcPage]))[0];
      cp.setRotation(PDFLib.degrees(p.rot));
      out.addPage(cp);
      continue;
    }
    const page = out.addPage([Wd, Hd]);
    if (p.srcId != null && redacts.length) {
      /* true redaction: re-render the page as an image with the boxes burned in,
         so the covered text no longer exists in the file at all */
      const pg = await SRC[p.srcId].doc.getPage(p.srcPage + 1);
      const RS = Math.min(2.8, 2400 / Wd);
      const cv = await TF.renderPage(pg, RS, p.rot);
      const cx = cv.getContext('2d');
      cx.fillStyle = '#000';
      redacts.forEach(a => cx.fillRect(a.x * RS, a.y * RS, a.w * RS, a.h * RS));
      const b = await TF.canvasBlob(cv, 'image/jpeg', .9);
      const emb = await out.embedJpg(new Uint8Array(await b.arrayBuffer()));
      page.drawImage(emb, { x: 0, y: 0, width: Wd, height: Hd });
    } else if (p.srcId != null) {
      const lib = await getLib(p.srcId);
      TF.placePage(page, await TF.embedShown(out, lib.getPage(p.srcPage)), p.rot, 0, 0, Wd, Hd);
    } else if (p.imgId) {
      const im = IMG.get(p.imgId), e = await getImg(p.imgId);
      const b = TF.fit(im.w, im.h, Wd - 48, Hd - 48);
      page.drawImage(e, { x: (Wd - b.w) / 2, y: (Hd - b.h) / 2, width: b.w, height: b.h });
    }
    for (const a of p.annots) {
      if (a.type === 'redact') { if (p.srcId != null) continue; }
      if (a.type === 'white' || a.type === 'hl' || a.type === 'rect' || a.type === 'redact') {
        const o = { x: a.x, y: Hd - a.y - a.h, width: a.w, height: a.h };
        if (a.type === 'rect') { o.borderColor = HEXC(a.color); o.borderWidth = Math.max(.4, a.width || 1); }
        else if (a.type === 'redact') o.color = rgb(0, 0, 0);
        else { o.color = HEXC(a.color); if (a.type === 'hl') o.opacity = .4; }
        page.drawRectangle(o);
      } else if (a.type === 'image') {
        page.drawImage(await getImg(a.imgId), { x: a.x, y: Hd - a.y - a.h, width: a.w, height: a.h });
      } else if (a.type === 'pen') {
        const o = { x: 0, y: Hd, borderColor: HEXC(a.color), borderWidth: a.width };
        if (CAP !== undefined) o.borderLineCap = CAP;
        page.drawSvgPath(penD(a), o);
      } else if (a.type === 'text') {
        const std = FM[FK(a)];
        const lines = kit.wrap(a.text, a.size, std, a.w);
        const first = a.y + a.size * .86;
        lines.forEach((ln, i) => {
          if (!ln) return;
          const x = RTL_START.test(ln) ? a.x + a.w - kit.width(ln, a.size, std) : a.x;
          kit.draw(page, ln, { x: x, y: Hd - (first + i * a.size * 1.18), size: a.size, std: std, color: HEXC(a.color) });
        });
      }
    }
  }
  dropped = kit.dropped;
  return out.save();
}
async function save(list, suffix) {
  if (!list || !list.length) return;
  const b = $('save'), label = b.textContent;
  b.disabled = true; b.textContent = 'Saving…';
  try {
    const bytes = await build(list, (i, t) => busy('Writing page ' + (i + 1) + ' of ' + t));
    const blob = new Blob([bytes], { type: 'application/pdf' });
    dl(blob, S.name.replace(/\.pdf$/i, '') + (suffix || '-edited') + '.pdf');
    toast('Saved', list.length + (list.length === 1 ? ' page · ' : ' pages · ') + TF.bytes(blob.size));
    if (dropped) toast('Some characters dropped',
      'A few symbols (emoji or rare scripts) have no font here and were left out.', true);
  } catch (e) { console.error(e); toast('Could not write the file', e.message, true); }
  b.textContent = label; b.disabled = false;
  idle();
}

/* ---------- save dialog: every way out of the studio, as cards ---------- */
const stem = () => S.name.replace(/\.pdf$/i, '');
function openExport() {
  if (!S.pages.length) return;
  const ps = parts();
  TF.modal('Save your document', (box, close) => {
    box.append(TF.note(S.pages.length + (S.pages.length === 1 ? ' page' : ' pages') + (ps.length > 1 ? ', split into <b>' + ps.length + ' parts</b>' : '') + '. Choose how you want it:'));
    const opts = TFh('div', 'opts');
    const opt = (icon, title, sub, go, off) => {
      const b = TFh('button', 'opt', ico(icon) + '<b>' + esc(title) + '</b><span>' + esc(sub) + '</span>');
      b.type = 'button'; b.disabled = !!off;
      b.onclick = () => { close(); go(); };
      opts.append(b);
    };
    if (ps.length > 1) opt('split', ps.length + ' separate PDFs', 'One file for each part you cut, in a zip', saveParts);
    opt('download', ps.length > 1 ? 'One combined PDF' : 'PDF', 'Everything in a single file, text kept sharp', () => save(S.pages, '-edited'));
    opt('compress', 'Smaller PDF', 'Pages become compressed images — good for email limits', () => saveVariant('small'));
    opt('image', 'Images', 'Every page as a JPG picture, in a zip', () => saveVariant('jpg'));
    opt('lock', 'With a password', 'Encrypted with AES-256 so only you can open it', askPassword);
    box.append(opts);
  });
}
async function builtBytes(list, label) {
  busy(label || 'Preparing…');
  return build(list || S.pages, (i, t) => busy((label || 'Preparing') + ' — page ' + (i + 1) + ' of ' + t));
}
async function saveParts() {
  try {
    const ps = parts(), items = [];
    for (let i = 0; i < ps.length; i++) {
      busy('Building part ' + (i + 1) + ' of ' + ps.length + '…');
      items.push({ name: stem() + '-part-' + (i + 1) + '.pdf', blob: new Blob([await build(ps[i])], { type: 'application/pdf' }) });
    }
    await TF.zipUp(items, stem() + '-parts.zip');
    toast('Split into ' + ps.length + ' PDFs', items.map((x, i) => 'part ' + (i + 1) + ': ' + ps[i].length + 'p').join(' · '));
  } catch (e) { toast('Could not split', e.message, true); }
  idle();
}
async function saveVariant(kind) {
  try {
    const bytes = await builtBytes(null, kind === 'small' ? 'Compressing' : 'Rendering');
    const doc = await TF.pdfjsDoc(bytes);
    if (kind === 'small') {
      const blob = await TF.rasterPdf(doc, { dpi: 110, q: .62, st: { step: (i, n) => busy('Compressing page ' + (i + 1) + ' of ' + n + '…') } });
      dl(blob, stem() + '-small.pdf');
      toast('Saved a smaller PDF', TF.bytes(bytes.length) + ' → ' + TF.bytes(blob.size) + '. For an exact size limit, use Compress PDF.');
    } else {
      const items = [];
      for (let i = 0; i < doc.numPages; i++) {
        busy('Rendering page ' + (i + 1) + ' of ' + doc.numPages + '…');
        const cv = await TF.renderPage(await doc.getPage(i + 1), 150 / 72);
        items.push({ name: stem() + '-' + String(i + 1).padStart(3, '0') + '.jpg', blob: await TF.canvasBlob(cv, 'image/jpeg', .9) });
      }
      if (items.length === 1) dl(items[0].blob, items[0].name); else await TF.zipUp(items, stem() + '-images.zip');
      toast('Saved ' + items.length + (items.length === 1 ? ' image' : ' images'), '150 DPI JPEG');
    }
  } catch (e) { console.error(e); toast('Could not save', e.message, true); }
  idle();
}
function askPassword() {
  TF.modal('Protect with a password', (box, close) => {
    const p1 = TF.pwd('At least 4 characters'), p2 = TF.pwd('Type it again');
    box.append(TF.field('Password', p1), TF.field('Confirm password', p2), TF.note('Nobody can recover this password — keep a note of it.'));
    box.lastChild.style.marginBottom = '6px';
    box.querySelectorAll('.f').forEach(f => { f.style.marginBottom = '12px'; });
    box.append(TF.actions([{ label: 'Save protected PDF', cls: 'pri', icon: 'lock', go: async () => {
      if (p1.value.length < 4) return toast('Too short', 'Use at least 4 characters.', true);
      if (p1.value !== p2.value) return toast('Passwords differ', 'Type the same password in both boxes.', true);
      close();
      try {
        const bytes = await builtBytes(null, 'Encrypting');
        const C = await TF.cantoo(), d = await C.PDFDocument.load(bytes);
        d.encrypt({ userPassword: p1.value, ownerPassword: [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16)).join(''),
          permissions: { printing: 'highResolution', copying: true, modifying: false, annotating: false, fillingForms: true, contentAccessibility: true, documentAssembly: false } });
        dl(new Blob([await d.save()], { type: 'application/pdf' }), stem() + '-protected.pdf');
        toast('Saved with a password', 'AES-256 — it opens only with your password.');
      } catch (e) { toast('Could not encrypt', e.message, true); }
      idle();
    } }, { label: 'Cancel', go: close }]));
    setTimeout(() => p1.focus(), 30);
  });
}

/* ============================================================ wiring */
function init() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  root = document.createElement('div');
  root.innerHTML = HTML;

  $('open').onclick = () => { insertAt = null; $('fPdf').click(); };
  $('fPdf').onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) openFiles(f, insertAt); };
  $('fImg').onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) openFiles(f, insertAt); };
  /* back to the start screen; only ask if there are changes that would be lost */
  $('new').onclick = () => {
    if (undo.length && !confirm('Start over? Your unsaved changes will be lost.')) return;
    resetDoc(); paintStart(); paintGrid(); chrome();
  };
  $('save').onclick = openExport;
  $('tabPages').onclick = () => { S.view = 'pages'; S.active = null; paintGrid(); chrome(); };
  $('tabEdit').onclick = gotoEdit;
  function gotoEdit() {
    if (!S.pages.length) return;
    if (S.sel.size === 1) S.cur = S.pages.findIndex(p => S.sel.has(p.id));
    enterEdit();
  }

  /* grid events */
  $('grid').addEventListener('click', e => {
    const q = e.target.closest('[data-q]'), card = e.target.closest('.e-pg');
    if (!card) return;
    const i = S.pages.findIndex(p => p.id === card.dataset.id);
    if (q && q.dataset.q === 'cut') {
      const id = S.pages[i].id;
      S.cuts.has(id) ? S.cuts.delete(id) : S.cuts.add(id);
      paintGrid(); chrome();
      return;
    }
    if (q) {
      push();
      if (q.dataset.q === 'rot') S.pages[i].rot = norm(S.pages[i].rot + 90);
      if (q.dataset.q === 'dup') S.pages.splice(i + 1, 0, cloneP(S.pages[i]));
      if (q.dataset.q === 'del') { S.sel.delete(S.pages[i].id); S.pages.splice(i, 1); }
      if (!S.pages.length) S.view = 'start';
      paintGrid(); chrome();
      return;
    }
    const id = card.dataset.id;
    if (e.shiftKey && lastPick != null) {
      for (let k = Math.min(lastPick, i); k <= Math.max(lastPick, i); k++) S.sel.add(S.pages[k].id);
    } else if (e.metaKey || e.ctrlKey) { S.sel.has(id) ? S.sel.delete(id) : S.sel.add(id); }
    else { const only = S.sel.size === 1 && S.sel.has(id); S.sel.clear(); if (!only) S.sel.add(id); }
    lastPick = i;
    paintGrid(); chrome();
  });
  $('grid').addEventListener('dblclick', e => {
    const card = e.target.closest('.e-pg');
    if (!card) return;
    S.cur = S.pages.findIndex(p => p.id === card.dataset.id);
    enterEdit();
  });
  let dragId = null;
  $('grid').addEventListener('dragstart', e => {
    const c = e.target.closest('.e-pg');
    if (!c) return;
    dragId = c.dataset.id; c.classList.add('drag');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragId); } catch (x) {}
  });
  $('grid').addEventListener('dragover', e => {
    if (!dragId) return;
    e.preventDefault();
    const c = e.target.closest('.e-pg');
    [...$('grid').children].forEach(x => x.classList.toggle('over', x === c && x.dataset.id !== dragId));
  });
  $('grid').addEventListener('drop', e => {
    if (!dragId) return;
    e.preventDefault(); e.stopPropagation();
    const c = e.target.closest('.e-pg');
    if (c && c.dataset.id !== dragId) {
      push();
      const from = S.pages.findIndex(p => p.id === dragId);
      const moved = S.pages.splice(from, 1)[0];
      const to = S.pages.findIndex(p => p.id === c.dataset.id);
      const r = c.getBoundingClientRect();
      S.pages.splice(to + (e.clientX > r.left + r.width / 2 ? 1 : 0), 0, moved);
    }
    dragId = null; paintGrid(); chrome();
  });
  $('grid').addEventListener('dragend', () => {
    dragId = null;
    [...$('grid').children].forEach(c => c.classList.remove('drag', 'over'));
  });

  /* page ops */
  $('all').onclick = () => { S.pages.forEach(p => S.sel.add(p.id)); paintGrid(); chrome(); };
  $('none').onclick = () => { S.sel.clear(); paintGrid(); chrome(); };
  $('del').onclick = () => {
    push();
    S.pages = S.pages.filter(p => !S.sel.has(p.id));
    S.sel.clear();
    if (!S.pages.length) S.view = 'start';
    S.cur = Math.min(S.cur, Math.max(0, S.pages.length - 1));
    paintGrid(); chrome();
  };
  $('dup').onclick = () => { push(); selIdx().reverse().forEach(i => S.pages.splice(i + 1, 0, cloneP(S.pages[i]))); paintGrid(); chrome(); };
  $('rotl').onclick = () => rot(-90);
  $('rotr').onclick = () => rot(90);
  function rot(d) { push(); selIdx().forEach(i => S.pages[i].rot = norm(S.pages[i].rot + d)); paintGrid(); chrome(); }
  $('left').onclick = () => shift(-1);
  $('right').onclick = () => shift(1);
  function shift(d) {
    const idx = selIdx();
    if (!idx.length) return;
    if (d < 0 && !idx[0]) return;
    if (d > 0 && idx[idx.length - 1] === S.pages.length - 1) return;
    push();
    (d < 0 ? idx : idx.slice().reverse()).forEach(i => {
      const t = S.pages[i]; S.pages[i] = S.pages[i + d]; S.pages[i + d] = t;
    });
    paintGrid(); chrome();
  }
  $('insPdf').onclick = () => { insertAt = S.sel.size ? lastSel() + 1 : S.pages.length; $('fPdf').click(); };
  $('insImg').onclick = () => { insertAt = S.sel.size ? lastSel() + 1 : S.pages.length; $('fImg').click(); };
  $('insBlank').onclick = () => {
    push();
    const at = S.sel.size ? lastSel() + 1 : S.pages.length;
    const ref = S.pages[Math.max(0, at - 1)] || { w: 595, h: 842 };
    const p = blankPage(ref.w, ref.h);
    S.pages.splice(at, 0, p);
    S.sel.clear(); S.sel.add(p.id);
    paintGrid(); chrome();
  };
  $('extract').onclick = () => save(selIdx().map(i => S.pages[i]), '-selection');
  $('undo').onclick = $('undo2').onclick = doUndo;
  $('redo').onclick = doRedo;

  /* edit toolbar */
  $('prev').onclick = () => { if (S.cur) { S.cur--; S.active = null; fitZoom(); drawStage(); } };
  $('next').onclick = () => { if (S.cur < S.pages.length - 1) { S.cur++; S.active = null; fitZoom(); drawStage(); } };
  $('fit').onclick = () => { fitZoom(); drawStage(); };
  $('zin').onclick = () => { S.zoom = Math.min(4, S.zoom * 1.25); drawStage(); };
  $('zout').onclick = () => { S.zoom = Math.max(.1, S.zoom / 1.25); drawStage(); };
  $('toolbtns').addEventListener('click', e => {
    const b = e.target.closest('[data-tool]');
    if (b) setTool(b.dataset.tool);
  });
  $('resign').onclick = async () => {
    const kind = S.tool === 'ini' ? 'ini' : 'sig';
    const id = await ensureSig(kind, true);
    if (id) toast(kind === 'ini' ? 'Initials ready' : 'Signature ready', 'Click on the page to place it.');
  };
  $('iniAll').onclick = async () => {
    const id = await ensureSig('ini');
    if (!id) return;
    push();
    S.pages.forEach(p => placeImage(p, id, dW(p) - 62, dH(p) - 44, 70, 34));
    paintLayer(); paintGrid(); chrome();
    toast('Initialled', 'Added to the bottom-right of all ' + S.pages.length + ' pages. Drag any of them to adjust.');
  };
  $('color').oninput = e => setColor(e.target.value);
  function setColor(c) {
    S.color = c;
    const a = activeAnnot();
    if (a && a.type !== 'white' && a.type !== 'image' && a.type !== 'redact') { a.color = c; push(); paintLayer(); }
  }
  $('size').oninput = e => {
    S.size = Math.max(1, +e.target.value || 14);
    const a = activeAnnot();
    if (!a) return;
    if (a.type === 'text') a.size = S.size;
    else if (a.type === 'pen') a.width = Math.max(.5, S.size / 8 + .5);
    else if (a.type === 'rect') a.width = Math.max(.5, S.size / 10);
    paintLayer();
  };
  $('font').onchange = e => { S.font = e.target.value; const a = activeAnnot(); if (a && a.type === 'text') { a.font = S.font; push(); paintLayer(); } };
  $('bold').onclick = () => { S.bold = !S.bold; $('bold').classList.toggle('on', S.bold); const a = activeAnnot(); if (a && a.type === 'text') { a.bold = S.bold; push(); paintLayer(); } };
  $('ital').onclick = () => { S.ital = !S.ital; $('ital').classList.toggle('on', S.ital); const a = activeAnnot(); if (a && a.type === 'text') { a.ital = S.ital; push(); paintLayer(); } };
  $('delmark').onclick = () => { if (S.active) { push(); removeAnnot(S.active); } };

  /* layer pointer handling */
  let pendingPt = null;
  $('layer').addEventListener('pointerdown', async e => {
    if (e.button) return;
    const hd = e.target.closest('.hdl'), an = e.target.closest('.an'), p = curPage();
    if (hd && an) return startResize(e, an, hd.dataset.h);
    if (an && S.tool === 'select') {
      if (e.target.closest('.body') && S.active === an.dataset.id) return;
      S.active = an.dataset.id;
      paintLayer();
      return startMove(e, S.active);
    }
    if (an && S.tool !== 'select') return;
    const q = ptFrom(e);
    if (S.tool === 'select') { S.active = null; paintLayer(); return; }
    if (S.tool === 'text' || S.tool === 'date') {
      push();
      const date = S.tool === 'date';
      const a = { id: nid(), type: 'text', x: q.x, y: q.y, w: Math.min(date ? 140 : 260, dW(p) - q.x - 6),
        size: S.size, color: date ? '#0F1412' : S.color, font: S.font, bold: date ? false : S.bold, ital: date ? false : S.ital,
        text: date ? new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '' };
      p.annots.push(a); S.active = a.id;
      setTool('select', true); paintLayer(); chrome();
      const b = $('layer').querySelector('[data-id="' + a.id + '"] .body');
      if (b && !date) b.focus();
      return;
    }
    if (S.tool === 'sign' || S.tool === 'ini') {
      const kind = S.tool;
      const id = await ensureSig(kind);
      if (!id) return;
      push();
      const a = kind === 'ini' ? placeImage(p, id, q.x, q.y, 70, 34) : placeImage(p, id, q.x, q.y, 170, 64);
      S.active = a.id;
      paintLayer(); chrome();
      $('statusL').textContent = 'Placed. Drag it to adjust, or switch to Select to resize it.';
      return;
    }
    if (S.tool === 'image') { pendingPt = q; $('fStamp').click(); return; }
    if (S.tool === 'pen') return startPen(e, q);
    if (['hl', 'rect', 'white', 'redact'].indexOf(S.tool) >= 0) return startRect(e, q);
  });
  function grab(e, mv, up) {
    const L = $('layer');
    L.setPointerCapture(e.pointerId);
    const end = () => {
      L.removeEventListener('pointermove', mv);
      L.removeEventListener('pointerup', end);
      try { L.releasePointerCapture(e.pointerId); } catch (x) {}
      up();
    };
    L.addEventListener('pointermove', mv);
    L.addEventListener('pointerup', end);
  }
  function startMove(e, id) {
    const p = curPage(), a = p.annots.find(x => x.id === id);
    if (!a) return;
    const s = ptFrom(e);
    const o = a.type === 'pen' ? { pts: a.pts.map(q => q.slice()) } : { x: a.x, y: a.y };
    let moved = false;
    grab(e, ev => {
      const q = ptFrom(ev), dx = q.x - s.x, dy = q.y - s.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) moved = true;
      if (a.type === 'pen') a.pts = o.pts.map(t => [t[0] + dx, t[1] + dy]);
      else { a.x = o.x + dx; a.y = o.y + dy; }
      paintLayer();
    }, () => { if (moved) push(); });
  }
  function startResize(e, node, kind) {
    e.stopPropagation();
    const p = curPage(), a = p.annots.find(x => x.id === node.dataset.id);
    if (!a) return;
    S.active = a.id;
    const s = ptFrom(e), o = { w: a.w, h: a.h }, ratio = a.type === 'image' ? a.h / a.w : 0;
    grab(e, ev => {
      const q = ptFrom(ev);
      a.w = Math.max(8, o.w + (q.x - s.x));
      if (ratio) a.h = a.w * ratio;
      else if (kind === 'se' && a.h != null) a.h = Math.max(8, o.h + (q.y - s.y));
      paintLayer();
    }, push);
  }
  function startPen(e, q) {
    const p = curPage();
    const a = { id: nid(), type: 'pen', color: S.color, width: Math.max(.5, S.size / 8 + .5), pts: [[q.x, q.y]] };
    grab(e, ev => {
      const t = ptFrom(ev), last = a.pts[a.pts.length - 1];
      if (Math.hypot(t.x - last[0], t.y - last[1]) < 1.2) return;
      a.pts.push([t.x, t.y]);
      if (a.pts.length === 2) p.annots.push(a);
      paintLayer();
    }, () => { if (a.pts.length > 1) push(); paintLayer(); chrome(); });
  }
  function startRect(e, q) {
    const p = curPage(), kind = S.tool;
    const gh = el('div', 'ghost');
    if (kind === 'redact') gh.style.background = 'rgba(0,0,0,.75)';
    $('layer').append(gh);
    let box = null;
    grab(e, ev => {
      const t = ptFrom(ev);
      box = { x: Math.min(q.x, t.x), y: Math.min(q.y, t.y), w: Math.abs(t.x - q.x), h: Math.abs(t.y - q.y) };
      gh.style.left = box.x * S.zoom + 'px'; gh.style.top = box.y * S.zoom + 'px';
      gh.style.width = box.w * S.zoom + 'px'; gh.style.height = box.h * S.zoom + 'px';
    }, () => {
      gh.remove();
      if (box && box.w > 3 && box.h > 3) {
        push();
        const a = { id: nid(), type: kind, x: box.x, y: box.y, w: box.w, h: box.h,
          color: kind === 'white' ? '#ffffff' : kind === 'redact' ? '#000000' : S.color,
          width: Math.max(.5, S.size / 10) };
        p.annots.push(a); S.active = a.id;
        if (kind === 'redact') $('statusL').textContent =
          'Redaction queued. When you save, this page is re-rendered so the text under the box is destroyed, not hidden.';
      }
      paintLayer(); chrome();
    });
  }
  $('fStamp').onchange = async e => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f || !pendingPt) return;
    try {
      busy('Reading ' + f.name);
      const id = await addImage(f);
      idle();
      const im = IMG.get(id), p = curPage();
      const b = TF.fit(im.w, im.h, dW(p) * .45, dH(p) * .45);
      push();
      p.annots.push({ id: nid(), type: 'image', imgId: id,
        x: Math.max(0, pendingPt.x - b.w / 2), y: Math.max(0, pendingPt.y - b.h / 2), w: b.w, h: b.h });
      setTool('select'); paintLayer(); chrome();
    } catch (x) { idle(); toast('Could not read that image', x.message, true); }
  };

  /* keyboard — only while the editor is on screen */
  document.addEventListener('keydown', e => {
    if (!root.isConnected || !root.offsetParent || document.querySelector('.modal')) return;
    const typing = e.target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName);
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); save(S.pages, '-edited'); return; }
    if (typing) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (S.view === 'edit' && S.active) { e.preventDefault(); push(); removeAnnot(S.active); }
      else if (S.view === 'pages' && S.sel.size) { e.preventDefault(); $('del').click(); }
      return;
    }
    if (S.view === 'edit') {
      const map = { v: 'select', r: 'retext', t: 'text', s: 'sign', i: 'ini', d: 'pen', h: 'hl', b: 'rect', w: 'white', x: 'redact' };
      const k = e.key.toLowerCase();
      if (map[k] && !mod) return setTool(map[k]);
      if (e.key === 'Escape') { S.active = null; paintLayer(); }
      if (e.key === 'ArrowLeft') $('prev').click();
      if (e.key === 'ArrowRight') $('next').click();
    }
  });
  window.addEventListener('resize', () => { if (root.isConnected && S.view === 'edit') { fitZoom(); drawStage(); } });

  setTool('select');
  chrome();
  ready = true;
}

function mountEditor(m, mode) {
  if (!ready) init();
  if (TF.peekPending('pdf-editor')) resetDoc();          /* a file dropped on the home page starts a fresh document */
  S.mode = mode || null;
  S.intent = mode === 'sign' ? 'sign' : null;
  m.append(root);
  paintStart();
  if (S.intent && S.pages.length) { S.intent = null; enterEdit('sign'); }
  else if (S.view === 'edit') { fitZoom(); drawStage(); }
  else if (S.view === 'pages') paintGrid();
  chrome();
}

TF.reg({
  id: 'pdf-editor', cat: 'doc', icon: 'edit', name: 'PDF studio', tag: 'Flagship',
  desc: 'Edit, sign, merge, split, rotate and reorder — visually.',
  long: 'One workspace for everything you do to a PDF. Drag pages into order, merge files (colour-coded so you can see what came from where), cut it into parts with ✂, rotate, delete, sign, fill, write in any language, replace existing text and redact properly. Save as one PDF, separate parts, a smaller file, images or password-protected.',
  keys: 'pdf editor annotate sign write draw organise organize delete reorder redact form fill arabic merge split rotate',
  mount(m) { mountEditor(m, null); }
});
/* task pages: each opens the studio set up for that job */
const task = (id, icon, name, task, desc, long, keys, mode, tag) => TF.reg({ id: id, cat: 'doc', icon: icon, name: name, task: task, desc: desc,
  long: long, keys: keys, tag: tag, studio: 'pdf-editor', mount(m) { mountEditor(m, mode); } });
task('merge-pdf', 'merge', 'Merge PDF', 'Merge', 'Combine PDFs and drag the pages into order.',
  'Drop two or more PDFs and see every page as a thumbnail, colour-coded by file. Drag pages into any order — even mixing pages from different files — then save one PDF. No file or page limit.',
  'combine join append merge', 'merge');
task('split-pdf', 'split', 'Split PDF', 'Split', 'Click ✂ between pages to cut a PDF into parts.',
  'See every page, click the ✂ between any two pages to cut there, and save each part as its own PDF. Or split after every page in one click.',
  'extract separate cut divide pages split', 'split');
task('rotate-pdf', 'rotate', 'Rotate PDF', 'Rotate', 'Turn pages the right way up — see them as you go.',
  'See every page as a thumbnail and turn just the ones that are sideways, or all of them at once. Lossless: text stays sharp and selectable.',
  'turn sideways landscape orientation upside down rotate', 'rotate');
task('images-to-pdf', 'file', 'Images to PDF', 'Images → PDF', 'Turn photos and scans into one PDF.',
  'Drop JPG, PNG, WebP or iPhone HEIC photos; each becomes a page you can drag into order, rotate or delete, then save as a single PDF.',
  'jpg png heic photo scan combine images to pdf', 'images');
task('sign-pdf', 'sign', 'Sign PDF', 'Sign', 'Draw, type or upload a signature and place it.',
  'Sign a contract or form without printing it. Draw your signature with a mouse or finger, type it in a handwriting style, or snap a photo of it on paper. Add initials to every page and today’s date in one click. Your signature can be remembered on this device — never on a server.',
  'signature esign e-sign docusign initials date contract agreement', 'sign', 'Popular');
})();
