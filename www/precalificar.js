/* CardCalc — 📐 pre-calificación tipo PSA con una foto + 📈 tendencia del mercado.
   Portado de PokéVision Pi (miniproyecto 3, vision/grading.py): PSA mira centrado, esquinas, bordes y superficie.
   - El CENTRADO se mide con geometría: el grosor del borde a cada lado de la carta (criterio público de PSA:
     55/45 → 10, 60/40 → 9, 65/35 → 8, 70/30 → 7, 80/20 → 6).
   - Esquinas, bordes y superficie son indicios calculados sobre la imagen (en PokéVision los afinaba una red; aquí,
     sin red, quedan las medidas geométricas). Es PRE-calificación: sirve para decidir qué mandar a calificar.
   - Grado final con la regla de PSA: no puede superar en más de un punto al peor subgrado.
   Todo corre en el celular: la foto no sale del teléfono. */
'use strict';

const PSA_ETIQUETAS = {
  10: 'GEM MINT', 9: 'MINT', 8: 'NM-MT', 7: 'NEAR MINT', 6: 'EX-MT',
  5: 'EXCELLENT', 4: 'VG-EX', 3: 'VERY GOOD', 2: 'GOOD', 1: 'POOR',
};
const SUBGRADOS = [['centrado', 'Centrado'], ['esquinas', 'Esquinas'], ['bordes', 'Bordes'], ['superficie', 'Superficie']];
const COSTO_GRADEO_USD = 25; // servicio "Value" de PSA aprox. + algo de envío; se puede cambiar en la ficha

/* ---------- utilidades de imagen ---------- */
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function pixeles(fuente, w, h, sx = 0, sy = 0, sw, sh) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); // las imágenes con transparencia se componen sobre blanco (como flatten())
  g.drawImage(fuente, sx, sy, sw ?? (fuente.naturalWidth || fuente.width), sh ?? (fuente.naturalHeight || fuente.height), 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  const rgb = new Float32Array(w * h * 3), gris = new Float32Array(w * h);
  for (let i = 0, j = 0, k = 0; i < d.length; i += 4, j += 3, k++) {
    const r = d[i] / 255, gg = d[i + 1] / 255, b = d[i + 2] / 255;
    rgb[j] = r; rgb[j + 1] = gg; rgb[j + 2] = b; gris[k] = (r + gg + b) / 3;
  }
  return { rgb, gris, w, h };
}

/* Recorta la carta del fondo: el fondo es el color del borde de la foto; la carta, lo que se aleja de él. */
function cajaCarta(img) {
  const W0 = img.naturalWidth || img.width, H0 = img.naturalHeight || img.height;
  const e = Math.min(1, 640 / Math.max(W0, H0));
  const w = Math.max(40, Math.round(W0 * e)), h = Math.max(40, Math.round(H0 * e));
  const { rgb } = pixeles(img, w, h);
  // el fondo se toma de las 4 ESQUINAS de la foto (no de todo el contorno): si la imagen ya es la carta sola,
  // las esquinas redondeadas son fondo y el borde de la carta no se confunde con él
  const q = Math.max(3, Math.round(Math.min(w, h) * 0.03));
  const R = [], G = [], B = [];
  for (const [cx, cy] of [[0, 0], [w - q, 0], [0, h - q], [w - q, h - q]]) for (let y = cy; y < cy + q; y++) for (let x = cx; x < cx + q; x++) {
    const i = (y * w + x) * 3; R.push(rgb[i]); G.push(rgb[i + 1]); B.push(rgb[i + 2]);
  }
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const fondo = [med(R), med(G), med(B)];
  const esCarta = (i) => Math.max(Math.abs(rgb[i] - fondo[0]), Math.abs(rgb[i + 1] - fondo[1]), Math.abs(rgb[i + 2] - fondo[2])) > 0.16;
  const fil = new Float32Array(h), col = new Float32Array(w);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (esCarta((y * w + x) * 3)) { fil[y]++; col[x]++; }
  const primero = (arr, n, lim) => { for (let i = 0; i < arr.length; i++) if (arr[i] / n > lim) return i; return -1; };
  const ultimo = (arr, n, lim) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] / n > lim) return i; return -1; };
  const y0 = primero(fil, w, 0.35), y1 = ultimo(fil, w, 0.35), x0 = primero(col, h, 0.35), x1 = ultimo(col, h, 0.35);
  const entera = { x: 0, y: 0, w: W0, h: H0, recortada: false };
  if (y0 < 0 || x0 < 0 || y1 <= y0 || x1 <= x0) return entera;
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, prop = bw / bh;
  if (bw * bh < w * h * 0.3 || prop < 0.55 || prop > 0.9) return entera; // no parece una carta: mejor no inventar
  return { x: x0 / e, y: y0 / e, w: bw / e, h: bh / e, recortada: true };
}

