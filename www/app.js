/* PokéPrecio — foto de una carta Pokémon → OCR (Tesseract, en el celular) → TCGdex (español) → precio USD/COP */
'use strict';

const API = 'https://api.tcgdex.net/v2/es';
const TASAS_URL = 'https://open.er-api.com/v6/latest/USD';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const abs = (p) => new URL(p, location.href).href;

/* ---------- almacenamiento local ---------- */
function leer(clave, def) { try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : def; } catch { return def; } }
function guardar(clave, v) { try { localStorage.setItem(clave, JSON.stringify(v)); } catch { /* sin espacio */ } }

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/* ---------- datos con caché ---------- */
async function getSets() {
  const c = leer('sets', null);
  if (c && Date.now() - c.t < 3 * 864e5) return c.d;
  const d = await getJSON(`${API}/sets`);
  guardar('sets', { t: Date.now(), d });
  return d;
}

async function getTasas() {
  const c = leer('tasas', null);
  if (c && Date.now() - c.t < 12 * 36e5) return c.d;
  try {
    const j = await getJSON(TASAS_URL);
    const d = { COP: j.rates.COP, EUR: j.rates.EUR, fecha: j.time_last_update_utc };
    guardar('tasas', { t: Date.now(), d });
    return d;
  } catch {
    return c ? c.d : { COP: 4000, EUR: 0.92, fecha: 'sin conexión (aprox.)' };
  }
}

const fmtUSD = (v) => (v == null ? '—' : `US$ ${v.toFixed(2)}`);
const fmtCOP = (v) => (v == null ? '—' : `$ ${Math.round(v).toLocaleString('es-CO')} COP`);
const fmtEUR = (v) => (v == null ? '—' : `€ ${v.toFixed(2)}`);

/* ---------- OCR ---------- */
let workerP = null;
function getWorker() {
  if (!workerP) {
    workerP = Tesseract.createWorker('eng', 1, {
      workerPath: abs('lib/worker.min.js'),
      corePath: abs('lib/core'),
      workerBlobURL: false,
    }).catch((e) => { workerP = null; throw e; });
  }
  return workerP;
}

function cargarImagen(src) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
}

/* Recorta una zona (fracciones x0..x1, y0..y1), la escala, la pasa a gris con contraste estirado y opcionalmente la invierte. */
function franja(img, y0, y1, ancho = 1800, x0 = 0, x1 = 1, invertir = false) {
  const W = img.naturalWidth, H = img.naturalHeight;
  const sx = Math.floor(W * x0), sw = Math.max(1, Math.floor(W * x1) - sx);
  const sy = Math.floor(H * y0), sh = Math.max(1, Math.floor(H * y1) - sy);
  const c = document.createElement('canvas');
  c.width = ancho; c.height = Math.max(1, Math.round(sh * ancho / sw));
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height); const p = d.data;
  let min = 255, max = 0;
  for (let i = 0; i < p.length; i += 4) {
    const y = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    p[i] = y; if (y < min) min = y; if (y > max) max = y;
  }
  const k = 255 / Math.max(1, max - min);
  for (let i = 0; i < p.length; i += 4) { let v = (p[i] - min) * k; if (invertir) v = 255 - v; p[i] = p[i + 1] = p[i + 2] = v; }
  g.putImageData(d, 0, 0);
  return c;
}

async function leerTexto(canvas) {
  const w = await getWorker();
  await w.setParameters({ tessedit_pageseg_mode: '11' }); // texto disperso
  const { data } = await w.recognize(canvas);
  return data.text || '';
}

