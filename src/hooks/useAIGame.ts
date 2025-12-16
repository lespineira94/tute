import { useState, useCallback, useEffect, useRef } from 'react';
import type { Card, Suit } from '../types/card';

// Tipos internos para el juego local
type CardNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;
type PlayerPosition = 0 | 1 | 2 | 3;
type TeamId = 1 | 2;

interface PlayedCard {
  playerId: string;
  card: Card;
  position: PlayerPosition;
}

interface AIPlayer {
  id: string;
  name: string;
  position: PlayerPosition;
  team: TeamId;
  hand: Card[];
  isAI: boolean;
}

interface TrickHistory {
  cards: PlayedCard[];
  winner: PlayerPosition;
  points: number;
}

interface CanteInfo {
  playerId: string;
  playerName: string;
  suit: Suit;
  points: 20 | 40;
}

interface AIGameState {
  phase: 'waiting' | 'playing' | 'finished';
  players: AIPlayer[];
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  currentPlayerPosition: PlayerPosition;
  leadPlayerPosition: PlayerPosition;
  currentTrick: PlayedCard[];
  currentTrickWinner: PlayerPosition | null; // Ganador de la baza actual (cuando hay 4 cartas)
  trickHistory: TrickHistory[]; // Historial de bazas de la ronda
  canteHistory: CanteInfo[]; // Historial de cantes de la ronda
  scores: { 1: { points: number; games: number }; 2: { points: number; games: number } };
  roundNumber: number;
  lastTrickWinner: PlayerPosition | null;
  gameWinner: TeamId | null;
  myPosition: PlayerPosition;
  myHand: Card[];
  lastCante: CanteInfo | null; // Último cante realizado
  cantedSuits: Suit[]; // Palos ya cantados en esta ronda
  difficulty: AIDifficulty;
}

// Constantes del juego
const SUITS: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];
const NUMBERS: CardNumber[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const CARD_VALUES: Record<number, number> = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
const CARD_STRENGTH: Record<number, number> = { 1: 14, 3: 13, 12: 12, 11: 11, 10: 10, 7: 7, 6: 6, 5: 5, 4: 4, 2: 2 };

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const num of NUMBERS) {
      deck.push({
        id: `${suit}-${num}`,
        suit,
        number: num,
        value: CARD_VALUES[num] || 0,
      });
    }
  }
  return deck;
}

function getCardStrength(card: Card, trumpSuit: Suit | null, leadSuit: Suit | null): number {
  const baseStrength = CARD_STRENGTH[card.number] || card.number;
  
  if (card.suit === trumpSuit) {
    return baseStrength + 100; // Triunfo siempre gana
  }
  if (card.suit === leadSuit) {
    return baseStrength + 50; // Palo de salida
  }
  return baseStrength; // Otro palo
}

function determineTrickWinner(
  trick: PlayedCard[], 
  trumpSuit: Suit | null
): { winner: PlayedCard; points: number } {
  const leadSuit = trick[0].card.suit;
  let winner = trick[0];
  let maxStrength = getCardStrength(trick[0].card, trumpSuit, leadSuit);
  let points = trick[0].card.value || 0;

  for (let i = 1; i < trick.length; i++) {
    const current = trick[i];
    points += current.card.value || 0;
    const strength = getCardStrength(current.card, trumpSuit, leadSuit);
    
    if (strength > maxStrength) {
      maxStrength = strength;
      winner = current;
    }
  }

  return { winner, points };
}