/* Grosor del borde de la carta a cada lado (izq, der, arriba, abajo) en píxeles; null si no se puede medir.
   PokéVision buscaba solo el borde AMARILLO; las cartas desde Escarlata y Púrpura (2023) lo tienen PLATEADO.
   Aquí el color del borde se toma de la propia carta (una franja justo dentro del filo), así sirve para los dos. */
function marcoInterior(rgb, w, h) {
  const salto0 = 3, R = [], G = [], B = [];
  for (let y = salto0; y < h - salto0; y++) for (let x = salto0; x < w - salto0; x++) {
    const enFranja = (x < salto0 + 4 || x >= w - salto0 - 4 || y < salto0 + 4 || y >= h - salto0 - 4);
    if (!enFranja) continue;
    // las esquinas redondeadas no cuentan
    if ((x < w * 0.08 || x > w * 0.92) && (y < h * 0.06 || y > h * 0.94)) continue;
    const i = (y * w + x) * 3; R.push(rgb[i]); G.push(rgb[i + 1]); B.push(rgb[i + 2]);
  }
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const color = [med(R), med(G), med(B)];
  const am = new Uint8Array(w * h); let total = 0;
  for (let k = 0, i = 0; k < w * h; k++, i += 3) {
    if (Math.max(Math.abs(rgb[i] - color[0]), Math.abs(rgb[i + 1] - color[1]), Math.abs(rgb[i + 2] - color[2])) < 0.13) { am[k] = 1; total++; }
  }
  if (total / (w * h) < 0.04) return null; // no hay un borde de color parejo
  const col = new Float32Array(w), fil = new Float32Array(h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (am[y * w + x]) { col[x]++; fil[y]++; }
  for (let x = 0; x < w; x++) col[x] /= h;
  for (let y = 0; y < h; y++) fil[y] /= w;
  const corrida = (perfil, lim) => { let n = 0; for (let i = 0; i < Math.min(lim, perfil.length); i++) { if (perfil[i] < 0.45) break; n++; } return n; };
  const salto = 3, limW = Math.floor(w * 0.3), limH = Math.floor(h * 0.3);
  const izq = corrida(col.slice(salto), limW) + salto, der = corrida(col.slice().reverse().slice(salto), limW) + salto;
  const arr = corrida(fil.slice(salto), limH) + salto, abj = corrida(fil.slice().reverse().slice(salto), limH) + salto;
  const fino = Math.min(izq, der, arr, abj) <= salto + 1;
  const grueso = Math.max(izq, der) > w * 0.28 || Math.max(arr, abj) > h * 0.28;
  return fino || grueso ? null : { izq, der, arr, abj };
}

function mediaZona(gris, w, x, y, zw, zh) {
  let s = 0, n = 0;
  for (let j = y; j < y + zh; j++) for (let i = x; i < x + zw; i++) { s += gris[j * w + i]; n++; }
  return n ? s / n : 0;
}
function desviacion(vals) {
  let s = 0, s2 = 0; for (const v of vals) { s += v; s2 += v * v; }
  const m = s / vals.length; return Math.sqrt(Math.max(0, s2 / vals.length - m * m));
}
function percentil(arr, p) { const a = Float32Array.from(arr).sort(); return a[Math.min(a.length - 1, Math.floor(p / 100 * (a.length - 1)))]; }

/* Subgrados de una foto (img = HTMLImageElement o canvas). */
function subgradosFoto(img) {
  const caja = cajaCarta(img);
  const W = 420, H = 587;
  const { rgb, gris } = pixeles(img, W, H, caja.x, caja.y, caja.w, caja.h);
  const out = { recortada: caja.recortada };

  // ---- centrado medido
  const fr = marcoInterior(rgb, W, H);
  let centrado;
  if (fr) {
    const lr = 100 * fr.izq / Math.max(fr.izq + fr.der, 1e-6);
    const tb = 100 * fr.arr / Math.max(fr.arr + fr.abj, 1e-6);
    const pct = 50 + Math.max(Math.abs(lr - 50), Math.abs(tb - 50));
    centrado = 3;
    for (const [lim, g] of [[55, 10], [60, 9], [65, 8], [70, 7], [80, 6], [90, 4]]) if (pct <= lim) { centrado = g; break; }
    out.centradoLR = `${Math.round(lr)}/${Math.round(100 - lr)}`;
    out.centradoTB = `${Math.round(tb)}/${Math.round(100 - tb)}`;
  } else {
    centrado = 8; // sin marco medible no se castiga
    out.centradoLR = null;
  }
  out.centrado = centrado;

  // ---- esquinas: blanqueo del vértice comparado con la franja recta del mismo borde (metido hacia dentro por el redondeo)
  const c = Math.max(8, Math.floor(Math.min(W, H) * 0.055)), ins = Math.floor(c * 0.9);
  const esquinas = [[ins, ins], [W - ins - c, ins], [ins, H - ins - c], [W - ins - c, H - ins - c]].map(([x, y]) => mediaZona(gris, W, x, y, c, c));
  const mx = Math.floor(W / 2 - c / 2), my = Math.floor(H / 2 - c / 2);
  const refs = [[mx, ins], [mx, H - ins - c], [ins, my], [W - ins - c, my]].map(([x, y]) => mediaZona(gris, W, x, y, c, c)).sort((a, b) => a - b);
  const ref = (refs[1] + refs[2]) / 2;
  const peorEsq = Math.max(0, ...esquinas.map((v) => v - ref));
  out.esquinas = +clamp(10 - peorEsq * 24, 1, 10).toFixed(1);

  // ---- bordes: el perímetro debería ser una franja pareja (comparado con la variación del arte)
  // franja del borde: 2 px hacia dentro del filo (el recorte deja algo de fondo) y SIN las esquinas redondeadas
  const b = Math.max(4, Math.floor(Math.min(W, H) * 0.025)), f0 = 2, ex = Math.floor(W * 0.08), ey = Math.floor(H * 0.06);
  const borde = [];
  for (let y = f0; y < H - f0; y++) for (let x = f0; x < W - f0; x++) {
    if (!(y < f0 + b || y >= H - f0 - b || x < f0 + b || x >= W - f0 - b)) continue;
    if ((x < ex || x >= W - ex) && (y < ey || y >= H - ey)) continue;
    borde.push(gris[y * W + x]);
  }
  const interior = [];
  for (let y = b * 3; y < H - b * 3; y += 2) for (let x = b * 3; x < W - b * 3; x += 2) interior.push(gris[y * W + x]);
  const ratio = desviacion(borde) / (desviacion(interior) + 1e-6);
  out.bordes = +clamp(10 - Math.max(0, ratio - 0.35) * 11, 1, 10).toFixed(1);

  // ---- superficie: un rayón es un pico de alta frecuencia muy por encima del detalle normal del arte
  const ay0 = Math.floor(H * 0.12), ay1 = Math.floor(H * 0.58), ax0 = Math.floor(W * 0.08), ax1 = Math.floor(W * 0.92);
  const lap = [];
  for (let y = ay0 + 1; y < ay1 - 1; y++) for (let x = ax0 + 1; x < ax1 - 1; x++) {
    const i = y * W + x;
    lap.push(Math.abs(gris[i - W] + gris[i + W] + gris[i - 1] + gris[i + 1] - 4 * gris[i]));
  }
  const exceso = percentil(lap, 99.9) / (percentil(lap, 75) + 1e-6);
  out.superficie = +clamp(10 - Math.max(0, exceso - 9) * 0.42, 1, 10).toFixed(1);
  return out;
}

/* Regla de PSA: el peor subgrado manda; el global sube como mucho un punto sobre él. Medios puntos. */
function gradoPSA(s) {
  const v = SUBGRADOS.map(([k]) => s[k]);
  const lo = Math.min(...v), media = v.reduce((a, x) => a + x, 0) / v.length;
  let g = clamp(Math.round(Math.min(lo + 1, media) * 2) / 2, 1, 10);
  if (g === 9.5) g = 9; // PSA no da 9.5
  return g;
}

/* ---------- foto: cámara o galería ---------- */
function pedirFoto(fuente) {
  const cam = typeof nativo !== 'undefined' && nativo && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera;
  if (cam) {
    return cam.getPhoto({ quality: 92, width: 2000, resultType: 'dataUrl', source: fuente === 'galeria' ? 'PHOTOS' : 'CAMERA', correctOrientation: true, saveToGallery: false })
      .then((f) => f.dataUrl).catch((e) => { if (!/cancel/i.test(String(e && e.message))) alert(`No se pudo abrir la ${fuente === 'galeria' ? 'galería' : 'cámara'}: ${e.message || e}`); return null; });
  }
  return new Promise((ok) => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    if (fuente !== 'galeria') inp.capture = 'environment';
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0]; if (!f) return ok(null);
      const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => ok(null); r.readAsDataURL(f);
    });
    inp.click();
  });
}

