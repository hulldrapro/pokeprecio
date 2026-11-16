# PokéPrecio

App Android: le tomas una foto a una carta Pokémon (en español) y te dice cuánto vale en **USD** y **pesos colombianos**, con precios en vivo.

## Funciones
- **Cámara en vivo con marco de carta**: la foto sale recortada a la carta → el lector sabe dónde buscar el número.
- **Reconocimiento gratis en el celular** (tesseract.js), pensado para **holográficas**:
  - zonas: esquina inferior izquierda (cartas 2023+) y derecha (antiguas);
  - filtros: gris, *canal más oscuro* (el texto negro es oscuro en R, G y B; el brillo holo de colores no), umbral adaptativo (ignora reflejos), invertido (full art);
  - lee el **código del set** (`PFL`, `TWM`, `SVI`…) → con código + número basta aunque el total salga mal;
  - corrige errores típicos (`730/167` → `130/167`, `195` ↔ `198`, `130/16` → `130/167`).
- Si no acierta: **toca el número en tu foto** y lo vuelve a leer ampliado.
- **Búsqueda escrita sin "/"**: `43 94`, `043094`, `4394`, `PFL 43`, `43/94`, solo `43`, o el nombre (`Milcery`).
- **Precio**: TCGplayer (USD, por variante: normal / holo / reverse) y Cardmarket (EUR); dólar del día → COP.
- **Mi colección**:
  - se actualiza sola al abrir la app (si pasaron > 6 h) y con «↻ Actualizar precios»; historial y gráfico por carta; ▲/▼ % desde que la guardaste;
  - **ordenar**: más caras, más raras, recientes, más subieron, más bajaron, nombre; **filtrar** por set y rareza; **buscar por nombre**;
  - guardada en el almacenamiento nativo de Android (Preferences) + **exportar / importar copia** (Documentos).

## Actualizaciones sin perder la colección
Android solo instala una actualización encima (conservando datos) si va firmada con **la misma llave**.
- `scripts/crear-llave.py` crea la llave una sola vez (en `%LOCALAPPDATA%\PokePrecio\firma\`, ¡no borrar!) y la sube como secretos del repo (`KEYSTORE_B64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`).
- El workflow firma con ella y usa el número de compilación como `versionCode`.

## Ver en el PC
- **`Ver en PC.bat`**: abre la app en una ventana tamaño celular (usa la webcam como cámara). La primera vez instala el lector en `%LOCALAPPDATA%\PokePrecio`.
- **`Ver celular en PC.bat`**: muestra y maneja la pantalla del celular en el PC con *scrcpy* (requiere Depuración USB). Arrastra el APK a esa ventana para instalarlo.

## Compilar
GitHub Actions (`.github/workflows/android.yml`) compila en cada push → artifact `PokePrecio-apk`.
Archivos: `www/` (app), `www/reconocer.js` (OCR), `www/codigos.json` (código impreso → set, lo regenera `scripts/codigos-sets.js`).

## Notas
- TCGplayer cotiza la versión en inglés; las cartas en español suelen valer algo menos. Cardmarket mezcla idiomas.
- TCGdex actualiza los precios una vez al día.
