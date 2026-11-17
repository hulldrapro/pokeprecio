/* CardCalc — 🃏 Mazos: armar mazos, ver cuáles cartas tienes/te faltan, costo para completarlos y legalidad
   (Estándar / Expandido). Importa y exporta listas en el formato de Pokémon TCG Live ("4 Pikachu ex SVI 57"). */
'use strict';

const leerMazos = () => leer('mazos', []);
const guardarMazos = (m) => guardar('mazos', m);
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esEnergiaBasica = (c) => /energ/i.test(c.category || '') && /^(basic|b[aá]sica)|energ[ií]a (planta|fuego|agua|rayo|el[eé]ctrica|ps[ií]quica|lucha|oscura|siniestra|met[aá]lica)\b|^(grass|fire|water|lightning|psychic|fighting|darkness|metal) energy$/i.test(c.name || '');

function cartaDeMazo(carta, p, n = 1) {
  return {
    key: nuevoId(), id: carta.id, name: carta.name, image: carta.image, lang: carta._lang || 'es',
    setId: carta.set?.id || carta.id.slice(0, carta.id.lastIndexOf('-')), localId: carta.localId, n,
    usd: p ? p.usd : null, legal: carta.legal || null, category: carta.category || '', regulationMark: carta.regulationMark || '',
  };
}

/* cuántas copias tienes de una carta del mazo: misma carta (id, sirve en cualquier idioma) o mismo nombre */
function cuantasTengo(cm, col) {
  const nom = sinTildes(cm.name);
  const en = typeof NOMBRES_EN_CARTA !== 'undefined' ? NOMBRES_EN_CARTA : {};
  // misma carta, mismo nombre, o mismo nombre en inglés (tu "Investigación de Profesores" = "Professor's Research")
  return col.filter((c) => c.id === cm.id || sinTildes(c.name) === nom || (en[c.id] && sinTildes(en[c.id]) === nom)).length;
}

function analizarMazo(m, col) {
  let total = 0, tengo = 0, costo = 0, sinPrecio = 0; const problemas = [];
  const porNombre = new Map();
  for (const c of m.cartas) {
    total += c.n;
    const t = Math.min(c.n, cuantasTengo(c, col)); tengo += t;
    const faltan = c.n - t;
    if (faltan > 0) { if (c.usd != null) costo += faltan * c.usd; else sinPrecio += faltan; }
    if (!esEnergiaBasica(c)) porNombre.set(sinTildes(c.name), (porNombre.get(sinTildes(c.name)) || 0) + c.n);
  }
  for (const [n, k] of porNombre) if (k > 4) problemas.push(`Más de 4 copias de «${m.cartas.find((c) => sinTildes(c.name) === n).name}» (${k})`);
  if (total !== 60) problemas.push(total < 60 ? `Faltan ${60 - total} cartas para 60` : `Sobran ${total - 60} cartas (máximo 60)`);
  const legal = (f) => m.cartas.length > 0 && m.cartas.every((c) => esEnergiaBasica(c) || (c.legal ? c.legal[f] : false));
  return { total, tengo, costo, sinPrecio, problemas, estandar: legal('standard'), expandido: legal('expanded') };
}

async function pintarMazos() {
  const mazos = leerMazos(); const col = leer('coleccion', []); const tasas = await getTasas();
  if (mazos.length && typeof cargarNombresEn === 'function') await cargarNombresEn(col).catch(() => {});
  const cont = $('#lista-mazos');
  if (!mazos.length) { cont.innerHTML = '<div class="vacio">Aún no tienes mazos.<br>Crea uno o importa una lista de Pokémon TCG Live.</div>'; return; }
  cont.innerHTML = mazos.map((m) => {
    const a = analizarMazo(m, col);
    const portada = m.cartas.slice().sort((x, y) => (y.usd || 0) - (x.usd || 0))[0];
    return `<button class="mazo-item" data-id="${esc(m.id)}">
      ${portada ? `<img src="${esc(imgCarta(portada))}" alt="">` : '<span class="mazo-vacio">🃏</span>'}
      <div class="info"><b>${esc(m.nombre)}</b>
        <span class="meta">${a.total}/60 cartas · tienes ${a.tengo} de ${a.total}</span>
        <span class="meta">${a.tengo >= a.total && a.total ? '✅ ¡Lo tienes completo!' : `Para completarlo: <b>${fmtCOP(a.costo * tasas.COP)}</b>${a.sinPrecio ? ` (+${a.sinPrecio} sin precio)` : ''}`}</span>
        <span class="legalidad"><span class="${a.estandar ? 'ok' : 'no'}">Estándar ${a.estandar ? '✓' : '✗'}</span><span class="${a.expandido ? 'ok' : 'no'}">Expandido ${a.expandido ? '✓' : '✗'}</span></span>
      </div></button>`;
  }).join('');
  $$('.mazo-item', cont).forEach((b) => b.addEventListener('click', () => abrirMazo(b.dataset.id)));
}

