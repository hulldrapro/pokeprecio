/* CardCalc — tanda 3: estado de la carta, lo que pagaste, carpetas, estadísticas, modo venta,
   todas las versiones ordenadas por precio, escaneo automático y linterna. Usa funciones de app.js / extras.js. */
'use strict';

/* ================= MI CARTA (estado · lo que pagaste · carpeta) ================= */
function seccionMiCarta(item) {
  const col = leer('coleccion', []);
  const est = item.estado || 'NM';
  return `
  <div class="mi-carta">
    <p class="titulo-sec">Mi carta</p>
    <div class="campo"><span>Estado</span>
      <div class="chips envolver">${Object.entries(ESTADOS).map(([k, e]) => `<button data-estado="${k}" class="${est === k ? 'sel' : ''}">${e.corto} · ${e.nombre}</button>`).join('')}</div>
    </div>
    <div class="valor-estado" id="valor-estado"></div>
    ${seccionGradeo(item)}
    <div class="campo"><span>Lo que pagaste</span>
      <div class="fila-input"><input type="number" inputmode="numeric" min="0" id="compra-cop" placeholder="en ${esc(MON().plural)} (${MONEDA})" value="${item.compraUSD ? +(item.compraUSD * (leer('tasas', null)?.d?.rates?.[MONEDA] || 1)).toFixed(MON().dec) : ''}"><span id="ganancia" class="meta"></span></div>
    </div>
    <div class="campo"><span>Carpeta</span>
      <div class="chips envolver" id="carpetas-carta">${[['', 'Ninguna'], ...carpetasUsadas(col).map((n) => [n, n])].map(([v, n]) => `<button data-carpeta="${esc(v)}" class="${(item.carpeta || '') === v ? 'sel' : ''}">${v ? '📁 ' : ''}${esc(n)}</button>`).join('')}<button data-carpeta-nueva>＋ Nueva</button></div>
    </div>
  </div>`;
}

function conectarMiCarta(destino, item, tasas, getP) {
  const it = () => leer('coleccion', []).find((c) => c.uid === item.uid) || item;
  const pintar = () => {
    const c = it(); const usd = getP().usd;
    const e = ESTADOS[c.estado || 'NM'];
    const valor = usd != null ? (c.gradeo ? valorGradeoUSD({ ...c, usd }) : usd * e.f) : null;
    $('#valor-estado', destino).innerHTML = c.gradeo ? '' : valor != null
      ? `Tu copia (${e.nombre}${e.f < 1 ? `, ${Math.round(e.f * 100)}% del mercado` : ''}): <b>${fmtUSD(valor)}</b> · ${fmtCOP(valor * tasas.COP)}` : '';
    const g = $('#ganancia', destino);
    if (c.compraUSD > 0 && valor != null) {
      const dif = (valor - c.compraUSD) * tasas.COP;
      g.innerHTML = `<span class="${dif >= 0 ? 'sube' : 'baja'}">${dif >= 0 ? '▲ ganas' : '▼ pierdes'} ${fmtCOP(Math.abs(dif))} (${dif >= 0 ? '+' : '−'}${Math.abs(dif / (c.compraUSD * tasas.COP) * 100).toFixed(0)}%)</span>`;
    } else g.textContent = '';
  };
  $$('[data-estado]', destino).forEach((b) => b.addEventListener('click', () => {
    actualizarItem(item.uid, (c) => { c.estado = b.dataset.estado; });
    $$('[data-estado]', destino).forEach((x) => x.classList.toggle('sel', x === b)); pintar();
  }));
  const inp = $('#compra-cop', destino);
  inp.addEventListener('input', () => {
    const v = parseFloat(inp.value);
    actualizarItem(item.uid, (c) => { c.compraUSD = v > 0 ? v / tasas.COP : null; delete c.compraCOP; }); pintar();
  });
  const cont = $('#carpetas-carta', destino);
  const elegir = (v) => {
    actualizarItem(item.uid, (c) => { c.carpeta = v || ''; });
    $$('[data-carpeta]', cont).forEach((x) => x.classList.toggle('sel', x.dataset.carpeta === v));
  };
  $$('[data-carpeta]', cont).forEach((b) => b.addEventListener('click', () => elegir(b.dataset.carpeta)));
  $('[data-carpeta-nueva]', cont).addEventListener('click', (ev) => {
    const n = (prompt('Nombre de la carpeta nueva (ej. "Charizards", "Para regalar"):') || '').trim().slice(0, 30);
    if (!n) return;
    if (!$$('[data-carpeta]', cont).some((x) => x.dataset.carpeta === n)) {
      const b = document.createElement('button'); b.dataset.carpeta = n; b.textContent = `📁 ${n}`;
      b.addEventListener('click', () => elegir(n)); cont.insertBefore(b, ev.target);
    }
    elegir(n);
  });
  pintar();
  conectarGradeo(destino, item, tasas, getP, pintar); // PSA / BGS / CGC…
}