/* Busca patrones tipo 025/198, TG05/TG30, SV045/SV122 en el texto del OCR. */
function extraerNumeros(texto) {
  const arreglar = (s) => s.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');
  const re = /(TG|GG|SV|RC)?\s?([0-9OoIlSBZ]{1,3})\s*[\/\\]\s*(TG|GG|SV|RC)?\s?([0-9OoIlSBZ]{2,3})(?![0-9])/gi;
  const vistos = new Set(); const out = [];
  let m;
  while ((m = re.exec(texto))) {
    const num = arreglar(m[2]); const tot = arreglar(m[4]);
    if (!/^\d+$/.test(num) || !/^\d+$/.test(tot)) continue;
    const total = parseInt(tot, 10);
    if (total < 10) continue;
    const pref = (m[1] || m[3] || '').toUpperCase();
    const n = pref ? pref + num.padStart(2, '0') : String(parseInt(num, 10));
    const k = `${n}/${total}`;
    if (!vistos.has(k)) { vistos.add(k); out.push({ num: n, total, pref }); }
    // el "1" en cursiva de las cartas nuevas se lee como "7": 730/167 → 130/167
    if (!pref && /^7\d\d$/.test(n) && parseInt(n, 10) > total) {
      const n1 = '1' + n.slice(1); const k1 = `${n1}/${total}`;
      if (!vistos.has(k1)) { vistos.add(k1); out.push({ num: n1, total, pref }); }
    }
  }
  return out;
}

/* Zonas donde va el número: esquina inferior izquierda (cartas nuevas) y derecha (antiguas), normal e invertido (full art). */
const PASADAS = [
  [0.91, 0.99, 0, 0.45, false], [0.91, 0.99, 0, 0.45, true],
  [0.86, 1, 0, 0.5, false], [0.86, 1, 0.5, 1, false],
  [0.86, 1, 0, 0.5, true], [0.86, 1, 0.5, 1, true],
  [0.80, 1, 0, 1, false],
];

/* ---------- búsqueda en TCGdex ---------- */
async function buscarPorNumero(num, total, pref = '') {
  const sets = await getSets();
  let cand = sets.filter((s) => s.cardCount && s.cardCount.official === total);
  if (pref === 'TG' || pref === 'GG') cand = sets.filter((s) => /(tg|gg)$/i.test(s.id) && s.cardCount && s.cardCount.official === total);
  if (!cand.length) cand = sets.filter((s) => s.cardCount && s.cardCount.total === total);
  const res = await Promise.allSettled(cand.slice(0, 12).map((s) => getJSON(`${API}/sets/${encodeURIComponent(s.id)}/${encodeURIComponent(num)}`)));
  return res.filter((r) => r.status === 'fulfilled' && r.value && r.value.id).map((r) => r.value);
}

async function buscarPorNombre(q) {
  const l = await getJSON(`${API}/cards?name=like:${encodeURIComponent(q)}`);
  return Array.isArray(l) ? l : [];
}

/* ---------- precios ---------- */
const NOMBRE_VARIANTE = {
  normal: 'Normal', holofoil: 'Holo', 'reverse-holofoil': 'Reverse holo',
  '1st-edition': '1ª edición', '1st-edition-holofoil': '1ª edición holo', '1st-edition-normal': '1ª edición',
  'unlimited': 'Unlimited', 'unlimited-holofoil': 'Unlimited holo',
};
const ORDEN_VARIANTE = ['normal', 'holofoil', 'reverse-holofoil', '1st-edition-holofoil', '1st-edition-normal', 'unlimited-holofoil'];

function variantesTCG(carta) {
  const t = carta.pricing && carta.pricing.tcgplayer;
  if (!t) return [];
  return Object.keys(t)
    .filter((k) => t[k] && typeof t[k] === 'object')
    .map((k) => ({ clave: k, nombre: NOMBRE_VARIANTE[k] || k, market: t[k].marketPrice, low: t[k].lowPrice, mid: t[k].midPrice, high: t[k].highPrice, productId: t[k].productId }))
    .sort((a, b) => (ORDEN_VARIANTE.indexOf(a.clave) + 99) % 99 - (ORDEN_VARIANTE.indexOf(b.clave) + 99) % 99);
}