// Exportamos esta función para usarla en la UI
export function getValidCards(
  hand: Card[], 
  currentTrick: PlayedCard[], 
  trumpSuit: Suit | null
): Card[] {
  // Si es el primero en jugar, puede jugar cualquier carta
  if (currentTrick.length === 0) {
    return hand;
  }

  const leadSuit = currentTrick[0].card.suit;
  const cardsOfLeadSuit = hand.filter(c => c.suit === leadSuit);
  
  // Obtener la carta ganadora actual
  const currentWinner = determineTrickWinner(
    currentTrick.map(pc => pc), 
    trumpSuit
  ).winner;
  const winnerStrength = getCardStrength(currentWinner.card, trumpSuit, leadSuit);

  // Si tiene del palo de salida
  if (cardsOfLeadSuit.length > 0) {
    // Buscar cartas que puedan ganar
    const winningCards = cardsOfLeadSuit.filter(
      c => getCardStrength(c, trumpSuit, leadSuit) > winnerStrength
    );
    // Si puede ganar, debe montar (jugar carta superior)
    if (winningCards.length > 0) return winningCards;
    // Si no puede ganar, puede jugar cualquier carta del palo
    return cardsOfLeadSuit;
  }

  // Si no tiene del palo de salida, debe jugar triunfo si tiene
  const trumpCards = hand.filter(c => c.suit === trumpSuit);
  if (trumpCards.length > 0) {
    // Si hay triunfo en la baza, debe superar si puede
    const winnerIsTrump = currentWinner.card.suit === trumpSuit;
    if (winnerIsTrump) {
      const higherTrumps = trumpCards.filter(
        c => getCardStrength(c, trumpSuit, leadSuit) > winnerStrength
      );
      if (higherTrumps.length > 0) return higherTrumps;
    }
    return trumpCards;
  }

  // Si no tiene ni del palo ni triunfo, puede jugar cualquiera
  return hand;
}

// Detectar posibles cantes en una mano
function getAvailableCantes(
  hand: Card[], 
  trumpSuit: Suit | null, 
  cantedSuits: Suit[]
): { suit: Suit; points: 20 | 40 }[] {
  const cantes: { suit: Suit; points: 20 | 40 }[] = [];
  
  for (const suit of SUITS) {
    if (cantedSuits.includes(suit)) continue; // Ya cantado
    
    const hasKing = hand.some(c => c.suit === suit && c.number === 12);
    const hasHorse = hand.some(c => c.suit === suit && c.number === 11);
    
    if (hasKing && hasHorse) {
      cantes.push({
        suit,
        points: suit === trumpSuit ? 40 : 20,
      });
    }
  }
  
  return cantes;
}

// IA simple: juega la carta más alta válida, o la más baja si no puede ganar
type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Función para contar cartas jugadas y deducir información
function analyzePlayedCards(
  trickHistory: TrickHistory[],
  currentTrick: PlayedCard[],
  myHand: Card[],
  trumpCard: Card | null
): {
  playedCards: Set<string>;
  remainingCardsByPlayer: Map<PlayerPosition, number>;
  suitVoids: Map<PlayerPosition, Set<Suit>>;
} {
  const playedCards = new Set<string>();
  const suitVoids = new Map<PlayerPosition, Set<Suit>>();
  
  // Inicializar voids para cada jugador
  for (let i = 0; i < 4; i++) {
    suitVoids.set(i as PlayerPosition, new Set<Suit>());
  }

  // Analizar historial de bazas
  for (const trick of trickHistory) {
    const leadSuit = trick.cards[0].card.suit;
    
    for (const playedCard of trick.cards) {
      playedCards.add(playedCard.card.id);
      
      // Si un jugador no siguió el palo de salida, está falto
      if (playedCard.card.suit !== leadSuit && playedCard.card.suit !== trumpCard?.suit) {
        suitVoids.get(playedCard.position)?.add(leadSuit);
      }
    }
  }

  // Analizar baza actual
  if (currentTrick.length > 0) {
    const leadSuit = currentTrick[0].card.suit;
    for (const playedCard of currentTrick) {
      playedCards.add(playedCard.card.id);
      
      if (playedCard.card.suit !== leadSuit && playedCard.card.suit !== trumpCard?.suit) {
        suitVoids.get(playedCard.position)?.add(leadSuit);
      }
    }
  }

  // Añadir cartas de mi mano como jugadas (para saber qué queda en juego)
  for (const card of myHand) {
    playedCards.add(card.id);
  }

  // Calcular cartas restantes por jugador
  const totalCardsPlayed = trickHistory.length * 4 + currentTrick.length;
  const cardsPerPlayer = 10 - Math.floor(totalCardsPlayed / 4);
  const remainingCardsByPlayer = new Map<PlayerPosition, number>();
  
  for (let i = 0; i < 4; i++) {
    remainingCardsByPlayer.set(i as PlayerPosition, cardsPerPlayer);
  }

  return { playedCards, remainingCardsByPlayer, suitVoids };
}

