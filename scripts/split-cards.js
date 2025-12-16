import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de la baraja española
const SUITS = ['oros', 'copas', 'espadas', 'bastos'];
// Números de la baraja: 1-7, 10(sota), 11(caballo), 12(rey)
// En la imagen: columnas 0-9 = 1,2,3,4,5,6,7,8,9,10 pero la baraja española no tiene 8,9
// Mirando la imagen: As, 2, 3, 4, 5, 6, 7, 8, 9, Sota(10), Caballo(11), Rey(12), Reverso
const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12]; // 10 cartas por palo (sin 8 y 9)

// La imagen tiene 13 columnas y 4 filas
const COLUMNS = 13; // incluye el reverso
const ROWS = 4;

async function splitCards() {
  const inputPath = join(__dirname, '..', 'public', 'baraja_espanola_vector__alpha_x1_draft__by_electrolex_de1o5nm.png');
  const outputDir = join(__dirname, '..', 'public', 'cards');

  // Crear directorio de salida
  await mkdir(outputDir, { recursive: true });

  // Obtener dimensiones de la imagen
  const metadata = await sharp(inputPath).metadata();
  const { width, height } = metadata;

  console.log(`Imagen: ${width}x${height}`);

  const cardWidth = Math.floor(width / COLUMNS);
  const cardHeight = Math.floor(height / ROWS);

  console.log(`Tamaño de cada carta: ${cardWidth}x${cardHeight}`);

  // Mapeo de columnas a números de carta
  // Columnas: 0=As(1), 1=2, 2=3, 3=4, 4=5, 5=6, 6=7, 7=8, 8=9, 9=Sota(10), 10=Caballo(11), 11=Rey(12), 12=Reverso
  // Pero la baraja española de 40 cartas NO tiene 8 y 9
  const columnToNumber = {
    0: 1,   // As
    1: 2,
    2: 3,
    3: 4,
    4: 5,
    5: 6,
    6: 7,
    7: 8,   // El 8 existe en algunas barajas
    8: 9,   // El 9 existe en algunas barajas  
    9: 10,  // Sota
    10: 11, // Caballo
    11: 12, // Rey
    12: 'back' // Reverso
  };

  let extracted = 0;

  for (let row = 0; row < ROWS; row++) {
    const suit = SUITS[row];
    
    for (let col = 0; col < COLUMNS; col++) {
      const cardNum = columnToNumber[col];
      
      // Calcular la región a extraer
      const left = col * cardWidth;
      const top = row * cardHeight;

      let filename;
      if (cardNum === 'back') {
        // Solo guardar un reverso (de la primera fila)
        if (row === 0) {
          filename = 'back.png';
        } else {
          continue;
        }
      } else {
        filename = `${suit}-${cardNum}.png`;
      }

      const outputPath = join(outputDir, filename);

      try {
        await sharp(inputPath)
          .extract({ left, top, width: cardWidth, height: cardHeight })
          .png()
          .toFile(outputPath);

        console.log(`✓ Extraída: ${filename}`);
        extracted++;
      } catch (error) {
        console.error(`✗ Error en ${filename}:`, error.message);
      }
    }
  }

  console.log(`\n¡Completado! ${extracted} cartas extraídas en ${outputDir}`);
}

splitCards().catch(console.error);
