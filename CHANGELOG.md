# Historial de versiones — CardCalc (antes PokéPrecio)

La versión se define en `package.json` → el workflow la pone en el APK (`CardCalc-vX.Y.Z.apk`) y en Android (`versionName`).
Se ve en la app al final de **Colección**. Regla: cada APK nuevo sube la versión y se anota aquí.

## v2.7.1 — 2026-11-16 · ⚡ Energías básicas
- Botón **⚡ Añadir energías básicas** (en Escanear): eliges tipo y cantidad (atajos 4/8/12) y se agregan todas de una vez.
- Al escanear, si la carta dice «Energía»/«Energy» (o no se reconoce), se ofrece el selector con el **tipo adivinado por el color** del símbolo.
- Búsqueda escrita con sinónimos: «energía eléctrica/rayo», «siniestra/oscura», «metal/metálica», «fire energy»…
- Las energías de Escarlata y Púrpura no tienen imagen en TCGdex: ahora muestran una propia del color del tipo; y en español toman el precio de la versión en inglés.

## v2.7.0 — 2026-11-16 · 🤖 Mazos automáticos y plantillas
- **🤖 Armar con mis cartas**: revisa tu colección, arma las líneas evolutivas completas (básico → fase 1 → fase 2, aunque sean de tipos distintos, como Charmander → Charizard ex), prioriza ex/V y las más valiosas, agrega tus entrenadores y calcula la energía según los costos de ataque. Tipo principal automático o elegido, formato Libre/Estándar/Expandido. El mazo queda editable.
- **📚 Plantillas**: Charizard ex, Gardevoir ex, Dragapult ex y Pikachu ex (listas de referencia del meta 2024–2025). Se comparan con tu colección: qué tienes, qué te falta y cuánto cuesta completarla; la legalidad de hoy la verifica TCGdex.
- «Tienes» ahora reconoce tus cartas en español frente a listas en inglés («Investigación de Profesores» = «Professor's Research»).
- Se mantiene armar mazos a mano e importar listas de TCG Live.

## v2.6.1 — 2026-11-16
- Tema **solo manual**: 🌙 Oscuro o ☀️ Claro en Ajustes. Se quitó "Automático": la app ya no cambia sola con el modo del celular. Quien tenía "Automático" queda en Oscuro.

## v2.6.0 — 2026-11-16 · 🃏 Mazos, alertas, widget y más
**Coleccionistas y jugadores**
- Nueva pestaña **🃏 Mazos**: armar mazos, ver cuáles cartas tienes y cuáles te faltan, **costo para completarlo**, legalidad **Estándar / Expandido** (de TCGdex), avisos (60 cartas, máx. 4 copias), pasar faltantes a Deseos.
- **Importar / exportar listas de Pokémon TCG Live** («4 Pikachu ex SSP 57», energías «Basic {L} Energy»).
- **Varias fotos de la galería** a la vez (se procesan en lote).
- **🔎 Búsqueda avanzada**: nombre, tipo, categoría, rareza, ilustrador y rango de precio, ordenada de la más barata a la más cara.

**Precios y ventas**
- **Alertas en el celular** (en segundo plano cada ~6 h, aunque la app esté cerrada): cuando un deseo llega a tu precio y, si quieres, cuando una carta de tu colección sube o baja más de un %.
- **TCGplayer vs Cardmarket** en cada carta: dónde está más barata y por cuánto.
- **Calculadora de venta real**: comisión % y envío → cuánto te queda en la mano (modo venta y lotes).

**Comodidad**
- **Tema claro / oscuro / automático.**
- **Copia de seguridad automática semanal** (Documentos) y recordatorio de exportar.
- **Widget** de pantalla de inicio con el valor de tu colección.

## v2.5.0 — 2026-11-16 · 🏅 Cartas calificadas
- En "Mi carta": **calificación** con PSA, BGS (Beckett, incl. Black Label y Pristine), CGC (incl. Pristine), TAG y ACE, nota del 1 al 10.
- **Valor estimado aproximado** con multiplicadores típicos sobre el precio sin calificar (PSA 10 ≈ ×3, PSA 9 ≈ ×1.5, PSA 7 ≈ ×0.9…). No existe una fuente gratuita de precios de cartas calificadas: por eso se marca como estimado.
- **Precio real** opcional (si lo conoces) que reemplaza el estimado.
- Enlaces a **ventas reales en eBay (vendidas)** y **PriceCharting** para esa carta y esa nota.
- Insignia dorada "PSA 10" en la colección, filtro **🏅 Calificadas**, y el valor calificado cuenta en el total, Stats, Venta e imagen para compartir. En cartas calificadas no aplica el estado (NM/LP…).

## v2.4.0 — 2026-11-16 · 🗣️ Idioma de la app
- **Idioma de la app: Español / English** (⚙️ Ajustes → 🗣️ Idioma de la app). La primera vez se elige solo según el idioma del celular.
- Se traduce toda la interfaz: pantallas, botones, mensajes emergentes, lo que se comparte por WhatsApp, la imagen de la colección y las fechas. Los nombres de cartas y sets no se traducen.
- Traductor: `www/i18n.js` (motor) + `www/i18n-en.js` (diccionario y patrones).

## v2.3.0 — 2026-11-16 · ⚙️ Ajustes
- Nueva pantalla **⚙️ Ajustes** (botón arriba a la derecha):
  - **Moneda**: COP, USD, MXN, EUR, ARS, CLP, PEN, BRL, UYU, GTQ, CRC, DOP, GBP, CAD — todos los precios de la app se convierten.
  - **Idioma de las cartas** (Español / Inglés / Japonés).
  - **Precios**: fuente principal TCGplayer o Cardmarket; actualización automática cada 3/6/12/24 h o solo a mano; % de venta por defecto.
  - **Escaneo**: guardar automático, ⚡ AUTO, vibrar al leer una carta.
  - **Copia de seguridad** (exportar/importar), **borrar caché** y **borrar colección** (con doble confirmación).
  - **Acerca de**: versión, fuentes de datos y aviso legal.
- "Lo que pagaste" y el precio de tus deseos se guardan en US$ (no cambian al cambiar de moneda); los que tenías en pesos se convirtieron solos.

## v2.2.1 — 2026-11-16
- "La más valiosa", el Top 10 y la imagen para compartir se ordenan por **precio unitario** (una copia), no por la suma de las repetidas. El Top 10 sigue mostrando ×N y, al tocarlo, el total de tus copias.

## v2.2.0 — 2026-11-16
**Coleccionista**
- **Estado de la carta** (NM 100 %, LP 85 %, MP 70 %, HP 50 %, DMG 35 %): el valor de tu copia se ajusta.
- **Lo que pagaste** por carta → ganancia/pérdida por carta y en el resumen de la colección.
- **Carpetas** (Favoritas, Para jugar, Para vender o nuevas) con filtro en la colección.
- **📊 Stats**: valor de la colección en el tiempo (con detalle al tocar), top 10, valor por set y por tipo, y vista de tabla.

**Escanear más rápido**
- **⚡ AUTO**: lee la carta sola cuando queda quieta en el marco (marco verde = lista, azul = leyendo); no repite la misma carta.
- **🔦 Linterna** (si el celular la tiene).

**Encontrar cartas**
- Buscar un Pokémon por nombre → **💲 todas sus versiones ordenadas de la más barata a la más cara**.

**Vender**
- **💸 Modo venta**: eliges el % del mercado, marcas cartas, compartes la lista con precios y "Las vendí" las saca de la colección.
- **Valor del lote** en "Escaneadas ahora" (y al % de venta) + "📋 Compartir lote".

## v2.1.1 — 2026-11-16
- Logo de **Temporal Forces** y de otros 27 sets que no lo tenían (Trainer Gallery, Shiny Vault, Galarian Gallery…), tomados de pokemontcg.io.
- Nombres y logos en inglés incluidos dentro de la app (`sets-en.json`): salen bien aunque TCGdex esté caído.

## v2.1.0 — 2026-11-16
- Progreso por set: sin banderas junto al nombre del set.
- Tipos con los nombres de la comunidad: **Eléctrico** (antes Rayo), **Siniestro** (Oscura), **Metal** (Metálica), **Normal** (Incolora).
- Versiones: el APK se llama `CardCalc-vX.Y.Z.apk` y la versión aparece en la app.

## v2.0.2 — 2026-11-16
- Logos de los sets solo en inglés (los japoneses usan el logo inglés equivalente cuando existe).

## v2.0.1 — 2026-11-16
- Nombres de los sets con su nombre original en inglés (Phantasmal Flames, Twilight Masquerade…).

## v2.0.0 — 2026-11-16 · ahora se llama **CardCalc**
- Nueva pestaña **⇄ Intercambio**: calculadora "Yo doy / Yo recibo" (justo / ganas / pierdes) que actualiza la colección.
- Nueva pestaña **♡ Deseos**: tu precio en pesos y aviso cuando una carta llega a ese precio.
- **Progreso por set** con álbum (las que faltan en gris).
- **Compartir**: imagen de la colección y lista de repetidas para WhatsApp.
- Aviso legal de no afiliación (para Google Play).

## v1.6.0 — 2026-11-16
- Idiomas 🇪🇸 / 🇺🇸 / 🇯🇵 con detección automática, precio según idioma, bandera y filtro en la colección.
- Logo nuevo e ícono de la app.

## v1.5.0 — 2026-11-16
- Cartas repetidas agrupadas con insignia ×N.

## v1.4.0 — 2026-11-16
- Búsqueda manual de corrido (Enter y sigue escribiendo).

## v1.3.0 — 2026-11-16
- Escaneo de corrido: cámara siempre activa, lista "Escaneadas ahora", guardado automático.

## v1.2.0 — 2026-11-16
- Filtro por tipo en la colección.

## v1.1.0 — 2026-11-16
- Mejor lectura de cartas holográficas, código del set, "toca el número".
- Diseño nuevo con visor y marco de carta; filtros y búsqueda en la colección; búsqueda sin "/".
- Llave de firma fija (las actualizaciones conservan la colección) y copia de seguridad.

## v1.0.0 — 2026-11-16
- Primera versión (PokéPrecio): foto → número de la carta → precio en USD y COP.
