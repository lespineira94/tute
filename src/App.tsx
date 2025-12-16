import { useGameConnection } from './hooks/useGameConnection';
import { useAIGame } from './hooks/useAIGame';
import { Lobby, WaitingRoom, GameBoard, GameBoardAI } from './components';
import { useEffect } from 'react';
import './index.css';

function App() {
  // Aplicar la clase lock-landscape al body si está guardada en localStorage
  useEffect(() => {
    const lockLandscape = localStorage.getItem('lockLandscape') === 'true';
    document.body.classList.toggle('lock-landscape', lockLandscape);
  }, []);
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
      isConnecting={isConnecting}
      error={error}
    />
  );
}

export default App;
