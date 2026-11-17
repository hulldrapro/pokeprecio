/* CardCalc — tanda 4: búsqueda avanzada, varias fotos de la galería, TCGplayer vs Cardmarket, calculadora de venta,
   tema claro/oscuro, copia automática, alertas (notificaciones del celular) y datos para el widget. */
'use strict';

/* ================= 🔎 BÚSQUEDA AVANZADA ================= */
const TIPOS_API = {
  es: ['Agua', 'Dragón', 'Fuego', 'Hada', 'Incolora', 'Lucha', 'Metálica', 'Oscura', 'Planta', 'Psíquico', 'Rayo'],
  en: ['Colorless', 'Darkness', 'Dragon', 'Fairy', 'Fighting', 'Fire', 'Grass', 'Lightning', 'Metal', 'Psychic', 'Water'],
};
const CATEGORIAS_API = { es: ['Pokémon', 'Entrenador', 'Energía'], en: ['Pokemon', 'Trainer', 'Energy'] };
const nombreTipo = (t) => TIPO_JA[t] || t; // nombres de la comunidad (Eléctrico, Siniestro…)

async function busquedaAvanzada() {
  const l = idioma === 'ja' ? 'en' : idioma;
  const rarezas = await getJSON(`${apiDe(l)}/rarities`).catch(() => []);
  const ant = leer('busqAv', {});
  const sel = (id, ops, v, todos) => `<select id="${id}"><option value="">${todos}</option>${ops.map((o) => `<option value="${esc(o)}" ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const cuerpo = abrirModal(`
    <div class="carta">
      <h2>🔎 Búsqueda avanzada</h2>
      <p class="meta">Busca en todas las cartas (${bandera(l)} ${esc(IDIOMAS[l].nombre)}). Llena solo lo que quieras.</p>
      <div class="campo"><span>Nombre (o parte)</span><input class="filtro-modal" id="ba-nombre" value="${esc(ant.nombre || '')}" placeholder="Pikachu"></div>
      <div class="campo"><span>Tipo</span>${sel('ba-tipo', TIPOS_API[l], ant.tipo, 'Todos los tipos').replace(/<option value="([^"]+)"( selected)?>[^<]+<\/option>/g, (m, v, s) => `<option value="${v}"${s || ''}>${esc(nombreTipo(v))}</option>`)}</div>
      <div class="campo"><span>Categoría</span>${sel('ba-cat', CATEGORIAS_API[l], ant.cat, 'Todas')}</div>
      <div class="campo"><span>Rareza</span>${sel('ba-rareza', rarezas, ant.rareza, 'Todas')}</div>
      <div class="campo"><span>Ilustrador (o parte)</span><input class="filtro-modal" id="ba-ilus" value="${esc(ant.ilus || '')}" placeholder="Mitsuhiro Arita"></div>
      <div class="campo"><span>Precio (en ${esc(MON().plural)}, ${MONEDA})</span>
        <div class="fila-input"><input type="number" inputmode="decimal" min="0" id="ba-min" placeholder="mínimo" value="${ant.min || ''}"><input type="number" inputmode="decimal" min="0" id="ba-max" placeholder="máximo" value="${ant.max || ''}"></div></div>
      <div class="botones"><button class="guardar" id="ba-buscar">🔎 Buscar</button><button id="ba-limpiar">Limpiar</button></div>
      <p class="meta" id="ba-estado"></p>
    </div>`);
  $('#ba-limpiar', cuerpo).addEventListener('click', () => { guardar('busqAv', {}); busquedaAvanzada(); });
  $('#ba-buscar', cuerpo).addEventListener('click', async (e) => {
    const f = { nombre: $('#ba-nombre').value.trim(), tipo: $('#ba-tipo').value, cat: $('#ba-cat').value, rareza: $('#ba-rareza').value, ilus: $('#ba-ilus').value.trim(), min: parseFloat($('#ba-min').value) || 0, max: parseFloat($('#ba-max').value) || 0 };
    guardar('busqAv', f);
    const q = [];
    if (f.nombre) q.push(`name=like:${encodeURIComponent(f.nombre)}`);
    if (f.tipo) q.push(`types=${encodeURIComponent(f.tipo)}`);
    if (f.cat) q.push(`category=${encodeURIComponent(f.cat)}`);
    if (f.rareza) q.push(`rarity=${encodeURIComponent(f.rareza)}`);
    if (f.ilus) q.push(`illustrator=like:${encodeURIComponent(f.ilus)}`);
    if (!q.length && !f.min && !f.max) return alert('Elige al menos un filtro.');
    e.target.disabled = true; const est = $('#ba-estado', cuerpo);
    est.innerHTML = '<span class="cargando">Buscando</span>';
    try {
      let lista = await getJSON(`${apiDe(l)}/cards?${q.join('&')}`);
      lista = (Array.isArray(lista) ? lista : []).reverse(); // las más nuevas primero
      const total = lista.length; lista = lista.slice(0, 80);
      // precios (necesarios para filtrar/ordenar por precio)
      const tasas = await getTasas(); const completas = []; let k = 0;
      for (let i = 0; i < lista.length; i += 8) {
        await Promise.all(lista.slice(i, i + 8).map(async (c) => {
          try { const full = await getJSON(`${apiDe(l)}/cards/${encodeURIComponent(c.id)}`); full._lang = l; full._precio = precioUSD(full, tasas, null, l).usd; completas.push(full); } catch { completas.push({ ...c, _lang: l, _precio: null }); }
          k++; est.textContent = `Consultando precios… ${k}/${lista.length}`;
        }));
      }
      const enLocal_ = (c) => (c._precio == null ? null : c._precio * tasas.COP);
      let res = completas.filter((c) => (!f.min || (enLocal_(c) ?? -1) >= f.min) && (!f.max || (enLocal_(c) != null && enLocal_(c) <= f.max)));
      res.sort((a, b) => (a._precio ?? 1e9) - (b._precio ?? 1e9));
      cerrarModal();
      irA('escanear');
      busquedaId++; fotoId++; langEscaneo = l;
      mostrarResultado(); $('#mini-wrap').hidden = true; $('#ayuda-toque').hidden = true;
      estado(res.length ? `🔎 ${res.length} cartas${total > 80 ? ` (de las ${total} encontradas revisé las 80 más nuevas)` : ''} · de la más barata a la más cara` : 'No hay cartas con esos filtros.', res.length ? '' : 'error');
      seguroActual = false;
      mostrarCandidatos(res, 'Búsqueda avanzada', -1);
      window.scrollTo({ top: $('#panel-resultado').offsetTop - 70, behavior: 'smooth' });
    } catch (er) { est.textContent = `Error de conexión: ${er.message}`; e.target.disabled = false; }
  });
}
$('#btn-busqueda-avanzada').addEventListener('click', busquedaAvanzada);

