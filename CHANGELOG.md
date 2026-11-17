# Historial de versiones — CardCalc (antes PokéPrecio)

La versión se define en `package.json` → el workflow la pone en el APK (`CardCalc-vX.Y.Z.apk`) y en Android (`versionName`).
Se ve en la app al final de **Colección**. Regla: cada APK nuevo sube la versión y se anota aquí.

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
