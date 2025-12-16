import { WebSocketServer, WebSocket } from 'ws';

// ============================================
// TIPOS INTERNOS DEL SERVIDOR
// ============================================

type Suit = 'oros' | 'copas' | 'espadas' | 'bastos';
type CardNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;
type PlayerPosition = 0 | 1 | 2 | 3;
type TeamId = 1 | 2;

interface Card {
  id: string;
  suit: Suit;
  number: CardNumber;
  value: number; // puntos
}

interface PlayedCard {
  playerId: string;
  card: Card;
  position: PlayerPosition;
}

interface TeamScore {
  points: number;
  games: number;
}

interface GameState {
  phase: 'waiting' | 'playing' | 'finished';
  roundNumber: number;
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  currentPlayerPosition: PlayerPosition;
  leadPlayerPosition: PlayerPosition;
  currentTrick: PlayedCard[];
  tricksWon: { 1: PlayedCard[][]; 2: PlayedCard[][] };
  scores: { 1: TeamScore; 2: TeamScore };
  lastTrickWinner: PlayerPosition | null;
  gameWinner: TeamId | null;
  cantes: any[];
  deckRemaining: number;
}

interface ClientGameState {
  phase: 'waiting' | 'playing' | 'finished';
  roundNumber: number;
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  currentPlayerPosition: PlayerPosition;
  leadPlayerPosition: PlayerPosition;
  currentTrick: PlayedCard[];
  myHand: Card[];
  myPosition: PlayerPosition;
  players: {
    id: string;
    name: string;
    position: PlayerPosition;
    team: TeamId;
    isHost: boolean;
    connectionStatus: 'connected' | 'disconnected';
    cardCount: number;
  }[];
  scores: { 1: TeamScore; 2: TeamScore };
  canDeclare: boolean;
  lastTrickWinner: PlayerPosition | null;
  gameWinner: TeamId | null;
}

interface ClientMessage {
  type: string;
  playerName?: string;
  roomCode?: string;
  cardId?: string;
  playerId?: string;
  playerSecret?: string;
}

interface ServerMessage {
  type: string;
  [key: string]: any;
}

// Utilidades simples inline para evitar problemas de importación
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const SUITS: Suit[] = ['oros', 'copas', 'espadas', 'bastos'];
const NUMBERS: CardNumber[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const CARD_VALUES: Record<number, number> = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2 };
const CARD_STRENGTH: Record<number, number> = { 1: 14, 3: 13, 12: 12, 11: 11, 10: 10, 7: 7, 6: 6, 5: 5, 4: 4, 2: 2 };

// Obtener la fuerza de una carta considerando triunfo y palo de salida
function getCardStrength(card: Card, trumpSuit: Suit | null, leadSuit: Suit | null): number {
  const baseStrength = CARD_STRENGTH[card.number] || card.number;
  if (card.suit === trumpSuit) return baseStrength + 100;
  if (card.suit === leadSuit) return baseStrength + 50;
  return baseStrength;
}

// Determinar el ganador actual de la baza
function getCurrentWinner(trick: PlayedCard[], trumpSuit: Suit | null): PlayedCard | null {
  if (trick.length === 0) return null;
  const leadSuit = trick[0].card.suit;
  let winner = trick[0];
  let maxStrength = getCardStrength(trick[0].card, trumpSuit, leadSuit);
  
  for (let i = 1; i < trick.length; i++) {
    const strength = getCardStrength(trick[i].card, trumpSuit, leadSuit);
    if (strength > maxStrength) {
      maxStrength = strength;
      winner = trick[i];
    }
  }
  return winner;
}