/* ================= tooltip (gráficos) ================= */
function tooltip(html, x, y) {
  let t = $('#tooltip'); if (!t) { t = document.createElement('div'); t.id = 'tooltip'; t.className = 'tooltip'; document.body.appendChild(t); }
  if (!html) { t.hidden = true; return; }
  t.hidden = false; t.innerHTML = html;
  const w = t.offsetWidth, h = t.offsetHeight;
  t.style.left = `${Math.min(window.innerWidth - w - 8, Math.max(8, x - w / 2))}px`;
  t.style.top = `${Math.max(8, y - h - 14)}px`;
}
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('[data-tip], .grafico')) tooltip(null); });
document.addEventListener('scroll', () => tooltip(null), true);

/* ================= ESTADÍSTICAS ================= */
const dia = (t) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// valor de la colección día por día, reconstruido con el historial de precios de cada carta
function serieValor(col) {
  const dias = new Set([dia(Date.now())]);
  for (const c of col) { dias.add(dia(c.fecha || Date.now())); for (const h of c.historial || []) dias.add(dia(h.t)); }
  return [...dias].sort().map((d) => {
    const fin = new Date(`${d}T23:59:59`).getTime();
    let v = 0;
    for (const c of col) {
      if ((c.fecha || 0) > fin) continue;
      const hs = (c.historial || []).filter((h) => h.t <= fin);
      const usd = hs.length ? hs[hs.length - 1].usd : (c.usdInicial ?? c.usd ?? 0);
      v += (usd || 0) * factorEstado(c);
    }
    return { t: fin, d, v };
  });
}

function graficoLinea(serie, tasas) {
  const W = 340, H = 170, mi = 46, md = 10, ma = 12, mb = 24;
  const vs = serie.map((p) => p.v); const max = Math.max(...vs) * 1.08 || 1, min = 0;
  const x = (i) => mi + (serie.length === 1 ? (W - mi - md) / 2 : i * (W - mi - md) / (serie.length - 1));
  const y = (v) => ma + (1 - (v - min) / (max - min)) * (H - ma - mb);
  const linea = serie.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(serie.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, max / 2, max].map((v) => `<line x1="${mi}" x2="${W - md}" y1="${y(v)}" y2="${y(v)}" class="g-grid"/><text x="${mi - 6}" y="${y(v) + 4}" class="g-eje" text-anchor="end">${fmtUSD(v).replace('US$ ', '$')}</text>`).join('');
  const fecha = (p) => new Date(p.t).toLocaleDateString(LOCALE(), { day: 'numeric', month: 'short' });
  const etiquetas = serie.length > 1 ? `<text x="${x(0)}" y="${H - 6}" class="g-eje">${fecha(serie[0])}</text><text x="${x(serie.length - 1)}" y="${H - 6}" class="g-eje" text-anchor="end">${fecha(serie[serie.length - 1])}</text>` : '';
  return `<svg class="grafico" viewBox="0 0 ${W} ${H}" data-serie='${esc(JSON.stringify(serie.map((p) => [p.t, +p.v.toFixed(2)])))}' data-cop="${tasas.COP}">
    ${ticks}<path d="${area}" class="g-area"/><path d="${linea}" class="g-linea"/>${etiquetas}
    <line class="g-cruz" x1="0" x2="0" y1="${ma}" y2="${H - mb}" visibility="hidden"/><circle class="g-punto" r="5" visibility="hidden"/>
    <rect class="g-captura" x="${mi}" y="0" width="${W - mi - md}" height="${H}" fill="transparent"/>
  </svg>`;
}

