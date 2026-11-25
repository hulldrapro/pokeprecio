/* CardCalc v2.8 — efectos del diseño nuevo (inspirados en PokéVision Pi):
   aurora de fondo, chispas doradas, píldora deslizante en las pestañas, barrido láser al leer una carta,
   carta holográfica que se inclina con el dedo y precio que "cuenta" hasta su valor.
   Todo se apaga con "Reducir animaciones" (Ajustes) o con el ajuste de accesibilidad del celular. */
'use strict';
(() => {
  const reducido = () => document.body.classList.contains('calma') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { if (JSON.parse(localStorage.getItem('calma') || 'false')) document.body.classList.add('calma'); } catch { /* nada */ }

  /* ---------- aurora + chispas ---------- */
  const aurora = document.createElement('div'); aurora.className = 'aurora'; aurora.setAttribute('aria-hidden', 'true');
  aurora.appendChild(document.createElement('i'));
  document.body.prepend(aurora);

  const cv = document.createElement('canvas'); cv.id = 'chispas'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, ultimo = 0;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const ajustar = () => { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; };
  ajustar(); addEventListener('resize', ajustar, { passive: true });
  const nueva = (enPantalla) => ({
    x: Math.random() * W, y: enPantalla ? Math.random() * H : H + Math.random() * 40,
    s: (1.1 + Math.random() * 3) * dpr, v: (8 + Math.random() * 22) * dpr, dr: (Math.random() - 0.5) * 20 * dpr,
    f: Math.random() * 6.3, vida: 0, ttl: 5 + Math.random() * 7, c: Math.floor(Math.random() * 4),
  });
  const P = Array.from({ length: Math.min(34, Math.max(18, Math.round(innerWidth / 18))) }, () => nueva(true));
  const activa = () => !document.hidden && !reducido() && !document.querySelector('#vista-escanear.activa'); // con la cámara abierta, la batería va para el lector
  function cuadro(t) {
    requestAnimationFrame(cuadro);
    if (!activa()) { if (ultimo) { ctx.clearRect(0, 0, W, H); ultimo = 0; } return; }
    if (t - ultimo < 32) return; // ~30 fps: suficiente para algo que flota
    const dt = Math.min(0.06, (t - ultimo) / 1000 || 0.03); ultimo = t;
    const claro = document.documentElement.dataset.theme === 'claro';
    const colores = claro ? ['#e8b400', '#7f9c00', '#6a5bf0', '#1b4fd0'] : ['#ffd873', '#bfe900', '#8477fb', '#ffffff'];
    ctx.clearRect(0, 0, W, H);
    for (const p of P) {
      p.vida += dt;
      if (p.vida > p.ttl || p.y < -12) Object.assign(p, nueva(false));
      p.y -= p.v * dt; p.x += Math.sin(p.f + p.vida * 2.2) * p.dr * dt;
      const a = (0.35 + 0.65 * Math.abs(Math.sin(p.vida * 2.6 + p.f))) * Math.min(1, p.vida * 1.8) * Math.min(1, Math.max(0, (p.ttl - p.vida) / 1.4)) * (claro ? 0.5 : 0.9);
      ctx.globalAlpha = a; ctx.fillStyle = colores[p.c];
      const r = p.s; // estrella de 4 puntas
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r * 2.2); ctx.quadraticCurveTo(p.x, p.y, p.x + r * 2.2, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + r * 2.2); ctx.quadraticCurveTo(p.x, p.y, p.x - r * 2.2, p.y);
      ctx.quadraticCurveTo(p.x, p.y, p.x, p.y - r * 2.2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(cuadro);

  /* ---------- píldora deslizante de la barra inferior ---------- */
  const barra = document.querySelector('.tabbar');
  const glider = document.createElement('div'); glider.className = 'glider'; barra.prepend(glider);
  const moverGlider = () => {
    const t = barra.querySelector('.tab.activo');
    barra.classList.toggle('sin-glider', !t);
    if (!t) return;
    glider.style.width = `${t.offsetWidth}px`;
    glider.style.transform = `translateX(${t.offsetLeft}px)`;
  };
  new MutationObserver(moverGlider).observe(barra, { subtree: true, attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', moverGlider, { passive: true });
  requestAnimationFrame(moverGlider);

  /* ---------- barrido láser mientras se lee una carta ---------- */
  const visor = document.querySelector('#visor');
  if (visor) {
    const b = document.createElement('div'); b.className = 'barrido'; visor.appendChild(b);
    const revisar = () => visor.classList.toggle('escaneando',
      !!document.querySelector('#estado .cargando') || document.querySelector('#marco')?.classList.contains('leyendo'));
    new MutationObserver(revisar).observe(document.querySelector('#estado'), { childList: true, subtree: true });
    new MutationObserver(revisar).observe(document.querySelector('#marco'), { attributes: true, attributeFilter: ['class'] });
  }

  /* ---------- carta holográfica: se inclina y brilla siguiendo el dedo ---------- */
  const mover = (h, x, y) => {
    const r = h.getBoundingClientRect(); if (!r.width) return;
    const px = Math.min(1, Math.max(0, (x - r.left) / r.width)), py = Math.min(1, Math.max(0, (y - r.top) / r.height));
    h.classList.remove('entra'); h.classList.add('tocando');
    h.style.transform = `rotateY(${(px - 0.5) * 20}deg) rotateX(${-(py - 0.5) * 20}deg) scale(1.03)`;
    h.style.setProperty('--mx', `${px * 100}%`); h.style.setProperty('--my', `${py * 100}%`);
    h.style.setProperty('--ang', `${215 + (px - 0.5) * 200}deg`);
  };
  const soltar = (h) => { h.classList.remove('tocando'); h.style.transform = ''; };
  document.addEventListener('pointermove', (e) => {
    const h = e.target.closest && e.target.closest('.holo'); if (!h || reducido()) return;
    mover(h, e.clientX, e.clientY);
  }, { passive: true });
  document.addEventListener('pointerdown', (e) => { const h = e.target.closest && e.target.closest('.holo'); if (h && !reducido()) mover(h, e.clientX, e.clientY); }, { passive: true });
  ['pointerup', 'pointercancel', 'pointerout'].forEach((ev) => document.addEventListener(ev, (e) => {
    const h = e.target.closest && e.target.closest('.holo'); if (h && (ev !== 'pointerout' || !h.contains(e.relatedTarget))) soltar(h);
  }, { passive: true }));
  // tocar la carta: la abre en grande; tocar de nuevo la cierra
  document.addEventListener('click', (e) => {
    const h = e.target.closest && e.target.closest('.holo'); if (!h || h.closest('.lupa')) return;
    const img = h.querySelector('img'); if (!img) return;
    const lupa = document.createElement('div'); lupa.className = 'lupa';
    lupa.innerHTML = `<div class="holo ${h.classList.contains('brilla') ? 'brilla' : ''}"><img alt=""><i class="foil"></i><i class="reflejo"></i></div><p>Toca para cerrar</p>`;
    lupa.querySelector('img').src = img.src;
    lupa.addEventListener('click', () => lupa.remove());
    document.body.appendChild(lupa);
  });

  /* ---------- precio que cuenta hasta su valor ---------- */
  const CONTAR = '.resumen .total, .precio .usd, .precio-rapido b';
  const vistos = new Map(); // no volver a contar el mismo total cada vez que se cambia un filtro
  const contar = (el) => {
    if (el.dataset.contado === el.textContent) return;
    const clave = `${el.className}|${el.closest('[id]')?.id || ''}`;
    if (vistos.get(clave) === el.textContent) { el.dataset.contado = el.textContent; return; }
    vistos.set(clave, el.textContent);
    const m = el.textContent.match(/^(.*?)(\d+)\.(\d{2})(.*)$/); // "US$ 12.34"
    if (!m || reducido()) { el.dataset.contado = el.textContent; return; }
    const fin = parseFloat(`${m[2]}.${m[3]}`); const final = el.textContent;
    if (fin < 0.05) { el.dataset.contado = final; return; }
    const t0 = performance.now(), dur = fin > 100 ? 1000 : 750;
    const paso = (t) => {
      if (!el.isConnected) return;
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      const txt = k < 1 ? `${m[1]}${(fin * e).toFixed(2)}${m[4]}` : final;
      el.dataset.contado = txt; el.textContent = txt;
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };
  new MutationObserver((muts) => {
    for (const mu of muts) for (const n of mu.addedNodes) {
      if (n.nodeType !== 1) continue;
      if (n.matches(CONTAR)) contar(n);
      n.querySelectorAll && n.querySelectorAll(CONTAR).forEach(contar);
    }
  }).observe(document.body, { childList: true, subtree: true });

  /* ---------- ajuste: reducir animaciones ---------- */
  const caja = document.querySelector('#aj-calma');
  if (caja) {
    caja.checked = document.body.classList.contains('calma');
    caja.addEventListener('change', () => {
      document.body.classList.toggle('calma', caja.checked);
      try { localStorage.setItem('calma', JSON.stringify(caja.checked)); } catch { /* nada */ }
    });
  }
})();
