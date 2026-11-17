/* CardCalc — ⚡ energías básicas. Casi no tienen texto ni número legible (el lector no tiene qué leer),
   en TCGdex se llaman distinto ("Energía Rayo", "Energía Oscura"…) y no tienen imagen.
   Aquí: selector rápido con cantidad, detección por color al escanear, búsqueda con sinónimos e imagen propia. */
'use strict';

const ENERGIAS = [
  { n: 1, tipo: 'Planta', en: 'Grass', color: '#3fa34d', simbolo: '🌿', palabras: /planta|hierba|grass|verde/ },
  { n: 2, tipo: 'Fuego', en: 'Fire', color: '#e4502f', simbolo: '🔥', palabras: /fuego|fire|roja/ },
  { n: 3, tipo: 'Agua', en: 'Water', color: '#2f8fe4', simbolo: '💧', palabras: /agua|water|azul/ },
  { n: 4, tipo: 'Eléctrico', en: 'Lightning', color: '#f2c200', simbolo: '⚡', palabras: /rayo|electric|electrica|electrico|lightning|amarilla/ },
  { n: 5, tipo: 'Psíquico', en: 'Psychic', color: '#9b4fd1', simbolo: '🔮', palabras: /psiquic|psychic|morada/ },
  { n: 6, tipo: 'Lucha', en: 'Fighting', color: '#b5652c', simbolo: '👊', palabras: /lucha|fighting|pelea/ },
  { n: 7, tipo: 'Siniestro', en: 'Darkness', color: '#2c3e50', simbolo: '🌑', palabras: /oscur|siniestr|darkness|dark|negra/ },
  { n: 8, tipo: 'Metal', en: 'Metal', color: '#8d99a6', simbolo: '⚙️', palabras: /metal|acero|steel|gris/ },
];
const esEnergiaSVE = (id) => /^(sve|mee)-\d+$/i.test(id || '');
const energiaPorId = (id) => { const m = String(id || '').match(/^sve-0*(\d+)$/i); return m ? ENERGIAS.find((e) => e.n === ((+m[1] - 1) % 8) + 1) : null; };

/* imagen propia: círculo del color del tipo con su símbolo */
function imgEnergia(c) {
  const e = energiaPorId(c.id) || (/energ/i.test(c.name || '') ? ENERGIAS.find((x) => x.palabras.test(sinTildes(c.name))) : null);
  if (!e) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 88"><rect width="63" height="88" rx="4" fill="#f4f1e6"/><rect x="3" y="3" width="57" height="82" rx="3" fill="${e.color}" opacity=".18"/><circle cx="31.5" cy="44" r="20" fill="${e.color}"/><text x="31.5" y="51" font-size="20" text-anchor="middle">${e.simbolo}</text><text x="31.5" y="80" font-size="6" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#333">ENERGY</text></svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/* la carta de energía en el idioma pedido, con el precio de la versión en inglés si a esa le falta */
async function cartaEnergia(n, lang = idioma) {
  const l = lang === 'ja' ? 'en' : lang;
  const id = `sve-00${n}`;
  const carta = await getJSON(`${apiDe(l)}/cards/${id}`);
  if (!carta.pricing || !(carta.pricing.cardmarket || carta.pricing.tcgplayer)) {
    const en = l === 'en' ? null : await getJSON(`${apiDe('en')}/cards/${id}`).catch(() => null);
    if (en && en.pricing) carta.pricing = en.pricing;
  }
  carta._lang = l;
  return carta;
}

/* búsqueda escrita: "energía eléctrica", "rayo", "fire energy", "energia siniestra"… */
function energiaDeTexto(q) {
  const s = sinTildes(q);
  if (!/energ|energy/.test(s)) return null;
  return ENERGIAS.find((e) => e.palabras.test(s)) || null;
}

/* al escanear: ¿parece una energía básica? (dice "energía"/"energy" o el centro es de un color de tipo) */
function detectarEnergiaPorColor(img) {
  try {
    const c = document.createElement('canvas'); c.width = 40; c.height = 40;
    const g = c.getContext('2d', { willReadFrequently: true });
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    g.drawImage(img, W * 0.25, H * 0.3, W * 0.5, H * 0.4, 0, 0, 40, 40);
    const p = g.getImageData(0, 0, 40, 40).data;
    let sx = 0, sy = 0, sat = 0, val = 0, n = 0;
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i] / 255, gg = p[i + 1] / 255, b = p[i + 2] / 255;
      const max = Math.max(r, gg, b), min = Math.min(r, gg, b), d = max - min;
      val += max; sat += max ? d / max : 0; n++;
      if (d < 0.15) continue;
      let h = max === r ? ((gg - b) / d) % 6 : max === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
      h *= 60; if (h < 0) h += 360;
      sx += Math.cos(h * Math.PI / 180) * d; sy += Math.sin(h * Math.PI / 180) * d;
    }
    val /= n; sat /= n;
    if (sat < 0.18) return val < 0.35 ? ENERGIAS[6] : ENERGIAS[7]; // oscuro o gris
    let hue = Math.atan2(sy, sx) * 180 / Math.PI; if (hue < 0) hue += 360;
    if (hue < 18 || hue >= 330) return ENERGIAS[1];          // fuego (rojo)
    if (hue < 38) return val < 0.55 ? ENERGIAS[5] : ENERGIAS[1]; // lucha (café) / fuego (naranja)
    if (hue < 70) return ENERGIAS[3];                         // rayo (amarillo)
    if (hue < 170) return ENERGIAS[0];                        // planta (verde)
    if (hue < 255) return ENERGIAS[2];                        // agua (azul)
    return ENERGIAS[4];                                       // psíquico (morado)
  } catch { return null; }
}

