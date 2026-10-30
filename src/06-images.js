/* ============================================================ image tools */
(function () {
'use strict';
const { h, esc, ico, toast, bytes, dl, base, zipUp, isImg, decodeImage, canvasBlob, h2c,
  drawTo, fit, nextFrame, dropzone, fileList, stage, field, sel, num, txt, seg, check,
  panel, actions, note, reg } = TF;

const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/* multi-image picker shared by the batch tools */
function imagePicker(m, o) {
  const files = [];
  const prog = h('div'), list = h('div');
  const st2 = stage(prog);
  const dz = dropzone({
    icon: 'image', title: o.title || 'Drop images here',
    sub: o.sub || 'JPEG, PNG, WebP or iPhone HEIC' + (o.multiple === false ? '' : ' — several at once is fine'),
    accept: 'image/*,.heic,.heif', multiple: o.multiple !== false,
    onFiles: async fs => {
      st2.busy('Reading…');
      if (o.multiple === false) files.length = 0;
      for (let i = 0; i < fs.length; i++) {
        st2.step(i, fs.length, 'Reading ' + fs[i].name);
        await nextFrame();
        if (!isImg(fs[i])) { toast('Skipped ' + fs[i].name, 'Not an image.', true); continue; }
        try {
          const d = await decodeImage(fs[i], t => st2.step(i, fs.length, t));
          files.push({ name: fs[i].name, size: fs[i].size, dec: d, thumb: d.url });
        } catch (e) { toast('Skipped ' + fs[i].name, e.message, true); }
      }
      st2.clear();
      o.onChange(files, list);
    }
  });
  m.append(dz, prog, list);
  return { files: files, list: list };
}
function batchList(files, onChange) {
  return fileList(files, { thumb: true, onChange: onChange,
    meta: f => f.dec.w + '×' + f.dec.h + ' · ' + bytes(f.size) });
}

/* ============================================================ crop + passport */
const CROPS = [
  ['free', 'Free', 0, null], ['1:1', 'Square 1:1', 1, null], ['4:3', 'Landscape 4:3', 4 / 3, null],
  ['3:4', 'Portrait 3:4', 3 / 4, null], ['16:9', 'Wide 16:9', 16 / 9, null], ['9:16', 'Story 9:16', 9 / 16, null],
  ['us', 'US passport — 2×2 in', 1, [600, 600]],
  ['eu', 'UK / EU / Schengen — 35×45 mm', 35 / 45, [413, 531]],
  ['in', 'India — 35×45 mm', 35 / 45, [413, 531]],
  ['ca', 'Canada — 50×70 mm', 50 / 70, [591, 827]],
  ['cn', 'China — 33×48 mm', 33 / 48, [390, 567]]
];

/* ============================================================ photo & signature for forms */
/* set the DPI recorded in a canvas-made JPEG's JFIF header */
function stampDpi(b, dpi) {
  if (dpi && b[2] === 0xFF && b[3] === 0xE0 && String.fromCharCode(b[6], b[7], b[8], b[9]) === 'JFIF') {
    b[13] = 1; b[14] = dpi >> 8; b[15] = dpi & 255; b[16] = dpi >> 8; b[17] = dpi & 255;
  }
  return b;
}
/* grow a JPEG to a minimum size with comment segments — viewers ignore them */
function padJpeg(b, target) {
  let need = target - b.length;
  if (need <= 0) return b;
  const at = b[2] === 0xFF && b[3] === 0xE0 ? 4 + ((b[4] << 8) | b[5]) : 2;
  const segs = [];
  while (need > 0) {
    const n = Math.max(1, Math.min(65000, need - 4)), s = new Uint8Array(n + 4);
    s[0] = 0xFF; s[1] = 0xFE; s[2] = (n + 2) >> 8; s[3] = (n + 2) & 255;
    s.fill(0x20, 4);
    segs.push(s); need -= s.length;
  }
  const out = new Uint8Array(b.length + segs.reduce((a, s) => a + s.length, 0));
  out.set(b.subarray(0, at), 0);
  let o = at;
  segs.forEach(s => { out.set(s, o); o += s.length; });
  out.set(b.subarray(at), o);
  return out;
}
const FORMP = [
  ['p200', 'Photo — 200 × 230 px, 20–50 KB', 200, 230, 20, 50, 200, 'photo'],
  ['p3545', 'Photo — 35 × 45 mm (413 × 531 px), up to 100 KB', 413, 531, 0, 100, 300, 'photo'],
  ['p2x2', 'Photo — 2 × 2 in (600 × 600 px), up to 240 KB', 600, 600, 0, 240, 300, 'photo'],
  ['p350', 'Photo — 350 × 450 px, 10–100 KB', 350, 450, 10, 100, 200, 'photo'],
  ['s140', 'Signature — 140 × 60 px, 10–20 KB', 140, 60, 10, 20, 200, 'sig'],
  ['s350', 'Signature — 350 × 150 px, up to 50 KB', 350, 150, 0, 50, 200, 'sig'],
  ['t240', 'Thumb impression — 240 × 240 px, 20–50 KB', 240, 240, 20, 50, 200, 'sig'],
  ['custom', 'Custom…', 300, 400, 0, 100, 200, 'photo']
];
reg({
  id: 'form-photo', cat: 'img', icon: 'idcard', name: 'Photo & signature for forms', tag: 'Exams & visas',
  desc: 'Exact pixels, exact KB range — what portals demand.',
  long: 'Online applications — exams, visas, jobs, government portals — reject photos and signatures that are not exactly the right pixel size and within a narrow file-size window, like “20 to 50 KB”. Pick a preset or type the numbers from your form; this crops, resizes, sets the DPI and hits the size range, even padding a file that is too small.',
  keys: 'exam application form photo signature kb size 20kb 50kb visa government portal upload resize passport thumb',
  mount(m) {
    const holder = h('div');
    imagePicker(m, { multiple: false, title: 'Drop your photo or signature', sub: 'a phone photo is fine', onChange: files => paint(files) });
    m.append(holder);
    function paint(files) {
      holder.innerHTML = '';
      if (!files.length) return;
      const dec = files[files.length - 1].dec;
      const preset = sel(FORMP.map(p => [p[0], p[1]]), TF.store.get('formPreset', 'p200'));
      const W = num(200, 20, 4000), H = num(230, 20, 4000), mn = num(20, 0, 5000), mx = num(50, 1, 10000), dpi = num(200, 72, 1200);
      const mode = sel([['fill', 'Crop to fill'], ['fit', 'Fit inside, white border']], 'fill');
      const zoom = TF.range(100, 300, 100), ox = TF.range(-100, 100, 0), oy = TF.range(-100, 100, 0);
      const clean = check('Clean up the paper (whiter background, darker ink)', false);
      const gray = check('Black and white', false);
      const p1 = panel('Requirements', [field('Preset', preset), field('Width (px)', W), field('Height (px)', H),
        field('Minimum size (KB)', mn, '0 if there is no minimum'), field('Maximum size (KB)', mx), field('DPI', dpi, 'Some forms check this too')]);
      const p2 = panel('Framing', [field('Fit', mode), field('Zoom', zoom), field('Left ↔ right', ox), field('Up ↕ down', oy)]);
      const ex = h('div', 'chks'); ex.append(clean, gray); p2.append(ex);
      const pv = h('div', 'panel');
      pv.style.textAlign = 'center';
      const cvHold = h('div'), info = h('div', 'note');
      pv.append(h('h4', null, 'Result'), cvHold, info);
      holder.append(p1, p2, pv, actions([{ label: 'Download JPEG', cls: 'pri', icon: 'download', go: save }]));
      let last = null, tok = 0;
      function applyPreset() {
        const p = FORMP.find(x => x[0] === preset.value);
        TF.store.set('formPreset', p[0]);
        if (p[0] !== 'custom') { W.value = p[2]; H.value = p[3]; mn.value = p[4]; mx.value = p[5]; dpi.value = p[6]; }
        if (p[7] === 'sig') { clean.input.checked = true; mode.value = 'fit'; } else { clean.input.checked = false; mode.value = 'fill'; }
        go();
      }
      preset.onchange = applyPreset;
      [W, H, mn, mx, dpi, mode, zoom, ox, oy, clean.input, gray.input].forEach(c => { c.oninput = c.onchange = go; });
      [W, H, mn, mx, dpi].forEach(c => c.addEventListener('input', () => { preset.value = 'custom'; }));
      applyPreset();
      function draw() {
        const w = Math.max(1, +W.value | 0), hh = Math.max(1, +H.value | 0), c = h2c(w, hh);
        c.ctx.fillStyle = '#fff'; c.ctx.fillRect(0, 0, w, hh);
        const z = (+zoom.value || 100) / 100;
        let k = mode.value === 'fill' ? Math.max(w / dec.w, hh / dec.h) : Math.min(w / dec.w, hh / dec.h);
        k *= z;
        const dw = dec.w * k, dh = dec.h * k;
        const sx = (w - dw) / 2 + (-(+ox.value) / 100) * Math.abs(dw - w) / 2, sy = (hh - dh) / 2 + (-(+oy.value) / 100) * Math.abs(dh - hh) / 2;
        c.ctx.drawImage(dec.img, sx, sy, dw, dh);
        if (clean.input.checked || gray.input.checked) {
          const d = c.ctx.getImageData(0, 0, w, hh), px = d.data;
          for (let i = 0; i < px.length; i += 4) {
            if (gray.input.checked) { const l = px[i] * .3 + px[i + 1] * .59 + px[i + 2] * .11; px[i] = px[i + 1] = px[i + 2] = l; }
            if (clean.input.checked) for (let j = 0; j < 3; j++) px[i + j] = Math.max(0, Math.min(255, (px[i + j] - 40) * 1.55));
          }
          c.ctx.putImageData(d, 0, 0);
        }
        return c.cv;
      }
      async function encode(cv) {
        const max = (+mx.value || 50) * 1024, min = (+mn.value || 0) * 1024, D = +dpi.value || 0;
        const enc = async q => stampDpi(new Uint8Array(await (await canvasBlob(cv, 'image/jpeg', q)).arrayBuffer()), D);
        let best = await enc(.98), q = .98, tooBig = false, padded = false;
        if (best.length > max) {
          let lo = .03, hi = .98, found = null, fq = 0;
          for (let i = 0; i < 9; i++) {
            const mid = (lo + hi) / 2, b = await enc(mid);
            if (b.length <= max) { found = b; fq = mid; lo = mid; } else hi = mid;
          }
          if (found) { best = found; q = fq; } else { best = await enc(.03); q = .03; tooBig = true; }
        }
        if (min && best.length < min) { best = padJpeg(best, min + 256); padded = true; }
        return { bytes: best, q: q, tooBig: tooBig, padded: padded };
      }
      async function go() {
        const my = ++tok;
        const cv = draw();
        const r = await encode(cv);
        if (my !== tok) return;
        last = r;
        cvHold.innerHTML = '';
        const show = h('img');
        show.src = URL.createObjectURL(new Blob([r.bytes], { type: 'image/jpeg' }));
        const sc = Math.min(3, 260 / Math.max(cv.width, cv.height));
        show.style.cssText = 'width:' + Math.round(cv.width * sc) + 'px;max-width:100%;border:1px solid var(--line);border-radius:6px;image-rendering:auto';
        cvHold.append(show);
        const kb = (r.bytes.length / 1024).toFixed(1);
        info.innerHTML = '<b>' + cv.width + ' × ' + cv.height + ' px · ' + kb + ' KB · ' + (+dpi.value || 72) + ' DPI</b>' +
          (r.tooBig ? '<br>Cannot get under ' + mx.value + ' KB at this pixel size — this is the smallest possible.' : '') +
          (r.padded ? '<br>The image was naturally smaller than ' + mn.value + ' KB, so the file was padded to meet the minimum. The picture itself is unchanged.' : '') +
          '<br>Always double-check the numbers against your form’s instructions.';
        /* the allowed size window as a green band, with this file as a marker */
        const lo = (+mn.value || 0) * 1024, hi = (+mx.value || 50) * 1024, top = Math.max(hi * 1.3, r.bytes.length * 1.1);
        const okSize = r.bytes.length >= lo && r.bytes.length <= hi;
        const band = h('div', 'gauge');
        band.innerHTML = '<div class="g-row"><span class="g-l">Size</span><span class="g-bar"><b style="position:absolute;top:0;bottom:0;border-radius:99px;left:' + (lo / top * 100) + '%;width:' +
          ((hi - lo) / top * 100) + '%;background:var(--acc-soft);box-shadow:inset 0 0 0 1.5px var(--acc)"></b><i class="' + (okSize ? 'ga' : 'gx') + '" style="left:' + (r.bytes.length / top * 100) + '%;width:4px;margin-left:-2px"></i></span><span class="g-v">' + kb + ' KB</span></div>' +
          '<div class="g-note">Green zone = allowed ' + (+mn.value || 0) + '–' + (+mx.value || 50) + ' KB</div>';
        info.append(band);
      }
      function save() {
        if (!last) return;
        dl(new Blob([last.bytes], { type: 'image/jpeg' }), base(dec.name) + '-' + W.value + 'x' + H.value + '.jpg');
      }
    }
  }
});

/* ============================================================ signature extractor */
reg({
  id: 'signature', cat: 'img', icon: 'sign', name: 'Signature cutout',
  desc: 'Photo of a signature → clean transparent PNG.',
  long: 'Sign a sheet of paper, photograph it, and get back a transparent PNG with the paper removed — ready to drop into a contract. Normally a manual job in Photoshop.',
  keys: 'signature transparent background paper scan sign png',
  mount(m) {
    const holder = h('div');
    imagePicker(m, { multiple: false, title: 'Drop a photo of your signature',
      sub: 'dark ink on white paper works best', onChange: paint });
    m.append(holder);
    let dec = null, out = null;
    function paint(files) {
      holder.innerHTML = '';
      if (!files.length) return;
      dec = files[files.length - 1].dec;
      const th = TF.range(20, 240, 150);
      const col = TF.color('#0B2A6B');
      const trim = check('Trim the empty space around the signature', true);
      const p = h('div', 'panel');
      p.append(h('h4', null, 'Ink'));
      const g = h('div', 'fields');
      g.append(field('Sensitivity', th, 'Slide until the paper disappears but the ink stays solid'),
        field('Ink colour', col));
      p.append(g, trim);
      const prev = h('div', 'checker');
      prev.style.cssText = 'margin-top:16px;border-radius:12px;border:1px solid var(--line);padding:14px;text-align:center';
      const cvHold = h('div');
      prev.append(cvHold);
      holder.append(p, prev, actions([{ label: 'Download transparent PNG', cls: 'pri', icon: 'download',
        go: () => out && dl(out, base(dec.name) + '-signature.png') }]));
      const redraw = () => build(+th.value, col.value, trim.input.checked, cvHold);
      th.oninput = redraw; col.oninput = redraw; trim.input.onchange = redraw;
      redraw();
    }
    async function build(thr, colour, doTrim, hold) {
      const c = h2c(dec.w, dec.h);
      c.ctx.drawImage(dec.img, 0, 0);
      const d = c.ctx.getImageData(0, 0, c.cv.width, c.cv.height);
      const px = d.data;
      const r0 = parseInt(colour.slice(1, 3), 16), g0 = parseInt(colour.slice(3, 5), 16), b0 = parseInt(colour.slice(5, 7), 16);
      for (let i = 0; i < px.length; i += 4) {
        const lum = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
        let a = (thr - lum) / (thr * 0.55);
        a = a < 0 ? 0 : a > 1 ? 1 : a;
        px[i] = r0; px[i + 1] = g0; px[i + 2] = b0; px[i + 3] = Math.round(a * 255);
      }
      c.ctx.putImageData(d, 0, 0);
      const final = (doTrim && TF.trimCanvas(c.cv, .01)) || c.cv;
      out = await canvasBlob(final, 'image/png');
      hold.innerHTML = '';
      const show = h('img');
      show.src = URL.createObjectURL(out);
      show.style.cssText = 'max-width:100%;max-height:230px';
      hold.append(show);
    }
  }
});

/* ============================================================ background remover */
const IMGLY = 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm';
let bgMod = null;
const bgLib = () => bgMod || (bgMod = import(IMGLY).catch(e => {
  bgMod = null;
  throw new Error('The background-removal engine did not download. Check your connection and try again.');
}));

/* ============================================================ image studio */
/* One workspace for crop, resize, blur, background removal, convert and compress.
   Every image keeps its own crop, blur boxes, rotation and cut-out; the Save tab applies
   format and size settings to all of them and shows the result before you download. */
const TABS = [['crop', 'crop', 'Crop'], ['resize', 'resize', 'Resize'], ['blur', 'blur', 'Blur & hide'], ['bg', 'wand', 'Background'], ['save', 'download', 'Save']];
function blurBoxes(ctx, boxes, scale, style, strength) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  boxes.forEach(b0 => {
    const b = { x: Math.max(0, b0.x * scale), y: Math.max(0, b0.y * scale), w: b0.w * scale, h: b0.h * scale };
    b.w = Math.min(b.w, W - b.x); b.h = Math.min(b.h, H - b.y);
    if (b.w < 1 || b.h < 1) return;
    if (style === 'black') { ctx.fillStyle = '#000'; ctx.fillRect(b.x, b.y, b.w, b.h); return; }
    const block = Math.max(3, Math.round(Math.max(W, H) * strength / 1400 + 2));
    const sw = Math.max(1, Math.ceil(b.w / block)), sh = Math.max(1, Math.ceil(b.h / block)), small = h2c(sw, sh);
    small.ctx.drawImage(ctx.canvas, b.x, b.y, b.w, b.h, 0, 0, sw, sh);
    ctx.save();
    if (style === 'pixel') { ctx.imageSmoothingEnabled = false; ctx.drawImage(small.cv, 0, 0, sw, sh, b.x, b.y, b.w, b.h); }
    else {
      const mid = h2c(sw * 2, sh * 2); mid.ctx.drawImage(small.cv, 0, 0, mid.cv.width, mid.cv.height);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(mid.cv, 0, 0, mid.cv.width, mid.cv.height, b.x, b.y, b.w, b.h);
    }
    ctx.restore();
  });
}
function mountImageStudio(m, tab0, pre) {
  pre = pre || {};
  const items = [];
  let cur = -1, tab = tab0 || 'crop';
  const X = { fmt: pre.fmt || 'jpg', q: 90, target: pre.target ? +pre.target : 0, rs: 'none', rw: 1600, rh: 1600, pct: 50,
    blur: 'pixel', strength: 45, bg: 'none', bgc: '#FFFFFF', model: TF.store.get('bgModel', 'isnet_fp16') };
  const dz = dropzone({ icon: 'image', title: 'Drop photos or screenshots', sub: 'JPG, PNG, WebP or iPhone HEIC — several at once is fine',
    accept: 'image/*,.heic,.heif', multiple: true, onFiles: add });
  const work = h('div'); work.hidden = true;
  m.append(dz, work);
  const st = stage(m);

  /* ---------- layout ---------- */
  const strip = h('div', 'thumbs');
  strip.style.gridTemplateColumns = 'repeat(auto-fill,minmax(78px,1fr))';
  const tools = h('div', 'row'); tools.style.marginTop = '12px';
  const tabsEl = h('div', 'tabs'); tabsEl.setAttribute('role', 'tablist');
  TABS.forEach(t => {
    const b = h('button', null, ico(t[1]) + '<span>' + esc(t[2]) + '</span>');
    b.type = 'button'; b.dataset.t = t[0]; b.setAttribute('role', 'tab');
    b.onclick = () => { tab = t[0]; paintTabs(); paintPanel(); draw(); };
    tabsEl.append(b);
  });
  const stageEl = h('div', 'stage-pv'), cv = h('canvas');
  stageEl.append(cv);
  const side = h('div', 'tabpanel');
  const two = h('div', 'split2');
  const left = h('div', 'stick'); left.append(stageEl);
  two.append(left, side);
  work.append(strip, tools, tabsEl, two);
  tools.append(...actions([
    { label: '↺', go: () => rot(-90) }, { label: '↻', go: () => rot(90) },
    { label: '+ Add photos', go: () => dz.input.click() },
    { label: 'Remove this one', cls: 'dgr', go: () => { items.splice(cur, 1); cur = Math.min(cur, items.length - 1); if (!items.length) { work.hidden = true; dz.hidden = false; } else paint(); } }
  ]).children);
  tools.children[0].setAttribute('aria-label', 'Rotate left'); tools.children[1].setAttribute('aria-label', 'Rotate right');

  async function add(fs) {
    st.busy('Reading…');
    for (let i = 0; i < fs.length; i++) {
      if (!isImg(fs[i])) { toast('Skipped ' + fs[i].name, 'Not an image.', true); continue; }
      st.step(i, fs.length, 'Reading ' + fs[i].name);
      try { const d = await decodeImage(fs[i], t => st.step(i, fs.length, t)); items.push({ dec: d, name: fs[i].name, size: fs[i].size, crop: null, boxes: [], cut: null, rot: 0 }); }
      catch (e) { toast('Skipped ' + fs[i].name, e.message, true); }
    }
    st.clear();
    if (!items.length) return;
    if (cur < 0) cur = 0;
    dz.hidden = true; work.hidden = false;
    /* came here to crop: start every new photo with a crop box already on it */
    if (pre.autoCrop) items.forEach(item => { if (!item.crop) { const b = base(item); item.crop = { key: 'free', ratio: 0, out: null, x: b.width * .1, y: b.height * .1, w: b.width * .8, h: b.height * .8 }; } });
    paint();
  }
  const it = () => items[cur];
  /* the image as edited so far, before crop: rotation + cut-out + chosen background */
  function base(item) {
    if (item._base && item._baseKey === item.rot + '|' + !!item.cut + '|' + X.bg + X.bgc) return item._base;
    const src = item.cut ? item.cut.img : item.dec.img, w = src.naturalWidth, hh = src.naturalHeight;
    const sw = item.rot % 180 ? hh : w, sh = item.rot % 180 ? w : hh, c = h2c(sw, sh);
    if (item.cut && X.bg !== 'none') { c.ctx.fillStyle = X.bg === 'custom' ? X.bgc : X.bg; c.ctx.fillRect(0, 0, sw, sh); }
    c.ctx.translate(sw / 2, sh / 2); c.ctx.rotate(item.rot * Math.PI / 180); c.ctx.drawImage(src, -w / 2, -hh / 2);
    item._base = c.cv; item._baseKey = item.rot + '|' + !!item.cut + '|' + X.bg + X.bgc;
    return c.cv;
  }
  /* the untouched photo, turned the same way — the “before” side of the comparison */
  function rotated(item) {
    const w = item.dec.w, hh = item.dec.h, sw = item.rot % 180 ? hh : w, sh = item.rot % 180 ? w : hh, c = h2c(sw, sh);
    c.ctx.translate(sw / 2, sh / 2); c.ctx.rotate(item.rot * Math.PI / 180); c.ctx.drawImage(item.dec.img, -w / 2, -hh / 2);
    return c.cv;
  }
  function rot(d) {
    const item = it(); if (!item) return;
    item.rot = ((item.rot + d) % 360 + 360) % 360; item.crop = null; item.boxes = [];
    paint();
  }
  function paint() { paintStrip(); paintTabs(); paintPanel(); draw(); }
  function paintStrip() {
    strip.innerHTML = '';
    items.forEach((item, i) => {
      const b = h('button', 't' + (i === cur ? ' sel' : ''));
      b.type = 'button'; b.setAttribute('aria-label', item.name); b.setAttribute('aria-pressed', String(i === cur));
      const im = h('img'); im.src = item.dec.url; im.alt = ''; im.width = 78; im.height = 78; im.style.objectFit = 'cover';
      b.append(im, h('span', null, String(i + 1)));
      b.onclick = () => { cur = i; paint(); };
      strip.append(b);
    });
    strip.hidden = items.length < 2;
  }
  function paintTabs() { [...tabsEl.children].forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === tab))); }

  /* ---------- the stage: the image with this tab's overlay ---------- */
  let k = 1, overlay = null;
  function draw() {
    const item = it(); if (!item) return;
    const b = base(item), W = Math.min(900, b.width);
    k = W / b.width;
    cv.width = Math.round(b.width * k); cv.height = Math.round(b.height * k);
    const x = cv.getContext('2d');
    x.clearRect(0, 0, cv.width, cv.height);
    x.drawImage(b, 0, 0, cv.width, cv.height);
    blurBoxes(x, item.boxes, k, X.blur, X.strength);
    stageEl.querySelectorAll('.blurbox').forEach(n => n.remove());
    if (overlay) overlay.remove();
    overlay = null;
    stageEl.style.cursor = tab === 'blur' ? 'crosshair' : '';
    if (tab === 'crop') cropOverlay(item, b);
    if (tab === 'blur') item.boxes.forEach((bx, i) => {
      const d = h('button'); d.type = 'button';
      d.style.cssText = 'position:absolute;border:1.5px dashed #DDF95C;background:transparent;left:' + bx.x / b.width * 100 + '%;top:' + bx.y / b.height * 100 + '%;width:' + bx.w / b.width * 100 + '%;height:' + bx.h / b.height * 100 + '%';
      d.setAttribute('aria-label', 'Hidden area ' + (i + 1) + ' — press to remove it'); d.title = 'Click to remove';
      d.onclick = e => { e.stopPropagation(); item.boxes.splice(i, 1); draw(); paintPanel(); };
      d.classList.add('blurbox'); stageEl.append(d);
    });
  }
  function cropOverlay(item, b) {
    const box = h('div', 'crop-box');
    box.tabIndex = 0; box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Crop area — drag to move, drag corners to resize, or use the arrow keys (shift for bigger steps)');
    ['tl', 'tr', 'bl', 'br'].forEach(c => { const kk = h('span', 'k ' + c); kk.dataset.c = c; box.append(kk); });
    stageEl.append(box); overlay = box;
    if (!item.crop) { box.hidden = true; return; }
    const place = () => {
      const c = item.crop;
      Object.assign(box.style, { left: c.x / b.width * 100 + '%', top: c.y / b.height * 100 + '%', width: c.w / b.width * 100 + '%', height: c.h / b.height * 100 + '%' });
      const out = c.out ? c.out[0] + ' × ' + c.out[1] : Math.round(c.w) + ' × ' + Math.round(c.h);
      const r = side.querySelector('.cropsize'); if (r) r.textContent = out + ' px';
    };
    const clamp = c => {
      c.w = Math.max(16, Math.min(c.w, b.width)); c.h = Math.max(16, Math.min(c.h, b.height));
      if (c.ratio) { if (c.w / c.ratio > b.height) { c.h = b.height; c.w = c.h * c.ratio; } c.h = c.w / c.ratio; }
      c.x = Math.max(0, Math.min(c.x, b.width - c.w)); c.y = Math.max(0, Math.min(c.y, b.height - c.h));
    };
    box.addEventListener('pointerdown', e => {
      e.preventDefault(); box.setPointerCapture(e.pointerId);
      const c = item.crop, o = Object.assign({}, c), sx = e.clientX, sy = e.clientY, kind = e.target.dataset.c || 'move';
      const scale = stageEl.getBoundingClientRect().width / b.width;
      const mv = ev => {
        const dx = (ev.clientX - sx) / scale, dy = (ev.clientY - sy) / scale;
        if (kind === 'move') { c.x = o.x + dx; c.y = o.y + dy; }
        else {
          const right = kind[1] === 'r', bottom = kind[0] === 'b';
          c.w = Math.max(16, o.w + (right ? dx : -dx));
          c.h = c.ratio ? c.w / c.ratio : Math.max(16, o.h + (bottom ? dy : -dy));
          c.x = right ? o.x : o.x + o.w - c.w; c.y = bottom ? o.y : o.y + o.h - c.h;
        }
        clamp(c); place();
      };
      const up = () => { box.removeEventListener('pointermove', mv); box.removeEventListener('pointerup', up); };
      box.addEventListener('pointermove', mv); box.addEventListener('pointerup', up);
    });
    box.addEventListener('keydown', e => {
      const map = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }, d = map[e.key];
      if (!d) return;
      e.preventDefault();
      const step = (e.shiftKey ? 40 : 6) / k, c = item.crop;
      if (e.altKey) { c.w += d[0] * step; if (!c.ratio) c.h += d[1] * step; } else { c.x += d[0] * step; c.y += d[1] * step; }
      clamp(c); place();
    });
    place();
  }
  /* blur tab: drag on the picture to hide an area */
  stageEl.addEventListener('pointerdown', e => {
    if (tab !== 'blur' || e.target.closest('.blurbox')) return;
    e.preventDefault(); stageEl.setPointerCapture(e.pointerId);
    const r = stageEl.getBoundingClientRect(), b = base(it()), s = b.width / r.width;
    const sx = (e.clientX - r.left) * s, sy = (e.clientY - r.top) * s;
    const gh = h('div'); gh.style.cssText = 'position:absolute;border:1.5px dashed #DDF95C;background:rgba(221,249,92,.15);pointer-events:none';
    stageEl.append(gh);
    let bx = null;
    const mv = ev => {
      const x = (ev.clientX - r.left) * s, y = (ev.clientY - r.top) * s;
      bx = { x: Math.max(0, Math.min(sx, x)), y: Math.max(0, Math.min(sy, y)), w: Math.abs(x - sx), h: Math.abs(y - sy) };
      Object.assign(gh.style, { left: bx.x / b.width * 100 + '%', top: bx.y / b.height * 100 + '%', width: bx.w / b.width * 100 + '%', height: bx.h / b.height * 100 + '%' });
    };
    const up = () => {
      stageEl.removeEventListener('pointermove', mv); stageEl.removeEventListener('pointerup', up); gh.remove();
      if (bx && bx.w > 6 && bx.h > 6) { it().boxes.push(bx); draw(); paintPanel(); }
    };
    stageEl.addEventListener('pointermove', mv); stageEl.addEventListener('pointerup', up);
  });

  /* ---------- the side panel for each tab ---------- */
  function paintPanel() {
    side.innerHTML = '';
    const item = it(); if (!item) return;
    const b = base(item);
    if (tab === 'crop') {
      const chips = h('div', 'chips'); chips.style.padding = '0';
      CROPS.forEach(c => {
        const on = c[0] === 'free' ? !item.crop || !item.crop.ratio && !item.crop.out : item.crop && item.crop.key === c[0];
        const a = h('button', 'chip', esc(c[1])); a.type = 'button'; a.setAttribute('aria-pressed', String(!!on));
        if (on) { a.style.borderColor = 'var(--acc)'; a.style.color = 'var(--acc-dk)'; }
        a.onclick = () => setCrop(item, b, c); chips.append(a);
      });
      side.append(h('h4', null, 'Crop to'), chips);
      if (item.crop) {
        side.append(h('p', 'note', 'Output: <b class="cropsize"></b>' + (item.crop.out ? ' — 300 DPI, ready to print' : '')),
          actions([{ label: 'Use the whole picture', go: () => { item.crop = null; draw(); paintPanel(); } }]));
        side.append(h('p', 'note', 'Drag the box to move it and the white corners to resize. Keyboard: arrows move it, Alt+arrows resize.'));
      } else side.append(h('p', 'note', 'Pick a shape above, then drag the box on the picture.'));
    } else if (tab === 'resize') {
      const how = TF.choice([['none', 'image', 'Keep size', b.width + ' × ' + b.height + ' px'], ['fit', 'resize', 'Fit in a box', 'Keeps the shape'], ['pct', 'compress', 'Percentage', 'e.g. half size'], ['exact', 'crop', 'Exact pixels', 'May stretch']], X.rs, v => { X.rs = v; paintPanel(); });
      how.classList.add('compact');
      side.append(h('h4', null, 'New size — for every photo'), how);
      if (X.rs === 'fit' || X.rs === 'exact') {
        const w = num(X.rw, 1, 20000), hh = num(X.rh, 1, 20000);
        w.oninput = () => { X.rw = +w.value || 1; out(); }; hh.oninput = () => { X.rh = +hh.value || 1; out(); };
        const g = h('div', 'fields'); g.style.marginTop = '12px'; g.append(field(X.rs === 'fit' ? 'Max width' : 'Width', w), field(X.rs === 'fit' ? 'Max height' : 'Height', hh)); side.append(g);
      } else if (X.rs === 'pct') {
        const p = TF.range(5, 200, X.pct); p.oninput = () => { X.pct = +p.value; out(); };
        side.append(field('Scale', p));
      }
      const o = h('p', 'note'); side.append(o);
      const out = () => { const d = outDims(item); o.innerHTML = 'This photo becomes <b>' + d[0] + ' × ' + d[1] + ' px</b>' + (X.rs === 'none' ? '' : ' (from ' + cropDims(item).join(' × ') + ')'); };
      out();
    } else if (tab === 'blur') {
      const sty = seg([['pixel', 'Pixelate'], ['blur', 'Blur'], ['black', 'Black box']], X.blur, v => { X.blur = v; draw(); });
      const s2 = TF.range(1, 100, X.strength); s2.oninput = () => { X.strength = +s2.value; draw(); };
      side.append(h('h4', null, 'Hide faces, plates and text'), h('p', 'note', '<b>Drag over the picture</b> to cover an area. Click a dashed box to remove it.'), field('Style', sty), field('Strength', s2),
        h('p', 'note', item.boxes.length ? item.boxes.length + (item.boxes.length === 1 ? ' area hidden.' : ' areas hidden.') : 'Nothing hidden yet.'));
      if (item.boxes.length) side.append(actions([{ label: 'Clear all', go: () => { item.boxes = []; draw(); paintPanel(); } }]));
      side.append(h('p', 'note', 'For text and numbers use Pixelate at high strength or Black box — light blur can sometimes be reversed.'));
    } else if (tab === 'bg') {
      const model = seg([['isnet_quint8', 'Fast'], ['isnet_fp16', 'Best']], X.model, v => { X.model = v; TF.store.set('bgModel', v); });
      const bgSel = TF.choice([['none', 'image', 'Transparent', 'PNG keeps it see-through'], ['#FFFFFF', 'file', 'White', 'For listings and IDs'], ['custom', 'contrast', 'Colour', 'Pick below']], X.bg, v => { X.bg = v; draw(); paintPanel(); });
      bgSel.classList.add('compact');
      const col = TF.color(X.bgc); col.oninput = () => { X.bgc = col.value; X.bg = 'custom'; draw(); };
      side.append(h('h4', null, 'Remove the background'), h('p', 'note', 'An AI model on your device separates the subject. It downloads once (tens of MB), then works offline.'),
        field('Quality', model), actions([{ label: item.cut ? 'Done — run again' : 'Remove background', cls: item.cut ? '' : 'pri', icon: 'wand', go: () => cut([item]) },
          { label: 'Do all ' + items.length, go: () => cut(items.filter(x => !x.cut)) }].slice(0, items.length > 1 ? 2 : 1)), h('div', 'pgl', 'New background'), bgSel);
      if (X.bg === 'custom') side.append(field('Colour', col));
      if (item.cut) side.append(actions([{ label: 'Undo the cut-out', go: () => { item.cut = null; draw(); paintPanel(); } }]));
    } else savePanel(item);
  }
  function setCrop(item, b, c) {
    const ratio = c[2], out = c[3];
    let w, hh;
    if (!ratio) { w = b.width * .8; hh = b.height * .8; } else { const f = fit(ratio, 1, b.width * .86, b.height * .86); w = f.w; hh = f.h; }
    item.crop = { key: c[0], ratio: ratio, out: out, x: (b.width - w) / 2, y: (b.height - hh) / 2, w: w, h: hh };
    draw(); paintPanel();
  }
  const cropDims = item => { const b = base(item), c = item.crop; return c ? (c.out || [Math.round(c.w), Math.round(c.h)]) : [b.width, b.height]; };
  function outDims(item) {
    const [w, hh] = cropDims(item);
    if (item.crop && item.crop.out) return [w, hh];
    if (X.rs === 'pct') return [Math.max(1, Math.round(w * X.pct / 100)), Math.max(1, Math.round(hh * X.pct / 100))];
    if (X.rs === 'exact') return [X.rw, X.rh];
    if (X.rs === 'fit') { const f = fit(w, hh, X.rw, X.rh); return f.k >= 1 ? [w, hh] : [Math.round(f.w), Math.round(f.h)]; }
    return [w, hh];
  }
  /* the finished picture, full size */
  function finished(item) {
    const b = base(item), c0 = h2c(b.width, b.height);
    c0.ctx.drawImage(b, 0, 0);
    blurBoxes(c0.ctx, item.boxes, 1, X.blur, X.strength);
    const c = item.crop, [ow, oh] = outDims(item);
    const sx = c ? c.x : 0, sy = c ? c.y : 0, sw = c ? c.w : b.width, sh = c ? c.h : b.height;
    const o = h2c(ow, oh);
    if (item.crop && item.crop.out) { o.ctx.fillStyle = '#fff'; o.ctx.fillRect(0, 0, ow, oh); }
    o.ctx.drawImage(c0.cv, sx, sy, sw, sh, 0, 0, ow, oh);
    return o.cv;
  }
  async function encode(cv) {
    const mime = MIME[X.fmt];
    if (!X.target || X.fmt === 'png') return canvasBlob(cv, mime, X.q / 100);
    const limit = X.target * 1024;
    let scale = 1;
    for (let pass = 0; pass < 6; pass++) {
      const c = scale === 1 ? cv : drawTo(cv, cv.width * scale, cv.height * scale);
      let lo = .05, hi = .95, best = null;
      for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2, b = await canvasBlob(c, mime, mid); if (b.size <= limit) { best = b; lo = mid; } else hi = mid; }
      if (best) return best;
      scale *= .72;
    }
    return canvasBlob(drawTo(cv, cv.width * scale, cv.height * scale), mime, .3);
  }
  let pvTok = 0;
  function savePanel(item) {
    const fmt = TF.choice([['jpg', 'image', 'JPG', 'Photos, smallest'], ['png', 'file', 'PNG', 'Sharp, keeps transparency'], ['webp', 'compress', 'WebP', 'Smallest for the web']], X.fmt, v => { X.fmt = v; paintPanel(); });
    fmt.classList.add('compact');
    side.append(h('h4', null, 'Format'), fmt);
    if (X.fmt !== 'png') {
      const tg = seg([['0', 'Any size'], ['20', '20 KB'], ['50', '50 KB'], ['100', '100 KB'], ['200', '200 KB'], ['500', '500 KB'], ['1024', '1 MB']], String(X.target), v => { X.target = +v; paintPanel(); });
      side.append(h('div', 'pgl', 'Must be under'), tg);
      if (!X.target) { const q = TF.range(30, 100, X.q); q.onchange = () => { X.q = +q.value; preview(); }; side.append(field('Quality', q)); }
    }
    const pv = h('div'); side.append(pv);
    const n = items.length;
    side.append(actions([{ label: 'Save this image', cls: 'pri', icon: 'download', go: () => saveOne(item) }].concat(n > 1 ? [{ label: 'Save all ' + n + ' (zip)', icon: 'download', go: saveAll }] : [])));
    if (X.fmt === 'jpg' && item.cut && X.bg === 'none') side.append(h('p', 'note', 'JPG cannot be see-through, so the cut-out gets a white background. Choose PNG to keep it transparent.'));
    preview();
    async function preview() {
      const my = ++pvTok;
      pv.innerHTML = '<p class="note">Working out the result…</p>';
      const out = finished(item), blob = await encode(out);
      if (my !== pvTok) return;
      const [ow, oh] = outDims(item);
      const k2 = Math.min(1, 700 / Math.max(out.width, out.height));
      const before = h2c(out.width * k2, out.height * k2);
      const c = item.crop, ro = rotated(item);
      before.ctx.drawImage(ro, c ? c.x : 0, c ? c.y : 0, c ? c.w : ro.width, c ? c.h : ro.height, 0, 0, before.cv.width, before.cv.height);
      pv.innerHTML = '';
      pv.append(h('p', 'note', '<b>' + ow + ' × ' + oh + ' px · ' + bytes(blob.size) + '</b> — slide to compare with the original.'),
        TF.beforeAfter(before.cv.toDataURL('image/jpeg', .85), URL.createObjectURL(blob), 'Original', 'Result'),
        TF.sizeGauge(item.size, blob.size, X.target && X.fmt !== 'png' ? X.target * 1024 : 0));
    }
  }
  const outName = item => base0(item.name) + (X.target ? '-' + X.target + 'kb' : '') + '.' + X.fmt;
  async function saveOne(item) { dl(await encode(finished(item)), outName(item)); }
  async function saveAll() {
    st.busy('Saving…');
    const out = [];
    for (let i = 0; i < items.length; i++) {
      st.step(i, items.length, 'Image ' + (i + 1) + ' of ' + items.length);
      await nextFrame();
      out.push({ name: outName(items[i]), blob: await encode(finished(items[i])) });
    }
    const total = out.reduce((a, b) => a + b.blob.size, 0), before = items.reduce((a, b) => a + b.size, 0);
    st.ok('Saved ' + out.length + ' images', bytes(before) + ' → ' + bytes(total), [{ label: 'Download zip', pri: true, icon: 'download', go: () => zipUp(out, 'images.zip') }]);
  }
  async function cut(list) {
    if (!list.length) return;
    st.busy('Downloading the AI model (one time)…');
    try {
      const lib = await bgLib();
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        st.busy('Cutting out ' + item.name + (list.length > 1 ? ' (' + (i + 1) + ' of ' + list.length + ')' : '') + '…');
        await nextFrame();
        const input = await canvasBlob(drawTo(item.dec.img, item.dec.w, item.dec.h), 'image/png');
        const out = await lib.removeBackground(input, { model: X.model, output: { format: 'image/png', quality: .9 },
          progress: (key, c2, total) => { if (/fetch/i.test(key) && total) st.step(c2, total, 'Downloading the AI model (one time) — ' + Math.round(c2 / total * 100) + '%'); } });
        const url = URL.createObjectURL(out);
        item.cut = { img: await TF.loadImg(url), url: url, blob: out };
      }
      st.clear();
      if (X.fmt === 'jpg' && X.bg === 'none') X.fmt = 'png';
      draw(); paintPanel();
      toast('Background removed', list.length > 1 ? list.length + ' images' : 'Pick a new background, or save it see-through as PNG.');
    } catch (e) { console.error(e); st.fail((e && e.message) || 'Background removal failed — your browser may be out of memory. Try a smaller image.'); }
  }
  window.addEventListener('resize', () => { if (work.isConnected && !work.hidden) draw(); });
  paintTabs();
}
const base0 = n => base(n);
reg({
  id: 'image-editor', cat: 'img', icon: 'image', name: 'Image studio', tag: 'New',
  desc: 'Crop, resize, blur, cut out, convert and compress — visually.',
  long: 'One workspace for your photos. Crop with a box you drag (including passport sizes), resize, hide faces and number plates, remove the background with on-device AI, then pick a format and size limit and compare the result side by side before you save. Works on a whole batch at once.',
  keys: 'image editor photo crop resize compress convert heic jpg png webp blur background remove passport',
  mount(m) { mountImageStudio(m, 'crop'); }
});
const itask = (id, icon, name, task, desc, long, keys, tab, tag, autoCrop) => reg({ id: id, cat: 'img', icon: icon, name: name, task: task, desc: desc, long: long,
  keys: keys, tag: tag, studio: 'image-editor', mount(m) { mountImageStudio(m, tab, Object.assign({ autoCrop: !!autoCrop }, TF.presetFor(id))); } });