async function abrirMazo(id) {
  const mazos = leerMazos(); const m = mazos.find((x) => x.id === id); if (!m) return;
  const col = leer('coleccion', []); const tasas = await getTasas();
  const a = analizarMazo(m, col);
  const grupos = [['Pokémon', (c) => /pok/i.test(c.category)], ['Entrenador', (c) => /entrenador|trainer/i.test(c.category)], ['Energía', (c) => /energ/i.test(c.category)], ['Otras', () => true]];
  const usados = new Set();
  const secciones = grupos.map(([titulo, f]) => {
    const l = m.cartas.filter((c) => !usados.has(c.key) && f(c)); l.forEach((c) => usados.add(c.key));
    if (!l.length) return '';
    return `<p class="titulo-sec">${titulo} · ${l.reduce((s, c) => s + c.n, 0)}</p><ul class="lista-mazo">${l.map((c) => {
      const t = Math.min(c.n, cuantasTengo(c, col));
      return `<li data-key="${esc(c.key)}">
        <img src="${esc(imgCarta(c))}" alt="">
        <div class="info"><b>${esc(c.name)}</b><span class="meta">${esc(nombreSet(c))} · ${esc(c.localId)} · ${c.usd != null ? fmtUSD(c.usd) : 'sin precio'}</span>
          <span class="${t >= c.n ? 'sube' : 'baja'}">${t >= c.n ? `✓ tienes ${t}` : `tienes ${t} · faltan ${c.n - t}`}</span></div>
        <div class="cantidad-mazo"><button data-d="-1" aria-label="Menos">−</button><b>${c.n}</b><button data-d="1" aria-label="Más">＋</button></div>
      </li>`;
    }).join('')}</ul>`;
  }).join('');
  const cuerpo = abrirModal(`
    <div class="carta">
      <input class="nombre-mazo" id="mazo-nombre" value="${esc(m.nombre)}" aria-label="Nombre del mazo">
      <div class="mazo-resumen">
        <div><b>${a.total}</b>/60<span class="meta">cartas</span></div>
        <div><b>${a.tengo}</b><span class="meta">tienes</span></div>
        <div><b>${fmtCOP(a.costo * tasas.COP)}</b><span class="meta">para completarlo</span></div>
      </div>
      <span class="legalidad"><span class="${a.estandar ? 'ok' : 'no'}">Estándar ${a.estandar ? '✓' : '✗'}</span><span class="${a.expandido ? 'ok' : 'no'}">Expandido ${a.expandido ? '✓' : '✗'}</span></span>
      ${a.problemas.length ? `<ul class="problemas">${a.problemas.map((p) => `<li>⚠️ ${esc(p)}</li>`).join('')}</ul>` : '<p class="sube">✓ Mazo de 60 cartas válido</p>'}
      <div class="botones">
        <button class="guardar" id="mazo-agregar">＋ Agregar carta</button>
        <button id="mazo-faltan">♡ Faltantes a deseos</button>
      </div>
      ${secciones || '<p class="meta">El mazo está vacío. Agrega cartas o importa una lista.</p>'}
      <div class="botones">
        <button id="mazo-exportar">📤 Exportar lista</button>
        <button class="peligro" id="mazo-borrar">🗑 Borrar mazo</button>
      </div>
      <p class="nota">«Tienes» cuenta las cartas de tu colección con el mismo número de carta o el mismo nombre (cualquier versión sirve para jugar). La legalidad la da TCGdex; las energías básicas siempre son legales.</p>
    </div>`);
  const actualizar = (fn) => { const ms = leerMazos(); const mm = ms.find((x) => x.id === id); fn(mm); guardarMazos(ms); abrirMazo(id); };
  $('#mazo-nombre', cuerpo).addEventListener('change', (e) => { const v = e.target.value.trim(); if (v) { const ms = leerMazos(); ms.find((x) => x.id === id).nombre = v; guardarMazos(ms); } });
  $$('.lista-mazo li', cuerpo).forEach((li) => $$('[data-d]', li).forEach((b) => b.addEventListener('click', () => actualizar((mm) => {
    const c = mm.cartas.find((x) => x.key === li.dataset.key); c.n += +b.dataset.d;
    if (c.n <= 0) mm.cartas = mm.cartas.filter((x) => x.key !== c.key);
  }))));
  $('#mazo-agregar', cuerpo).addEventListener('click', async () => {
    const carta = await elegirCarta('🃏 Agregar al mazo'); if (!carta) return abrirMazo(id);
    const p = precioUSD(carta, await getTasas(), null, carta._lang);
    actualizar((mm) => { const ya = mm.cartas.find((x) => x.id === carta.id); if (ya) ya.n++; else mm.cartas.push(cartaDeMazo(carta, p)); });
  });
  $('#mazo-faltan', cuerpo).addEventListener('click', () => {
    const col2 = leer('coleccion', []); const des = leer('deseos', []); let k = 0;
    for (const c of m.cartas) {
      const faltan = c.n - Math.min(c.n, cuantasTengo(c, col2));
      if (faltan > 0 && !des.some((d) => d.id === c.id)) { des.unshift({ key: nuevoId(), id: c.id, name: c.name, set: '', localId: c.localId, image: c.image, idioma: c.lang, usd: c.usd, objetivoUSD: c.usd, fecha: Date.now() }); k++; }
    }
    guardar('deseos', des); alert(`${k} carta(s) agregadas a tus deseos (con su precio actual como objetivo).`);
  });
  $('#mazo-exportar', cuerpo).addEventListener('click', () => compartirTexto(m.nombre, exportarMazo(m)));
  $('#mazo-borrar', cuerpo).addEventListener('click', () => {
    if (!confirm(`¿Borrar el mazo «${m.nombre}»? Tus cartas de la colección no se tocan.`)) return;
    guardarMazos(leerMazos().filter((x) => x.id !== id)); cerrarModal(); pintarMazos();
  });
}

