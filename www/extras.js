/* CardCalc — funciones extra: intercambio, deseos, progreso por set y compartir.
   Usa las funciones globales de app.js (leer, guardar, getJSON, precioUSD, buscarCartas, abrirCarta…). */
'use strict';

/* ================= utilidades ================= */
// carta (de TCGdex) → registro compacto para listas
function cartaCompacta(carta, p) {
  return {
    key: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    id: carta.id, name: carta.name, set: carta.set ? carta.set.name : '', localId: carta.localId,
    image: carta.image, idioma: carta._lang || 'es', usd: p ? p.usd : null, variante: p ? p.variante : null,
  };
}
async function cartaCompleta(c, lang) {
  const l = lang || c._lang || c.idioma || idioma;
  const carta = c.pricing !== undefined && c.set?.cardCount ? c : await getJSON(`${apiDe(l)}/cards/${encodeURIComponent(c.id)}`);
  carta._lang = l;
  return carta;
}
function abrirModal(html) {
  $('#modal').hidden = false; document.body.style.overflow = 'hidden';
  $('#modal-cuerpo').innerHTML = html;
  $('.modal-caja').scrollTop = 0;
  return $('#modal-cuerpo');
}

/* Buscador en ventana: devuelve la carta elegida (completa, con precio) o null. */
function elegirCarta(titulo) {
  return new Promise((resolver) => {
    const cuerpo = abrirModal(`
      <div class="carta">
        <h2>${esc(titulo)}</h2>
        <p class="meta">Idioma: ${bandera(idioma)} ${esc(IDIOMAS[idioma].nombre)} (cámbialo en Escanear)</p>
        <form class="buscar" id="buscador-form">
          <input id="buscador-txt" type="search" placeholder="43 94 · PFL 43 · Charizard" autocomplete="off" enterkeyhint="search">
          <button class="btn secundario" type="submit">Buscar</button>
        </form>
        <div id="buscador-estado" class="meta"></div>
        <div id="buscador-res" class="rejilla rejilla-chica"></div>
      </div>`);
    let hecho = false;
    const terminar = (v) => { if (hecho) return; hecho = true; obs.disconnect(); resolver(v); };
    // si el usuario cierra la ventana, se resuelve con null
    const obs = new MutationObserver(() => { if ($('#modal').hidden) terminar(null); });
    obs.observe($('#modal'), { attributes: true, attributeFilter: ['hidden'] });
    const txt = $('#buscador-txt', cuerpo); setTimeout(() => txt.focus(), 50);
    $('#buscador-form', cuerpo).addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = txt.value.trim(); if (!q) return;
      $('#buscador-estado', cuerpo).innerHTML = '<span class="cargando">Buscando</span>';
      try {
        const cartas = (await buscarCartas(q)).slice(0, 60);
        $('#buscador-estado', cuerpo).textContent = cartas.length ? `${cartas.length} resultado${cartas.length === 1 ? '' : 's'}: toca la carta` : 'Sin resultados';
        $('#buscador-res', cuerpo).innerHTML = cartas.map((c, i) => `
          <button class="cand" data-i="${i}"><img loading="lazy" src="${esc(imgCarta(c))}" alt="">
            <div class="n">${esc(c.name)}</div><div class="s">${esc(nombreSet(c) || c.id)} · ${esc(c.localId)}</div></button>`).join('');
        $$('#buscador-res .cand', cuerpo).forEach((b) => b.addEventListener('click', async () => {
          $('#buscador-estado', cuerpo).innerHTML = '<span class="cargando">Consultando precio</span>';
          try { const carta = await cartaCompleta(cartas[+b.dataset.i], idioma); terminar(carta); cerrarModal(); } catch (er) { $('#buscador-estado', cuerpo).textContent = `Error: ${er.message}`; }
        }));
      } catch (er) { $('#buscador-estado', cuerpo).textContent = `Error de conexión: ${er.message}`; }
    });
  });
}

/* ================= INTERCAMBIO ================= */
const leerCambio = () => { const c = leer('cambio', null); return c && c.doy && c.recibo ? c : { doy: [], recibo: [] }; };

async function agregarAlCambio(lado, carta, uidCol = null) {
  const tasas = await getTasas();
  const p = precioUSD(carta, tasas, null, carta._lang);
  const c = leerCambio();
  if (uidCol && c.doy.some((x) => x.uidCol === uidCol)) return false; // esa copia ya está
  c[lado].push({ ...cartaCompacta(carta, p), uidCol });
  guardar('cambio', c);
  return true;
}