itask('convert-image', 'refresh', 'Convert images', 'Convert', 'JPG, PNG, WebP and iPhone HEIC, any direction.',
  'Drop photos in any format — including iPhone HEIC — choose JPG, PNG or WebP, and compare the result before saving. Batches welcome.',
  'heic jpg jpeg png webp format change iphone convert', 'save');
itask('compress-image', 'compress', 'Compress images', 'Compress', 'Shrink photos, or hit an exact size like 20 KB.',
  'Pick a size limit — 20 KB, 50 KB, 100 KB, 1 MB — and see the result next to the original, with the new file size, before you save.',
  'reduce smaller optimise optimize size limit upload 20kb 50kb 100kb kb compress', 'save');
itask('resize-image', 'resize', 'Resize images', 'Resize', 'Set exact pixels, fit in a box, or scale by percent.',
  'Resize one photo or a batch: fit inside a box, set exact pixels or scale by a percentage, and see the new dimensions before saving.',
  'scale dimensions pixels shrink enlarge width height resize', 'resize');
itask('crop-image', 'crop', 'Crop & passport photo', 'Crop & passport', 'Drag a box to crop — or to passport size.',
  'Drag a crop box on your photo. Presets cover the usual shapes plus official passport and visa sizes at 300 DPI.',
  'trim cut aspect ratio passport visa id photo 35x45 2x2 crop', 'crop', null, true);
itask('blur-image', 'blur', 'Blur & redact photos', 'Blur & hide', 'Drag over faces, plates or text to hide them.',
  'Drag over anything that should not be seen — faces, car plates, addresses, account numbers — and pixelate, blur or black it out before you share.',
  'blur pixelate censor redact face license plate privacy screenshot hide black box', 'blur');
itask('remove-bg', 'wand', 'Background remover', 'Remove background', 'Cut out people, products and pets — full resolution.',
  'Removes the background with an AI model that runs on your own device — no upload, no credits. Keep it see-through, or drop the subject onto white or any colour.',
  'remove background transparent cutout remove.bg product photo png ai', 'bg', 'AI, on device');

})();
