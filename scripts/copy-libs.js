// Copia tesseract.js (OCR) desde node_modules a www/lib para que la app lo lleve adentro.
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..');
const lib = path.join(raiz, 'www', 'lib');
const core = path.join(lib, 'core');
fs.mkdirSync(core, { recursive: true });

const copiar = (de, a) => { fs.copyFileSync(de, a); console.log('copiado', path.relative(raiz, a)); };
const dist = path.join(raiz, 'node_modules', 'tesseract.js', 'dist');
copiar(path.join(dist, 'tesseract.min.js'), path.join(lib, 'tesseract.min.js'));
copiar(path.join(dist, 'worker.min.js'), path.join(lib, 'worker.min.js'));

const coreDir = path.join(raiz, 'node_modules', 'tesseract.js-core');
for (const f of fs.readdirSync(coreDir)) {
  if (/^tesseract-core.*lstm\.(wasm\.js|js|wasm)$/.test(f)) copiar(path.join(coreDir, f), path.join(core, f));
}