async function pintarIntercambio() {
  const c = leerCambio(); const tasas = await getTasas();
  const suma = (l) => l.reduce((s, x) => s + (x.usd || 0), 0);
  const doy = suma(c.doy), recibo = suma(c.recibo), dif = recibo - doy, mayor = Math.max(doy, recibo);
  const pct = mayor ? Math.abs(dif) / mayor * 100 : 0;
  let veredicto = '<span class="meta">Agrega cartas a cada lado para comparar</span>', clase = '';
  if (c.doy.length && c.recibo.length) {
    if (pct < 10) { veredicto = '⚖️ <b>Cambio justo</b>'; clase = 'justo'; }
    else if (dif > 0) { veredicto = `👍 <b>Ganas ${fmtUSD(dif)}</b> (${fmtCOP(dif * tasas.COP)})`; clase = 'ganas'; }
    else { veredicto = `⚠️ <b>Pierdes ${fmtUSD(-dif)}</b> (${fmtCOP(-dif * tasas.COP)})`; clase = 'pierdes'; }
  }
  const izq = doy + recibo ? doy / (doy + recibo) * 100 : 50;
  $('#cambio-resumen').innerHTML = `
    <div class="meta">Calculadora de intercambio</div>
    <div class="veredicto ${clase}">${veredicto}</div>
    <div class="balanza"><div class="b-doy" style="width:${izq}%"></div><div class="b-recibo" style="width:${100 - izq}%"></div></div>
    <div class="fila"><span>📤 ${fmtUSD(doy)}<br><span class="meta">${fmtCOP(doy * tasas.COP)}</span></span>
      <span style="text-align:right">📥 ${fmtUSD(recibo)}<br><span class="meta">${fmtCOP(recibo * tasas.COP)}</span></span></div>`;
  for (const lado of ['doy', 'recibo']) {
    $(`#total-${lado}`).textContent = `${c[lado].length} · ${fmtUSD(suma(c[lado]))}`;
    $(`#lista-${lado}`).innerHTML = c[lado].length ? c[lado].map((x) => `
      <li><img src="${esc(imgCarta(x))}" alt="">
        <div class="info"><b>${bandera(x.idioma)} ${esc(x.name)}</b><span class="meta">${esc(nombreSet(x))} · ${esc(x.localId)}${x.uidCol ? ' · de tu colección' : ''}</span></div>
        <div class="valor"><b>${fmtUSD(x.usd)}</b><br><span class="meta">${x.usd != null ? fmtCOP(x.usd * tasas.COP) : ''}</span></div>
        <button class="quitar" data-lado="${lado}" data-key="${esc(x.key)}" aria-label="Quitar">✕</button></li>`).join('')
      : '<li class="vacio-lado">Sin cartas</li>';
  }
  $$('#vista-intercambio .quitar').forEach((b) => b.addEventListener('click', () => {
    const c2 = leerCambio(); c2[b.dataset.lado] = c2[b.dataset.lado].filter((x) => x.key !== b.dataset.key);
    guardar('cambio', c2); pintarIntercambio();
  }));
  $('#btn-confirmar-cambio').disabled = !(c.doy.length || c.recibo.length);
}

async function elegirDeColeccion() {
  const col = leer('coleccion', []); const tasas = await getTasas();
  const usados = new Set(leerCambio().doy.map((x) => x.uidCol));
  const disponibles = col.filter((c) => !usados.has(c.uid)).sort((a, b) => (b.usd ?? -1) - (a.usd ?? -1));
  const cuerpo = abrirModal(`<div class="carta"><h2>¿Qué carta das?</h2>
    ${disponibles.length ? `<input id="filtro-col" type="search" placeholder="Filtrar por nombre" autocomplete="off" class="filtro-modal">
    <div class="rejilla rejilla-chica" id="pick-col">${disponibles.map((c) => `
      <button class="cand" data-uid="${esc(c.uid)}" data-n="${esc(sinTildes(c.name))}"><img loading="lazy" src="${esc(imgCarta(c))}" alt="">
        <div class="n">${bandera(c.idioma)} ${esc(c.name)}</div><div class="s">${fmtUSD(c.usd)} · ${c.usd != null ? fmtCOP(c.usd * tasas.COP) : ''}</div></button>`).join('')}</div>`
    : '<p class="meta">No tienes cartas disponibles en tu colección.</p>'}</div>`);
  const f = $('#filtro-col', cuerpo);
  if (f) f.addEventListener('input', () => { const q = sinTildes(f.value); $$('#pick-col .cand', cuerpo).forEach((b) => { b.hidden = q && !b.dataset.n.includes(q); }); });
  $$('#pick-col .cand', cuerpo).forEach((b) => b.addEventListener('click', async () => {
    const it = col.find((c) => c.uid === b.dataset.uid);
    const c = leerCambio();
    c.doy.push({ key: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), id: it.id, name: it.name, set: it.set, localId: it.localId, image: it.image, idioma: it.idioma || 'es', usd: it.usd, variante: it.variante, uidCol: it.uid });
    guardar('cambio', c); cerrarModal(); irA('intercambio');
  }));
}

