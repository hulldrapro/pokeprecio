/* CardCalc — foto de una carta Pokémon → OCR en el celular → TCGdex (español) → precio USD/COP en vivo */
'use strict';

/* Idioma de las cartas: cada uno tiene su base en TCGdex (nombres, sets y numeración propios en japonés) */
const IDIOMAS = {
  es: { bandera: '🇪🇸', nombre: 'Español', corto: 'ES' },
  en: { bandera: '🇺🇸', nombre: 'Inglés', corto: 'EN' },
  ja: { bandera: '🇯🇵', nombre: 'Japonés', corto: 'JP' },
};
const apiDe = (l) => `https://api.tcgdex.net/v2/${l}`;
let idioma = IDIOMAS[localStorage.getItem('idioma')] ? localStorage.getItem('idioma') : 'es';
let API = apiDe(idioma);
let langEscaneo = idioma; // idioma con el que se identificó la última carta (puede detectarse distinto)
const bandera = (l) => (IDIOMAS[l || 'es'] || IDIOMAS.es).bandera;
const TASAS_URL = 'https://open.er-api.com/v6/latest/USD';
const HORAS_AUTO = 6; // la colección se actualiza sola si pasaron más de estas horas
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/* ================= almacenamiento ================= */
function leer(clave, def) { try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : def; } catch { return def; } }
function guardar(clave, v) {
  try { localStorage.setItem(clave, JSON.stringify(v)); } catch { /* sin espacio */ }
  if (CLAVES_NATIVAS.includes(clave)) espejoNativo(v, clave);
  if (clave === 'coleccion' && typeof programarWidget === 'function') programarWidget(); // el widget siempre al día
}
const CLAVES_NATIVAS = ['coleccion', 'deseos', 'cambio', 'mazos', 'alertas', 'widget']; // las dos últimas las lee Android (alertas en segundo plano y widget)

/* La colección también se guarda en el almacenamiento nativo de Android (Preferences), que no se borra
   al actualizar la app. Al abrir, si el WebView perdió sus datos, se recupera de ahí. */
const Prefs = () => window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins.Preferences;
function espejoNativo(v, clave = 'coleccion') {
  const P = Prefs(); if (!P) return;
  P.set({ key: clave, value: JSON.stringify(v) }).catch(() => {});
}
const vacio = (x) => !x || (Array.isArray(x) ? !x.length : !Object.values(x).some((y) => Array.isArray(y) ? y.length : y));
async function restaurarColeccion() {
  const P = Prefs(); if (!P) return;
  for (const clave of CLAVES_NATIVAS) {
    try {
      const { value } = await P.get({ key: clave });
      const nativa = value ? JSON.parse(value) : null;
      const local = leer(clave, null);
      if (!vacio(nativa) && vacio(local)) localStorage.setItem(clave, value); // recuperar
      else if (!vacio(local) && !nativa) espejoNativo(local, clave); // primera vez: copiar lo que había
    } catch { /* sigue con lo local */ }
  }
}

/* Copia de seguridad en archivo */
async function exportarColeccion() {
  const col = leer('coleccion', []);
  const json = JSON.stringify({ app: 'CardCalc', version: 2, fecha: new Date().toISOString(), coleccion: col, deseos: leer('deseos', []), mazos: leer('mazos', []) }, null, 1);
  const nombre = `CardCalc-coleccion-${new Date().toISOString().slice(0, 10)}.json`;
  guardar('ultimoExport', Date.now());
  const FS = nativo && window.Capacitor.Plugins.Filesystem;
  if (FS) {
    try {
      await FS.writeFile({ path: nombre, data: json, directory: 'DOCUMENTS', encoding: 'utf8' });
      alert(`Copia guardada en Documentos/${nombre} (${col.length} cartas).`);
      return;
    } catch (e) { alert(`No se pudo guardar en Documentos (${e.message}). Se intentará descargar.`); }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
}
function importarColeccion(ev) {
  const f = ev.target.files && ev.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result); const nuevas = Array.isArray(d) ? d : d.coleccion;
      if (!Array.isArray(nuevas)) throw new Error('el archivo no es una copia de CardCalc');
      const col = leer('coleccion', []); const uids = new Set(col.map((c) => c.uid));
      const agregar = nuevas.filter((c) => c && c.id && c.uid && !uids.has(c.uid));
      guardar('coleccion', [...col, ...agregar]);
      if (Array.isArray(d.mazos)) { const ms = leer('mazos', []); const ids = new Set(ms.map((x) => x.id)); guardar('mazos', [...ms, ...d.mazos.filter((x) => x && x.id && !ids.has(x.id))]); }
      if (Array.isArray(d.deseos)) {
        const des = leer('deseos', []); const ks = new Set(des.map((x) => x.key));
        guardar('deseos', [...des, ...d.deseos.filter((x) => x && x.key && !ks.has(x.key))]);
      }
      alert(`Importadas ${agregar.length} cartas (${nuevas.length - agregar.length} ya estaban).`);
      pintarColeccion();
    } catch (e) { alert(`No se pudo importar: ${e.message}`); }
  };
  r.readAsText(f); ev.target.value = '';
}

async function getJSON(url, intentos = 3) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
      if (r.status === 404) throw Object.assign(new Error('no existe'), { fin: true });
      ultimo = new Error(`HTTP ${r.status}`);
    } catch (e) { if (e.fin) throw e; ultimo = e; }
    await espera(700 * (i + 1));
  }
  throw ultimo;
}

/* ================= datos con caché ================= */
const setsP = {};
function getSets(l = idioma) {
  if (!setsP[l]) {
    setsP[l] = (async () => {
      const clave = `sets-${l}`;
      const c = leer(clave, null);
      if (c && Date.now() - c.t < 3 * 864e5) return c.d;
      try { const d = await getJSON(`${apiDe(l)}/sets`); guardar(clave, { t: Date.now(), d }); return d; } catch (e) { if (c) return c.d; throw e; }
    })().catch((e) => { delete setsP[l]; throw e; });
  }
  return setsP[l];
}
/* Nombres de los sets: siempre el ORIGINAL en inglés ("Phantasmal Flames", no "Fuegos Fantasmales").
   Español e inglés comparten el id del set; los sets japoneses conservan su nombre japonés (que es el original). */
let NOMBRES_EN = (() => { const c = leer('sets-en', null); return c ? Object.fromEntries(c.d.map((s) => [s.id, s.name])) : {}; })();
// tabla que viene DENTRO de la app (nombre + logo en inglés de cada set): funciona aunque TCGdex esté caído
const setsEnP = fetch('sets-en.json').then((r) => r.json()).then((j) => {
  for (const [id, v] of Object.entries(j)) if (!NOMBRES_EN[id]) NOMBRES_EN[id] = v.n;
  return j;
}).catch(() => ({}));
getSets('en').then((s) => { for (const x of s) NOMBRES_EN[x.id] = x.name; }).catch(() => {}); // sets nuevos
function nombreSet(x, lang) {
  if (!x) return '';
  const id = x.setId || (x.set && typeof x.set === 'object' && x.set.id) || (x.id ? x.id.slice(0, x.id.lastIndexOf('-')) : '');
  const l = lang || x._lang || x.idioma || 'es';
  const original = typeof x.set === 'string' ? x.set : (x.set && x.set.name) || '';
  return l !== 'ja' && NOMBRES_EN[id] ? NOMBRES_EN[id] : original;
}

// código impreso → set. Español e inglés comparten sets (codigos.json); en japonés el código impreso ES el id del set (SV6, SV2a…)
let codigosP = null;
async function getCodigos(l = idioma) {
  if (l === 'ja') { const s = await getSets('ja').catch(() => []); return Object.fromEntries(s.map((x) => [x.id.toUpperCase(), x.id])); }
  return (codigosP ||= fetch('codigos.json').then((r) => r.json()).catch(() => ({})));
}

/* Las cartas internacionales nuevas imprimen el idioma junto al código: "PFL EN 043/094",
   y todas traen palabras fijas grandes: Weakness/Resistance/Retreat (inglés) vs Debilidad/Resistencia/Retirada (español). */
function detectarIdioma(texto) {
  const t = String(texto);
  const m = t.match(/(?<![A-Za-z0-9])[A-Z0-9]{3}\s+(EN|ES)\s+[0-9OIl]{2,3}/);
  if (m) return m[1].toLowerCase();
  const n = sinTildes(t);
  const en = (n.match(/\b(weakness|resistance|retreat|basic|evolves|stage ?[12]|trainer|pokemon tool|supporter)\b/g) || []).length;
  const es = (n.match(/\b(debilidad|resistencia|retirada|basico|evoluciona|fase ?[12]|entrenador|herramienta|partidario)\b/g) || []).length;
  if (en >= 2 && en > es * 2) return 'en';
  if (es >= 2 && es > en * 2) return 'es';
  return null;
}

function cambiarIdioma(l) {
  if (!IDIOMAS[l]) return;
  idioma = l; API = apiDe(l);
  try { localStorage.setItem('idioma', l); } catch { /* sin almacenamiento */ }
  $$('#idiomas button').forEach((b) => b.classList.toggle('sel', b.dataset.l === l));
  getSets(l).catch(() => {});
}

/* ================= moneda local (Ajustes) =================
   Todo el código multiplica por `tasas.COP` y formatea con `fmtCOP`: ahora ambos son de la MONEDA ELEGIDA
   (el nombre "COP" se quedó por compatibilidad). Los montos que escribe el usuario se guardan en US$. */