/* ---------- exportar / importar (formato Pokémon TCG Live) ---------- */
async function exportarMazoTexto(m) { return exportarMazo(m); }
function exportarMazo(m) {
  const codigoDe = (() => { const c = window._codigosCache || {}; const inv = {}; for (const [k, v] of Object.entries(c)) inv[v] = inv[v] || k; return (setId) => inv[setId] || setId.toUpperCase(); })();
  const bloque = (titulo, f) => {
    const l = m.cartas.filter(f); if (!l.length) return '';
    return `${titulo}: ${l.reduce((s, c) => s + c.n, 0)}\n${l.map((c) => `${c.n} ${c.name} ${codigoDe(c.setId)} ${String(parseInt(c.localId, 10) || c.localId)}`).join('\n')}\n`;
  };
  return [bloque('Pokémon', (c) => /pok/i.test(c.category)), bloque('Trainer', (c) => /entrenador|trainer/i.test(c.category)), bloque('Energy', (c) => /energ/i.test(c.category))]
    .filter(Boolean).join('\n') + `\nTotal Cards: ${m.cartas.reduce((s, c) => s + c.n, 0)}`;
}

const ENERGIA_SIMBOLO = { G: 'Grass', R: 'Fire', W: 'Water', L: 'Lightning', P: 'Psychic', F: 'Fighting', D: 'Darkness', M: 'Metal' };
async function importarMazo(texto, nombre) {
  const codigos = await getCodigos('es'); window._codigosCache = codigos;
  const tasas = await getTasas();
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^\d+\s+/.test(l));
  const cartas = []; const fallidas = [];
  const progreso = $('#imp-progreso');
  let i = 0;
  for (const l of lineas) {
    i++; if (progreso) progreso.textContent = `Importando ${i}/${lineas.length}…`;
    const m = l.match(/^(\d+)\s+(.+?)\s+([A-Z][A-Za-z0-9-]{1,6})\s+([A-Za-z]{0,3}\d+[a-z]?)$/);
    let n = 0, carta = null;
    try {
      if (m) {
        n = +m[1];
        const setId = codigos[m[3].toUpperCase()] || codigos[m[3]];
        if (setId) carta = await getJSON(`${apiDe('en')}/sets/${encodeURIComponent(setId)}/${encodeURIComponent(parseInt(m[4], 10) || m[4])}`).catch(() => null);
        if (!carta) { // por nombre
          const nom = m[2].replace(/\{(\w)\}/g, (x, s) => ENERGIA_SIMBOLO[s] || s).replace(/^Basic (\w+) Energy$/i, 'Basic $1 Energy');
          const r = await getJSON(`${apiDe('en')}/cards?name=eq:${encodeURIComponent(nom)}`).catch(() => []);
          if (r && r.length) carta = await getJSON(`${apiDe('en')}/cards/${encodeURIComponent(r[r.length - 1].id)}`).catch(() => null);
        }
      } else {
        const m2 = l.match(/^(\d+)\s+(.+)$/); n = +m2[1];
        const nom = m2[2].replace(/\{(\w)\}/g, (x, s) => ENERGIA_SIMBOLO[s] || s);
        const r = await getJSON(`${apiDe('en')}/cards?name=eq:${encodeURIComponent(nom)}`).catch(() => []);
        if (r && r.length) carta = await getJSON(`${apiDe('en')}/cards/${encodeURIComponent(r[r.length - 1].id)}`).catch(() => null);
      }
    } catch { carta = null; }
    if (carta) { carta._lang = 'en'; const ya = cartas.find((c) => c.id === carta.id); if (ya) ya.n += n; else cartas.push(cartaDeMazo(carta, precioUSD(carta, tasas, null, 'en'), n)); } else fallidas.push(l);
  }
  const mazo = { id: nuevoId(), nombre: nombre || 'Mazo importado', cartas, fecha: Date.now() };
  guardarMazos([mazo, ...leerMazos()]);
  return { mazo, fallidas };
}

