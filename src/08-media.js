/* ============================================================ archives + video + audio */
(function () {
'use strict';
const { h, esc, ico, toast, bytes, dl, base, ext, zipUp, dropzone, fileList, stage, field, sel, num, txt, pwd,
  seg, check, panel, actions, note, reg, lib, fileBar, remount, safeName } = TF;

/* ============================================================ archives */
const SEVENZ = 'https://cdn.jsdelivr.net/npm/7z-wasm@1.2.0/7zz.umd.js';
async function sevenZip() {
  const SZ = await lib(SEVENZ, 'SevenZip');
  const log = [];
  const sz = await SZ({ print: l => log.push(l), printErr: l => log.push(l) });
  sz.log = log;
  return sz;
}
function walk(FS, dir, rel, arr) {
  FS.readdir(dir).forEach(n => {
    if (n === '.' || n === '..') return;
    const p = dir + '/' + n, s = FS.stat(p);
    if (FS.isDir(s.mode)) walk(FS, p, rel + n + '/', arr);
    else arr.push({ name: rel + n, data: FS.readFile(p) });
  });
  return arr;
}
async function extract7z(data, name, pw) {
  const sz = await sevenZip();
  const nm = 'in.' + (ext(name) || 'bin');
  sz.FS.mkdir('/w'); sz.FS.mkdir('/w/o');
  sz.FS.writeFile('/w/' + nm, data);
  sz.FS.chdir('/w');
  let code = 0;
  try { code = sz.callMain(['x', nm, '-oo', '-y', '-p' + (pw || ''), '-bd']); }
  catch (e) { code = e && e.status != null ? e.status : 2; }
  const log = sz.log.join('\n');
  const files = walk(sz.FS, '/w/o', '', []);
  if (/wrong password|can ?not open encrypted|encrypted archive|data error in encrypted/i.test(log) && (code || !files.length)) {
    const e = new Error(pw ? 'That password is not right for this archive.' : 'This archive is password-protected.');
    e.pw = true; throw e;
  }
  if (!files.length) throw new Error(/can ?not open the file as archive|is not archive/i.test(log) ? 'This is not an archive format we can open.' : 'Nothing could be extracted from this file.');
  /* .tar.gz and friends: unwrap the inner tar too */
  const d0 = files.length === 1 ? files[0].data : null;
  const ustar = d0 && d0.length > 262 && String.fromCharCode(d0[257], d0[258], d0[259], d0[260], d0[261]) === 'ustar';
  if (d0 && !/\.tar$/i.test(name) && (/\.tar$/i.test(files[0].name) || ustar)) {
    try { return await extract7z(files[0].data, files[0].name.replace(/(\.tar)?$/i, '.tar'), pw); } catch (e) {}
  }
  return files;
}
reg({
  id: 'archive', cat: 'txt', icon: 'archive', name: 'Unzip & zip files',
  desc: 'Open RAR, 7z, ZIP, TAR — or make a zip.',
  long: 'Open RAR, 7-Zip, ZIP, TAR, GZ and dozens of other archive formats without installing WinRAR or 7-Zip — password-protected ones too. Save one file or all of them. Or bundle files into a zip, optionally locked with an AES-256 password.',
  keys: 'unzip zip rar 7z 7zip tar gz tgz extract archive compress winrar password open',
  mount(m) {
    let mode = 'open';
    const s = seg([['open', 'Open an archive'], ['make', 'Make a zip']], 'open', v => { mode = v; paint(); });
    const box = h('div');
    box.style.marginTop = '16px';
    m.append(s, box);
    paint();
    function paint() {
      box.innerHTML = '';
      if (mode === 'open') openUI(); else makeUI();
    }
    function openUI() {
      const res = h('div');
      let src = null;
      const dz = dropzone({ icon: 'archive', title: 'Drop an archive here', sub: 'ZIP, RAR, 7z, TAR, GZ, BZ2, XZ, ISO, CAB…', onFiles: async f => {
        src = { name: f[0].name, size: f[0].size, data: new Uint8Array(await f[0].arrayBuffer()) };
        dz.hidden = true;
        go('');
      } });
      box.append(dz, res);
      async function go(pw) {
        res.innerHTML = '';
        res.append(fileBar(src, () => paint()));
        const st = stage(res);
        st.busy('Opening…');
        let files = null;
        try {
          if (/^zip$/i.test(ext(src.name)) && !pw) {
            try {
              const z = await JSZip.loadAsync(src.data);
              files = [];
              for (const e of Object.values(z.files)) if (!e.dir) files.push({ name: e.name, data: await e.async('uint8array') });
            } catch (e) { files = null; }
          }
          if (!files) {
            st.busy('Downloading the 7-Zip engine (one time, 1.6 MB)…');
            files = await extract7z(src.data, src.name, pw);
          }
        } catch (e) {
          if (e.pw) {
            st.clear();
            const p = pwd('Archive password');
            res.append(panel(e.message, [field('Password', p)]), actions([{ label: 'Open', cls: 'pri', icon: 'unlock', go: () => go(p.value) }]));
            p.onkeydown = ev => { if (ev.key === 'Enter') go(p.value); };
            setTimeout(() => p.focus(), 50);
            return;
          }
          return st.fail(e.message);
        }
        const total = files.reduce((a, f) => a + f.data.length, 0);
        st.ok(files.length + (files.length === 1 ? ' file' : ' files') + ' inside', bytes(total) + ' uncompressed',
          [{ label: 'Download everything (zip)', pri: true, icon: 'download', go: () => zipUp(files.map(f => ({ name: f.name, blob: new Blob([f.data]) })), base(src.name) + '.zip') }]);
        /* a folder tree; each file's bar shows its size against the largest one */
        const big = Math.max(...files.map(f => f.data.length), 1), shown = files.slice(0, 600);
        const tree = {};
        shown.forEach(f => { const parts = f.name.split('/'), dir = parts.slice(0, -1).join('/'); (tree[dir] = tree[dir] || []).push(f); });
        const list = h('div', 'flist');
        Object.keys(tree).sort().forEach(dir => {
          let host = list;
          if (dir) {
            const d = h('details'); d.open = Object.keys(tree).length < 6;
            const sm = h('summary', 'fitem', ico('archive').replace('<svg', '<svg width="16" height="16"') + '<span class="nm">' + esc(dir) + '/</span><span class="mt">' + tree[dir].length + ' files</span>');
            sm.style.cursor = 'pointer';
            d.append(sm); list.append(d);
            host = h('div', 'flist'); host.style.cssText = 'margin:8px 0 0 22px'; d.append(host);
          }
          tree[dir].forEach(f => {
            const it = h('div', 'fitem');
            const nm = f.name.split('/').pop();
            const barw = Math.max(2, f.data.length / big * 100);
            it.append(h('span', 'gr', ico('file')), h('span', 'nm', esc(nm)),
              h('span', null, '<span style="display:inline-block;width:70px;height:6px;border-radius:9px;background:var(--line2);vertical-align:middle"><i style="display:block;height:100%;width:' + barw + '%;border-radius:9px;background:var(--acc)"></i></span>'),
              h('span', 'mt', bytes(f.data.length)));
            const b = h('button', 'btn sm', '<span>Save</span>');
            b.setAttribute('aria-label', 'Save ' + nm);
            b.onclick = () => dl(new Blob([f.data]), nm);
            it.append(b);
            host.append(it);
          });
        });
        res.append(list);
        if (files.length > 600) res.append(note('Showing the first 600 files. “Download everything” includes all ' + files.length + '.'));
      }
    }
    function makeUI() {
      const files = [];
      const list = h('div');
      const zname = txt('archive', 'File name'), zpw = pwd('optional'), level = sel([['6', 'Normal'], ['9', 'Smallest'], ['1', 'Fastest']], '6');
      const dz = dropzone({ icon: 'upload', title: 'Drop the files to zip', sub: 'as many as you like', multiple: true, onFiles: fs => {
        fs.forEach(f => files.push(f)); paintList();
      } });
      box.append(dz, list);
      const st = stage(box);
      function paintList() {
        list.innerHTML = '';
        if (!files.length) return;
        list.append(fileList(files, { onChange: paintList }),
          panel('Zip', [field('Name', zname), field('Password', zpw, 'Encrypts with AES-256. Opens in 7-Zip, WinRAR, macOS Archive Utility and most modern tools; Windows’ built-in unzip cannot open it.'), field('Compression', level)]),
          actions([{ label: 'Make zip of ' + files.length + (files.length === 1 ? ' file' : ' files'), cls: 'pri', icon: 'archive', go: make }]));
      }
      async function make() {
        const name = safeName(zname.value || 'archive').replace(/\.zip$/i, '') + '.zip';
        st.busy('Zipping…');
        try {
          if (!zpw.value) {
            const z = new JSZip();
            files.forEach(f => z.file(f.name, f));
            const blob = await z.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: +level.value } }, md => st.step(md.percent, 100));
            return st.ok('Zip ready', bytes(blob.size), [{ label: 'Download zip', pri: true, icon: 'download', go: () => dl(blob, name) }]);
          }
          st.busy('Downloading the 7-Zip engine (one time, 1.6 MB)…');
          const sz = await sevenZip();
          sz.FS.mkdir('/w'); sz.FS.mkdir('/w/f');
          const used = {};
          for (const f of files) {
            let n = f.name.replace(/[\/\\]/g, '_');
            used[n] = (used[n] || 0) + 1;
            if (used[n] > 1) n = base(n) + ' (' + used[n] + ')' + (ext(n) ? '.' + ext(n) : '');
            sz.FS.writeFile('/w/f/' + n, new Uint8Array(await f.arrayBuffer()));
          }
          sz.FS.chdir('/w/f');
          st.busy('Encrypting and zipping…');
          try { sz.callMain(['a', '-tzip', '-mem=AES256', '-mx=' + level.value, '-p' + zpw.value, '/w/out.zip', '.', '-bd']); } catch (e) {}
          let data;
          try { data = sz.FS.readFile('/w/out.zip'); } catch (e) { throw new Error('7-Zip could not create the archive.'); }
          const blob = new Blob([data], { type: 'application/zip' });
          st.ok('Password-protected zip ready', 'AES-256 · ' + bytes(blob.size), [{ label: 'Download zip', pri: true, icon: 'download', go: () => dl(blob, name) }]);
        } catch (e) { st.fail(e.message); }
      }
    }
  }
});

