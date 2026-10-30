/* builds the single-file app (actuallyfreetools.html) from src/ */
const fs = require('fs'), path = require('path');
const SRC = path.resolve(__dirname, '../src'), OUT = path.resolve(__dirname, '../actuallyfreetools.html');
const JS = ['02-core.js', '03-editor.js', '04-pdftools.js', '05-pdfmore.js', '06-images.js', '07-business.js', '08-media.js'];
const logo = fs.readFileSync(path.join(SRC, 'logo', 'logo.svg'), 'utf8');
let out = fs.readFileSync(path.join(SRC, '01-head.html'), 'utf8')
  .replace('{{LOGO_SVG}}', logo)
  .replace('{{FAVICON}}', 'data:image/svg+xml;base64,' + Buffer.from(logo).toString('base64'));
for (const f of JS) out += '<script>\n' + fs.readFileSync(path.join(SRC, f), 'utf8') + '</script>\n';
out += '<script>TF.start();</script>\n';
fs.writeFileSync(OUT, out);
console.log('wrote actuallyfreetools.html', (out.length / 1024).toFixed(0) + ' KB');
