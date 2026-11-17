/* CardCalc — 🤖 armar un mazo automáticamente con TUS cartas, y 📚 plantillas de mazos conocidos.
   El resultado es un mazo normal: se puede editar a mano igual que cualquier otro. */
'use strict';

/* ---------- nombres en inglés de tus cartas (para comparar con listas en inglés) ---------- */
let NOMBRES_EN_CARTA = leer('nombresEnCarta', {});
async function cargarNombresEn(col, max = 60) {
  const faltan = [...new Set(col.filter((c) => (c.idioma || 'es') !== 'en' && c.id && !NOMBRES_EN_CARTA[c.id]).map((c) => c.id))].slice(0, max);
  for (let i = 0; i < faltan.length; i += 8) {
    await Promise.all(faltan.slice(i, i + 8).map(async (id) => {
      try { const c = await getJSON(`${apiDe('en')}/cards/${encodeURIComponent(id)}`); if (c && c.name) NOMBRES_EN_CARTA[id] = c.name; } catch { NOMBRES_EN_CARTA[id] = NOMBRES_EN_CARTA[id] || ''; }
    }));
  }
  if (faltan.length) guardar('nombresEnCarta', NOMBRES_EN_CARTA);
}

/* ---------- datos completos de tus cartas (fase, evolución, entrenador, costos) con caché ---------- */
const _cacheCarta = new Map();
async function cartaFull(id, lang) {
  const k = `${lang}|${id}`;
  if (!_cacheCarta.has(k)) _cacheCarta.set(k, getJSON(`${apiDe(lang)}/cards/${encodeURIComponent(id)}`).then((c) => { c._lang = lang; return c; }).catch(() => null));
  return _cacheCarta.get(k);
}
const faseDe = (c) => (/2/.test(c.stage || '') ? 2 : /1/.test(c.stage || '') ? 1 : 0);
const esPokemon = (c) => /pok/i.test(sinTildes(c.category || ''));
const esEntrenador = (c) => /entrenador|trainer/i.test(c.category || '');
const tipoComunidad = (t) => TIPO_JA[t] || t; // Fuego, Eléctrico, Siniestro… (también desde inglés/japonés)
// energía básica de Scarlet & Violet (sve-001…008) por tipo
const ENERGIA_SVE = { Planta: 1, Fuego: 2, Agua: 3, Eléctrico: 4, Psíquico: 5, Lucha: 6, Siniestro: 7, Metal: 8 };
const PRIORIDAD_ENTRENADOR = (c) => {
  const t = sinTildes(c.trainerType || '');
  return /partidario|supporter/.test(t) ? 0 : /objeto|item/.test(t) ? 1 : /herramienta|tool/.test(t) ? 2 : /estadio|stadium/.test(t) ? 3 : 4;
};

