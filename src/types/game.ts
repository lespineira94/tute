import type { Card, Suit } from './card';
import type { Player, PlayerId, PublicPlayer, TeamId } from './player';

// Fase del juego
export type GamePhase = 
  | 'waiting'      // Esperando jugadores en el lobby
  | 'dealing'      // Repartiendo cartas
  | 'playing'      // Jugando bazas
  | 'roundEnd'     // Fin de ronda, mostrando puntuación
  | 'gameEnd';     // Fin de partida

// Carta jugada en una baza
export interface PlayedCard {
  card: Card;
  playerId: PlayerId;
  position: number;  // Orden en que se jugó (0-3)
}

// Tipo de cante
export type CanteType = '20' | '40' | 'tute';

// Cante realizado
export interface Cante {
  type: CanteType;
  playerId: PlayerId;
  suit: Suit;
}

// Puntuación de un equipo
export interface TeamScore {
  team: TeamId;
  roundPoints: number;      // Puntos en la ronda actual
  roundsWon: number;        // Rondas ganadas
  cantes: Cante[];          // Cantes realizados en la ronda
}

// Estado completo del juego (en servidor)
export interface GameState {
  roomCode: string;
  phase: GamePhase;
  players: Player[];
  trumpSuit: Suit | null;
  trumpCard: Card | null;         // Carta que define el triunfo
  currentTrick: PlayedCard[];     // Baza actual
  currentPlayerIndex: number;     // Índice del jugador que debe jugar
  leadPlayerIndex: number;        // Jugador que salió de mano
  scores: [TeamScore, TeamScore]; // Puntuación de ambos equipos
  roundNumber: number;
  targetRounds: number;           // Rondas necesarias para ganar (ej: 3)
  lastTrickWinner: PlayerId | null;
  canDeclare: boolean;            // Si el jugador actual puede cantar
}

// Estado del juego desde perspectiva de un cliente
export interface ClientGameState {
  roomCode: string;
  phase: GamePhase;
  myId: PlayerId;
  myHand: Card[];
  players: PublicPlayer[];
  trumpSuit: Suit | null;
  trumpCard: Card | null;
  currentTrick: PlayedCard[];
  currentPlayerId: PlayerId | null;
  isMyTurn: boolean;
  scores: [TeamScore, TeamScore];
  roundNumber: number;
  targetRounds: number;
  canDeclare: boolean;
  validCards: string[];           // IDs de cartas que puedo jugar
  pendingCante: CanteType | null; // Cante pendiente de anunciar
  lastAnnouncement: {             // Último cante anunciado
    type: CanteType;
    playerName: string;
    suit: Suit;
  } | null;
  winner: TeamId | null;
}
