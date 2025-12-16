import type { Card, Suit } from '../types/card';
import type { PlayedCard, Cante } from '../types/game';
import type { TeamId } from '../types/player';
import { CARD_STRENGTH, CANTE_POINTS } from '../constants/cards';

/**
 * Determina las cartas válidas que un jugador puede jugar
 * Reglas del Tute por parejas:
 * 1. Si puedes seguir el palo pedido, debes hacerlo
 * 2. Si no puedes, debes tirar triunfo si hay triunfo en mesa y tienes uno mayor
 * 3. Si no puedes ninguna de las anteriores, puedes tirar cualquier carta
 */
export function getValidCards(
  hand: Card[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit
): Card[] {
  // Si es el primero en jugar, todas las cartas son válidas
  if (currentTrick.length === 0) {
    return hand;
  }

  const leadSuit = currentTrick[0].card.suit;
  const isLeadTrump = leadSuit === trumpSuit;
  
  // Cartas del palo pedido
  const suitCards = hand.filter(c => c.suit === leadSuit);
  
  // Cartas de triunfo
  const trumpCards = hand.filter(c => c.suit === trumpSuit);
  
  // Encontrar la carta más alta del palo pedido en la mesa
  const highestLeadCard = currentTrick
    .filter(pc => pc.card.suit === leadSuit)
    .sort((a, b) => CARD_STRENGTH[b.card.number] - CARD_STRENGTH[a.card.number])[0];
  
  // Encontrar el triunfo más alto en la mesa (si hay)
  const highestTrumpInTrick = currentTrick
    .filter(pc => pc.card.suit === trumpSuit)
    .sort((a, b) => CARD_STRENGTH[b.card.number] - CARD_STRENGTH[a.card.number])[0];

  // Caso 1: Tengo cartas del palo pedido
  if (suitCards.length > 0) {
    if (isLeadTrump) {
      // Si el palo pedido es triunfo, debo superar si puedo
      const higherTrumps = suitCards.filter(
        c => CARD_STRENGTH[c.number] > CARD_STRENGTH[highestLeadCard?.card.number || 0]
      );
      return higherTrumps.length > 0 ? higherTrumps : suitCards;
    } else {
      // Si no es triunfo, debo seguir el palo (no necesariamente superar)
      // Pero si puedo superar, debo hacerlo
      const higherCards = suitCards.filter(
        c => CARD_STRENGTH[c.number] > CARD_STRENGTH[highestLeadCard?.card.number || 0]
      );
      return higherCards.length > 0 ? higherCards : suitCards;
    }
  }

  // Caso 2: No tengo el palo pedido
  // Si hay triunfo en la mesa, debo superarlo si puedo
  if (highestTrumpInTrick && trumpCards.length > 0) {
    const higherTrumps = trumpCards.filter(
      c => CARD_STRENGTH[c.number] > CARD_STRENGTH[highestTrumpInTrick.card.number]
    );
    if (higherTrumps.length > 0) {
      return higherTrumps;
    }
    // Si no puedo superar el triunfo, debo tirar cualquier triunfo
    return trumpCards;
  }

  // Caso 3: No hay triunfo en mesa pero tengo triunfos
  if (trumpCards.length > 0 && !highestTrumpInTrick) {
    return trumpCards;
  }

  // Caso 4: No tengo ni el palo ni triunfos, puedo tirar cualquier carta
  return hand;
}

/**
 * Determina el ganador de una baza
 */
export function getTrickWinner(trick: PlayedCard[], trumpSuit: Suit): PlayedCard {
  if (trick.length === 0) {
    throw new Error('La baza está vacía');
  }

  const leadSuit = trick[0].card.suit;
  
  // Buscar triunfos jugados
  const trumpsPlayed = trick.filter(pc => pc.card.suit === trumpSuit);
  
  if (trumpsPlayed.length > 0) {
    // Gana el triunfo más alto
    return trumpsPlayed.reduce((highest, current) => 
      CARD_STRENGTH[current.card.number] > CARD_STRENGTH[highest.card.number] 
        ? current 
        : highest
    );
  }
  
  // Si no hay triunfos, gana la carta más alta del palo de salida
  const leadSuitCards = trick.filter(pc => pc.card.suit === leadSuit);
  return leadSuitCards.reduce((highest, current) => 
    CARD_STRENGTH[current.card.number] > CARD_STRENGTH[highest.card.number] 
      ? current 
      : highest
  );
}

/**
 * Calcula los puntos de una baza
 */
export function calculateTrickPoints(trick: PlayedCard[]): number {
  return trick.reduce((sum, pc) => sum + pc.card.value, 0);
}

/**
 * Verifica si un jugador puede cantar 20 o 40
 * Debe tener Rey y Caballo del mismo palo
 * Y su equipo debe haber ganado la baza anterior
 */
export function canDeclare20or40(
  hand: Card[],
  trumpSuit: Suit,
  teamWonLastTrick: boolean,
  alreadyDeclaredThisRound: boolean
): { canDeclare: boolean; availableCantes: Array<{ type: '20' | '40'; suit: Suit }> } {
  if (!teamWonLastTrick || alreadyDeclaredThisRound) {
    return { canDeclare: false, availableCantes: [] };
  }

  const availableCantes: Array<{ type: '20' | '40'; suit: Suit }> = [];

  // Buscar pares Rey-Caballo
  const suits: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];
  
  for (const suit of suits) {
    const hasKing = hand.some(c => c.suit === suit && c.number === 12);
    const hasKnight = hand.some(c => c.suit === suit && c.number === 11);
    
    if (hasKing && hasKnight) {
      const canteType = suit === trumpSuit ? '40' : '20';
      availableCantes.push({ type: canteType, suit });
    }
  }

  return {
    canDeclare: availableCantes.length > 0,
    availableCantes,
  };
}

