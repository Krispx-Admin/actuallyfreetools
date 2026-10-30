/* serve the app, launch headless Edge, run tests.js in the page over CDP
   node dev/runner.js [filter|-] [heavy|-] [site]   — "site" tests the built ./site instead of actuallyfreetools.html */
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const SITE_MODE = process.argv[4] === 'site';
const SITE = path.resolve(__dirname, '..', SITE_MODE ? 'site' : '');
const START = SITE_MODE ? '/' : '/actuallyfreetools.html';
const B = __dirname;
const only = process.argv[2] && process.argv[2] !== '-' ? process.argv[2].split(',') : null;
const heavy = process.argv[3] === 'heavy';
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript', css: 'text/css', svg: 'image/svg+xml', txt: 'text/plain', xml: 'application/xml' };
const server = http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(SITE, p.replace(/^\/+/, ''));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); r.end(d); });
}).listen(8765);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const prof = path.join(require('os').tmpdir(), 'trulyfree-edge-profile');
const br = spawn(EDGE, ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=' + prof, '--no-first-run', '--no-default-browser-check',
  '--window-size=1280,1000', '--enable-unsafe-swiftshader', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let tgt;
  for (let i = 0; i < 60 && !tgt; i++) { await sleep(500); try { const l = await (await fetch('http://127.0.0.1:9333/json')).json(); tgt = l.find(t => t.type === 'page'); } catch (e) {} }
  if (!tgt) throw new Error('no browser');
  const ws = new WebSocket(tgt.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 0; const pend = {}, logs = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id]; return; }
    if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + JSON.stringify(m.params.exceptionDetails).slice(0, 400));
    if (m.method === 'Runtime.consoleAPICalled' && /error|warn/.test(m.params.type)) logs.push(m.params.type + ' ' + m.params.args.map(a => a.value || a.description || '').join(' ').slice(0, 300));
    if (m.method === 'Page.loadEventFired') pend.load && pend.load();
  };
  const send = (method, params) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable');
  await send('Browser.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});
  const loaded = new Promise(r => pend.load = r);
  await send('Page.navigate', { url: 'http://127.0.0.1:8765' + START });
  await loaded; await sleep(800);
  const src = fs.readFileSync(path.join(B, 'tests.js'), 'utf8');
  const res = await send('Runtime.evaluate', { expression: src + '\nrunTests(' + JSON.stringify(only) + ',' + heavy + ')', awaitPromise: true, returnByValue: true, timeout: 3600000 });
  if (res.result.exceptionDetails) console.log('EVAL ERROR', JSON.stringify(res.result.exceptionDetails).slice(0, 1500));
  const v = res.result.result.value || {};
  (v.results || []).forEach(t => console.log((t.ok === true ? 'PASS' : t.ok === false ? 'FAIL' : 'SKIP') + '  ' + t.name + (t.ms != null ? '  (' + t.ms + 'ms)' : '') + '\n      ' + t.detail));
  if (v.errors && v.errors.length) console.log('PAGE ERRORS:\n  ' + v.errors.join('\n  '));
  if (logs.length) console.log('CONSOLE:\n  ' + logs.slice(0, 40).join('\n  '));
  ws.close(); br.kill(); server.close(); process.exit(0);
})().catch(e => { console.log('RUNNER', e); br.kill(); server.close(); process.exit(1); });
