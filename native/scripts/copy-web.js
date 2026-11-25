// Copies the web app (the repo root) into native/www so Capacitor can bundle it into the iPhone app.
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..', '..'); const out = path.join(__dirname, '..', 'www');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
const files = fs.readdirSync(root).filter(f => /^(index\.html|app\.js|app\.css|config\.js|manifest.*\.webmanifest)$/.test(f));
for (const f of files) fs.copyFileSync(path.join(root, f), path.join(out, f));
for (const dir of ['vendor', 'icons', 'fonts']) fs.cpSync(path.join(root, dir), path.join(out, dir), { recursive: true });
console.log(`Copied ${files.length} files plus vendor/, icons/ and fonts/ into native/www`);