// Calcular probabilidad de que una carta gane la baza
function calculateWinProbability(
  card: Card,
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null,
  playedCards: Set<string>,
  myPosition: PlayerPosition
): number {
  if (currentTrick.length === 0) return 0.5; // Primera carta, 50% base

  const leadSuit = currentTrick[0].card.suit;
  const currentWinner = determineTrickWinner([...currentTrick, {
    playerId: 'temp',
    card,
    position: myPosition
  }], trumpSuit);

  // Si nuestra carta ganaría ahora
  const tempWinner = currentWinner.winner;
  if (tempWinner.position === myPosition) {
    // Calcular cuántos jugadores quedan y si pueden tener cartas superiores
    const remainingPlayers = 4 - currentTrick.length - 1;
    if (remainingPlayers === 0) return 1.0; // Última carta, ganamos seguro

    // Contar cartas superiores que no se han jugado
    const cardStrength = getCardStrength(card, trumpSuit, leadSuit);
    let superiorCardsRemaining = 0;

    // Verificar todas las cartas del palo
    const allNumbers: CardNumber[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
    
    // Cartas del palo de salida
    for (const num of allNumbers) {
      const cardId = `${leadSuit}-${num}`;
      if (!playedCards.has(cardId)) {
        const testCard: Card = { id: cardId, suit: leadSuit, number: num, value: CARD_VALUES[num] || 0 };
        if (getCardStrength(testCard, trumpSuit, leadSuit) > cardStrength) {
          superiorCardsRemaining++;
        }
      }
    }

    // Si jugamos triunfo, contar triunfos superiores
    if (trumpSuit && card.suit === trumpSuit) {
      for (const num of allNumbers) {
        const cardId = `${trumpSuit}-${num}`;
        if (!playedCards.has(cardId)) {
          const testCard: Card = { id: cardId, suit: trumpSuit, number: num, value: CARD_VALUES[num] || 0 };
          if (getCardStrength(testCard, trumpSuit, leadSuit) > cardStrength) {
            superiorCardsRemaining++;
          }
        }
      }
    }

    // Probabilidad = 1 - (cartas superiores / cartas totales posibles)
    const probability = Math.max(0.3, 1 - (superiorCardsRemaining * 0.15));
    return probability;
  }

  return 0.1; // No ganamos con esta carta
}

function aiSelectCard(
  hand: Card[], 
  currentTrick: PlayedCard[], 
  trumpSuit: Suit | null,
  partnerPosition: PlayerPosition | null,
  difficulty: AIDifficulty = 'medium',
  trickHistory: TrickHistory[] = [],
  myPosition: PlayerPosition = 1,
  trumpCard: Card | null = null
): Card {
  const validCards = getValidCards(hand, currentTrick, trumpSuit);
  
  if (validCards.length === 1) {
    return validCards[0];
  }

  // EXPERTO: Contar cartas y analizar situación
  if (difficulty === 'expert') {
    const { playedCards, suitVoids } = analyzePlayedCards(trickHistory, currentTrick, hand, trumpCard);
    
    if (currentTrick.length === 0) {
      // Salir: Estrategia experta basada en conteo de cartas
      const sorted = [...validCards].sort((a, b) => (b.value || 0) - (a.value || 0));
      
      // Buscar cartas ganadoras probables
      const strongCards = sorted.filter(c => {
        const strength = getCardStrength(c, trumpSuit, null);
        return strength >= 12; // As o Tres
      });

      // Si tenemos As o Tres de un palo donde detectamos que otros están faltos
      for (const card of strongCards) {
        const opponentsVoid = Array.from(suitVoids.entries()).filter(
          ([pos, voids]) => pos !== myPosition && pos !== partnerPosition && voids.has(card.suit)
        );
        if (opponentsVoid.length >= 1) {
          // Oponentes faltos en este palo, salir con fuerza
          return card;
        }
      }

      // Salir con cartas sin puntos si es posible
      const noPointCards = sorted.filter(c => (c.value || 0) === 0);
      if (noPointCards.length > 0) {
        return noPointCards[Math.floor(noPointCards.length / 2)];
      }
      
      return sorted[Math.floor(sorted.length / 3)];
    }

    // Durante la baza: calcular probabilidad de victoria
    const cardsWithProb = validCards.map(card => ({
      card,
      probability: calculateWinProbability(card, currentTrick, trumpSuit, playedCards, myPosition)
    }));

    // Ver si compañero va ganando
    if (currentTrick.length >= 2 && partnerPosition !== null) {
      const partnerCard = currentTrick.find(pc => pc.position === partnerPosition);
      if (partnerCard) {
        const { winner } = determineTrickWinner(currentTrick, trumpSuit);
        if (winner.position === partnerPosition) {
          // Compañero gana, jugar carta baja con puntos
          const sortedByValue = [...validCards].sort((a, b) => 
            getCardStrength(a, trumpSuit, currentTrick[0].card.suit) - getCardStrength(b, trumpSuit, currentTrick[0].card.suit)
          );
          const withPoints = sortedByValue.filter(c => (c.value || 0) > 0);
          if (withPoints.length > 0) {
            return withPoints[0]; // Carta más baja con puntos
          }
          return sortedByValue[0];
        }
      }
    }

    // Intentar ganar con la carta de mayor probabilidad y menor valor
    const winningCards = cardsWithProb
      .filter(c => c.probability > 0.5)
      .sort((a, b) => {
        // Priorizar: alta probabilidad, bajo valor (para no gastar cartas fuertes)
        const probDiff = b.probability - a.probability;
        if (Math.abs(probDiff) > 0.2) return probDiff;
        return (a.card.value || 0) - (b.card.value || 0);
      });

    if (winningCards.length > 0) {
      return winningCards[0].card;
    }

    // No podemos ganar, tirar la carta con menos puntos
    const sortedByValue = [...validCards].sort((a, b) => (a.value || 0) - (b.value || 0));
    return sortedByValue[0];
  }

  // FÁCIL: Juega aleatorio con 70% de probabilidad
  if (difficulty === 'easy') {
    if (Math.random() < 0.7) {
      return validCards[Math.floor(Math.random() * validCards.length)];
    }
    // 30% usa estrategia básica
  }

  if (currentTrick.length === 0) {
    // Salir: estrategia según dificultad
    if (difficulty === 'easy') {
      // Jugar carta aleatoria
      return validCards[Math.floor(Math.random() * validCards.length)];
    } else if (difficulty === 'medium') {
      // Jugar carta media
      return validCards[Math.floor(validCards.length / 2)];
    } else {
      // Difícil: Jugar carta estratégica (baja sin puntos o media-alta con puntos)
      const sorted = [...validCards].sort((a, b) => (b.value || 0) - (a.value || 0));
      // Si tiene cartas sin puntos, jugar una de ellas
      const noPointCards = sorted.filter(c => (c.value || 0) === 0);
      if (noPointCards.length > 0) {
        return noPointCards[Math.floor(noPointCards.length / 2)];
      }
      return sorted[Math.floor(sorted.length / 3)];
    }
  }

  const leadSuit = currentTrick[0].card.suit;
  
  // Ordenar por fuerza
  const sorted = [...validCards].sort((a, b) => 
    getCardStrength(b, trumpSuit, leadSuit) - getCardStrength(a, trumpSuit, leadSuit)
  );

  // MEDIO: Estrategia básica sin mirar al compañero
  if (difficulty === 'medium') {
    const { winner: currentWinner } = determineTrickWinner(currentTrick, trumpSuit);
    const currentWinStrength = getCardStrength(currentWinner.card, trumpSuit, leadSuit);

    // Intentar ganar con carta baja
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (getCardStrength(sorted[i], trumpSuit, leadSuit) > currentWinStrength) {
        return sorted[i];
      }
    }
    // No puede ganar, jugar la más baja
    return sorted[sorted.length - 1];
  }

  // DIFÍCIL/HARD: Estrategia avanzada mirando al compañero
  // Ver si el compañero va ganando
  if (currentTrick.length >= 2 && partnerPosition !== null) {
    const partnerCard = currentTrick.find(pc => pc.position === partnerPosition);
    if (partnerCard) {
      const { winner } = determineTrickWinner(currentTrick, trumpSuit);
      if (winner.position === partnerPosition) {
        // Compañero gana, jugar carta baja con puntos si es posible
        const withPoints = sorted.filter(c => (c.value || 0) > 0);
        if (withPoints.length > 0) {
          return withPoints[withPoints.length - 1];
        }
        return sorted[sorted.length - 1];
      }
    }
  }

  // Intentar ganar con la carta más baja posible que gane
  const { winner: currentWinner } = determineTrickWinner(currentTrick, trumpSuit);
  const currentWinStrength = getCardStrength(currentWinner.card, trumpSuit, leadSuit);

  for (let i = sorted.length - 1; i >= 0; i--) {
    if (getCardStrength(sorted[i], trumpSuit, leadSuit) > currentWinStrength) {
      return sorted[i];
    }
  }

  // No puede ganar, jugar la carta con menos puntos
  const sortedByValue = [...sorted].sort((a, b) => (a.value || 0) - (b.value || 0));
  return sortedByValue[0];
}