/**
 * Verifica si un jugador puede cantar Tute
 * Debe tener los 4 Reyes o los 4 Caballos
 * Y debe ser la primera baza ganada por su equipo en la ronda
 * Y no haber cantado 20 o 40 antes
 */
export function canDeclareTute(
  hand: Card[],
  isFirstTrickWonByTeam: boolean,
  teamHasDeclared20or40: boolean
): { canDeclare: boolean; type: 'reyes' | 'caballos' | null } {
  if (!isFirstTrickWonByTeam || teamHasDeclared20or40) {
    return { canDeclare: false, type: null };
  }

  const kings = hand.filter(c => c.number === 12);
  const knights = hand.filter(c => c.number === 11);

  if (kings.length === 4) {
    return { canDeclare: true, type: 'reyes' };
  }
  
  if (knights.length === 4) {
    return { canDeclare: true, type: 'caballos' };
  }

  return { canDeclare: false, type: null };
}

/**
 * Calcula la puntuación final de una ronda
 */
export function calculateRoundScore(
  team0Tricks: Card[],
  team1Tricks: Card[],
  team0Cantes: Cante[],
  team1Cantes: Cante[],
  lastTrickWinnerTeam: TeamId,
  _trumpSuit: Suit
): { team0Points: number; team1Points: number; winner: TeamId } {
  // Puntos por cartas
  let team0Points = team0Tricks.reduce((sum, c) => sum + c.value, 0);
  let team1Points = team1Tricks.reduce((sum, c) => sum + c.value, 0);

  // Puntos por última baza (10 de últimas)
  if (lastTrickWinnerTeam === 0) {
    team0Points += 10;
  } else {
    team1Points += 10;
  }

  // Verificar Tute (gana automáticamente)
  const team0HasTute = team0Cantes.some(c => c.type === 'tute');
  const team1HasTute = team1Cantes.some(c => c.type === 'tute');

  if (team0HasTute) {
    return { team0Points: 999, team1Points: 0, winner: 0 };
  }
  if (team1HasTute) {
    return { team0Points: 0, team1Points: 999, winner: 1 };
  }

  // Puntos por cantes (20 y 40)
  for (const cante of team0Cantes) {
    if (cante.type !== 'tute') {
      team0Points += CANTE_POINTS[cante.type];
    }
  }
  for (const cante of team1Cantes) {
    if (cante.type !== 'tute') {
      team1Points += CANTE_POINTS[cante.type];
    }
  }

  // Determinar ganador
  let winner: TeamId;
  if (team0Points > team1Points) {
    winner = 0;
  } else if (team1Points > team0Points) {
    winner = 1;
  } else {
    // Empate: gana el que hizo la última baza
    winner = lastTrickWinnerTeam;
  }

  return { team0Points, team1Points, winner };
}

/**
 * Verifica si una carta específica puede ser jugada
 */
export function isCardPlayable(
  card: Card,
  hand: Card[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit
): boolean {
  const validCards = getValidCards(hand, currentTrick, trumpSuit);
  return validCards.some(c => c.id === card.id);
}