/* ============================================================ ffmpeg */
const FF = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js';
const FF_WORKER = 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/814.ffmpeg.js';
/* a custom worker URL makes ffmpeg start a module worker, which can only import the ESM core */
const FF_CORE = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/';
let ffP = null;
function ffmpeg() {
  if (ffP) return ffP;
  ffP = (async () => {
    await lib(FF, 'FFmpegWASM');
    /* browsers refuse to start a worker straight from another origin; a blob copy is allowed */
    const src = await (await fetch(FF_WORKER)).text();
    const workerURL = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const ff = new FFmpegWASM.FFmpeg();
    await ff.load({ coreURL: FF_CORE + 'ffmpeg-core.js', wasmURL: FF_CORE + 'ffmpeg-core.wasm', classWorkerURL: workerURL });
    return ff;
  })();
  ffP.catch(() => { ffP = null; });
  return ffP;
}
let ffBusy = false;
async function runFF(file, build, outName, st) {
  if (ffBusy) throw new Error('Another video or audio job is still running. Wait for it to finish.');
  ffBusy = true;
  try {
    st.busy('Downloading the video engine (one time, about 32 MB)…');
    let ff;
    try { ff = await ffmpeg(); }
    catch (e) { throw new Error('The video engine did not load (' + (e && e.message || e) + '). Check your connection; very old browsers are not supported.'); }
    const inName = 'in.' + (ext(file.name) || 'mp4');
    st.busy('Reading ' + file.name + '…');
    await ff.writeFile(inName, new Uint8Array(await file.arrayBuffer()));
    const log = [];
    const onLog = e => { log.push(e.message); if (log.length > 80) log.shift(); };
    const onProg = e => { const p = Math.max(0, Math.min(1, e.progress || 0)); st.step(p, 1, 'Processing on your device — ' + Math.round(p * 100) + '%'); };
    ff.on('log', onLog); ff.on('progress', onProg);
    st.busy('Processing on your device…');
    try {
      const code = await ff.exec(build(inName));
      if (code !== 0) {
        const why = log.filter(l => /error|invalid|unknown|not|fail/i.test(l)).slice(-2).join(' · ');
        throw new Error('The conversion stopped' + (why ? ': ' + why : '.') + ' The file may use a format the engine cannot read.');
      }
      return await ff.readFile(outName);
    } finally {
      ff.off('log', onLog); ff.off('progress', onProg);
      try { await ff.deleteFile(inName); } catch (e) {}
      try { await ff.deleteFile(outName); } catch (e) {}
    }
  } finally { ffBusy = false; }
}
const tsec = s => {
  const p = String(s || '').trim().split(':').map(Number);
  if (p.some(isNaN)) return NaN;
  return p.reduce((a, v) => a * 60 + v, 0);
};
const tfmt = s => { s = Math.max(0, s || 0); const m2 = Math.floor(s / 60), r = (s - m2 * 60).toFixed(1); return m2 + ':' + (r < 10 ? '0' : '') + r; };
const MIMES = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', gif: 'image/gif', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav', flac: 'audio/flac', ogg: 'audio/ogg', opus: 'audio/ogg', mkv: 'video/x-matroska' };
function showResult(st, data, name, origSize) {
  const e = ext(name), blob = new Blob([data], { type: MIMES[e] || 'application/octet-stream' });
  const r = st.ok('Done', bytes(blob.size), [{ label: 'Download ' + e.toUpperCase(), pri: true, icon: 'download', go: () => dl(blob, name) }]);
  const url = URL.createObjectURL(blob);
  const v = e === 'gif' ? h('img') : h(/^(mp3|m4a|wav|flac|ogg|opus)$/.test(e) ? 'audio' : 'video', 'media');
  v.src = url;
  if (v.tagName !== 'IMG') v.controls = true; else { v.alt = 'Your GIF'; v.style.cssText = 'max-width:100%;margin-top:14px;border-radius:10px'; }
  if (v.tagName === 'AUDIO') v.style.cssText = 'width:100%;margin-top:14px';
  r.append(v);
  if (origSize) r.append(TF.sizeGauge(origSize, blob.size));
}
const VIDEO_ACCEPT = 'video/*,.mkv,.mov,.avi,.webm,.m4v,.3gp,.flv,.wmv,.ts,.mts';
const clock = s => { s = Math.max(0, s || 0); const m2 = Math.floor(s / 60), r = s - m2 * 60; return m2 + ':' + (r < 10 ? '0' : '') + r.toFixed(1); };