const MONEDAS = {
  COP: { nombre: 'Peso colombiano', plural: 'pesos', sim: '$', dec: 0, pais: '🇨🇴' },
  USD: { nombre: 'Dólar estadounidense', plural: 'dólares', sim: 'US$', dec: 2, pais: '🇺🇸' },
  MXN: { nombre: 'Peso mexicano', plural: 'pesos', sim: '$', dec: 2, pais: '🇲🇽' },
  EUR: { nombre: 'Euro', plural: 'euros', sim: '€', dec: 2, pais: '🇪🇺' },
  ARS: { nombre: 'Peso argentino', plural: 'pesos', sim: '$', dec: 0, pais: '🇦🇷' },
  CLP: { nombre: 'Peso chileno', plural: 'pesos', sim: '$', dec: 0, pais: '🇨🇱' },
  PEN: { nombre: 'Sol peruano', plural: 'soles', sim: 'S/', dec: 2, pais: '🇵🇪' },
  BRL: { nombre: 'Real brasileño', plural: 'reales', sim: 'R$', dec: 2, pais: '🇧🇷' },
  UYU: { nombre: 'Peso uruguayo', plural: 'pesos', sim: '$', dec: 0, pais: '🇺🇾' },
  GTQ: { nombre: 'Quetzal', plural: 'quetzales', sim: 'Q', dec: 2, pais: '🇬🇹' },
  CRC: { nombre: 'Colón costarricense', plural: 'colones', sim: '₡', dec: 0, pais: '🇨🇷' },
  DOP: { nombre: 'Peso dominicano', plural: 'pesos', sim: 'RD$', dec: 0, pais: '🇩🇴' },
  GBP: { nombre: 'Libra esterlina', plural: 'libras', sim: '£', dec: 2, pais: '🇬🇧' },
  CAD: { nombre: 'Dólar canadiense', plural: 'dólares', sim: 'C$', dec: 2, pais: '🇨🇦' },
};
let MONEDA = MONEDAS[localStorage.getItem('moneda')] ? localStorage.getItem('moneda') : 'COP';
const MON = () => MONEDAS[MONEDA];

async function getTasas(forzar = false) {
  const c = leer('tasas', null);
  const local = (d) => ({ ...d, COP: (d.rates && d.rates[MONEDA]) || (MONEDA === 'COP' ? d.COP : MONEDA === 'USD' ? 1 : d.COP), moneda: MONEDA });
  if (!forzar && c && c.d.rates && Date.now() - c.t < 12 * 36e5) return local(c.d);
  try {
    const j = await getJSON(TASAS_URL);
    const d = { rates: j.rates, COP: j.rates.COP, EUR: j.rates.EUR, fecha: j.time_last_update_utc };
    guardar('tasas', { t: Date.now(), d });
    return local(d);
  } catch {
    return local(c ? c.d : { rates: { COP: 4000, USD: 1, EUR: 0.92 }, COP: 4000, EUR: 0.92, fecha: 'sin conexión (aprox.)' });
  }
}

/* Montos escritos antes de v2.3 (en pesos colombianos) → US$, para que no cambien al cambiar de moneda */
async function migrarMontos() {
  const col = leer('coleccion', []), des = leer('deseos', []);
  if (!col.some((c) => c.compraCOP) && !des.some((d) => d.objetivoCOP)) return;
  await getTasas();
  const cop = leer('tasas', null)?.d?.rates?.COP || leer('tasas', null)?.d?.COP; if (!cop) return;
  guardar('coleccion', col.map((c) => { if (c.compraCOP) { c.compraUSD = c.compraCOP / cop; delete c.compraCOP; } return c; }));
  guardar('deseos', des.map((d) => { if (d.objetivoCOP) { d.objetivoUSD = d.objetivoCOP / cop; delete d.objetivoCOP; } return d; }));
}

const fmtUSD = (v) => (v == null ? '—' : `US$ ${v.toFixed(2)}`);
// en la moneda elegida; con "$" se agrega el código (COP, MXN…) para que no se confunda con dólares
// sin decimales (COP, CLP…): 26.500 · con decimales (USD, EUR, MXN…): 1,234.56 — igual que "US$ 7.99"
function fmtCOP(v, dec) {
  if (v == null || isNaN(v)) return '—';
  const m = MON(); const d = dec ?? m.dec;
  const n = d ? Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : Math.round(v).toLocaleString('es-CO');
  return m.sim === '$' ? `$ ${n} ${MONEDA}` : `${m.sim} ${n}`;
}
const fmtTasa = (v) => fmtCOP(v, v < 1000 ? 2 : 0); // tasa de cambio: con decimales si es pequeña (19.85 MXN)
const enLocal = (usd, tasas) => (MONEDA === 'USD' ? '' : fmtCOP(usd * tasas.COP)); // vacío si ya se muestra en US$
const fmtEUR = (v) => (!v ? '—' : `€ ${v.toFixed(2)}`);

/* ================= precios ================= */
const NOMBRE_VARIANTE = {
  normal: 'Normal', holofoil: 'Holo', 'reverse-holofoil': 'Reverse holo',
  '1st-edition': '1ª edición', '1st-edition-holofoil': '1ª ed. holo', '1st-edition-normal': '1ª edición',
  unlimited: 'Unlimited', 'unlimited-holofoil': 'Unlimited holo', cardmarket: 'Cardmarket',
};
const ORDEN_VARIANTE = ['normal', 'holofoil', 'reverse-holofoil', '1st-edition-holofoil', '1st-edition-normal', 'unlimited-holofoil'];

function variantesTCG(carta) {
  const t = carta.pricing && carta.pricing.tcgplayer;
  if (!t) return [];
  const pos = (k) => { const i = ORDEN_VARIANTE.indexOf(k); return i < 0 ? 99 : i; };
  return Object.keys(t)
    .filter((k) => t[k] && typeof t[k] === 'object')
    .map((k) => ({ clave: k, nombre: NOMBRE_VARIANTE[k] || k, market: t[k].marketPrice, low: t[k].lowPrice, mid: t[k].midPrice, high: t[k].highPrice, productId: t[k].productId }))
    .sort((a, b) => pos(a.clave) - pos(b.clave));
}

function precioUSD(carta, tasas, variante, lang) {
  // Ajustes → fuente principal Cardmarket (si la carta tiene precio ahí)
  if (leer('fuentePrecio', 'tcgplayer') === 'cardmarket' && lang !== 'ja') {
    const cm = carta.pricing && carta.pricing.cardmarket;
    const holo = variante && /holo/i.test(variante) && cm && cm['trend-holo'];
    const v = holo ? cm['trend-holo'] : cm && (cm.trend || cm.avg);
    if (v) return { usd: v / tasas.EUR, variante: variante || 'cardmarket', fuente: 'Cardmarket' };
  }
  // japonesas: TCGplayer casi nunca las tiene; Cardmarket sí cotiza el producto japonés
  if (lang === 'ja') {
    const cm = carta.pricing && carta.pricing.cardmarket;
    if (cm && (cm.trend || cm.avg)) return { usd: (cm.trend || cm.avg) / tasas.EUR, variante: 'cardmarket', fuente: 'Cardmarket (japonesa)' };
  }
  const vs = variantesTCG(carta);
  const v = (variante && vs.find((x) => x.clave === variante && (x.market ?? x.mid) != null)) || vs.find((x) => x.market != null) || vs.find((x) => x.mid != null);
  if (v) return { usd: v.market ?? v.mid, variante: v.clave, fuente: 'TCGplayer' };
  const cm = carta.pricing && carta.pricing.cardmarket;
  if (cm && (cm.trend ?? cm.avg) != null) return { usd: (cm.trend ?? cm.avg) / tasas.EUR, variante: 'cardmarket', fuente: 'Cardmarket' };
  return { usd: null, variante: null, fuente: null };
}

/* ================= rareza ================= */
const RAREZA = [
  ['Común', 1], ['Un Diamante', 1], ['Uncommon', 2], ['Dos Diamantes', 2], ['Rara', 3], ['Tres Diamantes', 3], ['Promo', 3],
  ['Holo Rara', 4], ['Cuatro Diamantes', 4], ['Holo Rara V', 5], ['Rara Doble', 5], ['Rara AS TÁCTICO', 5], ['Rara Radiante', 5],
  ['Holo Rara VSTAR', 6], ['Holo Rara VMAX', 6], ['Shiny rare', 6], ['Una Estrella', 6], ['Rara Primigenia', 6], ['Increíbles', 6],
  ['Ultra Rara', 7], ['Rara Ilustración', 7], ['Entrenador de arte completo', 7], ['Shiny rare V', 7], ['Shiny rare VMAX', 7], ['Rara Ultra Variocolor', 7], ['One Shiny', 6], ['Two Shiny', 7],
  ['Rara Secreta', 8], ['Rara Híper', 8], ['Rara Ilustración Especial', 9], ['Mega Hiper Rara', 9], ['Mega Attack Rare', 8], ['Rara Blanca y Negra', 8],
  ['Dos Estrellas', 8], ['Tres Estrellas', 9], ['Corona', 10],
  // rarezas en inglés (cartas EN y JA)
  ['Common', 1], ['Rare', 3], ['Rare Holo', 4], ['Double rare', 5], ['ACE SPEC Rare', 5], ['Radiant Rare', 5], ['Rare Holo V', 5],
  ['Rare Holo VMAX', 6], ['Rare Holo VSTAR', 6], ['Amazing Rare', 6], ['Shiny Rare', 6], ['Ultra Rare', 7], ['Illustration rare', 7],
  ['Shiny Ultra Rare', 7], ['Full Art Trainer', 7], ['Secret Rare', 8], ['Hyper rare', 8], ['Black White Rare', 8],
  ['Special illustration rare', 9], ['Mega Hyper Rare', 9],
];
const nivelRareza = (r) => { const x = RAREZA.find(([n]) => sinTildes(n) === sinTildes(r)); return x ? x[1] : 0; };
const GRUPOS_RAREZA = [['Todas', 0, 99], ['Comunes', 1, 2], ['Raras', 3, 4], ['Dobles / V / ex', 5, 6], ['Ultra / Ilustración', 7, 7], ['Secretas / Híper', 8, 10]];