async function confirmarCambio() {
  const c = leerCambio(); if (!c.doy.length && !c.recibo.length) return;
  const sinDueno = c.doy.filter((x) => !x.uidCol).length;
  if (!confirm(`¿Hacer el cambio?\n\n• Salen de tu colección: ${c.doy.length - sinDueno} carta(s)${sinDueno ? ` (+${sinDueno} que no estaban guardadas)` : ''}\n• Entran a tu colección: ${c.recibo.length} carta(s)`)) return;
  const quitar = new Set(c.doy.map((x) => x.uidCol).filter(Boolean));
  let col = leer('coleccion', []).filter((x) => !quitar.has(x.uid));
  const ahora = Date.now();
  for (const x of c.recibo) {
    col.unshift({ uid: ahora.toString(36) + Math.random().toString(36).slice(2, 6), id: x.id, name: x.name, set: x.set, localId: x.localId, num: x.localId, image: x.image, idioma: x.idioma, variante: x.variante, usd: x.usd, usdInicial: x.usd, fecha: ahora, historial: x.usd != null ? [{ t: ahora, usd: x.usd }] : [], rarity: '', types: [] });
  }
  guardar('coleccion', col);
  guardar('cambio', { doy: [], recibo: [] });
  // completa rareza/tipo/número de lo recibido en segundo plano
  actualizarPrecios().catch(() => {});
  alert('¡Cambio hecho! Tu colección quedó actualizada.');
  pintarIntercambio();
}

async function compartirCambio() {
  const c = leerCambio(); const tasas = await getTasas();
  const linea = (x) => `• ${x.name} (${nombreSet(x)} ${x.localId}) ${bandera(x.idioma)} — ${fmtUSD(x.usd)} / ${fmtCOP((x.usd || 0) * tasas.COP)}`;
  const s = (l) => l.reduce((a, x) => a + (x.usd || 0), 0);
  const texto = `⇄ Intercambio (CardCalc)\n\n📤 Doy (${fmtUSD(s(c.doy))}):\n${c.doy.map(linea).join('\n') || '—'}\n\n📥 Recibo (${fmtUSD(s(c.recibo))}):\n${c.recibo.map(linea).join('\n') || '—'}\n\nDiferencia: ${fmtUSD(s(c.recibo) - s(c.doy))}`;
  compartirTexto('Intercambio', texto);
}

/* ================= DESEOS ================= */
async function agregarDeseo(carta) {
  const tasas = await getTasas();
  const p = precioUSD(carta, tasas, null, carta._lang);
  const m = MON(); const paso = m.dec ? 1 : 100;
  const sugerido = p.usd != null ? Math.round(p.usd * tasas.COP * 0.9 / paso) * paso : '';
  const r = prompt(`♡ ${carta.name}\nPrecio actual: ${p.usd != null ? fmtCOP(p.usd * tasas.COP) : 'sin precio'}\n\n¿Hasta cuánto pagarías (en ${m.plural}, ${MONEDA})? Te aviso cuando llegue a ese precio.`, sugerido);
  if (r === null) return false;
  const cop = parseFloat(String(r).replace(/[^\d.]/g, ''));
  const deseos = leer('deseos', []);
  deseos.unshift({ ...cartaCompacta(carta, p), objetivoUSD: cop > 0 ? cop / tasas.COP : null, fecha: Date.now() });
  guardar('deseos', deseos);
  marcarDeseosAlcanzados(tasas);
  return true;
}

const alcanzado = (d) => d.objetivoUSD && d.usd != null && d.usd <= d.objetivoUSD;
function marcarDeseosAlcanzados(tasas) {
  const n = leer('deseos', []).filter((d) => alcanzado(d, tasas)).length;
  $('#punto-deseos').hidden = !n;
  return n;
}