function activarLinea(svg) {
  const serie = JSON.parse(svg.dataset.serie); const cop = +svg.dataset.cop;
  const W = 340, H = 170, mi = 46, md = 10, ma = 12, mb = 24;
  const max = Math.max(...serie.map((p) => p[1])) * 1.08 || 1;
  const x = (i) => mi + (serie.length === 1 ? (W - mi - md) / 2 : i * (W - mi - md) / (serie.length - 1));
  const y = (v) => ma + (1 - v / max) * (H - ma - mb);
  const mover = (e) => {
    const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W;
    let i = Math.round((px - mi) / ((W - mi - md) / Math.max(1, serie.length - 1))); i = Math.max(0, Math.min(serie.length - 1, i));
    const [t, v] = serie[i];
    const cruz = $('.g-cruz', svg), pt = $('.g-punto', svg);
    cruz.setAttribute('x1', x(i)); cruz.setAttribute('x2', x(i)); cruz.setAttribute('visibility', 'visible');
    pt.setAttribute('cx', x(i)); pt.setAttribute('cy', y(v)); pt.setAttribute('visibility', 'visible');
    tooltip(`<b>${new Date(t).toLocaleDateString(LOCALE(), { dateStyle: 'medium' })}</b><br>${fmtUSD(v)} · ${fmtCOP(v * cop)}`, r.left + x(i) / W * r.width, r.top + y(v) / H * r.height);
  };
  const salir = () => { $('.g-cruz', svg).setAttribute('visibility', 'hidden'); $('.g-punto', svg).setAttribute('visibility', 'hidden'); tooltip(null); };
  svg.addEventListener('pointermove', mover); svg.addEventListener('pointerdown', mover); svg.addEventListener('pointerleave', salir);
}

// barras horizontales de una sola serie (un solo color: magnitud)
function barras(filas, tasas) {
  const max = Math.max(...filas.map((f) => f.v), 0.0001);
  return `<div class="barras">${filas.map((f) => `
    <div class="barra-fila" data-tip="${esc(`<b>${esc(f.label)}</b><br>${fmtUSD(f.v)} · ${fmtCOP(f.v * tasas.COP)}${f.extra ? `<br>${esc(f.extra)}` : ''}`)}">
      <span class="b-label">${esc(f.label)}</span>
      <span class="b-pista"><span class="b-barra" style="width:${Math.max(1.5, f.v / max * 100)}%"></span></span>
      <span class="b-valor">${fmtUSD(f.v)}</span>
    </div>`).join('')}</div>`;
}

function agruparTop(mapa, n = 8) {
  const l = [...mapa.entries()].map(([label, v]) => ({ label, v })).sort((a, b) => b.v - a.v);
  if (l.length <= n) return l;
  const otros = l.slice(n - 1).reduce((s, x) => s + x.v, 0);
  return [...l.slice(0, n - 1), { label: `Otros (${l.length - n + 1})`, v: otros }];
}