async function armarMazoAuto({ tipo = '', formato = 'libre' } = {}, progreso = () => {}) {
  const col = leer('coleccion', []);
  const tasas = await getTasas();
  // copias por carta (id + idioma)
  const copias = new Map();
  for (const c of col) { const k = `${c.idioma || 'es'}|${c.id}`; copias.set(k, (copias.get(k) || 0) + 1); }
  const claves = [...copias.keys()];
  const cartas = []; let n = 0;
  for (let i = 0; i < claves.length; i += 8) {
    await Promise.all(claves.slice(i, i + 8).map(async (k) => {
      const [lang, id] = [k.slice(0, k.indexOf('|')), k.slice(k.indexOf('|') + 1)];
      const full = await cartaFull(id, lang); n++; progreso(n, claves.length);
      if (full) cartas.push({ full, n: copias.get(k) });
    }));
  }
  const legal = (c) => formato === 'libre' || !c.legal || c.legal[formato === 'estandar' ? 'standard' : 'expanded'];
  const usables = cartas.filter((x) => legal(x.full));
  const pokes = usables.filter((x) => esPokemon(x.full));
  if (!pokes.length) throw new Error('No tienes Pokémon en tu colección (o ninguno es legal en ese formato).');

  // líneas evolutivas con TODOS tus básicos: básico → fase 1 → fase 2 (por nombre).
  // El tipo de la línea es el de su evolución final (Charmander/Charmeleon cuentan para Charizard ex aunque sean de otro tipo).
  const nom = (c) => sinTildes(c.name);
  const tiposDe_ = (x) => (x.full.types || []).map(tipoComunidad);
  const lineas = pokes.filter((x) => faseDe(x.full) === 0).map((b) => {
    const f1 = pokes.filter((x) => faseDe(x.full) === 1 && sinTildes(x.full.evolveFrom || '') === nom(b.full));
    const f2 = pokes.filter((x) => faseDe(x.full) === 2 && f1.some((y) => sinTildes(x.full.evolveFrom || '') === nom(y.full)));
    const miembros = [b, ...f1, ...f2];
    const final = f2[0] || f1[0] || b;
    const valor = miembros.reduce((s, x) => s + (precioUSD(x.full, tasas, null, x.full._lang).usd || 0), 0);
    const reglas = miembros.filter((x) => x.full.suffix).length; // ex / V / VSTAR…
    return { miembros, tipos: [...new Set([...tiposDe_(final), ...miembros.flatMap(tiposDe_)])], tipoFinal: tiposDe_(final)[0], puntaje: valor + reglas * 5 + (f2.length ? 3 : f1.length ? 1.5 : 0) };
  }).sort((a, b) => b.puntaje - a.puntaje);

  // tipo principal: el de las mejores líneas (o el que elegiste)
  const puntajeTipo = new Map();
  for (const l of lineas) if (l.tipoFinal && l.tipoFinal !== 'Normal') puntajeTipo.set(l.tipoFinal, (puntajeTipo.get(l.tipoFinal) || 0) + l.puntaje);
  const elegido = tipo || [...puntajeTipo.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || lineas[0]?.tipoFinal || 'Normal';
  const lineasTipo = lineas.filter((l) => l.tipos.includes(elegido) || l.tipoFinal === 'Normal');
  const delTipo = pokes.filter((x) => tiposDe_(x).some((t) => t === elegido || t === 'Normal'));

  const elegidos = []; const porNombre = new Map();
  const meter = (x, max) => {
    const ya = porNombre.get(nom(x.full)) || 0; const k = Math.min(x.n, 4 - ya, max);
    if (k <= 0) return 0;
    porNombre.set(nom(x.full), ya + k); elegidos.push({ full: x.full, n: k }); return k;
  };
  let nPoke = 0;
  for (const l of lineasTipo) {
    if (nPoke >= 18) break;
    for (const x of l.miembros) nPoke += meter(x, 18 - nPoke);
  }
  // Pokémon sueltos de apoyo (incoloros/del tipo) si faltan
  for (const x of delTipo) { if (nPoke >= 14) break; if (!elegidos.some((e) => e.full.id === x.full.id)) nPoke += meter(x, 14 - nPoke); }

  // entrenadores: partidarios, objetos, herramientas, estadios
  const entrenadores = usables.filter((x) => esEntrenador(x.full)).sort((a, b) => PRIORIDAD_ENTRENADOR(a.full) - PRIORIDAD_ENTRENADOR(b.full) || b.n - a.n);
  let nEnt = 0;
  for (const x of entrenadores) { if (nPoke + nEnt >= 50) break; nEnt += meter(x, 50 - nPoke - nEnt); }

  // energía: según los costos de ataque de los Pokémon elegidos
  const costos = new Map();
  for (const e of elegidos.filter((x) => esPokemon(x.full))) for (const a of e.full.attacks || []) for (const c of a.cost || []) {
    const t = tipoComunidad(c); if (ENERGIA_SVE[t]) costos.set(t, (costos.get(t) || 0) + e.n);
  }
  const tipoEnergia = [...costos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || (ENERGIA_SVE[elegido] ? elegido : 'Psíquico');
  const energias = Math.max(8, Math.min(14, 60 - nPoke - nEnt)); // un mazo normal lleva ~8–14
  // tus energías básicas de ese tipo cuentan; las demás quedan como "faltan"
  const energiaCarta = await cartaFull(`sve-00${ENERGIA_SVE[tipoEnergia]}`, 'en');

  const estrella = lineasTipo[0] ? lineasTipo[0].miembros[lineasTipo[0].miembros.length - 1].full.name : elegido;
  const mazo = { id: nuevoId(), nombre: `🤖 Mazo ${estrella}`, auto: true, cartas: [], fecha: Date.now() };
  for (const e of elegidos) {
    const p = precioUSD(e.full, tasas, null, e.full._lang);
    const ya = mazo.cartas.find((c) => c.id === e.full.id && c.lang === e.full._lang);
    if (ya) ya.n += e.n; else mazo.cartas.push(cartaDeMazo(e.full, p, e.n));
  }
  if (energiaCarta) mazo.cartas.push(cartaDeMazo(energiaCarta, precioUSD(energiaCarta, tasas, null, 'en'), energias));
  guardarMazos([mazo, ...leerMazos()]);
  return { mazo, elegido: estrella, tipoEnergia, nPoke, nEnt, energias, total: nPoke + nEnt + energias };
}

function ventanaAuto() {
  const col = leer('coleccion', []);
  const tipos = [...new Set(col.flatMap((c) => (c.types || []).map(tipoComunidad)))].filter((t) => t !== 'Normal').sort((a, b) => a.localeCompare(b, 'es'));
  const cuerpo = abrirModal(`
    <div class="carta">
      <h2>🤖 Armar un mazo con mis cartas</h2>
      <p class="meta">Revisa tu colección, arma las líneas evolutivas que tienes (básico → fase 1 → fase 2), prioriza tus ex/V y las más valiosas, agrega tus entrenadores y calcula la energía según los ataques. Luego puedes editarlo a mano.</p>
      <div class="campo"><span>Tipo principal</span>
        <select id="auto-tipo"><option value="">✨ El mejor que tenga</option>${tipos.map((t) => `<option value="${esc(t)}">${TIPO_ICONO[t] || '•'} ${esc(t)}</option>`).join('')}</select></div>
      <div class="campo"><span>Formato</span>
        <div class="segmento" id="auto-formato"><button data-v="libre" class="sel">Libre</button><button data-v="estandar">Estándar</button><button data-v="expandido">Expandido</button></div></div>
      <div class="botones"><button class="guardar" id="auto-ok">🤖 Armar mazo</button></div>
      <p class="meta" id="auto-estado"></p>
    </div>`);
  let formato = 'libre';
  $$('#auto-formato button', cuerpo).forEach((b) => b.addEventListener('click', () => { formato = b.dataset.v; $$('#auto-formato button', cuerpo).forEach((x) => x.classList.toggle('sel', x === b)); }));
  $('#auto-ok', cuerpo).addEventListener('click', async (e) => {
    if (!leer('coleccion', []).length) return alert('Tu colección está vacía.');
    e.target.disabled = true; const est = $('#auto-estado', cuerpo);
    try {
      const r = await armarMazoAuto({ tipo: $('#auto-tipo', cuerpo).value, formato }, (i, n) => { est.textContent = `Revisando tus cartas… ${i}/${n}`; });
      alert(`Mazo ${r.elegido} armado: ${r.nPoke} Pokémon, ${r.nEnt} entrenadores y ${r.energias} energías de ${r.tipoEnergia} (${r.total} cartas).${r.total < 60 ? `\n\nTe faltan ${60 - r.total} cartas para llegar a 60: agrega más entrenadores o Pokémon.` : ''}`);
      pintarMazos(); abrirMazo(r.mazo.id);
    } catch (er) { est.textContent = er.message; e.target.disabled = false; }
  });
}

/* ---------- 📚 plantillas: listas de referencia (meta 2024–2025). La app verifica la legalidad actual. ---------- */
const PLANTILLAS = [
  { nombre: 'Charizard ex', tipo: 'Fuego', desc: 'Charizard ex con Pidgeot ex para buscar cartas. Fase 2 con Caramelo Raro.', lista: `
4 Charmander PAF 7
1 Charmeleon PAF 8
3 Charizard ex OBF 125
2 Pidgey MEW 16
2 Pidgeot ex OBF 164
1 Fezandipiti ex SFA 38
4 Arven SVI 166
4 Iono PAL 185
2 Boss's Orders PAL 172
1 Professor's Research SVI 189
4 Rare Candy SVI 191
4 Ultra Ball SVI 196
3 Nest Ball SVI 181
2 Buddy-Buddy Poffin TEF 144
2 Night Stretcher SFA 61
1 Super Rod PAL 188
1 Counter Catcher PAR 160
2 Earthen Vessel PAR 163
1 Defiance Band SVI 169
1 Lost Vacuum CRZ 135
2 Pal Pad SVI 182
2 Switch SVI 194
1 Prime Catcher TEF 157
2 Pokégear 3.0 SVI 186
1 Area Zero Underdepths SCR 131
7 Basic {R} Energy SVE 2` },
  { nombre: 'Gardevoir ex', tipo: 'Psíquico', desc: 'Gardevoir ex acelera energía Psíquica desde el descarte.', lista: `
4 Ralts SVI 84
2 Kirlia SVI 85
2 Gardevoir ex SVI 86
2 Drifloon SVI 89
1 Scream Tail PAR 86
1 Munkidori TWM 95
1 Mew ex MEW 151
4 Arven SVI 166
4 Iono PAL 185
2 Boss's Orders PAL 172
1 Professor's Research SVI 189
4 Rare Candy SVI 191
4 Ultra Ball SVI 196
3 Nest Ball SVI 181
2 Buddy-Buddy Poffin TEF 144
2 Night Stretcher SFA 61
1 Super Rod PAL 188
2 Earthen Vessel PAR 163
1 Counter Catcher PAR 160
2 Bravery Charm PAL 173
1 Artazon PAL 171
10 Basic {P} Energy SVE 5
4 Basic {D} Energy SVE 7` },
  { nombre: 'Dragapult ex', tipo: 'Dragón', desc: 'Dragapult ex reparte contadores de daño en la banca rival.', lista: `
4 Dreepy TWM 128
2 Drakloak TWM 129
3 Dragapult ex TWM 130
2 Duskull SFA 18
1 Dusclops SFA 19
1 Dusknoir SFA 20
1 Fezandipiti ex SFA 38
4 Arven SVI 166
4 Iono PAL 185
3 Boss's Orders PAL 172
1 Professor's Research SVI 189
4 Rare Candy SVI 191
4 Ultra Ball SVI 196
3 Nest Ball SVI 181
4 Buddy-Buddy Poffin TEF 144
2 Night Stretcher SFA 61
1 Super Rod PAL 188
1 Counter Catcher PAR 160
2 Switch SVI 194
1 Prime Catcher TEF 157
1 Area Zero Underdepths SCR 131
2 Pokégear 3.0 SVI 186
5 Basic {R} Energy SVE 2
4 Basic {P} Energy SVE 5` },
  { nombre: 'Pikachu ex', tipo: 'Eléctrico', desc: 'Pikachu ex con Miraidon ex e Iron Hands ex. Mazo de básicos, fácil de armar.', lista: `
3 Pikachu ex SSP 57
2 Iron Hands ex PAR 70
2 Miraidon ex SVI 81
1 Squawkabilly ex PAL 169
1 Fezandipiti ex SFA 38
4 Iono PAL 185
3 Arven SVI 166
2 Boss's Orders PAL 172
2 Professor's Research SVI 189
4 Ultra Ball SVI 196
4 Nest Ball SVI 181
4 Electric Generator SVI 170
2 Switch SVI 194
1 Super Rod PAL 188
2 Night Stretcher SFA 61
1 Counter Catcher PAR 160
1 Prime Catcher TEF 157
2 Pokégear 3.0 SVI 186
2 Rescue Board TEF 159
2 Bravery Charm PAL 173
15 Basic {L} Energy SVE 4` },
];

function ventanaPlantillas() {
  const cuerpo = abrirModal(`
    <div class="carta">
      <h2>📚 Plantillas de mazos</h2>
      <p class="meta">Listas de referencia de mazos conocidos (meta 2024–2025). Al elegir una, la app la compara con tu colección y te dice qué tienes, qué te falta y cuánto cuesta completarla. El formato Estándar rota cada año: la app verifica si hoy es legal.</p>
      <div class="lista-plantillas">${PLANTILLAS.map((p, i) => `
        <button class="plantilla" data-i="${i}">
          <b>${TIPO_ICONO[p.tipo] || '•'} ${esc(p.nombre)}</b>
          <span class="meta">${esc(p.desc)}</span>
        </button>`).join('')}</div>
      <p class="meta">¿Quieres otra lista? Copia cualquiera (por ejemplo de un torneo) y usa «📋 Importar lista».</p>
      <p class="meta" id="pl-estado"></p>
    </div>`);
  $$('.plantilla', cuerpo).forEach((b) => b.addEventListener('click', async () => {
    const p = PLANTILLAS[+b.dataset.i];
    $$('.plantilla', cuerpo).forEach((x) => { x.disabled = true; });
    const est = $('#pl-estado', cuerpo); est.innerHTML = '<span class="cargando">Comparando con tu colección</span>';
    await cargarNombresEn(leer('coleccion', [])).catch(() => {});
    const div = document.createElement('p'); div.id = 'imp-progreso'; div.className = 'meta'; cuerpo.appendChild(div);
    const { mazo, fallidas } = await importarMazo(p.lista, `📚 ${p.nombre}`);
    if (fallidas.length) alert(`No se encontraron ${fallidas.length} línea(s):\n${fallidas.join('\n')}`);
    pintarMazos(); abrirMazo(mazo.id);
  }));
}

$('#btn-mazo-auto').addEventListener('click', ventanaAuto);
$('#btn-plantillas').addEventListener('click', ventanaPlantillas);
