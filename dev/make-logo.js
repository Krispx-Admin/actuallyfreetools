/* Draws the 32×32 pixel-art logo — a sheet of paper with a folded corner, held by a
   paperclip — and writes it as a crisp SVG and as PNGs (favicon, app icon, preview).
   node dev/make-logo.js  → src/logo/{logo.svg, logo-32.png, logo-180.png, logo-512.png, preview.png} */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const OUT = path.resolve(__dirname, '../src/logo');
fs.mkdirSync(OUT, { recursive: true });

const C = {
  K: '#0F1412',   // ink outline
  W: '#FFFFFF',   // paper
  S: '#E4E8E6',   // paper shade along the right and bottom
  F: '#C9D0CD',   // the folded corner
  T: '#9AA5A1',   // lines of text
  A: '#12C474',   // paperclip
  D: '#0A7A46',   // paperclip shadow side
  L: '#DDF95C'    // paperclip highlight
};
const N = 32, g = Array.from({ length: N }, () => Array(N).fill('.'));
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; };

/* the paperclip: two nested loops. The outer loop is drawn first so the sheet hides its
   back leg; the inner loop is drawn after the sheet, so the clip grips the paper's edge */
const capsule = (px, py, ax, ay, bx, by) => {
  const vx = bx - ax, vy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
};
function clip(part) {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const cx = x + .5, cy = y + .5;
    const hit = part === 'outer' ? Math.abs(capsule(cx, cy, 9, 4.6, 9, 15.8) - 3.7) <= .9
      : Math.abs(capsule(cx, cy, 9, 7.2, 9, 12.4) - 1.7) <= .85 && !(cx > 9 && cy > 11.8);
    if (hit) set(x, y, part === 'outer' ? (cx > 9.6 ? 'D' : 'A') : (cx > 8.6 ? 'A' : 'D'));
  }
}
clip('outer');

/* the sheet: x 8–27, y 3–29, folded corner of 7 */
const X0 = 8, X1 = 27, Y0 = 3, Y1 = 29, FOLD = 7;
for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
  const inCorner = x > X1 - FOLD && y < Y0 + FOLD;
  const dx = x - (X1 - FOLD), dy = y - Y0;
  if (inCorner && dx > dy) continue;                                   /* cut-away triangle */
  const edge = x === X0 || x === X1 || y === Y0 || y === Y1 || (inCorner && dx === dy);
  set(x, y, edge ? 'K' : (x === X1 - 1 || y === Y1 - 1) ? 'S' : 'W');
}
/* the folded flap */
for (let y = Y0; y <= Y0 + FOLD; y++) for (let x = X1 - FOLD; x <= X1; x++) {
  const dx = x - (X1 - FOLD), dy = y - Y0;
  if (dx > dy) continue;
  if (x === X1 - FOLD || y === Y0 + FOLD || dx === dy) set(x, y, 'K');
  else set(x, y, 'F');
}
/* lines of text */
[[13, 24], [16, 24], [19, 22], [22, 24], [25, 19]].forEach(([y, xe]) => { for (let x = 12; x <= xe; x++) set(x, y, 'T'); });

clip('inner');
/* a highlight on the clip's top curve */
for (let x = 0; x < N; x++) { if (g[1][x] === 'A') { set(x, 1, 'L'); break; } }
for (let x = 0; x < N; x++) { if (g[2][x] === 'A') { set(x, 2, 'L'); break; } }

/* ---------------------------------------------------------------- output */
const rows = g.map(r => r.join(''));
fs.writeFileSync(path.join(OUT, 'logo.txt'), rows.join('\n') + '\n');
let rects = '';
rows.forEach((r, y) => { let x = 0; while (x < N) { const c = r[x]; if (c === '.') { x++; continue; } let w = 1; while (x + w < N && r[x + w] === c) w++; rects += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="1" fill="' + C[c] + '"/>'; x += w; } });
const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges">' + rects + '</svg>';
fs.writeFileSync(path.join(OUT, 'logo.svg'), svg);

function png(scale, pad, bg) {
  const S = N * scale + pad * 2, raw = Buffer.alloc((S * 4 + 1) * S);
  const rgb = hx => [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
  for (let y = 0; y < S; y++) {
    raw[y * (S * 4 + 1)] = 0;
    for (let x = 0; x < S; x++) {
      const gx = Math.floor((x - pad) / scale), gy = Math.floor((y - pad) / scale), o = y * (S * 4 + 1) + 1 + x * 4;
      const c = gx >= 0 && gy >= 0 && gx < N && gy < N ? g[gy][gx] : '.';
      const col = c !== '.' ? rgb(C[c]) : bg ? rgb(bg) : null;
      if (col) { raw[o] = col[0]; raw[o + 1] = col[1]; raw[o + 2] = col[2]; raw[o + 3] = 255; }
    }
  }
  const crcT = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; }
  const crc = b => { let c = 0xFFFFFFFF; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  const chunk = (t, d) => { const len = Buffer.alloc(4); len.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(S, 0); ih.writeUInt32BE(S, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
fs.writeFileSync(path.join(OUT, 'logo-32.png'), png(1, 0));
fs.writeFileSync(path.join(OUT, 'logo-180.png'), png(5, 10, '#F7F8F6'));
fs.writeFileSync(path.join(OUT, 'logo-512.png'), png(14, 32, '#F7F8F6'));
fs.writeFileSync(path.join(OUT, 'preview.png'), png(10, 10, '#F7F8F6'));
console.log(rows.join('\n'));