async function pintarStats() {
  const col = leer('coleccion', []); const tasas = await getTasas();
  const cont = $('#lista-coleccion'); cont.className = 'stats';
  if (!col.length) { cont.innerHTML = '<div class="vacio">Aún no tienes cartas.</div>'; return; }
  const serie = serieValor(col);
  const total = col.reduce((s, c) => s + valorUSD(c), 0);
  const grupos = new Map(); for (const c of col) { const k = claveCopia(c); grupos.set(k, { c, n: (grupos.get(k)?.n || 0) + 1 }); }
  // por precio UNITARIO (una copia), no por la suma de las repetidas
  const top = [...grupos.values()].sort((a, b) => valorUSD(b.c) - valorUSD(a.c)).slice(0, 10);
  const porSet = new Map(); const porTipo = new Map();
  for (const c of col) {
    const s = nombreSet(c) || '—'; porSet.set(s, (porSet.get(s) || 0) + valorUSD(c));
    const t = tiposDe(c)[0] || 'Sin tipo'; porTipo.set(t, (porTipo.get(t) || 0) + valorUSD(c));
  }
  const masCara = top[0];
  const cambio = serie.length > 1 && serie[0].v ? (serie[serie.length - 1].v / serie[0].v - 1) * 100 : null;
  cont.innerHTML = `
    <div class="tiles">
      <div class="tile"><span class="meta">Cartas</span><b>${col.length}</b><span class="meta">${grupos.size} distintas</span></div>
      <div class="tile"><span class="meta">Valor medio</span><b>${fmtUSD(total / col.length)}</b><span class="meta">${fmtCOP(total / col.length * tasas.COP)}</span></div>
      <div class="tile"><span class="meta">La más valiosa</span><b>${fmtUSD(valorUSD(masCara.c))}</b><span class="meta">${esc(masCara.c.name)}</span></div>
      <div class="tile"><span class="meta">Desde el inicio</span><b class="${cambio == null ? '' : cambio >= 0 ? 'sube' : 'baja'}">${cambio == null ? '—' : `${cambio >= 0 ? '▲' : '▼'} ${Math.abs(cambio).toFixed(1)}%`}</b><span class="meta">${serie.length} día${serie.length === 1 ? '' : 's'} de datos</span></div>
    </div>
    <div class="panel-graf"><p class="titulo-sec">Valor de tu colección (US$)</p>
      ${serie.length > 1 ? graficoLinea(serie, tasas) : '<p class="meta">El gráfico aparece desde el segundo día: cada vez que se actualizan los precios se guarda un punto.</p>'}
    </div>
    <div class="panel-graf"><p class="titulo-sec">Top 10 cartas más valiosas (precio por carta)</p>
      ${barras(top.map(({ c, n }) => ({ label: `${c.name}${n > 1 ? ` ×${n}` : ''}`, v: valorUSD(c), extra: `${nombreSet(c)} · ${c.num || c.localId}${n > 1 ? ` · tienes ${n}: ${fmtUSD(valorUSD(c) * n)} en total` : ''}` })), tasas)}</div>
    <div class="panel-graf"><p class="titulo-sec">Valor por set</p>${barras(agruparTop(porSet), tasas)}</div>
    <div class="panel-graf"><p class="titulo-sec">Valor por tipo</p>${barras(agruparTop(porTipo).map((f) => ({ ...f, label: `${TIPO_ICONO[f.label] || '•'} ${f.label}` })), tasas)}</div>
    <details class="tabla-datos"><summary>Ver como tabla</summary>
      <table><thead><tr><th>Carta</th><th>Copias</th><th>US$</th><th>COP</th></tr></thead><tbody>
      ${[...grupos.values()].sort((a, b) => valorUSD(b.c) * b.n - valorUSD(a.c) * a.n).map(({ c, n }) => `<tr><td>${esc(c.name)}</td><td>${n}</td><td>${fmtUSD(valorUSD(c) * n)}</td><td>${fmtCOP(valorUSD(c) * n * tasas.COP)}</td></tr>`).join('')}
      </tbody></table></details>`;
  $$('.grafico', cont).forEach(activarLinea);
  $$('[data-tip]', cont).forEach((el) => el.addEventListener('click', (e) => { const r = el.getBoundingClientRect(); tooltip(el.dataset.tip, e.clientX || r.left + r.width / 2, r.top); }));
}

