# PokéPrecio

App Android: le tomas una foto a una carta Pokémon (en español) y te dice cuánto vale en **USD** y **pesos colombianos**.

## Cómo funciona
1. **Foto** con la cámara (o de la galería).
2. **OCR en el celular** (Tesseract.js, gratis, sin API key): lee el número de la carta (`025/198`) en varias zonas (esquina izquierda para cartas nuevas, derecha para antiguas, normal e invertido para full art) y el nombre arriba.
3. Corrige confusiones típicas del OCR (`730/167` → `130/167`, `195` ↔ `198`) y solo acepta totales que existan en un set real.
4. **Busca en [TCGdex](https://tcgdex.dev)** (base de datos de cartas en español) qué sets tienen ese total y trae la carta.
5. **Precio en vivo**: TCGplayer (USD, por variante: normal, holo, reverse) y Cardmarket (EUR). Dólar del día de open.er-api.com → COP.
6. Si no lee el número: busca por nombre, o escribes `25/198` / `Charizard` a mano.

## Precios siempre actualizados
- Cada búsqueda consulta el precio **en el momento** (TCGdex refresca TCGplayer/Cardmarket a diario).
- **Mi colección** guarda tus cartas, se **actualiza sola al abrir la app** (si pasaron más de 6 h), guarda el historial y muestra ▲/▼ % desde que la guardaste, más el valor total.

## Compilar
El APK lo compila GitHub Actions (`.github/workflows/android.yml`) en cada push → artifact `PokePrecio-apk`.

Local (requiere JDK 21 + Android SDK):
```
npm ci
npm run build        # copia tesseract a www/lib
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Notas
- TCGplayer cotiza la versión en inglés; las cartas en español suelen valer algo menos. Cardmarket mezcla idiomas.
- La primera lectura descarga el modelo de OCR (~10 MB), luego queda en caché.
