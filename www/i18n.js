/* CardCalc — idioma de la APP (interfaz). Español es el idioma base del código; en inglés cada texto que aparece
   en pantalla se traduce al vuelo con el diccionario de i18n-en.js (exacto o por patrones con números/nombres).
   También traduce alert/confirm/prompt y los textos que se comparten. Los nombres de cartas/sets no se tocan. */
'use strict';
const IDIOMAS_APP = { es: 'Español', en: 'English' };
let LANG_UI = (() => {
  try { const g = localStorage.getItem('idiomaApp'); if (g && IDIOMAS_APP[g]) return g; } catch { /* nada */ }
  return /^es/i.test(navigator.language || 'es') ? 'es' : 'en'; // primera vez: el idioma del celular
})();
document.documentElement.lang = LANG_UI;

const I18N = { exactos: new Map(), patrones: [] };
/* registra traducciones: exactos = { 'texto es': 'text en' }, patrones = [[/^regex es$/, 'replacement en' | fn]] */
function registrarTraducciones(exactos, patrones) {
  for (const [a, b] of Object.entries(exactos || {})) I18N.exactos.set(a, b);
  for (const p of patrones || []) I18N.patrones.push(p);
}

/* traduce un texto suelto (respeta espacios alrededor) */
function tr(texto) {
  if (LANG_UI === 'es' || texto == null) return texto;
  const s = String(texto); const t = s.trim(); if (!t) return s;
  let r = I18N.exactos.get(t);
  if (r === undefined) for (const [re, rep] of I18N.patrones) { if (re.test(t)) { r = t.replace(re, rep); break; } }
  if (r === undefined) return s;
  return s.replace(t, r);
}
/* textos de varias líneas (alertas, WhatsApp): línea por línea */
const trMulti = (s) => (LANG_UI === 'es' || s == null ? s : String(s).split('\n').map(tr).join('\n'));

/* traduce un nodo y sus hijos: texto + atributos visibles */
const ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'alt'];
function traducirNodo(raiz) {
  if (LANG_UI === 'es' || !raiz) return;
  if (raiz.nodeType === 3) { const n = tr(raiz.nodeValue); if (n !== raiz.nodeValue) raiz.nodeValue = n; return; }
  if (raiz.nodeType !== 1 || raiz.closest?.('[data-no-traducir]')) return;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = raiz;
  do {
    if (n.nodeType === 3) {
      const p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.closest?.('[data-no-traducir]'))) continue;
      const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v;
    } else if (n.nodeType === 1) {
      for (const a of ATRIBUTOS) if (n.hasAttribute(a)) { const v = n.getAttribute(a), t = tr(v); if (t !== v) n.setAttribute(a, t); }
    }
  } while ((n = w.nextNode()));
}

// todo lo que se agregue a la página se traduce al momento
const observadorI18n = new MutationObserver((muts) => {
  if (LANG_UI === 'es') return;
  for (const m of muts) {
    if (m.type === 'characterData') traducirNodo(m.target);
    else if (m.type === 'attributes') traducirNodo(m.target.nodeType === 1 ? m.target : null);
    else m.addedNodes.forEach(traducirNodo);
  }
});
function iniciarI18n() {
  traducirNodo(document.body);
  document.title = tr(document.title);
  observadorI18n.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATRIBUTOS });
}

// diálogos del sistema
const _alert = window.alert.bind(window), _confirm = window.confirm.bind(window), _prompt = window.prompt.bind(window);
window.alert = (m) => _alert(trMulti(m));
window.confirm = (m) => _confirm(trMulti(m));
window.prompt = (m, d) => _prompt(trMulti(m), d);

function cambiarIdiomaApp(l) {
  if (!IDIOMAS_APP[l] || l === LANG_UI) return;
  try { localStorage.setItem('idiomaApp', l); } catch { /* nada */ }
  location.reload(); // la forma más segura de que TODO quede en el idioma nuevo
}
// fechas en el idioma de la app
const LOCALE = () => (LANG_UI === 'en' ? 'en-US' : 'es-CO');
