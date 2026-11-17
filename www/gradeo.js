/* CardCalc — cartas calificadas (PSA, BGS, CGC, TAG, ACE).
   No hay una fuente gratuita de precios de cartas calificadas: el valor es un ESTIMADO (multiplicador típico sobre el
   precio sin calificar) que el usuario puede reemplazar con el precio real; hay enlaces a ventas reales (eBay, PriceCharting). */
'use strict';

const EMPRESAS_GRADEO = {
  PSA: { nombre: 'PSA', notas: ['10', '9', '8.5', '8', '7.5', '7', '6', '5', '4', '3', '2', '1.5', '1'], ajuste: 1 },
  BGS: { nombre: 'BGS (Beckett)', notas: ['10 Black Label', '10 Pristine', '9.5', '9', '8.5', '8', '7.5', '7', '6', '5', '4', '3', '2', '1'], ajuste: 0.95 },
  CGC: { nombre: 'CGC', notas: ['10 Pristine', '10', '9.5', '9', '8.5', '8', '7.5', '7', '6', '5', '4', '3', '2', '1'], ajuste: 0.85 },
  TAG: { nombre: 'TAG', notas: ['10', '9.5', '9', '8.5', '8', '7.5', '7', '6', '5', '4', '3', '2', '1'], ajuste: 0.8 },
  ACE: { nombre: 'ACE', notas: ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'], ajuste: 0.7 },
};
// multiplicador típico sobre el precio de la carta SIN calificar (cartas modernas; varía mucho por carta: es una guía)
const MULT_NOTA = { 10: 3, 9.5: 2, 9: 1.5, 8.5: 1.25, 8: 1.1, 7.5: 1, 7: 0.9, 6: 0.75, 5: 0.6, 4: 0.5, 3: 0.4, 2: 0.3, 1.5: 0.27, 1: 0.25 };
function multGradeo(g) {
  if (!g || !EMPRESAS_GRADEO[g.empresa]) return 1;
  if (/Black Label/i.test(g.nota)) return 6;
  if (/Pristine/i.test(g.nota)) return g.empresa === 'BGS' ? 3.5 : 3;
  const m = MULT_NOTA[parseFloat(g.nota)] ?? 1;
  return +(m * (parseFloat(g.nota) >= 9 ? EMPRESAS_GRADEO[g.empresa].ajuste : 1)).toFixed(2);
}
const etiquetaGradeo = (g) => (g ? `${g.empresa} ${g.nota}` : '');
/* valor de una carta calificada: precio real si el usuario lo puso; si no, el estimado */
function valorGradeoUSD(c) {
  if (!c.gradeo) return null;
  if (c.gradeo.precioUSD > 0) return c.gradeo.precioUSD;
  return (c.usd || 0) * multGradeo(c.gradeo);
}

function enlacesVentas(c, g) {
  const q = `${c.name} ${c.localId || ''} ${nombreSet(c)} ${g ? etiquetaGradeo(g) : ''}`.replace(/\s+/g, ' ').trim();
  return {
    ebay: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&LH_Sold=1&LH_Complete=1`,
    pricecharting: `https://www.pricecharting.com/search-products?type=prices&q=${encodeURIComponent(`${c.name} ${c.localId || ''}`.trim())}`,
  };
}

/* sección dentro de "Mi carta" */
function seccionGradeo(item) {
  const g = item.gradeo;
  return `
    <div class="campo"><span>Calificación (gradeo)</span>
      <div class="chips envolver" id="gr-empresa">
        <button data-emp="" class="${g ? '' : 'sel'}">Sin calificar</button>
        ${Object.keys(EMPRESAS_GRADEO).map((k) => `<button data-emp="${k}" class="${g && g.empresa === k ? 'sel' : ''}">🏅 ${esc(EMPRESAS_GRADEO[k].nombre)}</button>`).join('')}
      </div>
    </div>
    <div class="gradeo-detalle" id="gr-detalle"></div>`;
}

function conectarGradeo(destino, item, tasas, getP, alCambiar) {
  const it = () => leer('coleccion', []).find((c) => c.uid === item.uid) || item;
  const det = $('#gr-detalle', destino);
  const pintar = () => {
    const c = it(); const g = c.gradeo;
    // el estado (NM/LP…) no aplica a una carta encapsulada
    const estadoCampo = $('[data-estado]', destino)?.closest('.campo'); if (estadoCampo) estadoCampo.hidden = !!g;
    if (!g) { det.innerHTML = ''; alCambiar(); return; }
    const notas = EMPRESAS_GRADEO[g.empresa].notas;
    const base = getP().usd; const mult = multGradeo(g);
    const est = base != null ? base * mult : null;
    const links = enlacesVentas(c, g);
    det.innerHTML = `
      <div class="campo"><span>Nota</span>
        <select id="gr-nota">${notas.map((n) => `<option value="${esc(n)}" ${n === g.nota ? 'selected' : ''}>${esc(g.empresa)} ${esc(n)}</option>`).join('')}</select></div>
      <div class="gradeo-valor">
        <span class="chip-grado">${esc(etiquetaGradeo(g))}</span>
        ${g.precioUSD > 0
          ? `<div>Precio real: <b>${fmtUSD(g.precioUSD)}</b> · ${fmtCOP(g.precioUSD * tasas.COP)}</div>`
          : `<div>Estimado aproximado: <b>${fmtUSD(est)}</b> · ${fmtCOP((est || 0) * tasas.COP)}</div>`}
        <div class="meta">${g.precioUSD > 0 ? `Estimado: ${fmtUSD(est)} (×${mult} del precio sin calificar)` : `×${mult} del precio sin calificar (${fmtUSD(base)}). Es una guía: cada carta se vende distinto.`}</div>
      </div>
      <div class="campo"><span>Precio real de esta carta calificada (si lo sabes, en ${esc(MON().plural)})</span>
        <div class="fila-input"><input type="number" inputmode="decimal" min="0" id="gr-precio" placeholder="opcional" value="${g.precioUSD > 0 ? +(g.precioUSD * tasas.COP).toFixed(MON().dec) : ''}"></div></div>
      <div class="botones enlaces-ventas">
        <a href="${esc(links.ebay)}" target="_blank" rel="noopener">🔎 Ventas reales en eBay</a>
        <a href="${esc(links.pricecharting)}" target="_blank" rel="noopener">📈 PriceCharting</a>
      </div>`;
    $('#gr-nota', det).addEventListener('change', (e) => { actualizarItem(item.uid, (x) => { x.gradeo.nota = e.target.value; }); pintar(); });
    const inp = $('#gr-precio', det);
    inp.addEventListener('change', () => {
      const v = parseFloat(inp.value);
      actualizarItem(item.uid, (x) => { x.gradeo.precioUSD = v > 0 ? v / tasas.COP : null; }); pintar();
    });
    alCambiar();
  };
  $$('#gr-empresa button', destino).forEach((b) => b.addEventListener('click', () => {
    const emp = b.dataset.emp;
    actualizarItem(item.uid, (x) => { x.gradeo = emp ? { empresa: emp, nota: EMPRESAS_GRADEO[emp].notas[0], precioUSD: null } : null; });
    $$('#gr-empresa button', destino).forEach((x) => x.classList.toggle('sel', x === b));
    pintar();
  }));
  pintar();
}