/* ================= MODO VENTA ================= */
const ventaSel = new Set();
async function pintarVenta() {
  const col = leer('coleccion', []); const tasas = await getTasas();
  const pct = leer('ventaPct', 80);
  const soloVender = leer('ventaSoloCarpeta', false);
  const grupos = new Map();
  for (const c of col) {
    if (soloVender && c.carpeta !== 'Para vender') continue;
    const k = claveCopia(c); if (!grupos.has(k)) grupos.set(k, { k, c, n: 0, uids: [] });
    const g = grupos.get(k); g.n++; g.uids.push(c.uid);
  }
  const lista = [...grupos.values()].sort((a, b) => valorUSD(b.c) - valorUSD(a.c));
  for (const k of [...ventaSel]) if (!grupos.has(k)) ventaSel.delete(k);
  const sel = lista.filter((g) => ventaSel.has(g.k));
  const mercadoCOP = sel.reduce((s, g) => s + valorUSD(g.c) * g.n * tasas.COP, 0);
  const cont = $('#lista-coleccion'); cont.className = 'venta';
  cont.innerHTML = `
    <div class="resumen venta-cab">
      <div class="meta">💸 Modo venta: ¿a qué % del precio de mercado vendes?</div>
      <div class="fila"><input type="range" id="venta-pct" min="40" max="100" step="5" value="${pct}"><b class="pct-grande" id="venta-pct-txt">${pct}%</b></div>
      <label class="interruptor"><input type="checkbox" id="venta-solo" ${soloVender ? 'checked' : ''}><span></span>Solo la carpeta «Para vender»</label>
      <div class="venta-total">${sel.length ? `<b>${sel.reduce((s, g) => s + g.n, 0)} carta(s)</b> · mercado ${fmtCOP(mercadoCOP)} → <b class="sube">vendes en ${fmtCOP(mercadoCOP * pct / 100)}</b>${hayCalcVenta() ? `<br><span class="meta">${textoNeto(mercadoCOP / tasas.COP * pct / 100, tasas)}</span>` : ''}` : '<span class="meta">Marca las cartas que quieres vender</span>'}</div>
      <div class="botones">
        <button id="venta-todas">${sel.length === lista.length && lista.length ? 'Quitar todas' : 'Marcar todas'}</button>
        <button class="guardar" id="venta-compartir" ${sel.length ? '' : 'disabled'}>📤 Compartir lista</button>
        <button class="peligro" id="venta-vendidas" ${sel.length ? '' : 'disabled'}>✓ Las vendí</button>
      </div>
    </div>
    <ul class="lista-venta">${lista.length ? lista.map((g) => `
      <li class="${ventaSel.has(g.k) ? 'sel' : ''}" data-k="${esc(g.k)}">
        <span class="check">${ventaSel.has(g.k) ? '✓' : ''}</span>
        <img src="${esc(imgCarta(g.c))}" alt="">
        <div class="info"><b>${esc(g.c.name)}${g.n > 1 ? ` ×${g.n}` : ''}</b>
          <span class="meta">${bandera(g.c.idioma)} ${esc(nombreSet(g.c))} · ${esc((g.c.gradeo ? etiquetaGradeo(g.c.gradeo) : ESTADOS[g.c.estado || 'NM'].corto))}</span>
          <span class="meta">Mercado ${fmtCOP(valorUSD(g.c) * tasas.COP)} c/u</span></div>
        <div class="valor"><b>${fmtCOP(valorUSD(g.c) * tasas.COP * pct / 100)}</b><br><span class="meta">a ${pct}%</span></div>
      </li>`).join('') : '<li class="vacio">No hay cartas para vender.</li>'}</ul>`;
  $('#venta-pct').addEventListener('input', (e) => { $('#venta-pct-txt').textContent = `${e.target.value}%`; });
  $('#venta-pct').addEventListener('change', (e) => { guardar('ventaPct', +e.target.value); pintarVenta(); });
  $('#venta-solo').addEventListener('change', (e) => { guardar('ventaSoloCarpeta', e.target.checked); pintarVenta(); });
  $('#venta-todas').addEventListener('click', () => { if (sel.length === lista.length) ventaSel.clear(); else lista.forEach((g) => ventaSel.add(g.k)); pintarVenta(); });
  $$('.lista-venta li[data-k]').forEach((li) => li.addEventListener('click', () => { const k = li.dataset.k; if (ventaSel.has(k)) ventaSel.delete(k); else ventaSel.add(k); pintarVenta(); }));
  $('#venta-compartir').addEventListener('click', () => {
    const texto = `💸 Vendo estas cartas (CardCalc)\n\n${sel.map((g) => `• ${g.c.name}${g.n > 1 ? ` ×${g.n}` : ''} ${bandera(g.c.idioma)} (${nombreSet(g.c)} ${g.c.num || g.c.localId}, ${(g.c.gradeo ? etiquetaGradeo(g.c.gradeo) : ESTADOS[g.c.estado || 'NM'].corto)}) — ${fmtCOP(valorUSD(g.c) * tasas.COP * pct / 100)}${g.n > 1 ? ' c/u' : ''}`).join('\n')}\n\nTotal: ${fmtCOP(mercadoCOP * pct / 100)}\n¿Te interesa alguna? 😄`;
    compartirTexto('Cartas en venta', texto);
  });
  $('#venta-vendidas').addEventListener('click', () => {
    const n = sel.reduce((s, g) => s + g.n, 0);
    if (!confirm(`¿Vendiste ${n} carta(s) por ${fmtCOP(mercadoCOP * pct / 100)}? Salen de tu colección.`)) return;
    const fuera = new Set(sel.flatMap((g) => g.uids));
    guardar('coleccion', leer('coleccion', []).filter((c) => !fuera.has(c.uid)));
    const ventas = leer('ventas', []); ventas.unshift({ fecha: Date.now(), cartas: n, cop: Math.round(mercadoCOP * pct / 100) }); guardar('ventas', ventas.slice(0, 200));
    ventaSel.clear(); pintarColeccion();
  });
}

