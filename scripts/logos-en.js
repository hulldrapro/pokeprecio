// Genera www/sets-en.json: { idSet: { n: nombre en inglés, l: URL del logo en inglés | null } }
// Va DENTRO de la app: así los nombres/logos originales salen aunque TCGdex esté caído.
// Logos: TCGdex; si no lo tiene (Temporal Forces, Trainer Gallery…), Pokémon TCG API (pokemontcg.io) por nombre.
// Uso: node scripts/logos-en.js   (lo corre el workflow antes de compilar)
const fs = require('fs');
const path = require('path');

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(url) {
  for (let i = 0; i < 6; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* reintento */ }
    await espera(1500 * (i + 1));
  }
  throw new Error(`no responde ${url}`);
}
const norm = (s) => String(s || '').normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

(async () => {
  const salida = path.join(__dirname, '..', 'www', 'sets-en.json');
  const previo = fs.existsSync(salida) ? JSON.parse(fs.readFileSync(salida, 'utf8')) : {};
  const tcgdex = await json('https://api.tcgdex.net/v2/en/sets');
  const ptcg = await json('https://api.pokemontcg.io/v2/sets?pageSize=250&select=id,name,images').catch(() => ({ data: [] }));
  const porNombre = new Map(ptcg.data.map((s) => [norm(s.name), s.images && s.images.logo]));
  const mapa = { ...previo };
  const sinLogo = [];
  for (const s of tcgdex) {
    let logo = s.logo ? `${s.logo}.webp` : null;
    if (!logo) {
      // nombre exacto, o sin sufijos tipo "Trainer Gallery"/"Shiny Vault" → logo del set principal
      const cand = [s.name, s.name.replace(/\s+(Trainer Gallery|Galarian Gallery|Shiny Vault|Classic Collection)$/i, '')];
      logo = cand.map((n) => porNombre.get(norm(n))).find(Boolean) || (previo[s.id] && previo[s.id].l) || null;
    }
    if (!logo) sinLogo.push(s.id);
    mapa[s.id] = { n: s.name, l: logo };
  }
  fs.writeFileSync(salida, JSON.stringify(Object.fromEntries(Object.entries(mapa).sort())));
  console.log(`sets-en.json: ${Object.keys(mapa).length} sets, ${Object.keys(mapa).length - sinLogo.length} con logo en inglés (${sinLogo.length} sin logo en ninguna fuente)`);
})().catch((e) => { console.error(e.message); process.exit(0); }); // si falla, se conserva el archivo anterior
