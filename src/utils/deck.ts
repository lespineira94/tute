import type { Card, Suit } from '../types/card';
import type { PlayerPosition, TeamId } from '../types/player';
import { createDeck } from '../constants/cards';

/**
 * Baraja un array usando el algoritmo Fisher-Yates
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Crea y baraja un mazo nuevo
 */
export function createShuffledDeck(): Card[] {
  return shuffle(createDeck());
}

/**
 * Reparte cartas a los jugadores
 * En Tute por parejas, cada jugador recibe 10 cartas
 */
export function dealCards(
  deck: Card[],
  numPlayers: 4
): { hands: Card[][]; trumpCard: Card; trumpSuit: Suit } {
  const cardsPerPlayer = deck.length / numPlayers; // 10 cartas cada uno
  const hands: Card[][] = [];

  for (let i = 0; i < numPlayers; i++) {
    const start = i * cardsPerPlayer;
    const end = start + cardsPerPlayer;
    hands.push(deck.slice(start, end));
  }

  // En Tute por parejas con 40 cartas, la última carta del último jugador
  // define el triunfo (o la primera del mazo si se juega diferente)
  // Usamos la última carta repartida como triunfo
  const trumpCard = hands[numPlayers - 1][cardsPerPlayer - 1];
  const trumpSuit = trumpCard.suit;

  return { hands, trumpCard, trumpSuit };
}

/**
 * Determina el equipo de un jugador según su posición
 * Posiciones 0 y 2 = Equipo 0
 * Posiciones 1 y 3 = Equipo 1
 */
export function getTeamFromPosition(position: PlayerPosition): TeamId {
  return (position % 2) as TeamId;
}

/**
 * Obtiene el compañero de un jugador
 */
export function getPartnerPosition(position: PlayerPosition): PlayerPosition {
  return ((position + 2) % 4) as PlayerPosition;
}

/**
 * Obtiene el siguiente jugador (sentido antihorario)
 */
export function getNextPlayerPosition(position: PlayerPosition): PlayerPosition {
  // Antihorario: 0 -> 3 -> 2 -> 1 -> 0
  return ((position + 3) % 4) as PlayerPosition;
}

/**
 * Ordena las cartas de una mano por palo y valor
 */
export function sortHand(hand: Card[], trumpSuit?: Suit): Card[] {
  const suitOrder: Suit[] = trumpSuit 
    ? [trumpSuit, ...(['oros', 'copas', 'espadas', 'bastos'] as Suit[]).filter(s => s !== trumpSuit)]
    : ['oros', 'copas', 'espadas', 'bastos'];

  return [...hand].sort((a, b) => {
    const suitDiff = suitOrder.indexOf(a.suit) - suitOrder.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    
    // Ordenar por fuerza dentro del palo (As > 3 > Rey > Caballo > Sota > 7...2)
    const strengthOrder = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];
    return strengthOrder.indexOf(a.number) - strengthOrder.indexOf(b.number);
  });
}

/**
 * Genera un código de sala único
 */
export function generateRoomCode(): string {
  // Caracteres sin ambigüedad (sin 0/O, 1/I/L)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Genera un ID único para un jugador
 */
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Genera un secreto para reconexión
 */
export function generatePlayerSecret(): string {
  return Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
}

/**
 * Calcula los puntos totales de un conjunto de cartas
 */
export function calculatePoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + card.value, 0);
}
