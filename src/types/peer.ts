import type { Card } from './card';
import type { PlayerId } from './player';
import type { GamePhase, PlayedCard, Cante } from './game';

// Tipos de mensajes P2P entre jugadores
export type PeerMessageType =
  | 'game_state'       // Estado completo del juego
  | 'player_action'    // Acción de un jugador (jugar carta, cantar, etc)
  | 'player_joined'    // Nuevo jugador se unió
  | 'player_left'      // Jugador abandonó
  | 'start_game'       // Host inicia la partida
  | 'sync_request'     // Solicitar sincronización de estado
  | 'ping'             // Mantener conexión activa
  | 'pong';            // Respuesta a ping

// Acción de jugador
export interface PlayerAction {
  type: 'play_card' | 'announce_cante' | 'exchange_trump';
  playerId: PlayerId;
  card?: Card;
  cante?: Cante;
}

// Estado del juego para P2P (simplificado)
export interface PeerGameState {
  roomCode: string;
  phase: GamePhase;
  hostId: PlayerId;
  players: {
    id: PlayerId;
    name: string;
    position: number;
    team: number;
    cardCount: number;
  }[];
  currentTrick: PlayedCard[];
  currentPlayerIndex: number;
  currentTrickWinner: number | null; // Position of winner when trick has 4 cards
  trumpSuit: string | null;
  scores: {
    team: number;
    roundPoints: number;
    roundsWon: number;
  }[];
  roundNumber: number;
}

// Mensaje P2P
export interface PeerMessage {
  type: PeerMessageType;
  from: PlayerId;
  timestamp: number;
  data?: unknown;
}

// Mensaje de estado del juego
export interface GameStateMessage extends PeerMessage {
  type: 'game_state';
  data: PeerGameState;
}

// Mensaje de acción del jugador
export interface PlayerActionMessage extends PeerMessage {
  type: 'player_action';
  data: PlayerAction;
}

// Mensaje de jugador unido
export interface PlayerJoinedMessage extends PeerMessage {
  type: 'player_joined';
  data: {
    playerId: PlayerId;
    playerName: string;
  };
}

// Mensaje de jugador que se fue
export interface PlayerLeftMessage extends PeerMessage {
  type: 'player_left';
  data: {
    playerId: PlayerId;
  };
}

// Mensaje de inicio de juego
export interface StartGameMessage extends PeerMessage {
  type: 'start_game';
}

// Info de conexión P2P
export interface PeerConnection {
  peerId: string;
  playerId: PlayerId;
  playerName: string;
  isHost: boolean;
}