async function pintarDeseos() {
  const deseos = leer('deseos', []); const tasas = await getTasas();
  const listos = marcarDeseosAlcanzados(tasas);
  const total = deseos.reduce((s, d) => s + (d.usd || 0), 0);
  $('#deseos-resumen').innerHTML = `
    <div class="meta">${deseos.length} carta${deseos.length === 1 ? '' : 's'} que quieres · costarían ${fmtUSD(total)} (${fmtCOP(total * tasas.COP)})</div>
    ${listos ? `<div class="veredicto ganas">🎯 <b>${listos} ya ${listos === 1 ? 'está' : 'están'} a tu precio</b></div>` : '<div class="meta" style="margin-top:6px">Te aviso aquí (y con un punto en la pestaña) cuando alguna baje a tu precio. Los precios se revisan al abrir la app.</div>'}`;
  const orden = [...deseos].sort((a, b) => Number(alcanzado(b, tasas)) - Number(alcanzado(a, tasas)));
  $('#lista-deseos').innerHTML = orden.length ? orden.map((d) => {
    const ok = alcanzado(d, tasas); const actualCOP = d.usd != null ? d.usd * tasas.COP : null;
    return `<li class="${ok ? 'listo' : ''}" data-key="${esc(d.key)}">
      <img src="${esc(imgCarta(d))}" alt="" data-ver>
      <div class="info" data-ver><b>${bandera(d.idioma)} ${esc(d.name)}</b><span class="meta">${esc(nombreSet(d))} · ${esc(d.localId)}</span>
        <span class="meta">Hoy: <b>${actualCOP != null ? fmtCOP(actualCOP) : '—'}</b> · Tu precio: ${d.objetivoUSD ? fmtCOP(d.objetivoUSD * tasas.COP) : 'sin definir'}</span>
        ${ok ? '<span class="chip-ok">🎯 ¡Ya está a tu precio!</span>' : d.objetivoUSD && actualCOP != null ? `<span class="meta">Falta que baje ${fmtCOP(actualCOP - d.objetivoUSD * tasas.COP)}</span>` : ''}
      </div>
      <div class="acciones-deseo">
        <button data-acc="precio" aria-label="Cambiar mi precio">✏️</button>
        <button data-acc="tengo" aria-label="Ya la tengo">✓</button>
        <button data-acc="quitar" aria-label="Quitar">✕</button>
      </div></li>`;
  }).join('') : '<li class="vacio">Aún no tienes deseos.<br>Toca <b>＋ Agregar carta que quiero</b> o usa <b>♡</b> en cualquier carta.</li>';

  $$('#lista-deseos li[data-key]').forEach((li) => {
    const key = li.dataset.key;
    const d = () => leer('deseos', []).find((x) => x.key === key);
    $$('[data-ver]', li).forEach((x) => x.addEventListener('click', () => { const dd = d(); abrirModal(''); abrirCarta({ id: dd.id, _lang: dd.idioma }, $('#modal-cuerpo')); }));
    $('[data-acc="precio"]', li).addEventListener('click', async () => {
      const dd = d(); const t = await getTasas(); const r = prompt(`¿Hasta cuánto pagarías por ${dd.name}? (en ${MON().plural}, ${MONEDA})`, dd.objetivoUSD ? Math.round(dd.objetivoUSD * t.COP * (MON().dec ? 100 : 1)) / (MON().dec ? 100 : 1) : '');
      if (r === null) return;
      const cop = parseFloat(String(r).replace(/[^\d.]/g, ''));
      guardar('deseos', leer('deseos', []).map((x) => (x.key === key ? { ...x, objetivoUSD: cop > 0 ? cop / t.COP : null } : x))); pintarDeseos();
    });
    $('[data-acc="tengo"]', li).addEventListener('click', async () => {
      const dd = d(); if (!confirm(`¿Ya conseguiste ${dd.name}? Pasa a tu colección.`)) return;
      try { const carta = await cartaCompleta({ id: dd.id }, dd.idioma); agregarColeccion(carta, precioUSD(carta, await getTasas(), dd.variante, dd.idioma)); } catch { alert('Sin conexión: inténtalo de nuevo.'); return; }
      guardar('deseos', leer('deseos', []).filter((x) => x.key !== key)); pintarDeseos();
    });
    $('[data-acc="quitar"]', li).addEventListener('click', () => {
      if (!confirm('¿Quitar de tus deseos?')) return;
      guardar('deseos', leer('deseos', []).filter((x) => x.key !== key)); pintarDeseos();
    });
  });
}

