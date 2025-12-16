import type { ClientGameState } from '../types/game';
import type { Card as CardType } from '../types/card';
import { PlayerHand, PlayArea, TrumpIndicator, ScoreBoard, PlayerPositions, CanteAnnouncement, CanteDialog } from './index';
import { canDeclare20or40 } from '../utils/rules';
import { useState, useEffect } from 'react';

interface GameBoardProps {
  gameState: ClientGameState;
  onPlayCard: (cardId: string) => void;
  onDeclareCante: (type: '20' | '40', suit: string) => void;
  onSkipCante: () => void;
}

export function GameBoard({ gameState, onPlayCard, onDeclareCante, onSkipCante }: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Encontrar mi posición
  const myPlayer = gameState.players.find(p => p.id === gameState.myId);
  const myPosition = myPlayer?.position ?? 0;
  const myTeam = myPlayer?.team ?? 0;

  // Verificar cantes disponibles
  const availableCantes = gameState.canDeclare 
    ? canDeclare20or40(gameState.myHand, gameState.trumpSuit!, true, false).availableCantes
    : [];

  // Manejar click en carta
  const handleCardClick = (card: CardType) => {
    if (!gameState.isMyTurn) return;
    
    if (selectedCard === card.id) {
      // Doble click = jugar
      onPlayCard(card.id);
      setSelectedCard(null);
    } else {
      setSelectedCard(card.id);
    }
  };

  // Limpiar selección cuando cambia el turno
  useEffect(() => {
    if (!gameState.isMyTurn) {
      setSelectedCard(null);
    }
  }, [gameState.isMyTurn]);

  // Pantalla de fin de juego
  if (gameState.phase === 'gameEnd' && gameState.winner !== null) {
    const wonGame = gameState.winner === myTeam;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        {/* Fondo animado */}
        <div className={`absolute inset-0 ${wonGame 
          ? 'bg-gradient-to-br from-amber-600 via-yellow-500 to-orange-500' 
          : 'bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900'}`
        }>
          {wonGame && (
            <div className="absolute inset-0">
              {[...Array(15)].map((_, i) => (
                <div
                  key={i}
                  className="absolute text-3xl animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${2 + Math.random() * 2}s`
                  }}
                >
                  {['🎉', '🏆', '⭐'][Math.floor(Math.random() * 3)]}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="relative z-10 bg-black/30 backdrop-blur-xl rounded-3xl p-12 border border-white/10 text-center shadow-2xl">
          <div className="text-7xl mb-6">{wonGame ? '🏆' : '😔'}</div>
          <h1 className="text-5xl font-black mb-3 text-white">
            {wonGame ? '¡VICTORIA!' : 'Derrota'}
          </h1>
          <p className="text-lg text-white/70 mb-8">
            {wonGame ? '¡Tu equipo ha ganado la partida!' : 'El equipo rival ha ganado'}
          </p>
          
          <div className="flex justify-center gap-10 mb-8">
            <div className="bg-white/10 rounded-2xl px-8 py-4">
              <div className="text-sm text-white/60 mb-1">Tu Equipo</div>
              <div className="text-4xl font-black text-emerald-400">{gameState.scores[0].roundsWon}</div>
            </div>
            <div className="bg-white/10 rounded-2xl px-8 py-4">
              <div className="text-sm text-white/60 mb-1">Rivales</div>
              <div className="text-4xl font-black text-rose-400">{gameState.scores[1].roundsWon}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-900 via-green-800 to-teal-900 relative overflow-hidden">
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 0%, transparent 50%),
                          radial-gradient(circle at 75% 75%, rgba(255,255,255,0.1) 0%, transparent 50%)`
      }} />

      {/* Área principal del juego */}
      <div className="flex-1 relative p-4">
        {/* Información de jugadores en sus posiciones */}
        <PlayerPositions
          players={gameState.players}
          currentPlayerId={gameState.currentPlayerId}
          myId={gameState.myId}
          myPosition={myPosition}
        />

        {/* Centro del tablero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <PlayArea
            currentTrick={gameState.currentTrick}
            players={gameState.players}
            currentPlayerId={gameState.currentPlayerId}
          />
        </div>

        {/* Panel lateral derecho */}
        <div className="absolute top-4 right-4 flex flex-col gap-3 z-20">
          <TrumpIndicator 
            trumpSuit={gameState.trumpSuit} 
            trumpCard={gameState.trumpCard} 
          />
          <ScoreBoard
            scores={gameState.scores}
            targetRounds={gameState.targetRounds}
            myTeam={myTeam}
          />
        </div>

        {/* Indicador de ronda */}
        <div className="absolute top-4 left-4 z-20 bg-emerald-950/90 backdrop-blur rounded-xl px-4 py-3 border border-emerald-800/50">
          <div className="text-emerald-600 text-[10px] uppercase tracking-wider">Ronda</div>
          <div className="text-emerald-300 font-bold text-2xl">{gameState.roundNumber}</div>
        </div>

        {/* Indicador de turno */}
        {gameState.isMyTurn && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold px-6 py-2 rounded-full shadow-lg shadow-emerald-500/30 animate-pulse">
              ¡Tu turno!
            </div>
          </div>
        )}
      </div>

      {/* Mi mano de cartas (abajo) */}
      <div className="bg-emerald-950/60 backdrop-blur p-4 border-t border-emerald-800/30 relative z-10">
        <div className="max-w-4xl mx-auto">
          <PlayerHand
            cards={gameState.myHand}
            validCardIds={gameState.validCards}
            selectedCardId={selectedCard}
            onCardClick={handleCardClick}
            isCurrentPlayer={gameState.isMyTurn}
            faceUp={true}
            position="bottom"
            size="lg"
          />
          
          {/* Instrucciones */}
          <div className="text-center mt-3">
            <p className={`text-sm ${gameState.isMyTurn ? 'text-emerald-400' : 'text-emerald-200/50'}`}>
              {gameState.isMyTurn 
                ? 'Selecciona una carta y haz doble click para jugarla'
                : `Esperando a ${gameState.players.find(p => p.id === gameState.currentPlayerId)?.name || 'jugador'}...`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Anuncio de cante */}
      <CanteAnnouncement announcement={gameState.lastAnnouncement} />

      {/* Diálogo de cante */}
      {availableCantes.length > 0 && gameState.canDeclare && (
        <CanteDialog
          availableCantes={availableCantes}
          onDeclare={(type, suit) => onDeclareCante(type, suit)}
          onSkip={onSkipCante}
        />
      )}
    </div>
  );
}

export default GameBoard;
