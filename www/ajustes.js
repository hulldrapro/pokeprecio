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
  // calculadora de venta (el envío se guarda en US$ y se muestra en tu moneda)
  $('#aj-comision').value = leer('comision', 0) || '';
  $('#aj-envio').value = leer('envioUSD', 0) ? +(leer('envioUSD', 0) * tasas.COP).toFixed(MON().dec) : '';
  $('#aj-envio').placeholder = `envío (${MONEDA})`;
  // alertas
  $('#aj-notif').checked = leer('notifOn', false);
  $('#aj-mov').value = leer('movPct', 0); $('#aj-mov-txt').textContent = `${leer('movPct', 0)}%`;
  // apariencia
  $$('#aj-tema button').forEach((b) => b.classList.toggle('sel', b.dataset.v === leer('tema', 'oscuro')));
  // copia automática
  $('#aj-backup-auto').checked = leer('backupAuto', true);
  const fb = leer('backupAutoFecha', 0), fe = leer('ultimoExport', 0);
  $('#aj-backup-info').textContent = `Última copia automática: ${fb ? new Date(fb).toLocaleDateString(LOCALE()) : 'aún no'} · última exportación: ${fe ? new Date(fe).toLocaleDateString(LOCALE()) : 'aún no'}`;
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

$('#aj-comision').addEventListener('change', (e) => { guardar('comision', Math.min(50, Math.max(0, parseFloat(e.target.value) || 0))); pintarSesion(); });
$('#aj-envio').addEventListener('change', async (e) => { const t = await getTasas(); guardar('envioUSD', Math.max(0, parseFloat(e.target.value) || 0) / t.COP); pintarSesion(); });
$('#aj-notif').addEventListener('change', async (e) => {
  if (e.target.checked && !(await pedirPermisoNotif())) { e.target.checked = false; alert('Para recibir alertas, permite las notificaciones de CardCalc en los ajustes del celular.'); }
  guardar('notifOn', e.target.checked); sincronizarAlertas();
});
$('#aj-mov').addEventListener('input', (e) => { $('#aj-mov-txt').textContent = `${e.target.value}%`; });
$('#aj-mov').addEventListener('change', (e) => { guardar('movPct', +e.target.value); sincronizarAlertas(); });
$$('#aj-tema button').forEach((b) => b.addEventListener('click', () => {
  guardar('tema', b.dataset.v); aplicarTema();
  $$('#aj-tema button').forEach((x) => x.classList.toggle('sel', x === b));
}));
$('#aj-backup-auto').addEventListener('change', (e) => { guardar('backupAuto', e.target.checked); if (e.target.checked) { guardar('backupAutoFecha', 0); copiaAutomatica().then(pintarAjustes); } });

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