async function actualizarDeseos() {
  const deseos = leer('deseos', []); if (!deseos.length) return;
  const tasas = await getTasas();
  const nuevos = new Map();
  await Promise.all(deseos.map(async (d) => {
    try { const carta = await cartaCompleta({ id: d.id }, d.idioma); nuevos.set(d.key, precioUSD(carta, tasas, d.variante, d.idioma).usd); } catch { /* se deja el anterior */ }
  }));
  const antes = marcarDeseosAlcanzados(tasas);
  guardar('deseos', leer('deseos', []).map((d) => (nuevos.has(d.key) && nuevos.get(d.key) != null ? { ...d, usd: nuevos.get(d.key) } : d)));
  const despues = marcarDeseosAlcanzados(tasas);
  if (despues > antes) notificar('🎯 CardCalc', `🎯 ${despues} carta${despues === 1 ? '' : 's'} de tus deseos ya ${despues === 1 ? 'está' : 'están'} a tu precio`);
  if (despues > antes) avisar(`🎯 ${despues} carta${despues === 1 ? '' : 's'} de tus deseos ya ${despues === 1 ? 'está' : 'están'} a tu precio`);
  if ($('#vista-deseos').classList.contains('activa')) pintarDeseos();
}

function avisar(msg) {
  let t = $('#aviso'); if (!t) { t = document.createElement('div'); t.id = 'aviso'; t.className = 'aviso'; document.body.appendChild(t); }
  t.innerHTML = msg; t.classList.add('ver');
  t.onclick = () => irA('deseos');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('ver'), 6000);
}

