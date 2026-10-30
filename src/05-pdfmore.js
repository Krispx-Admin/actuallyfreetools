/* ============================================================ more PDF tools */
(function () {
'use strict';
const { h, esc, toast, bytes, dl, base, zipUp, isPdf, isImg, decodeImage, canvasBlob, h2c, fit,
  nextFrame, pdfjsDoc, pdfLibDoc, renderPage, dropzone, stage, field, sel, num, txt, pwd, seg, check,
  panel, actions, note, onePdf, fileBar, remount, reg, parseRanges, textKit, rasterPdf, pdfLines,
  diff, embedShown, placePage, grayCanvas, MM } = TF;
const { PDFDocument, rgb, degrees } = PDFLib;
const SIZES = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008], a3: [841.89, 1190.55], a5: [419.53, 595.28] };
const SIZE_OPTS = [['a4', 'A4'], ['letter', 'US Letter'], ['legal', 'US Legal'], ['a3', 'A3'], ['a5', 'A5']];
const pdfBlob = b => new Blob([b], { type: 'application/pdf' });
const dlPdf = (b, n) => ({ label: 'Download PDF', pri: true, icon: 'download', go: () => dl(b, n) });

/* ============================================================ fill forms */
reg({
  id: 'fill-form', cat: 'doc', icon: 'form', name: 'Fill PDF forms', tag: 'Popular',
  desc: 'Type into the real fields of a fillable PDF.',
  long: 'Applications, tax forms, registration and consent forms — fill the actual form fields, tick the boxes, pick from the lists, then save. Works in any language. Flatten it if you want the answers locked in place.',
  keys: 'fillable form acroform application tax government complete field checkbox fill in',
  mount(m) {
    onePdf(m, {
      async onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'fill-form')));
        const st = stage(body);
        st.busy('Finding the form fields…');
        const ctrls = {}, holder = h('div');
        let count = 0, sigs = 0, uid = 0;
        const W = Math.min(820, Math.max(280, body.clientWidth || 760));
        try {
          for (let i = 0; i < info.pages; i++) {
            st.step(i, info.pages, 'Reading page ' + (i + 1) + ' of ' + info.pages);
            const pg = await info.doc.getPage(i + 1);
            const ann = (await pg.getAnnotations()).filter(a => a.subtype === 'Widget' && a.fieldName);
            sigs += ann.filter(a => a.fieldType === 'Sig').length;
            const use = ann.filter(a => !a.pushButton && a.fieldType !== 'Sig' && !a.hidden);
            if (!use.length) continue;
            const vp = pg.getViewport({ scale: W / pg.getViewport({ scale: 1 }).width });
            const cv = await renderPage(pg, vp.scale * Math.min(2, window.devicePixelRatio || 1));
            const wrap = h('div', 'pv');
            wrap.style.cssText = 'touch-action:auto;user-select:auto;-webkit-user-select:auto;width:' + W + 'px;max-width:100%';
            cv.style.width = '100%';
            wrap.append(cv);
            holder.append(h('div', 'pgl', 'Page ' + (i + 1)), wrap);
            use.forEach(a => {
              const r = vp.convertToViewportRectangle(a.rect);
              const x = Math.min(r[0], r[2]), y = Math.min(r[1], r[3]), w = Math.abs(r[2] - r[0]), hh = Math.abs(r[3] - r[1]);
              let c;
              if (a.fieldType === 'Tx') {
                c = h(a.multiLine ? 'textarea' : 'input', 'ffield');
                if (!a.multiLine) c.type = 'text';
                c.value = a.fieldValue || '';
                c.dir = 'auto';
                if (a.maxLen) c.maxLength = a.maxLen;
                c.style.fontSize = Math.max(8, Math.min(15, hh * (a.multiLine ? .32 : .62))) + 'px';
                c.oninput = () => (ctrls[a.fieldName] || []).forEach(o => { if (o.el !== c && o.el.tagName === c.tagName) o.el.value = c.value; });
              } else if (a.checkBox || a.radioButton) {
                c = h('input', 'ffield');
                c.type = a.radioButton ? 'radio' : 'checkbox';
                if (a.radioButton) { c.name = 'rg-' + a.fieldName; c.value = a.buttonValue; c.checked = a.fieldValue === a.buttonValue; }
                else c.checked = a.fieldValue != null && a.fieldValue !== 'Off' && (!a.exportValue || a.fieldValue === a.exportValue);
                c.onchange = () => (ctrls[a.fieldName] || []).forEach(o => { if (!a.radioButton && o.el !== c) o.el.checked = c.checked; });
              } else if (a.fieldType === 'Ch') {
                c = h('select', 'ffield');
                if (a.multiSelect) c.multiple = true;
                if (!a.multiSelect) c.append(new Option('', ''));
                (a.options || []).forEach(o => c.append(new Option(o.displayValue || o.exportValue, o.exportValue)));
                const vals = [].concat(a.fieldValue || []);
                [...c.options].forEach(o => { o.selected = vals.indexOf(o.value) >= 0; });
                c.style.fontSize = Math.max(8, Math.min(14, hh * .6)) + 'px';
              } else return;
              if (a.readOnly) c.disabled = true;
              c.title = a.alternativeText || a.fieldName;
              c.style.left = (x / vp.width * 100) + '%'; c.style.top = (y / vp.height * 100) + '%';
              c.style.width = (w / vp.width * 100) + '%'; c.style.height = (hh / vp.height * 100) + '%';
              c.dataset.k = ++uid;
              wrap.append(c);
              (ctrls[a.fieldName] = ctrls[a.fieldName] || []).push({ el: c, a: a });
              count++;
            });
          }
        } catch (e) { return st.fail('Could not read the form: ' + e.message); }
        st.clear();
        if (!count) {
          body.append(h('div', 'warn', 'This PDF has no fillable fields' + (sigs ? ' apart from ' + sigs + ' signature box' + (sigs > 1 ? 'es' : '') : '') +
            '. It is a “flat” form — open it in the PDF editor and use the Text tool to type on it, or Sign PDF to sign it.'));
          body.append(actions([{ label: 'Open the PDF editor', cls: 'pri', icon: 'edit', go: () => { location.hash = '#/pdf-editor'; } },
            { label: 'Sign PDF', icon: 'sign', go: () => { location.hash = '#/sign-pdf'; } }]));
          return;
        }
        const flat = check('Flatten — lock the answers so they can no longer be edited', false);
        body.append(note('<b>' + count + '</b> fields found. Click into them on the pages below and type. ' +
          (sigs ? 'Signature boxes are left alone — use Sign PDF afterwards. ' : '') + 'Use Tab to move between fields.'));
        body.append(holder);
        const p = h('div', 'panel');
        p.style.marginTop = '18px';
        p.append(flat);
        body.append(p, actions([{ label: 'Save filled PDF', cls: 'pri', icon: 'download', go: run },
          { label: 'Clear all answers', go: () => Object.values(ctrls).forEach(l => l.forEach(o => {
            if (o.el.type === 'checkbox' || o.el.type === 'radio') o.el.checked = false; else o.el.value = '';
          })) }]));
        const st2 = stage(body);
        async function run() {
          st2.busy('Filling…');
          try {
            const vals = {};
            Object.keys(ctrls).forEach(name => {
              const list = ctrls[name], a = list[0].a;
              if (a.fieldType === 'Tx') vals[name] = list[0].el.value;
              else if (a.checkBox) vals[name] = list.some(o => o.el.checked);
              else if (a.radioButton) { const on = list.find(o => o.el.checked); vals[name] = on ? on.a.buttonValue : null; }
              else if (a.fieldType === 'Ch') vals[name] = a.multiSelect ? [...list[0].el.selectedOptions].map(o => o.value) : list[0].el.value;
            });
            const d = await pdfLibDoc(info.bytes);
            const form = d.getForm();
            const kit = await textKit(d, Object.values(vals).filter(v => typeof v === 'string' && v).map(v => [v, 'Helvetica']));
            let failed = 0;
            for (const name of Object.keys(vals)) {
              let f;
              try { f = form.getField(name); } catch (e) { failed++; continue; }
              const v = vals[name];
              try {
                if (f instanceof PDFLib.PDFTextField) {
                  let s = v || '';
                  const ml = f.getMaxLength();
                  if (ml) s = s.slice(0, ml);
                  f.setText(s);
                  f.updateAppearances(kit.fieldFont(s));
                } else if (f instanceof PDFLib.PDFCheckBox) { v ? f.check() : f.uncheck(); }
                else if (f instanceof PDFLib.PDFRadioGroup) { if (v) f.select(v); else f.clear(); }
                else if (f instanceof PDFLib.PDFDropdown) { if (v) f.select(v); else f.clear(); f.updateAppearances(kit.fieldFont(String(v || ''))); }
                else if (f instanceof PDFLib.PDFOptionList) { if (v && v.length) f.select(v); else f.clear(); f.updateAppearances(kit.fieldFont(v.join(' '))); }
              } catch (e) { failed++; }
            }
            try { if (form.hasXFA()) form.deleteXFA(); } catch (e) {}
            let flatNote = '';
            if (flat.input.checked) {
              try { form.flatten({ updateFieldAppearances: false }); }
              catch (e) { flatNote = ' Some fields had no printable appearance, so the form was saved unflattened.'; }
            }
            const blob = pdfBlob(await d.save({ updateFieldAppearances: false }));
            st2.ok('Form filled', bytes(blob.size) + (failed ? ' · ' + failed + ' field' + (failed > 1 ? 's' : '') + ' could not be written' : '') + flatNote,
              [dlPdf(blob, base(info.name) + '-filled.pdf')]);
          } catch (e) { console.error(e); st2.fail('Could not save the form: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ protect / unlock */
reg({
  id: 'protect-pdf', cat: 'doc', icon: 'lock', name: 'Protect PDF',
  desc: 'Add a password, block printing or copying.',
  long: 'Encrypt a PDF with AES-256 so it cannot be opened without your password — the same protection Acrobat applies. Optionally stop people printing it, copying its text or changing it.',
  keys: 'password encrypt lock secure aes protect restrict',
  mount(m) {
    onePdf(m, {
      onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'protect-pdf')));
        const p1 = pwd('At least 4 characters'), p2 = pwd('Type it again');
        const own = pwd('optional');
        const pr = check('Allow printing', true), cp = check('Allow copying text', true), ed = check('Allow editing and page changes', false);
        const box = panel('Password', [field('Password to open', p1), field('Confirm password', p2),
          field('Permissions password', own, 'Needed to lift the restrictions below. Leave blank to lock them with a random key.')]);
        const perms = h('div', 'chks');
        perms.append(pr, cp, ed);
        box.append(perms);
        body.append(box, note('Write the password down — <b>nobody can recover it</b>, including us. We never see it.'),
          actions([{ label: 'Protect PDF', cls: 'pri', icon: 'lock', go: run }]));
        const st = stage(body);
        async function run() {
          if (p1.value.length < 4) return st.fail('Use a password of at least 4 characters.');
          if (p1.value !== p2.value) return st.fail('The two passwords do not match.');
          st.busy('Downloading the encryption engine (one time)…');
          try {
            const C = await TF.cantoo();
            st.busy('Encrypting…');
            let d;
            try { d = await C.PDFDocument.load(info.bytes.slice(0)); }
            catch (e) { d = await C.PDFDocument.load(info.bytes.slice(0), { password: '' }); }
            const rnd = [...crypto.getRandomValues(new Uint8Array(18))].map(b => b.toString(16).padStart(2, '0')).join('');
            d.encrypt({ userPassword: p1.value, ownerPassword: own.value || rnd,
              permissions: { printing: pr.input.checked ? 'highResolution' : false, copying: cp.input.checked,
                modifying: ed.input.checked, annotating: ed.input.checked, documentAssembly: ed.input.checked,
                fillingForms: true, contentAccessibility: true } });
            const out = await d.save();
            await pdfjsDoc(out, p1.value);                           /* prove it opens with the password */
            const blob = pdfBlob(out);
            st.ok('Protected with AES-256', 'Opens only with your password · ' + bytes(blob.size),
              [dlPdf(blob, base(info.name) + '-protected.pdf')]);
          } catch (e) { console.error(e); st.fail('Could not protect the file: ' + e.message); }
        }
      }
    });
  }
});

function stripEncryption(C, d) {
  const N = C.PDFName;
  for (const [ref, obj] of d.context.enumerateIndirectObjects()) {
    const dict = obj && obj.dict ? obj.dict : obj;
    if (dict && dict.get && ((dict.get(N.of('Root')) && dict.get(N.of('Size'))) ||
      dict.get(N.of('Type')) === N.of('XRef') || dict.get(N.of('Filter')) === N.of('Standard'))) d.context.delete(ref);
  }
  delete d.context.trailerInfo.Encrypt;
}
reg({
  id: 'unlock-pdf', cat: 'doc', icon: 'unlock', name: 'Unlock PDF',
  desc: 'Remove a password you know, or print/copy limits.',
  long: 'Take the password off a PDF you can open, so you are not asked for it every time — or lift the restrictions that stop you printing, copying or editing your own document. Only for files you have the right to unlock.',
  keys: 'remove password decrypt unprotect restrictions print copy unlock',
  mount(m) {
    const box = h('div');
    const dz = dropzone({
      icon: 'unlock', title: 'Drop a protected PDF here', sub: 'nothing is uploaded — the password never leaves this page',
      accept: 'application/pdf,.pdf', onFiles: async f => {
        if (!isPdf(f[0])) return toast('Not a PDF', 'This tool needs a .pdf file.', true);
        const bs = new Uint8Array(await f[0].arrayBuffer());
        let needPw = false, doc = null;
        try { doc = await pdfjsLib.getDocument({ data: bs.slice(0) }).promise; }
        catch (e) {
          if (e && e.name === 'PasswordException') needPw = true;
          else return toast('Could not open that file', 'It may be damaged or incomplete.', true);
        }
        let restricted = false;
        if (doc) { try { restricted = !!(await doc.getPermissions()); } catch (e) {} }
        dz.hidden = true;
        show({ name: f[0].name, bytes: bs }, needPw, restricted);
      }
    });
    m.append(dz, box);
    function show(info, needPw, restricted) {
      box.innerHTML = '';
      box.append(fileBar(Object.assign({ pages: null }, info), () => remount(m, 'unlock-pdf')));
      const pw = pwd('The password you open it with');
      if (needPw) box.append(panel('Password', [field('Current password', pw)]));
      else box.append(note(restricted
        ? 'This file opens without a password but is <b>restricted</b> (no printing, copying or editing). Unlocking lifts those limits.'
        : 'This file has <b>no password and no restrictions</b> — there is nothing to unlock. You can still re-save it below.'));
      box.append(actions([{ label: needPw ? 'Unlock PDF' : 'Remove restrictions', cls: 'pri', icon: 'unlock', go: run }]));
      const st = stage(box);
      pw.onkeydown = e => { if (e.key === 'Enter') run(); };
      if (needPw) setTimeout(() => pw.focus(), 50);
      async function run() {
        const pass = needPw ? pw.value : '';
        if (needPw && !pass) return st.fail('Type the password first.');
        st.busy('Checking the password…');
        let doc;
        try { doc = await pdfjsDoc(info.bytes, pass || undefined); }
        catch (e) { return st.fail(e.message); }
        try {
          st.busy('Downloading the decryption engine (one time)…');
          const C = await TF.cantoo();
          st.busy('Decrypting…');
          const d = await C.PDFDocument.load(info.bytes.slice(0), { password: pass });
          stripEncryption(C, d);
          const out = await d.save({ useObjectStreams: false });
          await pdfjsDoc(out);                                       /* must now open with no password */
          const blob = pdfBlob(out);
          st.ok('Unlocked', 'No password, no restrictions · ' + bytes(blob.size), [dlPdf(blob, base(info.name) + '-unlocked.pdf')]);
        } catch (e) {
          console.warn('direct decrypt failed, rendering instead', e);
          try {
            const blob = await rasterPdf(doc, { dpi: 170, q: .86, st: st.busy('Re-drawing the pages…'), label: 'Re-drawing' });
            st.ok('Unlocked by re-drawing the pages', 'This file uses an unusual encryption, so each page was redrawn as an image. ' +
              'It opens freely, but text is no longer selectable — run OCR on it if you need that. · ' + bytes(blob.size),
              [dlPdf(blob, base(info.name) + '-unlocked.pdf')]);
          } catch (x) { st.fail('Could not unlock this file: ' + x.message); }
        }
      }
    }
  }
});

/* ============================================================ OCR */
const TESS = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
const LANGS = [['eng', 'English'], ['ara', 'Arabic'], ['eng+ara', 'English + Arabic'], ['fra', 'French'], ['spa', 'Spanish'],
  ['deu', 'German'], ['ita', 'Italian'], ['por', 'Portuguese'], ['nld', 'Dutch'], ['tur', 'Turkish'], ['rus', 'Russian'],
  ['ukr', 'Ukrainian'], ['pol', 'Polish'], ['hin', 'Hindi'], ['urd', 'Urdu'], ['fas', 'Persian'], ['ben', 'Bengali'],
  ['ind', 'Indonesian'], ['vie', 'Vietnamese'], ['chi_sim', 'Chinese (simplified)'], ['chi_tra', 'Chinese (traditional)'],
  ['jpn', 'Japanese'], ['kor', 'Korean']];
reg({
  id: 'ocr', cat: 'doc', icon: 'ocr', name: 'OCR — scan to text', tag: 'Pro feature, free',
  desc: 'Make scans searchable, or pull the text out.',
  long: 'Optical character recognition for scanned PDFs and photos of documents. You get a searchable PDF — it looks identical, but you can now search, select and copy the text — plus the plain text itself. 23 languages including Arabic, Hindi, Urdu and Chinese. The engine and each language download once, then it runs offline.',
  keys: 'ocr scan searchable text recognition image to text extract copy tesseract arabic',
  mount(m) {
    let src = null;
    const box = h('div');
    const dz = dropzone({
      icon: 'ocr', title: 'Drop a scanned PDF or photos of pages', sub: 'PDF, JPEG, PNG, HEIC — several images become one PDF',
      accept: 'application/pdf,.pdf,image/*,.heic,.heif', multiple: true, onFiles: async fs => {
        try {
          if (isPdf(fs[0])) {
            const bs = new Uint8Array(await fs[0].arrayBuffer());
            const doc = await pdfjsDoc(bs);
            src = { kind: 'pdf', name: fs[0].name, bytes: bs, doc: doc, pages: doc.numPages };
          } else {
            const imgs = [];
            for (const f of fs) if (isImg(f)) { try { imgs.push(await decodeImage(f)); } catch (e) { toast('Skipped ' + f.name, e.message, true); } }
            if (!imgs.length) return;
            src = { kind: 'img', name: imgs[0].name, imgs: imgs, pages: imgs.length, size: imgs.reduce((a, b) => a + b.size, 0) };
          }
          dz.hidden = true;
          paint();
        } catch (e) { toast('Could not open that file', e.message, true); }
      }
    });
    m.append(dz, box);
    function paint() {
      box.innerHTML = '';
      box.append(fileBar({ name: src.kind === 'img' && src.imgs.length > 1 ? src.imgs.length + ' images' : src.name,
        pages: src.pages, bytes: src.bytes, size: src.size }, () => remount(m, 'ocr')));
      const lang = sel(LANGS, TF.store.get('ocrLang', 'eng'));
      const skip = check('Skip pages that already have selectable text', true);
      const p = panel('Recognition', [field('Language of the document', lang, 'Pick both if the pages mix two languages')]);
      if (src.kind === 'pdf') { skip.style.marginTop = '14px'; p.append(skip); }
      box.append(p, actions([{ label: 'Recognise text', cls: 'pri', icon: 'ocr', go: run }]));
      const st = stage(box);
      const textOut = h('div');
      box.append(textOut);
      async function run() {
        TF.store.set('ocrLang', lang.value);
        const L = lang.selectedOptions[0].textContent;
        st.busy('Downloading the OCR engine and ' + L + ' (one time, a few MB)…');
        let worker;
        try {
          const T = await TF.lib(TESS, 'Tesseract');
          let curPage = 0;
          worker = await T.createWorker(lang.value, 1, { logger: mm => {
            if (mm.status === 'recognizing text') st.step(curPage + (mm.progress || 0), src.pages, 'Reading page ' + (curPage + 1) + ' of ' + src.pages + '…');
            else if (/loading|initializ/i.test(mm.status || '')) st.step(mm.progress || 0, 1, 'Preparing ' + L + '…');
          } });
          const out = src.kind === 'pdf' ? await pdfLibDoc(src.bytes) : await PDFDocument.create();
          const texts = [];
          let did = 0, skipped = 0, noLayer = false, shot = null;
          for (let i = 0; i < src.pages; i++) {
            curPage = i;
            await nextFrame();
            let cv, page, box2;
            if (src.kind === 'pdf') {
              const pg = await src.doc.getPage(i + 1);
              if (skip.input.checked) {
                const tc = await pg.getTextContent();
                const chars = tc.items.reduce((a, t) => a + (t.str || '').trim().length, 0);
                if (chars > 25) { texts.push(tc.items.map(t => t.str).join(' ')); skipped++; continue; }
              }
              const vp1 = pg.getViewport({ scale: 1 });
              const sc = Math.min(300 / 72, 3400 / Math.max(vp1.width, vp1.height));
              cv = await renderPage(pg, sc);
              page = out.getPage(i);
              const cb = page.getCropBox(), rot = ((page.getRotation().angle % 360) + 360) % 360;
              box2 = { cb: cb, rot: rot, W: rot % 180 ? cb.height : cb.width, H: rot % 180 ? cb.width : cb.height, dpi: 72 * sc };
              pg.cleanup();
            } else {
              const im = src.imgs[i];
              const k0 = Math.min(1, 3400 / Math.max(im.w, im.h));
              cv = TF.drawTo(im.img, im.w * k0, im.h * k0);
              const k = 842 / Math.max(cv.width, cv.height), W = cv.width * k, H = cv.height * k;
              page = out.addPage([W, H]);
              const jpg = await canvasBlob(cv, 'image/jpeg', .85);
              page.drawImage(await out.embedJpg(new Uint8Array(await jpg.arrayBuffer())), { x: 0, y: 0, width: W, height: H });
              box2 = { cb: { x: 0, y: 0, width: W, height: H }, rot: 0, W: W, H: H, dpi: 72 / k };
            }
            await worker.setParameters({ user_defined_dpi: String(Math.max(70, Math.min(1200, Math.round(box2.dpi)))) });
            const { data } = await worker.recognize(cv, { pdfTitle: 'OCR', pdfTextOnly: true }, { text: true, pdf: true, blocks: true });
            texts.push(data.text || '');
            if (!shot) {
              const words = [];
              (data.blocks || []).forEach(b => (b.paragraphs || []).forEach(p => (p.lines || []).forEach(l => (l.words || []).forEach(w => words.push(w)))));
              const k = Math.min(1, 760 / cv.width), sc = TF.drawTo(cv, cv.width * k, cv.height * k);
              shot = { cv: sc, k: k, words: words, page: i + 1 };
            }
            if (data.pdf && data.pdf.length) {
              const [emb] = await out.embedPdf(new Uint8Array(data.pdf), [0]);
              const { cb, rot, W, H } = box2;
              const pos = rot === 90 ? [cb.x + cb.width, cb.y] : rot === 180 ? [cb.x + cb.width, cb.y + cb.height]
                : rot === 270 ? [cb.x, cb.y + cb.height] : [cb.x, cb.y];
              page.drawPage(emb, { x: pos[0], y: pos[1], width: W, height: H, rotate: degrees(rot) });
            } else noLayer = true;
            did++;
          }
          await worker.terminate(); worker = null;
          const fullText = texts.map((t, i) => (src.pages > 1 ? '— Page ' + (i + 1) + ' —\n' : '') + t.trim()).join('\n\n');
          const pdf = pdfBlob(await out.save());
          const txtBlob = new Blob(['﻿' + fullText], { type: 'text/plain;charset=utf-8' });
          st.ok(did ? 'Text recognised on ' + did + (did === 1 ? ' page' : ' pages') : 'Nothing needed recognising',
            (skipped ? skipped + ' page' + (skipped > 1 ? 's' : '') + ' already had text and were left as they were. ' : '') +
            (noLayer ? 'The text layer could not be added, but the text is below. ' : 'The PDF now has a hidden, searchable text layer. ') + bytes(pdf.size),
            [{ label: 'Download searchable PDF', pri: true, icon: 'download', go: () => dl(pdf, base(src.name) + '-ocr.pdf') },
             { label: 'Download text (.txt)', icon: 'download', go: () => dl(txtBlob, base(src.name) + '.txt') },
             { label: 'Copy text', go: () => navigator.clipboard.writeText(fullText).then(() => toast('Copied', fullText.length + ' characters'), () => toast('Could not copy', 'Select it below instead.', true)) }]);
          textOut.innerHTML = '';
          if (shot && shot.words.length) {
            /* show exactly which words were read, coloured by how sure the engine is */
            const x = shot.cv.getContext('2d');
            shot.words.forEach(w => {
              const c = w.confidence >= 80 ? '15,190,110' : w.confidence >= 55 ? '230,160,30' : '229,72,77';
              x.fillStyle = 'rgba(' + c + ',.18)'; x.strokeStyle = 'rgba(' + c + ',.9)'; x.lineWidth = 1.2;
              const b = w.bbox, r = [b.x0 * shot.k, b.y0 * shot.k, (b.x1 - b.x0) * shot.k, (b.y1 - b.y0) * shot.k];
              x.fillRect.apply(x, r); x.strokeRect.apply(x, r);
            });
            const low = shot.words.filter(w => w.confidence < 55).length;
            const lv = h('div', 'livepv'); lv.style.marginTop = '14px';
            lv.append(shot.cv, h('span', 'cap', 'Page ' + shot.page + ': ' + shot.words.length + ' words found. Green = confident, amber = likely, red = check by eye' + (low ? ' (' + low + ' red)' : '') + '.'));
            textOut.append(lv);
          }
          const ta = TF.area(fullText, 14);
          ta.dir = 'auto'; ta.style.marginTop = '14px'; ta.style.fontFamily = 'var(--sans)';
          textOut.append(ta, note('OCR is very good on clean print and weaker on handwriting, tiny text or poor photos. Check names and numbers before you rely on them.'));
        } catch (e) {
          console.error(e);
          if (worker) try { await worker.terminate(); } catch (x) {}
          st.fail('OCR failed: ' + (e && e.message || e));
        }
      }
    }
  }
});

/* ============================================================ PDF → Word / Excel / text */
const xmlEsc = s => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const RTLRE = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
function columnize(lines) {
  const xs = [];
  lines.forEach(L => L.cells.forEach(c => xs.push(c.k)));
  xs.sort((a, b) => a - b);
  const cols = [];
  xs.forEach(x => { const c = cols[cols.length - 1]; if (!c || x - c.max > 10) cols.push({ min: x, max: x }); else c.max = x; });
  const rows = lines.map(L => {
    const row = cols.map(() => '');
    L.cells.forEach(c => {
      let j = cols.findIndex(cl => c.k >= cl.min - 3 && c.k <= cl.max + 3);
      if (j < 0) j = 0;
      row[j] = row[j] ? row[j] + ' ' + c.s : c.s;
    });
    return row;
  });
  const keep = cols.map((_, j) => rows.some(r => r[j]));
  return rows.map(r => r.filter((_, j) => keep[j]));
}
/* group a page's lines into paragraphs and tables */
function blocks(pg, median) {
  const out = [];
  let cur = null;
  pg.lines.forEach((L, i) => {
    const prev = pg.lines[i - 1];
    const gap = prev ? L.y - prev.y : 1e9;
    const tab = L.cells.length >= 2;
    if (tab) {
      if (cur && cur.t === 'table' && gap < L.h * 2.6) cur.lines.push(L);
      else { cur = { t: 'table', lines: [L] }; out.push(cur); }
      return;
    }
    const head = L.h >= median * 1.3;
    if (cur && cur.t === 'p' && gap < L.h * 1.75 && Math.abs(L.h - cur.h) < cur.h * .2 && cur.head === head) {
      const last = cur.text;
      cur.text = /[-­]$/.test(last) && /^[a-z]/.test(L.text) ? last.replace(/[-­]$/, '') + L.text : last + ' ' + L.text;
    } else { cur = { t: 'p', text: L.text, h: L.h, head: head, rtl: L.rtl }; out.push(cur); }
  });
  /* a "table" of one line is just a line with a wide gap */
  return out.map(b => b.t === 'table' && b.lines.length < 2 ? { t: 'p', text: b.lines[0].cells.map(c => c.s).join('    '), h: b.lines[0].h, head: false, rtl: b.lines[0].rtl } : b);
}
function docxFrom(pages) {
  const all = []; pages.forEach(p => p.lines.forEach(L => all.push(L.h)));
  all.sort((a, b) => a - b);
  const median = all[all.length >> 1] || 11;
  const run = (t, sz, bold, rtl) => '<w:r><w:rPr>' + (bold ? '<w:b/><w:bCs/>' : '') + (rtl ? '<w:rtl/>' : '') +
    '<w:sz w:val="' + sz + '"/><w:szCs w:val="' + sz + '"/></w:rPr><w:t xml:space="preserve">' + xmlEsc(t) + '</w:t></w:r>';
  const para = (t, sz, bold, rtl) => '<w:p><w:pPr>' + (rtl ? '<w:bidi/>' : '') + '<w:spacing w:after="' + (bold ? 120 : 160) + '"/></w:pPr>' + run(t, sz, bold, rtl) + '</w:p>';
  const B = 'w:val="single" w:sz="4" w:space="0" w:color="BFBFBF"';
  let body = '';
  pages.forEach((pg, pi) => {
    if (pi) body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    blocks(pg, median).forEach(b => {
      if (b.t === 'p') {
        const sz = b.head ? Math.min(56, Math.max(26, Math.round(b.h * 1.7))) : 22;
        body += para(b.text, sz, b.head, b.rtl || RTLRE.test(b.text));
      } else {
        const rows = columnize(b.lines), n = Math.max(...rows.map(r => r.length));
        body += '<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top ' + B + '/><w:left ' + B + '/><w:bottom ' + B +
          '/><w:right ' + B + '/><w:insideH ' + B + '/><w:insideV ' + B + '/></w:tblBorders></w:tblPr><w:tblGrid>' +
          '<w:gridCol/>'.repeat(n) + '</w:tblGrid>' + rows.map(r => '<w:tr>' + Array.from({ length: n }, (_, j) =>
            '<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p>' + (r[j] ? run(r[j], 20, false, RTLRE.test(r[j])) : '') + '</w:p></w:tc>').join('') + '</w:tr>').join('') +
          '</w:tbl><w:p/>';
      }
    });
  });
  const W = Math.round((pages[0] ? pages[0].w : 595) * 20), H = Math.round((pages[0] ? pages[0].h : 842) * 20);
  const doc = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    body + '<w:sectPr><w:pgSz w:w="' + W + '" w:h="' + H + '"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>';
  const z = new JSZip();
  z.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file('word/document.xml', doc);
  return z.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', compression: 'DEFLATE' });
}
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const cellVal = s => {
  const t = String(s).trim();
  if (/^-?\(?[\d,]*\.?\d+\)?$/.test(t) && /\d/.test(t) && !/^0\d/.test(t)) {
    const n = Number(t.replace(/[,()]/g, ''));
    if (isFinite(n)) return /^\(.*\)$/.test(t) ? -n : n;
  }
  return t;
};
reg({
  id: 'pdf-to-office', cat: 'doc', icon: 'table', name: 'PDF to Word, Excel & text',
  desc: 'Get editable text and tables out of a PDF.',
  long: 'Turn a PDF into a Word document you can edit, pull its tables into Excel, or just get the text. Paragraphs, headings and tables come across; exact layout, images and fonts do not — no converter gets that perfect, and we would rather say so up front. Scanned pages need OCR first.',
  keys: 'pdf to word docx excel xlsx csv convert extract text table editable doc',
  mount(m) {
    onePdf(m, {
      onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'pdf-to-office')));
        let fmt = 'docx';
        const s = TF.choice([['docx', 'file', 'Word', 'Editable text and real tables'], ['xlsx', 'table', 'Excel', 'Tables as rows and columns'],
          ['csv', 'table', 'CSV', 'Every table in one simple file'], ['txt', 'type', 'Plain text', 'Just the words, in order']], 'docx', v => { fmt = v; one.hidden = v !== 'xlsx'; });
        s.classList.add('compact');
        const one = check('Put every page on one sheet', false);
        const p = h('div', 'panel');
        p.append(h('h4', null, 'Convert to'), s, one);
        one.style.marginTop = '12px'; one.hidden = true;
        /* show what was found on page 1, so the result is no surprise */
        const pv = h('div', 'livepv'), cv = h('canvas');
        pv.append(cv, h('span', 'cap', 'Page 1 as we read it: blue = paragraph, orange = heading, green = table row (ticks mark columns). Grey = nothing readable.'));
        p.append(h('div', 'pgl', 'What we found'), pv);
        pdfLines(info.doc, 0).then(async pg => {
          const img = await TF.loadImg(await TF.pageThumb(info.doc, 0, 640)), k = 640 / pg.w, x = cv.getContext('2d');
          cv.width = 640; cv.height = Math.round(pg.h * k);
          x.drawImage(img, 0, 0, cv.width, cv.height);
          const hs = pg.lines.map(L => L.h).sort((a2, b2) => a2 - b2), med = hs[hs.length >> 1] || 11;
          const tl = new Set(); blocks(pg, med).forEach(bk => { if (bk.t === 'table') bk.lines.forEach(L => tl.add(L)); });
          if (!pg.lines.length) { x.fillStyle = 'rgba(125,136,132,.35)'; x.fillRect(0, 0, cv.width, cv.height); return; }
          pg.lines.forEach(L => {
            const c = tl.has(L) ? '15,170,100' : L.h >= med * 1.3 ? '220,120,30' : '42,111,189';
            const r = [L.x0 * k - 2, (L.y - L.h) * k - 2, (L.x1 - L.x0) * k + 4, L.h * 1.25 * k + 4];
            x.fillStyle = 'rgba(' + c + ',.16)'; x.strokeStyle = 'rgba(' + c + ',.85)'; x.lineWidth = 1.2;
            x.fillRect.apply(x, r); x.strokeRect.apply(x, r);
            if (tl.has(L) && !L.rtl) L.cells.forEach(cc => { x.fillStyle = 'rgba(15,170,100,.95)'; x.fillRect(cc.k * k - 1, r[1], 2.5, r[3]); });
          });
        }).catch(() => { pv.hidden = true; });
        let btn;
        const pick = TF.pagePicker(info.doc, { onChange: sl => { if (btn) btn.disabled = !sl.length; } });
        const pp = h('div', 'panel'); pp.append(h('h4', null, 'Pages'), pick);
        const pre = TF.presetFor('pdf-to-office');
        if (pre.fmt) s.set(pre.fmt);
        body.append(p, pp, actions([{ label: 'Convert', cls: 'pri', icon: 'refresh', ref: x2 => btn = x2, go: run }]));
        const st = stage(body);
        async function run() {
          const idx = pick.selected();
          if (!idx.length) return st.fail('Click at least one page.');
          st.busy('Reading the text…');
          try {
            const pages = [];
            for (let i = 0; i < idx.length; i++) {
              st.step(i, idx.length, 'Reading page ' + (idx[i] + 1));
              pages.push(Object.assign(await pdfLines(info.doc, idx[i]), { n: idx[i] + 1 }));
            }
            const chars = pages.reduce((a, p) => a + p.lines.reduce((b, L) => b + L.text.length, 0), 0);
            if (chars < 20 * pages.length) {
              const r = st.ok('This looks like a scan', 'There is almost no real text in these pages — they are pictures of text. Run OCR on the file first, then convert the result.',
                [{ label: 'Open OCR', pri: true, icon: 'ocr', go: () => { location.hash = '#/ocr'; } }]);
              r.className = 'warn';
              return;
            }
            const nm = base(info.name);
            if (fmt === 'txt') {
              const all = pages.map(p => {
                const med = p.lines.map(L => L.h).sort((a, b) => a - b)[p.lines.length >> 1] || 11;
                return blocks(p, med).map(b => b.t === 'p' ? b.text : columnize(b.lines).map(r => r.join('\t')).join('\n')).join('\n\n');
              }).join('\n\n\f');
              const b = new Blob(['﻿' + all], { type: 'text/plain;charset=utf-8' });
              st.ok('Text extracted', all.length.toLocaleString() + ' characters', [{ label: 'Download .txt', pri: true, icon: 'download', go: () => dl(b, nm + '.txt') },
                { label: 'Copy', go: () => navigator.clipboard.writeText(all).then(() => toast('Copied', ''), () => {}) }]);
            } else if (fmt === 'docx') {
              const b = await docxFrom(pages);
              st.ok('Word document ready', pages.length + (pages.length === 1 ? ' page · ' : ' pages · ') + bytes(b.size),
                [{ label: 'Download .docx', pri: true, icon: 'download', go: () => dl(b, nm + '.docx') }]);
            } else {
              st.busy('Building the spreadsheet…');
              const X = await TF.lib(XLSX_URL, 'XLSX');
              const sheets = pages.map(p => {
                const tables = blocks(p, 11).filter(b => b.t === 'table');
                const rows = [];
                (tables.length ? tables : [{ lines: p.lines }]).forEach((t, ti) => {
                  if (ti) rows.push([]);
                  columnize(t.lines).forEach(r => rows.push(r.map(cellVal)));
                });
                return { name: 'Page ' + p.n, rows: rows };
              });
              if (fmt === 'csv' || one.input.checked) {
                const rows = [];
                sheets.forEach((s2, i) => { if (i) rows.push([]); s2.rows.forEach(r => rows.push(r)); });
                const ws = X.utils.aoa_to_sheet(rows);
                if (fmt === 'csv') {
                  const b = new Blob(['﻿' + X.utils.sheet_to_csv(ws)], { type: 'text/csv;charset=utf-8' });
                  return st.ok('CSV ready', rows.length + ' rows', [{ label: 'Download .csv', pri: true, icon: 'download', go: () => dl(b, nm + '.csv') }]);
                }
                const wb = X.utils.book_new();
                X.utils.book_append_sheet(wb, ws, 'All pages');
                const b = new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                return st.ok('Spreadsheet ready', rows.length + ' rows', [{ label: 'Download .xlsx', pri: true, icon: 'download', go: () => dl(b, nm + '.xlsx') }]);
              }
              const wb = X.utils.book_new();
              sheets.forEach(s2 => X.utils.book_append_sheet(wb, X.utils.aoa_to_sheet(s2.rows), s2.name));
              const b = new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              st.ok('Spreadsheet ready', sheets.length + (sheets.length === 1 ? ' sheet · ' : ' sheets, one per page · ') + bytes(b.size),
                [{ label: 'Download .xlsx', pri: true, icon: 'download', go: () => dl(b, nm + '.xlsx') }]);
            }
          } catch (e) { console.error(e); st.fail('Conversion failed: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ crop / resize / n-up / booklet */
reg({
  id: 'page-layout', cat: 'doc', icon: 'layout', name: 'Crop, resize & print layout',
  desc: 'Trim margins, fit to A4, 2 or 4 per sheet, booklets.',
  long: 'Trim white margins off pages, make every page exactly A4 or Letter, put 2, 4, 6 or 8 pages on each sheet to save paper, or impose a booklet you can fold and staple. The print-shop tools, free.',
  keys: 'crop trim margins resize page size a4 letter scale fit n-up 2-up 4-up booklet imposition print handout',
  mount(m) {
    onePdf(m, {
      async onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'page-layout')));
        const pg1 = await info.doc.getPage(1), vp1 = pg1.getViewport({ scale: 1 });
        const thumbs = [];
        const thumbOf = async i => thumbs[i] || (thumbs[i] = await TF.loadImg(await TF.pageThumb(info.doc, i, 260)));
        let mode = 'crop';
        const box = h('div', 'panel');
        const s = TF.choice([['crop', 'crop', 'Trim margins', 'Drag the edges on the page'], ['fit', 'resize', 'Resize pages', 'Make every page A4 or Letter'],
          ['nup', 'pages', 'Pages per sheet', '2, 4, 6 or 8 on one sheet'], ['booklet', 'layers', 'Booklet', 'Fold-and-staple order']], 'crop', v => { mode = v; paint(); });
        box.append(h('h4', null, 'What to do'), s);
        const g = h('div', 'fields'); g.style.marginTop = '14px';
        const hint = h('div', 'note');
        const pvWrap = h('div', 'livepv'); pvWrap.style.marginTop = '14px';
        box.append(g, hint, pvWrap);
        const pick = TF.pagePicker(info.doc);
        const pp = h('div', 'panel'); pp.append(h('h4', null, 'Pages to trim'), pick);
        body.append(box, pp, actions([{ label: 'Apply', cls: 'pri', icon: 'layout', go: run }]));
        const st = stage(body);
        const C = { t: num(10, 0, 500, .5), r: num(10, 0, 500, .5), b: num(10, 0, 500, .5), l: num(10, 0, 500, .5) };
        const F = { size: sel(SIZE_OPTS, 'a4'), orient: sel([['auto', 'Match each page'], ['p', 'Portrait'], ['l', 'Landscape']], 'auto'),
          margin: num(0, 0, 100, 1), grow: check('Enlarge pages smaller than the sheet', true) };
        const N = { per: sel([['2', '2 per sheet'], ['4', '4 per sheet'], ['6', '6 per sheet'], ['8', '8 per sheet']], '2'),
          size: sel(SIZE_OPTS.slice(0, 2), 'a4'), gap: num(6, 0, 50), border: check('Draw a thin border round each page', false) };
        const Bk = { size: sel(SIZE_OPTS.slice(0, 2), 'a4') };
        [F.size, F.orient, F.margin, F.grow.input, N.per, N.size, N.gap, N.border.input, Bk.size].forEach(c => { c.addEventListener('input', sheet); c.addEventListener('change', sheet); });
        function paint() {
          g.innerHTML = ''; pvWrap.innerHTML = '';
          pp.hidden = mode !== 'crop';
          if (mode === 'crop') {
            g.append(field('Top (mm)', C.t), field('Right (mm)', C.r), field('Bottom (mm)', C.b), field('Left (mm)', C.l));
            hint.textContent = 'Drag the green edges on the page, or type the margins. The dimmed area is removed.';
            cropView();
          } else if (mode === 'fit') {
            g.append(field('Page size', F.size), field('Orientation', F.orient), field('Margin (mm)', F.margin), F.grow);
            hint.textContent = 'Every page is scaled to fit the new size and centred, keeping its proportions.';
            sheet();
          } else if (mode === 'nup') {
            g.append(field('Layout', N.per), field('Sheet', N.size), field('Gap (pt)', N.gap), N.border);
            hint.textContent = 'Pages are shrunk and laid out in reading order — handy for handouts and slides.';
            sheet();
          } else {
            g.append(field('Sheet', Bk.size));
            hint.textContent = 'Print double-sided (flip on the short edge), fold the stack in half and staple — pages read in order. Blank pages are added to make a multiple of four.';
            sheet();
          }
        }
        /* crop: drag the four edges directly on page 1 (the number boxes do the same from the keyboard) */
        function cropView() {
          const W = vp1.width, H = vp1.height;
          const wrap = h('div', 'pv'); wrap.style.cssText = 'max-width:340px;margin:0 auto;touch-action:none';
          const img = h('img'); img.alt = 'Page 1'; wrap.append(img);
          TF.pageThumb(info.doc, 0, 520).then(u => { img.src = u; });
          const keep = h('div'); keep.style.cssText = 'position:absolute;box-shadow:0 0 0 9999px rgba(15,20,18,.5);outline:2px solid #0FBE6E;pointer-events:none';
          wrap.append(keep);
          const hs = {};
          ['t', 'r', 'b', 'l'].forEach(k => {
            const e = h('div'); hs[k] = e;
            e.style.cssText = 'position:absolute;background:#0FBE6E;border:2px solid #fff;border-radius:6px;touch-action:none;' +
              (k === 't' || k === 'b' ? 'width:44px;height:12px;margin:-6px 0 0 -22px;cursor:ns-resize' : 'width:12px;height:44px;margin:-22px 0 0 -6px;cursor:ew-resize');
            e.setAttribute('aria-hidden', 'true');
            e.addEventListener('pointerdown', ev => {
              ev.preventDefault(); e.setPointerCapture(ev.pointerId);
              const mv = em => {
                const r = wrap.getBoundingClientRect(), fx = (em.clientX - r.left) / r.width, fy = (em.clientY - r.top) / r.height;
                const mm = v => Math.max(0, Math.round(v / MM * 2) / 2);
                if (k === 't') C.t.value = mm(fy * H);
                if (k === 'b') C.b.value = mm((1 - fy) * H);
                if (k === 'l') C.l.value = mm(fx * W);
                if (k === 'r') C.r.value = mm((1 - fx) * W);
                draw();
              };
              const up = () => { e.removeEventListener('pointermove', mv); e.removeEventListener('pointerup', up); };
              e.addEventListener('pointermove', mv); e.addEventListener('pointerup', up);
            });
            wrap.append(e);
          });
          pvWrap.append(wrap);
          const draw = () => {
            const t = (+C.t.value || 0) * MM / H * 100, r = (+C.r.value || 0) * MM / W * 100, b = (+C.b.value || 0) * MM / H * 100, l = (+C.l.value || 0) * MM / W * 100;
            Object.assign(keep.style, { left: l + '%', top: t + '%', width: Math.max(0, 100 - l - r) + '%', height: Math.max(0, 100 - t - b) + '%' });
            const cx = l + (100 - l - r) / 2, cy = t + (100 - t - b) / 2;
            Object.assign(hs.t.style, { left: cx + '%', top: t + '%' }); Object.assign(hs.b.style, { left: cx + '%', top: (100 - b) + '%' });
            Object.assign(hs.l.style, { left: l + '%', top: cy + '%' }); Object.assign(hs.r.style, { left: (100 - r) + '%', top: cy + '%' });
          };
          [C.t, C.r, C.b, C.l].forEach(c => { c.oninput = draw; });
          draw();
        }
        /* resize / n-up / booklet: draw the first sheet with the real page thumbnails on it */
        async function sheet() {
          if (mode === 'crop') return;
          const my = mode;
          let base0, land, cols = 1, rows = 1, pages = [0], back = null, mg = 18;
          if (mode === 'fit') { base0 = SIZES[F.size.value]; land = F.orient.value === 'l' || (F.orient.value === 'auto' && vp1.width > vp1.height); mg = (+F.margin.value || 0) * MM; }
          else if (mode === 'nup') {
            const per = +N.per.value, gr = { 2: [2, 1, 1], 4: [2, 2, 0], 6: [2, 3, 0], 8: [4, 2, 1] }[per];
            base0 = SIZES[N.size.value]; land = !!gr[2]; cols = gr[0]; rows = gr[1]; pages = Array.from({ length: per }, (_, i) => i);
          } else { base0 = SIZES[Bk.size.value]; land = true; cols = 2; const n = Math.ceil(info.pages / 4) * 4; pages = [n - 1, 0]; back = [1, n - 2]; }
          const W = land ? base0[1] : base0[0], H = land ? base0[0] : base0[1], k = 300 / Math.max(W, H);
          const draw1 = async (list, label) => {
            const c = TF.h2c(W * k + 2, H * k + 2), x = c.ctx;
            x.fillStyle = '#fff'; x.fillRect(0, 0, c.cv.width, c.cv.height); x.strokeStyle = '#C7CDCA'; x.strokeRect(.5, .5, W * k + 1, H * k + 1);
            const gap = mode === 'nup' ? (+N.gap.value || 0) : mode === 'booklet' ? 28 : 0, m0 = mode === 'booklet' ? 14 : mg;
            const cw = (W - 2 * m0 - (cols - 1) * gap) / cols, ch = (H - 2 * m0 - (rows - 1) * gap) / rows;
            for (let j = 0; j < list.length; j++) {
              const pi = list[j], cx0 = m0 + (j % cols) * (cw + gap), cy0 = m0 + Math.floor(j / cols) * (ch + gap);
              if (pi >= info.pages) {
                x.fillStyle = '#F7F8F6'; x.fillRect(cx0 * k, cy0 * k, cw * k, ch * k);
                x.fillStyle = '#9AA5A1'; x.font = '11px sans-serif'; x.textAlign = 'center'; x.fillText('blank', (cx0 + cw / 2) * k, (cy0 + ch / 2) * k);
                continue;
              }
              const im = await thumbOf(pi);
              const pw = vp1.width * im.naturalWidth / 260, ph = pw * im.naturalHeight / im.naturalWidth;
              let s2 = Math.min(cw / pw, ch / ph);
              if (mode === 'fit' && !F.grow.input.checked) s2 = Math.min(s2, 1);
              const w2 = pw * s2, h2 = ph * s2, px = (cx0 + (cw - w2) / 2) * k, py = (cy0 + (ch - h2) / 2) * k;
              x.drawImage(im, px, py, w2 * k, h2 * k);
              x.strokeStyle = 'rgba(15,190,110,.7)'; x.strokeRect(px, py, w2 * k, h2 * k);
              x.fillStyle = '#0A9A58'; x.font = '700 11px sans-serif'; x.textAlign = 'left'; x.fillText(String(pi + 1), px + 4, py + 13);
            }
            const f = h('figure'); f.style.cssText = 'display:inline-block;margin:0 8px;line-height:1.4';
            f.append(c.cv, h('figcaption', 'cap', esc(label)));
            return f;
          };
          const figs = [await draw1(pages, mode === 'booklet' ? 'Sheet 1, front' : 'Sheet 1')];
          if (back) figs.push(await draw1(back, 'Sheet 1, back'));
          if (my !== mode) return;
          pvWrap.innerHTML = ''; figs.forEach(f => pvWrap.append(f));
        }
        paint();

        async function run() {
          st.busy('Working…');
          try {
            const src = await pdfLibDoc(info.bytes);
            const pages = src.getPages();
            let out, label;
            if (mode === 'crop') {
              const idx = pick.selected();
              if (!idx.length) throw new Error('Click at least one page to trim.');
              const vis = [C.t, C.r, C.b, C.l].map(c => (+c.value || 0) * MM);
              idx.forEach(i => {
                const p = pages[i], k = (((p.getRotation().angle % 360) + 360) % 360) / 90;
                const sTRBL = [0, 1, 2, 3].map(j => vis[(j + k) % 4]);
                const b = p.getCropBox();
                const w = b.width - sTRBL[1] - sTRBL[3], hh = b.height - sTRBL[0] - sTRBL[2];
                if (w < 20 || hh < 20) throw new Error('Those margins leave nothing of page ' + (i + 1) + '.');
                p.setCropBox(b.x + sTRBL[3], b.y + sTRBL[2], w, hh);
                p.setMediaBox(b.x + sTRBL[3], b.y + sTRBL[2], w, hh);
                try { p.setTrimBox(b.x + sTRBL[3], b.y + sTRBL[2], w, hh); p.setBleedBox(b.x + sTRBL[3], b.y + sTRBL[2], w, hh); } catch (e) {}
              });
              out = src; label = 'Cropped ' + idx.length + (idx.length === 1 ? ' page' : ' pages');
            } else {
              out = await PDFDocument.create();
              const embs = [];
              for (let i = 0; i < pages.length; i++) {
                st.step(i, pages.length, 'Preparing page ' + (i + 1));
                const e = await embedShown(out, pages[i]), rot = ((pages[i].getRotation().angle % 360) + 360) % 360;
                embs.push({ e: e, rot: rot, w: rot % 180 ? e.height : e.width, h: rot % 180 ? e.width : e.height });
              }
              const put = (page, E, x, y, bw, bh, grow) => {
                let k = Math.min(bw / E.w, bh / E.h);
                if (!grow) k = Math.min(k, 1);
                const w = E.w * k, hh = E.h * k;
                placePage(page, E.e, E.rot, x + (bw - w) / 2, y + (bh - hh) / 2, w, hh);
                return { x: x + (bw - w) / 2, y: y + (bh - hh) / 2, w: w, h: hh };
              };
              if (mode === 'fit') {
                const base0 = SIZES[F.size.value], mg = (+F.margin.value || 0) * MM;
                embs.forEach(E => {
                  const land = F.orient.value === 'l' || (F.orient.value === 'auto' && E.w > E.h);
                  const W = land ? base0[1] : base0[0], H = land ? base0[0] : base0[1];
                  put(out.addPage([W, H]), E, mg, mg, W - 2 * mg, H - 2 * mg, F.grow.input.checked);
                });
                label = 'Resized ' + embs.length + ' pages to ' + F.size.selectedOptions[0].textContent;
              } else if (mode === 'nup') {
                const per = +N.per.value, grid = { 2: [2, 1, 1], 4: [2, 2, 0], 6: [2, 3, 0], 8: [4, 2, 1] }[per];
                const b0 = SIZES[N.size.value], W = grid[2] ? b0[1] : b0[0], H = grid[2] ? b0[0] : b0[1];
                const mg = 18, gap = +N.gap.value || 0;
                const cw = (W - 2 * mg - (grid[0] - 1) * gap) / grid[0], ch = (H - 2 * mg - (grid[1] - 1) * gap) / grid[1];
                for (let i = 0; i < embs.length; i += per) {
                  const page = out.addPage([W, H]);
                  for (let j = 0; j < per && i + j < embs.length; j++) {
                    const c = j % grid[0], r = Math.floor(j / grid[0]);
                    const R = put(page, embs[i + j], mg + c * (cw + gap), H - mg - (r + 1) * ch - r * gap, cw, ch, true);
                    if (N.border.input.checked) page.drawRectangle({ x: R.x, y: R.y, width: R.w, height: R.h, borderColor: rgb(.7, .72, .71), borderWidth: .5 });
                  }
                }
                label = embs.length + ' pages → ' + out.getPageCount() + ' sheets';
              } else {
                const b0 = SIZES[Bk.size.value], W = b0[1], H = b0[0];
                const n = Math.ceil(embs.length / 4) * 4, at = i => i < embs.length ? embs[i] : null;
                const half = (page, E, left) => { if (E) put(page, E, left ? 14 : W / 2 + 14, 14, W / 2 - 28, H - 28, true); };
                for (let s2 = 0; s2 < n / 4; s2++) {
                  let pg = out.addPage([W, H]); half(pg, at(n - 1 - 2 * s2), true); half(pg, at(2 * s2), false);
                  pg = out.addPage([W, H]); half(pg, at(2 * s2 + 1), true); half(pg, at(n - 2 - 2 * s2), false);
                }
                label = 'Booklet of ' + n / 4 + (n / 4 === 1 ? ' sheet' : ' sheets') + ' (' + out.getPageCount() + ' sides)';
              }
            }
            const blob = pdfBlob(await out.save());
            st.ok(label, bytes(blob.size) + (mode === 'booklet' ? ' · print double-sided, flip on the short edge' : ''),
              [dlPdf(blob, base(info.name) + '-' + mode + '.pdf')]);
          } catch (e) { console.error(e); st.fail(e.message); }
        }
      }
    });
  }
});

/* ============================================================ flatten */
reg({
  id: 'flatten-pdf', cat: 'doc', icon: 'layers', name: 'Flatten PDF',
  desc: 'Lock in form answers, comments and stamps.',
  long: 'Turn filled-in form fields into ordinary page content so the answers can no longer be changed and nobody gets an editable form. “Everything” also bakes in comments, highlights and stamps by redrawing each page.',
  keys: 'flatten form fields annotations comments lock layers bake',
  mount(m) {
    onePdf(m, {
      onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'flatten-pdf')));
        let mode = 'forms';
        const dpi = sel([['200', 'High — 200 DPI'], ['150', 'Good — 150 DPI']], '200');
        const df = field('Resolution', dpi);
        const s = TF.choice([['forms', 'form', 'Form fields only', 'Answers become fixed text. Everything stays sharp and selectable.'],
          ['all', 'layers', 'Everything', 'Comments, highlights and stamps are burned in too. Pages become images.']], 'forms', v => { mode = v; df.hidden = v !== 'all'; });
        df.hidden = true;
        const p = h('div', 'panel'); p.append(h('h4', null, 'What to lock in'), s);
        const g = h('div', 'fields'); g.style.marginTop = '14px'; g.append(df); p.append(g);
        body.append(p, actions([{ label: 'Flatten', cls: 'pri', icon: 'layers', go: run }]));
        const st = stage(body);
        async function run() {
          st.busy('Flattening…');
          try {
            let blob, msg;
            if (mode === 'forms') {
              const d = await pdfLibDoc(info.bytes), form = d.getForm(), n = form.getFields().length;
              if (!n) return st.fail('This PDF has no form fields. Choose “Everything” to flatten comments, highlights and stamps instead.');
              try { form.flatten({ updateFieldAppearances: false }); }
              catch (e) {
                form.getFields().forEach(f => { try { form.markFieldAsDirty(f.ref); } catch (x) {} });
                try { form.updateFieldAppearances(); form.flatten({ updateFieldAppearances: false }); }
                catch (x) { return st.fail('Some fields could not be drawn. Choose “Everything” instead — it always works.'); }
              }
              try { if (form.hasXFA()) form.deleteXFA(); } catch (e) {}
              blob = pdfBlob(await d.save({ updateFieldAppearances: false }));
              msg = n + (n === 1 ? ' field' : ' fields') + ' flattened';
            } else {
              blob = await rasterPdf(info.doc, { dpi: +dpi.value, q: .88, st: st });
              msg = info.pages + (info.pages === 1 ? ' page' : ' pages') + ' flattened';
            }
            st.ok(msg, bytes(blob.size), [dlPdf(blob, base(info.name) + '-flat.pdf')]);
          } catch (e) { st.fail('Could not flatten: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ compare */
reg({
  id: 'compare-pdf', cat: 'doc', icon: 'diff', name: 'Compare PDFs',
  desc: 'See exactly what changed between two versions.',
  long: 'Drop the original and the revised version. Every added and deleted word is highlighted, and a page-by-page visual overlay catches what text comparison misses — a moved logo, a new signature, an altered figure. Usually an Acrobat Pro feature.',
  keys: 'compare diff difference versions contract redline changes track revision',
  mount(m) {
    const docs = [null, null];
    const pick = h('div', 'fields');
    const out = h('div');
    ['Original', 'Revised'].forEach((label, i) => {
      const slot = h('div');
      const dz = dropzone({ small: true, title: label + ' PDF', sub: 'drop or click', accept: 'application/pdf,.pdf', onFiles: async f => {
        try {
          const bs = new Uint8Array(await f[0].arrayBuffer());
          docs[i] = { name: f[0].name, bytes: bs, doc: await pdfjsDoc(bs) };
          docs[i].pages = docs[i].doc.numPages;
          slot.innerHTML = '';
          slot.append(fileBar(docs[i], () => { docs[i] = null; slot.innerHTML = ''; slot.append(dz); out.innerHTML = ''; }));
          if (docs[0] && docs[1]) compare();
        } catch (e) { toast('Could not open ' + f[0].name, e.message, true); }
      } });
      slot.append(dz);
      pick.append(slot);
    });
    m.append(pick, out);
    async function compare() {
      out.innerHTML = '';
      const st = stage(out);
      st.busy('Reading both documents…');
      try {
        const lines = [[], []];
        for (let d = 0; d < 2; d++) for (let i = 0; i < docs[d].pages; i++) {
          st.step(d * 50 + i / docs[d].pages * 50, 100);
          (await pdfLines(docs[d].doc, i)).lines.forEach(L => lines[d].push({ s: L.cells.map(c => c.s).join(' ').replace(/\s+/g, ' ').trim(), p: i + 1 }));
        }
        const ops = diff(lines[0].map(l => l.s), lines[1].map(l => l.s), 5000);
        st.clear();
        let ia = 0, ib = 0, added = 0, removed = 0, changes = 0;
        const view = h('div', 'diff');
        let eq = [], dels = [], adds = [];
        const words = s => s.split(/(\s+)/).filter(Boolean);
        const flushEq = last => {
          if (!eq.length) return;
          const keep = 2;
          if (eq.length > keep * 2 + 1) {
            const head = changes ? eq.slice(0, keep) : [], tail = last ? [] : eq.slice(-keep);
            head.forEach(t => view.append(document.createTextNode(t + '\n')));
            view.append(h('span', 'skip', '… ' + (eq.length - head.length - tail.length) + ' unchanged lines …'));
            tail.forEach(t => view.append(document.createTextNode(t + '\n')));
          } else eq.forEach(t => view.append(document.createTextNode(t + '\n')));
          eq = [];
        };
        const flushChg = () => {
          if (!dels.length && !adds.length) return;
          changes++;
          const where = h('span', 'skip', 'Change ' + changes + ' — page ' + (dels.length ? dels[0].p : '–') + ' → page ' + (adds.length ? adds[0].p : '–'));
          view.append(where);
          const A = dels.map(x => x.s).join('\n'), B = adds.map(x => x.s).join('\n');
          diff(words(A), words(B), 2000).forEach(o => {
            const n = o[0] === '=' ? document.createTextNode(o[1]) : h(o[0] === '-' ? 'del' : 'ins');
            if (o[0] !== '=') { n.textContent = o[1]; if (/\S/.test(o[1])) { if (o[0] === '-') removed++; else added++; } }
            view.append(n);
          });
          view.append(document.createTextNode('\n'));
          dels = []; adds = [];
        };
        ops.forEach(o => {
          if (o[0] === '=') { flushChg(); eq.push(o[1]); ia++; ib++; }
          else { flushEq(false); if (o[0] === '-') dels.push(lines[0][ia++]); else adds.push(lines[1][ib++]); }
        });
        flushChg(); flushEq(true);
        const sum = h('div', changes ? 'panel' : 'res');
        if (!changes) sum.innerHTML = '<b>The text is identical</b><p>Not a single word differs. Use the visual check below to look for changes to images, signatures or layout.</p>';
        else sum.innerHTML = '<h4>Summary</h4><dl class="kv"><dt>Changes</dt><dd>' + changes + '</dd><dt>Words added</dt><dd style="color:#05603A">' + added +
          '</dd><dt>Words removed</dt><dd style="color:#A3262A">' + removed + '</dd><dt>Pages</dt><dd>' + docs[0].pages + ' → ' + docs[1].pages + '</dd></dl>';
        out.append(sum);
        if (changes) out.append(view);
        visual();
      } catch (e) { console.error(e); st.fail('Comparison failed: ' + e.message); }
    }
    function visual() {
      const p = h('div', 'panel');
      p.style.marginTop = '14px';
      const max = Math.max(docs[0].pages, docs[1].pages);
      const pgSel = sel(Array.from({ length: max }, (_, i) => [String(i + 1), 'Page ' + (i + 1)]), '1');
      const hold = h('div'), found = h('div', 'note');
      p.append(h('h4', null, 'Visual check'), h('div', 'row'));
      p.lastChild.append(pgSel, TF.actions([{ label: 'Scan every page for visual changes', go: scanAll }]).firstChild);
      p.append(found, hold, note('<span style="color:#C62F35">Red</span> is only in the original, <span style="color:#0A9A58">green</span> only in the revised version. Grey is unchanged.'));
      out.append(p);
      pgSel.onchange = () => show(+pgSel.value);
      show(1);
      async function pair(n, width) {
        const r = [];
        for (let d = 0; d < 2; d++) {
          if (n > docs[d].pages) { r.push(null); continue; }
          const pg = await docs[d].doc.getPage(n);
          r.push(await renderPage(pg, width / pg.getViewport({ scale: 1 }).width));
        }
        return r;
      }
      function overlay(a, b, W) {
        const H = Math.max(a ? a.height * W / a.width : 0, b ? b.height * W / b.width : 0);
        const ca = h2c(W, H), cb = h2c(W, H);
        [ca, cb].forEach(c => { c.ctx.fillStyle = '#fff'; c.ctx.fillRect(0, 0, W, H); });
        if (a) ca.ctx.drawImage(a, 0, 0, W, a.height * W / a.width);
        if (b) cb.ctx.drawImage(b, 0, 0, W, b.height * W / b.width);
        const A = ca.ctx.getImageData(0, 0, ca.cv.width, ca.cv.height), B = cb.ctx.getImageData(0, 0, ca.cv.width, ca.cv.height);
        const pa = A.data, pb = B.data;
        let diffPx = 0;
        for (let i = 0; i < pa.length; i += 4) {
          const la = pa[i] * .3 + pa[i + 1] * .59 + pa[i + 2] * .11, lb = pb[i] * .3 + pb[i + 1] * .59 + pb[i + 2] * .11;
          if (Math.abs(la - lb) > 60) {
            diffPx++;
            if (la < lb) { pa[i] = 229; pa[i + 1] = 72; pa[i + 2] = 77; } else { pa[i] = 15; pa[i + 1] = 170; pa[i + 2] = 100; }
          } else { const v = 255 - (255 - la) * .28; pa[i] = pa[i + 1] = pa[i + 2] = v; }
        }
        ca.ctx.putImageData(A, 0, 0);
        return { cv: ca.cv, ratio: diffPx / (pa.length / 4) };
      }
      async function show(n) {
        hold.innerHTML = '';
        const [a, b] = await pair(n, 900);
        const o = overlay(a, b, 900);
        const wrap = h('div', 'pv');
        wrap.style.touchAction = 'auto';
        wrap.append(o.cv);
        hold.append(h('div', 'note', !a ? 'Page ' + n + ' only exists in the revised version.' : !b ? 'Page ' + n + ' only exists in the original.'
          : o.ratio < .0002 ? 'No visual difference on page ' + n + '.' : 'Page ' + n + ': ' + (o.ratio * 100).toFixed(2) + '% of the page differs.'), wrap);
      }
      async function scanAll() {
        found.textContent = 'Scanning…';
        const hits = [];
        for (let n = 1; n <= max; n++) {
          found.textContent = 'Scanning page ' + n + ' of ' + max + '…';
          const [a, b] = await pair(n, 360);
          if (!a || !b || overlay(a, b, 360).ratio > .0006) hits.push(n);
        }
        found.innerHTML = hits.length ? 'Visual changes on page' + (hits.length > 1 ? 's ' : ' ') + '<b>' + hits.join(', ') + '</b>. Pick one above to look.' : 'No visual changes on any page.';
        if (hits.length) { pgSel.value = String(hits[0]); show(hits[0]); }
      }
    }
  }
});

/* ============================================================ extract images */
async function pdfObj(pg, name) {
  const store = /^g_/.test(name) ? pg.commonObjs : pg.objs;
  return new Promise(res => {
    let done = false;
    try { store.get(name, o => { done = true; res(o); }); } catch (e) { res(null); return; }
    setTimeout(() => { if (!done) res(null); }, 5000);
  });
}
function objCanvas(o) {
  if (!o || !o.width || !o.height) return null;
  const c = h2c(o.width, o.height);
  if (o.bitmap) { c.ctx.drawImage(o.bitmap, 0, 0); return c.cv; }
  if (!o.data) return null;
  const id = c.ctx.createImageData(o.width, o.height), d = id.data, s = o.data, w = o.width;
  if (o.kind === 3) d.set(s.subarray(0, d.length));
  else if (o.kind === 2) for (let i = 0, j = 0; i < d.length; i += 4, j += 3) { d[i] = s[j]; d[i + 1] = s[j + 1]; d[i + 2] = s[j + 2]; d[i + 3] = 255; }
  else if (o.kind === 1) {
    const rb = (w + 7) >> 3;
    for (let y = 0; y < o.height; y++) for (let x = 0; x < w; x++) {
      const v = (s[y * rb + (x >> 3)] >> (7 - (x & 7))) & 1 ? 255 : 0, i = (y * w + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
  } else return null;
  c.ctx.putImageData(id, 0, 0);
  return c.cv;
}
reg({
  id: 'extract-images', cat: 'doc', icon: 'image', name: 'Extract images from PDF',
  desc: 'Save every photo and graphic inside a PDF.',
  long: 'Pull out the original pictures embedded in a PDF — photos in a brochure, figures in a paper, the scan inside a scan — at their full stored resolution, rather than screenshotting pages.',
  keys: 'extract images photos pictures graphics save export embedded',
  mount(m) {
    onePdf(m, {
      onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'extract-images')));
        const fmt = sel([['png', 'PNG — exact'], ['jpg', 'JPEG — smaller']], 'png');
        const min = num(48, 1, 2000);
        body.append(panel('Output', [field('Save as', fmt), field('Skip images smaller than (px)', min, 'Leaves out icons, bullets and lines')]),
          actions([{ label: 'Extract images', cls: 'pri', icon: 'image', go: run }]));
        const st = stage(body);
        const grid = h('div', 'thumbs');
        body.append(grid);
        async function run() {
          st.busy('Looking for images…');
          grid.innerHTML = '';
          try {
            const OPS = pdfjsLib.OPS, want = [OPS.paintImageXObject, OPS.paintImageXObjectRepeat, OPS.paintJpegXObject].filter(x => x != null);
            const out = [], seen = new Set(), lim = +min.value || 1;
            for (let i = 0; i < info.pages; i++) {
              st.step(i, info.pages, 'Page ' + (i + 1) + ' of ' + info.pages + ' · ' + out.length + ' found');
              const pg = await info.doc.getPage(i + 1);
              const ol = await pg.getOperatorList();
              let k = 0;
              for (let j = 0; j < ol.fnArray.length; j++) {
                const fn = ol.fnArray[j];
                let o = null, key;
                if (want.indexOf(fn) >= 0) {
                  key = ol.argsArray[j][0];
                  if (seen.has(key)) continue;
                  seen.add(key);
                  o = await pdfObj(pg, key);
                } else if (fn === OPS.paintInlineImageXObject) o = ol.argsArray[j][0];
                else continue;
                if (!o || o.width < lim || o.height < lim) continue;
                const cv = objCanvas(o);
                if (!cv) continue;
                k++;
                const name = base(info.name) + '-p' + (i + 1) + '-' + k + '.' + fmt.value;
                out.push({ name: name, blob: await canvasBlob(cv, fmt.value === 'png' ? 'image/png' : 'image/jpeg', .92), w: o.width, h: o.height });
                if (out.length <= 60) {
                  const t = h('div', 't'), im = h('img');
                  im.src = URL.createObjectURL(out[out.length - 1].blob);
                  t.append(im, h('span', null, o.width + '×' + o.height));
                  const it = out[out.length - 1];
                  t.onclick = () => dl(it.blob, it.name);
                  t.title = 'Download ' + name;
                  grid.append(t);
                }
              }
              pg.cleanup();
            }
            if (!out.length) return st.fail('No images of that size in this PDF. If it is a scan, each page is one image — use PDF to images instead.');
            const total = out.reduce((a, b) => a + b.blob.size, 0);
            st.ok(out.length + (out.length === 1 ? ' image found' : ' images found'), bytes(total) + ' · click any thumbnail to save just that one',
              [out.length === 1 ? { label: 'Download image', pri: true, icon: 'download', go: () => dl(out[0].blob, out[0].name) }
                : { label: 'Download all as zip', pri: true, icon: 'download', go: () => zipUp(out, base(info.name) + '-images.zip') }]);
          } catch (e) { console.error(e); st.fail('Could not extract images: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ grayscale */
reg({
  id: 'grayscale-pdf', cat: 'doc', icon: 'contrast', name: 'Grayscale PDF',
  desc: 'Convert a colour PDF to black and white.',
  long: 'Turn every page grey — for printers that bill colour, for portals that want black-and-white scans, or just for smaller files.',
  keys: 'grayscale greyscale black white monochrome colour remove print ink',
  mount(m) {
    onePdf(m, {
      onLoad(info, body) {
        body.append(fileBar(info, () => remount(m, 'grayscale-pdf')));
        const dpi = sel([['200', 'High — 200 DPI'], ['150', 'Good — 150 DPI'], ['110', 'Small — 110 DPI']], '150');
        body.append(panel('Output', [field('Resolution', dpi)]),
          h('div', 'warn', 'Pages are redrawn as grey images, so text stops being selectable. Run OCR afterwards if you need it searchable.'),
          actions([{ label: 'Convert to grayscale', cls: 'pri', icon: 'contrast', go: run }]));
        const st = stage(body);
        async function run() {
          st.busy('Converting…');
          try {
            const blob = await rasterPdf(info.doc, { dpi: +dpi.value, q: .8, gray: true, st: st });
            const r = st.ok('Converted to grayscale', 'Slide across the page to compare.', [dlPdf(blob, base(info.name) + '-grayscale.pdf')]);
            r.append(TF.sizeGauge(info.bytes.length, blob.size),
              TF.beforeAfter(await TF.pageThumb(info.doc, 0, 800), await TF.pageThumb(await pdfjsDoc(new Uint8Array(await blob.arrayBuffer())), 0, 800), 'Colour', 'Grayscale'));
          } catch (e) { st.fail('Conversion failed: ' + e.message); }
        }
      }
    });
  }
});

/* ============================================================ document scanner */
function solve8(A, b) {
  const n = 8, M = A.map((r, i) => r.concat(b[i]));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    const t = M[c]; M[c] = M[p]; M[p] = t;
    for (let r = 0; r < n; r++) if (r !== c) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}
/* maps output (u,v) → source (x,y) for a quad tl,tr,br,bl */
function homography(q, W, H) {
  const dst = [[0, 0], [W, 0], [W, H], [0, H]], A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = dst[i], [x, y] = q[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  return solve8(A, b);
}
function guessCorners(dec) {
  const S = 180, k = S / Math.max(dec.w, dec.h), w = Math.max(8, Math.round(dec.w * k)), hh = Math.max(8, Math.round(dec.h * k));
  const def = [[.06, .06], [.94, .06], [.94, .94], [.06, .94]].map(p => [p[0] * dec.w, p[1] * dec.h]);
  const c = h2c(w, hh);
  c.ctx.drawImage(dec.img, 0, 0, w, hh);
  const d = c.ctx.getImageData(0, 0, w, hh).data, g = new Uint8Array(w * hh), hist = new Array(256).fill(0);
  for (let i = 0; i < g.length; i++) { g[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11; hist[g[i]]++; }
  /* Otsu: the paper is usually the bright class */
  let sum = 0, sumB = 0, wB = 0, best = 0, t = 128;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  for (let i = 0; i < 256; i++) {
    wB += hist[i]; if (!wB) continue;
    const wF = g.length - wB; if (!wF) break;
    sumB += i * hist[i];
    const mB = sumB / wB, mF = (sum - sumB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
    if (v > best) { best = v; t = i; }
  }
  const seen = new Uint8Array(g.length);
  let bestComp = null;
  for (let s = 0; s < g.length; s++) {
    if (seen[s] || g[s] <= t) continue;
    const comp = [s]; seen[s] = 1;
    for (let qi = 0; qi < comp.length; qi++) {
      const p = comp[qi], x = p % w, y = (p / w) | 0;
      [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= w || ny >= hh) return;
        const np = ny * w + nx;
        if (!seen[np] && g[np] > t) { seen[np] = 1; comp.push(np); }
      });
    }
    if (!bestComp || comp.length > bestComp.length) bestComp = comp;
  }
  if (!bestComp || bestComp.length < g.length * .12 || bestComp.length > g.length * .97) return def;
  let tl = null, tr = null, br = null, bl = null;
  bestComp.forEach(p => {
    const x = p % w, y = (p / w) | 0;
    if (!tl || x + y < tl[0] + tl[1]) tl = [x, y];
    if (!br || x + y > br[0] + br[1]) br = [x, y];
    if (!tr || x - y > tr[0] - tr[1]) tr = [x, y];
    if (!bl || x - y < bl[0] - bl[1]) bl = [x, y];
  });
  return [tl, tr, br, bl].map(p => [(p[0] + .5) / k, (p[1] + .5) / k]);
}
const srcCache = new WeakMap();
function sourcePixels(dec) {
  if (srcCache.has(dec)) return srcCache.get(dec);
  const k = Math.min(1, 3200 / Math.max(dec.w, dec.h)), c = h2c(dec.w * k, dec.h * k);
  c.ctx.drawImage(dec.img, 0, 0, c.cv.width, c.cv.height);
  const r = { k: k, w: c.cv.width, h: c.cv.height, d: c.ctx.getImageData(0, 0, c.cv.width, c.cv.height).data };
  srcCache.set(dec, r);
  return r;
}
function warp(page, maxSide) {
  const S = sourcePixels(page.dec), q = page.q.map(p => [p[0] * S.k, p[1] * S.k]);
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  let W = Math.max(dist(q[0], q[1]), dist(q[3], q[2])), H = Math.max(dist(q[0], q[3]), dist(q[1], q[2]));
  const k = Math.min(1, maxSide / Math.max(W, H));
  W = Math.max(8, Math.round(W * k)); H = Math.max(8, Math.round(H * k));
  const m = homography(q, W, H), c = h2c(W, H), out = c.ctx.createImageData(W, H), o = out.data, s = S.d, sw = S.w, sh = S.h;
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) {
    const den = m[6] * u + m[7] * v + 1, x = (m[0] * u + m[1] * v + m[2]) / den, y = (m[3] * u + m[4] * v + m[5]) / den;
    const x0 = Math.max(0, Math.min(sw - 2, x | 0)), y0 = Math.max(0, Math.min(sh - 2, y | 0)), fx = Math.min(1, Math.max(0, x - x0)), fy = Math.min(1, Math.max(0, y - y0));
    const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4, oi = (v * W + u) * 4;
    for (let ch = 0; ch < 3; ch++)
      o[oi + ch] = (s[i00 + ch] * (1 - fx) + s[i10 + ch] * fx) * (1 - fy) + (s[i01 + ch] * (1 - fx) + s[i11 + ch] * fx) * fy;
    o[oi + 3] = 255;
  }
  filterData(out, page.filter);
  c.ctx.putImageData(out, 0, 0);
  if (!page.rot) return c.cv;
  const r = h2c(page.rot % 180 ? H : W, page.rot % 180 ? W : H);
  r.ctx.translate(r.cv.width / 2, r.cv.height / 2);
  r.ctx.rotate(page.rot * Math.PI / 180);
  r.ctx.drawImage(c.cv, -W / 2, -H / 2);
  return r.cv;
}
function filterData(img, f) {
  if (f === 'orig') return;
  const p = img.data, n = p.length / 4, W = img.width, H = img.height;
  if (f === 'bw') {
    const g = new Float64Array(n);
    for (let i = 0; i < n; i++) g[i] = p[i * 4] * .3 + p[i * 4 + 1] * .59 + p[i * 4 + 2] * .11;
    const I = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) { let row = 0; for (let x = 0; x < W; x++) { row += g[y * W + x]; I[(y + 1) * (W + 1) + x + 1] = I[y * (W + 1) + x + 1] + row; } }
    const s = Math.max(8, Math.round(W / 14)) >> 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const x1 = Math.max(0, x - s), x2 = Math.min(W, x + s + 1), y1 = Math.max(0, y - s), y2 = Math.min(H, y + s + 1);
      const cnt = (x2 - x1) * (y2 - y1), sm = I[y2 * (W + 1) + x2] - I[y1 * (W + 1) + x2] - I[y2 * (W + 1) + x1] + I[y1 * (W + 1) + x1];
      const v = g[y * W + x] * cnt < sm * .86 ? 0 : 255, i = (y * W + x) * 4;
      p[i] = p[i + 1] = p[i + 2] = v;
    }
    return;
  }
  /* auto colour / gray: stretch each channel between its 1st and 99th percentile, then lift the paper to white */
  const chans = f === 'gray' ? [0] : [0, 1, 2], lo = [], hi = [];
  if (f === 'gray') for (let i = 0; i < p.length; i += 4) p[i] = p[i + 1] = p[i + 2] = p[i] * .3 + p[i + 1] * .59 + p[i + 2] * .11;
  chans.forEach(c => {
    const hist = new Uint32Array(256);
    for (let i = c; i < p.length; i += 4) hist[p[i]]++;
    let acc = 0, a = 0, b = 255;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc > n * .01) { a = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > n * .12) { b = v; break; } }
    lo[c] = a; hi[c] = Math.max(a + 30, b);
  });
  for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 3; c++) {
    const cc = f === 'gray' ? 0 : c, v = (p[i + c] - lo[cc]) / (hi[cc] - lo[cc]);
    p[i + c] = Math.max(0, Math.min(255, v * 255));
  }
}
reg({
  id: 'scan-document', cat: 'doc', icon: 'scan', name: 'Document scanner', tag: 'New',
  desc: 'Phone photos → straightened, clean PDF scans.',
  long: 'Photograph pages with your phone — even at an angle on a cluttered desk. It finds the page edges for you (drag the corners to fix them), straightens the perspective, cleans it up to crisp black-and-white or bright colour, and gives you a proper multi-page PDF. The scanner apps that want a subscription, without the app.',
  keys: 'scanner camscanner adobe scan camera phone photo document perspective straighten receipt whiteboard paper',
  mount(m) {
    const pages = [];
    let cur = -1;
    const top = h('div', 'row');
    const add = async fs => {
      for (const f of fs) {
        if (!isImg(f)) continue;
        try {
          const dec = await decodeImage(f);
          pages.push({ dec: dec, q: guessCorners(dec), filter: 'color', rot: 0 });
        } catch (e) { toast('Skipped ' + f.name, e.message, true); }
      }
      if (pages.length) { cur = pages.length - 1; paint(); }
    };
    const dz = dropzone({ icon: 'scan', title: 'Add photos of the pages', sub: 'drop them here or click to choose — add more any time', accept: 'image/*,.heic,.heif', multiple: true, onFiles: add });
    const cam = dropzone({ small: true, icon: 'image', title: 'Use the camera', sub: 'on a phone, opens the camera directly', accept: 'image/*', capture: 'environment', onFiles: add });
    top.append(dz, cam);
    dz.style.flex = '2 1 300px'; cam.style.flex = '1 1 180px';
    const strip = h('div', 'thumbs'), editor = h('div'), outOpts = h('div'), outBox = h('div');
    outOpts.style.marginTop = '18px';
    m.append(top, strip, editor, outOpts, outBox);
    const size = sel([['a4', 'A4'], ['letter', 'US Letter'], ['fit', 'Same as the scan']], 'a4');
    const q = sel([['.82', 'Standard'], ['.92', 'High'], ['.68', 'Small file']], '.82');
    const st = stage(outBox);
    function paint() {
      strip.innerHTML = ''; editor.innerHTML = ''; outOpts.innerHTML = '';
      if (!pages.length) return;
      pages.forEach((p, i) => {
        const t = h('div', 't' + (i === cur ? ' sel' : ''));
        const pc = warp(p, 220);
        t.append(pc, h('span', null, String(i + 1)));
        t.onclick = () => { cur = i; paint(); };
        strip.append(t);
      });
      const p = pages[cur];
      const fseg = seg([['color', 'Auto colour'], ['gray', 'Grayscale'], ['bw', 'Black & white'], ['orig', 'Original']], p.filter, v => { p.filter = v; refresh(); });
      const ctl = h('div', 'row');
      ctl.style.marginTop = '14px';
      ctl.append(fseg);
      ctl.append(...TF.actions([
        { label: '↺', go: () => { p.rot = (p.rot + 270) % 360; refresh(); } },
        { label: '↻', go: () => { p.rot = (p.rot + 90) % 360; refresh(); } },
        { label: 'Reset corners', go: () => { p.q = guessCorners(p.dec); paint(); } },
        { label: 'Remove page', cls: 'dgr', go: () => { pages.splice(cur, 1); cur = Math.min(cur, pages.length - 1); paint(); } }
      ]).children);
      const twin = h('div', 'fields');
      twin.style.alignItems = 'start';
      const left = h('div', 'pv');
      const im = h('img'); im.src = p.dec.url; im.draggable = false;
      left.append(im);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'ov'); svg.setAttribute('viewBox', '0 0 ' + p.dec.w + ' ' + p.dec.h); svg.setAttribute('preserveAspectRatio', 'none');
      left.append(svg);
      const hs = p.q.map((pt, i) => { const d = h('div', 'hd'); left.append(d); drag(d, i); return d; });
      const right = h('div', 'pv');
      right.style.touchAction = 'auto';
      twin.append(left, right);
      editor.append(ctl, h('div', 'note', 'Drag the four green dots onto the corners of the page. The right side shows the result.'), twin);
      place(); refresh();
      outOpts.append(panel('Your PDF — ' + pages.length + (pages.length === 1 ? ' page' : ' pages'), [field('Page size', size), field('Quality', q)]),
        TF.actions([{ label: 'Save as PDF', cls: 'pri', icon: 'download', go: savePdf }, { label: 'Save as images', icon: 'image', go: saveImgs }]));
      function place() {
        p.q.forEach((pt, i) => { hs[i].style.left = pt[0] / p.dec.w * 100 + '%'; hs[i].style.top = pt[1] / p.dec.h * 100 + '%'; });
        svg.innerHTML = '<path d="M0 0H' + p.dec.w + 'V' + p.dec.h + 'H0Z M' + p.q.map(pt => pt.join(' ')).join(' L') + 'Z" fill="rgba(15,20,18,.45)" fill-rule="evenodd"/>' +
          '<polygon points="' + p.q.map(pt => pt.join(',')).join(' ') + '" fill="none" stroke="#0FBE6E" stroke-width="' + Math.max(p.dec.w, p.dec.h) / 260 + '"/>';
      }
      function refresh() {
        right.innerHTML = '';
        right.append(warp(p, 900));
        const t = strip.children[cur];
        if (t) { t.firstChild.replaceWith(warp(p, 220)); }
      }
      function drag(d, i) {
        d.addEventListener('pointerdown', e => {
          e.preventDefault();
          d.setPointerCapture(e.pointerId);
          const mv = ev => {
            const r = im.getBoundingClientRect();
            p.q[i] = [Math.max(0, Math.min(p.dec.w, (ev.clientX - r.left) / r.width * p.dec.w)),
              Math.max(0, Math.min(p.dec.h, (ev.clientY - r.top) / r.height * p.dec.h))];
            place();
          };
          const up = () => { d.removeEventListener('pointermove', mv); d.removeEventListener('pointerup', up); refresh(); };
          d.addEventListener('pointermove', mv);
          d.addEventListener('pointerup', up);
        });
      }
    }
    async function render(onStep) {
      const outs = [];
      for (let i = 0; i < pages.length; i++) {
        onStep(i);
        await nextFrame();
        const cv = warp(pages[i], 2400);
        outs.push({ cv: cv, blob: await canvasBlob(cv, 'image/jpeg', +q.value) });
      }
      return outs;
    }
    async function savePdf() {
      st.busy('Building the PDF…');
      try {
        const outs = await render(i => st.step(i, pages.length, 'Straightening page ' + (i + 1) + ' of ' + pages.length));
        const doc = await PDFDocument.create();
        for (const o of outs) {
          const emb = await doc.embedJpg(new Uint8Array(await o.blob.arrayBuffer()));
          let W, H;
          if (size.value === 'fit') { W = o.cv.width * 72 / 200; H = o.cv.height * 72 / 200; }
          else { const s2 = SIZES[size.value]; const land = o.cv.width > o.cv.height; W = land ? s2[1] : s2[0]; H = land ? s2[0] : s2[1]; }
          const b = fit(o.cv.width, o.cv.height, W, H);
          doc.addPage([W, H]).drawImage(emb, { x: (W - b.w) / 2, y: (H - b.h) / 2, width: b.w, height: b.h });
        }
        const blob = pdfBlob(await doc.save());
        st.ok('Scan ready', pages.length + (pages.length === 1 ? ' page · ' : ' pages · ') + bytes(blob.size) + ' · run OCR on it to make the text searchable',
          [dlPdf(blob, 'scan-' + new Date().toISOString().slice(0, 10) + '.pdf')]);
      } catch (e) { st.fail('Could not build the PDF: ' + e.message); }
    }
    async function saveImgs() {
      st.busy('Preparing images…');
      try {
        const outs = await render(i => st.step(i, pages.length));
        const items = outs.map((o, i) => ({ name: 'scan-' + String(i + 1).padStart(2, '0') + '.jpg', blob: o.blob }));
        st.ok('Images ready', bytes(items.reduce((a, b) => a + b.blob.size, 0)),
          [items.length === 1 ? { label: 'Download image', pri: true, icon: 'download', go: () => dl(items[0].blob, items[0].name) }
            : { label: 'Download all as zip', pri: true, icon: 'download', go: () => zipUp(items, 'scans.zip') }]);
      } catch (e) { st.fail(e.message); }
    }
  }
});
})();
