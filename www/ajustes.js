/* CardCalc — ⚙️ Ajustes: moneda, idioma de las cartas, precios, escaneo, copia de seguridad, datos y acerca de. */
'use strict';

async function pintarAjustes() {
  const tasas = await getTasas();
  // moneda
  $('#aj-moneda').innerHTML = Object.entries(MONEDAS).map(([k, m]) => `<option value="${k}" ${k === MONEDA ? 'selected' : ''}>${m.pais} ${k} · ${esc(m.nombre)}</option>`).join('');
  $('#aj-moneda-info').innerHTML = MONEDA === 'USD'
    ? 'Los precios se muestran solo en dólares.'
    : `1 US$ = <b>${fmtTasa(tasas.COP)}</b> · tasa del día (${esc(String(tasas.fecha || '').replace(/ \+0000$/, ''))})`;
  // idioma de las cartas
  $('#aj-idioma').innerHTML = Object.entries(IDIOMAS).map(([l, d]) => `<button data-l="${l}" class="${l === idioma ? 'sel' : ''}">${d.bandera} ${d.nombre}</button>`).join('');
  $$('#aj-idioma button').forEach((b) => b.addEventListener('click', () => { cambiarIdioma(b.dataset.l); pintarAjustes(); }));
  // precios
  const fuente = leer('fuentePrecio', 'tcgplayer');
  $$('#aj-fuente button').forEach((b) => b.classList.toggle('sel', b.dataset.v === fuente));
  $('#aj-horas').value = String(leer('horasAuto', HORAS_AUTO));
  $('#aj-pct').value = leer('ventaPct', 80); $('#aj-pct-txt').textContent = `${leer('ventaPct', 80)}%`;
  // escaneo
  $('#aj-autoguardar').checked = $('#auto-guardar').checked;
  $('#aj-autoscan').checked = autoOn;
  $('#aj-vibrar').checked = leer('vibrar', true);
  // datos
  const col = leer('coleccion', []), des = leer('deseos', []);
  let bytes = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); bytes += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch { /* sin acceso */ }
  $('#aj-datos-info').textContent = `${col.length} carta(s) en tu colección · ${des.length} deseo(s) · ${(bytes / 1024).toFixed(0)} KB usados en el celular`;
}

// idioma de la app
$$('#aj-idioma-app button').forEach((b) => {
  b.classList.toggle('sel', b.dataset.l === LANG_UI);
  b.addEventListener('click', () => cambiarIdiomaApp(b.dataset.l));
});
iniciarI18n(); // traduce todo lo que ya está en pantalla y lo que aparezca después

$('#btn-ajustes').addEventListener('click', () => irA($('#vista-ajustes').classList.contains('activa') ? 'escanear' : 'ajustes'));

$('#aj-moneda').addEventListener('change', async (e) => {
  MONEDA = e.target.value;
  try { localStorage.setItem('moneda', MONEDA); } catch { /* sin almacenamiento */ }
  const t = await getTasas(); pintarDolar(t); pintarSesion(); pintarAjustes();
});
$$('#aj-fuente button').forEach((b) => b.addEventListener('click', () => {
  guardar('fuentePrecio', b.dataset.v);
  $$('#aj-fuente button').forEach((x) => x.classList.toggle('sel', x === b));
  guardar('ultimaActualizacion', 0); // la próxima vez que abras la colección, se recalcula con la nueva fuente
}));
$('#aj-horas').addEventListener('change', (e) => guardar('horasAuto', +e.target.value));
$('#aj-pct').addEventListener('input', (e) => { $('#aj-pct-txt').textContent = `${e.target.value}%`; });
$('#aj-pct').addEventListener('change', (e) => { guardar('ventaPct', +e.target.value); pintarSesion(); });
$('#aj-autoguardar').addEventListener('change', (e) => { $('#auto-guardar').checked = e.target.checked; guardar('autoGuardar', e.target.checked); });
$('#aj-autoscan').addEventListener('change', (e) => { autoOn = e.target.checked; guardar('autoScan', autoOn); firmaUltima = null; pintarAuto(); });
$('#aj-vibrar').addEventListener('change', (e) => { guardar('vibrar', e.target.checked); if (e.target.checked && navigator.vibrate) navigator.vibrate(35); });

$('#aj-cache').addEventListener('click', () => {
  const borrar = [];
  for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^sets-|^tasas$/.test(k)) borrar.push(k); }
  borrar.forEach((k) => localStorage.removeItem(k));
  Object.keys(setsP).forEach((k) => delete setsP[k]);
  getTasas(true).then(pintarDolar);
  alert(`Caché borrada (${borrar.length} elementos). Tu colección no se tocó.`);
  pintarAjustes();
});
$('#aj-borrar').addEventListener('click', () => {
  const n = leer('coleccion', []).length; if (!n) return alert('Tu colección ya está vacía.');
  if (!confirm(`¿Borrar las ${n} cartas de tu colección? Esto no se puede deshacer.\n\nConsejo: primero usa «Exportar» para guardar una copia.`)) return;
  if ((prompt('Para confirmar escribe BORRAR') || '').trim().toUpperCase() !== 'BORRAR') return alert('No se borró nada.');
  guardar('coleccion', []); guardar('ultimaActualizacion', 0);
  alert('Colección borrada.'); pintarAjustes();
});