/* ================= PROGRESO POR SET ================= */
async function pintarSets() {
  const col = leer('coleccion', []); const tasas = await getTasas();
  const grupos = new Map();
  for (const c of col) {
    const setId = c.setId || (c.id ? c.id.slice(0, c.id.lastIndexOf('-')) : '');
    const k = `${setId}|${c.idioma || 'es'}`;
    if (!grupos.has(k)) grupos.set(k, { setId, idioma: c.idioma || 'es', nombre: c.set, nums: new Set(), valor: 0, n: 0 });
    const g = grupos.get(k); g.nums.add(String(parseInt(c.localId, 10) || c.localId)); g.valor += c.usd || 0; g.n++;
  }
  const lista = [...grupos.values()];
  // nombres y logos en inglés: tabla incluida en la app (sets-en.json) + lista en línea si hay conexión
  const SE = await setsEnP;
  const enLinea = await getSets('en').catch(() => []);
  const setsEn = enLinea.length ? enLinea : Object.entries(SE).map(([id, v]) => ({ id, name: v.n }));
  for (const l of [...new Set(lista.map((g) => g.idioma))]) {
    const sets = await getSets(l).catch(() => []);
    for (const g of lista.filter((x) => x.idioma === l)) {
      const s = sets.find((x) => x.id === g.setId);
      g.oficial = s?.cardCount?.official || s?.cardCount?.total || 0;
      // SOLO logos en inglés. Japonés: se busca el set inglés equivalente por la parte latina del nombre ("ポケモンカード151" → "151")
      let en = l !== 'ja' ? setsEn.find((x) => x.id === g.setId) : null;
      if (l === 'ja' && s?.name) {
        const latino = (s.name.match(/[A-Za-z0-9&' ]{3,}/g) || []).map((t) => t.trim().toLowerCase()).filter(Boolean);
        const iguales = setsEn.filter((x) => latino.includes(x.name.toLowerCase()));
        if (iguales.length === 1) en = iguales[0];
      }
      const idEn = en ? en.id : g.setId;
      g.logo = (SE[idEn] && SE[idEn].l) || (en?.logo ? `${en.logo}.webp` : null); // URL completa, solo en inglés
      if (l !== 'ja' && NOMBRES_EN[g.setId]) g.nombre = NOMBRES_EN[g.setId]; g.nombre = nombreSet({ setId: g.setId, set: s?.name || g.nombre, idioma: g.idioma });
      g.tengo = [...g.nums].filter((n) => /^\d+$/.test(n) && +n <= g.oficial).length;
      g.pct = g.oficial ? g.tengo / g.oficial * 100 : 0;
    }
  }
  lista.sort((a, b) => b.pct - a.pct);
  const cont = $('#lista-coleccion');
  cont.className = 'lista-sets';
  cont.innerHTML = lista.length ? lista.map((g, i) => `
    <button class="set-item" data-i="${i}">
      <div class="set-cab">
        ${g.logo ? `<img src="${esc(g.logo)}" alt="" onerror="this.remove()">` : ''}
        <div><b>${esc(g.nombre)}</b><br><span class="meta">${g.n} carta${g.n === 1 ? '' : 's'} · ${fmtUSD(g.valor)} (${fmtCOP(g.valor * tasas.COP)})</span></div>
        <span class="set-pct">${g.oficial ? `${Math.floor(g.pct)}%` : ''}</span>
      </div>
      <div class="progreso"><div style="width:${Math.min(100, g.pct)}%"></div></div>
      <div class="meta">${g.oficial ? `${g.tengo} de ${g.oficial} cartas del set` : 'Total del set desconocido'}</div>
    </button>`).join('') : '<div class="vacio">Aún no tienes cartas.</div>';
  $$('.set-item', cont).forEach((b) => b.addEventListener('click', () => abrirSet(lista[+b.dataset.i])));
}

async function abrirSet(g, soloFaltan = false) {
  const cuerpo = abrirModal('<div class="carta"><span class="cargando">Cargando el set</span></div>');
  try {
    const set = await getJSON(`${apiDe(g.idioma)}/sets/${encodeURIComponent(g.setId)}`);
    const col = leer('coleccion', []).filter((c) => (c.idioma || 'es') === g.idioma);
    const tengo = new Set(col.filter((c) => c.id.startsWith(g.setId + '-')).map((c) => c.id));
    const cartas = (set.cards || []).filter((c) => !soloFaltan || !tengo.has(c.id));
    cuerpo.innerHTML = `
      <div class="carta">
        ${g.logo ? `<img class="logo-set" src="${esc(g.logo)}" alt="" onerror="this.remove()">` : ''}
        <h2>${esc(nombreSet({ setId: g.setId, set: set.name, idioma: g.idioma }))}</h2>
        <div class="progreso"><div style="width:${Math.min(100, g.pct)}%"></div></div>
        <p class="meta">Tienes ${g.tengo} de ${g.oficial} (${Math.floor(g.pct)}%) · ${(set.cards || []).length - [...tengo].length} te faltan en total (incluye secretas)</p>
        <div class="segmento"><button data-f="todas" class="${soloFaltan ? '' : 'sel'}">Todas</button><button data-f="faltan" class="${soloFaltan ? 'sel' : ''}">Solo me faltan</button></div>
        <div class="rejilla rejilla-chica album">${cartas.map((c) => `
          <button class="cand ${tengo.has(c.id) ? 'tengo' : 'falta'}" data-id="${esc(c.id)}">
            <img loading="lazy" src="${esc(imgCarta(c))}" alt="">
            <div class="n">${esc(c.localId)} · ${esc(c.name)}</div></button>`).join('')}</div>
      </div>`;
    $$('.segmento button', cuerpo).forEach((b) => b.addEventListener('click', () => abrirSet(g, b.dataset.f === 'faltan')));
    $$('.album .cand', cuerpo).forEach((b) => b.addEventListener('click', () => {
      cuerpo.innerHTML = '<button class="btn secundario chico" id="volver-set">← Volver al set</button><div id="det-set"></div>';
      $('#volver-set', cuerpo).addEventListener('click', () => abrirSet(g, soloFaltan));
      abrirCarta({ id: b.dataset.id, _lang: g.idioma }, $('#det-set', cuerpo));
    }));
  } catch (e) {
    cuerpo.innerHTML = `<div class="carta estado error">No se pudo cargar el set (${esc(e.message)}).</div>`;
  }
}

/* ================= COMPARTIR ================= */
async function compartirTexto(titulo, texto) {
  titulo = tr(titulo); texto = trMulti(texto); // en el idioma de la app
  const Share = nativo && window.Capacitor.Plugins.Share;
  try {
    if (Share) return await Share.share({ title: titulo, text: texto, dialogTitle: 'Compartir' });
    if (navigator.share) return await navigator.share({ title: titulo, text: texto });
  } catch (e) { if (/cancel|abort/i.test(String(e && (e.message || e.name)))) return; }
  try { await navigator.clipboard.writeText(texto); alert('Copiado: pégalo en WhatsApp.'); } catch { prompt('Copia este texto:', texto); }
}

async function compartirRepetidas() {
  const col = leer('coleccion', []); const tasas = await getTasas();
  const g = new Map();
  for (const c of col) { const k = claveCopia(c); g.set(k, { c, n: (g.get(k)?.n || 0) + 1 }); }
  const rep = [...g.values()].filter((x) => x.n > 1).sort((a, b) => (b.c.usd || 0) - (a.c.usd || 0));
  if (!rep.length) return alert('No tienes cartas repetidas.');
  const texto = `🔁 Mis cartas repetidas para cambiar (CardCalc)\n\n${rep.map(({ c, n }) => `• ${c.name} ${bandera(c.idioma)} (${nombreSet(c)} ${c.num || c.localId}) ×${n - 1} — ${fmtUSD(c.usd)} / ${fmtCOP((c.usd || 0) * tasas.COP)} c/u`).join('\n')}\n\n¿Te interesa alguna? 😄`;
  compartirTexto('Mis repetidas', texto);
}

function cargarImgCors(src) {
  return new Promise((ok) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; setTimeout(() => ok(null), 8000); });
}
/* Imagen de carta para dibujar en el canvas. El servidor de imágenes manda la cabecera CORS duplicada ("*,*"),
   que el navegador rechaza; en el celular se descarga con el HTTP nativo de Capacitor (sin CORS). */
async function imgParaCanvas(url) {
  const H = nativo && window.Capacitor.Plugins.CapacitorHttp;
  if (H) {
    try {
      const r = await H.get({ url, responseType: 'blob' });
      if (r && r.data) return await cargarImgCors(`data:image/webp;base64,${r.data}`);
    } catch { /* se intenta normal */ }
  }
  return cargarImgCors(url);
}
function rectRedondo(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

async function imagenColeccion() {
  const col = leer('coleccion', []); const tasas = await getTasas();
  const g0 = new Map(); for (const c of col) { const k = claveCopia(c); g0.set(k, { c, n: (g0.get(k)?.n || 0) + 1 }); }
  const top = [...g0.values()].sort((a, b) => valorUSD(b.c) - valorUSD(a.c)).slice(0, 6); // precio unitario
  const total = col.reduce((s, c) => s + valorUSD(c), 0);
  const W = 1080, H = top.length > 3 ? 1560 : 1060; const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const fondo = g.createLinearGradient(0, 0, W, H); fondo.addColorStop(0, '#1d1f4a'); fondo.addColorStop(0.6, '#2a1650'); fondo.addColorStop(1, '#0f1117');
  g.fillStyle = fondo; g.fillRect(0, 0, W, H);
  const logo = await cargarImgCors('logo.svg'); if (logo) g.drawImage(logo, 64, 56, 96, 96);
  g.fillStyle = '#fff'; g.font = '900 54px system-ui, sans-serif'; g.fillText('Card', 180, 122); const wc = g.measureText('Card').width;
  g.fillStyle = '#ffcb05'; g.fillText('Calc', 180 + wc, 122);
  g.fillStyle = '#c9cde0'; g.font = '600 34px system-ui, sans-serif'; g.fillText(tr('Mi colección Pokémon TCG'), 64, 220);
  g.fillStyle = '#3ecf8e'; g.font = '900 104px system-ui, sans-serif'; g.fillText(fmtUSD(total), 64, 330);
  g.fillStyle = '#fff'; g.font = '800 46px system-ui, sans-serif'; g.fillText(fmtCOP(total * tasas.COP), 64, 395);
  g.fillStyle = '#8f97aa'; g.font = '500 30px system-ui, sans-serif'; g.fillText(tr(`${col.length} cartas · ${g0.size} distintas`) + ` · ${new Date().toLocaleDateString(LOCALE())}`, 64, 448);
  // 3 columnas que caben en 1080 px: 64 + 3×288 + 2×24 + 64 = 1040
  const cw = 288, ch = 402, gx = 24, y0 = 490;
  const imgs = await Promise.all(top.map(({ c }) => (c.image ? imgParaCanvas(`${c.image}/low.webp`) : null)));
  top.forEach(({ c, n }, i) => {
    const x = 64 + (i % 3) * (cw + gx), y = y0 + Math.floor(i / 3) * (ch + 110);
    g.save(); rectRedondo(g, x, y, cw, ch, 18); g.clip();
    if (imgs[i]) g.drawImage(imgs[i], x, y, cw, ch);
    else { // sin foto: tarjeta con el nombre, para que igual se vea bien
      const gr = g.createLinearGradient(x, y, x + cw, y + ch); gr.addColorStop(0, '#4b2a8c'); gr.addColorStop(1, '#2b2f77');
      g.fillStyle = gr; g.fillRect(x, y, cw, ch);
      g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 120px system-ui'; g.textAlign = 'center'; g.fillText('🃏', x + cw / 2, y + ch / 2 + 30); g.textAlign = 'left';
    }
    g.restore();
    if (n > 1) { g.fillStyle = '#ffcb05'; rectRedondo(g, x + cw - 86, y + 12, 74, 44, 22); g.fill(); g.fillStyle = '#17130a'; g.font = '900 28px system-ui'; g.fillText(`×${n}`, x + cw - 70, y + 44); }
    g.fillStyle = '#fff'; g.font = '800 30px system-ui, sans-serif';
    let nom = c.name; while (g.measureText(nom).width > cw && nom.length > 3) nom = nom.slice(0, -2) + '…';
    g.fillText(nom, x, y + ch + 42);
    g.fillStyle = '#3ecf8e'; g.font = '800 28px system-ui, sans-serif'; g.fillText(fmtUSD(valorUSD(c)), x, y + ch + 80);
  });
  g.fillStyle = '#8f97aa'; g.font = '500 24px system-ui, sans-serif'; g.fillText(tr('Hecho con CardCalc · precios de TCGplayer y Cardmarket'), 64, H - 40);
  return cv;
}

async function compartirColeccion() {
  if (!leer('coleccion', []).length) return alert('Tu colección está vacía.');
  const btn = $('#btn-compartir-col'); const t0 = btn.textContent; btn.textContent = 'Creando imagen…'; btn.disabled = true;
  try {
    const cv = await imagenColeccion();
    let url;
    try { url = cv.toDataURL('image/png'); } catch { // imágenes sin CORS: se repite sin fotos
      alert('No se pudieron incluir las fotos de las cartas; se comparte sin ellas.'); return;
    }
    const b64 = url.split(',')[1]; const nombre = `cardcalc-coleccion-${Date.now()}.png`;
    const FS = nativo && window.Capacitor.Plugins.Filesystem, Share = nativo && window.Capacitor.Plugins.Share;
    if (FS && Share) {
      const r = await FS.writeFile({ path: nombre, data: b64, directory: 'CACHE' });
      await Share.share({ title: 'Mi colección', text: 'Mi colección de cartas (CardCalc)', files: [r.uri], dialogTitle: 'Compartir colección' }).catch(() => {});
      return;
    }
    const blob = await (await fetch(url)).blob();
    const file = new File([blob], nombre, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Mi colección' }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  } finally { btn.textContent = t0; btn.disabled = false; }
}

/* ================= conexiones ================= */
$$('[data-agregar]').forEach((b) => b.addEventListener('click', async () => {
  const lado = b.dataset.agregar;
  const carta = await elegirCarta(lado === 'doy' ? '📤 ¿Qué carta das?' : '📥 ¿Qué carta recibes?');
  if (carta) { await agregarAlCambio(lado, carta); irA('intercambio'); }
}));
$('[data-de-coleccion]').addEventListener('click', elegirDeColeccion);
$('#btn-confirmar-cambio').addEventListener('click', confirmarCambio);
$('#btn-compartir-cambio').addEventListener('click', compartirCambio);
$('#btn-limpiar-cambio').addEventListener('click', () => { if (confirm('¿Vaciar el intercambio?')) { guardar('cambio', { doy: [], recibo: [] }); pintarIntercambio(); } });
$('#btn-agregar-deseo').addEventListener('click', async () => {
  const carta = await elegirCarta('♡ ¿Qué carta quieres?');
  if (carta && await agregarDeseo(carta)) pintarDeseos();
});
$('#btn-actualizar-deseos').addEventListener('click', async (e) => { e.target.disabled = true; await actualizarDeseos(); e.target.disabled = false; pintarDeseos(); });
$('#btn-compartir-col').addEventListener('click', compartirColeccion);
$('#btn-compartir-rep').addEventListener('click', compartirRepetidas);
$$('#col-modo button').forEach((b) => b.addEventListener('click', () => {
  modoColeccion = b.dataset.modo;
  $$('#col-modo button').forEach((x) => x.classList.toggle('sel', x === b));
  pintarColeccion();
}));
getTasas().then(marcarDeseosAlcanzados);