/* ================= navegación ================= */
function irA(vista) {
  $$('.tab').forEach((t) => t.classList.toggle('activo', t.dataset.vista === vista));
  $$('.vista').forEach((v) => v.classList.toggle('activa', v.id === `vista-${vista}`));
  $('#btn-ajustes').classList.toggle('activo', vista === 'ajustes');
  if (vista === 'ajustes') { pararCamara(); pintarAjustes(); return window.scrollTo(0, 0); }
  if (vista === 'escanear') iniciarCamara();
  else {
    pararCamara();
    if (vista === 'coleccion') pintarColeccion();
    else if (vista === 'intercambio') pintarIntercambio();
    else if (vista === 'deseos') pintarDeseos();
    else if (vista === 'mazos') pintarMazos();
  }
  window.scrollTo(0, 0);
}

/* ================= cámara en vivo ================= */
let flujo = null;
async function iniciarCamara() {
  if (flujo || document.hidden || !$('#vista-escanear').classList.contains('activa')) return;
  $('#sin-camara').hidden = true;
  try {
    flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 2560 }, height: { ideal: 1920 } }, audio: false });
    const v = $('#video'); v.srcObject = flujo; await v.play().catch(() => {});
    // enfoque continuo si el celular lo permite
    const pista = flujo.getVideoTracks()[0];
    const cap = pista.getCapabilities ? pista.getCapabilities() : {};
    if (cap.focusMode && cap.focusMode.includes('continuous')) pista.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
    if (typeof prepararExtrasCamara === 'function') prepararExtrasCamara(pista); // linterna + escaneo automático
  } catch (e) {
    flujo = null;
    $('#sin-camara').hidden = false;
    $('#sin-camara p').textContent = `No se pudo abrir la cámara en vivo (${e.name || e.message}). Usa 📷 o 🖼️.`;
  }
}
function pararCamara() {
  if (flujo) { flujo.getTracks().forEach((t) => t.stop()); flujo = null; }
  $('#video').srcObject = null;
}

/* Captura el cuadro del video recortado exactamente al marco de la carta. */
function capturarMarco() {
  const v = $('#video');
  if (!flujo || !v.videoWidth) return null;
  const rv = v.getBoundingClientRect(), rm = $('#marco').getBoundingClientRect();
  const esc_ = Math.max(rv.width / v.videoWidth, rv.height / v.videoHeight); // object-fit: cover
  const ox = (rv.width - v.videoWidth * esc_) / 2, oy = (rv.height - v.videoHeight * esc_) / 2;
  const margen = 0.03; // un poco de aire alrededor
  let x = (rm.left - rv.left - ox) / esc_, y = (rm.top - rv.top - oy) / esc_;
  let w = rm.width / esc_, h = rm.height / esc_;
  x -= w * margen; y -= h * margen; w *= 1 + 2 * margen; h *= 1 + 2 * margen;
  x = Math.max(0, x); y = Math.max(0, y); w = Math.min(v.videoWidth - x, w); h = Math.min(v.videoHeight - y, h);
  const c = document.createElement('canvas');
  const anchoSalida = Math.min(1600, Math.round(w * 1.5));
  c.width = anchoSalida; c.height = Math.round(h * anchoSalida / w);
  c.getContext('2d').drawImage(v, x, y, w, h, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.92);
}