export function useAIGame() {
  const [gameState, setGameState] = useState<AIGameState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTrickResolution, setPendingTrickResolution] = useState(false);
  const aiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startGame = useCallback((playerName: string, difficulty: AIDifficulty = 'medium') => {
    const deck = shuffle(createDeck());

    const players: AIPlayer[] = [
      { id: 'human', name: playerName, position: 0, team: 1, hand: deck.slice(0, 10), isAI: false },
      { id: 'ai1', name: 'Bot Carlos', position: 1, team: 2, hand: deck.slice(10, 20), isAI: true },
      { id: 'ai2', name: 'Bot María', position: 2, team: 1, hand: deck.slice(20, 30), isAI: true },
      { id: 'ai3', name: 'Bot Pedro', position: 3, team: 2, hand: deck.slice(30, 40), isAI: true },
    ];

    const trumpCard = deck[deck.length - 1];

    setGameState({
      phase: 'playing',
      players,
      trumpCard,
      trumpSuit: trumpCard.suit,
      currentPlayerPosition: 0,
      leadPlayerPosition: 0,
      currentTrick: [],
      currentTrickWinner: null,
      trickHistory: [],
      canteHistory: [],
      scores: { 1: { points: 0, games: 0 }, 2: { points: 0, games: 0 } },
      roundNumber: 1,
      lastTrickWinner: null,
      gameWinner: null,
      myPosition: 0,
      myHand: players[0].hand,
      lastCante: null,
      cantedSuits: [],
      difficulty,
    });
  }, []);

  // Resolver una baza completa (llamada después del delay)
  const resolveTrick = useCallback(() => {
    setGameState(prev => {
      if (!prev || prev.currentTrick.length !== 4) return prev;

      const { winner, points } = determineTrickWinner(prev.currentTrick, prev.trumpSuit);
      const winnerPlayer = prev.players.find(p => p.position === winner.position)!;
      const winningTeam = winnerPlayer.team;

      const newScores = { ...prev.scores };
      newScores[winningTeam] = {
        ...newScores[winningTeam],
        points: newScores[winningTeam].points + points,
      };

      // Añadir al historial de bazas
      const newTrickHistory: TrickHistory[] = [...prev.trickHistory, {
        cards: [...prev.currentTrick],
        winner: winner.position,
        points,
      }];

      // Verificar si terminó la ronda
      const allCardsPlayed = prev.players.every(p => p.hand.length === 0);

      if (allCardsPlayed) {
        // 10 puntos extra por última baza
        newScores[winningTeam].points += 10;

        // Determinar ganador de la ronda
        const team1Points = newScores[1].points;
        const team2Points = newScores[2].points;

        let gameWinner: TeamId | null = null;
        if (team1Points > team2Points) {
          newScores[1].games += 1;
          if (newScores[1].games >= 3) gameWinner = 1;
        } else if (team2Points > team1Points) {
          newScores[2].games += 1;
          if (newScores[2].games >= 3) gameWinner = 2;
        }

        if (gameWinner) {
          return {
            ...prev,
            currentTrick: [],
            currentTrickWinner: null,
            trickHistory: newTrickHistory,
            scores: newScores,
            phase: 'finished',
            gameWinner,
            lastTrickWinner: winner.position,
          };
        }

        // Nueva ronda - repartir cartas de nuevo
        const deck = shuffle(createDeck());
        const reshuffledPlayers = prev.players.map((p, i) => ({
          ...p,
          hand: deck.slice(i * 10, (i + 1) * 10),
        }));
        const newTrump = deck[deck.length - 1];

        return {
          ...prev,
          players: reshuffledPlayers,
          trumpCard: newTrump,
          trumpSuit: newTrump.suit,
          currentTrick: [],
          currentTrickWinner: null,
          trickHistory: [], // Resetear historial para nueva ronda
          canteHistory: [], // Resetear cantes para nueva ronda
          currentPlayerPosition: winner.position,
          leadPlayerPosition: winner.position,
          scores: {
            1: { ...newScores[1], points: 0 },
            2: { ...newScores[2], points: 0 },
          },
          roundNumber: prev.roundNumber + 1,
          lastTrickWinner: winner.position,
          myHand: reshuffledPlayers[0].hand,
          lastCante: null,
          cantedSuits: [], // Resetear palos cantados para nueva ronda
        };
      }

      return {
        ...prev,
        currentTrick: [],
        currentTrickWinner: null,
        trickHistory: newTrickHistory,
        currentPlayerPosition: winner.position,
        leadPlayerPosition: winner.position,
        scores: newScores,
        lastTrickWinner: winner.position,
        lastCante: null, // Limpiar último cante
      };
    });
    setPendingTrickResolution(false);
  }, []);

  const playCardInternal = useCallback((playerId: string, cardId: string) => {
    setGameState(prev => {
      if (!prev) return prev;

      const playerIndex = prev.players.findIndex(p => p.id === playerId);
      if (playerIndex === -1) return prev;

      const player = prev.players[playerIndex];
      const cardIndex = player.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return prev;

      const card = player.hand[cardIndex];
      const newHand = [...player.hand];
      newHand.splice(cardIndex, 1);

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      const newTrick = [...prev.currentTrick, {
        playerId,
        card,
        position: player.position,
      }];

      // Si la baza está completa, mantenerla visible (se resolverá después del delay)
      if (newTrick.length === 4) {
        // Calcular el ganador para mostrarlo visualmente
        const { winner } = determineTrickWinner(newTrick, prev.trumpSuit);
        
        // Marcar que hay una resolución pendiente
        setPendingTrickResolution(true);
        
        // Programar la resolución después de 2 segundos
        if (trickTimeoutRef.current) {
          clearTimeout(trickTimeoutRef.current);
        }
        trickTimeoutRef.current = setTimeout(() => {
          resolveTrick();
        }, 2000);

        return {
          ...prev,
          players: newPlayers,
          currentTrick: newTrick, // Mantener las 4 cartas visibles
          currentTrickWinner: winner.position, // Indicar el ganador
          myHand: newPlayers[0].hand,
        };
      }

      // Siguiente jugador
      const nextPosition = ((prev.currentPlayerPosition + 1) % 4) as PlayerPosition;

      return {
        ...prev,
        players: newPlayers,
        currentTrick: newTrick,
        currentPlayerPosition: nextPosition,
        myHand: newPlayers[0].hand,
      };
    });
  }, [resolveTrick]);

  const processAITurn = useCallback(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    if (pendingTrickResolution) return; // No procesar mientras hay resolución pendiente

    const currentPlayer = gameState.players.find(
      p => p.position === gameState.currentPlayerPosition
    );

    if (!currentPlayer || !currentPlayer.isAI || currentPlayer.hand.length === 0) return;

    setIsProcessing(true);

    // Delay para que se vea el movimiento
    aiTimeoutRef.current = setTimeout(() => {
      // Verificar si puede cantar (solo si es mano - empieza la baza - y ganó la última)
      if (gameState.currentTrick.length === 0 && gameState.lastTrickWinner === currentPlayer.position) {
        const cantes = getAvailableCantes(currentPlayer.hand, gameState.trumpSuit, gameState.cantedSuits);
        if (cantes.length > 0) {
          // La IA canta el mejor cante disponible (prioriza 40 sobre 20)
          const bestCante = cantes.sort((a, b) => b.points - a.points)[0];
          
          const aiCanteInfo: CanteInfo = {
            playerId: currentPlayer.id,
            playerName: currentPlayer.name,
            suit: bestCante.suit,
            points: bestCante.points,
          };
          
          setGameState(prev => {
            if (!prev) return prev;
            const team = currentPlayer.team;
            return {
              ...prev,
              scores: {
                ...prev.scores,
                [team]: {
                  ...prev.scores[team],
                  points: prev.scores[team].points + bestCante.points,
                },
              },
              lastCante: aiCanteInfo,
              canteHistory: [...prev.canteHistory, aiCanteInfo],
              cantedSuits: [...prev.cantedSuits, bestCante.suit],
            };
          });
          
          // Esperar un poco más para mostrar el cante antes de jugar
          setTimeout(() => {
            const partnerPosition = ((currentPlayer.position + 2) % 4) as PlayerPosition;
            const card = aiSelectCard(
              currentPlayer.hand, 
              gameState.currentTrick, 
              gameState.trumpSuit,
              partnerPosition,
              gameState.difficulty,
              gameState.trickHistory,
              currentPlayer.position,
              gameState.trumpCard
            );
            playCardInternal(currentPlayer.id, card.id);
            setIsProcessing(false);
          }, 1000);
          return;
        }
      }

      const partnerPosition = ((currentPlayer.position + 2) % 4) as PlayerPosition;
      const card = aiSelectCard(
        currentPlayer.hand, 
        gameState.currentTrick, 
        gameState.trumpSuit,
        partnerPosition,
        gameState.difficulty,
        gameState.trickHistory,
        currentPlayer.position,
        gameState.trumpCard
      );

      // Jugar la carta
      playCardInternal(currentPlayer.id, card.id);
      setIsProcessing(false);
    }, 800);
  }, [gameState, pendingTrickResolution, playCardInternal]);

  const playCard = useCallback((cardId: string) => {
    if (!gameState || gameState.currentPlayerPosition !== 0 || isProcessing || pendingTrickResolution) return;

    // Verificar que la carta es válida
    const validCards = getValidCards(
      gameState.myHand, 
      gameState.currentTrick, 
      gameState.trumpSuit
    );
    
    if (!validCards.find(c => c.id === cardId)) return;

    playCardInternal('human', cardId);
  }, [gameState, isProcessing, pendingTrickResolution, playCardInternal]);

  // Función para cantar (20 o 40)
  const declareCante = useCallback((suit: Suit) => {
    if (!gameState) return;
    if (gameState.currentPlayerPosition !== 0) return; // Solo si es mi turno
    if (gameState.currentTrick.length !== 0) return; // Solo al inicio de la baza
    if (gameState.lastTrickWinner !== 0 && gameState.trickHistory.length > 0) return; // Solo si gané la última baza (o primera baza)
    
    const cantes = getAvailableCantes(gameState.myHand, gameState.trumpSuit, gameState.cantedSuits);
    const cante = cantes.find(c => c.suit === suit);
    if (!cante) return;
    
    const canteInfo: CanteInfo = {
      playerId: 'human',
      playerName: gameState.players[0].name,
      suit: cante.suit,
      points: cante.points,
    };
    
    setGameState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        scores: {
          ...prev.scores,
          1: {
            ...prev.scores[1],
            points: prev.scores[1].points + cante.points,
          },
        },
        lastCante: canteInfo,
        canteHistory: [...prev.canteHistory, canteInfo],
        cantedSuits: [...prev.cantedSuits, suit],
      };
    });
  }, [gameState]);

  // Obtener cantes disponibles para el jugador humano
  const getMyAvailableCantes = useCallback(() => {
    if (!gameState) return [];
    if (gameState.currentPlayerPosition !== 0) return [];
    if (gameState.currentTrick.length !== 0) return [];
    // Puede cantar en la primera baza o si ganó la última
    if (gameState.trickHistory.length > 0 && gameState.lastTrickWinner !== 0) return [];
    
    return getAvailableCantes(gameState.myHand, gameState.trumpSuit, gameState.cantedSuits);
  }, [gameState]);

  const exitGame = useCallback(() => {
    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
    }
    if (trickTimeoutRef.current) {
      clearTimeout(trickTimeoutRef.current);
    }
    setGameState(null);
  }, []);

  // Procesar turno de IA cuando cambia el estado
  useEffect(() => {
    if (!gameState || gameState.phase !== 'playing') return;
    if (gameState.currentPlayerPosition === 0) return; // Turno del humano
    if (pendingTrickResolution) return; // No procesar durante resolución

    const timer = setTimeout(() => {
      processAITurn();
    }, 500);

    return () => clearTimeout(timer);
  }, [gameState?.currentPlayerPosition, gameState?.currentTrick.length, pendingTrickResolution, processAITurn]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }
      if (trickTimeoutRef.current) {
        clearTimeout(trickTimeoutRef.current);
      }
    };
  }, []);

  return {
    gameState,
    startGame,
    playCard,
    declareCante,
    getMyAvailableCantes,
    exitGame,
    isProcessing,
  };
}