/* ---------- sección en la ficha ---------- */
function conectarPrecal(destino, carta, tasas, getP, fotoEscaneo) {
  const bt = $('[data-acc="precal"]', destino); if (!bt) return;
  bt.addEventListener('click', () => {
    let caja = $('.precal', destino);
    if (caja) { caja.remove(); bt.classList.remove('sel'); return; }
    bt.classList.add('sel');
    caja = document.createElement('div'); caja.className = 'precal';
    $('.acciones-carta', destino).after(caja);
    const elegir = () => {
      caja.innerHTML = `
        <p class="titulo-sec" style="margin-top:0">📐 Pre-calificación tipo PSA</p>
        <p class="meta">Toma una foto de frente, sin funda, sobre un fondo oscuro y liso, con luz pareja y sin reflejos. Mide el centrado y revisa esquinas, bordes y superficie.</p>
        <div class="botones">
          ${fotoEscaneo ? '<button class="guardar" data-f="escaneo">Usar la foto que escaneé</button>' : ''}
          <button data-f="camara">📷 Tomar foto</button>
          <button data-f="galeria">🖼️ Galería</button>
        </div>`;
      $$('[data-f]', caja).forEach((b) => b.addEventListener('click', async () => {
        const src = b.dataset.f === 'escaneo' ? fotoEscaneo : await pedirFoto(b.dataset.f);
        if (!src) return;
        caja.innerHTML = '<p class="cargando">Midiendo la carta</p>';
        try {
          const img = typeof src === 'string' ? await cargarImagen(src) : src;
          await new Promise((r) => setTimeout(r, 30)); // deja pintar el "midiendo"
          pintarPrecal(caja, subgradosFoto(img), typeof src === 'string' ? src : src.toDataURL('image/jpeg', 0.8), getP().usd, tasas, elegir);
        } catch (e) {
          caja.innerHTML = `<p class="estado error">No pude medir la foto: ${esc(e.message || e)}</p>`;
        }
      }));
    };
    elegir();
  });
}