/* ================= TODAS LAS VERSIONES, ORDENADAS POR PRECIO ================= */
function ofrecerOrdenPorPrecio(cartas, id) {
  const b = $('#btn-ordenar-precio'); b.hidden = false;
  b.onclick = async () => {
    b.disabled = true; const t0 = b.textContent;
    const tasas = await getTasas(); const lang = langEscaneo; let hechas = 0;
    const lote = cartas.slice(0, 60);
    const completas = new Array(lote.length);
    for (let i = 0; i < lote.length; i += 8) {
      await Promise.all(lote.slice(i, i + 8).map(async (c, j) => {
        try { const full = await getJSON(`${apiDe(lang)}/cards/${encodeURIComponent(c.id)}`); full._lang = lang; full._precio = precioUSD(full, tasas, null, lang).usd; completas[i + j] = full; } catch { completas[i + j] = { ...c, _precio: null }; }
        hechas++; b.textContent = `Consultando precios… ${hechas}/${lote.length}`;
      }));
      if (id !== busquedaId) { b.disabled = false; b.textContent = t0; return; }
    }
    const orden = completas.sort((a, c) => (a._precio ?? 1e9) - (c._precio ?? 1e9));
    const conPrecio = orden.filter((c) => c._precio != null);
    mostrarCandidatos(orden, `${orden.length} versiones · de la más barata a la más cara`, -1);
    if (conPrecio.length) estado(`💲 Más barata: <b>${esc(conPrecio[0].name)}</b> (${esc(nombreSet(conPrecio[0]))}) ${fmtUSD(conPrecio[0]._precio)} · más cara: ${fmtUSD(conPrecio[conPrecio.length - 1]._precio)}`);
    b.disabled = false; b.textContent = t0; b.hidden = true;
  };
}

/* ================= LINTERNA + ESCANEO AUTOMÁTICO ================= */
let pistaVideo = null;
let linterna = false;
let autoOn = leer('autoScan', false);
let autoOcupado = false, prevMuestra = null, estables = 0, firmaUltima = null;

function prepararExtrasCamara(pista) {
  pistaVideo = pista; linterna = false;
  const cap = pista.getCapabilities ? pista.getCapabilities() : {};
  const b = $('#btn-linterna'); b.hidden = !cap.torch; b.setAttribute('aria-pressed', 'false'); b.classList.remove('on');
  prevMuestra = null; estables = 0;
}
$('#btn-linterna').addEventListener('click', async () => {
  if (!pistaVideo) return;
  linterna = !linterna;
  try { await pistaVideo.applyConstraints({ advanced: [{ torch: linterna }] }); } catch { linterna = false; }
  $('#btn-linterna').classList.toggle('on', linterna); $('#btn-linterna').setAttribute('aria-pressed', String(linterna));
});