/* Precio de referencia en USD para una variante (o la principal). */
function precioUSD(carta, tasas, variante) {
  const vs = variantesTCG(carta);
  const v = (variante && vs.find((x) => x.clave === variante)) || vs.find((x) => x.market != null) || vs[0];
  if (v && (v.market ?? v.mid) != null) return { usd: v.market ?? v.mid, variante: v.clave, fuente: 'TCGplayer' };
  const cm = carta.pricing && carta.pricing.cardmarket;
  if (cm && (cm.trend ?? cm.avg) != null) return { usd: (cm.trend ?? cm.avg) / tasas.EUR, variante: 'cardmarket', fuente: 'Cardmarket' };
  return { usd: null, variante: null, fuente: null };
}

/* ---------- interfaz ---------- */
function estado(msg, tipo = '') {
  const e = $('#estado');
  if (!msg) { e.hidden = true; return; }
  e.hidden = false; e.className = `estado ${tipo}`; e.innerHTML = msg;
}

function limpiarResultados() {
  $('#candidatos').innerHTML = ''; $('#detalle').innerHTML = '';
}

function imgCarta(c, calidad = 'low') {
  return c.image ? `${c.image}/${calidad}.webp` : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 88"><rect width="63" height="88" fill="#2e3240"/><text x="31" y="48" font-size="10" fill="#9aa1b2" text-anchor="middle">sin imagen</text></svg>');
}

function mostrarCandidatos(cartas, titulo) {
  const cont = $('#candidatos');
  cont.innerHTML = `<p class="titulo-sec" style="grid-column:1/-1">${esc(titulo)}</p>` + cartas.map((c, i) => `
    <button class="cand" data-i="${i}">
      <img loading="lazy" src="${esc(imgCarta(c))}" alt="">
      <div class="n">${esc(c.name)}</div>
      <div class="s">${esc(c.set ? c.set.name : c.id)} · #${esc(c.localId)}</div>
    </button>`).join('');
  cont.querySelectorAll('.cand').forEach((b) => b.addEventListener('click', () => abrirCarta(cartas[+b.dataset.i])));
}

async function abrirCarta(c) {
  const det = $('#detalle');
  det.innerHTML = '<div class="estado cargando">Consultando precio</div>';
  try {
    const carta = c.pricing ? c : await getJSON(`${API}/cards/${encodeURIComponent(c.id)}`);
    const tasas = await getTasas();
    pintarCarta(carta, tasas);
    det.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    det.innerHTML = `<div class="estado error">No se pudo consultar la carta (${esc(e.message)}). Revisa tu conexión.</div>`;
  }
}

