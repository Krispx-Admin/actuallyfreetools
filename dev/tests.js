/* in-page end-to-end tests: drive each tool through its real inputs and buttons */
async function runTests(only, heavy) {
  const R = [], errs = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const downloads = [];
  const origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) downloads.push({ name: this.download, url: this.href }); else origClick.call(this); };
  window.addEventListener('error', e => errs.push('error: ' + e.message));
  window.addEventListener('unhandledrejection', e => errs.push('rejection: ' + (e.reason && e.reason.message || e.reason)));
  const waitFor = async (fn, ms, what) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 20000)) { try { const v = await fn(); if (v) return v; } catch (e) {} await sleep(80); } throw new Error('timeout waiting for ' + (what || 'condition')); };
  const main = () => document.querySelector('#main');
  const vis = el => !!el && el.offsetParent !== null;
  const go = async id => { location.hash = ''; await sleep(30); location.hash = '#/' + id; await waitFor(() => main().querySelector('.thd'), 5000, 'tool page'); await sleep(60); };
  async function drop(files, idx) {
    const ins = [...main().querySelectorAll('.drop')].filter(vis).map(d => d.querySelector('input[type=file]'));
    const inp = ins[idx || 0]; if (!inp) throw new Error('no visible drop zone');
    const dt = new DataTransfer(); files.forEach(f => dt.items.add(f)); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
  }
  const btn = (label, root) => [...(root || document).querySelectorAll('button')].find(b => vis(b) && b.textContent.trim().includes(label));
  async function click(label, root, ms) { const b = await waitFor(() => btn(label, root), ms || 20000, 'button “' + label + '”'); b.click(); return b; }
  async function act(label, ms) {
    await waitFor(() => btn(label), 20000, 'button “' + label + '”');
    await sleep(150);
    const before = new Set(main().querySelectorAll('.warn, .res'));
    await click(label);
    const el = await waitFor(() => [...main().querySelectorAll('.res, .warn')].find(e => !before.has(e) && vis(e)), ms || 60000, 'result of “' + label + '”');
    if (el.classList.contains('warn')) throw new Error('tool reported: ' + el.textContent.slice(0, 300));
    return el;
  }
  async function take(resEl, label, ms) {
    const n0 = downloads.length;
    await click(label || 'Download', resEl);
    await waitFor(() => downloads.length > n0, ms || 60000, 'download');
    const d = downloads[downloads.length - 1];
    return { name: d.name, bytes: new Uint8Array(await (await fetch(d.url)).arrayBuffer()) };
  }
  window.confirm = () => true;
  async function freshStudio() { const nb = main().querySelector('#e_new'); if (nb && vis(nb)) nb.click(); await waitFor(() => vis(main().querySelector('#e_start .drop')), 5000, 'studio start screen'); }
  async function saveAs(label) {
    const n0 = downloads.length;
    main().querySelector('#e_save').click();
    const mo = await waitFor(() => document.querySelector('.modal'), 5000, 'save dialog');
    const b = [...mo.querySelectorAll('.opt')].find(x => x.querySelector('b').textContent.trim() === label);
    if (!b) throw new Error('no save option “' + label + '”: ' + [...mo.querySelectorAll('.opt b')].map(x => x.textContent).join(' | '));
    b.click();
    await waitFor(() => downloads.length > n0, 60000, 'download of ' + label);
    const d = downloads[downloads.length - 1];
    return { name: d.name, bytes: new Uint8Array(await (await fetch(d.url)).arrayBuffer()) };
  }
  const setVal = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
  async function mkPdf(fn, name) { const d = await PDFLib.PDFDocument.create(); await fn(d); return new File([await d.save()], name || 'test.pdf', { type: 'application/pdf' }); }
  async function textPdf(lines, n) {
    return mkPdf(async d => { const f = await d.embedFont(PDFLib.StandardFonts.Helvetica);
      for (let i = 0; i < (n || 1); i++) { const p = d.addPage([400, 300]); (Array.isArray(lines) ? lines : [lines + ' ' + (i + 1)]).forEach((l, k) => p.drawText(l, { x: 40, y: 250 - k * 20, size: 14, font: f })); } });
  }
  async function pdfText(bytes, pw) {
    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0), password: pw }).promise;
    let s = '';
    for (let i = 1; i <= doc.numPages; i++) s += (await (await doc.getPage(i)).getTextContent()).items.map(t => t.str).join(' ') + '\n';
    return { text: s, pages: doc.numPages };
  }
  async function imgFile(w, hh, draw, name, type, q) {
    const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d'); draw(x, w, hh);
    const b = await new Promise(r => c.toBlob(r, type || 'image/png', q)); return new File([b], name || 'img.png', { type: b.type });
  }
  const T = async (name, fn, isHeavy) => {
    if (only && !only.some(o => name.includes(o))) return;
    if (isHeavy && !heavy) { R.push({ name: name, ok: null, detail: 'skipped (heavy)' }); return; }
    const t0 = Date.now();
    try { const d = await fn(); R.push({ name: name, ok: true, ms: Date.now() - t0, detail: d || '' }); }
    catch (e) { R.push({ name: name, ok: false, ms: Date.now() - t0, detail: String(e && e.stack || e).slice(0, 600) }); }
  };

  await T('every tool mounts', async () => {
    const bad = [];
    for (const t of TF.TOOLS) {
      await go(t.id);
      const h1 = main().querySelector('.thd h1');
      if (!h1 || h1.textContent !== t.name || /failed to start/.test(main().textContent)) bad.push(t.id);
    }
    if (bad.length) throw new Error('failed: ' + bad.join(', '));
    return TF.TOOLS.length + ' tools';
  });

  await T('textKit: Arabic, Hindi, Hebrew, Cyrillic, € ₹', async () => {
    const d = await PDFLib.PDFDocument.create(), p = d.addPage([500, 300]);
    const S = [['مرحبا بالعالم 123', 'Helvetica'], ['नमस्ते दुनिया', 'HelveticaBold'], ['שלום עולם', 'Helvetica'], ['Price €5 ₹10 Привет Ωmega', 'Helvetica']];
    const kit = await TF.textKit(d, S);
    S.forEach((s, i) => kit.draw(p, s[0], { x: 30, y: 250 - i * 40, size: 18, std: s[1] }));
    const r = await pdfText(await d.save());
    ['Привет', '€', '₹', 'Ω'].forEach(x => { if (!r.text.includes(x)) throw new Error('missing ' + x + ' in: ' + r.text); });
    if (!/[؀-ۿ]/.test(r.text) || !/[ऀ-ॿ]/.test(r.text) || !/[֐-׿]/.test(r.text)) throw new Error('missing script in: ' + r.text);
    if (kit.dropped) throw new Error('kit dropped characters');
    return r.text.replace(/\s+/g, ' ').slice(0, 120);
  });

  await T('placePage honours /Rotate (editor save fix)', async () => {
    const src = await PDFLib.PDFDocument.create(), sp = src.addPage([300, 150]);
    sp.drawRectangle({ x: 0, y: 100, width: 70, height: 50, color: PDFLib.rgb(0, 0, 0) });
    sp.drawRectangle({ x: 250, y: 0, width: 50, height: 30, color: PDFLib.rgb(1, 0, 0) });
    const out = [];
    for (const rot of [90, 180, 270]) {
      sp.setRotation(PDFLib.degrees(rot));
      const sb = await src.save();
      const o = await PDFLib.PDFDocument.create(), W = rot % 180 ? 150 : 300, H = rot % 180 ? 300 : 150;
      const pg = o.addPage([W, H]);
      TF.placePage(pg, await TF.embedShown(o, (await PDFLib.PDFDocument.load(sb)).getPage(0)), rot, 0, 0, W, H);
      const ob = await o.save();
      const ra = await TF.renderPage(await (await pdfjsLib.getDocument({ data: sb }).promise).getPage(1), 1);
      const rb = await TF.renderPage(await (await pdfjsLib.getDocument({ data: ob }).promise).getPage(1), 1);
      const A = ra.getContext('2d').getImageData(0, 0, ra.width, ra.height).data, B = rb.getContext('2d').getImageData(0, 0, rb.width, rb.height).data;
      if (A.length !== B.length) throw new Error('size mismatch at ' + rot);
      let diff = 0; for (let i = 0; i < A.length; i += 4) diff += Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]);
      const md = diff / (A.length / 4);
      out.push(rot + '°: ' + md.toFixed(2));
      if (md > 6) throw new Error('rotated page drawn wrong at ' + rot + '° (mean diff ' + md.toFixed(1) + ')');
    }
    return out.join(', ');
  });

  await T('PDF editor: Arabic text annotation + save', async () => {
    await go('pdf-editor');
    await freshStudio();
    await drop([await textPdf('Editor page', 2)]);
    await waitFor(() => main().querySelectorAll('.e-pg').length === 2, 10000, 'grid');
    main().querySelector('#e_tabEdit').click();
    await waitFor(() => vis(main().querySelector('#e_layer')), 5000, 'edit view');
    main().querySelector('[data-tool="text"]').click();
    const L = main().querySelector('#e_layer'), r = L.getBoundingClientRect();
    L.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: r.left + 40, clientY: r.top + 40, pointerId: 1 }));
    const body = await waitFor(() => L.querySelector('.an-text .body'), 3000, 'text box');
    body.innerText = 'مرحبا Hello'; body.dispatchEvent(new Event('input')); body.blur();
    const b = (await saveAs('PDF')).bytes;
    const t = await pdfText(b);
    if (t.pages !== 2 || !/Hello/.test(t.text) || !/[؀-ۿ]/.test(t.text)) throw new Error('unexpected: ' + t.pages + ' ' + t.text);
    return t.text.replace(/\s+/g, ' ').slice(0, 80);
  });

  await T('Sign PDF: typed signature placed and saved', async () => {
    await go('sign-pdf');
    const f = await textPdf('Please sign here');
    if (main().querySelector('.drop') && vis(main().querySelector('.drop'))) await drop([f]);
    const L = await waitFor(() => vis(main().querySelector('#e_layer')) && main().querySelector('#e_layer'), 10000, 'edit view');
    await sleep(300);
    const r = L.getBoundingClientRect();
    L.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, clientX: r.left + 100, clientY: r.top + 100, pointerId: 1 }));
    const modal = await waitFor(() => document.querySelector('.modal'), 5000, 'signature dialog');
    await click('Type', modal);
    setVal(modal.querySelector('input[type=text]'), 'Omar Test');
    await click('Use this signature', modal);
    await waitFor(() => L.querySelector('.an-image'), 15000, 'signature on page');
    const b = (await saveAs('PDF')).bytes;
    const doc = await pdfjsLib.getDocument({ data: b }).promise, ol = await (await doc.getPage(1)).getOperatorList();
    if (ol.fnArray.indexOf(pdfjsLib.OPS.paintImageXObject) < 0) throw new Error('no image drawn on the page');
    return (await f.arrayBuffer()).byteLength + ' → ' + b.length + ' bytes';
  });

  async function formPdf() {
    return mkPdf(async d => {
      const p = d.addPage([400, 300]), f = d.getForm();
      f.createTextField('applicant.name').addToPage(p, { x: 50, y: 220, width: 220, height: 24 });
      f.createCheckBox('agree').addToPage(p, { x: 50, y: 170, width: 16, height: 16 });
      const dd = f.createDropdown('country'); dd.addOptions(['Oman', 'UAE', 'India']); dd.addToPage(p, { x: 50, y: 110, width: 150, height: 22 });
    }, 'form.pdf');
  }
  let filled = null;
  await T('Fill PDF forms: Arabic text, checkbox, dropdown', async () => {
    await go('fill-form');
    await drop([await formPdf()]);
    await waitFor(() => main().querySelectorAll('.ffield').length >= 3, 15000, 'fields');
    const fs = [...main().querySelectorAll('.ffield')];
    setVal(fs.find(x => x.type === 'text'), 'محمد');
    fs.find(x => x.type === 'checkbox').checked = true;
    setVal(fs.find(x => x.tagName === 'SELECT'), 'UAE');
    const res = await act('Save filled PDF');
    const d = await take(res);
    filled = d.bytes;
    const doc = await PDFLib.PDFDocument.load(d.bytes), form = doc.getForm();
    const v = [form.getTextField('applicant.name').getText(), form.getCheckBox('agree').isChecked(), form.getDropdown('country').getSelected()[0]];
    if (v[0] !== 'محمد' || v[1] !== true || v[2] !== 'UAE') throw new Error('values: ' + JSON.stringify(v));
    const t = await pdfText(d.bytes);
    return JSON.stringify(v) + ' · rendered text: ' + t.text.trim().slice(0, 40);
  });

  await T('Flatten PDF: form fields', async () => {
    if (!filled) throw new Error('needs the fill-form output');
    await go('flatten-pdf');
    await drop([new File([filled], 'filled.pdf', { type: 'application/pdf' })]);
    const d = await take(await act('Flatten'));
    const n = (await PDFLib.PDFDocument.load(d.bytes)).getForm().getFields().length;
    if (n) throw new Error(n + ' fields remain');
    return '0 fields remain';
  });

  let locked = null;
  await T('Protect PDF (AES-256)', async () => {
    await go('protect-pdf');
    await drop([await textPdf('Top secret contents')]);
    const pw = await waitFor(() => main().querySelectorAll('input[type=password]').length >= 2 && main().querySelectorAll('input[type=password]'), 5000);
    setVal(pw[0], 'test1234'); setVal(pw[1], 'test1234');
    const d = await take(await act('Protect PDF', 60000));
    locked = d.bytes;
    let refused = false;
    try { await pdfjsLib.getDocument({ data: d.bytes.slice(0) }).promise; } catch (e) { refused = e.name === 'PasswordException'; }
    if (!refused) throw new Error('opened without a password');
    const t = await pdfText(d.bytes, 'test1234');
    if (!/Top secret/.test(t.text)) throw new Error('wrong content');
    return 'needs password; opens with it';
  });

  await T('Unlock PDF', async () => {
    if (!locked) throw new Error('needs the protect output');
    await go('unlock-pdf');
    await drop([new File([locked], 'locked.pdf', { type: 'application/pdf' })]);
    const pw = await waitFor(() => main().querySelector('input[type=password]'), 5000, 'password box');
    setVal(pw, 'test1234');
    const res = await act('Unlock PDF', 60000);
    if (/re-drawing/i.test(res.textContent)) throw new Error('fell back to re-drawing: ' + res.textContent);
    const d = await take(res);
    const t = await pdfText(d.bytes);
    const enc = (await PDFLib.PDFDocument.load(d.bytes, { ignoreEncryption: true })).isEncrypted;
    if (!/Top secret/.test(t.text) || enc) throw new Error('text: ' + t.text + ' encrypted: ' + enc);
    return 'opens with no password, text intact';
  });

  async function tablePdf() {
    return mkPdf(async d => {
      const f = await d.embedFont(PDFLib.StandardFonts.Helvetica), b = await d.embedFont(PDFLib.StandardFonts.HelveticaBold);
      const p = d.addPage([595, 842]);
      p.drawText('Quarterly Report', { x: 50, y: 780, size: 22, font: b });
      p.drawText('This report summarises the sales of the last quarter for every region.', { x: 50, y: 740, size: 11, font: f });
      p.drawText('Numbers are in units sold and prices in dollars.', { x: 50, y: 726, size: 11, font: f });
      [['Item', 'Qty', 'Price'], ['Apples', '3', '1.50'], ['Pears', '12', '2.25'], ['Plums', '1,200', '0.80']].forEach((r, i) =>
        r.forEach((c, j) => p.drawText(c, { x: 50 + j * 160, y: 680 - i * 18, size: 11, font: i ? f : b })));
    }, 'report.pdf');
  }
  await T('PDF to Word (.docx) and Excel (.xlsx)', async () => {
    await go('pdf-to-office');
    await drop([await tablePdf()]);
    const d1 = await take(await act('Convert'));
    const z = await JSZip.loadAsync(d1.bytes), xml = await z.file('word/document.xml').async('string');
    if (!xml.includes('Quarterly Report') || !xml.includes('<w:tbl>') || !xml.includes('Pears')) throw new Error('docx content wrong: ' + xml.replace(/<w:rPr>.*?<\/w:rPr>/g, '').slice(150, 2200));
    await click('Excel');
    const d2 = await take(await act('Convert'));
    const wb = XLSX.read(d2.bytes, { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    const flat = JSON.stringify(rows);
    if (!flat.includes('"Qty"') || !rows.some(r => r.includes(1200))) throw new Error('xlsx rows: ' + flat);
    return 'docx has table; xlsx rows ' + flat.slice(0, 90);
  });

  await T('Crop / booklet / n-up', async () => {
    await go('page-layout');
    await drop([await textPdf('Page', 5)]);
    const crop = await take(await act('Apply'));
    const cp = (await PDFLib.PDFDocument.load(crop.bytes)).getPage(0).getMediaBox();
    if (Math.abs(cp.width - (400 - 20 * 72 / 25.4)) > 1) throw new Error('crop width ' + cp.width);
    await click('Booklet');
    const bk = await take(await act('Apply'));
    const bd = await PDFLib.PDFDocument.load(bk.bytes);
    if (bd.getPageCount() !== 4) throw new Error('booklet sides ' + bd.getPageCount());
    await click('Pages per sheet');
    setVal(main().querySelector('select'), '4');
    const nu = await take(await act('Apply'));
    const nd = await PDFLib.PDFDocument.load(nu.bytes);
    if (nd.getPageCount() !== 2) throw new Error('4-up sheets ' + nd.getPageCount());
    return 'crop ' + cp.width.toFixed(1) + 'pt wide; booklet 4 sides; 4-up 2 sheets';
  });

  await T('Compress PDF to 100 KB', async () => {
    const img = await imgFile(1400, 1800, (x, w, hh) => { const g = x.createLinearGradient(0, 0, w, hh); g.addColorStop(0, '#f80'); g.addColorStop(1, '#08f'); x.fillStyle = g; x.fillRect(0, 0, w, hh);
      for (let i = 0; i < 9000; i++) { x.fillStyle = 'hsl(' + (i * 37 % 360) + ',70%,50%)'; x.fillRect(Math.random() * w, Math.random() * hh, 6, 6); } }, 'big.jpg', 'image/jpeg', .95);
    const f = await mkPdf(async d => { const e = await d.embedJpg(new Uint8Array(await img.arrayBuffer())); for (let i = 0; i < 3; i++) d.addPage([595, 842]).drawImage(e, { x: 0, y: 0, width: 595, height: 842 }); }, 'heavy.pdf');
    await go('compress-pdf');
    await drop([f]);
    await click('Fit a size limit');
    await click('100 KB');
    const d = await take(await act('Compress', 120000));
    if (d.bytes.length > 102400) throw new Error('result ' + d.bytes.length + ' bytes');
    return TF.bytes(f.size) + ' → ' + TF.bytes(d.bytes.length);
  });

  await T('Compare PDFs', async () => {
    await go('compare-pdf');
    await drop([await textPdf(['The quick brown fox jumps', 'over the lazy dog'])], 0);
    await waitFor(() => main().querySelectorAll('.fitem').length === 1, 10000, 'first file loaded');
    await drop([await textPdf(['The quick red fox jumps', 'over the lazy dog'])], 0);
    const v = await waitFor(() => main().querySelector('.diff'), 20000, 'diff view');
    const ins = [...v.querySelectorAll('ins')].map(x => x.textContent).join('|'), del = [...v.querySelectorAll('del')].map(x => x.textContent).join('|');
    if (!/red/.test(ins) || !/brown/.test(del)) throw new Error('ins ' + ins + ' del ' + del);
    return 'removed “' + del + '”, added “' + ins + '”';
  });

  await T('Extract images from PDF', async () => {
    const png = await imgFile(220, 160, x => { x.fillStyle = '#c33'; x.fillRect(0, 0, 220, 160); x.fillStyle = '#fff'; x.fillRect(40, 40, 60, 60); });
    const f = await mkPdf(async d => { const e = await d.embedPng(new Uint8Array(await png.arrayBuffer())); d.addPage([400, 300]).drawImage(e, { x: 20, y: 20, width: 220, height: 160 }); });
    await go('extract-images');
    await drop([f]);
    const res = await act('Extract images');
    if (!/1 image found/.test(res.textContent)) throw new Error(res.textContent);
    const d = await take(res);
    const im = await TF.loadImg(URL.createObjectURL(new Blob([d.bytes])));
    if (im.naturalWidth !== 220) throw new Error('width ' + im.naturalWidth);
    return '220×160 recovered';
  });

  await T('Watermark (Arabic) + Bates numbers', async () => {
    await go('watermark-pdf');
    await drop([await textPdf('Body', 2)]);
    setVal(await waitFor(() => main().querySelector('input[type=text]'), 10000, 'text box'), 'سري للغاية');
    const w = await take(await act('Apply watermark'));
    if (!/[؀-ۿ]/.test((await pdfText(w.bytes)).text)) throw new Error('no Arabic watermark');
    await go('page-numbers');
    await drop([await textPdf('Body', 3)]);
    await click('Bates');
    const b = await take(await act('Add numbering'));
    const t = (await pdfText(b.bytes)).text;
    if (!t.includes('ABC000003')) throw new Error(t);
    return 'Arabic watermark + ABC000001–3';
  });

  await T('PDF studio: merge, split into parts, rotate, images → PDF', async () => {
    await go('merge-pdf'); await freshStudio();
    await drop([await textPdf('A', 2), await textPdf('B', 3)]);
    await waitFor(() => main().querySelector('.e-legend'), 10000, 'colour legend');
    const m = await saveAs('PDF'); if ((await pdfText(m.bytes)).pages !== 5) throw new Error('merge pages');
    await go('split-pdf');
    const cuts = await waitFor(() => main().querySelectorAll('.e-pg .cut').length === 4 && main().querySelectorAll('.e-pg .cut'), 5000, 'cut buttons');
    cuts[1].click();
    await waitFor(() => /2 parts marked/.test(main().querySelector('#e_tip').textContent), 3000, 'parts hint');
    const z = await JSZip.loadAsync((await saveAs('2 separate PDFs')).bytes);
    const parts = Object.keys(z.files).sort(); if (parts.length !== 2) throw new Error('parts ' + parts);
    const p1 = await pdfText(await z.file(parts[0]).async('uint8array')), p2 = await pdfText(await z.file(parts[1]).async('uint8array'));
    if (p1.pages !== 2 || p2.pages !== 3) throw new Error('part sizes ' + p1.pages + '/' + p2.pages);
    await go('rotate-pdf');
    await click('↻ All');
    const r = await saveAs('One combined PDF');
    if ((await PDFLib.PDFDocument.load(r.bytes)).getPage(0).getRotation().angle !== 90) throw new Error('rotate');
    await go('images-to-pdf'); await freshStudio();
    await drop([await imgFile(300, 200, x => { x.fillStyle = '#0a0'; x.fillRect(0, 0, 300, 200); }), await imgFile(200, 300, x => { x.fillStyle = '#a00'; x.fillRect(0, 0, 200, 300); }, 'b.png')]);
    await waitFor(() => main().querySelectorAll('.e-pg').length === 2, 10000, 'image pages');
    const ip = await saveAs('PDF'); if ((await pdfText(ip.bytes)).pages !== 2) throw new Error('images→pdf');
    const sm = await saveAs('Smaller PDF'); if ((await pdfText(sm.bytes)).pages !== 2) throw new Error('smaller pdf');
    return 'merged 5 pages; split 2+3; rotated; 2 images → PDF; smaller-PDF export';
  });

  await T('Grayscale + PDF to images (page picker)', async () => {
    await go('grayscale-pdf'); await drop([await textPdf('Colour', 2)]);
    const g = await take(await act('Convert to grayscale')); if ((await pdfText(g.bytes)).pages !== 2) throw new Error('grayscale pages');
    await go('pdf-to-images'); await drop([await textPdf('Pic', 3)]);
    await waitFor(() => main().querySelectorAll('.picker .t').length === 3, 5000, 'page picker');
    main().querySelectorAll('.picker .t')[1].click();
    const pi = await act('Save 2 images'); if (!/2 images/.test(pi.textContent)) throw new Error(pi.textContent);
    return 'grayscale ok; picked 2 of 3 pages';
  });

  await T('Invoice: 45 lines → multiple pages, ₹ and Arabic', async () => {
    await go('invoice');
    const tx = () => [...main().querySelectorAll('input[type=text]')];
    setVal(tx()[0], 'شركة الاختبار');
    setVal([...main().querySelectorAll('select')].find(s => [...s.options].some(o => o.value === '₹')), '₹');
    for (let i = 0; i < 44; i++) btn('+ Add line').click();
    const rows = [...main().querySelectorAll('.panel')].find(p => /Lines/.test(p.textContent)).querySelectorAll('div[style*="grid-template-columns"]');
    rows.forEach((r, i) => { const ins = r.querySelectorAll('input'); setVal(ins[0], 'Consulting work item ' + (i + 1) + ' with a long description that must wrap onto a second line in the table'); setVal(ins[1], '2'); setVal(ins[2], '1500'); });
    const res = await act('Download PDF');
    const d = await take(res);
    const t = await pdfText(d.bytes);
    if (t.pages < 2 || !t.text.includes('₹') || !/[؀-ۿ]/.test(t.text) || !/item 45/.test(t.text) || !/Page 1 of/.test(t.text)) throw new Error('pages ' + t.pages + ' text: ' + t.text.slice(0, 300));
    return t.pages + ' pages, last line present, ₹ total: ' + (t.text.match(/₹[\d,.]+/g) || []).pop();
  });

  await T('Bulk generator: certificates + labels from pasted rows', async () => {
    await go('bulk-generate');
    main().querySelector('details').open = true;
    setVal(main().querySelector('details textarea'), 'Name\tCourse\tDate\nAmal Hassan\tFirst Aid\t1 May 2026\nعمر سعيد\tSafety\t2 May 2026');
    await click('Use pasted rows');
    const d = await take(await act('Generate 2 PDFs'));
    const t = await pdfText(d.bytes);
    if (t.pages !== 2 || !/Amal Hassan/.test(t.text) || !/[؀-ۿ]/.test(t.text)) throw new Error(t.pages + ' ' + t.text);
    await click('Labels');
    const l = await take(await act('Generate 2 labels'));
    if ((await pdfText(l.bytes)).pages !== 1) throw new Error('labels');
    return '2 certificates (Latin + Arabic names), 1 label sheet';
  });

  await T('Barcode: EAN-13 label sheet', async () => {
    await go('barcode');
    setVal(main().querySelector('select'), 'EAN13');
    setVal(main().querySelector('textarea'), '590123412345\n400638133393');
    await waitFor(() => main().querySelector('.panel svg rect, .panel svg g'), 15000, 'barcode preview');
    const d = await take(await act('Label sheet PDF'));
    if ((await pdfText(d.bytes)).pages !== 1) throw new Error('pages');
    return 'preview + 2 labels';
  });

  await T('Excel & CSV: dedupe to xlsx', async () => {
    await go('sheets');
    await drop([new File(['Name,Email\nAmal,a@x.com\nOmar,o@x.com\nAmal,a@x.com\n'], 'people.csv', { type: 'text/csv' })]);
    await waitFor(() => btn('Process'), 15000);
    [...main().querySelectorAll('.chk')].find(c => /duplicate/.test(c.textContent)).querySelector('input').checked = true;
    const res = await act('Process');
    if (!/3 rows in → 2 rows out/.test(res.textContent)) throw new Error(res.textContent);
    return res.querySelector('p').textContent;
  });

  await T('Text compare', async () => {
    await go('text-diff');
    const ta = main().querySelectorAll('textarea');
    setVal(ta[0], 'Payment is due in 30 days.'); setVal(ta[1], 'Payment is due in 14 days.');
    await click('Compare');
    const v = await waitFor(() => main().querySelector('.diff ins'), 3000);
    return 'added “' + v.textContent + '”';
  });

  await T('Unzip (JSZip) + password zip via 7-Zip, then reopen it', async () => {
    const z = new JSZip(); z.file('hello.txt', 'hi there'); z.file('dir/b.txt', 'bee');
    await go('archive');
    await drop([new File([await z.generateAsync({ type: 'uint8array' })], 'plain.zip')]);
    const r1 = await waitFor(() => main().querySelector('.res'), 15000, 'zip listing');
    if (!/2 files inside/.test(r1.textContent)) throw new Error(r1.textContent);
    await click('Make a zip');
    await drop([new File(['alpha'], 'a.txt'), new File(['beta'], 'b.txt')]);
    setVal(await waitFor(() => main().querySelector('input[type=password]'), 5000), 'pw123');
    const d = await take(await act('Make zip of 2 files', 90000));
    await click('Open an archive');
    await drop([new File([d.bytes], 'secret.zip')]);
    const pw = await waitFor(() => main().querySelector('input[type=password]'), 90000, 'password prompt');
    setVal(pw, 'pw123');
    [...main().querySelectorAll('button')].find(b => vis(b) && b.textContent.trim() === 'Open').click();
    await sleep(300);
    const r2 = await waitFor(() => [...main().querySelectorAll('.res, .warn, .panel h4')].find(e => /files? inside|not right|could|nothing|not an archive/i.test(e.textContent)), 60000, 'decrypted listing');
    if (!r2.classList.contains('res')) throw new Error('tool said: ' + r2.textContent + ' | log: ' + (window.__szlog || ''));
    if (!/2 files inside/.test(r2.textContent)) throw new Error(r2.textContent);
    return 'plain zip read; AES zip made (' + d.bytes.length + ' B) and reopened with password';
  });

  await T('Photo & signature for forms: 140×60, 10–20 KB, 200 DPI', async () => {
    await go('form-photo');
    await drop([await imgFile(900, 500, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 500); x.strokeStyle = '#123'; x.lineWidth = 9; x.beginPath(); x.moveTo(80, 300); x.bezierCurveTo(250, 50, 400, 450, 820, 200); x.stroke(); }, 'sig.png')]);
    const s = await waitFor(() => main().querySelector('select'), 10000);
    setVal(s, 's140');
    await sleep(1500);
    const n0 = downloads.length;
    await click('Download JPEG');
    await waitFor(() => downloads.length > n0, 5000);
    const b = new Uint8Array(await (await fetch(downloads[downloads.length - 1].url)).arrayBuffer());
    const im = await TF.loadImg(URL.createObjectURL(new Blob([b])));
    const kb = b.length / 1024;
    if (im.naturalWidth !== 140 || im.naturalHeight !== 60 || kb < 10 || kb > 20 || b[13] !== 1 || ((b[14] << 8) | b[15]) !== 200) throw new Error(im.naturalWidth + 'x' + im.naturalHeight + ' ' + kb.toFixed(1) + 'KB dpi ' + ((b[14] << 8) | b[15]));
    return '140×60, ' + kb.toFixed(1) + ' KB, 200 DPI (padded to meet the minimum)';
  });

  await T('Convert image: transparent PNG → JPEG stays white', async () => {
    await go('convert-image');
    await drop([await imgFile(100, 100, x => { x.fillStyle = '#000'; x.fillRect(40, 40, 20, 20); }, 'clear.png')]);
    const n0 = downloads.length;
    await click('Save this image');
    await waitFor(() => downloads.length > n0, 15000, 'image download');
    const d = { bytes: new Uint8Array(await (await fetch(downloads[downloads.length - 1].url)).arrayBuffer()) };
    const im = await TF.loadImg(URL.createObjectURL(new Blob([d.bytes])));
    const c = TF.drawTo(im, 100, 100), px = c.getContext('2d').getImageData(5, 5, 1, 1).data;
    if (px[0] < 240) throw new Error('corner pixel ' + px.join(','));
    return 'corner rgb(' + px.slice(0, 3).join(',') + ')';
  });

  await T('Document scanner: finds the page and builds a PDF', async () => {
    await go('scan-document');
    await drop([await imgFile(800, 600, x => { x.fillStyle = '#3a3330'; x.fillRect(0, 0, 800, 600); x.fillStyle = '#f4f2ee'; x.beginPath(); x.moveTo(170, 90); x.lineTo(640, 120); x.lineTo(610, 540); x.lineTo(140, 500); x.closePath(); x.fill();
      x.fillStyle = '#222'; for (let i = 0; i < 10; i++) x.fillRect(220, 170 + i * 30, 300, 8); }, 'photo.jpg', 'image/jpeg', .9)]);
    const hs = await waitFor(() => main().querySelectorAll('.hd').length === 4 && [...main().querySelectorAll('.hd')], 10000, 'corner handles');
    const pts = hs.map(d => [parseFloat(d.style.left) * 8, parseFloat(d.style.top) * 6]);
    const exp = [[170, 90], [640, 120], [610, 540], [140, 500]];
    const err = Math.max(...pts.map((p, i) => Math.hypot(p[0] - exp[i][0], p[1] - exp[i][1])));
    if (err > 25) throw new Error('corners off by ' + err.toFixed(0) + 'px: ' + JSON.stringify(pts.map(p => p.map(Math.round))));
    const d = await take(await act('Save as PDF'));
    if ((await pdfText(d.bytes)).pages !== 1) throw new Error('pages');
    return 'corners within ' + err.toFixed(0) + ' px';
  });

  await T('Blur tool mounts with preview', async () => {
    await go('blur-image');
    await drop([await imgFile(300, 200, x => { x.fillStyle = '#48c'; x.fillRect(0, 0, 300, 200); })]);
    await waitFor(() => main().querySelector('.stage-pv canvas'), 5000, 'canvas');
    return 'ok';
  });

  await T('OCR: image → searchable PDF + text', async () => {
    await go('ocr');
    await drop([await imgFile(1400, 360, x => { x.fillStyle = '#fff'; x.fillRect(0, 0, 1400, 360); x.fillStyle = '#000'; x.font = 'bold 110px Arial'; x.fillText('HELLO WORLD 2026', 60, 220); }, 'scan.png')]);
    const res = await act('Recognise text', 300000);
    const ta = await waitFor(() => main().querySelector('textarea'), 5000);
    if (!/HELLO/.test(ta.value)) throw new Error('text: ' + ta.value);
    const d = await take(res, 'searchable');
    const t = (await pdfText(d.bytes)).text;
    if (!/HELLO/.test(t)) throw new Error('pdf text layer: ' + t);
    return 'recognised “' + ta.value.trim() + '”; PDF text layer searchable';
  }, true);

  await T('Audio converter (ffmpeg): WAV → MP3', async () => {
    const sr = 22050, n = sr, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.sin(i / sr * 2 * Math.PI * 440) * 12000, true);
    await go('audio-convert');
    await drop([new File([buf], 'tone.wav', { type: 'audio/wav' })]);
    const d = await take(await act('Convert', 300000));
    if (!/\.mp3$/.test(d.name) || d.bytes.length < 2000) throw new Error(d.name + ' ' + d.bytes.length);
    return d.name + ' ' + d.bytes.length + ' bytes';
  }, true);

  await T('Video (ffmpeg): compress to MP4 + make GIF', async () => {
    const vid = new File([await (await fetch('https://cdn.jsdelivr.net/gh/ffmpegwasm/testdata@master/video-3s.avi')).blob()], 'clip.avi', { type: 'video/x-msvideo' });
    await go('video-compress');
    await drop([vid]);
    const d = await take(await act('Make MP4', 300000));
    if (!/\.mp4$/.test(d.name) || d.bytes.length < 1000) throw new Error(d.name + ' ' + d.bytes.length);
    await click('GIF');
    const g = await take(await act('Make GIF', 300000));
    if (String.fromCharCode(...g.bytes.slice(0, 3)) !== 'GIF') throw new Error('not a gif');
    return 'webm ' + vid.size + ' B → mp4 ' + d.bytes.length + ' B; GIF ' + g.bytes.length + ' B';
  }, true);

  await T('Background remover (AI, on device)', async () => {
    await go('remove-bg');
    await drop([await imgFile(480, 360, x => { x.fillStyle = '#2b8'; x.fillRect(0, 0, 480, 360); x.fillStyle = '#d33'; x.beginPath(); x.arc(240, 180, 110, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillRect(200, 140, 80, 80); }, 'thing.png')]);
    await click('Fast');
    await click('Remove background');
    await waitFor(() => btn('Undo the cut-out'), 400000, 'cut-out');
    await click('Save');
    const n0 = downloads.length;
    await click('Save this image');
    await waitFor(() => downloads.length > n0, 20000, 'download');
    const d = { bytes: new Uint8Array(await (await fetch(downloads[downloads.length - 1].url)).arrayBuffer()) };
    const im = await TF.loadImg(URL.createObjectURL(new Blob([d.bytes])));
    const c = TF.drawTo(im, im.naturalWidth, im.naturalHeight), a = c.getContext('2d').getImageData(4, 4, 1, 1).data[3];
    if (a > 40) throw new Error('corner alpha ' + a);
    return im.naturalWidth + '×' + im.naturalHeight + ', corner alpha ' + a;
  }, true);

  HTMLAnchorElement.prototype.click = origClick;
  return { results: R, errors: errs };
}
