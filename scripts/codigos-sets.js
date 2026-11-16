// Genera www/codigos.json: código impreso en la carta (PFL, TWM, SVI…) → id del set en TCGdex.
// Uso: node scripts/codigos-sets.js   (lo corre también el workflow antes de compilar)
const fs = require('fs');
const path = require('path');

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(url) {
  for (let i = 0; i < 5; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* reintento */ }
    await espera(1000 * (i + 1));
  }
  throw new Error(`no responde ${url}`);
}

(async () => {
  const salida = path.join(__dirname, '..', 'www', 'codigos.json');
  const previo = fs.existsSync(salida) ? JSON.parse(fs.readFileSync(salida, 'utf8')) : {};
  const sets = await json('https://api.tcgdex.net/v2/es/sets');
  const mapa = { ...previo };
  for (let i = 0; i < sets.length; i += 8) {
    await Promise.all(sets.slice(i, i + 8).map(async (s) => {
      try {
        const d = await json(`https://api.tcgdex.net/v2/en/sets/${encodeURIComponent(s.id)}`);
        const c = d.abbreviation && d.abbreviation.official;
        if (c && /^[A-Z0-9]{2,4}$/.test(c)) mapa[c] = s.id;
      } catch { /* set solo en español: sin código */ }
    }));
  }
  const orden = Object.fromEntries(Object.entries(mapa).sort());
  fs.writeFileSync(salida, JSON.stringify(orden, null, 0));
  console.log(`codigos.json: ${Object.keys(orden).length} códigos`);
})().catch((e) => { console.error(e.message); process.exit(0); }); // si falla, se conserva el archivo anterior