const nativo = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
async function fotoSistema(fuente) {
  const cam = nativo && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
  if (cam) {
    try {
      const f = await cam.getPhoto({ quality: 92, width: 2000, resultType: 'dataUrl', source: fuente === 'galeria' ? 'PHOTOS' : 'CAMERA', correctOrientation: true, saveToGallery: false });
      procesarFoto(f.dataUrl);
    } catch (e) {
      if (!/cancel/i.test(String(e && e.message))) alert(`No se pudo abrir la ${fuente === 'galeria' ? 'galería' : 'cámara'}: ${e.message || e}`);
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

/* ================= reconocimiento ================= */
let imgActual = null;
let busquedaId = 0;

function estado(html, tipo = '') { const e = $('#estado'); e.className = `estado ${tipo}`; e.innerHTML = html; }
function progresoHTML(txt, i, n) { return `<span class="cargando">${esc(txt)}</span><div class="progreso"><div style="width:${Math.round(100 * i / n)}%"></div></div>`; }

/* La cámara NO se cierra: el resultado aparece debajo y se puede volver a disparar enseguida. */
function mostrarResultado() {
  document.body.classList.add('con-resultados');
  $('#panel-resultado').hidden = false; $('#panel-detalle').hidden = false;
  $('#candidatos').innerHTML = ''; $('#titulo-cand').hidden = true; $('#detalle').innerHTML = ''; $('#ocr-detalle').hidden = true; $('#punto').hidden = true;
  iniciarCamara();
}

/* ---------- lista de cartas escaneadas en esta sesión ---------- */
const sesion = []; // { busqueda, carta, p, uidCol }
let seguroActual = false; // la última carta se reconoció con seguridad
let fotoId = 0; // una foto o búsqueda = una entrada en la lista (releer tocando el número la corrige)

function registrarEscaneo(carta, p, elegida) {
  let e = sesion.find((x) => x.busqueda === fotoId);
  if (e) { // se eligió otra candidata para la misma foto: se reemplaza
    if (e.carta.id !== carta.id && e.uidCol) { guardar('coleccion', leer('coleccion', []).filter((c) => c.uid !== e.uidCol)); e.uidCol = null; }
    Object.assign(e, { carta, p });
  } else {
    e = { busqueda: fotoId, carta, p, uidCol: null };
    sesion.unshift(e);
    if (leer('vibrar', true) && navigator.vibrate) navigator.vibrate(35); // carta leída
  }
  if ($('#auto-guardar').checked && !e.uidCol && (seguroActual || elegida)) e.uidCol = agregarColeccion(carta, p);
  pintarSesion(e);
  return e;
}

async function pintarSesion(nueva) {
  $('#panel-sesion').hidden = !sesion.length;
  if (!sesion.length) return;
  const tasas = await getTasas();
  const total = sesion.reduce((s, e) => s + (e.p.usd || 0), 0);
  const pct = leer('ventaPct', 80);
  $('#sesion-total').textContent = `${sesion.length} carta${sesion.length === 1 ? '' : 's'} · ${fmtUSD(total)} · ${fmtCOP(total * tasas.COP)}`;
  $('#sesion-venta').textContent = `Valor del lote: ${fmtCOP(total * tasas.COP)} · vendiéndolo al ${pct}%: ${fmtCOP(total * tasas.COP * pct / 100)}${typeof hayCalcVenta === 'function' && hayCalcVenta() ? ` · ${textoNeto(total * pct / 100, tasas)}` : ''}`;
  $('#lista-sesion').innerHTML = sesion.map((e, i) => `
    <li class="${e === nueva ? 'nueva' : ''}" data-i="${i}">
      <img src="${esc(imgCarta(e.carta))}" alt="" data-ver>
      <div class="info" data-ver><b>${bandera(e.carta._lang)} ${esc(e.carta.name)}</b><span class="meta">${esc(nombreSet(e.carta))} · ${esc(e.carta.localId)}</span></div>
      <div class="valor"><b>${fmtUSD(e.p.usd)}</b><br><span class="meta">${e.p.usd != null ? fmtCOP(e.p.usd * tasas.COP) : ''}</span></div>
      <button class="mas" data-mas ${e.uidCol ? 'disabled aria-label="Guardada"' : 'aria-label="Guardar en mi colección"'}>${e.uidCol ? '✓' : '＋'}</button>
    </li>`).join('');
  $$('#lista-sesion li').forEach((li) => {
    const e = sesion[+li.dataset.i];
    $('[data-mas]', li).addEventListener('click', () => { if (!e.uidCol) { e.uidCol = agregarColeccion(e.carta, e.p); pintarSesion(); } });
    $$('[data-ver]', li).forEach((x) => x.addEventListener('click', () => { abrirCarta(e.carta, $('#detalle'), null, { soloVer: true }); $('#panel-detalle').scrollIntoView({ behavior: 'smooth' }); }));
  });
  const pend = sesion.filter((e) => !e.uidCol).length;
  $('#btn-guardar-todas').hidden = !pend;
  $('#btn-guardar-todas').textContent = `＋ Guardar ${pend === 1 ? 'la pendiente' : `las ${pend} pendientes`}`;
}

function precioRapido(carta, p, tasas) {
  const r = $('#estado .precio-rapido');
  const html = p.usd != null ? `<b>${fmtUSD(p.usd)}</b><span>${enLocal(p.usd, tasas)}</span>` : '<span class="meta">sin precio registrado</span>';
  if (r) r.innerHTML = html; else $('#estado').insertAdjacentHTML('beforeend', `<div class="precio-rapido">${html}</div>`);
}

async function procesarFoto(src) {
  const id = ++busquedaId; fotoId++;
  mostrarResultado();
  $('#mini-wrap').hidden = false; $('#mini').src = src; $('#ayuda-toque').hidden = true;
  try {
    estado(progresoHTML('Preparando el lector (la primera vez descarga ~10 MB)', 0, 1));
    const [img, sets, codigos] = await Promise.all([cargarImagen(src), getSets(), getCodigos()]);
    imgActual = img;
    const totales = new Set(sets.map((s) => s.cardCount && s.cardCount.official));
    const res = await Reconocer.reconocer(img, {
      totales, codigos,
      progreso: (i, n, fase) => { if (id === busquedaId) estado(progresoHTML(fase === 'nombre' ? 'Leyendo el nombre' : 'Leyendo el número de la carta', i, n + 1)); },
    });
    if (id !== busquedaId) return;
    // si la carta dice "EN"/"ES" junto al código del set, manda eso sobre el idioma elegido
    const det = idioma !== 'ja' ? detectarIdioma(res.texto) : null;
    if (det && det !== idioma) {
      res.aviso = `Detecté una carta en <b>${IDIOMAS[det].nombre.toLowerCase()}</b> ${bandera(det)}`;
      await resolver(res, id, await getSets(det), await getCodigos(det), det);
    } else await resolver(res, id, sets, codigos, idioma);
  } catch (e) {
    console.error(e);
    if (id === busquedaId) estado(`Error leyendo la foto: ${esc(e.message || e)}. ¿Tienes internet?`, 'error');
  }
}

async function leerToque(fx, fy) {
  if (!imgActual) return;
  const id = ++busquedaId;
  const p = $('#punto'); p.hidden = false; p.style.left = `${fx * 100}%`; p.style.top = `${fy * 100}%`;
  $('#candidatos').innerHTML = ''; $('#titulo-cand').hidden = true; $('#detalle').innerHTML = '';
  estado('<span class="cargando">Leyendo la zona que tocaste</span>');
  try {
    const lang = langEscaneo;
    const [sets, codigos] = await Promise.all([getSets(lang), getCodigos(lang)]);
    const totales = new Set(sets.map((s) => s.cardCount && s.cardCount.official));
    const res = await Reconocer.reconocerZona(imgActual, fx, fy, { totales, codigos });
    if (id !== busquedaId) return;
    await resolver(res, id, sets, codigos, lang);
  } catch (e) {
    if (id === busquedaId) estado(`Error: ${esc(e.message || e)}`, 'error');
  }
}

async function resolver(res, id, sets, codigos, lang = idioma) {
  langEscaneo = lang;
  $('#ocr-texto').textContent = res.texto; $('#ocr-detalle').hidden = !res.texto;
  const leido = [...res.codigos.map((c) => `${c}`), ...res.lecturas.filter((l) => l.votos).slice(0, 2).map((l) => `${l.num}/${l.total}`)].join(' · ');
  estado(`<span class="cargando">Buscando ${esc(leido || 'la carta')} ${bandera(lang)}</span>`);
  let ranking = await Reconocer.identificar(res, { api: apiDe(lang), sets, codigos, getJSON });
  if (id !== busquedaId) return;

  if (!ranking.length) {
    // ¿es una energía básica? (casi no tienen texto: dicen "Energía"/"Energy" y tienen un símbolo grande de color)
    if (typeof ventanaEnergias === 'function' && /energ[ií]a|energy/i.test(res.texto) && !res.lecturas.some((l) => l.votos)) {
      const pre = imgActual ? detectarEnergiaPorColor(imgActual) : null;
      estado(`⚡ Parece una energía básica${pre ? ` de <b>${esc(pre.tipo)}</b>` : ''}. Elige cuántas agregar.`);
      ventanaEnergias(pre);
      return;
    }
    // plan B: nombre leído arriba
    const palabras = [...new Set(res.arriba.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ]{4,}/g) || [])]
      .filter((w) => !/^(basic|basico|básico|fase|stage|evoluciona|evolves|trainer|entrenador|pokemon|pokémon|ilus|illus)$/i.test(w))
      .sort((a, b) => b.length - a.length).slice(0, 3);
    for (const w of palabras) {
      const r = await buscarPorNombre(w).catch(() => []);
      if (id !== busquedaId) return;
      if (r.length) {
        estado(`No pude leer el número; busqué por nombre «${esc(w)}». Elige tu carta.`);
        $('#ayuda-toque').hidden = false;
        mostrarCandidatos(r.slice(0, 40), `Resultados para «${w}»`);
        return;
      }
    }
    estado('No pude reconocer la carta.', 'error');
    $('#ayuda-toque').hidden = false;
    // las energías básicas casi no tienen texto: ofrecer el selector con el tipo adivinado por el color
    if (typeof ventanaEnergias === 'function') {
      const pre = imgActual ? detectarEnergiaPorColor(imgActual) : null;
      $('#estado').insertAdjacentHTML('beforeend', '<div><button class="btn secundario chico" id="btn-es-energia">⚡ ¿Es una energía? Agrégala aquí</button></div>');
      $('#btn-es-energia').addEventListener('click', () => ventanaEnergias(pre));
    }
    return;
  }
  const cartas = ranking.map((x) => x.carta);
  const seguro = ranking.length === 1 || ranking[0].puntaje - ranking[1].puntaje >= 40;
  seguroActual = seguro;
  $('#ayuda-toque').hidden = false;
  cartas.forEach((c) => { c._lang = lang; });
  estado((res.aviso ? `<div class="meta">${res.aviso}</div>` : '') + (seguro ? `✅ <b>${esc(cartas[0].name)}</b> ${bandera(lang)} · ${esc(nombreSet(cartas[0], lang))}`
    : `Encontré ${cartas.length} posibles. La más probable está marcada; si no es, toca la tuya (fíjate en el símbolo del set).`));
  mostrarCandidatos(cartas, seguro ? 'Otras coincidencias' : '¿Cuál es tu carta?', 0);
  abrirCarta(cartas[0], $('#detalle'), null, { escaneo: true });
}

function cargarImagen(src) {
  return new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => mal(new Error('imagen inválida')); i.src = src; });
}

async function buscarPorNumero(num, total, pref = '') {
  const sets = await getSets();
  let cand = sets.filter((s) => s.cardCount && s.cardCount.official === total);
  if (pref === 'TG' || pref === 'GG') cand = sets.filter((s) => /(tg|gg)$/i.test(s.id) && s.cardCount && s.cardCount.official === total);
  if (!cand.length) cand = sets.filter((s) => s.cardCount && s.cardCount.total === total);
  const r = await Promise.allSettled(cand.slice(0, 12).map((s) => getJSON(`${API}/sets/${encodeURIComponent(s.id)}/${encodeURIComponent(num)}`)));
  return r.filter((x) => x.status === 'fulfilled' && x.value && x.value.id).map((x) => x.value);
}
/* Número sin "/": "43 94", "043094", "4394" o solo "43". */
async function buscarSoloNumeros(q) {
  const sets = await getSets();
  const totales = new Set(sets.map((s) => s.cardCount && s.cardCount.official));
  const grupos = q.match(/\d+/g) || [];
  let pares = [];
  if (grupos.length >= 2) pares = [[grupos[0], grupos[1]]];
  else {
    const d = grupos[0] || '';
    // todas las formas de partir los dígitos en número + total (total de 2–3 cifras que exista)
    for (let i = 1; i < d.length; i++) {
      const num = d.slice(0, i), tot = d.slice(i);
      if (num.length <= 3 && tot.length >= 2 && tot.length <= 3 && totales.has(parseInt(tot, 10)) && parseInt(num, 10) > 0) pares.push([num, tot]);
    }
  }
  let cartas = [];
  for (const [num, tot] of pares.slice(0, 4)) cartas.push(...await buscarPorNumero(String(parseInt(num, 10)), parseInt(tot, 10)));
  cartas = [...new Map(cartas.map((c) => [c.id, c])).values()];
  if (cartas.length || grupos.length >= 2) return cartas;
  // solo el número de la carta: todas las cartas con ese número, sets más nuevos primero
  const n = parseInt(grupos[0], 10); if (!n || n > 999) return [];
  const orden = new Map(sets.map((s, i) => [s.id, i]));
  const l = await getJSON(`${API}/cards?localId=${n}`).catch(() => []);
  const l2 = String(n).length < 3 ? await getJSON(`${API}/cards?localId=${String(n).padStart(3, '0')}`).catch(() => []) : [];
  return [...new Map([...l, ...l2].filter((c) => c.id && parseInt(c.localId, 10) === n).map((c) => [c.id, c])).values()].sort((a, b) => (orden.get(b.id.slice(0, b.id.lastIndexOf('-'))) ?? 0) - (orden.get(a.id.slice(0, a.id.lastIndexOf('-'))) ?? 0));
}

async function buscarPorNombre(q) {
  const l = await getJSON(`${API}/cards?name=like:${encodeURIComponent(q)}`);
  return Array.isArray(l) ? l : [];
}

