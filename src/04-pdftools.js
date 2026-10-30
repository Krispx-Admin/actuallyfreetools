/* ============================================================ PDF tools */
(function () {
'use strict';
const { h, esc, ico, toast, bytes, dl, base, zipUp, isPdf, isImg, decodeImage,
  canvasBlob, fit, nextFrame, pdfjsDoc, pdfLibDoc, renderPage, dropzone, fileList,
  stage, field, sel, num, txt, seg, check, panel, actions, reg, onePdf, fileBar, remount,
  parseRanges, parseGroups, textKit, rasterPdf } = TF;
const { PDFDocument, StandardFonts, rgb, degrees } = PDFLib;

const HEX = hex => {
  const v = hex.replace('#', '');
  const f = v.length === 3 ? v.split('').map(c => c + c).join('') : v;
  return rgb(parseInt(f.slice(0, 2), 16) / 255, parseInt(f.slice(2, 4), 16) / 255, parseInt(f.slice(4, 6), 16) / 255);
};

/* ============================================================ 3. compress */
/* render page 1 of a PDF (bytes or pdf.js doc) as an image URL, for before/after views */
async function firstPage(src, w) {
  const doc = src.numPages ? src : await pdfjsDoc(src);
  return TF.pageThumb(doc, 0, w || 900);
}
reg({
  id: 'compress-pdf', cat: 'doc', icon: 'compress', name: 'Compress PDF',
  desc: 'Shrink a PDF, or hit an exact size — even 100 KB.',
  long: 'Make a PDF smaller and see the result before you download: the new size against the old, and a slider to compare the quality side by side.',
  keys: 'reduce size smaller optimise optimize email attachment 100kb 200kb kb portal upload limit government',
  mount(m) {
    onePdf(m, {
      onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'compress-pdf')));
        let mode = 'tidy';
        const quality = TF.range(30, 95, 72);
        const dpi = seg([['200', 'Sharp'], ['150', 'Good'], ['110', 'Screen'], ['80', 'Small']], '150', () => {});
        const target = seg([['0.1', '100 KB'], ['0.2', '200 KB'], ['0.3', '300 KB'], ['0.5', '500 KB'], ['1', '1 MB'],
          ['2', '2 MB'], ['5', '5 MB'], ['10', '10 MB'], ['25', '25 MB']], '1', () => {});
        const gray = check('Grayscale — far smaller, ideal for scanned forms and ID copies', false);
        const qf = field('Quality', quality), df = field('Resolution', dpi), tf = field('Must be under', target);
        const how = TF.choice([
          ['tidy', 'file', 'Keep text sharp', 'Rebuild the file. Text stays selectable; modest savings.'],
          ['flatten', 'image', 'Squeeze hard', 'Redraw pages as images. Huge savings on scans.'],
          ['target', 'compress', 'Fit a size limit', 'Pick a limit; it finds the sharpest version that fits.']
        ], 'tidy', v => {
          mode = v;
          qf.hidden = df.hidden = v !== 'flatten';
          tf.hidden = v !== 'target';
          gray.hidden = warn.hidden = v === 'tidy';
        });
        const warn = h('div', 'note', 'Pages become pictures, so text stops being selectable. Run OCR afterwards if you need it searchable.');
        const p = h('div', 'panel');
        p.append(h('h4', null, 'How small?'), how);
        const g = h('div', 'fields'); g.style.marginTop = '14px';
        g.append(tf, df, qf);
        p.append(g, gray, warn);
        gray.style.marginTop = '12px';
        qf.hidden = df.hidden = tf.hidden = gray.hidden = warn.hidden = true;
        const pre = TF.presetFor('compress-pdf');
        if (pre.target) { how.set('target'); target.set(pre.target); }
        body.append(p, actions([{ label: 'Compress', cls: 'pri', icon: 'compress', go: run }]));
        const st = stage(body);

        async function run() {
          const before = info.bytes.length;
          st.busy('Compressing…');
          try {
            let blob, extra = '', limit = 0;
            if (mode === 'tidy') {
              const d = await pdfLibDoc(info.bytes);
              ['Title', 'Author', 'Subject', 'Producer', 'Creator'].forEach(k => { try { d['set' + k](''); } catch (e) {} });
              try { d.setKeywords([]); } catch (e) {}
              blob = new Blob([await d.save({ useObjectStreams: true })], { type: 'application/pdf' });
            } else if (mode === 'flatten') {
              blob = await rasterPdf(info.doc, { dpi: +dpi.value(), q: +quality.value / 100, gray: gray.input.checked, st: st });
            } else {
              limit = +target.value() * 1048576;
              const lim = bytes(limit);
              if (before <= limit) {
                const r = st.ok('Already small enough', 'This file is ' + bytes(before) + ' — under your ' + lim + ' limit. Nothing needed changing.',
                  [{ label: 'Download it anyway', icon: 'download', go: () => dl(new Blob([info.bytes], { type: 'application/pdf' }), info.name) }]);
                r.append(TF.sizeGauge(before, before, limit));
                return;
              }
              /* sharpest first; binary search keeps the number of full renders to about four */
              const ladder = [[150, .8], [130, .72], [110, .65], [96, .58], [84, .5], [72, .44], [62, .38], [54, .33], [46, .28], [38, .24], [30, .2]];
              let lo = 0, hi = ladder.length - 1, best = null, bestI = -1, smallest = null, tries = 0;
              while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                tries++;
                const b = await rasterPdf(info.doc, { dpi: ladder[mid][0], q: ladder[mid][1], gray: gray.input.checked, st: st, label: 'Attempt ' + tries });
                if (!smallest || b.size < smallest.size) smallest = b;
                if (b.size <= limit) { best = b; bestI = mid; hi = mid - 1; } else lo = mid + 1;
              }
              if (!best) {
                st.fail('Could not get under ' + lim + ' — the smallest attempt came to ' + bytes(smallest.size) + '.' +
                  (gray.input.checked ? '' : ' Tick Grayscale and try again,') + ' or split the document into parts.');
                return;
              }
              blob = best;
              extra = ' at ' + ladder[bestI][0] + ' DPI';
            }
            const saved = Math.max(0, Math.round((1 - blob.size / before) * 100));
            const r = st.ok(saved > 0 ? saved + '% smaller' + extra : 'Rebuilt, but barely smaller',
              saved <= 2 && mode === 'tidy' ? 'This file was already well packed. Try “Squeeze hard” if it is a scan.' : 'Slide across the page to compare the quality.',
              [{ label: 'Download PDF', pri: true, icon: 'download', go: () => dl(blob, base(info.name) + '-compressed.pdf') }]);
            r.append(TF.sizeGauge(before, blob.size, limit));
            if (mode !== 'tidy') r.append(TF.beforeAfter(await firstPage(info.doc), await firstPage(new Uint8Array(await blob.arrayBuffer())), 'Original', 'Compressed'));
          } catch (e) { st.fail('Compression failed: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ 4. pdf → images */
reg({
  id: 'pdf-to-images', cat: 'doc', icon: 'image', name: 'PDF to images',
  desc: 'Click the pages you want, save them as JPG or PNG.',
  long: 'See every page, click the ones you want, and save them as pictures at screen, print or archival resolution.',
  keys: 'jpg png export convert render pages pdf to jpg',
  mount(m) {
    onePdf(m, {
      onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'pdf-to-images')));
        const fmt = TF.choice([['jpg', 'image', 'JPG', 'Smaller files, best for sharing'], ['png', 'file', 'PNG', 'Lossless, crisp text']], 'jpg');
        fmt.classList.add('compact');
        const dpi = seg([['72', 'Screen'], ['150', 'Good'], ['300', 'Print'], ['600', 'Archival']], '150', () => {});
        const p = panel('Save as', [fmt]);
        const g = h('div', 'fields'); g.style.marginTop = '12px';
        g.append(field('Resolution', dpi));
        p.append(g);
        let btn;
        const pick = TF.pagePicker(info.doc, { onChange: s => { btn && (btn.querySelector('span').textContent = s.length ? 'Save ' + s.length + (s.length === 1 ? ' image' : ' images') : 'Pick some pages'); if (btn) btn.disabled = !s.length; } });
        const pp = h('div', 'panel'); pp.append(h('h4', null, 'Pages'), pick);
        body.append(p, pp, actions([{ label: 'Save ' + info.pages + (info.pages === 1 ? ' image' : ' images'), cls: 'pri', icon: 'image', ref: b => btn = b, go: run }]));
        const st = stage(body);
        async function run() {
          const idx = pick.selected();
          if (!idx.length) return st.fail('Click at least one page.');
          st.busy('Rendering…');
          try {
            const mime = fmt.value === 'png' ? 'image/png' : 'image/jpeg', ext = fmt.value, out = [];
            for (let i = 0; i < idx.length; i++) {
              st.step(i, idx.length, 'Page ' + (idx[i] + 1) + ' — ' + (i + 1) + ' of ' + idx.length);
              await nextFrame();
              const cv = await renderPage(await info.doc.getPage(idx[i] + 1), +dpi.value() / 72);
              out.push({ name: base(info.name) + '-' + String(idx[i] + 1).padStart(3, '0') + '.' + ext, blob: await canvasBlob(cv, mime, 0.92) });
            }
            const total = out.reduce((a, b) => a + b.blob.size, 0);
            st.ok(out.length + (out.length === 1 ? ' image' : ' images') + ' ready', bytes(total) + ' in total',
              out.length === 1 ? [{ label: 'Download image', pri: true, icon: 'download', go: () => dl(out[0].blob, out[0].name) }]
                : [{ label: 'Download all as zip', pri: true, icon: 'download', go: () => zipUp(out, base(info.name) + '-images.zip') }]);
          } catch (e) { st.fail('Conversion failed: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ 6. watermark */
const CSSFONT = { sans: 'Helvetica,Arial,sans-serif', serif: '"Times New Roman",Times,serif', mono: '"Courier New",monospace' };
reg({
  id: 'watermark-pdf', cat: 'doc', icon: 'stamp', name: 'Watermark PDF',
  desc: 'Stamp text across pages — see it live as you type.',
  long: 'Type DRAFT, CONFIDENTIAL or a client name and watch it appear on your page as you change the size, angle, colour and transparency. Then pick the pages to stamp.',
  keys: 'stamp draft confidential brand overlay watermark',
  mount(m) {
    onePdf(m, {
      async onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'watermark-pdf')));
        const pg1 = await info.doc.getPage(1), vp = pg1.getViewport({ scale: 1 });
        const bg = await TF.loadImg(await TF.pageThumb(info.doc, 0, 520));
        const text = txt('CONFIDENTIAL', 'Watermark text…');
        text.dir = 'auto';
        const size = TF.range(12, 160, 60), op = TF.range(5, 100, 22), rot = TF.range(-90, 90, 45);
        const col = TF.color('#E5484D');
        const lay = TF.choice([['center', 'stamp', 'Once', 'Centred'], ['tile', 'pages', 'Tiled', 'Across the page'], ['diag', 'resize', 'Corner to corner', 'Fills the diagonal']], 'center', draw);
        lay.classList.add('compact');
        const font = seg([['sans', 'Sans'], ['serif', 'Serif'], ['mono', 'Mono']], 'sans', draw);
        const ctrl = h('div');
        ctrl.append(panel('Watermark', [field('Text', text), field('Colour', col), field('Size', size), field('Angle', rot), field('Transparency', op), field('Typeface', font)]));
        ctrl.firstChild.append(h('div', 'pgl', 'Layout'), lay);
        const pv = h('div', 'livepv stick'), cv = h('canvas');
        pv.append(cv, h('span', 'cap', 'Live preview of page 1'));
        const two = h('div', 'split2'); two.append(ctrl, pv);
        const pick = TF.pagePicker(info.doc);
        const pp = h('div', 'panel'); pp.style.marginTop = '14px'; pp.append(h('h4', null, 'Pages to stamp'), pick);
        body.append(two, pp, actions([{ label: 'Apply watermark', cls: 'pri', icon: 'stamp', go: run }]));
        const st = stage(body);
        [text, size, op, rot, col].forEach(c => { c.oninput = draw; });
        function draw() {
          const k = 520 / vp.width, W = 520, H = vp.height * k, x = cv.getContext('2d');
          cv.width = W; cv.height = H;
          x.drawImage(bg, 0, 0, W, H);
          const t = text.value.trim();
          if (!t) return;
          const sz = +size.value * k, a = -(+rot.value) * Math.PI / 180;
          x.save();
          x.globalAlpha = +op.value / 100; x.fillStyle = col.value; x.textAlign = 'center'; x.textBaseline = 'middle';
          x.font = '700 ' + sz + 'px ' + CSSFONT[font.value()];
          const tw = x.measureText(t).width;
          if (lay.value === 'tile') {
            for (let yy = -H; yy < H * 2; yy += sz * 4) for (let xx = -W; xx < W * 2; xx += tw * 1.5) {
              x.save(); x.translate(xx, yy); x.rotate(a); x.fillText(t, 0, 0); x.restore();
            }
          } else if (lay.value === 'diag') {
            const s2 = sz * Math.hypot(W, H) / (tw * 1.15);
            x.font = '700 ' + s2 + 'px ' + CSSFONT[font.value()];
            x.translate(W / 2, H / 2); x.rotate(-Math.atan2(H, W)); x.fillText(t, 0, 0);
          } else { x.translate(W / 2, H / 2); x.rotate(a); x.fillText(t, 0, 0); }
          x.restore();
        }
        draw();
        async function run() {
          const t = text.value.trim();
          if (!t) return st.fail('Type some watermark text first.');
          const idx = pick.selected();
          if (!idx.length) return st.fail('Click at least one page to stamp.');
          st.busy('Stamping…');
          try {
            const d = await pdfLibDoc(info.bytes);
            const std = font.value() === 'serif' ? 'TimesRomanBold' : font.value() === 'mono' ? 'CourierBold' : 'HelveticaBold';
            const kit = await textKit(d, [[t, std]]);
            const sz = +size.value, o = +op.value / 100, a = +rot.value;
            const w = kit.width(t, sz, std);
            d.getPages().forEach((page, i) => {
              if (idx.indexOf(i) < 0) return;
              const { width: W, height: H } = page.getSize();
              const opt = { size: sz, std: std, color: HEX(col.value), opacity: o, rotate: a };
              if (lay.value === 'tile') {
                for (let y = -H; y < H * 2; y += sz * 4) for (let x = -W; x < W * 2; x += w * 1.5)
                  kit.draw(page, t, Object.assign({ x: x - w / 2, y: y }, opt));
              } else if (lay.value === 'diag') {
                const ang = Math.atan2(H, W) * 180 / Math.PI, s2 = sz * Math.hypot(W, H) / (w * 1.15);
                kit.draw(page, t, Object.assign({}, opt, { x: W * .06, y: H * .06, size: s2, rotate: ang }));
              } else {
                const r = a * Math.PI / 180;
                kit.draw(page, t, Object.assign({}, opt, { x: W / 2 - (w / 2) * Math.cos(r) + (sz / 3) * Math.sin(r), y: H / 2 - (w / 2) * Math.sin(r) - (sz / 3) * Math.cos(r) }));
              }
            });
            const blob = new Blob([await d.save()], { type: 'application/pdf' });
            const r = st.ok('Watermark applied', idx.length + (idx.length === 1 ? ' page · ' : ' pages · ') + bytes(blob.size),
              [{ label: 'Download PDF', pri: true, icon: 'download', go: () => dl(blob, base(info.name) + '-watermarked.pdf') }]);
            const lv = h('div', 'livepv'), im = h('img');
            im.src = await firstPage(new Uint8Array(await blob.arrayBuffer()), 520); im.alt = 'Page 1 with the watermark';
            lv.style.marginTop = '12px'; lv.append(im); r.append(lv);
          } catch (e) { st.fail('Could not apply the watermark: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ 7. page numbers & Bates */
const SPOTS = [['tl', 14, 10, 'Top left'], ['tc', 50, 10, 'Top centre'], ['tr', 86, 10, 'Top right'],
  ['bl', 14, 90, 'Bottom left'], ['bc', 50, 90, 'Bottom centre'], ['br', 86, 90, 'Bottom right']];
reg({
  id: 'page-numbers', cat: 'doc', icon: 'hash', name: 'Page numbers & Bates',
  desc: 'Click where the number goes — see it on your page.',
  long: 'Click a spot on the little page to choose where numbers go, pick a style, and see it on your own page before saving. Bates mode adds the prefixed, zero-padded numbers used in legal discovery.',
  keys: 'numbering bates legal discovery stamp folio page numbers',
  mount(m) {
    onePdf(m, {
      async onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'page-numbers')));
        let mode = 'plain';
        const fmt = seg([['n', '1'], ['n_of', '1 / 12'], ['page_n', 'Page 1'], ['page_n_of', 'Page 1 of 12']], 'n', draw);
        const prefix = txt('ABC', 'Prefix…'), pad = num(6, 1, 12), start = num(1, 0, 999999), skip = num(0, 0, 999);
        const size = TF.range(6, 36, 11), mg = TF.range(8, 80, 28), col = TF.color('#333333');
        const pos = TF.posPicker(SPOTS, 'bc', draw);
        const ff = field('Style', fmt), pf = field('Prefix', prefix), df = field('Digits', pad);
        const kind = seg([['plain', 'Page numbers'], ['bates', 'Bates (legal)']], 'plain', v => { mode = v; ff.hidden = v === 'bates'; pf.hidden = df.hidden = v !== 'bates'; draw(); });
        pf.hidden = df.hidden = true;
        const ctrl = h('div', 'panel');
        ctrl.append(h('h4', null, 'Where and how'), kind);
        const row = h('div', 'row'); row.style.cssText = 'margin-top:14px;align-items:flex-start;gap:18px';
        const pcol = h('div', 'f'); pcol.append(h('label', null, 'Click a spot'), pos);
        const g = h('div', 'fields'); g.style.flex = '1 1 200px';
        [ff, pf, df, field('First number', start), field('Skip the first pages', skip, 'e.g. 1 to leave the cover blank'), field('Size', size), field('Distance from edge', mg), field('Colour', col)].forEach(x => g.append(x));
        row.append(pcol, g); ctrl.append(row);
        const pv = h('div', 'livepv stick'), cv = h('canvas'), cap = h('span', 'cap');
        pv.append(cv, cap);
        const two = h('div', 'split2'); two.append(ctrl, pv);
        body.append(two, actions([{ label: 'Add numbering', cls: 'pri', icon: 'hash', go: run }]));
        const st = stage(body);
        [prefix, pad, start, skip, size, mg, col].forEach(c => { c.oninput = draw; });
        const label = (i, N) => {
          const skipN = Math.max(0, +skip.value || 0), st0 = +start.value || 0, shown = N - skipN;
          if (i < skipN) return null;
          const n = st0 + i - skipN;
          if (mode === 'bates') return prefix.value + String(n).padStart(Math.max(1, +pad.value || 6), '0');
          const f = fmt.value();
          return f === 'n' ? String(n) : f === 'n_of' ? n + ' / ' + (st0 + shown - 1) : f === 'page_n' ? 'Page ' + n : 'Page ' + n + ' of ' + (st0 + shown - 1);
        };
        const shownIdx = () => Math.min(info.pages - 1, Math.max(0, +skip.value || 0));
        let bgIdx = -1, bg = null, vp = null;
        async function draw() {
          const i = shownIdx();
          if (i !== bgIdx) { bgIdx = i; const pg = await info.doc.getPage(i + 1); vp = pg.getViewport({ scale: 1 }); bg = await TF.loadImg(await TF.pageThumb(info.doc, i, 520)); }
          const k = 520 / vp.width, W = 520, H = vp.height * k, x = cv.getContext('2d');
          cv.width = W; cv.height = H; x.drawImage(bg, 0, 0, W, H);
          const l = label(i, info.pages);
          cap.textContent = l == null ? 'Nothing to number — every page is skipped' : 'Live preview of page ' + (i + 1);
          if (l == null) return;
          const sz = +size.value * k, M = +mg.value * k, p = pos.value;
          x.font = sz + 'px Helvetica,Arial,sans-serif'; x.fillStyle = col.value; x.textBaseline = 'alphabetic';
          const w = x.measureText(l).width;
          const xx = p[1] === 'l' ? M : p[1] === 'r' ? W - M - w : (W - w) / 2;
          const yy = p[0] === 't' ? M + sz * .8 : H - M;
          x.fillText(l, xx, yy);
          x.strokeStyle = 'rgba(15,190,110,.8)'; x.setLineDash([4, 3]); x.strokeRect(xx - 4, yy - sz - 2, w + 8, sz * 1.3 + 4);
        }
        draw();
        async function run() {
          st.busy('Numbering…');
          try {
            const d = await pdfLibDoc(info.bytes), pages = d.getPages(), N = pages.length, sz = +size.value;
            const labels = pages.map((_, i) => label(i, N));
            const kit = await textKit(d, labels.filter(Boolean).slice(0, 1).map(l => [l, 'Helvetica']));
            pages.forEach((page, i) => {
              const l = labels[i];
              if (l == null) return;
              const { width: W, height: H } = page.getSize();
              const w = kit.width(l, sz, 'Helvetica'), M = +mg.value, p = pos.value;
              const x = p[1] === 'l' ? M : p[1] === 'r' ? W - M - w : (W - w) / 2;
              const y = p[0] === 't' ? H - M - sz * .8 : M;
              kit.draw(page, l, { x: x, y: y, size: sz, std: 'Helvetica', color: HEX(col.value) });
            });
            const blob = new Blob([await d.save()], { type: 'application/pdf' });
            const shown = labels.filter(l => l != null).length;
            st.ok('Numbered ' + shown + (shown === 1 ? ' page' : ' pages'), bytes(blob.size),
              [{ label: 'Download PDF', pri: true, icon: 'download', go: () => dl(blob, base(info.name) + (mode === 'bates' ? '-bates.pdf' : '-numbered.pdf')) }]);
          } catch (e) { st.fail('Numbering failed: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ 9. metadata / EXIF */
const EXIF_TAGS = { 0x010F: 'Camera make', 0x0110: 'Camera model', 0x0112: 'Orientation',
  0x0131: 'Software', 0x0132: 'Date taken', 0x9003: 'Original date', 0x829A: 'Exposure',
  0x829D: 'Aperture', 0x8827: 'ISO', 0xA434: 'Lens', 0x013B: 'Artist', 0x8298: 'Copyright' };
function readExif(buf) {
  const out = {};
  if (!(buf[0] === 0xFF && buf[1] === 0xD8)) return out;
  let p = 2;
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  while (p < buf.length - 4) {
    if (buf[p] !== 0xFF) break;
    const marker = buf[p + 1], len = dv.getUint16(p + 2);
    if (marker === 0xE1 && String.fromCharCode(buf[p + 4], buf[p + 5], buf[p + 6], buf[p + 7]) === 'Exif') {
      const t = p + 10;
      const le = String.fromCharCode(buf[t], buf[t + 1]) === 'II';
      const u16 = o => dv.getUint16(t + o, le), u32 = o => dv.getUint32(t + o, le);
      const walk = (off, gps) => {
        if (off <= 0 || t + off + 2 > buf.length) return;
        const n = u16(off);
        for (let i = 0; i < n && i < 200; i++) {
          const e = off + 2 + i * 12, tag = u16(e), type = u16(e + 2), cnt = u32(e + 4);
          let val;
          if (type === 2) {
            const o = cnt > 4 ? u32(e + 8) : e + 8;
            val = '';
            for (let j = 0; j < cnt - 1 && t + o + j < buf.length; j++) val += String.fromCharCode(buf[t + o + j]);
          } else if (type === 3) val = u16(e + 8);
          else if (type === 4) val = u32(e + 8);
          else if (type === 5) { const o = u32(e + 8); if (t + o + 8 <= buf.length) val = (u32(o) / u32(o + 4)).toFixed(4); }
          if (gps && (tag === 2 || tag === 4)) {
            const o = u32(e + 8);
            if (t + o + 24 <= buf.length) {
              const d0 = u32(o) / u32(o + 4), m0 = u32(o + 8) / u32(o + 12), s0 = u32(o + 16) / u32(o + 20);
              out[tag === 2 ? 'GPS latitude' : 'GPS longitude'] = (d0 + m0 / 60 + s0 / 3600).toFixed(6) + '°';
            }
          } else if (!gps) {
            if (tag === 0x8769) walk(u32(e + 8), false);
            else if (tag === 0x8825) walk(u32(e + 8), true);
            else if (EXIF_TAGS[tag] && val !== undefined && val !== '') out[EXIF_TAGS[tag]] = String(val).trim();
          }
        }
      };
      walk(u32(4), false);
      break;
    }
    if (marker === 0xDA) break;
    p += 2 + len;
  }
  return out;
}

reg({
  id: 'strip-metadata', cat: 'doc', icon: 'eraser', name: 'Remove hidden data',
  desc: 'Strip EXIF, GPS and document metadata.',
  long: 'Photos quietly carry the camera you used and often the exact spot you stood in. Documents carry your name, your software and a revision history. This shows you what is in there and removes it.',
  keys: 'exif gps privacy author scrub clean anonymise anonymize',
  mount(m) {
    const out = h('div');
    const dz = dropzone({
      icon: 'shield', title: 'Drop a PDF or photo here', sub: 'we will show you what it is carrying before removing it',
      accept: 'application/pdf,.pdf,image/*,.heic,.heif',
      onFiles: async f => {
        const file = f[0];
        out.innerHTML = '';
        const st = stage(out);
        st.busy('Inspecting…');
        try {
          if (isPdf(file)) {
            const bs = new Uint8Array(await file.arrayBuffer());
            const d = await pdfLibDoc(bs);
            const found = {};
            const get = (k, fn) => { try { const v = fn(); if (v) found[k] = String(v); } catch (e) {} };
            get('Title', () => d.getTitle()); get('Author', () => d.getAuthor());
            get('Subject', () => d.getSubject()); get('Keywords', () => d.getKeywords());
            get('Creator', () => d.getCreator()); get('Producer', () => d.getProducer());
            get('Created', () => d.getCreationDate() && d.getCreationDate().toISOString().slice(0, 10));
            get('Modified', () => d.getModificationDate() && d.getModificationDate().toISOString().slice(0, 10));
            st.clear();
            out.append(report(found, 'This PDF is carrying'), actions([{ label: 'Remove it all and download',
              cls: 'pri', icon: 'eraser', go: async () => {
                ['Title', 'Author', 'Subject', 'Creator', 'Producer'].forEach(k => { try { d['set' + k](''); } catch (e) {} });
                try { d.setKeywords([]); } catch (e) {}
                try { d.setCreationDate(new Date(0)); d.setModificationDate(new Date(0)); } catch (e) {}
                dl(new Blob([await d.save()], { type: 'application/pdf' }), base(file.name) + '-clean.pdf');
                toast('Cleaned', 'Metadata removed. Page content is untouched.');
              } }]));
          } else {
            const bs = new Uint8Array(await file.arrayBuffer());
            const found = readExif(bs);
            const d = await decodeImage(file);
            st.clear();
            const pv = h('img');
            pv.src = d.url;
            pv.style.cssText = 'max-width:180px;border-radius:10px;border:1px solid var(--line);margin-bottom:14px';
            out.append(pv, report(found, 'This photo is carrying'), actions([{ label: 'Strip it and download',
              cls: 'pri', icon: 'eraser', go: async () => {
                const blob = await canvasBlob(TF.drawTo(d.img, d.w, d.h),
                  d.type === 'png' ? 'image/png' : 'image/jpeg', 0.94);
                dl(blob, base(file.name) + '-clean.' + (d.type === 'png' ? 'png' : 'jpg'));
                toast('Cleaned', 'The image was re-encoded, which removes every tag.');
              } }]));
          }
        } catch (e) { st.fail(e.message); }
      }
    });
    m.append(dz, out);
    function report(found, title) {
      const keys = Object.keys(found);
      const p = h('div', 'panel');
      p.append(h('h4', null, title));
      if (!keys.length) {
        p.append(h('p', 'note', 'Nothing found — this file is already clean. You can still re-save it below to be certain.'));
        return p;
      }
      const dlst = h('dl', 'kv');
      keys.forEach(k => { dlst.append(h('dt', null, esc(k)), h('dd', null, esc(found[k]))); });
      p.append(dlst);
      if (found['GPS latitude']) p.append(h('div', 'warn',
        'This photo records where it was taken, accurate to a few metres. Anyone you send it to can read that.'));
      return p;
    }
  }
});
})();
