import { useState, useEffect, useRef, useCallback } from 'react';
import Peer from 'peerjs';
import type { DataConnection } from 'peerjs';
import type { Card, Suit } from '../types/card';
import type {
  PeerMessage,
  PeerGameState,
  PlayerAction,
  PeerConnection
} from '../types/peer';
import { createShuffledDeck } from '../utils/deck';
import { getValidCards } from '../utils/rules';

interface UsePeerGameReturn {
  // Estado
  isConnected: boolean;
  isHost: boolean;
  roomCode: string | null;
  gameState: PeerGameState | null;
  myPlayerId: string | null;
  myHand: Card[];
  connections: PeerConnection[];
  error: string | null;

  // Acciones
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (roomCode: string, playerName: string) => Promise<void>;
  startGame: () => void;
  playCard: (card: Card) => void;
  leaveRoom: () => void;
}

export function usePeerGame(): UsePeerGameReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [gameState, setGameState] = useState<PeerGameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [myHand, setMyHand] = useState<Card[]>([]);
  const [connections, setConnections] = useState<PeerConnection[]>([]);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<Peer | null>(null);
  const connectionsMapRef = useRef<Map<string, DataConnection>>(new Map());
  const isHostRef = useRef(false);
  const gameStateRef = useRef<PeerGameState | null>(null);
  const myPlayerIdRef = useRef<string | null>(null);
  const trickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sincronizar refs con states
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
  }, [myPlayerId]);

  // Generar código de sala aleatorio
  const generateRoomCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  // Constantes para calcular fuerza de cartas
  const CARD_STRENGTH: Record<number, number> = { 1: 14, 3: 13, 12: 12, 11: 11, 10: 10, 7: 7, 6: 6, 5: 5, 4: 4, 2: 2 };
  const CARD_VALUES: Record<number, number> = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };

  // Calcular fuerza de una carta
  const getCardStrength = (card: Card, trumpSuit: string | null, leadSuit: string | null): number => {
    const baseStrength = CARD_STRENGTH[card.number] || card.number;
    if (card.suit === trumpSuit) return baseStrength + 100;
    if (card.suit === leadSuit) return baseStrength + 50;
    return baseStrength;
  };

  // Determinar ganador de una baza
  const determineTrickWinner = (
    trick: { card: Card; playerId: string; position: number }[],
    trumpSuit: string | null
  ): { winnerPosition: number; points: number } => {
    if (trick.length === 0) return { winnerPosition: 0, points: 0 };

    const leadSuit = trick[0].card.suit;
    let winnerIdx = 0;
    let maxStrength = getCardStrength(trick[0].card, trumpSuit, leadSuit);
    let points = CARD_VALUES[trick[0].card.number] || 0;

    for (let i = 1; i < trick.length; i++) {
      const current = trick[i];
      points += CARD_VALUES[current.card.number] || 0;
      const strength = getCardStrength(current.card, trumpSuit, leadSuit);
      if (strength > maxStrength) {
        maxStrength = strength;
        winnerIdx = i;
      }
    }

    return { winnerPosition: trick[winnerIdx].position, points };
  };

  // Enviar mensaje a todos los peers conectados
  const broadcastMessage = useCallback((message: Omit<PeerMessage, 'from' | 'timestamp'>) => {
    if (!myPlayerIdRef.current) {
      console.log('[PeerGame] No se puede hacer broadcast: myPlayerId no está definido');
      return;
    }

    const fullMessage: PeerMessage = {
      ...message,
      from: myPlayerIdRef.current,
      timestamp: Date.now(),
    };

    const connectionCount = connectionsMapRef.current.size;
    console.log('[PeerGame] Broadcasting mensaje tipo:', message.type, 'a', connectionCount, 'conexiones');

    let sentCount = 0;
    connectionsMapRef.current.forEach((conn, peerId) => {
      if (conn.open) {
        console.log('[PeerGame] Enviando a:', peerId);
        conn.send(fullMessage);
        sentCount++;
      } else {
        console.log('[PeerGame] Conexión cerrada con:', peerId);
      }
    });

    console.log('[PeerGame] Broadcast completado:', sentCount, 'de', connectionCount, 'enviados');
  }, []);

  // Enviar mensaje a un peer específico
  const sendMessage = useCallback((peerId: string, message: Omit<PeerMessage, 'from' | 'timestamp'>) => {
    if (!myPlayerId) return;

    const fullMessage: PeerMessage = {
      ...message,
      from: myPlayerId,
      timestamp: Date.now(),
    };

    const conn = connectionsMapRef.current.get(peerId);
    if (conn?.open) {
      conn.send(fullMessage);
    }
  }, [myPlayerId]);

  // Manejar mensajes entrantes
  const handleMessage = useCallback((message: PeerMessage, fromPeerId: string) => {
    console.log('[PeerGame] Mensaje recibido desde', fromPeerId, ':', message.type, message);

    switch (message.type) {
      case 'game_state': {
        const gameStateMsg = message as any;
        console.log('[PeerGame] Actualizando gameState:', gameStateMsg.data);
        setGameState(gameStateMsg.data);
        gameStateRef.current = gameStateMsg.data; // Sincronizar ref
        break;
      }

      case 'player_action': {
        const actionMsg = message as any;
        const action = actionMsg.data as any;

        // Caso especial: recibir mano al inicio del juego
        if (action.type === 'receive_hand') {
          console.log('[PeerGame] Mensaje receive_hand recibido. Mi ID (ref):', myPlayerIdRef.current, 'Target ID:', action.playerId, 'Cartas:', action.cards?.length);
          if (action.playerId === myPlayerIdRef.current) {
            console.log('[PeerGame] ✓ Es para mí! Guardando mano:', action.cards);
            setMyHand(action.cards);
          } else {
            console.log('[PeerGame] ✗ No es para mí. Mi ID:', myPlayerIdRef.current, 'vs', action.playerId);
          }
          break;
        }

        // Si somos el host, procesamos la acción y actualizamos el estado
        if (isHostRef.current && gameStateRef.current) {
          handlePlayerAction(action);
        }
        break;
      }

      case 'player_joined': {
        const joinMsg = message as any;
        const { playerId, playerName } = joinMsg.data;
        console.log('[PeerGame] Mensaje player_joined recibido - Jugador:', playerName, 'ID:', playerId, 'isHost:', isHostRef.current, 'gameState:', gameStateRef.current);

        // Solo el host agrega jugadores al estado
        if (isHostRef.current && gameStateRef.current) {
          const playerExists = gameStateRef.current.players.some(p => p.id === playerId);

          if (!playerExists && gameStateRef.current.players.length < 4) {
            const position = gameStateRef.current.players.length;
            const team = position % 2; // 0,2 = team 0; 1,3 = team 1

            const newGameState = {
              ...gameStateRef.current,
              players: [
                ...gameStateRef.current.players,
                {
                  id: playerId,
                  name: playerName,
                  position,
                  team,
                  cardCount: 0,
                }
              ]
            };

            console.log('[PeerGame] Nuevo estado con jugador agregado:', newGameState);
            setGameState(newGameState);
            gameStateRef.current = newGameState; // Sincronizar ref

            // Broadcast el nuevo estado a todos
            broadcastMessage({
              type: 'game_state',
              data: newGameState,
            });
          }
        }
        break;
      }

      case 'start_game': {
        console.log('[PeerGame] Iniciando juego...');
        break;
      }

      case 'sync_request': {
        // Solo el host responde con el estado actual
        if (isHostRef.current && gameStateRef.current) {
          sendMessage(fromPeerId, {
            type: 'game_state',
            data: gameStateRef.current,
          });
        }
        break;
      }

      case 'ping': {
        sendMessage(fromPeerId, { type: 'pong' });
        break;
      }
    }
  }, [sendMessage, broadcastMessage]);

  // Resolver baza después del delay
  const resolveTrick = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState || currentGameState.currentTrick.length !== 4) return;

    const { winnerPosition, points } = determineTrickWinner(
      currentGameState.currentTrick,
      currentGameState.trumpSuit
    );

    // Encontrar al jugador ganador
    const winnerPlayer = currentGameState.players.find(p => p.position === winnerPosition);
    if (!winnerPlayer) return;

    // Actualizar puntuación
    const newScores = currentGameState.scores.map(s =>
      s.team === winnerPlayer.team
        ? { ...s, roundPoints: s.roundPoints + points }
        : s
    );

    // Limpiar baza y pasar turno al ganador
    const newGameState: PeerGameState = {
      ...currentGameState,
      currentTrick: [],
      currentTrickWinner: null,
      currentPlayerIndex: winnerPosition,
      scores: newScores,
    };

    setGameState(newGameState);
    gameStateRef.current = newGameState;
    broadcastMessage({
      type: 'game_state',
      data: newGameState,
    });
  }, [broadcastMessage]);

  // Manejar acción de jugador (solo host)
  const handlePlayerAction = useCallback((action: PlayerAction) => {
    const currentGameState = gameStateRef.current;
    if (!currentGameState) return;

    switch (action.type) {
      case 'play_card': {
        if (!action.card) return;

        // Validar que sea el turno del jugador
        const currentPlayer = currentGameState.players[currentGameState.currentPlayerIndex];
        if (currentPlayer.id !== action.playerId) {
          console.log('[PeerGame] No es el turno del jugador');
          return;
        }

        // Actualizar conteo de cartas del jugador
        const newPlayers = currentGameState.players.map(p =>
          p.id === action.playerId
            ? { ...p, cardCount: Math.max(0, p.cardCount - 1) }
            : p
        );

        // Agregar carta a la baza actual
        const newTrick = [
          ...currentGameState.currentTrick,
          {
            card: action.card,
            playerId: action.playerId,
            position: currentGameState.currentTrick.length,
          },
        ];

        // Baza completa - mostrar ganador y esperar 2 segundos
        if (newTrick.length === 4) {
          const { winnerPosition } = determineTrickWinner(newTrick, currentGameState.trumpSuit);

          const newGameState: PeerGameState = {
            ...currentGameState,
            players: newPlayers,
            currentTrick: newTrick,
            currentTrickWinner: winnerPosition,
          };

          setGameState(newGameState);
          gameStateRef.current = newGameState;
          broadcastMessage({
            type: 'game_state',
            data: newGameState,
          });

          // Programar resolución después de 2 segundos
          if (trickTimeoutRef.current) {
            clearTimeout(trickTimeoutRef.current);
          }
          trickTimeoutRef.current = setTimeout(() => {
            resolveTrick();
          }, 2000);
        } else {
          // Avanzar al siguiente jugador
          const newGameState: PeerGameState = {
            ...currentGameState,
            players: newPlayers,
            currentTrick: newTrick,
            currentTrickWinner: null,
            currentPlayerIndex: (currentGameState.currentPlayerIndex + 1) % 4,
          };

          setGameState(newGameState);
          gameStateRef.current = newGameState;
          broadcastMessage({
            type: 'game_state',
            data: newGameState,
          });
        }
        break;
      }
    }
  }, [broadcastMessage, resolveTrick]);

  // Configurar conexión de datos cuando se conecta un peer
  const setupDataConnection = useCallback((conn: DataConnection, isIncoming: boolean) => {
    console.log('[PeerGame] Configurando conexión:', conn.peer, isIncoming ? '(entrante)' : '(saliente)');

    conn.on('open', () => {
      console.log('[PeerGame] Conexión abierta con:', conn.peer);
      connectionsMapRef.current.set(conn.peer, conn);

      setConnections(prev => [
        ...prev,
        {
          peerId: conn.peer,
          playerId: conn.peer,
          playerName: 'Jugador',
          isHost: false,
        },
      ]);

      // Si somos el host y hay un estado de juego, enviarlo
      if (isHost && gameState) {
        sendMessage(conn.peer, {
          type: 'game_state',
          data: gameState,
        });
      }

      // Si no somos host, solicitar sincronización
      if (!isHost) {
        sendMessage(conn.peer, { type: 'sync_request' });
      }
    });

    conn.on('data', (data: unknown) => {
      handleMessage(data as PeerMessage, conn.peer);
    });

    conn.on('close', () => {
      console.log('[PeerGame] Conexión cerrada con:', conn.peer);
      connectionsMapRef.current.delete(conn.peer);
      setConnections(prev => prev.filter(c => c.peerId !== conn.peer));

      broadcastMessage({
        type: 'player_left',
        data: { playerId: conn.peer },
      });
    });

    conn.on('error', (err: Error) => {
      console.error('[PeerGame] Error en conexión:', err);
      setError(`Error de conexión: ${err.message}`);
    });
  }, [isHost, gameState, handleMessage, broadcastMessage, sendMessage]);

  // Crear sala (host)
  const createRoom = useCallback(async (playerName: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const newRoomCode = generateRoomCode();

      console.log('[PeerGame] Creando sala con código:', newRoomCode, 'nombre:', playerName);

      // Usar el room code como peer ID para facilitar el join
      const peer = new Peer(newRoomCode, {
        debug: 2,
      });

      peer.on('open', (id: string) => {
        console.log('[PeerGame] Sala creada con ID:', id); myPlayerIdRef.current = id; // Actualizar ref inmediatamente        setMyPlayerId(id);
        setRoomCode(newRoomCode);
        setIsHost(true);
        setIsConnected(true);

        // Inicializar estado del juego
        const initialState: PeerGameState = {
          roomCode: newRoomCode,
          phase: 'waiting',
          hostId: id,
          players: [{
            id,
            name: playerName,
            position: 0,
            team: 0,
            cardCount: 0,
          }],
          currentTrick: [],
          currentPlayerIndex: 0,
          currentTrickWinner: null,
          trumpSuit: null,
          scores: [
            { team: 0, roundPoints: 0, roundsWon: 0 },
            { team: 1, roundPoints: 0, roundsWon: 0 },
          ],
          roundNumber: 1,
        };

        setGameState(initialState);
        gameStateRef.current = initialState; // Sincronizar ref
        resolve(newRoomCode);
      });

      peer.on('connection', (conn: DataConnection) => {
        console.log('[PeerGame] Nueva conexión entrante:', conn.peer);
        setupDataConnection(conn, true);
      });

      peer.on('error', (err: Error) => {
        console.error('[PeerGame] Error en peer:', err);
        setError(`Error: ${err.message}`);
        reject(err);
      });

      peerRef.current = peer;
    });
  }, [setupDataConnection]);

  // Unirse a sala
  const joinRoom = useCallback(async (code: string, playerName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Generar ID único para este peer
      const myPeerId = `${code}-${Date.now()}`;

      console.log('[PeerGame] Uniéndose a sala:', code, 'con nombre:', playerName, 'ID:', myPeerId);

      const peer = new Peer(myPeerId, {
        debug: 2,
      });

      peer.on('open', (id: string) => {
        console.log('[PeerGame] Conectado con ID:', id);
        myPlayerIdRef.current = id; // Actualizar ref inmediatamente
        setMyPlayerId(id);
        setRoomCode(code);
        setIsHost(false);

        // Conectar al host (el room code es el peer ID del host)
        const conn = peer.connect(code, {
          reliable: true,
        });

        setupDataConnection(conn, false);

        conn.on('open', () => {
          console.log('[PeerGame] Conectado al host');
          setIsConnected(true);

          // Notificar al host que nos unimos - enviar directamente por la conexión
          const joinMessage: PeerMessage = {
            type: 'player_joined',
            from: id,
            timestamp: Date.now(),
            data: {
              playerId: id,
              playerName,
            },
          };

          console.log('[PeerGame] Enviando player_joined al host:', joinMessage);
          conn.send(joinMessage);

          resolve();
        });

        conn.on('error', (err: Error) => {
          console.error('[PeerGame] Error al conectar con host:', err);
          setError(`No se pudo conectar a la sala: ${err.message}`);
          reject(err);
        });
      });

      peer.on('connection', (conn: DataConnection) => {
        console.log('[PeerGame] Conexión P2P adicional:', conn.peer);
        setupDataConnection(conn, true);
      });

      peer.on('error', (err: Error) => {
        console.error('[PeerGame] Error en peer:', err);
        setError(`Error: ${err.message}`);
        reject(err);
      });

      peerRef.current = peer;
    });
  }, [setupDataConnection]);

  // Iniciar juego (solo host)
  const startGame = useCallback(() => {
    if (!isHostRef.current || !gameStateRef.current) {
      console.log('[PeerGame] No se puede iniciar: no eres host o no hay estado');
      return;
    }

    if (gameStateRef.current.players.length < 4) {
      setError('Se necesitan 4 jugadores para comenzar');
      return;
    }

    console.log('[PeerGame] Iniciando juego...');

    // Crear y repartir mazo
    const deck = createShuffledDeck();
    const hands: Card[][] = [[], [], [], []];

    // Repartir 10 cartas a cada jugador
    for (let i = 0; i < 10; i++) {
      for (let p = 0; p < 4; p++) {
        hands[p].push(deck[i * 4 + p]);
      }
    }

    // Carta de triunfo (última carta)
    const trumpCard = deck[deck.length - 1];

    // Actualizar jugadores con conteo de cartas
    const updatedPlayers = gameStateRef.current.players.map(p => ({
      ...p,
      cardCount: 10
    }));

    // Actualizar estado
    const newGameState: PeerGameState = {
      ...gameStateRef.current,
      phase: 'playing',
      trumpSuit: trumpCard.suit,
      currentPlayerIndex: 0,
      currentTrick: [],
      currentTrickWinner: null,
      players: updatedPlayers,
    };

    // Guardar mi mano según mi posición (usar ref)
    const myPlayer = updatedPlayers.find(p => p.id === myPlayerIdRef.current);
    if (myPlayer) {
      const myCards = hands[myPlayer.position];
      console.log('[PeerGame] Guardando mi mano. Mi ID:', myPlayerIdRef.current, 'posición:', myPlayer.position, 'cartas:', myCards.length);
      setMyHand(myCards);
    } else {
      console.error('[PeerGame] ERROR: No se encontró mi jugador en updatedPlayers. Mi ID:', myPlayerIdRef.current);
    }

    setGameState(newGameState);
    gameStateRef.current = newGameState; // Sincronizar ref

    console.log('[PeerGame] Estado actualizado, enviando a jugadores...');

    // Enviar estado actualizado a todos
    broadcastMessage({
      type: 'game_state',
      data: newGameState,
    });

    // Enviar cartas privadas a cada jugador según su posición (excepto a mí mismo)
    updatedPlayers.forEach((player) => {
      if (player.id !== myPlayerIdRef.current) {
        const handMessage: PeerMessage = {
          type: 'player_action',
          from: myPlayerIdRef.current || '',
          timestamp: Date.now(),
          data: {
            type: 'receive_hand' as any,
            playerId: player.id,
            cards: hands[player.position],
          },
        };

        const conn = connectionsMapRef.current.get(player.id);
        if (conn?.open) {
          console.log('[PeerGame] Enviando mano a jugador:', player.name, 'ID:', player.id, 'posición:', player.position, 'cartas:', hands[player.position].length);
          conn.send(handMessage);
        } else {
          console.log('[PeerGame] ERROR: No hay conexión abierta con', player.name, 'ID:', player.id);
        }
      } else {
        console.log('[PeerGame] Saltando envío a mí mismo:', player.name);
      }
    });

    console.log('[PeerGame] Juego iniciado correctamente');
  }, [myPlayerId, broadcastMessage]);

  // Jugar carta
  const playCard = useCallback((card: Card) => {
    const myId = myPlayerIdRef.current;
    if (!myId || !gameStateRef.current) {
      console.log('[PeerGame] playCard: No hay ID o gameState');
      return;
    }

    const currentState = gameStateRef.current;

    // Validar que sea mi turno
    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    console.log('[PeerGame] playCard - Mi ID:', myId, 'Jugador actual:', currentPlayer.id, 'Es mi turno:', currentPlayer.id === myId);

    if (currentPlayer.id !== myId) {
      console.log('[PeerGame] No es tu turno');
      return;
    }

    // Validar que la carta sea legal
    const leadCard = currentState.currentTrick[0]?.card;
    if (leadCard) {
      const validCards = getValidCards(myHand, currentState.currentTrick, currentState.trumpSuit as Suit);
      const isValid = validCards.some(c => c.suit === card.suit && c.number === card.number);
      if (!isValid) {
        console.log('[PeerGame] No puedes jugar esa carta');
        setError('No puedes jugar esa carta');
        return;
      }
    }

    console.log('[PeerGame] Jugando carta:', card.suit, card.number);

    // Remover carta de la mano
    setMyHand(prev => prev.filter(c => c.suit !== card.suit || c.number !== card.number));

    // Enviar acción
    const action: PlayerAction = {
      type: 'play_card',
      playerId: myId,
      card,
    };

    if (isHostRef.current) {
      // Si somos host, procesamos directamente
      console.log('[PeerGame] Soy host, procesando acción localmente');
      handlePlayerAction(action);
    } else {
      // Si no, enviamos al host
      console.log('[PeerGame] Soy cliente, enviando acción al host');
      if (currentState.hostId) {
        sendMessage(currentState.hostId, {
          type: 'player_action',
          data: action,
        });
      }
    }
  }, [myHand, handlePlayerAction, sendMessage]);

  // Salir de la sala
  const leaveRoom = useCallback(() => {
    // Notificar a todos que nos vamos
    broadcastMessage({
      type: 'player_left',
      data: { playerId: myPlayerId || '' },
    });

    // Cerrar todas las conexiones
    connectionsMapRef.current.forEach(conn => conn.close());
    connectionsMapRef.current.clear();

    // Destruir peer
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    // Resetear estado
    setIsConnected(false);
    setIsHost(false);
    setRoomCode(null);
    setGameState(null);
    gameStateRef.current = null; // Sincronizar ref
    setMyPlayerId(null);
    setMyHand([]);
    setConnections([]);
    setError(null);
  }, [myPlayerId, broadcastMessage]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);

  return {
    isConnected,
    isHost,
    roomCode,
    gameState,
    myPlayerId,
    myHand,
    connections,
    error,
    createRoom,
    joinRoom,
    startGame,
    playCard,
    leaveRoom,
  };
}