/* Buscador general (escáner, intercambio, deseos): "43 94", "043094", "43/94", "PFL 43", "43" o un nombre. */
async function buscarCartas(q) {
  q = String(q || '').trim(); if (!q) return [];
  // energías básicas con sinónimos: "energía eléctrica", "rayo energía", "fire energy"…
  const en = typeof energiaDeTexto === 'function' ? energiaDeTexto(q) : null;
  if (en) return [await cartaEnergia(en.n)];
  const mNum = q.match(/^\s*(TG|GG|SV|RC)?\s*(\d{1,3})\s*\/\s*(TG|GG|SV|RC)?\s*(\d{1,3})\s*$/i);
  const mCod = q.toUpperCase().match(/^\s*([A-Z0-9]{2,4})\s+(?:[A-Z]{2}\s+)?(\d{1,3})(?:\s*\/\s*\d{1,3})?\s*$/);
  const codigos = await getCodigos();
  if (mCod && codigos[mCod[1]]) {
    return [await getJSON(`${API}/sets/${encodeURIComponent(codigos[mCod[1]])}/${parseInt(mCod[2], 10)}`).catch(() => null)].filter(Boolean);
  }
  if (mNum) {
    const pref = (mNum[1] || mNum[3] || '').toUpperCase();
    const num = pref ? pref + mNum[2].padStart(2, '0') : String(parseInt(mNum[2], 10));
    return buscarPorNumero(num, parseInt(mNum[4], 10), pref);
  }
  if (/^[\d\s.\-]+$/.test(q)) return buscarSoloNumeros(q);
  return buscarPorNombre(q);
}

async function busquedaManual(q) {
  q = q.trim(); if (!q) return;
  const id = ++busquedaId; fotoId++;
  langEscaneo = idioma; // a mano se busca en el idioma elegido
  mostrarResultado(); $('#mini-wrap').hidden = true; $('#ayuda-toque').hidden = true; imgActual = null;
  try {
    estado('<span class="cargando">Buscando</span>');
    const cartas = await buscarCartas(q);
    if (id !== busquedaId) return;
    if (!cartas.length) return estado(`No encontré «${esc(q)}». Usa el nombre en español o el número tipo 43/94.`, 'error');
    estado(cartas.length === 1 ? `✅ <b>${esc(cartas[0].name)}</b>` : `${cartas.length} resultados para «${esc(q)}». Toca la tuya.`);
    seguroActual = cartas.length === 1;
    mostrarCandidatos(cartas.slice(0, 80), 'Resultados', cartas.length === 1 ? 0 : -1);
    if (cartas.length === 1) abrirCarta(cartas[0], $('#detalle'), null, { escaneo: true });
    // varias versiones (p. ej. "Charizard"): opción de verlas todas ordenadas por precio
    else ofrecerOrdenPorPrecio(cartas.slice(0, 80), id);
  } catch (e) {
    estado(`Error de conexión: ${esc(e.message)}`, 'error');
  }
}

/* ================= interfaz de cartas ================= */
function imgCarta(c, calidad = 'low') {
  if (!c.image && typeof imgEnergia === 'function') { const s = imgEnergia(c); if (s) return s; } // energías sin imagen en TCGdex
  return c.image ? `${c.image}/${calidad}.webp` : 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 88"><rect width="63" height="88" rx="4" fill="#1f2330"/><text x="31" y="47" font-size="8" fill="#8f97aa" text-anchor="middle" font-family="sans-serif">sin imagen</text></svg>');
}

function mostrarCandidatos(cartas, titulo, sel = -1) {
  const cont = $('#candidatos'); const tit = $('#titulo-cand');
  $('#btn-ordenar-precio').hidden = true;
  if (cartas.length <= 1 && sel === 0) { cont.innerHTML = ''; tit.hidden = true; return; }
  tit.hidden = false; tit.textContent = titulo;
  cont.innerHTML = cartas.map((c, i) => `
    <button class="cand${i === sel ? ' sel' : ''}" data-i="${i}">
      <img loading="lazy" src="${esc(imgCarta(c))}" alt="">
      <div class="n">${esc(c.name)}</div>
      <div class="s">${esc(nombreSet(c) || c.id)} · ${esc(c.localId)}</div>
      ${c._precio !== undefined ? `<div class="precio-cand">${c._precio != null ? fmtUSD(c._precio) : 'sin precio'}</div>` : ''}
    </button>`).join('');
  $$('.cand', cont).forEach((b) => b.addEventListener('click', () => {
    $$('.cand', cont).forEach((x) => x.classList.toggle('sel', x === b));
    abrirCarta(cartas[+b.dataset.i], $('#detalle'), null, { escaneo: true, elegida: true });
  }));
}

/* opts.escaneo: es el resultado de una foto/búsqueda → entra a la lista de la sesión y muestra el precio arriba.
   opts.elegida: el usuario tocó esta candidata.  opts.soloVer: ver una carta de la lista de la sesión. */
async function abrirCarta(c, destino, item = null, opts = {}) {
  const id = busquedaId;
  const lang = c._lang || (item && item.idioma) || langEscaneo || 'es';
  destino.innerHTML = '<div class="carta"><span class="cargando">Consultando precio actual</span></div>';
  try {
    const carta = c.pricing !== undefined && c.set?.cardCount ? c : await getJSON(`${apiDe(lang)}/cards/${encodeURIComponent(c.id)}`);
    carta._lang = lang;
    // energías básicas: en español no traen precio → el de la versión en inglés
    if (typeof esEnergiaSVE === 'function' && esEnergiaSVE(carta.id) && !(carta.pricing && (carta.pricing.cardmarket || carta.pricing.tcgplayer)) && lang !== 'en') {
      const en = await getJSON(`${apiDe('en')}/cards/${encodeURIComponent(carta.id)}`).catch(() => null);
      if (en && en.pricing) carta.pricing = en.pricing;
    }
    const tasas = await getTasas();
    let entrada = null;
    if (opts.escaneo && id === busquedaId) {
      const p = precioUSD(carta, tasas, null, lang);
      if (opts.elegida || !seguroActual) estado(`✅ <b>${esc(carta.name)}</b> ${bandera(lang)} · ${esc(nombreSet(carta, lang))}`);
      precioRapido(carta, p, tasas);
      entrada = registrarEscaneo(carta, p, opts.elegida);
    } else if (opts.soloVer) entrada = sesion.find((e) => e.carta.id === carta.id) || null;
    pintarCarta(carta, tasas, destino, item, entrada);
  } catch (e) {
    destino.innerHTML = `<div class="carta estado error">No se pudo consultar la carta (${esc(e.message)}). Revisa tu conexión.</div>`;
  }
}