/* ================= 🖼️ VARIAS FOTOS DE LA GALERÍA ================= */
async function procesarVarias(fuentes) {
  if (!fuentes.length) return;
  for (let i = 0; i < fuentes.length; i++) {
    avisar(`🖼️ Procesando foto ${i + 1} de ${fuentes.length}…`);
    try { await procesarFoto(await fuentes[i]()); } catch { /* sigue con la siguiente */ }
  }
  avisar(`✅ Listo: ${fuentes.length} foto(s) procesadas. Míralas en «Escaneadas ahora».`);
}
const aDataURL = (blob) => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = mal; r.readAsDataURL(blob); });
// reemplaza el botón de galería: permite elegir varias
$('#btn-galeria').replaceWith($('#btn-galeria').cloneNode(true));
$('#btn-galeria').addEventListener('click', async () => {
  const cam = nativo && window.Capacitor.Plugins.Camera;
  if (cam && cam.pickImages) {
    try {
      const r = await cam.pickImages({ quality: 92, width: 2000, limit: 0 });
      procesarVarias((r.photos || []).map((p) => async () => aDataURL(await (await fetch(p.webPath)).blob())));
    } catch (e) { if (!/cancel/i.test(String(e && e.message))) alert(`No se pudo abrir la galería: ${e.message || e}`); }
  } else $('#input-galeria').click();
});
$('#input-galeria').replaceWith($('#input-galeria').cloneNode(true));
$('#input-galeria').addEventListener('change', (ev) => {
  const files = [...(ev.target.files || [])]; ev.target.value = '';
  procesarVarias(files.map((f) => () => aDataURL(f)));
});

/* ================= ⚖️ TCGplayer vs Cardmarket ================= */
function bloqueComparar(carta, tasas) {
  const t = carta.pricing?.tcgplayer; const cm = carta.pricing?.cardmarket;
  if (!t || !cm) return '';
  const tv = Object.values(t).find((v) => v && typeof v === 'object' && (v.marketPrice ?? v.midPrice) != null);
  const tcg = tv ? (tv.marketPrice ?? tv.midPrice) : null;
  const cmk = (cm.trend || cm.avg) ? (cm.trend || cm.avg) / tasas.EUR : null;
  if (tcg == null || cmk == null) return '';
  const barata = tcg <= cmk ? 'TCGplayer' : 'Cardmarket';
  const dif = Math.abs(tcg - cmk); const pct = dif / Math.max(tcg, cmk) * 100;
  return `<div class="comparar">
    <div class="comparar-fila"><span>TCGplayer</span><b class="${barata === 'TCGplayer' ? 'sube' : ''}">${fmtUSD(tcg)}</b></div>
    <div class="comparar-fila"><span>Cardmarket</span><b class="${barata === 'Cardmarket' ? 'sube' : ''}">${fmtUSD(cmk)}</b></div>
    <div class="meta">${pct < 5 ? '⚖️ Precio parecido en las dos tiendas' : `💡 Más barata en <b>${barata}</b> por ${fmtUSD(dif)} (−${pct.toFixed(0)}%) · ${enLocal(dif, tasas)}`}</div>
  </div>`;
}

