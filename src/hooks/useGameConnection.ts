import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientMessage, ServerMessage, Room } from '../types/room';
import type { ClientGameState } from '../types/game';

// URL del servidor PartyKit (cambiar en producción)
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || '127.0.0.1:1999';

// Construir URL de WebSocket para PartyKit
function getWebSocketUrl(roomCode: string): string {
  const isSecure = window.location.protocol === 'https:';
  const protocol = isSecure ? 'wss' : 'ws';
  return `${protocol}://${PARTYKIT_HOST}/party/${roomCode}`;
}

interface UseGameConnectionOptions {
  onError?: (message: string) => void;
}

interface GameConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  room: Room | null;
  gameState: ClientGameState | null;
  playerId: string | null;
  playerSecret: string | null;
  error: string | null;
}

export function useGameConnection(options: UseGameConnectionOptions = {}) {
  const [state, setState] = useState<GameConnectionState>({
    isConnected: false,
    isConnecting: false,
    room: null,
    gameState: null,
    playerId: null,
    playerSecret: null,
    error: null,
  });

  const socketRef = useRef<WebSocket | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const connectingRef = useRef<boolean>(false);

  // Conectar a una sala
  const connect = useCallback((roomCode: string, action: { type: 'create' | 'join'; playerName: string }) => {
    // Evitar conexiones duplicadas
    if (connectingRef.current) {
      console.log('[Tute] Ya hay una conexión en progreso, ignorando');
      return;
    }
    
    // Cerrar socket existente si está abierto
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }

    connectingRef.current = true;
    roomCodeRef.current = roomCode;
    setState(s => ({ ...s, isConnecting: true, error: null }));

    const wsUrl = getWebSocketUrl(roomCode);
    console.log('[Tute] Conectando a sala:', roomCode, 'URL:', wsUrl);

    const socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      console.log('[Tute] WebSocket conectado, readyState:', socket.readyState);
      connectingRef.current = false;
      setState(s => ({ ...s, isConnected: true, isConnecting: false }));
      
      // Ejecutar la acción inmediatamente
      console.log('[Tute] Ejecutando acción:', action.type);
      if (action.type === 'create') {
        socket.send(JSON.stringify({ type: 'CREATE_ROOM', playerName: action.playerName }));
      } else if (action.type === 'join') {
        socket.send(JSON.stringify({ type: 'JOIN_ROOM', roomCode: roomCode, playerName: action.playerName }));
      }
    });

    socket.addEventListener('close', (e) => {
      console.log('[Tute] WebSocket cerrado, code:', e.code, 'reason:', e.reason);
      connectingRef.current = false;
      setState(s => ({ ...s, isConnected: false, isConnecting: false }));
    });

    socket.addEventListener('error', (e) => {
      console.error('[Tute] WebSocket error:', e);
      connectingRef.current = false;
      // Solo marcar error si no estamos ya conectados
      setState(s => {
        if (!s.isConnected) {
          return { 
            ...s, 
            isConnecting: false, 
            error: 'Error de conexión. ¿Está el servidor ejecutándose?' 
          };
        }
        return s;
      });
    });

    socket.addEventListener('message', (event) => {
      try {
        console.log('[Tute] Mensaje recibido:', event.data);
        const message: ServerMessage = JSON.parse(event.data);
        handleServerMessage(message);
      } catch (e) {
        console.error('Error parsing message:', e);
      }
    });

    socketRef.current = socket;

    // Timeout de conexión
    setTimeout(() => {
      if (socketRef.current?.readyState !== WebSocket.OPEN) {
        console.log('[Tute] Timeout de conexión');
        connectingRef.current = false;
        setState(s => {
          if (s.isConnecting) {
            return { ...s, isConnecting: false, error: 'Timeout de conexión. Verifica que el servidor esté ejecutándose (npm run dev:server)' };
          }
          return s;
        });
      }
    }, 5000);
  }, []);

  // Manejar mensajes del servidor
  const handleServerMessage = useCallback((message: ServerMessage) => {
    console.log('[Tute] Procesando mensaje:', message.type);
    
    switch (message.type) {
      case 'ROOM_CREATED':
        // Guardar credenciales en localStorage para reconexión
        localStorage.setItem('tute_playerId', message.playerId);
        localStorage.setItem('tute_playerSecret', message.playerSecret);
        localStorage.setItem('tute_roomCode', message.roomCode);
        
        setState(s => ({
          ...s,
          playerId: message.playerId,
          playerSecret: message.playerSecret,
          room: {
            code: message.roomCode,
            status: 'waiting',
            players: [],
            hostId: message.playerId,
            createdAt: Date.now(),
            maxPlayers: 4,
          },
        }));
        break;

      case 'JOINED_ROOM':
        // El servidor envía JOINED_ROOM (no ROOM_JOINED)
        localStorage.setItem('tute_playerId', message.playerId);
        localStorage.setItem('tute_playerSecret', message.playerSecret);
        localStorage.setItem('tute_roomCode', message.roomCode);
        
        setState(s => ({
          ...s,
          playerId: message.playerId,
          playerSecret: message.playerSecret,
          room: {
            code: message.roomCode,
            status: 'waiting',
            players: [],
            hostId: '',
            createdAt: Date.now(),
            maxPlayers: 4,
          },
        }));
        break;

      case 'ROOM_STATE':
        // Actualizar estado de la sala con lista de jugadores
        setState(s => ({
          ...s,
          room: s.room ? {
            ...s.room,
            players: message.players,
            hostId: message.hostId,
          } : {
            code: roomCodeRef.current || '',
            status: 'waiting',
            players: message.players,
            hostId: message.hostId,
            createdAt: Date.now(),
            maxPlayers: 4,
          },
        }));
        break;

      case 'ROOM_JOINED':
        localStorage.setItem('tute_playerId', message.playerId);
        localStorage.setItem('tute_playerSecret', message.playerSecret);
        localStorage.setItem('tute_roomCode', message.room.code);
        
        setState(s => ({
          ...s,
          playerId: message.playerId,
          playerSecret: message.playerSecret,
          room: message.room,
        }));
        break;

      case 'PLAYER_JOINED':
        setState(s => {
          if (!s.room) return s;
          return {
            ...s,
            room: {
              ...s.room,
              players: [...s.room.players, message.player],
            },
          };
        });
        break;

      case 'PLAYER_LEFT':
        setState(s => {
          if (!s.room) return s;
          return {
            ...s,
            room: {
              ...s.room,
              players: s.room.players.filter(p => p.id !== message.playerId),
            },
          };
        });
        break;

      case 'PLAYER_DISCONNECTED':
        setState(s => {
          if (!s.room) return s;
          return {
            ...s,
            room: {
              ...s.room,
              players: s.room.players.map(p => 
                p.id === message.playerId 
                  ? { ...p, connectionStatus: 'disconnected' as const }
                  : p
              ),
            },
          };
        });
        break;

      case 'PLAYER_RECONNECTED':
        setState(s => {
          if (!s.room) return s;
          return {
            ...s,
            room: {
              ...s.room,
              players: s.room.players.map(p => 
                p.id === message.playerId 
                  ? { ...p, connectionStatus: 'connected' as const }
                  : p
              ),
            },
          };
        });
        break;

      case 'GAME_STARTING':
        setState(s => ({
          ...s,
          room: s.room ? { ...s.room, status: 'playing' } : null,
        }));
        break;

      case 'GAME_STATE':
        setState(s => ({
          ...s,
          gameState: message.state,
        }));
        break;

      case 'ERROR':
        setState(s => ({ ...s, error: message.message }));
        options.onError?.(message.message);
        break;
    }
  }, [options]);

  // Enviar mensaje al servidor
  const send = useCallback((message: ClientMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Crear sala
  const createRoom = useCallback((playerName: string) => {
    const roomCode = generateRoomCode();
    connect(roomCode, { type: 'create', playerName });
  }, [connect]);

  // Unirse a sala
  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    connect(roomCode.toUpperCase(), { type: 'join', playerName });
  }, [connect]);

  // Salir de sala
  const leaveRoom = useCallback(() => {
    send({ type: 'LEAVE_ROOM' });
    socketRef.current?.close();
    localStorage.removeItem('tute_playerId');
    localStorage.removeItem('tute_playerSecret');
    localStorage.removeItem('tute_roomCode');
    setState({
      isConnected: false,
      isConnecting: false,
      room: null,
      gameState: null,
      playerId: null,
      playerSecret: null,
      error: null,
    });
  }, [send]);

  // Iniciar juego
  const startGame = useCallback(() => {
    send({ type: 'START_GAME' });
  }, [send]);

  // Jugar carta
  const playCard = useCallback((cardId: string) => {
    send({ type: 'PLAY_CARD', cardId });
  }, [send]);

  // Declarar cante
  const declareCante = useCallback((canteType: '20' | '40' | 'tute', suit: string) => {
    send({ type: 'DECLARE_CANTE', canteType, suit });
  }, [send]);

  // Saltar cante
  const skipCante = useCallback(() => {
    send({ type: 'SKIP_CANTE' });
  }, [send]);

  // Limpiar al desmontar (pero NO reconectar automáticamente)
  useEffect(() => {
    return () => {
      // Solo cerrar si hay una conexión activa
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        console.log('[Tute] Cerrando conexión al desmontar');
        socketRef.current.close();
      }
    };
  }, []);

  // Limpiar error después de 5 segundos
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState(s => ({ ...s, error: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return {
    ...state,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    playCard,
    declareCante,
    skipCante,
  };
}

// Generar código de sala
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default useGameConnection;
