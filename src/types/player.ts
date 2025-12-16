import type { Card } from './card';

// Identificador único del jugador
export type PlayerId = string;

// Posición en la mesa (0=abajo, 1=derecha, 2=arriba, 3=izquierda)
export type PlayerPosition = 0 | 1 | 2 | 3;

// Equipo (jugadores en posiciones 0,2 vs 1,3)
export type TeamId = 0 | 1;

// Estado de conexión del jugador
export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

// Representa un jugador en la partida
export interface Player {
  id: PlayerId;
  name: string;
  position: PlayerPosition;
  team: TeamId;
  hand: Card[];              // Cartas en mano (solo visible para el propio jugador)
  tricksWon: Card[];         // Bazas ganadas en la ronda actual
  connectionStatus: ConnectionStatus;
  isHost: boolean;           // Si es el creador de la sala
}

// Información pública de un jugador (lo que ven los demás)
export interface PublicPlayer {
  id: PlayerId;
  name: string;
  position: PlayerPosition;
  team: TeamId;
  cardCount: number;         // Cuántas cartas tiene (no cuáles)
  connectionStatus: ConnectionStatus;
  isHost: boolean;
}
