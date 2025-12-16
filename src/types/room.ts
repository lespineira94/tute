import type { PublicPlayer } from './player';

// Estado de la sala/lobby
export type RoomStatus = 'waiting' | 'full' | 'playing' | 'finished';

// Información de una sala
export interface Room {
  code: string;
  status: RoomStatus;
  players: PublicPlayer[];
  hostId: string;
  createdAt: number;
  maxPlayers: 4;
}

// Mensaje del cliente al servidor
export type ClientMessage =
  | { type: 'CREATE_ROOM'; playerName: string }
  | { type: 'JOIN_ROOM'; roomCode: string; playerName: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'START_GAME' }
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'DECLARE_CANTE'; canteType: '20' | '40' | 'tute'; suit: string }
  | { type: 'SKIP_CANTE' }
  | { type: 'RECONNECT'; playerId: string; playerSecret: string };

// Mensaje del servidor al cliente
export type ServerMessage =
  | { type: 'ROOM_CREATED'; roomCode: string; playerId: string; playerSecret: string }
  | { type: 'JOINED_ROOM'; roomCode: string; playerId: string; playerSecret: string; position: number }
  | { type: 'ROOM_STATE'; players: PublicPlayer[]; hostId: string; canStart: boolean }
  | { type: 'ROOM_JOINED'; room: Room; playerId: string; playerSecret: string }
  | { type: 'PLAYER_JOINED'; player: PublicPlayer }
  | { type: 'PLAYER_LEFT'; playerId: string }
  | { type: 'PLAYER_DISCONNECTED'; playerId: string }
  | { type: 'PLAYER_RECONNECTED'; playerId: string }
  | { type: 'GAME_STARTING' }
  | { type: 'GAME_STATE'; state: import('./game').ClientGameState }
  | { type: 'CARD_PLAYED'; playerId: string; cardId: string }
  | { type: 'TRICK_WON'; winnerId: string; points: number }
  | { type: 'CANTE_DECLARED'; playerId: string; canteType: '20' | '40' | 'tute'; suit: string }
  | { type: 'ROUND_END'; scores: [import('./game').TeamScore, import('./game').TeamScore] }
  | { type: 'GAME_END'; winnerTeam: 0 | 1 }
  | { type: 'ERROR'; message: string; code: string };

// Códigos de error
export type ErrorCode =
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_ALREADY_STARTED'
  | 'NOT_YOUR_TURN'
  | 'INVALID_CARD'
  | 'INVALID_CANTE'
  | 'NOT_HOST'
  | 'NOT_ENOUGH_PLAYERS'
  | 'ALREADY_IN_ROOM'
  | 'RECONNECT_FAILED';