function pintarCarta(carta, tasas) {
  const vs = variantesTCG(carta);
  const p = precioUSD(carta, tasas);
  const cm = carta.pricing && carta.pricing.cardmarket;
  const set = carta.set || {};
  const oficial = set.cardCount ? set.cardCount.official : '?';
  const prodTCG = vs.find((v) => v.productId)?.productId || (carta.thirdParty && carta.thirdParty.tcgplayer);
  const filas = vs.map((v) => `<tr><td>${esc(v.nombre)}</td><td>${fmtUSD(v.market)}</td><td>${fmtUSD(v.low)}</td><td>${v.market != null ? fmtCOP(v.market * tasas.COP) : '—'}</td></tr>`).join('');
  const actualizado = carta.pricing?.tcgplayer?.updated || cm?.updated;

  $('#detalle').innerHTML = `
  <div class="carta">
    <div class="carta-top">
      <img src="${esc(imgCarta(carta, 'high'))}" alt="">
      <div>
        <h2>${esc(carta.name)}</h2>
        <div class="meta">
          ${set.symbol ? `<img class="simbolo" src="${esc(set.symbol)}.webp" alt=""> ` : ''}${esc(set.name || '')}<br>
          Nº ${esc(carta.localId)}/${esc(oficial)}${carta.rarity ? ` · ${esc(carta.rarity)}` : ''}
        </div>
        <div class="precio-grande">${fmtUSD(p.usd)}</div>
        <div class="precio-cop">${p.usd != null ? fmtCOP(p.usd * tasas.COP) : 'Sin precio registrado'}</div>
        <div class="meta">${p.fuente ? `${esc(p.fuente)} · ${esc(NOMBRE_VARIANTE[p.variante] || p.variante)}` : ''}</div>
      </div>
    </div>
    ${vs.length ? `<table><thead><tr><th>TCGplayer</th><th>Mercado</th><th>Mínimo</th><th>En pesos</th></tr></thead><tbody>${filas}</tbody></table>` : ''}
    ${cm ? `<table><thead><tr><th>Cardmarket</th><th>Tendencia</th><th>Prom. 30 d</th><th>En pesos</th></tr></thead><tbody>
      <tr><td>Normal</td><td>${fmtEUR(cm.trend)}</td><td>${fmtEUR(cm.avg30)}</td><td>${cm.trend != null ? fmtCOP(cm.trend / tasas.EUR * tasas.COP) : '—'}</td></tr>
      ${cm['trend-holo'] != null ? `<tr><td>Holo / reverse</td><td>${fmtEUR(cm['trend-holo'])}</td><td>${fmtEUR(cm['avg30-holo'])}</td><td>${fmtCOP(cm['trend-holo'] / tasas.EUR * tasas.COP)}</td></tr>` : ''}
    </tbody></table>` : ''}
    <div class="botones">
      <button class="guardar" id="btn-guardar">＋ A mi colección</button>
      ${prodTCG ? `<a href="https://www.tcgplayer.com/product/${encodeURIComponent(prodTCG)}" target="_blank" rel="noopener">Ver en TCGplayer</a>` : ''}
    </div>
    <p class="nota">TCGplayer cotiza la versión en inglés (referencia del mercado); las cartas en español suelen venderse algo más baratas. Cardmarket mezcla idiomas.
    Dólar: ${tasas.COP.toFixed(0)} COP (${esc(tasas.fecha || '')}).${actualizado ? ` Precios actualizados: ${esc(new Date(actualizado).toLocaleDateString('es-CO'))}.` : ''}</p>
  </div>`;
  $('#btn-guardar').addEventListener('click', (ev) => {
    agregarColeccion(carta, p);
    ev.target.textContent = '✓ Guardada'; ev.target.disabled = true;
  });
}

/* ---------- flujo principal ---------- */
function ordenarPorNombre(cartas, texto) {
  const t = sinTildes(texto);
  const puntaje = (c) => {
    const n = sinTildes(c.name);
    if (n && t.includes(n)) return 100;
    return n.split(/\s+/).filter((w) => w.length >= 3 && t.includes(w)).length * 10;
  };
  return cartas.map((c) => ({ c, s: puntaje(c) })).sort((a, b) => b.s - a.s);
}

