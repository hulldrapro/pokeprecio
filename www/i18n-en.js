/* CardCalc — interfaz en inglés. Claves = texto en español tal como aparece en pantalla.
   Los nombres de cartas y sets NO están aquí (se quedan como vienen). */
'use strict';
(() => {
  const E = {
    // ---------- generales / navegación ----------
    'Escanear': 'Scan', 'Colección': 'Collection', 'Intercambio': 'Trade', 'Deseos': 'Wishlist', '⚙️ Ajustes': '⚙️ Settings', 'Ajustes': 'Settings',
    'Buscar': 'Search', 'Cerrar': 'Close', 'Limpiar': 'Clear', 'Limpiar lista': 'Clear list', 'Quitar': 'Remove', 'Todas': 'All', 'Ninguna': 'None',
    'Resultados': 'Results', 'Otras coincidencias': 'Other matches', '¿Cuál es tu carta?': 'Which one is your card?', 'Buscando': 'Searching',
    'Reintentar': 'Retry', 'Texto leído': 'Text read', 'Detalle de la última carta': 'Last card details', 'Sin resultados': 'No results',
    'Consultando precio': 'Checking price', 'Consultando precio actual': 'Checking current price', 'Cargando el set': 'Loading set',
    'Dólar hoy': 'USD today', 'Moneda': 'Currency', 'Tomar foto': 'Take photo', 'Galería': 'Gallery', 'Cámara del sistema': 'System camera',
    'Tu foto': 'Your photo', 'Guardada': 'Saved', 'Ordenar': 'Sort', 'Set': 'Set', 'Linterna': 'Flashlight', 'Escaneo automático': 'Auto scan',
    'Cambiar mi precio': 'Change my price', 'Ya la tengo': 'I got it', 'Guardar en mi colección': 'Save to my collection',
    // ---------- escanear ----------
    'Idioma de tus cartas': 'Your cards’ language', 'Pon la carta dentro del marco · evita reflejos inclinándola un poco': 'Place the card inside the frame · tilt it a bit to avoid glare',
    '⚡ AUTO: pon la carta en el marco y quédate quieto; cambia de carta y sigue': '⚡ AUTO: hold the card still in the frame; swap cards and keep going',
    'No se pudo abrir la cámara en vivo.': 'Couldn’t open the live camera.', 'O escribe: 43 94 · 043094 · Milcery': 'Or type: 43 94 · 043094 · Milcery',
    'Guardar automáticamente en mi colección cada carta que reconozca': 'Automatically save every recognized card to my collection',
    '¿No es tu carta?': 'Not your card?', 'Toca el número': 'Tap the number', 'en tu foto (abajo, ej. 043/094) y la vuelvo a leer.': 'on your photo (bottom, e.g. 043/094) and I’ll read it again.',
    'Escaneadas ahora ·': 'Scanned now ·', '＋ Guardar todas': '＋ Save all', '＋ Guardar la pendiente': '＋ Save the pending one', '📋 Compartir lote': '📋 Share batch',
    '💲 Ver precios y ordenar de la más barata a la más cara': '💲 See prices, cheapest to most expensive', 'Leyendo la zona que tocaste': 'Reading the area you tapped',
    'Leyendo el nombre': 'Reading the name', 'Leyendo el número de la carta': 'Reading the card number', 'Preparando el lector (la primera vez descarga ~10 MB)': 'Preparing the reader (first time downloads ~10 MB)',
    'No pude reconocer la carta.': 'I couldn’t recognize the card.', 'Detecté una carta en': 'Detected a card in', 'inglés': 'English', 'español': 'Spanish', 'japonés': 'Japanese',
    // ---------- ficha ----------
    '＋ A mi colección': '＋ Add to my collection', '✓ Guardada en tu colección': '✓ Saved to your collection', 'Ver en TCGplayer': 'View on TCGplayer',
    '♡ La quiero': '♡ I want it', '⇄ La doy': '⇄ I give it', '⇄ La recibo': '⇄ I get it', '♥ En tus deseos': '♥ In your wishlist',
    '✓ En «Yo doy»': '✓ In “I give”', '✓ En «Yo recibo»': '✓ In “I get”', 'Ya está en el intercambio': 'Already in the trade',
    'Mercado': 'Market', 'Mínimo': 'Low', 'Tendencia': 'Trend', 'Prom. 30 d': '30-day avg', 'Holo / reverse': 'Holo / reverse',
    'Normal': 'Normal', 'Holo': 'Holo', 'Reverse holo': 'Reverse holo', '1ª edición': '1st edition', '1ª ed. holo': '1st ed. holo', 'Unlimited holo': 'Unlimited holo',
    'Historial de precio': 'Price history', 'El historial aparecerá a medida que se actualicen los precios.': 'History will appear as prices get updated.',
    'Sin precio registrado': 'No price recorded', 'sin precio registrado': 'no price recorded', 'sin precio': 'no price',
    'Quitar de mi colección': 'Remove from my collection', 'Quitar una copia': 'Remove one copy',
    'Mi carta': 'My card', 'Estado': 'Condition', 'Lo que pagaste': 'What you paid', 'Carpeta': 'Folder', '＋ Nueva': '＋ New',
    'NM · Nueva': 'NM · Near Mint', 'LP · Casi nueva': 'LP · Lightly Played', 'MP · Jugada': 'MP · Moderately Played', 'HP · Muy jugada': 'HP · Heavily Played', 'DMG · Dañada': 'DMG · Damaged',
    '📁 Favoritas': '📁 Favorites', '📁 Para jugar': '📁 To play', '📁 Para vender': '📁 For sale', '📁 Todas las carpetas': '📁 All folders',
    // ---------- colección ----------
    'Calc': 'Calc', '↻ Actualizar precios': '↻ Update prices', 'Actualizando…': 'Updating…', '📤 Compartir colección': '📤 Share collection', '🔁 Mis repetidas': '🔁 My duplicates',
    '🃏 Cartas': '🃏 Cards', '📚 Sets': '📚 Sets', '📊 Stats': '📊 Stats', '💸 Venta': '💸 Sell', 'Buscar en mi colección': 'Search my collection',
    '💰 Más caras': '💰 Most valuable', '✨ Más raras': '✨ Rarest', '🕒 Recientes': '🕒 Recent', '📈 Más subieron': '📈 Biggest gains', '📉 Más bajaron': '📉 Biggest drops', '🔤 Nombre': '🔤 Name',
    'Todos los sets': 'All sets', 'Todos los tipos': 'All types', 'Todos los idiomas': 'All languages',
    'Comunes': 'Common', 'Raras': 'Rare', 'Dobles / V / ex': 'Double / V / ex', 'Ultra / Ilustración': 'Ultra / Illustration', 'Secretas / Híper': 'Secret / Hyper',
    'desde que las guardaste': 'since you saved them', 'aún no': 'not yet', 'Pagaste': 'You paid', 'c/u': 'each',
    'Aún no tienes cartas.': 'You have no cards yet.', 'Escanea una y toca': 'Scan one and tap', 'Ninguna carta coincide con el filtro.': 'No card matches the filter.',
    'Copia de seguridad, moneda y más en': 'Backup, currency and more in', '(arriba a la derecha).': '(top right).',
    'Tienes': 'You have', 'de esta carta (con este estado)': 'of this card (in this condition)', 'Total del set desconocido': 'Set total unknown',
    '← Volver al set': '← Back to set', 'Solo me faltan': 'Only missing', 'Creando imagen…': 'Creating image…',
    // stats
    'Cartas': 'Cards', 'Valor medio': 'Average value', 'La más valiosa': 'Most valuable', 'Desde el inicio': 'Since the start',
    'Valor de tu colección (US$)': 'Your collection’s value (US$)', 'Top 10 cartas más valiosas (precio por carta)': 'Top 10 most valuable cards (price per card)',
    'Valor por set': 'Value by set', 'Valor por tipo': 'Value by type', 'Ver como tabla': 'View as table', 'Carta': 'Card', 'Copias': 'Copies', 'Sin tipo': 'No type',
    'El gráfico aparece desde el segundo día: cada vez que se actualizan los precios se guarda un punto.': 'The chart appears from the second day: a point is saved every time prices update.',
    // venta
    '💸 Modo venta: ¿a qué % del precio de mercado vendes?': '💸 Sell mode: at what % of market price do you sell?', 'Solo la carpeta «Para vender»': 'Only the “For sale” folder',
    'Marca las cartas que quieres vender': 'Tick the cards you want to sell', 'Marcar todas': 'Select all', 'Quitar todas': 'Deselect all',
    '📤 Compartir lista': '📤 Share list', '✓ Las vendí': '✓ I sold them', 'No hay cartas para vender.': 'No cards to sell.', 'vendes en': 'you sell for',
    // ---------- intercambio ----------
    'Calculadora de intercambio': 'Trade calculator', 'Agrega cartas a cada lado para comparar': 'Add cards to each side to compare', 'Cambio justo': 'Fair trade',
    '📤 Yo doy': '📤 I give', '📥 Yo recibo': '📥 I get', '＋ Buscar carta': '＋ Search card', '🗂️ De mi colección': '🗂️ From my collection', 'Sin cartas': 'No cards',
    '✓ Hacer el cambio': '✓ Make the trade', '📤 Compartir': '📤 Share', '¿Qué carta das?': 'Which card do you give?', '📤 ¿Qué carta das?': '📤 Which card do you give?',
    '📥 ¿Qué carta recibes?': '📥 Which card do you get?', 'Filtrar por nombre': 'Filter by name', 'No tienes cartas disponibles en tu colección.': 'You have no cards available in your collection.',
    'Tip: también puedes mandar cartas al intercambio desde el escáner con «⇄ La doy» / «⇄ La recibo». Al hacer el cambio, las que das salen de tu colección y las que recibes entran.':
      'Tip: you can also send cards to the trade from the scanner with “⇄ I give” / “⇄ I get”. When you make the trade, the cards you give leave your collection and the ones you get are added.',
    // ---------- deseos ----------
    '＋ Agregar carta que quiero': '＋ Add a card I want', '↻ Actualizar': '↻ Update', '♡ ¿Qué carta quieres?': '♡ Which card do you want?',
    '🎯 ¡Ya está a tu precio!': '🎯 It’s at your price!', 'Hoy:': 'Today:', 'Aún no tienes deseos.': 'Your wishlist is empty.', 'Toca': 'Tap', 'o usa': 'or use', 'en cualquier carta.': 'on any card.',
    'Te aviso aquí (y con un punto en la pestaña) cuando alguna baje a tu precio. Los precios se revisan al abrir la app.': 'I’ll let you know here (and with a dot on the tab) when one drops to your price. Prices are checked when you open the app.',
    'sin definir': 'not set',
    // ---------- ajustes ----------
    '🗣️ Idioma de la app': '🗣️ App language', '💱 Moneda': '💱 Currency', '🌐 Idioma de las cartas': '🌐 Card language', '💲 Precios': '💲 Prices', '📷 Escaneo': '📷 Scanning',
    '💾 Copia de seguridad': '💾 Backup', '🧹 Datos': '🧹 Data', 'ℹ️ Acerca de': 'ℹ️ About',
    'En qué idioma busca y reconoce tus cartas (también se cambia en Escanear). Si una carta dice «EN» o «ES», se detecta sola.': 'Which language your cards are searched and recognized in (also changeable in Scan). If a card says “EN” or “ES”, it’s detected automatically.',
    'Fuente principal del precio': 'Main price source', 'TCGplayer (EE. UU.)': 'TCGplayer (USA)', 'Cardmarket (Europa)': 'Cardmarket (Europe)',
    'Actualizar precios de la colección automáticamente': 'Update collection prices automatically', 'Cada 3 horas': 'Every 3 hours', 'Cada 6 horas': 'Every 6 hours', 'Cada 12 horas': 'Every 12 hours',
    'Una vez al día': 'Once a day', 'Solo cuando yo toque «Actualizar»': 'Only when I tap “Update”', '% de venta por defecto (modo venta y lotes):': 'Default sell % (sell mode and batches):',
    'Guardar automáticamente cada carta reconocida': 'Automatically save every recognized card', '⚡ Escaneo AUTO (leer la carta cuando queda quieta)': '⚡ AUTO scan (read the card when it’s still)',
    'Vibrar al leer una carta': 'Vibrate when a card is read', 'Guarda tu colección y tus deseos en un archivo (Documentos) para pasarlos a otro celular o por si acaso.': 'Save your collection and wishlist to a file (Documents) to move them to another phone or just in case.',
    '⤓ Exportar': '⤓ Export', '⤒ Importar': '⤒ Import', 'Borrar caché de sets y precios': 'Clear sets & prices cache', 'Borrar toda mi colección': 'Delete my whole collection',
    'Los precios se muestran solo en dólares.': 'Prices are shown in US dollars only.',
    'Datos de cartas: TCGdex · Precios: TCGplayer y Cardmarket (vía TCGdex) · Logos faltantes: Pokémon TCG API · Tasas de cambio: open.er-api.com. Lectura de cartas en el propio celular (Tesseract), sin enviar tus fotos a ningún servidor.':
      'Card data: TCGdex · Prices: TCGplayer and Cardmarket (via TCGdex) · Missing logos: Pokémon TCG API · Exchange rates: open.er-api.com. Cards are read on your phone (Tesseract); your photos are never sent to any server.',
    'CardCalc es una app independiente: no está afiliada, patrocinada ni aprobada por Nintendo, The Pokémon Company, Creatures o Game Freak. Pokémon y sus nombres son marcas de sus respectivos dueños.':
      'CardCalc is an independent app: it is not affiliated with, sponsored or endorsed by Nintendo, The Pokémon Company, Creatures or Game Freak. Pokémon and its names are trademarks of their respective owners.',
    'CardCalc · versión web (PC)': 'CardCalc · web version (PC)',
    // idiomas, monedas, tipos, rarezas
    'Español': 'Spanish', 'Inglés': 'English', 'Japonés': 'Japanese',
    'Fuego': 'Fire', 'Agua': 'Water', 'Planta': 'Grass', 'Eléctrico': 'Lightning', 'Psíquico': 'Psychic', 'Lucha': 'Fighting', 'Siniestro': 'Darkness', 'Metal': 'Metal',
    'Dragón': 'Dragon', 'Hada': 'Fairy', 'Entrenador': 'Trainer', 'Energía': 'Energy',
    'Común': 'Common', 'Poco común': 'Uncommon', 'Rara': 'Rare', 'Holo Rara': 'Rare Holo', 'Rara Doble': 'Double Rare', 'Ultra Rara': 'Ultra Rare', 'Rara Ilustración': 'Illustration Rare',
    'Rara Ilustración Especial': 'Special Illustration Rare', 'Rara Híper': 'Hyper Rare', 'Rara Secreta': 'Secret Rare', 'Holo Rara V': 'Rare Holo V', 'Holo Rara VMAX': 'Rare Holo VMAX', 'Holo Rara VSTAR': 'Rare Holo VSTAR',
    'Rara AS TÁCTICO': 'ACE SPEC Rare', 'Rara Radiante': 'Radiant Rare', 'Rara Brillante': 'Shiny Rare', 'Mega Hiper Rara': 'Mega Hyper Rare', 'Promo': 'Promo',
    // ---------- mensajes (alert/confirm/prompt) y compartir: líneas fijas ----------
    '¡Cambio hecho! Tu colección quedó actualizada.': 'Trade done! Your collection is updated.', 'Tu colección está vacía.': 'Your collection is empty.',
    'No tienes cartas repetidas.': 'You have no duplicates.', 'Copiado: pégalo en WhatsApp.': 'Copied: paste it into WhatsApp.', 'Copia este texto:': 'Copy this text:',
    'No se pudo actualizar: revisa tu conexión.': 'Couldn’t update: check your connection.', 'Sin conexión: inténtalo de nuevo.': 'No connection: try again.',
    '¿Quitar de tus deseos?': 'Remove from your wishlist?', '¿Vaciar el intercambio?': 'Empty the trade?', 'Tu colección ya está vacía.': 'Your collection is already empty.',
    'Para confirmar escribe BORRAR': 'To confirm type BORRAR', 'No se borró nada.': 'Nothing was deleted.', 'Colección borrada.': 'Collection deleted.',
    'No se pudieron incluir las fotos de las cartas; se comparte sin ellas.': 'Card photos couldn’t be included; sharing without them.',
    '¿Hacer el cambio?': 'Make the trade?', '¿Te interesa alguna? 😄': 'Interested in any? 😄', '⇄ Intercambio (CardCalc)': '⇄ Trade (CardCalc)',
    '💸 Vendo estas cartas (CardCalc)': '💸 Cards for sale (CardCalc)', '📋 Lote de cartas (CardCalc)': '📋 Card batch (CardCalc)', '🔁 Mis cartas repetidas para cambiar (CardCalc)': '🔁 My duplicate cards to trade (CardCalc)',
    'Mi colección Pokémon TCG': 'My Pokémon TCG collection', 'Hecho con CardCalc · precios de TCGplayer y Cardmarket': 'Made with CardCalc · prices from TCGplayer and Cardmarket',
    'Mi colección': 'My collection', 'Mi colección de cartas (CardCalc)': 'My card collection (CardCalc)', 'Compartir colección': 'Share collection', 'Compartir': 'Share',
    'Intercambio': 'Trade', 'Mis repetidas': 'My duplicates', 'Cartas en venta': 'Cards for sale', 'Lote de cartas': 'Card batch',
    'Nombre de la carpeta nueva (ej. "Charizards", "Para regalar"):': 'New folder name (e.g. "Charizards", "Gifts"):', 'el archivo no es una copia de CardCalc': 'the file is not a CardCalc backup',
    'No pude leer el número': 'I couldn’t read the number',
    // cartas calificadas
    'Calificación (gradeo)': 'Grading', 'Sin calificar': 'Ungraded', '🏅 Calificadas': '🏅 Graded', 'Nota': 'Grade', 'opcional': 'optional',
    '🔎 Ventas reales en eBay': '🔎 Real sales on eBay', '📈 PriceCharting': '📈 PriceCharting', '🏅 BGS (Beckett)': '🏅 BGS (Beckett)',
  };

  const ESTADO = { Nueva: 'Near Mint', 'Casi nueva': 'Lightly Played', Jugada: 'Moderately Played', 'Muy jugada': 'Heavily Played', Dañada: 'Damaged' };
  const PAIS = { 'Peso colombiano': 'Colombian peso', 'Dólar estadounidense': 'US dollar', 'Peso mexicano': 'Mexican peso', Euro: 'Euro', 'Peso argentino': 'Argentine peso', 'Peso chileno': 'Chilean peso',
    'Sol peruano': 'Peruvian sol', 'Real brasileño': 'Brazilian real', 'Peso uruguayo': 'Uruguayan peso', Quetzal: 'Quetzal', 'Colón costarricense': 'Costa Rican colón', 'Peso dominicano': 'Dominican peso',
    'Libra esterlina': 'Pound sterling', 'Dólar canadiense': 'Canadian dollar' };
  const PLURAL = { pesos: 'pesos', dólares: 'dollars', euros: 'euros', soles: 'soles', reales: 'reais', quetzales: 'quetzales', colones: 'colones', libras: 'pounds' };
  const t = (s) => (E[s] !== undefined ? E[s] : s);
  const cartas = (n) => (+n === 1 ? 'card' : 'cards');

  const P = [
    // escáner
    [/^Buscando(.*)$/, 'Searching$1'],
    [/^No encontré «(.+)»\. Usa el nombre en español o el número tipo 43\/94\.$/, 'Nothing found for “$1”. Use the card name or a number like 43/94.'],
    [/^(\d+) resultados para «(.+)»\. Toca la tuya\.$/, '$1 results for “$2”. Tap yours.'],
    [/^(\d+) resultados? para «(.+)»$/, '$1 results for “$2”'],
    [/^Resultados para «(.+)»$/, 'Results for “$1”'],
    [/^No pude leer el número; busqué por nombre «(.+)»\. Elige tu carta\.$/, 'I couldn’t read the number; I searched by name “$1”. Pick your card.'],
    [/^Encontré (\d+) posibles\. La más probable está marcada; si no es, toca la tuya \(fíjate en el símbolo del set\)\.$/, 'Found $1 possible matches. The most likely is selected; if it’s wrong, tap yours (check the set symbol).'],
    [/^Error leyendo la foto: (.*)\. ¿Tienes internet\?$/, 'Error reading the photo: $1. Are you online?'],
    [/^Error de conexión: (.*)$/, 'Connection error: $1'], [/^Error: (.*)$/, 'Error: $1'],
    [/^No se pudo abrir la cámara en vivo \((.+)\)\. Usa 📷 o 🖼️\.$/, 'Couldn’t open the live camera ($1). Use 📷 or 🖼️.'],
    [/^No se pudo abrir la (galería|cámara): (.*)$/, (m, a, b) => `Couldn’t open the ${a === 'galería' ? 'gallery' : 'camera'}: ${b}`],
    [/^No se pudo consultar la carta \((.*)\)\. Revisa tu conexión\.$/, 'Couldn’t load the card ($1). Check your connection.'],
    [/^(\d+) cartas · valor (.+)$/, '$1 cards · value $2'], [/^(\d+) cartas · (\d+) distintas$/, '$1 cards · $2 unique'],
    [/^Valor del lote: (.+) · vendiéndolo al (\d+)%: (.+)$/, 'Batch value: $1 · selling at $2%: $3'],
    [/^＋ Guardar las (\d+) pendientes$/, '＋ Save the $1 pending'],
    [/^Consultando precios… (.+)$/, 'Checking prices… $1'],
    [/^(\d+) versiones · de la más barata a la más cara$/, '$1 versions · cheapest to most expensive'],
    [/^💲 Más barata:$/, '💲 Cheapest:'], [/^· más cara: (.+)$/, '· most expensive: $1'],
    [/^Última: (.+) · escribe la siguiente$/, 'Last: $1 · type the next one'],
    // ficha
    [/^Nº (.+) · (.+) (Español|Inglés|Japonés)$/, (m, a, b, c) => `No. ${a} · ${b} ${t(c)}`],
    [/^(Normal|Holo|Reverse holo|1ª edición|1ª ed\. holo|Unlimited holo) · (.+)$/, (m, a, b) => `${t(a)} · ${b}`],
    [/^TCGplayer · (.+)$/, (m, a) => `TCGplayer · ${t(a)}`], [/^Cardmarket \(japonesa\)(.*)$/, 'Cardmarket (Japanese)$1'],
    [/^En (pesos|dólares|euros|soles|reales|quetzales|colones|libras)$/, (m, a) => `In ${PLURAL[a]}`],
    [/^Precio consultado ahora mismo(?: \(TCGdex lo actualizó el (.+?)\))?\.\s*([\s\S]*)$/, (m, f, resto) => `Price checked just now${f ? ` (TCGdex updated it on ${f})` : ''}. ${({
      'Carta en inglés: el precio de TCGplayer corresponde exactamente a esta versión.': 'English card: the TCGplayer price is for exactly this version.',
      'Carta japonesa: precio de Cardmarket del producto japonés (en euros, convertido). TCGplayer casi no vende japonesas.': 'Japanese card: Cardmarket price of the Japanese product (in euros, converted). TCGplayer rarely sells Japanese cards.',
      'TCGplayer cotiza la versión en inglés; las cartas en español suelen venderse algo más baratas. Cardmarket mezcla idiomas.': 'TCGplayer prices the English version; Spanish cards usually sell a bit cheaper. Cardmarket mixes languages.',
    })[resto.trim()] || resto}`],
    [/^mín (.+) · máx (.+)$/, 'min $1 · max $2'],
    [/^Tu copia \(([^,)]+)(?:, (\d+)% del mercado)?\):$/, (m, e, p) => `Your copy (${ESTADO[e] || e}${p ? `, ${p}% of market` : ''}):`],
    [/^▲ ganas (.+)$/, '▲ you gain $1'], [/^▼ pierdes (.+)$/, '▼ you lose $1'], [/^ganas (.+)$/, 'you gain $1'], [/^pierdes (.+)$/, 'you lose $1'],
    [/^(\d+) copias$/, '$1 copies'], [/^en (pesos|dólares|euros|soles|reales|quetzales|colones|libras) \((\w+)\)$/, (m, a, b) => `in ${PLURAL[a]} (${b})`],
    [/^¿Quitar una copia de (.+)\? \(te quedan (\d+)\)$/, 'Remove one copy of $1? ($2 left)'], [/^¿Quitar (.+) de tu colección\?$/, 'Remove $1 from your collection?'],
    // colección
    [/^(\d+) cartas? \((\d+) distintas\) · valor de tu colección$/, (m, n, d) => `${n} ${cartas(n)} (${d} unique) · your collection’s value`],
    [/^(\d+) cartas? · valor de tu colección$/, (m, n) => `${n} ${cartas(n)} · your collection’s value`],
    [/^Actualizado: (.+?) · se actualiza solo cada (\d+) h al abrir la app$/, (m, a, h) => `Updated: ${t(a)} · auto-updates every ${h} h when you open the app`],
    [/^Actualizado: (.+?) · actualización solo a mano \(Ajustes\)$/, (m, a) => `Updated: ${t(a)} · manual updates only (Settings)`],
    [/^por (\d+) cartas? · hoy valen (.+) ·$/, (m, n, v) => `for ${n} ${cartas(n)} · worth ${v} today ·`],
    [/^(.+) las (\d+)$/, '$1 for $2'], [/^a (\d+)%$/, 'at $1%'],
    [/^(Común|Poco común|Rara|Holo Rara|Rara Doble|Ultra Rara|Rara Ilustración|Rara Ilustración Especial|Rara Híper|Rara Secreta|Holo Rara V|Holo Rara VMAX|Holo Rara VSTAR|Rara AS TÁCTICO|Rara Radiante|Promo) · (.+)$/, (m, a, b) => `${t(a)} · ${b}`],
    [/^(\S+) (Fuego|Agua|Planta|Eléctrico|Psíquico|Lucha|Siniestro|Metal|Dragón|Hada|Normal|Entrenador|Energía|Sin tipo)$/, (m, i, a) => `${i} ${a === 'Normal' ? 'Colorless' : t(a)}`],
    [/^(\S+) (Español|Inglés|Japonés)$/, (m, i, a) => `${i} ${t(a)}`],
    [/^📁 (.+)$/, (m, a) => `📁 ${t(a)}`],
    // sets / álbum
    [/^(\d+) de (\d+) cartas del set$/, '$1 of $2 cards in the set'],
    [/^Tienes (\d+) de (\d+) \((\d+)%\) · (\d+) te faltan en total \(incluye secretas\)$/, 'You have $1 of $2 ($3%) · $4 missing in total (incl. secret rares)'],
    // stats
    [/^(\d+) distintas$/, '$1 unique'], [/^(\d+) días? de datos$/, (m, n) => `${n} day${+n === 1 ? '' : 's'} of data`], [/^Otros \((\d+)\)$/, 'Others ($1)'],
    [/^(.+) · tienes (\d+): (.+) en total$/, '$1 · you have $2: $3 total'],
    // venta
    [/^(\d+) carta\(s\)$/, (m, n) => `${n} ${cartas(n)}`], [/^· mercado (.+) →$/, '· market $1 →'], [/^Mercado (.+) c\/u$/, 'Market $1 each'],
    // intercambio
    [/^Ganas (.+)$/, 'You gain $1'], [/^Pierdes (.+)$/, 'You lose $1'], [/^(.+) · de tu colección$/, '$1 · from your collection'],
    [/^(\d+) resultados?: toca la carta$/, (m, n) => `${n} result${+n === 1 ? '' : 's'}: tap the card`],
    [/^Idioma: (\S+) (Español|Inglés|Japonés) \(cámbialo en Escanear\)$/, (m, f, a) => `Language: ${f} ${t(a)} (change it in Scan)`],
    // deseos
    [/^(\d+) cartas? que quieres · costarían (.+)$/, (m, n, r) => `${n} ${cartas(n)} you want · would cost ${r}`],
    [/^(\d+) ya (está|están) a tu precio$/, (m, n) => `${n} ${+n === 1 ? 'is' : 'are'} at your price`],
    [/^· Tu precio: (.+)$/, (m, a) => `· Your price: ${t(a)}`], [/^Falta que baje (.+)$/, 'Needs to drop $1'],
    [/^🎯 (\d+) cartas? de tus deseos ya (está|están) a tu precio$/, (m, n) => `🎯 ${n} wishlist card${+n === 1 ? ' is' : 's are'} at your price`],
    // ajustes
    [/^1 US\$ = (.+)$/, '1 US$ = $1'], [/^· tasa del día \((.+)\)$/, '· today’s rate ($1)'],
    [/^(\S+) (\w{3}) · (.+)$/, (m, f, c, n) => (PAIS[n] ? `${f} ${c} · ${PAIS[n]}` : m)],
    [/^(\d+) carta\(s\) en tu colección · (\d+) deseo\(s\) · (\d+) KB usados en el celular$/, '$1 card(s) in your collection · $2 wishlist item(s) · $3 KB used on your phone'],
    [/^Dólar hoy (.+)$/, 'USD today $1'],
    // mensajes
    [/^Caché borrada \((\d+) elementos\)\. Tu colección no se tocó\.$/, 'Cache cleared ($1 items). Your collection was not touched.'],
    [/^• Salen de tu colección: (\d+) carta\(s\)(.*)$/, (m, n, r) => `• Leaving your collection: ${n} card(s)${r.replace(/\(\+(\d+) que no estaban guardadas\)/, '(+$1 that weren’t saved)')}`],
    [/^• Entran a tu colección: (\d+) carta\(s\)$/, '• Joining your collection: $1 card(s)'],
    [/^Precio actual: (.+)$/, (m, a) => `Current price: ${t(a)}`],
    [/^¿Hasta cuánto pagarías \(en (\w+), (\w+)\)\? Te aviso cuando llegue a ese precio\.$/, (m, p, c) => `How much would you pay (in ${PLURAL[p] || p}, ${c})? I’ll let you know when it reaches that price.`],
    [/^¿Hasta cuánto pagarías por (.+)\? \(en (\w+), (\w+)\)$/, (m, n, p, c) => `How much would you pay for ${n}? (in ${PLURAL[p] || p}, ${c})`],
    [/^¿Ya conseguiste (.+)\? Pasa a tu colección\.$/, 'Did you get $1? It moves to your collection.'],
    [/^¿Vendiste (\d+) carta\(s\) por (.+)\? Salen de tu colección\.$/, 'Did you sell $1 card(s) for $2? They leave your collection.'],
    [/^¿Borrar las (\d+) cartas de tu colección\? Esto no se puede deshacer\.$/, 'Delete the $1 cards in your collection? This can’t be undone.'],
    [/^Consejo: primero usa «Exportar» para guardar una copia\.$/, 'Tip: first use “Export” to save a copy.'],
    [/^Copia guardada en Documentos\/(.+) \((\d+) cartas\)\.$/, 'Backup saved to Documents/$1 ($2 cards).'],
    [/^No se pudo guardar en Documentos \((.*)\)\. Se intentará descargar\.$/, 'Couldn’t save to Documents ($1). Trying to download instead.'],
    [/^Importadas (\d+) cartas \((\d+) ya estaban\)\.$/, 'Imported $1 cards ($2 were already there).'], [/^No se pudo importar: (.*)$/, 'Couldn’t import: $1'],
    // compartir
    [/^📤 Doy \((.+)\):$/, '📤 I give ($1):'], [/^📥 Recibo \((.+)\):$/, '📥 I get ($1):'], [/^Diferencia: (.+)$/, 'Difference: $1'],
    [/^Total: (.+)$/, 'Total: $1'], [/^Al (\d+)%: (.+)$/, 'At $1%: $2'],
    [/^(• .+) c\/u$/, '$1 each'],
    // cartas calificadas
    [/^Estimado aproximado:$/, 'Rough estimate:'], [/^Precio real:$/, 'Real price:'],
    [/^Estimado: (.+) \(×([\d.]+) del precio sin calificar\)$/, 'Estimate: $1 (×$2 the ungraded price)'],
    [/^×([\d.]+) del precio sin calificar \((.+)\)\. Es una guía: cada carta se vende distinto\.$/, '×$1 the ungraded price ($2). It’s a guide: every card sells differently.'],
    [/^Precio real de esta carta calificada \(si lo sabes, en (\w+)\)$/, (m, p) => `Real price of this graded card (if you know it, in ${PLURAL[p] || p})`],
    // al final: el genérico (los específicos de arriba ganan)
    [/^(\d+) cartas? · (.+)$/, (m, n, r) => `${n} ${cartas(n)} · ${r}`],
  ];
  registrarTraducciones(E, P);
})();
