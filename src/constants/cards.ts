import type { Card, CardNumber, Suit } from '../types/card';

// Palos de la baraja española
export const SUITS: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];

// Números de cartas (sin 8 y 9 para baraja de 40)
export const CARD_NUMBERS: CardNumber[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

// Valor en puntos de cada carta
export const CARD_VALUES: Record<CardNumber, number> = {
  1: 11,   // As
  2: 0,
  3: 10,   // Tres
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  10: 2,   // Sota
  11: 3,   // Caballo
  12: 4,   // Rey
};

// Nombres de las cartas especiales
export const CARD_NAMES: Partial<Record<CardNumber, string>> = {
  1: 'As',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
};

// Orden de fuerza de las cartas (mayor índice = más fuerte)
export const CARD_STRENGTH: Record<CardNumber, number> = {
  2: 0,
  4: 1,
  5: 2,
  6: 3,
  7: 4,
  10: 5,   // Sota
  11: 6,   // Caballo
  12: 7,   // Rey
  3: 8,    // Tres (segunda más fuerte)
  1: 9,    // As (la más fuerte)
};

// Nombres de los palos en español
export const SUIT_NAMES: Record<Suit, string> = {
  oros: 'Oros',
  copas: 'Copas',
  espadas: 'Espadas',
  bastos: 'Bastos',
};

// Colores de los palos para UI
export const SUIT_COLORS: Record<Suit, string> = {
  oros: '#daa520',
  copas: '#dc143c',
  espadas: '#4169e1',
  bastos: '#228b22',
};

// Símbolos Unicode aproximados para los palos
export const SUIT_SYMBOLS: Record<Suit, string> = {
  oros: '●',      // Círculo para moneda
  copas: '🏆',    // Copa
  espadas: '⚔',   // Espadas cruzadas
  bastos: '⚚',    // Bastón
};

// Total de puntos en el mazo
export const TOTAL_DECK_POINTS = 120;

// Puntos por última baza
export const LAST_TRICK_BONUS = 10;

// Puntos por cante
export const CANTE_POINTS = {
  '20': 20,
  '40': 40,
  'tute': Infinity, // Gana la ronda automáticamente
};

// Crear una carta
export function createCard(suit: Suit, number: CardNumber): Card {
  return {
    id: `${suit}-${number}`,
    suit,
    number,
    value: CARD_VALUES[number],
  };
}

// Crear el mazo completo de 40 cartas
export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  for (const suit of SUITS) {
    for (const number of CARD_NUMBERS) {
      deck.push(createCard(suit, number));
    }
  }
  
  return deck;
}

// Obtener nombre completo de una carta
export function getCardName(card: Card): string {
  const numberName = CARD_NAMES[card.number] || card.number.toString();
  return `${numberName} de ${SUIT_NAMES[card.suit]}`;
}

// Comparar fuerza de dos cartas del mismo palo
export function compareCards(card1: Card, card2: Card): number {
  return CARD_STRENGTH[card1.number] - CARD_STRENGTH[card2.number];
}