function pintarPrecal(caja, s, src, usd, tasas, otraFoto) {
  const g = gradoPSA(s);
  const peor = SUBGRADOS.reduce((a, b) => (s[b[0]] < s[a[0]] ? b : a));
  const costo = leer('costoGradeoUSD', COSTO_GRADEO_USD);
  const mult = (n) => (typeof multGradeo === 'function' ? multGradeo({ empresa: 'PSA', nota: String(n) }) : 1);
  const enMon = (v) => fmtCOP(v * tasas.COP);
  const est = usd != null ? usd * mult(g) : null;
  const neto = est != null ? est - usd - costo : null;
  const nota = g >= 9.5 ? 'Candidata a gem mint.' : g >= 8.5 ? 'Buen estado.' : g >= 7 ? 'Estado para colección o juego.' : 'Desgaste claro.';
  caja.innerHTML = `
    <p class="titulo-sec" style="margin-top:0">📐 Pre-calificación tipo PSA</p>
    <div class="precal-cab">
      <img class="precal-foto" src="${esc(src)}" alt="">
      <div>
        <div class="psa-num"><small>PSA</small>${String(g).replace('.0', '')}</div>
        <div class="psa-etq">${esc(PSA_ETIQUETAS[Math.floor(g)] || '')}</div>
        <div class="meta">${esc(nota)} <span>Lo que más baja la nota:</span> <b>${esc(peor[1])}</b></div>
      </div>
    </div>
    <div class="subgrados">
      ${SUBGRADOS.map(([k, n]) => `<div class="subgrado ${k === peor[0] ? 'peor' : ''}"><span>${esc(n)}</span><span class="pista-b"><i style="--v:0" data-v="${s[k] / 10}"></i></span><b>${s[k].toFixed(1)}</b></div>`).join('')}
    </div>
    ${s.centradoLR ? `<p class="meta">Centrado medido: <b>izq/der ${esc(s.centradoLR)}</b> · <b>arr/abj ${esc(s.centradoTB)}</b> (PSA 10 pide 55/45 o mejor)</p>`
    : '<p class="meta">No encontré un borde parejo (foto inclinada, con reflejo o borde muy gastado): el centrado no se pudo medir y no baja la nota.</p>'}
    ${s.recortada ? '' : '<p class="meta">⚠️ No distinguí bien la carta del fondo. Para medir mejor, ponla sobre algo oscuro y liso.</p>'}
    ${usd != null ? `
      <p class="titulo-sec">¿Compensa calificarla?</p>
      <div class="valores-psa">
        ${[10, 9, 8].map((n) => `<div><span class="meta">Si saca PSA ${n}</span><b>${enMon(usd * mult(n))}</b></div>`).join('')}
      </div>
      <div class="compensa ${neto > 0 ? 'si' : 'no'}">
        ${neto > 0 ? `✅ <b>Sí compensa</b>: con PSA ${String(g).replace('.0', '')} valdría unos <b>${enMon(est)}</b> y te quedarían <b>${enMon(neto)}</b> más que sin calificar, ya restado el costo.`
    : `❌ <b>No compensa</b>: con PSA ${String(g).replace('.0', '')} valdría unos <b>${enMon(est)}</b>; sumando el costo de calificar perderías <b>${enMon(-neto)}</b>.`}
      </div>
      <div class="campo"><span>Costo de calificar (servicio + envío, en ${esc(MON().plural)})</span>
        <div class="fila-input"><input type="number" inputmode="decimal" min="0" id="pc-costo" value="${+(costo * tasas.COP).toFixed(MON().dec)}"></div></div>` : ''}
    <p class="nota">Es una estimación orientativa hecha en tu celular, no el dictamen de PSA: ellos revisan la carta física con lupa y luz rasante. Los valores calificados usan multiplicadores típicos del mercado.</p>
    <div class="botones"><button data-otra>📷 Otra foto</button></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => $$('.pista-b i', caja).forEach((i) => i.style.setProperty('--v', i.dataset.v))));
  $('[data-otra]', caja).addEventListener('click', otraFoto);
  const inp = $('#pc-costo', caja);
  if (inp) inp.addEventListener('change', () => { guardar('costoGradeoUSD', Math.max(0, parseFloat(inp.value) || 0) / tasas.COP); pintarPrecal(caja, s, src, usd, tasas, otraFoto); });
}

/* ---------- 📈 tendencia: movimiento real de Cardmarket (prom. 30 días → 7 días → último día) ---------- */
function bloqueTendencia(carta, tasas) {
  const cm = carta.pricing && carta.pricing.cardmarket; if (!cm) return '';
  const serie = (suf) => [cm[`avg30${suf}`], cm[`avg7${suf}`], cm[`avg1${suf}`]];
  let v = serie('');
  if (v.filter((x) => x > 0).length < 2) v = serie('-holo');
  if (v.filter((x) => x > 0).length < 2 || !(v[0] > 0)) return '';
  const [a30, a7, a1] = v;
  const ult = a1 > 0 ? a1 : a7;
  const cambio = (ult / a30 - 1) * 100;
  const dir = cambio > 5 ? 'sube' : cambio < -5 ? 'baja' : 'igual';
  const txt = { sube: '▲ Subiendo', baja: '▼ Bajando', igual: '● Estable' }[dir];
  const enMon = (e) => (e > 0 ? fmtCOP(e / tasas.EUR * tasas.COP) : '—');
  const pts = v.map((x, i) => [i, x]).filter(([, x]) => x > 0);
  const lo = Math.min(...pts.map((p) => p[1])), hi = Math.max(...pts.map((p) => p[1]));
  const W = 300, H = 56, px = (i) => 12 + i * (W - 24) / 2, py = (x) => H - 8 - (hi === lo ? 0.5 : (x - lo) / (hi - lo)) * (H - 16);
  const d = pts.map(([i, x], k) => `${k ? 'L' : 'M'}${px(i).toFixed(1)},${py(x).toFixed(1)}`).join(' ');
  const color = dir === 'baja' ? 'var(--rojo)' : dir === 'sube' ? 'var(--verde)' : 'var(--suave)';
  return `
    <div class="tendencia">
      <div class="tend-cab">
        <p class="titulo-sec" style="margin:0">📈 Tendencia del mercado</p>
        <span class="tend-flecha ${dir}">${txt}</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        ${pts.map(([i, x]) => `<circle cx="${px(i).toFixed(1)}" cy="${py(x).toFixed(1)}" r="4.5" fill="${color}"/>`).join('')}
      </svg>
      <div class="tend-pasos">
        <div><span class="meta">Prom. 30 días</span><b>${enMon(a30)}</b></div>
        <div><span class="meta">Prom. 7 días</span><b>${enMon(a7)}</b></div>
        <div><span class="meta">Último día</span><b>${enMon(a1)}</b></div>
      </div>
      <p class="nota">${cambio >= 0 ? '+' : '−'}${Math.abs(cambio).toFixed(0)}% frente al promedio de 30 días en Cardmarket (Europa). Muestra hacia dónde se está moviendo el precio; no garantiza lo que pase después.</p>
    </div>`;
}