function pintarAuto() {
  const b = $('#btn-auto'); b.classList.toggle('on', autoOn); b.setAttribute('aria-pressed', String(autoOn));
  $('#pista').textContent = autoOn ? '⚡ AUTO: pon la carta en el marco y quédate quieto; cambia de carta y sigue' : 'Pon la carta dentro del marco · evita reflejos inclinándola un poco';
  if (!autoOn) $('#marco').classList.remove('estable', 'leyendo');
}
$('#btn-auto').addEventListener('click', () => { autoOn = !autoOn; guardar('autoScan', autoOn); firmaUltima = null; pintarAuto(); });
pintarAuto();

// muestra pequeña (24×34, gris) del recuadro del marco, para medir movimiento y si hay carta
const lienzoMuestra = document.createElement('canvas'); lienzoMuestra.width = 24; lienzoMuestra.height = 34;
function muestraMarco() {
  const v = $('#video'); if (!v.videoWidth) return null;
  const rv = v.getBoundingClientRect(), rm = $('#marco').getBoundingClientRect();
  const e = Math.max(rv.width / v.videoWidth, rv.height / v.videoHeight);
  const ox = (rv.width - v.videoWidth * e) / 2, oy = (rv.height - v.videoHeight * e) / 2;
  const x = (rm.left - rv.left - ox) / e, y = (rm.top - rv.top - oy) / e, w = rm.width / e, h = rm.height / e;
  const g = lienzoMuestra.getContext('2d', { willReadFrequently: true });
  g.drawImage(v, x, y, w, h, 0, 0, 24, 34);
  const p = g.getImageData(0, 0, 24, 34).data; const m = new Float32Array(24 * 34);
  for (let i = 0, j = 0; j < m.length; i += 4, j++) m[j] = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
  return m;
}
const difMedia = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; };
const desv = (a) => { let m = 0; for (const x of a) m += x; m /= a.length; let s = 0; for (const x of a) s += (x - m) ** 2; return Math.sqrt(s / a.length); };

setInterval(async () => {
  if (!autoOn || autoOcupado || !flujo || document.hidden || !$('#modal').hidden || !$('#vista-escanear').classList.contains('activa')) return;
  const m = muestraMarco(); if (!m) return;
  const quieto = prevMuestra && difMedia(m, prevMuestra) < 4.5;
  prevMuestra = m;
  estables = quieto ? estables + 1 : 0;
  const hayCarta = desv(m) > 18;                                 // una carta tiene dibujo; una mesa lisa no
  const nueva = !firmaUltima || difMedia(m, firmaUltima) > 14;  // no repetir la misma carta
  $('#marco').classList.toggle('estable', estables >= 1 && hayCarta && nueva);
  if (estables >= 3 && hayCarta && nueva) {                      // ~1 s quieta → leer
    autoOcupado = true; firmaUltima = m; estables = 0;
    $('#marco').classList.add('leyendo');
    try { const f = capturarMarco(); if (f) await procesarFoto(f); } finally {
      autoOcupado = false; $('#marco').classList.remove('leyendo', 'estable');
      if (navigator.vibrate) navigator.vibrate(40);
    }
  }
}, 350);

/* ================= LOTE (escaneadas ahora) ================= */
$('#btn-compartir-lote').addEventListener('click', async () => {
  const tasas = await getTasas(); const pct = leer('ventaPct', 80);
  const total = sesion.reduce((s, e) => s + (e.p.usd || 0), 0);
  const texto = `📋 Lote de cartas (CardCalc)\n\n${sesion.map((e) => `• ${e.carta.name} ${bandera(e.carta._lang)} (${nombreSet(e.carta)} ${e.carta.localId}) — ${fmtCOP((e.p.usd || 0) * tasas.COP)}`).join('\n')}\n\n${sesion.length} cartas · valor ${fmtCOP(total * tasas.COP)} (${fmtUSD(total)})\nAl ${pct}%: ${fmtCOP(total * tasas.COP * pct / 100)}`;
  compartirTexto('Lote de cartas', texto);
});
