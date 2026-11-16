/* Reconocimiento de cartas: OCR (tesseract.js) del número "043/094" y del código del set "PFL".
   Pensado para cartas holográficas: además de gris normal usa el canal más oscuro (el texto negro es
   oscuro en R, G y B; el brillo holo de colores no) y umbral adaptativo (ignora reflejos graduales). */
(function () {
  'use strict';
  const abs = (p) => new URL(p, location.href).href;

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

  /* ---------- preprocesado ---------- */
  // modo: 'gris' | 'oscuro' | 'umbral' | 'invertido' | 'umbral-inv'
  function zona(img, [x0, x1, y0, y1], modo = 'gris', ancho = 1800) {
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const sx = Math.max(0, Math.floor(W * x0)), sw = Math.max(1, Math.min(W, Math.floor(W * x1)) - sx);
    const sy = Math.max(0, Math.floor(H * y0)), sh = Math.max(1, Math.min(H, Math.floor(H * y1)) - sy);
    const c = document.createElement('canvas');
    c.width = ancho; c.height = Math.max(1, Math.round(sh * ancho / sw));
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height); const p = d.data; const n = c.width * c.height;
    const v = new Float32Array(n);
    const usarMin = modo === 'oscuro' || modo === 'umbral';
    for (let i = 0, j = 0; j < n; i += 4, j++) {
      v[j] = usarMin ? Math.min(p[i], p[i + 1], p[i + 2]) : 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    }
    if (modo === 'invertido' || modo === 'umbral-inv') for (let j = 0; j < n; j++) v[j] = 255 - v[j];
    let out;
    if (modo === 'umbral' || modo === 'umbral-inv') out = umbralAdaptativo(v, c.width, c.height);
    else out = estirar(v);
    for (let i = 0, j = 0; j < n; i += 4, j++) p[i] = p[i + 1] = p[i + 2] = out[j];
    g.putImageData(d, 0, 0);
    return c;
  }

  function estirar(v) {
    // percentiles 2–98 para que un reflejo puntual no aplane el contraste
    const h = new Uint32Array(256); for (const x of v) h[x | 0]++;
    const lim = v.length * 0.02; let a = 0, b = 255, s = 0;
    for (let i = 0; i < 256; i++) { s += h[i]; if (s > lim) { a = i; break; } }
    s = 0; for (let i = 255; i >= 0; i--) { s += h[i]; if (s > lim) { b = i; break; } }
    const k = 255 / Math.max(1, b - a); const o = new Uint8ClampedArray(v.length);
    for (let j = 0; j < v.length; j++) o[j] = (v[j] - a) * k;
    return o;
  }

  // Bradley–Roth: píxel negro si es T% más oscuro que el promedio de su vecindad
  function umbralAdaptativo(v, w, h, T = 0.15) {
    const S = Math.max(8, Math.round(w / 16)), r = S >> 1;
    const ii = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let fila = 0;
      for (let x = 0; x < w; x++) { fila += v[y * w + x]; ii[(y + 1) * (w + 1) + x + 1] = ii[y * (w + 1) + x + 1] + fila; }
    }
    const o = new Uint8ClampedArray(v.length);
    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - r), y2 = Math.min(h - 1, y + r);
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - r), x2 = Math.min(w - 1, x + r);
        const cnt = (x2 - x1 + 1) * (y2 - y1 + 1);
        const sum = ii[(y2 + 1) * (w + 1) + x2 + 1] - ii[y1 * (w + 1) + x2 + 1] - ii[(y2 + 1) * (w + 1) + x1] + ii[y1 * (w + 1) + x1];
        o[y * w + x] = v[y * w + x] * cnt <= sum * (1 - T) ? 0 : 255;
      }
    }
    return o;
  }

  async function ocr(canvas) {
    const w = await getWorker();
    await w.setParameters({ tessedit_pageseg_mode: '11' });
    const { data } = await w.recognize(canvas);
    return data.text || '';
  }

  /* ---------- lectura de números y códigos ---------- */
  function extraerNumeros(texto) {
    const arreglar = (s) => s.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1').replace(/S/g, '5').replace(/B/g, '8').replace(/Z/g, '2');
    const re = /(TG|GG|SV|RC)?\s?([0-9OoIlSBZ]{1,3})\s*[\/\\]\s*(TG|GG|SV|RC)?\s?([0-9OoIlSBZ]{2,3})(?![0-9])/gi;
    const vistos = new Set(); const out = [];
    const meter = (num, total, pref) => { const k = `${num}/${total}`; if (!vistos.has(k)) { vistos.add(k); out.push({ num, total, pref }); } };
    let m;
    while ((m = re.exec(texto))) {
      const num = arreglar(m[2]); const tot = arreglar(m[4]);
      if (!/^\d+$/.test(num) || !/^\d+$/.test(tot)) continue;
      const total = parseInt(tot, 10);
      if (total < 10) continue;
      const pref = (m[1] || m[3] || '').toUpperCase();
      const n = pref ? pref + num.padStart(2, '0') : String(parseInt(num, 10));
      meter(n, total, pref);
      // el "1" en cursiva de las cartas nuevas se lee como "7": 730/167 → 130/167
      if (!pref && /^7\d\d$/.test(n) && parseInt(n, 10) > total) meter('1' + n.slice(1), total, pref);
    }
    return out;
  }

  // Números sueltos de 3 cifras (para cuando el código del set se lee pero la barra "/" no)
  function numerosSueltos(texto) {
    return [...new Set((texto.match(/(?<![0-9\/])[0-9OoIl]{3}(?![0-9])/g) || [])
      .map((s) => s.replace(/[Oo]/g, '0').replace(/[Il]/g, '1')).filter((s) => /^\d{3}$/.test(s)))]
      .map((s) => String(parseInt(s, 10)));
  }

  // Código del set solo si va pegado al número, como se imprime: "TWM ES 130/167", "PFL EN 043/094"
  function extraerCodigos(texto, codigos) {
    const out = new Set();
    // sin pasar a mayúsculas: el código se imprime en mayúsculas y así "por 10" no cuenta como POR
    for (const m of texto.matchAll(/(?<![A-Za-z0-9])([A-Z0-9]{3})(?:\s+[A-Z]{2})?\s+[0-9OIl]{2,3}\s*[\/\\]?/g)) {
      const c = m[1].replace(/0/g, 'O').replace(/1/g, 'I');
      const id = codigos[m[1]] ? m[1] : codigos[c] ? c : null;
      if (id && /^(sv|me|m\d)/i.test(codigos[id])) out.add(id); // solo las series que imprimen el código
    }
    return [...out];
  }

  /* Alternativas sin votos para errores típicos del OCR en el total:
     dígitos confundidos (198 ↔ 195) y último dígito perdido (130/16 → 130/167). */
  function alternativas(votos, totales) {
    const CONF = { 5: '8', 8: '56', 3: '8', 6: '8' };
    const meter = (n, tot) => { const k = `${n.num}/${tot}`; if ((!totales || totales.has(tot)) && !votos.has(k)) votos.set(k, { ...n, total: tot, votos: 0 }); };
    for (const n of [...votos.values()]) {
      const t = String(n.total);
      for (let i = 0; i < t.length; i++) for (const d of CONF[t[i]] || '') meter(n, parseInt(t.slice(0, i) + d + t.slice(i + 1), 10));
      if (t.length === 2) for (let d = 0; d <= 9; d++) meter(n, n.total * 10 + d);
    }
  }

  /* Zonas del número: abajo-izquierda (cartas 2023+), abajo-derecha (antiguas). */
  const ZONAS = {
    izqFina: [0, 0.45, 0.905, 0.99],
    izq: [0, 0.5, 0.86, 1],
    der: [0.5, 1, 0.86, 1],
  };
  const PASADAS = [
    ['izqFina', 'gris'], ['izqFina', 'umbral'], ['izqFina', 'oscuro'], ['izqFina', 'invertido'],
    ['der', 'gris'], ['der', 'umbral'], ['der', 'invertido'],
    ['izq', 'umbral'], ['izq', 'umbral-inv'],
  ];

  /* Reconoce una foto de carta. Devuelve { lecturas:[{num,total,pref,votos}], codigos:[...], sueltos:[...], arriba, texto } */
  async function reconocer(img, { totales, codigos = {}, progreso = () => {} } = {}) {
    const votos = new Map(); const codVotos = new Map(); const sueltos = new Map();
    let texto = '';
    for (let i = 0; i < PASADAS.length; i++) {
      const [z, modo] = PASADAS[i];
      progreso(i + 1, PASADAS.length);
      const t = await ocr(zona(img, ZONAS[z], modo));
      texto += `\n${t}`;
      for (const n of extraerNumeros(t)) {
        if (totales && !totales.has(n.total)) continue;
        const k = `${n.num}/${n.total}`;
        votos.set(k, { ...n, votos: (votos.get(k)?.votos || 0) + 1 });
      }
      for (const c of extraerCodigos(t, codigos)) codVotos.set(c, (codVotos.get(c) || 0) + 1);
      for (const s of numerosSueltos(t)) sueltos.set(s, (sueltos.get(s) || 0) + 1);
      // corte temprano: código de set + número coinciden en 2 zonas, o un número con 3 votos
      const top = [...votos.values()].sort((a, b) => b.votos - a.votos)[0];
      if (top && (top.votos >= 3 || (top.votos >= 2 && codVotos.size))) break;
    }
    // dígitos que el OCR confunde en el total (198 ↔ 195…): alternativas sin votos
    alternativas(votos, totales);
    progreso(PASADAS.length, PASADAS.length, 'nombre');
    const arriba = await ocr(zona(img, [0, 1, 0, 0.16], 'gris', 1600));
    return {
      lecturas: [...votos.values()].sort((a, b) => b.votos - a.votos),
      codigos: [...codVotos.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]),
      sueltos: [...sueltos.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]),
      arriba,
      texto: `${arriba}\n${texto}`.trim(),
    };
  }

  /* Lectura de una zona tocada por el usuario (fx, fy en fracción de la imagen). */
  async function reconocerZona(img, fx, fy, { totales, codigos = {} } = {}) {
    const r = [Math.max(0, fx - 0.22), Math.min(1, fx + 0.22), Math.max(0, fy - 0.035), Math.min(1, fy + 0.035)];
    const votos = new Map(); const cods = new Set(); const sueltos = new Set(); let texto = '';
    for (const modo of ['gris', 'umbral', 'oscuro', 'invertido', 'umbral-inv']) {
      const t = await ocr(zona(img, r, modo, 1600));
      texto += `\n${t}`;
      for (const n of extraerNumeros(t)) {
        if (totales && !totales.has(n.total)) continue;
        const k = `${n.num}/${n.total}`; votos.set(k, { ...n, votos: (votos.get(k)?.votos || 0) + 1 });
      }
      extraerCodigos(t, codigos).forEach((c) => cods.add(c));
      numerosSueltos(t).forEach((s) => sueltos.add(s));
    }
    alternativas(votos, totales);
    return { lecturas: [...votos.values()].sort((a, b) => b.votos - a.votos), codigos: [...cods], sueltos: [...sueltos], arriba: '', texto: texto.trim() };
  }

  /* ---------- de lecturas a cartas ---------- */
  const sinTildes = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* Consulta TCGdex con las lecturas y devuelve [{carta, puntaje}] de mejor a peor.
     getJSON(url) lo pone la app (con caché/reintentos); sets = lista de /sets. */
  async function identificar(res, { api, sets, codigos = {}, getJSON }) {
    const consultas = new Map(); // "setId/num" -> puntaje base
    const sumar = (setId, num, p) => { const k = `${setId}/${num}`; consultas.set(k, Math.max(consultas.get(k) || 0, p)); };
    // 1) código del set + número (lo más fiable en cartas 2023+, aunque el total se lea mal)
    const nums = [...new Set([...res.lecturas.filter((l) => l.votos).map((l) => l.num), ...res.sueltos])].slice(0, 4);
    for (const c of res.codigos.slice(0, 2)) for (const n of nums) sumar(codigos[c], n, 60);
    // 2) número/total → sets con ese total oficial
    for (const l of res.lecturas.slice(0, 8)) {
      let cand = sets.filter((s) => s.cardCount && s.cardCount.official === l.total);
      if (l.pref === 'TG' || l.pref === 'GG') cand = sets.filter((s) => /(tg|gg)$/i.test(s.id) && s.cardCount && s.cardCount.official === l.total);
      for (const s of cand.slice(0, 6)) sumar(s.id, l.num, 10 + l.votos * 8);
    }
    const lista = [...consultas.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
    const r = await Promise.allSettled(lista.map(([k]) => {
      const [setId, num] = [k.slice(0, k.lastIndexOf('/')), k.slice(k.lastIndexOf('/') + 1)];
      return getJSON(`${api}/sets/${encodeURIComponent(setId)}/${encodeURIComponent(num)}`);
    }));
    const texto = sinTildes(res.texto);
    const porId = new Map();
    r.forEach((x, i) => {
      if (x.status !== 'fulfilled' || !x.value || !x.value.id) return;
      const c = x.value; const nom = sinTildes(c.name);
      let p = lista[i][1];
      if (nom && texto.includes(nom)) p += 100;
      else p += nom.split(/[\s-]+/).filter((w) => w.length >= 4 && texto.includes(w)).length * 25;
      if (!porId.has(c.id) || porId.get(c.id).puntaje < p) porId.set(c.id, { carta: c, puntaje: p });
    });
    return [...porId.values()].sort((a, b) => b.puntaje - a.puntaje);
  }

  window.Reconocer = { reconocer, reconocerZona, identificar, extraerNumeros, extraerCodigos, numerosSueltos, zona, getWorker };
})();