function graficoHistoria(hist) {
  if (!hist || hist.length < 2) return '<p class="nota">El historial aparecerá a medida que se actualicen los precios.</p>';
  const xs = hist.map((h) => h.t), ys = hist.map((h) => h.usd);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const W = 300, H = 60, px = (t) => (x1 === x0 ? 0 : (t - x0) / (x1 - x0)) * W, py = (u) => H - 4 - (y1 === y0 ? 0.5 : (u - y0) / (y1 - y0)) * (H - 8);
  const d = hist.map((h, i) => `${i ? 'L' : 'M'}${px(h.t).toFixed(1)},${py(h.usd).toFixed(1)}`).join(' ');
  const color = ys[ys.length - 1] >= ys[0] ? 'var(--verde)' : 'var(--rojo)';
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${d} L${W},${H} L0,${H} Z" fill="${color}" opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/></svg>
    <div class="meta" style="display:flex;justify-content:space-between"><span>${new Date(x0).toLocaleDateString(LOCALE())} · ${fmtUSD(ys[0])}</span><span>mín ${fmtUSD(y0)} · máx ${fmtUSD(y1)}</span></div>`;
}

function pintarCarta(carta, tasas, destino, item = null, entrada = null) {
  const vs = variantesTCG(carta);
  let variante = item ? item.variante : null;
  const cm = carta.pricing && carta.pricing.cardmarket;
  const set = carta.set || {};
  const oficial = set.cardCount ? set.cardCount.official : '?';
  const prodTCG = vs.find((v) => v.productId)?.productId || (carta.thirdParty && carta.thirdParty.tcgplayer);
  const actualizado = carta.pricing?.tcgplayer?.updated || cm?.updated;

  const pintarPrecio = () => {
    const p = precioUSD(carta, tasas, variante, carta._lang);
    variante = p.variante;
    $('.precio', destino).innerHTML = p.usd != null
      ? `<div class="usd">${fmtUSD(p.usd)}</div><div class="cop">${enLocal(p.usd, tasas)}</div><div class="fuente">${esc(p.fuente)}${p.variante && p.variante !== 'cardmarket' ? ` · ${esc(NOMBRE_VARIANTE[p.variante] || p.variante)}` : ''}</div>`
      : '<div class="cop">Sin precio registrado</div>';
    $$('.variantes button', destino).forEach((b) => b.classList.toggle('sel', b.dataset.v === p.variante));
    return p;
  };

  destino.innerHTML = `
  <div class="carta">
    <div class="carta-top">
      <img class="carta-img" src="${esc(imgCarta(carta, 'high'))}" alt="${esc(carta.name)}">
      <div style="min-width:0">
        <h2>${esc(carta.name)}</h2>
        <div class="meta">
          ${set.symbol ? `<img class="simbolo" src="${esc(set.symbol)}.webp" alt="" onerror="this.remove()">` : ''}${esc(nombreSet(carta))}<br>
          Nº ${esc(carta.localId)}/${esc(oficial)} · ${bandera(carta._lang)} ${esc(IDIOMAS[carta._lang || 'es'].nombre)}
        </div>
        ${carta.rarity ? `<span class="chip-rareza">${esc(carta.rarity)}</span>` : ''}
        <div class="precio"></div>
      </div>
    </div>
    <div class="botones">
      ${item ? '' : '<button class="guardar" data-acc="guardar">＋ A mi colección</button>'}
      ${prodTCG ? `<a href="https://www.tcgplayer.com/product/${encodeURIComponent(prodTCG)}" target="_blank" rel="noopener">Ver en TCGplayer</a>` : ''}
    </div>
    <div class="acciones-carta">
      <button data-acc="deseo">♡ La quiero</button>
      <button data-acc="doy">⇄ La doy</button>
      ${item ? '' : '<button data-acc="recibo">⇄ La recibo</button>'}
    </div>
    ${vs.length > 1 ? `<div class="variantes">${vs.map((v) => `<button data-v="${esc(v.clave)}">${esc(v.nombre)} · ${fmtUSD(v.market ?? v.mid)}</button>`).join('')}</div>` : ''}
    ${vs.length ? `<table><thead><tr><th>TCGplayer</th><th>Mercado</th><th>Mínimo</th><th>En ${esc(MON().plural)}</th></tr></thead><tbody>
      ${vs.map((v) => `<tr><td>${esc(v.nombre)}</td><td>${fmtUSD(v.market)}</td><td>${fmtUSD(v.low)}</td><td>${v.market != null ? fmtCOP(v.market * tasas.COP) : '—'}</td></tr>`).join('')}</tbody></table>` : ''}
    ${cm ? `<table><thead><tr><th>Cardmarket</th><th>Tendencia</th><th>Prom. 30 d</th><th>En ${esc(MON().plural)}</th></tr></thead><tbody>
      <tr><td>Normal</td><td>${fmtEUR(cm.trend)}</td><td>${fmtEUR(cm.avg30)}</td><td>${cm.trend != null ? fmtCOP(cm.trend / tasas.EUR * tasas.COP) : '—'}</td></tr>
      ${cm['trend-holo'] ? `<tr><td>Holo / reverse</td><td>${fmtEUR(cm['trend-holo'])}</td><td>${fmtEUR(cm['avg30-holo'])}</td><td>${fmtCOP(cm['trend-holo'] / tasas.EUR * tasas.COP)}</td></tr>` : ''}
    </tbody></table>` : ''}
    ${typeof bloqueComparar === 'function' ? bloqueComparar(carta, tasas) : ''}
    ${item ? `<p class="titulo-sec">Historial de precio</p><div class="historia">${graficoHistoria(item.historial)}</div>` : ''}
    ${item ? seccionMiCarta(item) : ''}
    ${item && item.copias > 1 ? `<p class="copias">Tienes <b>${item.copias} copias</b> de esta carta (con este estado)</p>` : ''}
    ${item ? `<div class="botones"><button class="peligro" data-acc="quitar">${item.copias > 1 ? 'Quitar una copia' : 'Quitar de mi colección'}</button></div>` : ''}
    <p class="nota">Precio consultado ahora mismo${actualizado ? ` (TCGdex lo actualizó el ${esc(new Date(actualizado).toLocaleDateString(LOCALE()))})` : ''}.
    ${{
    en: 'Carta en inglés: el precio de TCGplayer corresponde exactamente a esta versión.',
    ja: 'Carta japonesa: precio de Cardmarket del producto japonés (en euros, convertido). TCGplayer casi no vende japonesas.',
  }[carta._lang] || 'TCGplayer cotiza la versión en inglés; las cartas en español suelen venderse algo más baratas. Cardmarket mezcla idiomas.'}</p>
  </div>`;

  let p = pintarPrecio();
  $$('.variantes button', destino).forEach((b) => b.addEventListener('click', () => {
    variante = b.dataset.v; p = pintarPrecio();
    if (item) { // cambiar variante de una carta guardada
      actualizarItem(item.uid, (it) => { it.variante = p.variante; it.usd = p.usd; it.historial = (it.historial || []).concat({ t: Date.now(), usd: p.usd }); });
    }
  }));
  const bG = $('[data-acc="guardar"]', destino);
  const marcarGuardada = () => { bG.textContent = '✓ Guardada en tu colección'; bG.disabled = true; };
  if (bG && entrada && entrada.uidCol) marcarGuardada();
  if (bG) bG.addEventListener('click', () => {
    const uid = agregarColeccion(carta, p); marcarGuardada();
    if (entrada) { entrada.uidCol = uid; entrada.p = p; pintarSesion(); }
  });
  if (item) conectarMiCarta(destino, item, tasas, () => p);
  // ♡ deseos y ⇄ intercambio desde cualquier ficha
  const bD = $('[data-acc="deseo"]', destino);
  if (bD) bD.addEventListener('click', async () => { if (await agregarDeseo(carta)) { bD.textContent = '♥ En tus deseos'; bD.disabled = true; } });
  for (const lado of ['doy', 'recibo']) {
    const b = $(`[data-acc="${lado}"]`, destino);
    if (b) b.addEventListener('click', async () => {
      const ok = await agregarAlCambio(lado, carta, lado === 'doy' && item ? item.uid : null);
      b.textContent = ok ? (lado === 'doy' ? '✓ En «Yo doy»' : '✓ En «Yo recibo»') : 'Ya está en el intercambio';
      b.disabled = true;
    });
  }
  const bQ = $('[data-acc="quitar"]', destino);
  if (bQ) bQ.addEventListener('click', () => {
    if (!confirm(item.copias > 1 ? `¿Quitar una copia de ${carta.name}? (te quedan ${item.copias - 1})` : `¿Quitar ${carta.name} de tu colección?`)) return;
    guardar('coleccion', leer('coleccion', []).filter((c) => c.uid !== item.uid));
    cerrarModal(); pintarColeccion();
  });
  // al abrir una carta guardada, su precio guardado también queda al día
  if (item && p.usd != null) actualizarItem(item.uid, (it) => { if (Math.abs((it.usd ?? 0) - p.usd) > 1e-9) { it.usd = p.usd; it.historial = (it.historial || []).concat({ t: Date.now(), usd: p.usd }).slice(-200); } it.rarity = carta.rarity || it.rarity; it.types = carta.types || it.types; it.category = carta.category || it.category; });
}

/* ================= colección ================= */
function agregarColeccion(carta, p) {
  const col = leer('coleccion', []);
  col.unshift({
    uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    id: carta.id, name: carta.name, set: carta.set ? carta.set.name : '', setId: carta.set ? carta.set.id : '',
    localId: carta.localId, num: `${carta.localId}/${carta.set?.cardCount?.official ?? '?'}`, image: carta.image, rarity: carta.rarity || '',
    types: carta.types || [], category: carta.category || '', idioma: carta._lang || 'es',
    variante: p.variante, usd: p.usd, usdInicial: p.usd, fecha: Date.now(),
    historial: p.usd != null ? [{ t: Date.now(), usd: p.usd }] : [],
  });
  guardar('coleccion', col);
  return col[0].uid;
}
function actualizarItem(uid, fn) {
  const col = leer('coleccion', []); const it = col.find((c) => c.uid === uid);
  if (it) { fn(it); guardar('coleccion', col); }
}
const cambioPct = (c) => (c.usd != null && c.usdInicial ? (c.usd / c.usdInicial - 1) * 100 : null);
function badgeCambio(pct) {
  if (pct == null) return '';
  if (Math.abs(pct) < 0.5) return '<span class="igual">= 0%</span>';
  return `<span class="${pct > 0 ? 'sube' : 'baja'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%</span>`;
}

const filtro = { texto: '', orden: leer('orden', 'caras'), set: '', grupo: 0, tipo: '', idioma: '', carpeta: '' };
let modoColeccion = 'cartas'; // 'cartas' | 'sets' (progreso por set)
// copias "iguales" = misma carta, misma variante y mismo idioma
const claveCopia = (c) => `${c.id}|${c.variante || ''}|${c.idioma || 'es'}|${c.gradeo ? `${c.gradeo.empresa} ${c.gradeo.nota}` : c.estado || 'NM'}`;
/* Estado de la carta → % del precio de mercado (guía habitual de TCGplayer) */
const ESTADOS = {
  NM: { nombre: 'Nueva', corto: 'NM', f: 1 },
  LP: { nombre: 'Casi nueva', corto: 'LP', f: 0.85 },
  MP: { nombre: 'Jugada', corto: 'MP', f: 0.7 },
  HP: { nombre: 'Muy jugada', corto: 'HP', f: 0.5 },
  DMG: { nombre: 'Dañada', corto: 'DMG', f: 0.35 },
};
const factorEstado = (c) => (ESTADOS[c.estado] || ESTADOS.NM).f;
// lo que vale TU copia: calificada (PSA…) → precio real o estimado; si no, según su estado (NM/LP…)
const valorUSD = (c) => (c.gradeo ? valorGradeoUSD(c) : (c.usd || 0) * factorEstado(c));
const CARPETAS_BASE = ['Favoritas', 'Para jugar', 'Para vender'];
const carpetasUsadas = (col) => [...new Set([...CARPETAS_BASE, ...col.map((c) => c.carpeta).filter(Boolean)])];
// tipos de las cartas japonesas → nombre en español, para filtrar todo junto
const TIPO_JA = {
  草: 'Planta', 炎: 'Fuego', 水: 'Agua', 雷: 'Eléctrico', 超: 'Psíquico', 闘: 'Lucha', 悪: 'Siniestro', 鋼: 'Metal', ドラゴン: 'Dragón', フェアリー: 'Hada', 無色: 'Normal', トレーナーズ: 'Entrenador', エネルギー: 'Energía',
  // las cartas en inglés (y algunas japonesas) traen el tipo en inglés
  Grass: 'Planta', Fire: 'Fuego', Water: 'Agua', Lightning: 'Eléctrico', Psychic: 'Psíquico', Fighting: 'Lucha', Darkness: 'Siniestro', Metal: 'Metal', Dragon: 'Dragón', Fairy: 'Hada', Colorless: 'Normal',
  // nombres de TCGdex en español → los que usa la comunidad
  Rayo: 'Eléctrico', Oscura: 'Siniestro', Metálica: 'Metal', Incolora: 'Normal', Trainer: 'Entrenador', Energy: 'Energía',
};

