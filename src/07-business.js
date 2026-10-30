/* ============================================================ business + data + text tools */
(function () {
'use strict';
const { h, esc, ico, toast, bytes, dl, base, zipUp, canvasBlob, h2c, nextFrame, dropzone, isPdf, isImg,
  stage, field, sel, num, txt, seg, check, panel, actions, note, area, reg, textKit, store, lib,
  decodeImage, pdfjsDoc, renderPage, fileBar, LABELS, labelRects, safeName, diff, table } = TF;
const { PDFDocument, rgb } = PDFLib;
const XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const HEX = hx => { const v = hx.replace('#', ''); return rgb(parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255); };
function copy(text, what) {
  navigator.clipboard ? navigator.clipboard.writeText(text).then(
    () => toast('Copied', what || ''), () => toast('Could not copy', 'Select it and copy manually.', true))
    : toast('Could not copy', 'Select it and copy manually.', true);
}
async function embedAny(doc, dec) {
  if (dec.type === 'png') return doc.embedPng(dec.bytes.slice(0));
  if (dec.type === 'jpg') return doc.embedJpg(dec.bytes.slice(0));
  const b = await canvasBlob(TF.drawTo(dec.img, dec.w, dec.h), 'image/png');
  return doc.embedPng(new Uint8Array(await b.arrayBuffer()));
}

/* ============================================================ QR codes */
const QT = {
  url: { label: 'Website', fields: [['url', 'Address', 'https://example.com']] },
  text: { label: 'Plain text', fields: [['text', 'Text', 'Anything you like']] },
  wifi: { label: 'Wi-Fi login', fields: [['ssid', 'Network name', 'MyCafe'], ['pass', 'Password', ''],
    ['enc', 'Security', 'WPA']] },
  vcard: { label: 'Contact card', fields: [['name', 'Full name', 'Jane Doe'], ['org', 'Company', ''],
    ['phone', 'Phone', ''], ['email', 'Email', ''], ['url2', 'Website', '']] },
  email: { label: 'Email', fields: [['to', 'Send to', 'hello@example.com'], ['subj', 'Subject', ''], ['body', 'Message', '']] },
  tel: { label: 'Phone call', fields: [['tel', 'Number', '+1 555 0100']] },
  sms: { label: 'Text message', fields: [['num2', 'Number', ''], ['msg', 'Message', '']] }
};
function payload(type, v) {
  const e = s => String(s || '').replace(/([\\;,:"])/g, '\\$1');
  if (type === 'url') return v.url || '';
  if (type === 'text') return v.text || '';
  if (type === 'wifi') return 'WIFI:T:' + (v.enc || 'WPA') + ';S:' + e(v.ssid) + ';P:' + e(v.pass) + ';;';
  if (type === 'vcard') return 'BEGIN:VCARD\nVERSION:3.0\nFN:' + (v.name || '') +
    (v.org ? '\nORG:' + v.org : '') + (v.phone ? '\nTEL:' + v.phone : '') +
    (v.email ? '\nEMAIL:' + v.email : '') + (v.url2 ? '\nURL:' + v.url2 : '') + '\nEND:VCARD';
  if (type === 'email') return 'mailto:' + (v.to || '') +
    (v.subj || v.body ? '?subject=' + encodeURIComponent(v.subj || '') + '&body=' + encodeURIComponent(v.body || '') : '');
  if (type === 'tel') return 'tel:' + String(v.tel || '').replace(/\s/g, '');
  if (type === 'sms') return 'SMSTO:' + (v.num2 || '') + ':' + (v.msg || '');
  return '';
}
reg({
  id: 'qr-code', cat: 'biz', icon: 'qr', name: 'QR code generator',
  desc: 'Links, Wi-Fi logins, contact cards and more.',
  long: 'Make a QR code for a link, a Wi-Fi network, a contact card or a phone number. Download it as a PNG for screens or an SVG that stays sharp at any print size — the SVG is usually the paid feature elsewhere.',
  keys: 'barcode wifi vcard contact link scan',
  mount(m) {
    let type = 'url';
    const vals = { url: 'https://', enc: 'WPA' };
    const fieldsBox = h('div', 'fields');
    const size = num(512, 128, 2048, 32);
    const dark = TF.color('#0F1412');
    const light = TF.color('#FFFFFF');
    const ec = sel([['L', 'Low — most data'], ['M', 'Medium'], ['Q', 'High'], ['H', 'Highest — survives damage']], 'M');
    const quiet = num(4, 0, 12);

    const tSeg = h('div', 'seg');
    Object.keys(QT).forEach(k => {
      const b = h('button', null, esc(QT[k].label));
      b.setAttribute('aria-selected', String(k === type));
      b.onclick = () => {
        type = k;
        [...tSeg.children].forEach(c => c.setAttribute('aria-selected', String(c === b)));
        paintFields(); render();
      };
      tSeg.append(b);
    });
    function paintFields() {
      fieldsBox.innerHTML = '';
      QT[type].fields.forEach(f => {
        let ctrl;
        if (f[0] === 'enc') ctrl = sel([['WPA', 'WPA / WPA2 / WPA3'], ['WEP', 'WEP'], ['nopass', 'Open — no password']], vals.enc || 'WPA');
        else if (f[0] === 'body' || f[0] === 'msg' || f[0] === 'text') { ctrl = area(vals[f[0]] || '', 3); }
        else { ctrl = txt(vals[f[0]] || '', f[2]); }
        ctrl.oninput = ctrl.onchange = () => { vals[f[0]] = ctrl.value; render(); };
        fieldsBox.append(field(f[1], ctrl));
      });
    }
    const p1 = h('div', 'panel');
    p1.append(h('h4', null, 'What should it do?'), tSeg);
    fieldsBox.style.marginTop = '14px';
    p1.append(fieldsBox);
    const p2 = panel('Appearance', [field('Size (px)', size), field('Dark', dark),
      field('Light', light), field('Error correction', ec), field('Quiet border', quiet, 'Modules of blank margin')]);
    const out = h('div', 'panel');
    out.style.textAlign = 'center';
    out.append(h('h4', null, 'Preview'));
    const hold = h('div');
    hold.style.cssText = 'display:flex;justify-content:center;padding:6px 0 14px';
    out.append(hold);
    const btns = h('div');
    out.append(btns);
    m.append(p1, p2, out);
    [size, dark, light, ec, quiet].forEach(c => { c.oninput = c.onchange = render; });
    paintFields();

    let modules = null, count = 0;
    function render() {
      const data = payload(type, vals);
      hold.innerHTML = ''; btns.innerHTML = '';
      if (!data.trim() || data === 'https://') {
        hold.append(h('p', 'note', 'Fill in the fields above and your code appears here.'));
        return;
      }
      const tmp = h('div');
      tmp.style.display = 'none';
      document.body.append(tmp);
      let q;
      try {
        q = new QRCode(tmp, { text: data, width: 480, height: 480, colorDark: dark.value,
          colorLight: light.value, correctLevel: QRCode.CorrectLevel[ec.value] });
      } catch (e) {
        tmp.remove();
        hold.append(h('div', 'warn', 'That is too much data for one QR code. Shorten the text, or lower the error correction.'));
        return;
      }
      modules = null;
      try {
        const mdl = q._oQRCode;
        if (mdl && mdl.modules) { modules = mdl.modules; count = mdl.moduleCount || modules.length; }
      } catch (e) {}
      const cv = tmp.querySelector('canvas');
      const show = h('canvas');
      const px = 260;
      show.width = show.height = px;
      show.style.cssText = 'width:' + px + 'px;height:' + px + 'px;border-radius:10px;border:1px solid var(--line)';
      const ctx = show.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      if (modules) drawModules(ctx, px, px);
      else if (cv) ctx.drawImage(cv, 0, 0, px, px);
      tmp.remove();
      hold.append(show);
      const row = h('div', 'row');
      row.style.justifyContent = 'center';
      const bPng = h('button', 'btn pri', ico('download') + '<span>PNG</span>');
      bPng.onclick = downloadPng;
      row.append(bPng);
      if (modules) {
        const bSvg = h('button', 'btn', ico('download') + '<span>SVG (vector)</span>');
        bSvg.onclick = downloadSvg;
        row.append(bSvg);
      }
      const bCopy = h('button', 'btn', '<span>Copy contents</span>');
      bCopy.onclick = () => copy(data, 'The code encodes ' + data.slice(0, 40) + (data.length > 40 ? '…' : ''));
      row.append(bCopy);
      btns.append(row, note('<b>' + data.length + '</b> characters encoded · ' +
        (modules ? count + '×' + count + ' modules' : 'raster only')));
    }
    function drawModules(ctx, w, hh) {
      const qz = Math.max(0, +quiet.value || 0);
      const total = count + qz * 2, cell = w / total;
      ctx.fillStyle = light.value;
      ctx.fillRect(0, 0, w, hh);
      ctx.fillStyle = dark.value;
      for (let r = 0; r < count; r++) for (let c = 0; c < count; c++)
        if (modules[r][c]) ctx.fillRect(Math.floor((c + qz) * cell), Math.floor((r + qz) * cell),
          Math.ceil(cell), Math.ceil(cell));
    }
    async function downloadPng() {
      const px = Math.max(128, +size.value || 512);
      const c = h2c(px, px);
      c.ctx.imageSmoothingEnabled = false;
      if (modules) drawModules(c.ctx, px, px);
      dl(await canvasBlob(c.cv, 'image/png'), 'qr-code.png');
    }
    function downloadSvg() {
      const qz = Math.max(0, +quiet.value || 0), total = count + qz * 2;
      let d = '';
      for (let r = 0; r < count; r++) for (let c = 0; c < count; c++)
        if (modules[r][c]) d += 'M' + (c + qz) + ' ' + (r + qz) + 'h1v1h-1z';
      const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + total + ' ' + total +
        '" width="' + (+size.value || 512) + '" height="' + (+size.value || 512) + '" shape-rendering="crispEdges">' +
        '<rect width="' + total + '" height="' + total + '" fill="' + light.value + '"/>' +
        '<path d="' + d + '" fill="' + dark.value + '"/></svg>';
      dl(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
    }
    render();
  }
});

/* ============================================================ invoice */
const CUR = [['$', 'US dollar — $', 2], ['€', 'Euro — €', 2], ['£', 'Pound — £', 2],
  ['¥', 'Yen — ¥', 0], ['A$', 'Australian dollar', 2], ['C$', 'Canadian dollar', 2],
  ['CHF ', 'Swiss franc', 2], ['AED ', 'UAE dirham', 2], ['SAR ', 'Saudi riyal', 2], ['QAR ', 'Qatari riyal', 2],
  ['OMR ', 'Omani rial', 3], ['KWD ', 'Kuwaiti dinar', 3], ['BHD ', 'Bahraini dinar', 3], ['EGP ', 'Egyptian pound', 2],
  ['₹', 'Indian rupee — ₹', 2], ['PKR ', 'Pakistani rupee', 2], ['₦', 'Nigerian naira — ₦', 2],
  ['R ', 'South African rand', 2], ['', 'No symbol', 2]];
const KINDS = { INVOICE: ['Invoice', 'Due'], QUOTE: ['Quote', 'Valid until'], ESTIMATE: ['Estimate', 'Valid until'], 'PRO FORMA INVOICE': ['Pro forma invoice', 'Due'] };
reg({
  id: 'invoice', cat: 'biz', icon: 'invoice', name: 'Invoice & quote builder',
  desc: 'Professional invoices, quotes and estimates as PDF.',
  long: 'Fill in the lines and get a properly laid-out invoice, quote or estimate PDF — with your logo, any currency, any language, and as many lines as you need (it flows onto more pages). No account, no per-invoice fee, no branding of ours anywhere on it. It can remember your details on this device for next time.',
  keys: 'invoice bill quote estimate proforma receipt freelance client tax vat gst logo',
  mount(m) {
    const saved = store.get('inv', {}) || {};
    const F = {};
    const mk = (k, label, val, ph) => { const c = txt(val, ph); c.dir = 'auto'; F[k] = c; return field(label, c); };
    const mkA = (k, label, val, ph) => {
      const c = area(val, 3);
      c.style.fontFamily = 'var(--sans)'; c.style.fontSize = '14px'; c.dir = 'auto';
      F[k] = c;
      return field(label, c, ph);
    };
    const today = new Date().toISOString().slice(0, 10);
    const nextNo = (saved.no || 'INV-000').replace(/(\d+)(?!.*\d)/, d => String(+d + 1).padStart(d.length, '0'));
    const kind = sel(Object.keys(KINDS).map(k => [k, KINDS[k][0]]), 'INVOICE');
    let logo = null;
    const logoHold = h('div', 'row');
    const logoBtn = dropzone({ small: true, icon: 'image', title: 'Add your logo', sub: 'PNG or JPEG', accept: 'image/*', onFiles: async f => {
      try { logo = await decodeImage(f[0]); paintLogo(); } catch (e) { toast('Could not read that image', e.message, true); }
    } });
    function paintLogo() {
      logoHold.innerHTML = '';
      m.dispatchEvent(new Event('input'));                 /* refresh the live preview */
      if (!logo) { logoHold.append(logoBtn); return; }
      const im = h('img'); im.src = logo.url; im.style.cssText = 'max-height:48px;max-width:160px;border:1px solid var(--line);border-radius:6px;padding:4px;background:#fff';
      logoHold.append(im, actions([{ label: 'Remove logo', go: () => { logo = null; paintLogo(); } }]).firstChild);
    }
    if (saved.logo) TF.loadImg(saved.logo).then(im => TF.canvasEntry(TF.drawTo(im, im.naturalWidth, im.naturalHeight), 'logo.png')).then(e => { logo = e; paintLogo(); }).catch(() => paintLogo());
    else paintLogo();
    const yourP = panel('Your details', [mk('from', 'Business or your name', saved.from || '', 'Acme Studio'),
      mkA('fromAddr', 'Address & contact', saved.fromAddr || '', 'One line per row')]);
    yourP.append(h('div', 'pgl', 'Logo (optional)'), logoHold);
    m.append(yourP);
    m.append(panel('Client', [mk('to', 'Bill to', '', 'Client Ltd'),
      mkA('toAddr', 'Client address', '', 'One line per row')]));
    const cur = sel(CUR.map(c => [c[0], c[1]]), saved.cur != null ? saved.cur : '$');
    F.cur = cur;
    const dueF = mk('due', 'Due', '');
    m.append(panel('Document', [field('Type', kind), mk('no', 'Number', nextNo === 'INV-001' && !saved.no ? 'INV-001' : nextNo),
      mk('date', 'Date', today), dueF, field('Currency', cur)]));
    kind.onchange = () => { dueF.querySelector('label').textContent = KINDS[kind.value][1]; };

    /* line items */
    const items = [{ d: '', q: 1, p: 0 }];
    const rows = h('div');
    const ip = h('div', 'panel');
    ip.append(h('h4', null, 'Lines'), rows);
    function paintRows() {
      rows.innerHTML = '';
      items.forEach((it, i) => {
        const r = h('div');
        r.style.cssText = 'display:grid;grid-template-columns:1fr 76px 108px 34px;gap:8px;margin-bottom:8px;align-items:center';
        const d = txt(it.d, 'Description of work');
        d.dir = 'auto';
        const q = num(it.q, 0, 100000, 0.01);
        const p = num(it.p, 0, 1e9, 0.01);
        d.oninput = () => { it.d = d.value; };
        q.oninput = () => { it.q = +q.value || 0; totals(); };
        p.oninput = () => { it.p = +p.value || 0; totals(); };
        const x = h('button', 'btn sm dgr', ico('x'));
        x.title = 'Remove line';
        x.onclick = () => { items.splice(i, 1); if (!items.length) items.push({ d: '', q: 1, p: 0 }); paintRows(); totals(); };
        r.append(d, q, p, x);
        rows.append(r);
      });
      const add = h('button', 'btn sm', '<span>+ Add line</span>');
      add.onclick = () => { items.push({ d: '', q: 1, p: 0 }); paintRows(); rows.querySelectorAll('input[type=text]')[items.length - 1].focus(); };
      rows.append(add);
    }
    paintRows();
    m.append(ip);
    const tax = num(saved.tax || 0, 0, 100, 0.1);
    const taxName = txt(saved.taxName || 'VAT', 'Tax label');
    const disc = num(0, 0, 1e9, 0.01);
    const sum = h('div', 'kv');
    sum.style.marginTop = '10px';
    m.append(panel('Totals & notes', [field('Tax name', taxName), field('Tax %', tax),
      field('Discount', disc), mkA('notes', 'Notes / payment details', saved.notes || '', 'Bank details, terms, thank-you')]));
    const sp = h('div', 'panel');
    sp.append(h('h4', null, 'Summary'), sum);
    m.append(sp);
    const remember = check('Remember my details, logo and tax settings on this device', !!saved.from);
    remember.style.marginTop = '14px';
    m.append(remember, actions([{ label: 'Download PDF', cls: 'pri', icon: 'download', go: run }]));
    const st = stage(m);
    const dec = () => (CUR.find(c => c[0] === cur.value) || CUR[0])[2];
    function calc() {
      const sub = items.reduce((a, b) => a + (+b.q || 0) * (+b.p || 0), 0);
      const d = Math.min(+disc.value || 0, sub);
      const t = (sub - d) * ((+tax.value || 0) / 100);
      return { sub: sub, disc: d, tax: t, total: sub - d + t };
    }
    const money = n => cur.value + n.toFixed(dec()).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    function totals() {
      const c = calc();
      sum.innerHTML = '<dt>Subtotal</dt><dd>' + esc(money(c.sub)) + '</dd>' +
        (c.disc ? '<dt>Discount</dt><dd>-' + esc(money(c.disc)) + '</dd>' : '') +
        (c.tax ? '<dt>' + esc(taxName.value || 'Tax') + '</dt><dd>' + esc(money(c.tax)) + '</dd>' : '') +
        '<dt><b>Total</b></dt><dd><b>' + esc(money(c.total)) + '</b></dd>';
    }
    [tax, disc, taxName, cur].forEach(c => { c.oninput = c.onchange = totals; });
    totals();

    /* live preview: the real PDF page, redrawn a moment after you stop typing */
    const left = h('div'), pv = h('div', 'livepv stick'), pcv = h('canvas'), pcap = h('span', 'cap', 'Live preview');
    pcv.setAttribute('aria-label', 'Preview of your document');
    pv.append(pcv, pcap);
    [...m.children].forEach(c => left.append(c));
    const two = h('div', 'split2'); two.append(left, pv); m.append(two);
    let pvT = 0, pvTok = 0;
    const refresh = () => {
      clearTimeout(pvT);
      pvT = setTimeout(async () => {
        const my = ++pvTok;
        try {
          const r = await makeDoc();
          if (my !== pvTok) return;
          const cv2 = await renderPage(await (await pdfjsDoc(r.bytes)).getPage(1), 1.2);
          if (my !== pvTok) return;
          pcv.width = cv2.width; pcv.height = cv2.height; pcv.getContext('2d').drawImage(cv2, 0, 0);
          pcap.textContent = 'Live preview · page 1' + (r.pages > 1 ? ' of ' + r.pages : '') + ' · total ' + money(r.c.total);
        } catch (e) { pcap.textContent = 'Preview paused: ' + e.message; }
      }, 450);
    };
    m.addEventListener('input', refresh);
    m.addEventListener('change', refresh);
    m.addEventListener('click', e => { if (e.target.closest('button')) refresh(); });
    refresh();

    /* builds the PDF; used both by the live preview and by the download */
    async function makeDoc() {
        const doc = await PDFDocument.create();
        const R = 'Helvetica', B = 'HelveticaBold';
        const live = items.filter(i => i.d.trim() || i.p);
        const lines = live.length ? live : [{ d: '—', q: 1, p: 0 }];
        const c = calc();
        const title = KINDS[kind.value][0];
        const strs = [F.from.value, F.fromAddr.value, F.to.value, F.toAddr.value, F.notes.value, F.no.value, F.date.value, F.due.value,
          taxName.value, money(c.total), cur.value + '0', title.toUpperCase()].concat(lines.map(i => i.d));
        const kit = await textKit(doc, strs.map(s => [s, R]).concat(strs.map(s => [s, B])));
        const W = 595, H = 842, M = 48;
        const ink = rgb(.06, .08, .07), grey = rgb(.45, .49, .47), line = rgb(.88, .90, .89), acc = rgb(.06, .60, .35);
        let page, y;
        const T = (s, x, yy, size, f, col) => kit.draw(page, s, { x: x, y: yy, size: size, std: f || R, color: col || ink });
        const right = (s, xr, yy, size, f, col) => T(s, xr - kit.width(s, size, f || R), yy, size, f, col);
        const COLQ = W - M - 190, COLU = W - M - 96, COLA = W - M - 8, DESCW = W - M * 2 - 240;
        function head() {
          page.drawRectangle({ x: M, y: y - 6, width: W - M * 2, height: 22, color: rgb(.96, .97, .96) });
          T('DESCRIPTION', M + 8, y, 8, B, grey);
          right('QTY', COLQ, y, 8, B, grey);
          right('UNIT', COLU, y, 8, B, grey);
          right('AMOUNT', COLA, y, 8, B, grey);
          y -= 24;
        }
        function more(withHead) {
          page = doc.addPage([W, H]);
          y = H - M;
          T((F.from.value || '') + '  ·  ' + title + ' ' + (F.no.value || '') + ' (continued)', M, y - 4, 9, R, grey);
          y -= 30;
          if (withHead) head();
        }
        /* page 1 header */
        page = doc.addPage([W, H]);
        y = H - M;
        if (logo) {
          const e = await embedAny(doc, logo), b = TF.fit(logo.w, logo.h, 150, 54);
          page.drawImage(e, { x: M, y: y - b.h + 6, width: b.w, height: b.h });
          y -= b.h + 8;
        }
        T(F.from.value || 'Your business', M, y - 4, 17, B);
        right(title.toUpperCase(), W - M, H - M - 2, title.length > 12 ? 19 : 25, B, acc);
        y -= 22;
        String(F.fromAddr.value || '').split('\n').slice(0, 6).forEach(l => {
          if (!l.trim()) return; T(l, M, y, 9, R, grey); y -= 12;
        });
        let yr = H - M - 30;
        [[title + ' no.', F.no.value], ['Date', F.date.value], [KINDS[kind.value][1], F.due.value]].forEach(p2 => {
          if (!p2[1]) return;
          right(p2[0], W - M - 92, yr, 9, R, grey);
          right(p2[1], W - M, yr, 10, B);
          yr -= 15;
        });
        y = Math.min(y, yr) - 18;
        page.drawLine({ start: { x: M, y: y }, end: { x: W - M, y: y }, thickness: 1, color: line });
        y -= 24;
        T(kind.value === 'INVOICE' || kind.value === 'PRO FORMA INVOICE' ? 'BILL TO' : 'PREPARED FOR', M, y, 8, B, grey); y -= 15;
        T(F.to.value || '—', M, y, 12, B); y -= 14;
        String(F.toAddr.value || '').split('\n').slice(0, 6).forEach(l => {
          if (!l.trim()) return; T(l, M, y, 9, R, grey); y -= 12;
        });
        y -= 18;
        head();
        /* lines — wrapped descriptions, new page whenever the next row will not fit */
        lines.forEach(it => {
          const wrapped = kit.wrap(it.d || '—', 10, R, DESCW);
          const rowH = wrapped.length * 13 + 13;
          if (y - rowH < M + 30) more(true);
          wrapped.forEach((ln, k) => T(ln, M + 8, y - k * 13, 10));
          right(String(it.q), COLQ, y, 10);
          right(money(+it.p || 0), COLU, y, 10);
          right(money((+it.q || 0) * (+it.p || 0)), COLA, y, 10, B);
          y -= (wrapped.length - 1) * 13 + 10;
          page.drawLine({ start: { x: M, y: y }, end: { x: W - M, y: y }, thickness: .5, color: line });
          y -= 16;
        });
        /* totals */
        if (y < M + 110) more(false);
        y -= 6;
        const tline = (label, val, bold) => {
          right(label, COLU, y, bold ? 12 : 10, bold ? B : R, bold ? ink : grey);
          right(val, COLA, y, bold ? 13 : 10, bold ? B : R);
          y -= bold ? 20 : 16;
        };
        tline('Subtotal', money(c.sub));
        if (c.disc) tline('Discount', '-' + money(c.disc));
        if (c.tax) tline((taxName.value || 'Tax') + ' ' + (+tax.value || 0) + '%', money(c.tax));
        page.drawLine({ start: { x: W - M - 220, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 1, color: line });
        y -= 4;
        tline(kind.value === 'INVOICE' || kind.value === 'PRO FORMA INVOICE' ? 'TOTAL DUE' : 'TOTAL', money(c.total), true);
        /* notes */
        const notes = String(F.notes.value || '').trim();
        if (notes) {
          y -= 16;
          if (y < M + 40) more(false);
          T('NOTES', M, y, 8, B, grey); y -= 14;
          kit.wrap(notes, 9, R, W - M * 2).forEach(l => {
            if (y < M + 10) more(false);
            T(l, M, y, 9, R, grey); y -= 12;
          });
        }
        const pages = doc.getPages();
        if (pages.length > 1) pages.forEach((pg, i) => {
          page = pg;
          const s = 'Page ' + (i + 1) + ' of ' + pages.length;
          T(s, (W - kit.width(s, 8)) / 2, 24, 8, R, grey);
        });
        return { bytes: await doc.save(), c: c, title: title, pages: pages.length, kit: kit };
    }
    async function run() {
      st.busy('Building…');
      try {
        if (remember.input.checked) store.set('inv', { from: F.from.value, fromAddr: F.fromAddr.value, cur: cur.value, tax: tax.value,
          taxName: taxName.value, notes: F.notes.value, no: F.no.value,
          logo: logo ? (b => TF.drawTo(logo.img, b.w, b.h).toDataURL('image/png'))(TF.fit(logo.w, logo.h, Math.min(480, logo.w), Math.min(240, logo.h))) : null });
        else store.set('inv', null);
        const made = await makeDoc(), c = made.c, title = made.title, pages = made.pages, kit = made.kit;
        const blob = new Blob([made.bytes], { type: 'application/pdf' });
        st.ok(title + ' ready', money(c.total) + ' · ' + pages + (pages === 1 ? ' page · ' : ' pages · ') + bytes(blob.size),
          [{ label: 'Download PDF', pri: true, icon: 'download',
             go: () => dl(blob, title.toLowerCase().replace(/\s+/g, '-') + '-' + (F.no.value || '001').replace(/[^\w-]/g, '') + '.pdf') }]);
        if (kit.dropped) toast('Some characters dropped', 'A few symbols (emoji or rare scripts) have no font here and were left out.', true);
      } catch (e) { console.error(e); st.fail('Could not build the document: ' + e.message); }
    }
  }
});

/* ============================================================ spreadsheets: shared reading */
async function readTable(file) {
  const X = await lib(XLSX_URL, 'XLSX');
  const e = TF.ext(file.name);
  let wb;
  if (e === 'json') {
    const data = JSON.parse(await file.text());
    const arr = Array.isArray(data) ? data : Object.values(data).find(Array.isArray) || [data];
    return [{ name: base(file.name), rows: arr.map(r => (r && typeof r === 'object') ? r : { value: r }) }];
  }
  if (/^(csv|tsv|txt)$/.test(e)) wb = X.read(await file.text(), { type: 'string', raw: false });
  else wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true });
  return wb.SheetNames.map(n => ({ name: n, rows: X.utils.sheet_to_json(wb.Sheets[n], { defval: '', raw: false }) }));
}
function pastedRows(text) {
  const lines = String(text).replace(/\r/g, '').split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].indexOf('\t') >= 0 ? '\t' : ',';
  const head = lines[0].split(sep).map(s => s.trim());
  return lines.slice(1).map(l => { const c = l.split(sep), o = {}; head.forEach((k, i) => { o[k] = (c[i] || '').trim(); }); return o; });
}
const fillTpl = (t, row) => String(t || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, k) => {
  if (row[k] != null) return row[k];
  const key = Object.keys(row).find(x => x.toLowerCase() === k.toLowerCase());
  return key ? row[key] : '';
});

/* ============================================================ bulk generator */
reg({
  id: 'bulk-generate', cat: 'biz', icon: 'mail', name: 'Bulk PDF generator', tag: 'Mail merge',
  desc: 'Spreadsheet in → certificates, letters, labels out.',
  long: 'Turn a spreadsheet into hundreds of personalised PDFs in one go: certificates for every attendee, letters for every client, address labels for every customer — or fill your own designed PDF with each row. Put {{Column name}} wherever a value should go.',
  keys: 'mail merge bulk batch certificate letter labels csv excel spreadsheet personalised address avery template',
  mount(m) {
    let rows = [], cols = [], kind = 'cert', bg = null;
    const dataBox = h('div');
    const dz = dropzone({ icon: 'table', title: 'Drop your spreadsheet', sub: 'Excel, CSV or Google Sheets download — the first row must be column names',
      accept: '.csv,.tsv,.txt,.xlsx,.xls,.ods,.json', onFiles: async f => {
        try { const t = await readTable(f[0]); rows = t[0].rows; dataName = f[0].name; dataSize = f[0].size; loaded(); }
        catch (e) { toast('Could not read that file', e.message, true); }
      } });
    let dataName = '', dataSize = 0;
    const paste = area('', 4);
    paste.placeholder = 'Name\tCourse\tDate\nAmal Hassan\tFirst Aid\t12 May 2026';
    const pasteBtn = actions([{ label: 'Use pasted rows', go: () => { rows = pastedRows(paste.value); dataName = 'pasted rows'; loaded(); } }]);
    const pasteBox = h('details');
    pasteBox.innerHTML = '<summary style="cursor:pointer;font-size:13px;color:var(--ink2);margin-top:12px">…or paste rows copied from a spreadsheet</summary>';
    pasteBox.append(paste, pasteBtn);
    m.append(dz, pasteBox, dataBox);
    const body = h('div');
    m.append(body);
    function loaded() {
      if (!rows.length) return toast('No rows found', 'The first row should be column names, with data below it.', true);
      cols = Object.keys(rows[0]);
      dz.hidden = true; pasteBox.hidden = true;
      dataBox.innerHTML = '';
      dataBox.append(fileBar({ name: dataName + ' — ' + rows.length + ' rows', size: dataSize }, () => TF.remount(m, 'bulk-generate')));
      dataBox.append(note('Columns: ' + cols.map(c => '<b>{{' + esc(c) + '}}</b>').join(' ')));
      dataBox.append(table([cols].concat(rows.slice(0, 5).map(r => cols.map(c => r[c])))));
      build();
    }
    const first = () => cols[0] || 'Name';
    function build() {
      body.innerHTML = '';
      const kSeg = seg([['cert', 'Certificates'], ['letter', 'Letters'], ['labels', 'Labels'], ['pdf', 'My own PDF']], kind, v => { kind = v; build(); });
      const p = h('div', 'panel');
      p.style.marginTop = '18px';
      p.append(h('h4', null, 'Make'), kSeg);
      body.append(p);
      const opts = h('div');
      body.append(opts);
      const nameTpl = txt('{{' + first() + '}}', 'File name');
      const outMode = sel([['one', 'One PDF with every page'], ['zip', 'A separate PDF for each row (zip)']], 'one');
      const tail = h('div');
      body.append(tail);
      const st = stage(body);
      let make;
      if (kind === 'cert') {
        const C = { title: txt('Certificate of Completion'), pre: txt('This is to certify that'), name: txt('{{' + first() + '}}'),
          body: area('has successfully completed the course.', 2), left: txt('{{Date}}'), right: txt('Director'), color: TF.color('#0A8A50') };
        C.body.style.fontFamily = 'var(--sans)';
        opts.append(panel('Certificate', [field('Title', C.title), field('Line above the name', C.pre), field('Name', C.name),
          field('Text below', C.body), field('Bottom left', C.left, 'e.g. the date'), field('Bottom right', C.right, 'e.g. who signs it'), field('Accent colour', C.color)]));
        make = async (doc, row) => {
          const W = 841.89, H = 595.28, acc = HEX(C.color.value), grey = rgb(.4, .43, .42);
          const s = { t: fillTpl(C.title.value, row), p: fillTpl(C.pre.value, row), n: fillTpl(C.name.value, row), b: fillTpl(C.body.value, row), l: fillTpl(C.left.value, row), r: fillTpl(C.right.value, row) };
          const kit = await textKit(doc, [[s.t, 'TimesRomanBold'], [s.p, 'Helvetica'], [s.n, 'TimesRomanBoldItalic'], [s.b, 'Helvetica'], [s.l, 'Helvetica'], [s.r, 'Helvetica']]);
          const pg = doc.addPage([W, H]);
          pg.drawRectangle({ x: 22, y: 22, width: W - 44, height: H - 44, borderColor: acc, borderWidth: 3 });
          pg.drawRectangle({ x: 32, y: 32, width: W - 64, height: H - 64, borderColor: acc, borderWidth: .8 });
          const ctr = (t, y, size, std, col) => kit.draw(pg, t, { x: (W - kit.width(t, size, std)) / 2, y: y, size: size, std: std, color: col });
          ctr(s.t, H - 140, 34, 'TimesRomanBold', acc);
          ctr(s.p, H - 200, 14, 'Helvetica', grey);
          let ns = 42;
          while (ns > 16 && kit.width(s.n, ns, 'TimesRomanBoldItalic') > W - 200) ns -= 2;
          ctr(s.n, H - 262, ns, 'TimesRomanBoldItalic', rgb(.06, .08, .07));
          pg.drawLine({ start: { x: W / 2 - 200, y: H - 278 }, end: { x: W / 2 + 200, y: H - 278 }, thickness: .8, color: acc });
          kit.wrap(s.b, 14, 'Helvetica', W - 260).slice(0, 4).forEach((ln, i) => ctr(ln, H - 318 - i * 20, 14, 'Helvetica', grey));
          [[s.l, 150], [s.r, W - 150]].forEach(([t, cx]) => {
            if (!t) return;
            pg.drawLine({ start: { x: cx - 110, y: 112 }, end: { x: cx + 110, y: 112 }, thickness: .6, color: grey });
            kit.draw(pg, t, { x: cx - kit.width(t, 11) / 2, y: 94, size: 11, color: grey });
          });
          return kit.dropped;
        };
      } else if (kind === 'letter') {
        const L = { text: area('Dear {{' + first() + '}},\n\nThank you for …\n\nKind regards,\nYour name', 10),
          font: sel([['TimesRoman', 'Serif'], ['Helvetica', 'Sans']], 'TimesRoman'), size: num(11, 7, 20, .5), paper: sel([['a4', 'A4'], ['letter', 'US Letter']], 'a4') };
        L.text.style.fontFamily = 'var(--sans)';
        opts.append(panel('Letter', [field('Letter text — use {{Column}} for values', L.text), field('Typeface', L.font), field('Size (pt)', L.size), field('Paper', L.paper)]));
        opts.lastChild.querySelector('.fields').firstChild.style.gridColumn = '1 / -1';
        make = async (doc, row) => {
          const [W, H] = L.paper.value === 'a4' ? TF.A4 : TF.LETTER, M = 72, sz = +L.size.value || 11, t = fillTpl(L.text.value, row);
          const kit = await textKit(doc, [[t, L.font.value]]);
          let pg = doc.addPage([W, H]), y = H - M;
          kit.wrap(t, sz, L.font.value, W - 2 * M).forEach(ln => {
            if (y < M) { pg = doc.addPage([W, H]); y = H - M; }
            if (ln) {
              const rtl = /^[^\p{L}]*[֐-ࣿ]/u.test(ln);
              kit.draw(pg, ln, { x: rtl ? W - M - kit.width(ln, sz, L.font.value) : M, y: y, size: sz, std: L.font.value });
            }
            y -= sz * 1.45;
          });
          return kit.dropped;
        };
      } else if (kind === 'labels') {
        const B = { sheet: sel(LABELS.map(l => [l.id, l.name]), 'a4-21'), text: area('{{' + first() + '}}\n{{Address}}\n{{City}} {{Postcode}}', 4),
          size: num(10, 5, 24, .5), align: sel([['left', 'Left'], ['center', 'Centred']], 'left'), skip: num(0, 0, 80), border: check('Print label outlines (for testing)', false) };
        B.text.style.fontFamily = 'var(--sans)';
        opts.append(panel('Labels', [field('Label sheet', B.sheet), field('Each label — use {{Column}} for values', B.text),
          field('Text size (pt)', B.size), field('Alignment', B.align), field('Skip used labels at the start', B.skip, 'For part-used sheets')]));
        opts.lastChild.append(B.border);
        outMode.value = 'one';
        make = async (doc, rowsAll) => {
          const Ls = LABELS.find(l => l.id === B.sheet.value), rects = labelRects(Ls), per = rects.length;
          const texts = rowsAll.map(r => fillTpl(B.text.value, r).split('\n').filter(l => l.trim()));
          const kit = await textKit(doc, [[texts.map(t => t.join(' ')).join(' '), 'Helvetica']]);
          const skipN = Math.max(0, +B.skip.value || 0);
          let pg = null;
          texts.forEach((lines, i) => {
            const slot = (i + skipN) % per;
            if (!pg || slot === 0) pg = doc.addPage(Ls.page);
            const r = rects[slot], pad = 6;
            let sz = +B.size.value || 10;
            while (sz > 5 && (lines.length * sz * 1.2 > r.h - 2 * pad || lines.some(l => kit.width(l, sz) > r.w - 2 * pad))) sz -= .5;
            const total = lines.length * sz * 1.2;
            lines.forEach((ln, k) => {
              const w = kit.width(ln, sz);
              kit.draw(pg, ln, { x: B.align.value === 'center' ? r.x + (r.w - w) / 2 : r.x + pad, y: r.y + r.h / 2 + total / 2 - (k + 1) * sz * 1.2 + sz * .25, size: sz });
            });
            if (B.border.input.checked) pg.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, borderColor: rgb(.75, .77, .76), borderWidth: .4 });
          });
          return kit.dropped;
        };
      } else {
        const blocks = [{ tpl: '{{' + first() + '}}', size: 24, x: 50, y: 45, align: 'center', bold: true, color: '#0F1412' }];
        let cur = 0;
        const bgBox = h('div');
        const pv = h('div', 'pv');
        pv.style.cursor = 'crosshair';
        const listBox = h('div');
        opts.append(bgBox, listBox, pv);
        const paintBg = () => {
          bgBox.innerHTML = '';
          if (!bg) {
            bgBox.append(dropzone({ small: true, icon: 'file', title: 'Drop your designed PDF', sub: 'its first page is used as the background for every row',
              accept: 'application/pdf,.pdf', onFiles: async f => {
                try {
                  const bs = new Uint8Array(await f[0].arrayBuffer());
                  const d = await pdfjsDoc(bs), pg = await d.getPage(1), vp = pg.getViewport({ scale: 1 });
                  bg = { name: f[0].name, bytes: bs, w: vp.width, h: vp.height, cv: await renderPage(pg, Math.min(2, 900 / vp.width)) };
                  paintBg(); paintBlocks();
                } catch (e) { toast('Could not open that PDF', e.message, true); }
              } }));
            return;
          }
          bgBox.append(fileBar({ name: bg.name, bytes: bg.bytes }, () => { bg = null; paintBg(); paintBlocks(); }));
        };
        const paintBlocks = () => {
          listBox.innerHTML = ''; pv.innerHTML = '';
          if (!bg) return;
          blocks.forEach((b, i) => {
            const r = h('div', 'fitem' + (i === cur ? ' over' : ''));
            r.style.cssText += ';display:grid;grid-template-columns:1fr 64px 108px 74px 34px;gap:8px';
            const t = txt(b.tpl), s = num(b.size, 4, 200), a = sel([['left', 'Left'], ['center', 'Centre'], ['right', 'Right']], b.align), c = TF.color(b.color);
            t.oninput = () => { b.tpl = t.value; marks(); }; s.oninput = () => { b.size = +s.value || 12; marks(); };
            a.onchange = () => { b.align = a.value; marks(); }; c.oninput = () => { b.color = c.value; marks(); };
            t.onfocus = () => { cur = i; [...listBox.children].forEach((x, j) => x.classList.toggle('over', j === i)); };
            const x = h('button', 'x', ico('x'));
            x.onclick = () => { blocks.splice(i, 1); cur = 0; paintBlocks(); };
            r.append(t, s, a, c, x);
            listBox.append(r);
          });
          listBox.append(actions([{ label: '+ Add a text box', go: () => { blocks.push({ tpl: '{{' + (cols[1] || first()) + '}}', size: 14, x: 50, y: 60, align: 'center', bold: false, color: '#0F1412' }); cur = blocks.length - 1; paintBlocks(); } }]),
            note('Select a row above, then <b>click on the page</b> to place it. The preview fills in the first row of your data.'));
          const img = h('img'); img.src = bg.cv.toDataURL('image/jpeg', .85);
          pv.append(img);
          marks();
        };
        const marks = () => {
          pv.querySelectorAll('.mk').forEach(n => n.remove());
          blocks.forEach((b, i) => {
            const d = h('div', 'mk');
            d.textContent = fillTpl(b.tpl, rows[0] || {});
            const pw = pv.clientWidth || 600;
            d.style.cssText = 'position:absolute;white-space:nowrap;line-height:1;font-family:Helvetica,Arial,sans-serif;color:' + b.color +
              ';font-size:' + (b.size * pw / bg.w) + 'px;top:' + b.y + '%;left:' + b.x + '%;transform:translate(' +
              (b.align === 'center' ? '-50%' : b.align === 'right' ? '-100%' : '0') + ',-85%);' + (i === cur ? 'outline:1.5px dashed #0FBE6E;outline-offset:3px' : '');
            d.dir = 'auto';
            pv.append(d);
          });
        };
        pv.addEventListener('click', e => {
          if (!bg || !blocks[cur]) return;
          const r = pv.getBoundingClientRect();
          blocks[cur].x = (e.clientX - r.left) / r.width * 100;
          blocks[cur].y = (e.clientY - r.top) / r.height * 100;
          marks();
        });
        paintBg();
        let srcDoc = null;
        make = async (doc, row) => {
          if (!bg) throw new Error('Add your designed PDF first.');
          if (!srcDoc) srcDoc = await TF.pdfLibDoc(bg.bytes);
          const emb = doc.__bgEmb || (doc.__bgEmb = await TF.embedShown(doc, srcDoc.getPage(0)));
          const vals = blocks.map(b => fillTpl(b.tpl, row));
          const kit = await textKit(doc, vals.map(v => [v, 'Helvetica']));
          const pg = doc.addPage([bg.w, bg.h]);
          const rot = ((srcDoc.getPage(0).getRotation().angle % 360) + 360) % 360;
          TF.placePage(pg, emb, rot, 0, 0, bg.w, bg.h);
          blocks.forEach((b, i) => {
            const w = kit.width(vals[i], b.size), x = b.x / 100 * bg.w, y = bg.h - b.y / 100 * bg.h;
            kit.draw(pg, vals[i], { x: b.align === 'center' ? x - w / 2 : b.align === 'right' ? x - w : x, y: y, size: b.size, color: HEX(b.color) });
          });
          return kit.dropped;
        };
      }
      const outP = panel('Output', kind === 'labels' ? [] : [field('Save as', outMode), field('File names (for separate PDFs)', nameTpl, 'Uses your columns too, e.g. {{Name}} certificate')]);
      if (kind === 'labels') outP.append(note('All labels go into one PDF. Print at <b>100% / actual size</b>, not “fit to page”.'));
      tail.append(outP, actions([{ label: 'Generate ' + rows.length + (kind === 'labels' ? ' labels' : ' PDFs'), cls: 'pri', icon: 'mail', go: run }]));
      /* preview the real output for row 1 (or the first label sheet) as settings change */
      if (kind !== 'pdf') {
        const pv = h('div', 'livepv'), pcv = h('canvas'), pcap = h('span', 'cap');
        pv.style.marginTop = '14px'; pv.append(pcv, pcap); tail.prepend(pv);
        let pvT = 0, pvTok = 0;
        const refresh = () => {
          clearTimeout(pvT);
          pvT = setTimeout(async () => {
            const my = ++pvTok;
            try {
              const doc = await PDFDocument.create();
              await make(doc, kind === 'labels' ? rows : rows[0]);
              const cv2 = await renderPage(await (await pdfjsDoc(await doc.save())).getPage(1), kind === 'cert' ? .7 : .85);
              if (my !== pvTok) return;
              pcv.width = cv2.width; pcv.height = cv2.height; pcv.getContext('2d').drawImage(cv2, 0, 0);
              pcap.textContent = kind === 'labels' ? 'Preview of the first sheet' : 'Preview using row 1 of ' + rows.length;
            } catch (e) { pcap.textContent = 'Preview paused: ' + e.message; }
          }, 400);
        };
        body.oninput = body.onchange = refresh;
        refresh();
      } else body.oninput = body.onchange = null;
      async function run() {
        st.busy('Generating…');
        try {
          let dropped = false;
          if (kind === 'labels') {
            const doc = await PDFDocument.create();
            dropped = await make(doc, rows);
            const blob = new Blob([await doc.save()], { type: 'application/pdf' });
            st.ok(rows.length + ' labels on ' + doc.getPageCount() + (doc.getPageCount() === 1 ? ' sheet' : ' sheets'), bytes(blob.size),
              [{ label: 'Download PDF', pri: true, icon: 'download', go: () => dl(blob, 'labels.pdf') }]);
          } else if (outMode.value === 'one') {
            const doc = await PDFDocument.create();
            for (let i = 0; i < rows.length; i++) {
              st.step(i, rows.length, 'Row ' + (i + 1) + ' of ' + rows.length);
              if (i % 10 === 0) await nextFrame();
              dropped = (await make(doc, rows[i])) || dropped;
            }
            const blob = new Blob([await doc.save()], { type: 'application/pdf' });
            st.ok(rows.length + ' done in one PDF', doc.getPageCount() + ' pages · ' + bytes(blob.size),
              [{ label: 'Download PDF', pri: true, icon: 'download', go: () => dl(blob, kind + 's.pdf') }]);
          } else {
            const items = [], used = {};
            for (let i = 0; i < rows.length; i++) {
              st.step(i, rows.length, 'Row ' + (i + 1) + ' of ' + rows.length);
              await nextFrame();
              const doc = await PDFDocument.create();
              dropped = (await make(doc, rows[i])) || dropped;
              let n = safeName(fillTpl(nameTpl.value, rows[i]) || kind + '-' + (i + 1));
              used[n] = (used[n] || 0) + 1;
              if (used[n] > 1) n += ' (' + used[n] + ')';
              items.push({ name: n + '.pdf', blob: new Blob([await doc.save()], { type: 'application/pdf' }) });
            }
            st.ok(items.length + ' PDFs ready', bytes(items.reduce((a, b) => a + b.blob.size, 0)),
              [{ label: 'Download all as zip', pri: true, icon: 'download', go: () => zipUp(items, kind + 's.zip') }]);
          }
          if (dropped) toast('Some characters dropped', 'A few symbols (emoji or rare scripts) have no font here and were left out.', true);
        } catch (e) { console.error(e); st.fail(e.message); }
      }
    }
  }
});

/* ============================================================ barcodes */
const JSBARCODE = 'https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.6/JsBarcode.all.min.js';
const BFORMATS = [['CODE128', 'Code 128 — any text'], ['EAN13', 'EAN-13 — retail products'], ['UPC', 'UPC-A — US retail'],
  ['EAN8', 'EAN-8 — small products'], ['CODE39', 'Code 39 — industrial'], ['ITF14', 'ITF-14 — shipping cartons'], ['codabar', 'Codabar — libraries, blood banks']];
reg({
  id: 'barcode', cat: 'biz', icon: 'barcode', name: 'Barcode generator',
  desc: 'EAN, UPC, Code 128 — single or a whole sheet.',
  long: 'Make retail barcodes (EAN-13, UPC-A, EAN-8), shipping codes (ITF-14) and general Code 128 barcodes. Download a sharp PNG or vector SVG, or paste a list and print them all onto standard label sheets. Check digits are worked out for you.',
  keys: 'barcode ean ean13 upc code128 code39 itf14 sku product label inventory sticker',
  mount(m) {
    const fmt = sel(BFORMATS, 'CODE128');
    const vals = area('TRULYFREE-001', 5);
    vals.placeholder = 'One value per line';
    const bw = num(2, 1, 6, .5), bh = num(80, 20, 300), showTxt = check('Show the number under the bars', true);
    const ink = TF.color('#000000');
    m.append(panel('Barcode', [field('Type', fmt), field('Values — one per line', vals, 'Several lines make several barcodes'),
      field('Bar width', bw), field('Height (px)', bh), field('Colour', ink)]));
    m.lastChild.querySelector('.fields').children[1].style.gridColumn = '1 / -1';
    m.lastChild.append(showTxt);
    const pv = h('div', 'panel');
    pv.style.textAlign = 'center';
    const hold = h('div'), msg = h('div', 'note');
    pv.append(h('h4', null, 'Preview'), hold, msg);
    const sheet = sel(LABELS.map(l => [l.id, l.name]), 'a4-21'), copies = num(1, 1, 500);
    m.append(pv, panel('Print on label sheets', [field('Label sheet', sheet), field('Copies of each', copies)]),
      actions([{ label: 'PNG', cls: 'pri', icon: 'download', go: png }, { label: 'SVG (vector)', icon: 'download', go: svg },
        { label: 'All as PNG (zip)', icon: 'download', go: zipAll }, { label: 'Label sheet PDF', icon: 'file', go: labels }]));
    const st = stage(m);
    let JB = null;
    const list = () => vals.value.split('\n').map(s => s.trim()).filter(Boolean);
    const opts = (o) => Object.assign({ format: fmt.value, width: +bw.value || 2, height: +bh.value || 80, displayValue: showTxt.input.checked,
      lineColor: ink.value, background: '#ffffff', margin: 10, fontSize: 18, font: 'monospace' }, o || {});
    function draw(target, v, o) {
      let ok = true;
      JB(target, v, opts(Object.assign({ valid: x => { ok = x; } }, o)));
      return ok;
    }
    async function render() {
      try { JB = JB || await lib(JSBARCODE, 'JsBarcode'); } catch (e) { msg.textContent = e.message; return; }
      hold.innerHTML = '';
      const L = list();
      if (!L.length) { msg.textContent = 'Type a value above.'; return; }
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.style.maxWidth = '100%';
      const ok = draw(s, L[0]);
      if (ok) hold.append(s);
      const bad = L.filter(v => { try { return !draw(document.createElementNS('http://www.w3.org/2000/svg', 'svg'), v); } catch (e) { return true; } });
      msg.innerHTML = !ok ? '<span style="color:var(--red)">“' + esc(L[0]) + '” is not valid for ' + esc(fmt.selectedOptions[0].textContent.split(' —')[0]) + '.</span> ' + HINT[fmt.value]
        : L.length + (L.length === 1 ? ' barcode' : ' barcodes') + (bad.length ? ' · <span style="color:var(--red)">' + bad.length + ' invalid: ' + esc(bad.slice(0, 3).join(', ')) + (bad.length > 3 ? '…' : '') + '</span>' : '') +
          (L.length > 1 ? ' · preview shows the first' : '');
    }
    const HINT = { EAN13: 'Needs 12 digits (the 13th check digit is added) or 13 with a correct check digit.', UPC: 'Needs 11 digits, or 12 with a correct check digit.',
      EAN8: 'Needs 7 digits, or 8 with a correct check digit.', ITF14: 'Needs 13 digits, or 14 with a correct check digit.', CODE39: 'Capital letters, digits and - . $ / + % space only.',
      codabar: 'Digits and - $ : / . + — optionally wrapped in A, B, C or D.', CODE128: 'Any printable characters.' };
    [fmt, vals, bw, bh, ink, showTxt.input].forEach(c => { c.oninput = c.onchange = render; });
    render();
    const canvasFor = v => { const c = document.createElement('canvas'); return draw(c, v, { width: (+bw.value || 2) * 3, height: (+bh.value || 80) * 3, fontSize: 54, margin: 30 }) ? c : null; };
    async function png() {
      const L = list(); if (!L.length || !JB) return;
      const c = canvasFor(L[0]); if (!c) return toast('Invalid value', HINT[fmt.value], true);
      dl(await canvasBlob(c, 'image/png'), safeName(L[0]) + '.png');
    }
    function svg() {
      const L = list(); if (!L.length || !JB) return;
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      if (!draw(s, L[0])) return toast('Invalid value', HINT[fmt.value], true);
      s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      dl(new Blob([new XMLSerializer().serializeToString(s)], { type: 'image/svg+xml' }), safeName(L[0]) + '.svg');
    }
    async function zipAll() {
      const L = list(); if (!L.length || !JB) return;
      st.busy('Rendering…');
      const items = [];
      for (const v of L) { const c = canvasFor(v); if (c) items.push({ name: safeName(v) + '.png', blob: await canvasBlob(c, 'image/png') }); }
      if (!items.length) return st.fail('None of those values are valid for this barcode type.');
      st.ok(items.length + ' barcodes', items.length < L.length ? (L.length - items.length) + ' invalid values were skipped' : '',
        [{ label: 'Download zip', pri: true, icon: 'download', go: () => zipUp(items, 'barcodes.zip') }]);
    }
    async function labels() {
      const L = list(); if (!L.length || !JB) return;
      st.busy('Laying out the sheet…');
      try {
        const Ls = LABELS.find(l => l.id === sheet.value), rects = labelRects(Ls), doc = await PDFDocument.create();
        const n = Math.max(1, +copies.value || 1), embs = [];
        for (const v of L) { const c = canvasFor(v); if (c) embs.push({ e: await doc.embedPng(new Uint8Array(await (await canvasBlob(c, 'image/png')).arrayBuffer())), w: c.width, h: c.height }); }
        if (!embs.length) return st.fail('None of those values are valid for this barcode type.');
        let pg = null, k = 0;
        embs.forEach(E => { for (let c = 0; c < n; c++) {
          const slot = k++ % rects.length;
          if (slot === 0) pg = doc.addPage(Ls.page);
          const r = rects[slot], b = TF.fit(E.w, E.h, r.w - 8, r.h - 6);
          pg.drawImage(E.e, { x: r.x + (r.w - b.w) / 2, y: r.y + (r.h - b.h) / 2, width: b.w, height: b.h });
        } });
        const blob = new Blob([await doc.save()], { type: 'application/pdf' });
        st.ok(k + ' labels on ' + doc.getPageCount() + (doc.getPageCount() === 1 ? ' sheet' : ' sheets'), 'Print at 100% / actual size · ' + bytes(blob.size),
          [{ label: 'Download PDF', pri: true, icon: 'download', go: () => dl(blob, 'barcode-labels.pdf') }]);
      } catch (e) { st.fail(e.message); }
    }
  }
});

/* ============================================================ spreadsheet tools */
reg({
  id: 'sheets', cat: 'txt', icon: 'table', name: 'Excel & CSV tools',
  desc: 'Convert, merge, de-duplicate spreadsheets.',
  long: 'Convert between Excel, CSV and JSON; stack several files or sheets into one; remove duplicate rows; trim stray spaces. Arabic and other scripts survive the trip to CSV — the file is saved so Excel opens it correctly.',
  keys: 'excel xlsx csv json convert merge combine duplicates dedupe spreadsheet sheets clean',
  mount(m) {
    const files = [];
    const box = h('div');
    const dz = dropzone({ icon: 'table', title: 'Drop spreadsheets here', sub: 'Excel (.xlsx, .xls), OpenDocument, CSV, TSV or JSON — several at once to merge them',
      accept: '.csv,.tsv,.txt,.xlsx,.xls,.ods,.json', multiple: true, onFiles: async fs => {
        st.busy('Reading…');
        for (const f of fs) {
          try { const sheets = await readTable(f); files.push({ name: f.name, size: f.size, sheets: sheets }); }
          catch (e) { toast('Skipped ' + f.name, e.message, true); }
        }
        st.clear(); paint();
      } });
    m.append(dz, box);
    const st = stage(m);
    const out = sel([['xlsx', 'Excel (.xlsx)'], ['csv', 'CSV'], ['json', 'JSON']], 'xlsx');
    const merge = check('Merge everything into one table', true), allSheets = check('Include every sheet, not just the first', false);
    const dedupe = check('Remove duplicate rows', false), trim = check('Trim spaces and drop empty rows', true);
    const dkey = sel([['*', 'Whole row must match']], '*');
    function paint() {
      box.innerHTML = '';
      if (!files.length) return;
      box.append(TF.fileList(files, { onChange: paint, meta: f => f.sheets.length + (f.sheets.length === 1 ? ' sheet · ' : ' sheets · ') + f.sheets[0].rows.length + ' rows' }));
      const cols = [...new Set(files.flatMap(f => f.sheets.flatMap(s => s.rows.length ? Object.keys(s.rows[0]) : [])))];
      const keep = dkey.value;
      dkey.innerHTML = '';
      [['*', 'Whole row must match']].concat(cols.map(c => [c, 'Same “' + c + '”'])).forEach(o => dkey.append(new Option(o[1], o[0])));
      dkey.value = cols.indexOf(keep) >= 0 ? keep : '*';
      const p = panel('Output', [field('Save as', out), field('Duplicates are rows with', dkey)]);
      const c = h('div', 'chks'); c.append(merge, allSheets, dedupe, trim); p.append(c);
      box.append(p, actions([{ label: 'Process', cls: 'pri', icon: 'table', go: run }, { label: 'Clear', go: () => { files.length = 0; paint(); st.clear(); } }]));
      /* the first 60 rows, with the ones that would be dropped as duplicates struck through */
      const pv = h('div'); box.append(pv);
      const show = () => {
        pv.innerHTML = '';
        const rows = files.flatMap(f => f.sheets[0].rows), cols2 = rows.length ? Object.keys(rows[0]) : [];
        if (!cols2.length) return;
        const seen = new Set(), dup = rows.map(o => {
          if (!dedupe.input.checked) return false;
          const k = dkey.value === '*' ? JSON.stringify(Object.values(o).map(v => String(v).trim())) : String(o[dkey.value]).trim().toLowerCase();
          if (seen.has(k)) return true; seen.add(k); return false;
        });
        const nd = dup.filter(Boolean).length;
        const t = table([cols2].concat(rows.slice(0, 60).map(o => cols2.map(c2 => o[c2]))), 60);
        [...t.querySelectorAll('tr')].slice(1).forEach((tr, i) => { if (dup[i]) { tr.style.background = 'var(--red-soft)'; tr.style.textDecoration = 'line-through'; tr.title = 'Duplicate — will be removed'; } });
        pv.append(h('div', 'pgl', rows.length + ' rows' + (dedupe.input.checked ? ' · <span style="color:var(--red)">' + nd + ' duplicates</span> marked in red' : '') + (rows.length > 60 ? ' · showing the first 60' : '')), t);
      };
      [dedupe.input, dkey, trim.input, merge.input].forEach(c => { c.onchange = show; });
      show();
    }
    function tidy(rows) {
      let r = rows;
      if (trim.input.checked) r = r.map(o => { const n = {}; Object.keys(o).forEach(k => { n[String(k).trim()] = typeof o[k] === 'string' ? o[k].trim() : o[k]; }); return n; })
        .filter(o => Object.values(o).some(v => v !== '' && v != null));
      if (dedupe.input.checked) {
        const seen = new Set();
        r = r.filter(o => { const k = dkey.value === '*' ? JSON.stringify(Object.values(o)) : String(o[dkey.value]).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
      }
      return r;
    }
    async function run() {
      st.busy('Working…');
      try {
        const X = await lib(XLSX_URL, 'XLSX');
        let tables = [];
        files.forEach(f => (allSheets.input.checked ? f.sheets : f.sheets.slice(0, 1)).forEach(s =>
          tables.push({ name: (files.length > 1 ? base(f.name) + (f.sheets.length > 1 ? ' - ' : '') : '') + (f.sheets.length > 1 || files.length === 1 ? s.name : ''), rows: s.rows })));
        const before = tables.reduce((a, t) => a + t.rows.length, 0);
        if (merge.input.checked) tables = [{ name: 'Merged', rows: tables.flatMap(t => t.rows) }];
        tables.forEach(t => { t.rows = tidy(t.rows); });
        const after = tables.reduce((a, t) => a + t.rows.length, 0);
        const nm = files.length === 1 ? base(files[0].name) : 'merged';
        let blob, fname;
        if (out.value === 'json') {
          blob = new Blob([JSON.stringify(tables.length === 1 ? tables[0].rows : Object.fromEntries(tables.map(t => [t.name, t.rows])), null, 2)], { type: 'application/json' });
          fname = nm + '.json';
        } else if (out.value === 'csv' && tables.length === 1) {
          blob = new Blob(['﻿' + X.utils.sheet_to_csv(X.utils.json_to_sheet(tables[0].rows))], { type: 'text/csv;charset=utf-8' });
          fname = nm + '.csv';
        } else if (out.value === 'csv') {
          const items = tables.map(t => ({ name: safeName(t.name || 'sheet') + '.csv', blob: new Blob(['﻿' + X.utils.sheet_to_csv(X.utils.json_to_sheet(t.rows))], { type: 'text/csv' }) }));
          st.ok(items.length + ' CSV files', after + ' rows', [{ label: 'Download zip', pri: true, icon: 'download', go: () => zipUp(items, nm + '-csv.zip') }]);
          return;
        } else {
          const wb = X.utils.book_new(), names = {};
          tables.forEach(t => {
            let n = String(t.name || 'Sheet').replace(/[\\\/?*\[\]:]/g, ' ').slice(0, 28) || 'Sheet';
            names[n] = (names[n] || 0) + 1;
            if (names[n] > 1) n += ' ' + names[n];
            X.utils.book_append_sheet(wb, X.utils.json_to_sheet(t.rows), n);
          });
          blob = new Blob([X.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          fname = nm + '.xlsx';
        }
        const r = st.ok('Done', before + ' rows in → ' + after + ' rows out' + (before - after ? ' (' + (before - after) + ' removed)' : '') + ' · ' + bytes(blob.size),
          [{ label: 'Download ' + fname.split('.').pop().toUpperCase(), pri: true, icon: 'download', go: () => dl(blob, fname) }]);
        const first = tables[0].rows, cols = first.length ? Object.keys(first[0]) : [];
        if (cols.length) r.append(table([cols].concat(first.slice(0, 50).map(o => cols.map(c => o[c]))), 50));
      } catch (e) { console.error(e); st.fail('Could not process: ' + e.message); }
    }
  }
});

/* ============================================================ text utilities */
function textTool(o) {
  reg({ id: o.id, cat: 'txt', icon: o.icon, name: o.name, desc: o.desc, long: o.long, keys: o.keys,
    mount(m) { o.mount(m); } });
}

textTool({
  id: 'text-diff', icon: 'diff', name: 'Text compare', desc: 'Spot every difference between two texts.',
  long: 'Paste two versions of anything — a contract clause, an essay, code, a list — and see exactly what was added and removed, word by word.',
  keys: 'diff compare difference text checker versions changes',
  mount(m) {
    const a = area('', 10), b = area('', 10);
    a.placeholder = 'Original'; b.placeholder = 'Changed';
    a.dir = b.dir = 'auto';
    const g = h('div', 'fields');
    g.append(field('Original', a), field('Changed', b));
    let unit = 'word';
    const u = seg([['word', 'By word'], ['line', 'By line'], ['char', 'By character']], 'word', v => { unit = v; go(); });
    const ic = check('Ignore upper/lower case', false), iw = check('Ignore extra spaces', true);
    const row = h('div', 'row'); row.style.marginTop = '14px'; row.append(u, ic, iw);
    const out = h('div');
    m.append(g, row, actions([{ label: 'Compare', cls: 'pri', icon: 'diff', go: go }]), out);
    [ic.input, iw.input].forEach(c => { c.onchange = go; });
    let tmr = 0;
    [a, b].forEach(x => { x.oninput = () => { clearTimeout(tmr); tmr = setTimeout(go, 350); }; });   /* live as you type */
    function go() {
      out.innerHTML = '';
      if (!a.value && !b.value) return;
      const prep = s => { let t = s.replace(/\r/g, ''); if (iw.input.checked) t = t.replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim(); return t; };
      const split = s => unit === 'line' ? s.split(/(?<=\n)/) : unit === 'char' ? [...s] : s.split(/(\s+)/).filter(Boolean);
      const A = split(prep(a.value)), B = split(prep(b.value));
      const key = x => ic.input.checked ? x.toLowerCase() : x;
      const ka = A.map(key), kb = B.map(key);
      const ops = diff(ka, kb, 8000);
      let ia = 0, ib = 0, add = 0, del = 0;
      const view = h('div', 'diff');
      view.dir = 'auto';
      ops.forEach(o => {
        if (o[0] === '=') { view.append(document.createTextNode(B[ib])); ia++; ib++; }
        else if (o[0] === '-') { const n = h('del'); n.textContent = A[ia++]; view.append(n); if (/\S/.test(n.textContent)) del++; }
        else { const n = h('ins'); n.textContent = B[ib++]; view.append(n); if (/\S/.test(n.textContent)) add++; }
      });
      const unitN = unit === 'line' ? 'line' : unit === 'char' ? 'character' : 'word';
      out.append(h('div', add || del ? 'note' : 'res', add || del
        ? '<b style="color:#05603A">' + add + ' ' + unitN + (add === 1 ? '' : 's') + ' added</b> · <b style="color:#A3262A">' + del + ' removed</b>'
        : '<b>No differences</b><p>The two texts match' + (ic.input.checked || iw.input.checked ? ' (with your ignore options).' : '.') + '</p>'), view);
    }
  }
});

textTool({
  id: 'word-count', icon: 'type', name: 'Word counter', desc: 'Words, characters and reading time.',
  long: 'Live counts as you type or paste, including the character count with and without spaces that forms and applications usually ask for.',
  keys: 'characters letters length essay limit twitter',
  mount(m) {
    const t = area('', 12);
    t.style.fontFamily = 'var(--sans)';
    t.style.fontSize = '15px';
    t.dir = 'auto';
    t.placeholder = 'Type or paste your text…';
    const out = h('div', 'panel');
    const kv = h('div', 'kv');
    /* an optional limit, shown as a bar that turns red when you go over */
    const lim = num('', 1, 1e7), unit = seg([['c', 'characters'], ['w', 'words']], 'c', () => t.oninput());
    lim.placeholder = 'e.g. 280';
    const meter = h('div', 'meter'), mi = h('i'), ml = h('div', 'note');
    meter.append(mi);
    const lp = h('div', 'row'); lp.style.marginTop = '12px'; lp.append(h('span', 'note', 'Limit'), lim, unit);
    lim.style.width = '110px'; lp.firstChild.style.margin = '0';
    out.append(h('h4', null, 'Counts'), kv, lp, meter, ml);
    m.append(t, out);
    lim.oninput = () => t.oninput();
    t.oninput = () => {
      const v = t.value;
      const words = (v.match(/\S+/g) || []).length;
      const sent = (v.match(/[^.!?؟]+[.!?؟]+/g) || []).length;
      const para = v.split(/\n{2,}/).filter(s => s.trim()).length;
      const mins = words / 220;
      const L = +lim.value || 0, used = unit.value() === 'w' ? words : [...v].length;
      meter.hidden = ml.hidden = !L;
      if (L) {
        mi.style.width = Math.min(100, used / L * 100) + '%';
        mi.style.background = used > L ? 'var(--red)' : used > L * .9 ? '#E6A01E' : 'var(--acc)';
        ml.innerHTML = used > L ? '<b style="color:var(--red)">' + (used - L) + ' over</b> the limit' : '<b>' + (L - used) + '</b> left of ' + L;
      }
      kv.innerHTML =
        '<dt>Words</dt><dd>' + words + '</dd>' +
        '<dt>Characters</dt><dd>' + [...v].length + '</dd>' +
        '<dt>Without spaces</dt><dd>' + [...v.replace(/\s/g, '')].length + '</dd>' +
        '<dt>Sentences</dt><dd>' + sent + '</dd>' +
        '<dt>Paragraphs</dt><dd>' + para + '</dd>' +
        '<dt>Reading time</dt><dd>' + (mins < 1 ? 'under a minute' : Math.round(mins) + ' min') + '</dd>';
    };
    t.oninput();
  }
});

textTool({
  id: 'case-convert', icon: 'type', name: 'Change case', desc: 'Upper, lower, title, camel, snake, kebab.',
  long: 'Switch text between every common casing convention, including the programming ones.',
  keys: 'uppercase lowercase title sentence camelcase snake kebab slug',
  mount(m) {
    const t = area('', 8);
    t.style.fontFamily = 'var(--sans)';
    t.placeholder = 'Paste text here…';
    m.append(t);
    const words = s => s.replace(/[_-]+/g, ' ').replace(/([a-z\d])([A-Z])/g, '$1 $2').split(/\s+/).filter(Boolean);
    const F = {
      'UPPER CASE': s => s.toUpperCase(),
      'lower case': s => s.toLowerCase(),
      'Title Case': s => s.replace(/\w\S*/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()),
      'Sentence case': s => s.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, c => c.toUpperCase()),
      'camelCase': s => words(s).map((w, i) => i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(''),
      'PascalCase': s => words(s).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(''),
      'snake_case': s => words(s).map(w => w.toLowerCase()).join('_'),
      'kebab-case': s => words(s).map(w => w.toLowerCase()).join('-')
    };
    const r = h('div', 'row');
    r.style.marginTop = '14px';
    Object.keys(F).forEach(k => {
      const b = h('button', 'btn sm', '<span>' + esc(k) + '</span>');
      b.onclick = () => { t.value = F[k](t.value); };
      r.append(b);
    });
    const cp = h('button', 'btn sm dark', '<span>Copy</span>');
    cp.onclick = () => copy(t.value, 'Text copied');
    r.append(cp);
    m.append(r);
  }
});

textTool({
  id: 'password', icon: 'key', name: 'Password generator', desc: 'Strong random passwords and passphrases.',
  long: 'Generated by your browser’s cryptographic random source. Nothing is transmitted, logged or stored anywhere.',
  keys: 'random secure passphrase generate strong',
  mount(m) {
    const len = num(20, 4, 128);
    const up = check('Capitals A–Z', true), lo = check('Lowercase a–z', true);
    const dg = check('Digits 0–9', true), sy = check('Symbols !@#$', true), am = check('Avoid look-alikes (0/O, 1/l)', true);
    const cnt = num(5, 1, 50);
    m.append(panel('Rules', [field('Length', len), field('How many', cnt)]));
    const box = h('div', 'panel');
    box.append(h('h4', null, 'Include'));
    [up, lo, dg, sy, am].forEach(c => { c.style.marginBottom = '8px'; box.append(c); });
    m.append(box);
    const out = h('div', 'panel');
    const list = h('div');
    const ent = h('div');
    out.append(h('h4', null, 'Passwords'), list, ent);
    m.append(actions([{ label: 'Generate', cls: 'pri', icon: 'key', go: gen }]), out);
    function gen() {
      let pool = '';
      if (up.input.checked) pool += am.input.checked ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (lo.input.checked) pool += am.input.checked ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
      if (dg.input.checked) pool += am.input.checked ? '23456789' : '0123456789';
      if (sy.input.checked) pool += '!@#$%^&*()-_=+[]{};:,.?';
      if (!pool) return toast('Pick at least one set', 'A password needs some characters to draw from.', true);
      list.innerHTML = '';
      const n = Math.max(1, Math.min(50, +cnt.value || 5)), L = Math.max(4, Math.min(128, +len.value || 20));
      const lim = Math.floor(4294967296 / pool.length) * pool.length;          /* reject biased draws */
      for (let k = 0; k < n; k++) {
        let s = '';
        while (s.length < L) {
          const a = new Uint32Array(L);
          crypto.getRandomValues(a);
          for (let i = 0; i < L && s.length < L; i++) if (a[i] < lim) s += pool[a[i] % pool.length];
        }
        const row = h('div', 'fitem');
        const code = h('span', 'nm');
        code.style.fontFamily = 'var(--mono)';
        code.style.fontSize = '13px';
        code.textContent = s;
        const b = h('button', 'btn sm', '<span>Copy</span>');
        b.onclick = () => copy(s, 'Password copied');
        row.append(code, b);
        list.append(row);
      }
      const bits = Math.round(L * Math.log2(pool.length));
      ent.innerHTML = '';
      /* strength as a bar: red weak, amber fair, green strong */
      const lvl = bits < 50 ? ['Weak', 'var(--red)'] : bits < 75 ? ['Fair', '#E6A01E'] : bits < 110 ? ['Strong', 'var(--acc)'] : ['Very strong', 'var(--acc-dk)'];
      const meter = h('div', 'meter'), mi = h('i');
      mi.style.width = Math.min(100, bits / 130 * 100) + '%'; mi.style.background = lvl[1];
      meter.append(mi);
      ent.append(meter, note('<b style="color:' + lvl[1] + '">' + lvl[0] + '</b> — about ' + bits + ' bits of randomness each. Above 75 is far beyond brute force.'));
    }
    gen();
  }
});

textTool({
  id: 'json', icon: 'code', name: 'JSON formatter', desc: 'Pretty-print, minify and validate.',
  long: 'Tidy up JSON, squash it flat, and get a precise error message when it will not parse.',
  keys: 'pretty print beautify minify validate parse',
  mount(m) {
    const t = area('', 14);
    t.placeholder = '{"paste":"your json here"}';
    m.append(t);
    const msg = h('div'), treeBox = h('div');
    /* a folding tree of the data — easier to read than braces */
    const node = (k, v) => {
      if (v && typeof v === 'object') {
        const d = h('details'), n = Array.isArray(v) ? v.length : Object.keys(v).length;
        d.open = n < 12;
        d.append(h('summary', null, (k != null ? '<b>' + esc(k) + '</b> ' : '') + '<span style="color:var(--ink3)">' + (Array.isArray(v) ? '[' + n + ' items]' : '{' + n + ' keys}') + '</span>'));
        const kids = h('div'); kids.style.cssText = 'margin-left:16px;border-left:1px dashed var(--line);padding-left:10px';
        (Array.isArray(v) ? v.map((x, i) => [i, x]) : Object.entries(v)).slice(0, 500).forEach(([kk, x]) => kids.append(node(kk, x)));
        d.append(kids); return d;
      }
      const col = typeof v === 'string' ? '#0A8A50' : typeof v === 'number' ? '#2A6FBD' : '#C96A22';
      const r = h('div'); r.innerHTML = '<b>' + esc(k) + '</b>: <span style="color:' + col + '">' + esc(JSON.stringify(v)) + '</span>';
      return r;
    };
    const showTree = v => { treeBox.innerHTML = ''; const w = h('div', 'diff'); w.style.whiteSpace = 'normal'; w.append(node(null, v)); treeBox.append(h('div', 'pgl', 'Tree view'), w); };
    const act = (label, fn) => ({ label: label, go: () => {
      try { const v = JSON.parse(t.value); t.value = fn(v); msg.innerHTML = ''; msg.append(h('div', 'res', '<b>Valid JSON</b>')); showTree(v); }
      catch (e) { msg.innerHTML = ''; treeBox.innerHTML = ''; msg.append(h('div', 'warn', esc(e.message))); }
    } });
    m.append(actions([
      Object.assign(act('Format', v => JSON.stringify(v, null, 2)), { cls: 'pri', icon: 'code' }),
      act('Minify', v => JSON.stringify(v)),
      act('Sort keys', v => JSON.stringify(sortK(v), null, 2)),
      { label: 'Copy', go: () => copy(t.value, 'JSON copied') }
    ]), msg, treeBox);
    function sortK(v) {
      if (Array.isArray(v)) return v.map(sortK);
      if (v && typeof v === 'object') {
        const o = {};
        Object.keys(v).sort().forEach(k => o[k] = sortK(v[k]));
        return o;
      }
      return v;
    }
  }
});

textTool({
  id: 'base64', icon: 'code', name: 'Base64 encoder', desc: 'Encode and decode text or files.',
  long: 'Convert text to Base64 and back, including full Unicode. You can also encode a small file into a data URL.',
  keys: 'encode decode data url atob btoa',
  mount(m) {
    const t = area('', 7);
    t.placeholder = 'Text or Base64…';
    m.append(t);
    const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 32768) s += String.fromCharCode.apply(null, u8.subarray(i, i + 32768)); return btoa(s); };
    m.append(actions([
      { label: 'Encode', cls: 'pri', icon: 'code', go: () => {
        try { t.value = toB64(new TextEncoder().encode(t.value)); }
        catch (e) { toast('Could not encode', e.message, true); } } },
      { label: 'Decode', go: () => {
        try { t.value = new TextDecoder().decode(Uint8Array.from(atob(t.value.trim().replace(/^data:[^,]*,/, '')), c => c.charCodeAt(0))); }
        catch (e) { toast('Not valid Base64', 'Check for stray characters or spaces.', true); } } },
      { label: 'Copy', go: () => copy(t.value, 'Copied') }
    ]));
    const out = h('div');
    m.append(dropzone({ icon: 'upload', title: 'Or drop a file to encode as a data URL',
      sub: 'best kept under a megabyte', onFiles: async f => {
        const r = new FileReader();
        r.onload = () => { t.value = r.result; out.innerHTML = ''; out.append(note('Encoded <b>' + esc(f[0].name) + '</b> — ' + bytes(r.result.length))); };
        r.readAsDataURL(f[0]);
      } }), out);
  }
});

textTool({
  id: 'hash', icon: 'shield', name: 'Checksum & hash', desc: 'SHA-256 and friends, for text or files.',
  long: 'Verify a download matches its published checksum, or fingerprint a file. Computed by your browser’s own crypto engine.',
  keys: 'sha256 sha1 sha512 checksum verify fingerprint',
  mount(m) {
    const alg = sel([['SHA-256', 'SHA-256'], ['SHA-1', 'SHA-1'], ['SHA-384', 'SHA-384'], ['SHA-512', 'SHA-512']], 'SHA-256');
    const t = area('', 5);
    t.placeholder = 'Text to hash…';
    const expect = txt('', 'Paste the published checksum to compare (optional)');
    m.append(panel('Algorithm', [field('Hash', alg), field('Expected value', expect)]), t);
    const out = h('div');
    m.append(actions([{ label: 'Hash the text', cls: 'pri', icon: 'shield',
      go: () => go(new TextEncoder().encode(t.value), 'text') }]), out);
    m.append(dropzone({ icon: 'upload', title: 'Or drop a file to fingerprint',
      sub: 'the file is read locally, never sent', onFiles: async f => {
        out.innerHTML = '';
        const st = stage(out);
        st.busy('Hashing ' + f[0].name);
        go(new Uint8Array(await f[0].arrayBuffer()), f[0].name);
      } }));
    async function go(buf, label) {
      try {
        const d = await crypto.subtle.digest(alg.value, buf);
        const hex = [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
        out.innerHTML = '';
        const p = h('div', 'panel');
        p.append(h('h4', null, alg.value + ' · ' + label));
        const c = h('div');
        c.style.cssText = 'font-family:var(--mono);font-size:12.5px;word-break:break-all;line-height:1.7';
        c.textContent = hex;
        p.append(c);
        const ex = expect.value.trim().toLowerCase();
        if (ex) {
          const ok = ex === hex, badge = h('div', ok ? 'res' : 'warn');
          badge.style.cssText += ';display:flex;align-items:center;gap:14px';
          badge.innerHTML = '<span style="font-size:34px;line-height:1;font-weight:800;color:' + (ok ? 'var(--acc-dk)' : 'var(--red)') + '" aria-hidden="true">' + (ok ? '✓' : '✗') + '</span><div><b>' +
            (ok ? 'Match' : 'Does not match') + '</b><p>' + (ok ? 'The file is exactly what was published.' : 'The file is different from what was published — damaged in download, or not the genuine file.') + '</p></div>';
          p.append(badge);
        }
        const b = h('button', 'btn sm dark', '<span>Copy</span>');
        b.style.marginTop = '12px';
        b.onclick = () => copy(hex, alg.value + ' copied');
        p.append(b);
        out.append(p);
      } catch (e) { out.innerHTML = ''; out.append(h('div', 'warn', esc(e.message))); }
    }
  }
});
})();
