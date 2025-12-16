import { useState } from 'react';
import { useGameConnection } from './hooks/useGameConnection';
import { useAIGame } from './hooks/useAIGame';
import { usePeerGame } from './hooks/usePeerGame';
import { Lobby, WaitingRoom, WaitingRoomP2P, GameBoard, GameBoardAI, GameBoardP2P } from './components';
import './index.css';

function App() {
  const [usePeerMode, setUsePeerMode] = useState(false);

  const {
    isConnecting,
    room,
    gameState,
    playerId,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    playCard,
    declareCante,
    skipCante,
  } = useGameConnection();

  const {
    gameState: aiGameState,
    startGame: startAIGame,
    playCard: playAICard,
    exitGame: exitAIGame,
    isProcessing: aiIsProcessing,
    declareCante: aiDeclareCante,
    getMyAvailableCantes,
  } = useAIGame();

  const peerGame = usePeerGame();

  // Handlers para P2P
  const handleCreateOnlineRoom = async (name: string) => {
    console.log('[App] handleCreateOnlineRoom llamado con nombre:', name);
    setUsePeerMode(true);
    try {
      const code = await peerGame.createRoom(name);
      console.log('[App] Sala P2P creada:', code);
    } catch (err) {
      console.error('[App] Error al crear sala P2P:', err);
    }
  };

  const handleJoinOnlineRoom = async (code: string, name: string) => {
    console.log('[App] handleJoinOnlineRoom llamado - código:', code, 'nombre:', name);
    setUsePeerMode(true);
    try {
      await peerGame.joinRoom(code, name);
      console.log('[App] Unido a sala P2P:', code);
    } catch (err) {
      console.error('[App] Error al unirse a sala P2P:', err);
    }
  };

  // Modo P2P - Sala de espera
  if (usePeerMode && peerGame.isConnected && peerGame.roomCode && peerGame.gameState) {
    console.log('[App] Estado P2P:', {
      phase: peerGame.gameState.phase,
      myPlayerId: peerGame.myPlayerId,
      isHost: peerGame.isHost,
      handSize: peerGame.myHand.length
    });

    if (peerGame.gameState.phase === 'waiting') {
      return (
        <WaitingRoomP2P
          roomCode={peerGame.roomCode}
          isHost={peerGame.isHost}
          gameState={peerGame.gameState}
          onStartGame={peerGame.startGame}
          onLeaveRoom={() => {
            peerGame.leaveRoom();
            setUsePeerMode(false);
          }}
        />
      );
    }

    // Modo P2P - Juego en curso
    if (peerGame.gameState.phase === 'playing') {
      console.log('[App] Renderizando GameBoardP2P');
      return (
        <GameBoardP2P
          gameState={peerGame.gameState}
          myPlayerId={peerGame.myPlayerId || peerGame.gameState.hostId}
          myHand={peerGame.myHand}
          onPlayCard={peerGame.playCard}
          onExit={() => {
            peerGame.leaveRoom();
            setUsePeerMode(false);
          }}
        />
      );
    }
  }

  // Modo IA
  if (aiGameState) {
    return (
      <GameBoardAI
        gameState={aiGameState}
        onPlayCard={playAICard}
        onDeclareCante={aiDeclareCante}
        availableCantes={getMyAvailableCantes()}
        onExit={exitAIGame}
        isProcessing={aiIsProcessing}
      />
    );
  }

  // Pantalla de juego multijugador
  if (gameState && gameState.phase !== 'waiting') {
    return (
      <GameBoard
        gameState={gameState}
        onPlayCard={playCard}
        onDeclareCante={declareCante}
        onSkipCante={skipCante}
      />
    );
  }

  // Sala de espera
  if (room && playerId) {
    return (
      <WaitingRoom
        room={room}
        playerId={playerId}
        onStartGame={startGame}
        onLeaveRoom={leaveRoom}
      />
    );
  }

  // Lobby inicial
  return (
    <Lobby
      onCreateRoom={createRoom}
      onJoinRoom={joinRoom}
      onQuickPlay={startAIGame}
      onStartAIGame={startAIGame}
      onCreateOnlineRoom={handleCreateOnlineRoom}
      onJoinOnlineRoom={handleJoinOnlineRoom}
      isConnecting={isConnecting || peerGame.isConnected}
      error={error || peerGame.error}
    />
  );
}

export default App;