/* ================= 💸 CALCULADORA DE VENTA REAL ================= */
// lo que te queda en la mano: bruto − comisión % − envío (un envío por venta)
function netoVenta(usdBruto) {
  const com = Math.min(50, Math.max(0, leer('comision', 0))) / 100;
  const envio = Math.max(0, leer('envioUSD', 0));
  return Math.max(0, usdBruto * (1 - com) - envio);
}
const hayCalcVenta = () => leer('comision', 0) > 0 || leer('envioUSD', 0) > 0;
function textoNeto(usdBruto, tasas) {
  if (!hayCalcVenta()) return '';
  return `te quedan ${fmtCOP(netoVenta(usdBruto) * tasas.COP)} (comisión ${leer('comision', 0)}%${leer('envioUSD', 0) ? ` + envío ${fmtCOP(leer('envioUSD', 0) * tasas.COP)}` : ''})`;
}

/* ================= 🎨 TEMA ================= */
// el tema lo elige SOLO el usuario (no sigue al celular): oscuro por defecto
function aplicarTema() {
  if (leer('tema', 'oscuro') !== 'claro' && leer('tema', 'oscuro') !== 'oscuro') guardar('tema', 'oscuro'); // quitaba "automático"
  const claro = leer('tema', 'oscuro') === 'claro';
  document.documentElement.dataset.theme = claro ? 'claro' : 'oscuro';
  const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = claro ? '#f4f5f9' : '#0f1117';
}
aplicarTema();

/* ================= 💾 COPIA AUTOMÁTICA ================= */
async function copiaAutomatica() {
  const col = leer('coleccion', []); if (!col.length) return;
  if (leer('backupAuto', true) && nativo && window.Capacitor.Plugins.Filesystem) {
    if (Date.now() - leer('backupAutoFecha', 0) < 7 * 864e5) return;
    try {
      const json = JSON.stringify({ app: 'CardCalc', version: 2, automatica: true, fecha: new Date().toISOString(), coleccion: col, deseos: leer('deseos', []), mazos: leer('mazos', []) });
      await window.Capacitor.Plugins.Filesystem.writeFile({ path: 'CardCalc-copia-automatica.json', data: json, directory: 'DOCUMENTS', encoding: 'utf8' });
      guardar('backupAutoFecha', Date.now());
    } catch { /* sin permiso: se recordará exportar */ }
  } else if (col.length >= 10 && Date.now() - leer('ultimoExport', 0) > 30 * 864e5 && Date.now() - leer('recordatorioExport', 0) > 7 * 864e5) {
    guardar('recordatorioExport', Date.now());
    setTimeout(() => avisar('💾 Hace tiempo no guardas una copia de tu colección: ⚙️ Ajustes → Exportar'), 4000);
  }
}

/* ================= 🔔 ALERTAS (notificaciones del celular) ================= */
// el trabajo en segundo plano (Android, cada ~6 h) lee estos datos del almacenamiento nativo
async function sincronizarAlertas() {
  const t = await getTasas();
  guardar('alertas', { on: !!leer('notifOn', false), mov: leer('movPct', 0), eur: t.EUR || 0.92, lang: LANG_UI });
}
async function pedirPermisoNotif() {
  const LN = nativo && window.Capacitor.Plugins.LocalNotifications;
  if (!LN) return true;
  try { const p = await LN.requestPermissions(); return p.display === 'granted'; } catch { return false; }
}
// aviso inmediato (cuando la app está abierta y detecta algo)
async function notificar(titulo, cuerpo) {
  const LN = nativo && window.Capacitor.Plugins.LocalNotifications;
  if (!leer('notifOn', false)) return;
  if (LN) { try { await LN.schedule({ notifications: [{ id: Math.floor(Math.random() * 1e9), title: tr(titulo), body: tr(cuerpo) }] }); } catch { /* sin permiso */ } }
}

/* ================= 📱 WIDGET (valor de la colección) ================= */
async function actualizarWidget() {
  const col = leer('coleccion', []); const t = await getTasas();
  const total = col.reduce((s, c) => s + valorUSD(c), 0);
  guardar('widget', { total: fmtUSD(total), local: MONEDA === 'USD' ? '' : fmtCOP(total * t.COP), n: tr(`${col.length} cartas`), fecha: new Date().toLocaleString(LOCALE(), { dateStyle: 'short', timeStyle: 'short' }) });
}

let _tWidget = null;
function programarWidget() { clearTimeout(_tWidget); _tWidget = setTimeout(() => actualizarWidget().catch(() => {}), 1500); }

/* ================= arranque ================= */
setTimeout(() => { copiaAutomatica(); sincronizarAlertas(); actualizarWidget(); }, 2500);
