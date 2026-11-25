// Servidor local para ver/probar PokéPrecio en el PC: http://localhost:8765
// Sirve www/ y toma tesseract (lib/) de node_modules, que vive FUERA de OneDrive:
//   %LOCALAPPDATA%\PokePrecio\node_modules  (lo instala "Ver en PC.bat" la primera vez)
const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = +process.env.PUERTO || 8765;
const WWW = path.join(__dirname, '..', 'www');
const MODULOS = [
  process.env.POKEPRECIO_MODULES,
  path.join(__dirname, '..', 'node_modules'),
  path.join(process.env.LOCALAPPDATA || '', 'PokePrecio', 'node_modules'),
].find((p) => p && fs.existsSync(path.join(p, 'tesseract.js')));
if (!MODULOS) { console.error('Falta tesseract.js: ejecuta "Ver en PC.bat" para instalarlo.'); process.exit(1); }

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2','.webmanifest': 'application/manifest+json' };

function resolver(url) {
  const p = decodeURIComponent(url.split('?')[0]);
  if (p === '/lib/tesseract.min.js' || p === '/lib/worker.min.js') return path.join(MODULOS, 'tesseract.js', 'dist', path.basename(p));
  if (p.startsWith('/lib/core/')) return path.join(MODULOS, 'tesseract.js-core', path.basename(p));
  const f = path.normalize(path.join(WWW, p === '/' ? 'index.html' : p));
  return f.startsWith(WWW) ? f : null;
}

http.createServer((req, res) => {
  const f = resolver(req.url);
  if (!f || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('no existe'); }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(PUERTO, '127.0.0.1', () => console.log(`PokéPrecio en http://localhost:${PUERTO}  (Ctrl+C para cerrar)`));