async function procesarFoto(src) {
  limpiarResultados();
  const prev = $('#vista-previa'); prev.src = src; prev.hidden = false;
  $('#ocr-detalle').hidden = true;
  try {
    estado('<span class="cargando">Leyendo la carta (la primera vez descarga el lector, ~10 MB)</span>');
    const img = await cargarImagen(src);
    const totales = new Set((await getSets()).map((s) => s.cardCount && s.cardCount.official));
    const arriba = await leerTexto(franja(img, 0.0, 0.17));
    let todo = arriba;
    // varias pasadas; se cuentan las lecturas que coinciden con el total de un set real
    const votos = new Map();
    for (let i = 0; i < PASADAS.length; i++) {
      const [y0, y1, x0, x1, inv] = PASADAS[i];
      estado(`<span class="cargando">Buscando el número de la carta (${i + 1}/${PASADAS.length})</span>`);
      const t = await leerTexto(franja(img, y0, y1, 1800, x0, x1, inv));
      todo += `\n${t}`;
      for (const n of extraerNumeros(t).filter((x) => totales.has(x.total))) {
        const k = `${n.num}/${n.total}`;
        votos.set(k, { ...n, votos: (votos.get(k)?.votos || 0) + 1 });
      }
    }
    // dígitos que el OCR confunde en el total (198 ↔ 195, 183 ↔ 188…): se agregan como alternativas sin votos
    const CONF = { 5: '8', 8: '56', 3: '8', 6: '8' };
    for (const n of [...votos.values()]) {
      const t = String(n.total);
      for (let i = 0; i < t.length; i++) {
        for (const d of CONF[t[i]] || '') {
          const tot = parseInt(t.slice(0, i) + d + t.slice(i + 1), 10); const k = `${n.num}/${tot}`;
          if (totales.has(tot) && !votos.has(k)) votos.set(k, { ...n, total: tot, votos: 0 });
        }
      }
    }
    const nums = [...votos.values()].sort((a, b) => b.votos - a.votos);
    $('#ocr-texto').textContent = todo.trim(); $('#ocr-detalle').hidden = false;

    if (nums.length) {
      estado(`<span class="cargando">Buscando ${esc(nums.slice(0, 6).map((n) => `${n.num}/${n.total}`).join(', '))}</span>`);
      let cartas = [];
      for (const n of nums.slice(0, 6)) {
        for (const c of await buscarPorNumero(n.num, n.total, n.pref)) cartas.push({ ...c, _votos: n.votos });
      }
      cartas = [...new Map(cartas.map((c) => [c.id, c])).values()];
      if (cartas.length) {
        const ord = ordenarPorNombre(cartas, todo).map((x) => ({ ...x, s: x.s + x.c._votos }))
          .sort((a, b) => b.s - a.s);
        const lista = ord.map((x) => x.c);
        const seguro = lista.length === 1 || (ord[0].s >= 100 && ord[1].s < 100);
        estado(seguro ? `Encontrada: <b>${esc(lista[0].name)}</b> (${esc(nums[0].num)}/${nums[0].total})`
          : `Leí <b>${esc(nums.map((n) => `${n.num}/${n.total}`).join(', '))}</b>. Hay ${lista.length} cartas con ese número: toca la tuya (fíjate en el símbolo del set).`);
        mostrarCandidatos(lista, seguro ? 'Coincidencias' : '¿Cuál es tu carta?');
        if (seguro) abrirCarta(lista[0]);
        return;
      }
    }
    // Sin número útil: intentar con palabras del nombre
    const palabras = [...new Set((arriba.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/g) || []))]
      .filter((w) => !/^(basic|basico|básico|fase|stage|evoluciona|evolves|trainer|entrenador|pokemon|pokémon)$/i.test(w))
      .sort((a, b) => b.length - a.length).slice(0, 3);
    for (const w of palabras) {
      const r = await buscarPorNombre(w);
      if (r.length) {
        estado(`No pude leer el número; busqué por nombre «${esc(w)}». Toca tu carta o escribe el número abajo.`);
        mostrarCandidatos(r.slice(0, 60), `Resultados para «${w}»`);
        return;
      }
    }
    estado('No pude reconocer la carta. Prueba otra foto (más luz, sin reflejo, carta derecha) o escribe el número tipo <b>25/198</b>.', 'error');
  } catch (e) {
    console.error(e);
    estado(`Error leyendo la foto: ${esc(e.message || e)}. ¿Tienes internet?`, 'error');
  }
}

