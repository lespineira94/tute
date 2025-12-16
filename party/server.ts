import type * as Party from "partykit/server";
import type { 
  Card, 
  Suit,
  Player,
  PlayerId,
  PlayerPosition,
  TeamId,
  GameState,
  GamePhase,
  PlayedCard,
  TeamScore,
  Cante,
  ClientGameState,
  ClientMessage,
  ServerMessage,
  PublicPlayer,
} from "../src/types";
import {
  createShuffledDeck,
  dealCards,
  generatePlayerId,
  generatePlayerSecret,
  getTeamFromPosition,
  getNextPlayerPosition,
  sortHand,
  calculatePoints,
} from "../src/utils/deck";
import {
  getValidCards,
  getTrickWinner,
  calculateTrickPoints,
  canDeclare20or40,
  canDeclareTute,
  calculateRoundScore,
} from "../src/utils/rules";

// Información de conexión de un jugador
interface PlayerConnection {
  id: PlayerId;
  secret: string;
  name: string;
  position: PlayerPosition;
  connectionId: string | null;
  lastSeen: number;
}

// Estado de la sala
interface RoomState {
  code: string;
  hostId: PlayerId;
  players: PlayerConnection[];
  gameState: GameState | null;
}

export default class TuteServer implements Party.Server {
  private state: RoomState;

  constructor(readonly room: Party.Room) {
    this.state = {
      code: room.id,
      hostId: "",
      players: [],
      gameState: null,
    };
  }

  // Guardar estado en storage de PartyKit
  private async saveState() {
    await this.room.storage.put("state", this.state);
  }

  // Cargar estado desde storage
  private async loadState() {
    const saved = await this.room.storage.get<RoomState>("state");
    if (saved) {
      this.state = saved;
    }
  }

  async onStart() {
    await this.loadState();
  }