/* ---------- the timeline: drag two handles to choose the part you want ---------- */
function timeline(o) {
  const D = o.duration, el = h('div', 'tl'), bg = h('canvas');
  const shL = h('div', 'shade'), shR = h('div', 'shade'), box = h('div', 'selbox'), head = h('div', 'head');
  const gA = h('button', 'grip'), gB = h('button', 'grip');
  [[gA, 'Start of the part you keep'], [gB, 'End of the part you keep']].forEach(x => {
    x[0].type = 'button'; x[0].setAttribute('role', 'slider'); x[0].setAttribute('aria-label', x[1]);
    x[0].setAttribute('aria-valuemin', '0'); x[0].setAttribute('aria-valuemax', String(D.toFixed(1)));
  });
  el.append(bg, shL, shR, box, head, gA, gB);
  const read = h('div', 'tl-read');
  let a = 0, b = D;
  const pct = t => t / D * 100;
  function paint() {
    shL.style.left = '0'; shL.style.width = pct(a) + '%';
    shR.style.left = pct(b) + '%'; shR.style.right = '0';
    box.style.left = pct(a) + '%'; box.style.width = pct(b - a) + '%';
    gA.style.left = pct(a) + '%'; gB.style.left = pct(b) + '%';
    gA.setAttribute('aria-valuenow', a.toFixed(1)); gA.setAttribute('aria-valuetext', clock(a));
    gB.setAttribute('aria-valuenow', b.toFixed(1)); gB.setAttribute('aria-valuetext', clock(b));
    read.innerHTML = '<span>Start <b>' + clock(a) + '</b></span><span>Keeping <b>' + clock(b - a) + '</b> of ' + clock(D) + '</span><span>End <b>' + clock(b) + '</b></span>';
    if (o.onChange) o.onChange(a, b);
  }
  const timeAt = x => { const r = el.getBoundingClientRect(); return Math.max(0, Math.min(D, (x - r.left) / r.width * D)); };
  const setA = t => { a = Math.max(0, Math.min(t, b - .1)); paint(); };
  const setB = t => { b = Math.min(D, Math.max(t, a + .1)); paint(); };
  [[gA, setA, () => a], [gB, setB, () => b]].forEach(([g, set, get]) => {
    g.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation(); g.setPointerCapture(e.pointerId);
      const mv = ev => { set(timeAt(ev.clientX)); if (o.media) o.media.currentTime = get(); };
      const up = () => { g.removeEventListener('pointermove', mv); g.removeEventListener('pointerup', up); };
      g.addEventListener('pointermove', mv); g.addEventListener('pointerup', up);
    });
    g.addEventListener('keydown', e => {
      const step = e.shiftKey ? 1 : .1, d = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step }[e.key];
      if (d != null) { e.preventDefault(); set(get() + d); if (o.media) o.media.currentTime = get(); }
      if (e.key === 'Home') { e.preventDefault(); set(0); }
      if (e.key === 'End') { e.preventDefault(); set(D); }
    });
  });
  el.addEventListener('pointerdown', e => { if (e.target.closest('.grip')) return; if (o.media) o.media.currentTime = timeAt(e.clientX); });
  /* playhead follows the media while it plays */
  let raf = 0;
  const follow = () => { if (!el.isConnected) return; if (o.media) head.style.left = pct(o.media.currentTime || 0) + '%'; raf = requestAnimationFrame(follow); };
  follow();
  async function drawBg() {
    const r = el.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    bg.width = Math.max(1, Math.round(r.width * dpr)); bg.height = Math.max(1, Math.round(r.height * dpr));
    if (o.draw) await o.draw(bg.getContext('2d'), bg.width, bg.height);
  }
  el.range = () => [a, b];
  el.set = (x, y) => { a = x; b = y; paint(); };
  el.setA = setA; el.setB = setB;
  el.read = read;
  el.redraw = drawBg;
  requestAnimationFrame(() => { paint(); drawBg(); });
  return el;
}
/* frames from the video, laid side by side as the timeline's background */
function frameStrip(url, D) {
  return async (ctx, W, H) => {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.src = url; v.playsInline = true;
    await new Promise((res, rej) => { v.onloadeddata = res; v.onerror = rej; setTimeout(res, 4000); });
    const fw = Math.max(40, H * (v.videoWidth / Math.max(1, v.videoHeight))), n = Math.ceil(W / fw);
    for (let i = 0; i < n; i++) {
      const t = Math.min(D - .05, (i + .5) / n * D);
      await new Promise(res => { const done = () => { v.removeEventListener('seeked', done); res(); }; v.addEventListener('seeked', done); v.currentTime = t; setTimeout(done, 1500); });
      try { ctx.drawImage(v, i * fw, 0, fw, H); } catch (e) {}
    }
    v.removeAttribute('src'); v.load();
  };
}
/* the sound's shape as the timeline's background */
function waveform(file, D) {
  return async (ctx, W, H) => {
    ctx.fillStyle = '#1B2220'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4C5A55';
    if (D > 1500 || file.size > 120e6) { for (let x = 0; x < W; x += 4) ctx.fillRect(x, H / 2 - 1, 2, 2); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
      const buf = await ac.decodeAudioData(await file.arrayBuffer());
      ac.close && ac.close();
      const ch = buf.getChannelData(0), step = Math.max(1, Math.floor(ch.length / (W / 3)));
      let max = 0; const peaks = [];
      for (let i = 0; i < ch.length; i += step) { let p = 0; for (let j = i; j < i + step && j < ch.length; j += 16) p = Math.max(p, Math.abs(ch[j])); peaks.push(p); max = Math.max(max, p); }
      ctx.fillStyle = '#8FE3B7';
      peaks.forEach((p, i) => { const hh = Math.max(2, p / (max || 1) * H * .86); ctx.fillRect(i * 3, (H - hh) / 2, 2, hh); });
    } catch (e) { for (let x = 0; x < W; x += 4) ctx.fillRect(x, H / 2 - 1, 2, 2); }
  };
}
/* play just the chosen part */
function playPart(media, tl) {
  const [a, b] = tl.range();
  media.currentTime = a;
  const stop = () => { if (media.currentTime >= b) { media.pause(); media.removeEventListener('timeupdate', stop); } };
  media.addEventListener('timeupdate', stop);
  media.play();
}
function partButtons(media, tl) {
  const r = actions([{ label: '▶ Play this part', go: () => playPart(media, tl) },
    { label: 'Start here', go: () => tl.setA(media.currentTime) }, { label: 'End here', go: () => tl.setB(media.currentTime) }]);
  r.style.marginTop = '10px';
  r.children[1].title = 'Move the start handle to where the video is now';
  r.children[2].title = 'Move the end handle to where the video is now';
  return r;
}