async function busquedaManual(q) {
  q = q.trim(); if (!q) return;
  limpiarResultados(); $('#vista-previa').hidden = true; $('#ocr-detalle').hidden = true;
  const m = q.match(/^\s*(TG|GG|SV|RC)?\s*(\d{1,3})\s*\/\s*(TG|GG|SV|RC)?\s*(\d{1,3})\s*$/i);
  try {
    if (m) {
      const pref = (m[1] || m[3] || '').toUpperCase();
      const num = pref ? pref + m[2].padStart(2, '0') : String(parseInt(m[2], 10));
      estado('<span class="cargando">Buscando</span>');
      const cartas = await buscarPorNumero(num, parseInt(m[4], 10), pref);
      if (!cartas.length) return estado(`No encontré cartas ${esc(q)}.`, 'error');
      estado(cartas.length === 1 ? `Encontrada: <b>${esc(cartas[0].name)}</b>` : `${cartas.length} cartas con ese número: toca la tuya.`);
      mostrarCandidatos(cartas, 'Resultados');
      if (cartas.length === 1) abrirCarta(cartas[0]);
    } else if (/^\d+$/.test(q)) {
      estado('Escribe también el total del set, como aparece en la carta: <b>25/198</b>.', 'error');
    } else {
      estado('<span class="cargando">Buscando</span>');
      const r = await buscarPorNombre(q);
      if (!r.length) return estado(`Nada para «${esc(q)}». Usa el nombre en español, como sale en la carta.`, 'error');
      estado(`${r.length} cartas para «${esc(q)}». Toca la tuya.`);
      mostrarCandidatos(r.slice(0, 80), 'Resultados');
    }
  } catch (e) {
    estado(`Error de conexión: ${esc(e.message)}`, 'error');
  }
}

/* ---------- cámara ---------- */
const nativo = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

async function tomarFoto(fuente) {
  const cam = nativo && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
  if (cam) {
    try {
      const f = await cam.getPhoto({ quality: 90, width: 2000, resultType: 'dataUrl', source: fuente === 'galeria' ? 'PHOTOS' : 'CAMERA', correctOrientation: true, saveToGallery: false });
      procesarFoto(f.dataUrl);
    } catch (e) {
      if (!/cancel/i.test(String(e && e.message))) estado(`No se pudo abrir la cámara: ${esc(e.message || e)}`, 'error');
    }
  } else {
    $(fuente === 'galeria' ? '#input-galeria' : '#input-foto').click();
  }
}
function desdeInput(ev) {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const r = new FileReader(); r.onload = () => procesarFoto(r.result); r.readAsDataURL(f);
  ev.target.value = '';
}

/* ---------- colección ---------- */
function agregarColeccion(carta, p) {
  const col = leer('coleccion', []);
  col.unshift({ uid: Date.now() + Math.random().toString(36).slice(2, 6), id: carta.id, name: carta.name, set: carta.set ? carta.set.name : '', num: `${carta.localId}/${carta.set?.cardCount?.official ?? '?'}`, image: carta.image, variante: p.variante, usd: p.usd, usdInicial: p.usd, fecha: Date.now(), historial: p.usd != null ? [{ t: Date.now(), usd: p.usd }] : [] });
  guardar('coleccion', col);
}

function cambio(c) {
  if (c.usd == null || !c.usdInicial) return '';
  const pct = (c.usd / c.usdInicial - 1) * 100;
  if (Math.abs(pct) < 0.5) return '<span class="meta">= sin cambio</span>';
  return `<span class="${pct > 0 ? 'sube' : 'baja'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%</span>`;
}