function ventanaImportar() {
  const cuerpo = abrirModal(`
    <div class="carta">
      <h2>📋 Importar lista</h2>
      <p class="meta">Pega la lista exportada de Pokémon TCG Live (o cualquier lista tipo «4 Pikachu ex SVI 57»).</p>
      <input class="filtro-modal" id="imp-nombre" placeholder="Nombre del mazo" value="${esc(tr('Mazo importado'))}">
      <textarea id="imp-texto" class="area-texto" rows="12" placeholder="Pokémon: 12&#10;4 Pikachu ex SVI 57&#10;…&#10;Trainer: 36&#10;4 Professor's Research SVI 189&#10;…&#10;Energy: 12&#10;12 Basic {L} Energy SVE 4"></textarea>
      <div class="botones"><button class="guardar" id="imp-ok">Importar</button></div>
      <p class="meta" id="imp-progreso"></p>
    </div>`);
  $('#imp-ok', cuerpo).addEventListener('click', async (e) => {
    const texto = $('#imp-texto', cuerpo).value; if (!/\d+\s+\S/.test(texto)) return alert('Pega una lista de cartas primero.');
    e.target.disabled = true;
    const { mazo, fallidas } = await importarMazo(texto, $('#imp-nombre', cuerpo).value.trim());
    alert(`Mazo «${mazo.nombre}» importado: ${mazo.cartas.reduce((s, c) => s + c.n, 0)} cartas.${fallidas.length ? `\n\nNo se encontraron ${fallidas.length} línea(s):\n${fallidas.slice(0, 8).join('\n')}` : ''}`);
    pintarMazos(); abrirMazo(mazo.id);
  });
}

$('#btn-nuevo-mazo').addEventListener('click', () => {
  const nombre = (prompt('Nombre del mazo:', tr('Mi mazo')) || '').trim(); if (!nombre) return;
  const m = { id: nuevoId(), nombre, cartas: [], fecha: Date.now() };
  guardarMazos([m, ...leerMazos()]); pintarMazos(); abrirMazo(m.id);
});
$('#btn-importar-mazo').addEventListener('click', ventanaImportar);
getCodigos('es').then((c) => { window._codigosCache = c; }).catch(() => {});