/* ============================================================ video studio */
const MAKE = [['mp4', 'video', 'MP4 video', 'Trim and/or shrink it'], ['gif', 'gif', 'GIF', 'A looping animation'],
  ['mp3', 'music', 'Sound only', 'MP3, M4A or WAV'], ['mute', 'video', 'Silent video', 'Remove the sound']];
function mountVideo(m, op0) {
  let file = null, url = null;
  const head = h('div');
  const dz = dropzone({ icon: 'video', title: 'Drop a video here', sub: 'MP4, MOV, MKV, WebM, AVI — processed on your device, never uploaded', accept: VIDEO_ACCEPT, onFiles: f => {
    file = f[0]; dz.hidden = true;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(file);
    open();
  } });
  m.append(dz, head);
  function open() {
    head.innerHTML = '';
    head.append(fileBar({ name: file.name, size: file.size }, () => remount(m, m.__tool || 'video-editor')));
    const vid = h('video', 'media');
    vid.src = url; vid.controls = true; vid.preload = 'metadata'; vid.playsInline = true;
    head.append(vid);
    const rest = h('div'); head.append(rest);
    vid.onloadedmetadata = () => build(vid, rest);
    vid.onerror = () => { build(vid, rest, true); rest.prepend(h('div', 'warn', 'This browser cannot play this video format, so there is no timeline to trim on — but it can still be converted. Make an MP4 first to trim it visually.')); };
  }
  function build(vid, rest, noPreview) {
    rest.innerHTML = '';
    const D = noPreview || !isFinite(vid.duration) ? 0 : vid.duration;
    let op = op0 === 'compress' ? 'mp4' : op0 || 'mp4', tl = null;
    if (D) {
      tl = timeline({ duration: D, media: vid, draw: frameStrip(url, D) });
      rest.append(h('div', 'pgl', 'Drag the yellow handles to keep only the part you want'), tl, tl.read, partButtons(vid, tl));
    }
    const make = TF.choice(MAKE, op, v => { op = v; opts(); });
    make.classList.add('compact');
    const p = h('div', 'panel'); p.style.marginTop = '16px';
    p.append(h('h4', null, 'Make'), make);
    const optBox = h('div'); p.append(optBox);
    const go = h('div');
    rest.append(p, go);
    const st = stage(rest);
    const q = seg([['copy', 'Original'], ['23', 'High'], ['28', 'Balanced'], ['33', 'Small']], op0 === 'compress' ? '28' : 'copy', () => opts());
    const mh = seg([['0', 'Same size'], ['1080', '1080p'], ['720', '720p'], ['480', '480p'], ['360', '360p']], op0 === 'compress' ? '720' : '0', () => {});
    const gw = seg([['320', 'Small'], ['480', 'Medium'], ['640', 'Large']], '480', () => {}), gf = seg([['10', 'Choppy'], ['15', 'Smooth'], ['24', 'Very smooth']], '15', () => {});
    const af = seg([['mp3', 'MP3'], ['m4a', 'M4A'], ['wav', 'WAV']], 'mp3', () => {});
    function opts() {
      optBox.innerHTML = ''; go.innerHTML = '';
      const g = h('div', 'fields'); g.style.marginTop = '14px';
      if (op === 'mp4') {
        g.append(field('Quality', q, q.value() === 'copy' ? 'Instant and lossless — cuts land on the nearest keyframe' : 'Re-encodes to H.264 — plays everywhere'));
        if (q.value() !== 'copy') g.append(field('Maximum height', mh, '720p looks fine on phones at a fraction of the size'));
      } else if (op === 'gif') g.append(field('Width', gw), field('Smoothness', gf, D && tl && tl.range()[1] - tl.range()[0] > 30 ? 'Only the first 30 seconds of your selection are used' : 'Short clips make small GIFs'));
      else if (op === 'mp3') g.append(field('Format', af));
      else g.append(note('Keeps the picture exactly as it is — instant, no quality loss.'));
      optBox.append(g);
      go.append(actions([{ label: { mp4: 'Make MP4', gif: 'Make GIF', mp3: 'Save the sound', mute: 'Remove the sound' }[op], cls: 'pri', icon: op === 'gif' ? 'gif' : op === 'mp3' ? 'music' : 'video', go: run }]));
    }
    opts();
    async function run() {
      const e0 = ext(file.name) || 'mp4', keep = /^(mp4|mov|mkv|webm|m4v)$/.test(e0) ? e0 : 'mp4', nm = base(file.name);
      const [a, b] = tl ? tl.range() : [0, 0], whole = !tl || (a < .05 && b > D - .05);
      const cut = (pre, d) => whole ? [] : pre ? ['-ss', a.toFixed(2)] : ['-t', (d || b - a).toFixed(2)];
      const h264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'], aac = ['-c:a', 'aac', '-b:a', '128k'], fast = ['-movflags', '+faststart'];
      let out, build2;
      if (op === 'mp4' && q.value() === 'copy') {
        out = nm + '-clip.' + keep;
        build2 = i => cut(1).concat(['-i', i], cut(0), ['-c', 'copy', '-avoid_negative_ts', 'make_zero', 'out.' + keep]);
      } else if (op === 'mp4') {
        out = nm + '-small.mp4';
        const vf = +mh.value() ? ['-vf', "scale=-2:'min(" + mh.value() + ",ih)'"] : [];
        build2 = i => cut(1).concat(['-i', i], cut(0), vf, h264, ['-crf', q.value()], aac, fast, ['out.mp4']);
      } else if (op === 'gif') {
        out = nm + '.gif';
        const len = Math.min(30, whole ? Math.min(D || 10, 30) : b - a);
        build2 = i => ['-ss', (whole ? 0 : a).toFixed(2), '-t', len.toFixed(2), '-i', i, '-vf', 'fps=' + gf.value() + ',scale=' + gw.value() + ':-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4', '-loop', '0', 'out.gif'];
      } else if (op === 'mp3') {
        const f = af.value();
        out = nm + '.' + f;
        build2 = i => cut(1).concat(['-i', i], cut(0), ['-vn'], f === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', '192k'] : f === 'm4a' ? ['-c:a', 'aac', '-b:a', '192k'] : ['-c:a', 'pcm_s16le'], ['out.' + f]);
      } else {
        out = nm + '-silent.' + keep;
        build2 = i => cut(1).concat(['-i', i], cut(0), ['-c:v', 'copy', '-an', 'out.' + keep]);
      }
      try { showResult(st, await runFF(file, build2, 'out.' + ext(out), st), out, file.size); }
      catch (e) { console.error(e); st.fail(e.message); }
    }
  }
}
reg({
  id: 'video-editor', cat: 'av', icon: 'video', name: 'Video studio', tag: 'No upload',
  desc: 'Trim on a timeline, shrink, make GIFs, pull the sound out.',
  long: 'Drop a video and drag two handles on its timeline to keep just the part you want. Then save it as a smaller MP4, a GIF, the sound only, or without sound — all processed on your own device.',
  keys: 'video editor trim cut compress gif mp3 mute timeline mp4 mov',
  mount(m) { m.__tool = 'video-editor'; mountVideo(m, 'mp4'); }
});
function videoTool(id, icon, name, task, desc, long, keys, op, tag) {
  reg({ id: id, cat: 'av', icon: icon, name: name, task: task, desc: desc, long: long, keys: keys, tag: tag, studio: 'video-editor',
    mount(m) { m.__tool = id; mountVideo(m, op); } });
}
videoTool('video-compress', 'compress', 'Compress video', 'Compress', 'Shrink videos for WhatsApp, email and uploads.',
  'Make a video file much smaller — to fit a messaging or email limit, or an upload form — while keeping it watchable. Trim it on the timeline first if you only need part of it.',
  'compress video shrink reduce size mp4 whatsapp email upload smaller', 'compress');
videoTool('video-trim', 'scissors', 'Trim & convert video', 'Trim', 'Drag two handles to keep the part you want.',
  'Drag the handles on the timeline to keep just the part you want — instantly and without quality loss — or convert MOV, MKV, AVI and WebM into an MP4 that plays everywhere.',
  'trim cut clip video convert mov mkv avi webm mp4 format', 'mp4');
videoTool('video-gif', 'gif', 'Video to GIF', 'GIF', 'Pick the moment on the timeline, get a GIF.',
  'Drag the handles to the moment you want and get a smooth, well-coloured looping GIF. No watermark.',
  'gif animated video convert loop meme', 'gif');
videoTool('extract-audio', 'music', 'Extract audio from video', 'Sound only', 'Save the soundtrack as MP3.',
  'Pull the sound out of a video as MP3, M4A or WAV — all of it, or just the part you select on the timeline.',
  'extract audio mp3 from video sound soundtrack rip convert', 'mp3');

/* ============================================================ audio studio */
reg({
  id: 'audio-convert', cat: 'av', icon: 'music', name: 'Audio studio',
  desc: 'See the sound, trim it, convert to MP3, WAV, M4A, FLAC.',
  long: 'Drop a voice note, recording or song and see its waveform. Drag the handles to trim, add a fade, even out the volume, and save as MP3, M4A, WAV, FLAC, OGG or Opus.',
  keys: 'audio convert mp3 wav m4a flac ogg opus aac voice note recording trim volume normalize loudness waveform fade',
  mount(m) {
    let file = null, url = null;
    const box = h('div');
    const dz = dropzone({ icon: 'music', title: 'Drop an audio file', sub: 'MP3, WAV, M4A, AAC, FLAC, OGG, OPUS, WMA, AMR — or a video', accept: 'audio/*,video/*,.opus,.amr,.wma,.m4a,.flac', onFiles: f => {
      file = f[0]; dz.hidden = true;
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(file);
      paint();
    } });
    m.append(dz, box);
    function paint() {
      box.innerHTML = '';
      box.append(fileBar({ name: file.name, size: file.size }, () => remount(m, 'audio-convert')));
      const au = h('audio'); au.src = url; au.controls = true; au.style.cssText = 'width:100%;margin-top:14px';
      box.append(au);
      const rest = h('div'); box.append(rest);
      const ready = () => build(isFinite(au.duration) ? au.duration : 0);
      au.onloadedmetadata = ready;
      au.onerror = () => build(0);
      function build(D) {
        rest.innerHTML = '';
        let tl = null;
        if (D) {
          tl = timeline({ duration: D, media: au, draw: waveform(file, D) });
          rest.append(h('div', 'pgl', 'Drag the yellow handles to trim'), tl, tl.read, partButtons(au, tl));
        } else rest.append(note('This browser cannot play this format, but it can still convert it.'));
        const fmt = TF.choice([['mp3', 'music', 'MP3', 'Plays everywhere'], ['m4a', 'music', 'M4A', 'Apple-friendly AAC'], ['wav', 'file', 'WAV', 'Uncompressed, for editing'],
          ['flac', 'file', 'FLAC', 'Lossless, smaller than WAV'], ['ogg', 'music', 'OGG', 'Open format'], ['opus', 'music', 'Opus', 'Tiny, great for speech']], 'mp3', v => { qf.hidden = v === 'wav' || v === 'flac'; });
        fmt.classList.add('compact');
        const br = seg([['128k', 'Voice'], ['192k', 'Good'], ['256k', 'High'], ['320k', 'Best']], '192k', () => {});
        const qf = field('Quality', br);
        const loud = check('Even out the volume (loudness normalisation)', false), mono = check('Mono — halves the size, fine for speech', false);
        const fin = check('Fade in (2 s)', false), fout = check('Fade out (2 s)', false);
        const p = h('div', 'panel'); p.style.marginTop = '16px';
        p.append(h('h4', null, 'Save as'), fmt);
        const g = h('div', 'fields'); g.style.marginTop = '12px'; g.append(qf); p.append(g);
        const c = h('div', 'chks'); c.append(loud, mono, fin, fout); p.append(c);
        rest.append(p, actions([{ label: 'Convert', cls: 'pri', icon: 'music', go: run }]));
        const st = stage(rest);
        async function run() {
          const f = fmt.value, nm = base(file.name);
          const [a, b] = tl ? tl.range() : [0, D], whole = !tl || (a < .05 && b > D - .05), len = (b - a) || D;
          const codec = { mp3: ['-c:a', 'libmp3lame', '-b:a', br.value()], m4a: ['-c:a', 'aac', '-b:a', br.value()], wav: ['-c:a', 'pcm_s16le'],
            flac: ['-c:a', 'flac'], ogg: ['-c:a', 'libvorbis', '-b:a', br.value()], opus: ['-c:a', 'libopus', '-b:a', br.value()] }[f];
          const outExt = f === 'opus' ? 'ogg' : f;
          const af = [];
          if (loud.input.checked) af.push('loudnorm=I=-16:TP=-1.5:LRA=11');
          if (fin.input.checked) af.push('afade=t=in:st=0:d=2');
          if (fout.input.checked && len > 2) af.push('afade=t=out:st=' + Math.max(0, len - 2).toFixed(2) + ':d=2');
          const build2 = i => [].concat(whole ? [] : ['-ss', a.toFixed(2)], ['-i', i], whole ? [] : ['-t', (b - a).toFixed(2)], ['-vn'],
            af.length ? ['-af', af.join(',')] : [], mono.input.checked ? ['-ac', '1'] : [], codec, ['out.' + outExt]);
          try { showResult(st, await runFF(file, build2, 'out.' + outExt, st), nm + (whole ? '' : '-trimmed') + (f === 'opus' ? '.opus.ogg' : '.' + f), file.size); }
          catch (e) { console.error(e); st.fail(e.message); }
        }
      }
    }
  }
});
})();