async function pintarColeccion() {
  const col = leer('coleccion', []);
  const tasas = await getTasas();
  const total = col.reduce((s, c) => s + (c.usd || 0), 0);
  const inicial = col.reduce((s, c) => s + (c.usdInicial || c.usd || 0), 0);
  const ult = leer('ultimaActualizacion', 0);
  $('#resumen').innerHTML = `<div class="meta">${col.length} carta${col.length === 1 ? '' : 's'} · valor estimado</div>
    <div class="total">${fmtUSD(total)}</div><div class="precio-cop">${fmtCOP(total * tasas.COP)}</div>
    ${inicial ? `<div>${cambio({ usd: total, usdInicial: inicial })} <span class="meta">desde que las guardaste</span></div>` : ''}
    <div class="meta">Precios actualizados: ${ult ? esc(new Date(ult).toLocaleString('es-CO')) : 'aún no'} · se actualizan solos al abrir la app</div>`;
  $('#lista-coleccion').innerHTML = col.length ? col.map((c) => `
    <li><img src="${esc(imgCarta(c))}" alt="">
      <div class="info"><b>${esc(c.name)}</b><span class="meta">${esc(c.set)} · ${esc(c.num)}</span></div>
      <div class="valor">${fmtUSD(c.usd)}<br><span class="meta">${c.usd != null ? fmtCOP(c.usd * tasas.COP) : ''}</span><br>${cambio(c)}</div>
      <button class="borrar" data-uid="${esc(c.uid)}" aria-label="Quitar">✕</button></li>`).join('')
    : '<p class="ayuda">Aún no has guardado cartas. Escanea una y toca «＋ A mi colección».</p>';
  $('#lista-coleccion').querySelectorAll('.borrar').forEach((b) => b.addEventListener('click', () => {
    if (!confirm('¿Quitar esta carta de tu colección?')) return;
    guardar('coleccion', leer('coleccion', []).filter((c) => c.uid !== b.dataset.uid));
    pintarColeccion();
  }));
}

let actualizando = false;
async function actualizarPrecios() {
  if (actualizando) return; actualizando = true;
  const btn = $('#btn-actualizar'); btn.disabled = true; btn.textContent = 'Actualizando…';
  try {
    localStorage.removeItem('tasas'); // forzar dólar del día
    const col = leer('coleccion', []); const tasas = await getTasas();
    let ok = 0;
    for (let i = 0; i < col.length; i += 6) { // de a 6 en paralelo
      await Promise.all(col.slice(i, i + 6).map(async (c) => {
        try {
          const carta = await getJSON(`${API}/cards/${encodeURIComponent(c.id)}`);
          const p = precioUSD(carta, tasas, c.variante);
          if (p.usd == null) return;
          c.usd = p.usd; if (c.usdInicial == null) c.usdInicial = p.usd;
          c.historial = (c.historial || []).concat({ t: Date.now(), usd: p.usd }).slice(-120);
          ok++;
        } catch { /* se deja el precio anterior */ }
      }));
    }
    // la lista pudo cambiar mientras tanto: se mezclan los precios por uid
    const nuevos = new Map(col.map((c) => [c.uid, c]));
    guardar('coleccion', leer('coleccion', []).map((c) => nuevos.get(c.uid) || c));
    if (ok || !col.length) guardar('ultimaActualizacion', Date.now());
  } finally {
    actualizando = false; btn.disabled = false; btn.textContent = '↻ Actualizar precios';
    if ($('#vista-coleccion').classList.contains('activa')) pintarColeccion();
  }
}

/* Actualización automática: al abrir la app o volver a ella, si pasaron más de 6 h. */
function autoActualizar() {
  if (Date.now() - leer('ultimaActualizacion', 0) > 6 * 36e5 && leer('coleccion', []).length) actualizarPrecios();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) autoActualizar(); });

/* ---------- arranque ---------- */
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('activo', x === t));
  document.querySelectorAll('.vista').forEach((v) => v.classList.toggle('activa', v.id === `vista-${t.dataset.vista}`));
  if (t.dataset.vista === 'coleccion') pintarColeccion();
}));
$('#btn-foto').addEventListener('click', () => tomarFoto('camara'));
$('#btn-galeria').addEventListener('click', () => tomarFoto('galeria'));
$('#input-foto').addEventListener('change', desdeInput);
$('#input-galeria').addEventListener('change', desdeInput);
$('#form-buscar').addEventListener('submit', (e) => { e.preventDefault(); busquedaManual($('#txt-buscar').value); });
$('#btn-actualizar').addEventListener('click', actualizarPrecios);
getSets().catch(() => {}); getTasas(); autoActualizar();