// Validar qué cartas puede jugar un jugador (reglas de arrastre)
function getValidCards(
  hand: Card[],
  currentTrick: PlayedCard[],
  trumpSuit: Suit | null
): Card[] {
  // Si es el primero en jugar, puede jugar cualquier carta
  if (currentTrick.length === 0) return hand;

  const leadSuit = currentTrick[0].card.suit;
  const cardsOfLeadSuit = hand.filter(c => c.suit === leadSuit);
  const currentWinner = getCurrentWinner(currentTrick, trumpSuit);
  const winnerStrength = currentWinner ? getCardStrength(currentWinner.card, trumpSuit, leadSuit) : 0;

  // Si tiene del palo de salida
  if (cardsOfLeadSuit.length > 0) {
    // Debe jugar del palo de salida, preferiblemente una que gane
    const winningCards = cardsOfLeadSuit.filter(
      c => getCardStrength(c, trumpSuit, leadSuit) > winnerStrength
    );
    // Si puede ganar, debe hacerlo (regla de montar)
    if (winningCards.length > 0) return winningCards;
    // Si no puede ganar, puede jugar cualquier carta del palo
    return cardsOfLeadSuit;
  }

  // Si no tiene del palo de salida, debe jugar triunfo si tiene
  const trumpCards = hand.filter(c => c.suit === trumpSuit);
  if (trumpCards.length > 0) {
    // Si hay triunfo en la baza, debe superar si puede
    const winnerIsTrump = currentWinner && currentWinner.card.suit === trumpSuit;
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

// Tipos internos
type PlayerId = string;

interface PlayerConnection {
  id: PlayerId;
  secret: string;
  name: string;
  position: PlayerPosition;
  ws: WebSocket | null;
  hand: Card[];
}

interface Room {
  code: string;
  hostId: PlayerId;
  players: PlayerConnection[];
  gameState: GameState | null;
}

// Estado global de salas
const rooms = new Map<string, Room>();

// Servidor WebSocket
const PORT = 1999;
const wss = new WebSocketServer({ 
  port: PORT,
  perMessageDeflate: false, // Deshabilitar compresión para simplificar
});

console.log(`🎮 Servidor Tute corriendo en ws://localhost:${PORT}`);

wss.on('connection', (ws, req) => {
  console.log('=== Nueva conexión WebSocket ===');
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Esperamos /party/ROOMCODE
  if (pathParts[0] !== 'party' || !pathParts[1]) {
    console.log('Conexión rechazada: ruta inválida', url.pathname);
    ws.close(1008, 'Invalid path');
    return;
  }

  const roomCode = pathParts[1].toUpperCase();
  console.log(`Sala: ${roomCode} - Conexión aceptada`);

  // Enviar ping para mantener conexión viva
  ws.on('pong', () => {
    console.log('Pong recibido');
  });

  // Contexto de esta conexión
  let currentPlayerId: string | null = null;
  let currentRoom: Room | null = null;

  const send = (message: ServerMessage) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  };

  const broadcast = (room: Room, message: ServerMessage, excludeWs?: WebSocket) => {
    const msgStr = JSON.stringify(message);
    for (const player of room.players) {
      if (player.ws && player.ws !== excludeWs && player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(msgStr);
      }
    }
  };

  const sendRoomState = (room: Room) => {
    for (const player of room.players) {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        const publicPlayers = room.players.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          team: p.position % 2 === 0 ? 1 : 2,
          isHost: p.id === room.hostId,
          connectionStatus: p.ws ? 'connected' as const : 'disconnected' as const,
        }));

        player.ws.send(JSON.stringify({
          type: 'ROOM_STATE',
          players: publicPlayers,
          hostId: room.hostId,
          canStart: room.players.length === 4,
        } as ServerMessage));
      }
    }
  };

  const getClientGameState = (room: Room, playerId: string): ClientGameState | null => {
    if (!room.gameState) return null;
    const gs = room.gameState;
    const player = room.players.find(p => p.id === playerId);
    
    return {
      phase: gs.phase,
      roundNumber: gs.roundNumber,
      trumpCard: gs.trumpCard,
      trumpSuit: gs.trumpSuit,
      currentPlayerPosition: gs.currentPlayerPosition,
      leadPlayerPosition: gs.leadPlayerPosition,
      currentTrick: gs.currentTrick,
      myHand: player?.hand || [],
      myPosition: player?.position ?? 0,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        position: p.position,
        team: p.position % 2 === 0 ? 1 : 2,
        isHost: p.id === room.hostId,
        connectionStatus: p.ws ? 'connected' as const : 'disconnected' as const,
        cardCount: p.hand.length,
      })),
      scores: gs.scores,
      canDeclare: false,
      lastTrickWinner: gs.lastTrickWinner,
      gameWinner: gs.gameWinner,
    };
  };

  const startGame = (room: Room) => {
    const deck = shuffle(createDeck());
    const cardsPerPlayer = 10;
    
    // Repartir cartas
    for (let i = 0; i < room.players.length; i++) {
      room.players[i].hand = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
    }

    // Carta de triunfo (última del mazo)
    const trumpCard = deck[deck.length - 1];

    room.gameState = {
      phase: 'playing',
      roundNumber: 1,
      trumpCard,
      trumpSuit: trumpCard.suit,
      currentPlayerPosition: 0,
      leadPlayerPosition: 0,
      currentTrick: [],
      tricksWon: { 1: [], 2: [] },
      scores: { 1: { games: 0, points: 0 }, 2: { games: 0, points: 0 } },
      cantes: [],
      lastTrickWinner: null,
      gameWinner: null,
      deckRemaining: 0,
    };

    // Enviar estado a cada jugador
    for (const player of room.players) {
      if (player.ws && player.ws.readyState === WebSocket.OPEN) {
        const state = getClientGameState(room, player.id);
        player.ws.send(JSON.stringify({ type: 'GAME_STATE', state } as ServerMessage));
      }
    }
  };

  ws.on('message', (data) => {
    try {
      const message: ClientMessage = JSON.parse(data.toString());
      console.log(`Mensaje de ${currentPlayerId || 'nuevo'}:`, message.type);

      switch (message.type) {
        case 'CREATE_ROOM': {
          // Crear nueva sala
          let room = rooms.get(roomCode);
          if (room && room.players.length > 0) {
            send({ type: 'ERROR', message: 'La sala ya existe', code: 'ROOM_EXISTS' });
            return;
          }

          const playerId = generateId();
          const playerSecret = generateId();

          const player: PlayerConnection = {
            id: playerId,
            secret: playerSecret,
            name: message.playerName || 'Jugador',
            position: 0,
            ws,
            hand: [],
          };

          room = {
            code: roomCode,
            hostId: playerId,
            players: [player],
            gameState: null,
          };

          rooms.set(roomCode, room);
          currentPlayerId = playerId;
          currentRoom = room;

          console.log(`Sala ${roomCode} creada por ${message.playerName}`);

          send({
            type: 'ROOM_CREATED',
            roomCode,
            playerId,
            playerSecret,
          });

          sendRoomState(room);
          break;
        }

        case 'JOIN_ROOM': {
          let room = rooms.get(roomCode);
          
          if (!room) {
            // Auto-crear sala si no existe
            room = {
              code: roomCode,
              hostId: '',
              players: [],
              gameState: null,
            };
            rooms.set(roomCode, room);
          }

          if (room.players.length >= 4) {
            send({ type: 'ERROR', message: 'La sala está llena', code: 'ROOM_FULL' });
            return;
          }

          if (room.gameState) {
            send({ type: 'ERROR', message: 'El juego ya comenzó', code: 'GAME_IN_PROGRESS' });
            return;
          }

          const playerId = generateId();
          const playerSecret = generateId();
          const position = room.players.length as PlayerPosition;

          const player: PlayerConnection = {
            id: playerId,
            secret: playerSecret,
            name: message.playerName || 'Jugador',
            position,
            ws,
            hand: [],
          };

          if (room.players.length === 0) {
            room.hostId = playerId;
          }

          room.players.push(player);
          currentPlayerId = playerId;
          currentRoom = room;

          console.log(`${message.playerName || 'Jugador'} se unió a sala ${roomCode} (${room.players.length}/4)`);

          send({
            type: 'JOINED_ROOM',
            roomCode,
            playerId,
            playerSecret,
            position,
          });

          sendRoomState(room);
          break;
        }

        case 'START_GAME': {
          if (!currentRoom || !currentPlayerId) {
            send({ type: 'ERROR', message: 'No estás en una sala', code: 'NOT_IN_ROOM' });
            return;
          }

          if (currentRoom.hostId !== currentPlayerId) {
            send({ type: 'ERROR', message: 'Solo el anfitrión puede iniciar', code: 'NOT_HOST' });
            return;
          }

          if (currentRoom.players.length !== 4) {
            send({ type: 'ERROR', message: 'Se necesitan 4 jugadores', code: 'NOT_ENOUGH_PLAYERS' });
            return;
          }

          console.log(`Iniciando juego en sala ${currentRoom.code}`);
          broadcast(currentRoom, { type: 'GAME_STARTING' });
          startGame(currentRoom);
          break;
        }

        case 'PLAY_CARD': {
          if (!currentRoom || !currentPlayerId || !currentRoom.gameState) {
            send({ type: 'ERROR', message: 'No hay juego activo', code: 'NO_GAME' });
            return;
          }

          const player = currentRoom.players.find(p => p.id === currentPlayerId);
          if (!player) return;

          const gs = currentRoom.gameState;
          
          if (gs.currentPlayerPosition !== player.position) {
            send({ type: 'ERROR', message: 'No es tu turno', code: 'NOT_YOUR_TURN' });
            return;
          }

          const cardIndex = player.hand.findIndex(c => c.id === message.cardId);
          if (cardIndex === -1) {
            send({ type: 'ERROR', message: 'No tienes esa carta', code: 'INVALID_CARD' });
            return;
          }

          // Validar que la carta sea jugable según las reglas de arrastre
          const validCards = getValidCards(player.hand, gs.currentTrick, gs.trumpSuit);
          const cardToPlay = player.hand[cardIndex];
          if (!validCards.find(c => c.id === cardToPlay.id)) {
            send({ type: 'ERROR', message: 'Debes seguir las reglas de arrastre', code: 'MUST_FOLLOW_SUIT' });
            return;
          }

          // Jugar la carta
          const card = player.hand.splice(cardIndex, 1)[0];
          gs.currentTrick.push({ playerId: currentPlayerId, card, position: player.position });

          console.log(`${player.name} jugó ${card.value} de ${card.suit}`);

          // Si es la primera carta, es la carta líder
          if (gs.currentTrick.length === 1) {
            gs.leadPlayerPosition = player.position;
          }

          // Verificar si la baza está completa
          if (gs.currentTrick.length === 4) {
            // Determinar ganador de la baza usando la función correcta
            const winningPlay = getCurrentWinner(gs.currentTrick, gs.trumpSuit)!;
            const winnerPosition = winningPlay.position;
            const winnerTeam = winnerPosition % 2 === 0 ? 1 : 2;
            
            // Sumar puntos (card.value contiene los puntos)
            const trickPoints = gs.currentTrick.reduce((sum, p) => sum + p.card.value, 0);
            gs.scores[winnerTeam as 1 | 2].points += trickPoints;
            gs.tricksWon[winnerTeam as 1 | 2].push(gs.currentTrick);

            gs.lastTrickWinner = winnerPosition;
            gs.currentPlayerPosition = winnerPosition;
            gs.currentTrick = [];

            console.log(`Baza ganada por posición ${winnerPosition} (equipo ${winnerTeam}) - ${trickPoints} puntos`);

            // Verificar fin de ronda
            const allCardsPlayed = currentRoom.players.every(p => p.hand.length === 0);
            if (allCardsPlayed) {
              // 10 puntos extra por última baza
              gs.scores[winnerTeam as 1 | 2].points += 10;
              
              // Verificar ganador del juego (primera pareja en llegar a 101)
              if (gs.scores[1].points >= 101) {
                gs.gameWinner = 1;
                gs.phase = 'finished';
              } else if (gs.scores[2].points >= 101) {
                gs.gameWinner = 2;
                gs.phase = 'finished';
              }
            }
          } else {
            // Siguiente jugador
            gs.currentPlayerPosition = ((gs.currentPlayerPosition + 1) % 4) as PlayerPosition;
          }

          // Enviar estado actualizado a todos
          for (const p of currentRoom.players) {
            if (p.ws && p.ws.readyState === WebSocket.OPEN) {
              const state = getClientGameState(currentRoom, p.id);
              p.ws.send(JSON.stringify({ type: 'GAME_STATE', state } as ServerMessage));
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error procesando mensaje:', error);
      send({ type: 'ERROR', message: 'Error procesando mensaje', code: 'PARSE_ERROR' });
    }
  });

  ws.on('close', () => {
    console.log(`Desconexión: ${currentPlayerId || 'desconocido'}`);
    
    if (currentRoom && currentPlayerId) {
      const player = currentRoom.players.find(p => p.id === currentPlayerId);
      if (player) {
        player.ws = null;
        broadcast(currentRoom, { 
          type: 'PLAYER_DISCONNECTED', 
          playerId: currentPlayerId 
        });
        sendRoomState(currentRoom);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('Error WebSocket:', error);
  });
});