/* Tipo de la carta: el tipo del Pokémon (Fuego, Agua…) o la categoría (Entrenador, Energía) */
const TIPO_ICONO = { Fuego: '🔥', Agua: '💧', Planta: '🌿', Eléctrico: '⚡', Psíquico: '🔮', Lucha: '👊', Siniestro: '🌑', Metal: '⚙️', Dragón: '🐉', Hada: '🧚', Normal: '⚪', Entrenador: '🎒', Energía: '✴️' };
function tiposDe(c) {
  const norm = (t) => TIPO_JA[t] || t;
  if (c.types && c.types.length) return c.types.map(norm);
  if (c.category && !/pok|ポケモン/i.test(sinTildes(c.category))) return [norm(c.category)];
  return [];
}

async function pintarColeccion() {
  const col = leer('coleccion', []);
  const tasas = await getTasas();
  const total = col.reduce((s, c) => s + valorUSD(c), 0); // según el estado de cada copia
  const mercado = col.reduce((s, c) => s + (c.usd || 0), 0);
  const inicial = col.reduce((s, c) => s + (c.usdInicial ?? c.usd ?? 0), 0);
  const ult = leer('ultimaActualizacion', 0);
  // inversión: solo las cartas a las que les pusiste "lo que pagaste"
  const conCompra = col.filter((c) => c.compraUSD > 0);
  const invertido = conCompra.reduce((s, c) => s + c.compraUSD * tasas.COP, 0);
  const valorConCompra = conCompra.reduce((s, c) => s + valorUSD(c) * tasas.COP, 0);
  const ganancia = valorConCompra - invertido;
  $('#resumen').innerHTML = `
    <div class="meta">${col.length} carta${col.length === 1 ? '' : 's'}${(() => { const d = new Set(col.map(claveCopia)).size; return d < col.length ? ` (${d} distintas)` : ''; })()} · valor de tu colección</div>
    <div class="total">${fmtUSD(total)}</div>
    <div class="cop">${enLocal(total, tasas)}</div>
    ${invertido ? `<div class="inversion">Pagaste <b>${fmtCOP(invertido)}</b> por ${conCompra.length} carta${conCompra.length === 1 ? '' : 's'} · hoy valen ${fmtCOP(valorConCompra)} ·
      <span class="${ganancia >= 0 ? 'sube' : 'baja'}">${ganancia >= 0 ? 'ganas' : 'pierdes'} ${fmtCOP(Math.abs(ganancia))} (${ganancia >= 0 ? '+' : '−'}${Math.abs(ganancia / invertido * 100).toFixed(0)}%)</span></div>` : ''}
    <div class="fila">
      <span>${inicial ? `${badgeCambio((mercado / inicial - 1) * 100)} <span class="meta">desde que las guardaste</span>` : ''}</span>
      <button class="btn secundario chico" id="btn-actualizar">↻ Actualizar precios</button>
    </div>
    <div class="meta" style="margin-top:8px">Actualizado: ${ult ? esc(new Date(ult).toLocaleString(LOCALE(), { dateStyle: 'medium', timeStyle: 'short' })) : 'aún no'} · ${leer('horasAuto', HORAS_AUTO) > 0 ? `se actualiza solo cada ${leer('horasAuto', HORAS_AUTO)} h al abrir la app` : 'actualización solo a mano (Ajustes)'}</div>`;
  $('#btn-actualizar').addEventListener('click', () => actualizarPrecios(true));
  $('.filtros').hidden = modoColeccion !== 'cartas';
  if (modoColeccion === 'sets') return pintarSets();
  if (modoColeccion === 'stats') return pintarStats();
  if (modoColeccion === 'venta') return pintarVenta();
  $('#lista-coleccion').className = 'rejilla';
  // carpetas (solo si usas alguna)
  const carpetas = [...new Set(col.map((c) => c.carpeta).filter(Boolean))];
  const hayGrad = col.some((c) => c.gradeo);
  $('#col-carpeta').hidden = !carpetas.length && !hayGrad;
  $('#col-carpeta').innerHTML = [['', '📁 Todas las carpetas'], ...(hayGrad ? [['__grad', '🏅 Calificadas']] : []), ...carpetas.map((n) => [n, `📁 ${n}`])]
    .map(([v, n]) => `<button data-c="${esc(v)}" class="${v === filtro.carpeta ? 'sel' : ''}">${esc(n)}</button>`).join('');
  $$('#col-carpeta button').forEach((b) => b.addEventListener('click', () => { filtro.carpeta = b.dataset.c; pintarColeccion(); }));

  // opciones de set y rareza según lo que hay
  const sets = [...new Map(col.map((c) => [c.setId || c.set, nombreSet(c)])).entries()].sort((a, b) => String(a[1]).localeCompare(b[1]));
  $('#col-set').innerHTML = '<option value="">Todos los sets</option>' + sets.map(([k, n]) => `<option value="${esc(k)}"${k === filtro.set ? ' selected' : ''}>${esc(n)}</option>`).join('');
  $('#col-orden').value = filtro.orden;
  $('#col-rareza').innerHTML = GRUPOS_RAREZA.map(([n], i) => `<button data-g="${i}" class="${i === filtro.grupo ? 'sel' : ''}">${esc(n)}</button>`).join('');
  $$('#col-rareza button').forEach((b) => b.addEventListener('click', () => { filtro.grupo = +b.dataset.g; pintarColeccion(); }));
  const tipos = [...new Set(col.flatMap(tiposDe))].sort((a, b) => a.localeCompare(b, 'es'));
  $('#col-tipo').hidden = !tipos.length;
  $('#col-tipo').innerHTML = [['', 'Todos los tipos'], ...tipos.map((t) => [t, `${TIPO_ICONO[t] || '•'} ${t}`])]
    .map(([v, n]) => `<button data-t="${esc(v)}" class="${v === filtro.tipo ? 'sel' : ''}">${esc(n)}</button>`).join('');
  $$('#col-tipo button').forEach((b) => b.addEventListener('click', () => { filtro.tipo = b.dataset.t; pintarColeccion(); }));
  const idiomasCol = Object.keys(IDIOMAS).filter((l) => col.some((c) => (c.idioma || 'es') === l));
  $('#col-idioma').hidden = idiomasCol.length < 2; // solo si tienes cartas de más de un idioma
  $('#col-idioma').innerHTML = [['', 'Todos los idiomas'], ...idiomasCol.map((l) => [l, `${IDIOMAS[l].bandera} ${IDIOMAS[l].nombre}`])]
    .map(([v, n]) => `<button data-l="${v}" class="${v === filtro.idioma ? 'sel' : ''}">${esc(n)}</button>`).join('');
  $$('#col-idioma button').forEach((b) => b.addEventListener('click', () => { filtro.idioma = b.dataset.l; pintarColeccion(); }));

  // filtrar
  const q = sinTildes(filtro.texto.trim());
  const [, gMin, gMax] = GRUPOS_RAREZA[filtro.grupo];
  let lista = col.filter((c) =>
    (!q || sinTildes(`${c.name} ${c.set} ${nombreSet(c)} ${c.num}`).includes(q)) &&
    (!filtro.set || (c.setId || c.set) === filtro.set) &&
    (!filtro.tipo || tiposDe(c).includes(filtro.tipo)) &&
    (!filtro.idioma || (c.idioma || 'es') === filtro.idioma) &&
    (!filtro.carpeta || (filtro.carpeta === '__grad' ? !!c.gradeo : c.carpeta === filtro.carpeta)) &&
    (filtro.grupo === 0 || (nivelRareza(c.rarity) >= gMin && nivelRareza(c.rarity) <= gMax)));
  // ordenar
  const ord = {
    caras: (a, b) => valorUSD(b) - valorUSD(a),
    raras: (a, b) => nivelRareza(b.rarity) - nivelRareza(a.rarity) || (b.usd ?? -1) - (a.usd ?? -1),
    recientes: (a, b) => b.fecha - a.fecha,
    suben: (a, b) => (cambioPct(b) ?? -1e9) - (cambioPct(a) ?? -1e9),
    bajan: (a, b) => (cambioPct(a) ?? 1e9) - (cambioPct(b) ?? 1e9),
    nombre: (a, b) => a.name.localeCompare(b.name, 'es'),
  }[filtro.orden];
  lista = lista.sort(ord);

  const cont = $('#lista-coleccion');
  if (!col.length) { cont.innerHTML = '<div class="vacio">Aún no tienes cartas.<br>Escanea una y toca <b>＋ A mi colección</b>.</div>'; return; }
  if (!lista.length) { cont.innerHTML = '<div class="vacio">Ninguna carta coincide con el filtro.</div>'; return; }
  // las copias repetidas (misma carta, variante e idioma) se agrupan en una casilla con "×N"
  const grupos = new Map();
  for (const c of lista) {
    const k = claveCopia(c);
    if (grupos.has(k)) grupos.get(k).n++; else grupos.set(k, { c, n: 1 });
  }
  cont.innerHTML = [...grupos.values()].map(({ c, n }, i) => `
    <button class="item" data-uid="${esc(c.uid)}">
      ${filtro.orden === 'caras' && i < 3 && c.usd ? `<span class="rank">#${i + 1}</span>` : ''}
      ${n > 1 ? `<span class="cantidad" aria-label="${n} copias">×${n}</span>` : ''}
      <div class="img-wrap">
        <img loading="lazy" src="${esc(imgCarta(c))}" alt="">
        <span class="idioma-chip" title="${esc(IDIOMAS[c.idioma || 'es'].nombre)}">${bandera(c.idioma)} ${IDIOMAS[c.idioma || 'es'].corto}</span>
      </div>
      <div class="n">${esc(c.name)}</div>
      <div class="s">${c.gradeo ? `<span class="chip-grado">${esc(etiquetaGradeo(c.gradeo))}</span> ` : c.estado && c.estado !== 'NM' ? `<span class="chip-estado">${esc(c.estado)}</span> ` : ''}${esc(c.rarity || nombreSet(c))} · ${esc(c.num)}</div>
      <div class="v"><b>${fmtUSD(valorUSD(c))}${n > 1 ? '<small> c/u</small>' : ''}</b>${badgeCambio(cambioPct(c))}</div>
      <div class="s">${c.usd != null ? fmtCOP(valorUSD(c) * n * tasas.COP) + (n > 1 ? ` las ${n}` : '') : ''}</div>
    </button>`).join('');
  $$('.item', cont).forEach((b) => b.addEventListener('click', () => abrirItem(b.dataset.uid)));
}

function abrirItem(uid) {
  const col = leer('coleccion', []);
  const it = col.find((c) => c.uid === uid); if (!it) return;
  const copias = col.filter((c) => claveCopia(c) === claveCopia(it)).length;
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  abrirCarta({ id: it.id }, $('#modal-cuerpo'), { ...it, copias });
}
function cerrarModal() {
  $('#modal').hidden = true; document.body.style.overflow = '';
  if ($('#vista-coleccion').classList.contains('activa')) pintarColeccion();
  else if ($('#vista-intercambio').classList.contains('activa')) pintarIntercambio();
  else if ($('#vista-deseos').classList.contains('activa')) pintarDeseos();
  else if ($('#vista-mazos').classList.contains('activa')) pintarMazos();
}

let actualizando = false;
async function actualizarPrecios(manual = false) {
  if (actualizando) return; actualizando = true;
  const btn = $('#btn-actualizar'); if (btn) { btn.disabled = true; btn.textContent = 'Actualizando…'; }
  try {
    const col = leer('coleccion', []); const tasas = await getTasas(true);
    pintarDolar(tasas);
    let ok = 0; const nuevos = new Map();
    for (let i = 0; i < col.length; i += 6) {
      await Promise.all(col.slice(i, i + 6).map(async (c) => {
        try {
          // energías básicas: el precio solo existe en la versión en inglés
          const carta = await getJSON(`${apiDe(typeof esEnergiaSVE === 'function' && esEnergiaSVE(c.id) ? 'en' : (c.idioma || 'es'))}/cards/${encodeURIComponent(c.id)}`);
          const p = precioUSD(carta, tasas, c.variante, c.idioma);
          nuevos.set(c.uid, { usd: p.usd, variante: p.variante, rarity: carta.rarity, setId: carta.set?.id, types: carta.types, category: carta.category });
          ok++;
        } catch { /* se deja el precio anterior */ }
      }));
    }
    // se mezcla por uid: la colección pudo cambiar mientras se actualizaba
    const ahora = Date.now();
    guardar('coleccion', leer('coleccion', []).map((c) => {
      const n = nuevos.get(c.uid); if (!n) return c;
      if (n.rarity) c.rarity = n.rarity; if (n.setId) c.setId = n.setId;
      if (n.types) c.types = n.types; if (n.category) c.category = n.category;
      if (n.usd == null) return c;
      c.usd = n.usd; c.variante = n.variante; if (c.usdInicial == null) c.usdInicial = n.usd;
      c.historial = (c.historial || []).concat({ t: ahora, usd: n.usd }).slice(-200);
      return c;
    }));
    if (ok || !col.length) guardar('ultimaActualizacion', ahora);
    if (typeof actualizarWidget === 'function') actualizarWidget();
    if (manual && col.length && !ok) alert('No se pudo actualizar: revisa tu conexión.');
  } finally {
    actualizando = false;
    if ($('#vista-coleccion').classList.contains('activa') && $('#modal').hidden) pintarColeccion();
  }
}
function autoActualizar() {
  const horas = leer('horasAuto', HORAS_AUTO); // Ajustes; 0 = solo a mano
  if (horas > 0 && Date.now() - leer('ultimaActualizacion', 0) > horas * 36e5 && leer('coleccion', []).length) actualizarPrecios();
  if (typeof actualizarDeseos === 'function' && Date.now() - leer('deseosRevisados', 0) > 3 * 36e5) {
    guardar('deseosRevisados', Date.now()); actualizarDeseos().catch(() => {});
  }
}

function pintarDolar(t) { $('#dolar').innerHTML = MONEDA === 'USD' ? `Moneda<br><b>US$ ${MON().pais}</b>` : `Dólar hoy ${MON().pais}<br><b>${fmtTasa(t.COP)}</b>`; }

/* ================= arranque ================= */
$$('.tab').forEach((t) => t.addEventListener('click', () => irA(t.dataset.vista)));
$('#btn-capturar').addEventListener('click', () => {
  const f = capturarMarco();
  if (f) procesarFoto(f); else fotoSistema('camara');
});
$('#btn-foto-nativa').addEventListener('click', () => fotoSistema('camara'));
$('#btn-galeria').addEventListener('click', () => fotoSistema('galeria'));
$('#btn-reintentar').addEventListener('click', () => { pararCamara(); iniciarCamara(); });
$('#idiomas').innerHTML = Object.entries(IDIOMAS).map(([l, d]) => `<button data-l="${l}" class="${l === idioma ? 'sel' : ''}">${d.bandera} ${d.nombre}</button>`).join('');
$$('#idiomas button').forEach((b) => b.addEventListener('click', () => cambiarIdioma(b.dataset.l)));
$('#auto-guardar').checked = leer('autoGuardar', false);
$('#auto-guardar').addEventListener('change', (e) => guardar('autoGuardar', e.target.checked));
$('#btn-guardar-todas').addEventListener('click', () => { sesion.forEach((e) => { if (!e.uidCol) e.uidCol = agregarColeccion(e.carta, e.p); }); pintarSesion(); });
$('#btn-limpiar-sesion').addEventListener('click', () => {
  sesion.length = 0; pintarSesion();
  $('#panel-resultado').hidden = true; $('#panel-detalle').hidden = true; document.body.classList.remove('con-resultados');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('#input-foto').addEventListener('change', desdeInput);
$('#input-galeria').addEventListener('change', desdeInput);
// de corrido también a mano: Enter busca, la casilla se vacía y el teclado sigue abierto para el siguiente número
$('#form-buscar').addEventListener('submit', (e) => {
  e.preventDefault();
  const t = $('#txt-buscar'); const q = t.value.trim(); if (!q) return;
  busquedaManual(q);
  t.value = ''; t.placeholder = `Última: ${q} · escribe la siguiente`; t.focus();
});
$('#mini-wrap').addEventListener('click', (e) => {
  const r = $('#mini').getBoundingClientRect();
  leerToque((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
});
$('#col-buscar').addEventListener('input', (e) => { filtro.texto = e.target.value; pintarColeccion(); });
$('#col-orden').addEventListener('change', (e) => { filtro.orden = e.target.value; guardar('orden', filtro.orden); pintarColeccion(); });
$('#col-set').addEventListener('change', (e) => { filtro.set = e.target.value; pintarColeccion(); });
$('#modal-cerrar').addEventListener('click', cerrarModal);
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') cerrarModal(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pararCamara();
  else { iniciarCamara(); autoActualizar(); }
});
// botón "atrás" de Android: cierra el detalle o vuelve a la cámara
if (nativo && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener('backButton', () => {
    if (!$('#modal').hidden) cerrarModal();
    else if (!$('#vista-escanear').classList.contains('activa')) irA('escanear');
    else window.Capacitor.Plugins.App.exitApp();
  });
}

$('#btn-exportar').addEventListener('click', exportarColeccion);
$('#btn-importar').addEventListener('click', () => $('#input-importar').click());
$('#input-importar').addEventListener('change', importarColeccion);

// versión instalada (Android la da el plugin App: versionName + número de compilación)
if (nativo && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.getInfo().then((i) => { $('#version-app').textContent = `CardCalc v${i.version} (compilación ${i.build})`; }).catch(() => {});
} else $('#version-app').textContent = 'CardCalc · versión web (PC)';

getTasas().then(pintarDolar);
getSets().catch(() => {});
getCodigos();
Reconocer.getWorker().catch(() => {}); // precarga el lector OCR
iniciarCamara();
restaurarColeccion().then(migrarMontos).then(autoActualizar).catch(autoActualizar);