  // Manejar nueva conexión
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    console.log(`Conexión: ${conn.id}`);
    // El cliente enviará un mensaje para crear/unirse
  }

  // Manejar desconexión
  async onClose(conn: Party.Connection) {
    const player = this.state.players.find(p => p.connectionId === conn.id);
    if (player) {
      player.connectionId = null;
      player.lastSeen = Date.now();
      
      // Notificar a otros
      this.broadcast({
        type: "PLAYER_DISCONNECTED",
        playerId: player.id,
      }, [conn.id]);

      await this.saveState();
    }
  }

  // Manejar mensajes
  async onMessage(message: string, sender: Party.Connection) {
    try {
      const msg: ClientMessage = JSON.parse(message);
      
      switch (msg.type) {
        case "CREATE_ROOM":
          await this.handleCreateRoom(sender, msg.playerName);
          break;
        case "JOIN_ROOM":
          await this.handleJoinRoom(sender, msg.playerName);
          break;
        case "LEAVE_ROOM":
          await this.handleLeaveRoom(sender);
          break;
        case "START_GAME":
          await this.handleStartGame(sender);
          break;
        case "PLAY_CARD":
          await this.handlePlayCard(sender, msg.cardId);
          break;
        case "DECLARE_CANTE":
          await this.handleDeclareCante(sender, msg.canteType, msg.suit as Suit);
          break;
        case "SKIP_CANTE":
          await this.handleSkipCante(sender);
          break;
        case "RECONNECT":
          await this.handleReconnect(sender, msg.playerId, msg.playerSecret);
          break;
      }
    } catch (error) {
      console.error("Error procesando mensaje:", error);
      this.sendError(sender, "Error procesando mensaje", "UNKNOWN_ERROR");
    }
  }

  // Crear sala (primer jugador)
  private async handleCreateRoom(conn: Party.Connection, playerName: string) {
    if (this.state.players.length > 0) {
      this.sendError(conn, "La sala ya existe", "ROOM_EXISTS");
      return;
    }

    const playerId = generatePlayerId();
    const playerSecret = generatePlayerSecret();

    const player: PlayerConnection = {
      id: playerId,
      secret: playerSecret,
      name: playerName,
      position: 0,
      connectionId: conn.id,
      lastSeen: Date.now(),
    };

    this.state.players.push(player);
    this.state.hostId = playerId;

    await this.saveState();

    const response: ServerMessage = {
      type: "ROOM_CREATED",
      roomCode: this.state.code,
      playerId,
      playerSecret,
    };
    conn.send(JSON.stringify(response));
  }

  // Unirse a sala
  private async handleJoinRoom(conn: Party.Connection, playerName: string) {
    if (this.state.players.length >= 4) {
      this.sendError(conn, "La sala está llena", "ROOM_FULL");
      return;
    }

    if (this.state.gameState && this.state.gameState.phase !== "waiting") {
      this.sendError(conn, "El juego ya ha comenzado", "GAME_ALREADY_STARTED");
      return;
    }

    // Encontrar posición disponible
    const usedPositions = new Set(this.state.players.map(p => p.position));
    let position: PlayerPosition = 0;
    while (usedPositions.has(position)) {
      position = ((position + 1) % 4) as PlayerPosition;
    }

    const playerId = generatePlayerId();
    const playerSecret = generatePlayerSecret();

    const player: PlayerConnection = {
      id: playerId,
      secret: playerSecret,
      name: playerName,
      position,
      connectionId: conn.id,
      lastSeen: Date.now(),
    };

    this.state.players.push(player);
    await this.saveState();

    // Enviar confirmación al nuevo jugador
    const joinResponse: ServerMessage = {
      type: "ROOM_JOINED",
      room: {
        code: this.state.code,
        status: this.state.players.length === 4 ? "full" : "waiting",
        players: this.getPublicPlayers(),
        hostId: this.state.hostId,
        createdAt: Date.now(),
        maxPlayers: 4,
      },
      playerId,
      playerSecret,
    };
    conn.send(JSON.stringify(joinResponse));

    // Notificar a otros
    const newPlayerPublic = this.getPublicPlayer(player);
    this.broadcast({
      type: "PLAYER_JOINED",
      player: newPlayerPublic,
    }, [conn.id]);
  }

  // Salir de sala
  private async handleLeaveRoom(conn: Party.Connection) {
    const playerIndex = this.state.players.findIndex(p => p.connectionId === conn.id);
    if (playerIndex === -1) return;

    const player = this.state.players[playerIndex];
    this.state.players.splice(playerIndex, 1);

    // Si era el host, asignar nuevo host
    if (player.id === this.state.hostId && this.state.players.length > 0) {
      this.state.hostId = this.state.players[0].id;
    }

    await this.saveState();

    this.broadcast({
      type: "PLAYER_LEFT",
      playerId: player.id,
    });
  }

  // Iniciar juego
  private async handleStartGame(conn: Party.Connection) {
    const player = this.state.players.find(p => p.connectionId === conn.id);
    
    if (!player || player.id !== this.state.hostId) {
      this.sendError(conn, "Solo el host puede iniciar", "NOT_HOST");
      return;
    }

    if (this.state.players.length !== 4) {
      this.sendError(conn, "Se necesitan 4 jugadores", "NOT_ENOUGH_PLAYERS");
      return;
    }

    // Inicializar estado del juego
    const deck = createShuffledDeck();
    const { hands, trumpCard, trumpSuit } = dealCards(deck, 4);

    // Ordenar jugadores por posición
    this.state.players.sort((a, b) => a.position - b.position);

    // Crear jugadores con sus manos
    const gamePlayers: Player[] = this.state.players.map((p, index) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      team: getTeamFromPosition(p.position),
      hand: sortHand(hands[index], trumpSuit),
      tricksWon: [],
      connectionStatus: p.connectionId ? "connected" : "disconnected",
      isHost: p.id === this.state.hostId,
    }));

    this.state.gameState = {
      roomCode: this.state.code,
      phase: "playing",
      players: gamePlayers,
      trumpSuit,
      trumpCard,
      currentTrick: [],
      currentPlayerIndex: 0, // Jugador a la derecha del repartidor
      leadPlayerIndex: 0,
      scores: [
        { team: 0, roundPoints: 0, roundsWon: 0, cantes: [] },
        { team: 1, roundPoints: 0, roundsWon: 0, cantes: [] },
      ],
      roundNumber: 1,
      targetRounds: 3,
      lastTrickWinner: null,
      canDeclare: false,
    };

    await this.saveState();

    // Notificar inicio
    this.broadcast({ type: "GAME_STARTING" });

    // Enviar estado a cada jugador
    this.sendGameStateToAll();
  }

  // Jugar carta
  private async handlePlayCard(conn: Party.Connection, cardId: string) {
    if (!this.state.gameState || this.state.gameState.phase !== "playing") {
      this.sendError(conn, "No hay juego en curso", "NO_GAME");
      return;
    }

    const playerConn = this.state.players.find(p => p.connectionId === conn.id);
    if (!playerConn) return;

    const gameState = this.state.gameState;
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];

    if (currentPlayer.id !== playerConn.id) {
      this.sendError(conn, "No es tu turno", "NOT_YOUR_TURN");
      return;
    }

    // Encontrar la carta
    const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      this.sendError(conn, "Carta no encontrada", "INVALID_CARD");
      return;
    }

    const card = currentPlayer.hand[cardIndex];

    // Validar jugada
    const validCards = getValidCards(currentPlayer.hand, gameState.currentTrick, gameState.trumpSuit!);
    if (!validCards.find(c => c.id === cardId)) {
      this.sendError(conn, "Carta no válida", "INVALID_CARD");
      return;
    }

    // Jugar la carta
    currentPlayer.hand.splice(cardIndex, 1);
    gameState.currentTrick.push({
      card,
      playerId: currentPlayer.id,
      position: gameState.currentTrick.length,
    });

    // Notificar carta jugada
    this.broadcast({
      type: "CARD_PLAYED",
      playerId: currentPlayer.id,
      cardId,
    });

    // ¿Baza completa?
    if (gameState.currentTrick.length === 4) {
      await this.resolveTrick();
    } else {
      // Siguiente jugador
      gameState.currentPlayerIndex = this.getNextPlayerIndex(gameState.currentPlayerIndex);
      this.sendGameStateToAll();
    }

    await this.saveState();
  }

  // Resolver baza
  private async resolveTrick() {
    const gameState = this.state.gameState!;
    const winner = getTrickWinner(gameState.currentTrick, gameState.trumpSuit!);
    const winnerPlayer = gameState.players.find(p => p.id === winner.playerId)!;
    const points = calculateTrickPoints(gameState.currentTrick);

    // Añadir cartas al ganador
    for (const pc of gameState.currentTrick) {
      winnerPlayer.tricksWon.push(pc.card);
    }

    // Actualizar puntos
    const teamScore = gameState.scores[winnerPlayer.team];
    teamScore.roundPoints += points;

    // Notificar
    this.broadcast({
      type: "TRICK_WON",
      winnerId: winner.playerId,
      points,
    });

    // Limpiar baza
    gameState.currentTrick = [];
    gameState.lastTrickWinner = winner.playerId;

    // Verificar cantes
    const canCante = this.checkCanDeclare(winnerPlayer);
    gameState.canDeclare = canCante;

    // ¿Fin de ronda?
    if (gameState.players.every(p => p.hand.length === 0)) {
      await this.endRound();
    } else {
      // El ganador de la baza inicia la siguiente
      gameState.currentPlayerIndex = gameState.players.findIndex(p => p.id === winner.playerId);
      gameState.leadPlayerIndex = gameState.currentPlayerIndex;
      this.sendGameStateToAll();
    }
  }

  // Verificar si puede cantar
  private checkCanDeclare(player: Player): boolean {
    const gameState = this.state.gameState!;
    const teamScore = gameState.scores[player.team];
    
    // Verificar 20/40
    const { canDeclare } = canDeclare20or40(
      player.hand,
      gameState.trumpSuit!,
      true, // Acaba de ganar
      teamScore.cantes.some(c => c.type === '20' || c.type === '40')
    );

    // Verificar Tute
    const isFirstWin = !gameState.players
      .filter(p => p.team === player.team)
      .some(p => p.id !== player.id && p.tricksWon.length > 0);
    
    const { canDeclare: canTute } = canDeclareTute(
      player.hand,
      isFirstWin && player.tricksWon.length === gameState.currentTrick.length, // Primera baza del equipo
      teamScore.cantes.length > 0
    );

    return canDeclare || canTute;
  }

  // Declarar cante
  private async handleDeclareCante(conn: Party.Connection, canteType: '20' | '40' | 'tute', suit: Suit) {
    if (!this.state.gameState) return;

    const playerConn = this.state.players.find(p => p.connectionId === conn.id);
    if (!playerConn) return;

    const player = this.state.gameState.players.find(p => p.id === playerConn.id);
    if (!player) return;

    // Validar el cante
    const teamScore = this.state.gameState.scores[player.team];
    
    const cante: Cante = {
      type: canteType,
      playerId: player.id,
      suit,
    };

    teamScore.cantes.push(cante);

    // Notificar
    this.broadcast({
      type: "CANTE_DECLARED",
      playerId: player.id,
      canteType,
      suit,
    });

    // Si es Tute, terminar ronda
    if (canteType === 'tute') {
      await this.endRound();
    } else {
      this.state.gameState.canDeclare = false;
      this.sendGameStateToAll();
    }

    await this.saveState();
  }

  // Saltar cante
  private async handleSkipCante(conn: Party.Connection) {
    if (!this.state.gameState) return;
    this.state.gameState.canDeclare = false;
    this.sendGameStateToAll();
    await this.saveState();
  }

  // Terminar ronda
  private async endRound() {
    const gameState = this.state.gameState!;

    // Calcular puntuación final
    const team0Cards = gameState.players
      .filter(p => p.team === 0)
      .flatMap(p => p.tricksWon);
    const team1Cards = gameState.players
      .filter(p => p.team === 1)
      .flatMap(p => p.tricksWon);

    const lastWinnerTeam = gameState.players.find(p => p.id === gameState.lastTrickWinner)?.team || 0;

    const { team0Points, team1Points, winner } = calculateRoundScore(
      team0Cards,
      team1Cards,
      gameState.scores[0].cantes,
      gameState.scores[1].cantes,
      lastWinnerTeam,
      gameState.trumpSuit!
    );

    gameState.scores[0].roundPoints = team0Points;
    gameState.scores[1].roundPoints = team1Points;
    gameState.scores[winner].roundsWon++;

    // Notificar fin de ronda
    this.broadcast({
      type: "ROUND_END",
      scores: gameState.scores,
    });

    // ¿Fin de partida?
    if (gameState.scores[winner].roundsWon >= gameState.targetRounds) {
      gameState.phase = "gameEnd";
      this.broadcast({
        type: "GAME_END",
        winnerTeam: winner,
      });
    } else {
      // Nueva ronda
      await this.startNewRound();
    }

    await this.saveState();
  }

  // Iniciar nueva ronda
  private async startNewRound() {
    const gameState = this.state.gameState!;

    const deck = createShuffledDeck();
    const { hands, trumpCard, trumpSuit } = dealCards(deck, 4);

    // Resetear estado de jugadores
    gameState.players.forEach((player, index) => {
      player.hand = sortHand(hands[index], trumpSuit);
      player.tricksWon = [];
    });

    // Resetear estado de ronda
    gameState.trumpSuit = trumpSuit;
    gameState.trumpCard = trumpCard;
    gameState.currentTrick = [];
    gameState.roundNumber++;
    gameState.phase = "playing";
    gameState.scores[0].roundPoints = 0;
    gameState.scores[1].roundPoints = 0;
    gameState.scores[0].cantes = [];
    gameState.scores[1].cantes = [];
    gameState.lastTrickWinner = null;
    gameState.canDeclare = false;

    // Rotar quien reparte
    gameState.currentPlayerIndex = (gameState.leadPlayerIndex + 3) % 4;
    gameState.leadPlayerIndex = gameState.currentPlayerIndex;

    this.sendGameStateToAll();
  }

  // Reconexión
  private async handleReconnect(conn: Party.Connection, playerId: string, playerSecret: string) {
    const player = this.state.players.find(p => p.id === playerId && p.secret === playerSecret);
    
    if (!player) {
      this.sendError(conn, "No se pudo reconectar", "RECONNECT_FAILED");
      return;
    }

    player.connectionId = conn.id;
    player.lastSeen = Date.now();

    // Actualizar estado del jugador en el juego
    if (this.state.gameState) {
      const gamePlayer = this.state.gameState.players.find(p => p.id === playerId);
      if (gamePlayer) {
        gamePlayer.connectionStatus = "connected";
      }
    }

    await this.saveState();

    // Notificar reconexión
    this.broadcast({
      type: "PLAYER_RECONNECTED",
      playerId,
    });

    // Enviar estado actual
    if (this.state.gameState) {
      this.sendGameStateToPlayer(conn, playerId);
    } else {
      const response: ServerMessage = {
        type: "ROOM_JOINED",
        room: {
          code: this.state.code,
          status: this.state.players.length === 4 ? "full" : "waiting",
          players: this.getPublicPlayers(),
          hostId: this.state.hostId,
          createdAt: Date.now(),
          maxPlayers: 4,
        },
        playerId,
        playerSecret,
      };
      conn.send(JSON.stringify(response));
    }
  }

  // Helpers
  private getNextPlayerIndex(current: number): number {
    // Sentido antihorario
    return (current + 3) % 4;
  }

  private getPublicPlayers(): PublicPlayer[] {
    return this.state.players.map(p => this.getPublicPlayer(p));
  }

  private getPublicPlayer(p: PlayerConnection): PublicPlayer {
    const gamePlayer = this.state.gameState?.players.find(gp => gp.id === p.id);
    return {
      id: p.id,
      name: p.name,
      position: p.position,
      team: getTeamFromPosition(p.position),
      cardCount: gamePlayer?.hand.length || 0,
      connectionStatus: p.connectionId ? "connected" : "disconnected",
      isHost: p.id === this.state.hostId,
    };
  }

  private sendGameStateToAll() {
    for (const player of this.state.players) {
      if (player.connectionId) {
        const conn = this.room.getConnection(player.connectionId);
        if (conn) {
          this.sendGameStateToPlayer(conn, player.id);
        }
      }
    }
  }

  private sendGameStateToPlayer(conn: Party.Connection, playerId: string) {
    const gameState = this.state.gameState;
    if (!gameState) return;

    const player = gameState.players.find(p => p.id === playerId);
    if (!player) return;

    const clientState: ClientGameState = {
      roomCode: gameState.roomCode,
      phase: gameState.phase,
      myId: playerId,
      myHand: player.hand,
      players: this.getPublicPlayers(),
      trumpSuit: gameState.trumpSuit,
      trumpCard: gameState.trumpCard,
      currentTrick: gameState.currentTrick,
      currentPlayerId: gameState.players[gameState.currentPlayerIndex]?.id || null,
      isMyTurn: gameState.players[gameState.currentPlayerIndex]?.id === playerId,
      scores: gameState.scores,
      roundNumber: gameState.roundNumber,
      targetRounds: gameState.targetRounds,
      canDeclare: gameState.canDeclare && player.id === gameState.lastTrickWinner,
      validCards: gameState.players[gameState.currentPlayerIndex]?.id === playerId
        ? getValidCards(player.hand, gameState.currentTrick, gameState.trumpSuit!).map(c => c.id)
        : [],
      pendingCante: null,
      lastAnnouncement: null,
      winner: gameState.phase === "gameEnd" 
        ? (gameState.scores[0].roundsWon >= gameState.targetRounds ? 0 : 1)
        : null,
    };

    const response: ServerMessage = {
      type: "GAME_STATE",
      state: clientState,
    };
    conn.send(JSON.stringify(response));
  }

  private sendError(conn: Party.Connection, message: string, code: string) {
    const response: ServerMessage = {
      type: "ERROR",
      message,
      code,
    };
    conn.send(JSON.stringify(response));
  }

  private broadcast(message: ServerMessage, exclude: string[] = []) {
    const json = JSON.stringify(message);
    for (const player of this.state.players) {
      if (player.connectionId && !exclude.includes(player.connectionId)) {
        const conn = this.room.getConnection(player.connectionId);
        if (conn) {
          conn.send(json);
        }
      }
    }
  }
}