/* ⚡ selector: tipo + cantidad → se agregan todas a la colección */
function ventanaEnergias(pre = null) {
  const cant = Object.fromEntries(ENERGIAS.map((e) => [e.n, pre && pre.n === e.n ? 1 : 0]));
  const lang = idioma === 'ja' ? 'en' : idioma;
  const cuerpo = abrirModal(`
    <div class="carta">
      <h2>⚡ Añadir energías básicas</h2>
      <p class="meta">Las energías básicas casi no tienen texto que leer: elige el tipo y cuántas tienes, y se agregan todas de una vez (${bandera(lang)} ${esc(IDIOMAS[lang].nombre)}).${pre ? ` Detecté que puede ser <b>${esc(pre.tipo)}</b>.` : ''}</p>
      <div class="energias-grid">${ENERGIAS.map((e) => `
        <div class="energia-item ${pre && pre.n === e.n ? 'pre' : ''}" data-n="${e.n}">
          <img src="${imgEnergia({ id: `sve-00${e.n}` })}" alt="">
          <b>${esc(e.tipo)}</b>
          <div class="cantidad-mazo"><button data-d="-1" aria-label="Menos">−</button><b class="cnt">${cant[e.n]}</b><button data-d="1" aria-label="Más">＋</button></div>
          <div class="rapidos"><button data-s="4">4</button><button data-s="8">8</button><button data-s="12">12</button></div>
        </div>`).join('')}</div>
      <div class="botones"><button class="guardar" id="en-ok">＋ Agregar a mi colección</button></div>
      <p class="meta" id="en-estado"></p>
    </div>`);
  const pintar = () => {
    $$('.energia-item', cuerpo).forEach((d) => { $('.cnt', d).textContent = cant[d.dataset.n]; d.classList.toggle('con', cant[d.dataset.n] > 0); });
    const total = Object.values(cant).reduce((s, x) => s + x, 0);
    $('#en-ok', cuerpo).textContent = total ? `＋ Agregar ${total} energía${total === 1 ? '' : 's'} a mi colección` : '＋ Agregar a mi colección';
    $('#en-ok', cuerpo).disabled = !total;
  };
  $$('.energia-item', cuerpo).forEach((d) => {
    $$('[data-d]', d).forEach((b) => b.addEventListener('click', () => { cant[d.dataset.n] = Math.max(0, Math.min(99, cant[d.dataset.n] + +b.dataset.d)); pintar(); }));
    $$('[data-s]', d).forEach((b) => b.addEventListener('click', () => { cant[d.dataset.n] = +b.dataset.s; pintar(); }));
  });
  $('#en-ok', cuerpo).addEventListener('click', async (ev) => {
    ev.target.disabled = true; const est = $('#en-estado', cuerpo);
    try {
      const tasas = await getTasas(); let total = 0;
      for (const e of ENERGIAS) {
        if (!cant[e.n]) continue;
        est.innerHTML = `<span class="cargando">Agregando ${esc(e.tipo)}</span>`;
        const carta = await cartaEnergia(e.n, lang);
        const p = precioUSD(carta, tasas, null, carta._lang);
        for (let k = 0; k < cant[e.n]; k++) agregarColeccion(carta, p);
        total += cant[e.n];
      }
      alert(`${total} energía(s) agregadas a tu colección.`);
      cerrarModal();
      if ($('#vista-coleccion').classList.contains('activa')) pintarColeccion();
    } catch (er) { est.textContent = `Error de conexión: ${er.message}`; ev.target.disabled = false; }
  });
  pintar();
}

$('#btn-energias').addEventListener('click', () => ventanaEnergias());
