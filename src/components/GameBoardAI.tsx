import { useState, useEffect, useMemo } from 'react';
import { Card } from './Card';
import { TrumpIndicator } from './TrumpIndicator';
import { getValidCards } from '../hooks/useAIGame';
import type { Card as CardType, Suit } from '../types/card';

interface PlayedCard {
  playerId: string;
  card: CardType;
  position: 0 | 1 | 2 | 3;
}

interface TrickHistory {
  cards: PlayedCard[];
  winner: 0 | 1 | 2 | 3;
  points: number;
}

interface CanteInfo {
  playerId: string;
  playerName: string;
  suit: Suit;
  points: 20 | 40;
}

interface AvailableCante {
  suit: Suit;
  points: 20 | 40;
}

interface AIPlayer {
  id: string;
  name: string;
  position: 0 | 1 | 2 | 3;
  team: 1 | 2;
  hand: CardType[];
  isAI: boolean;
}

interface AIGameState {
  phase: 'waiting' | 'playing' | 'finished';
  players: AIPlayer[];
  trumpCard: CardType | null;
  trumpSuit: Suit | null;
  currentPlayerPosition: 0 | 1 | 2 | 3;
  leadPlayerPosition: 0 | 1 | 2 | 3;
  currentTrick: PlayedCard[];
  currentTrickWinner: 0 | 1 | 2 | 3 | null;
  trickHistory: TrickHistory[];
  canteHistory: CanteInfo[];
  scores: { 1: { points: number; games: number }; 2: { points: number; games: number } };
  roundNumber: number;
  lastTrickWinner: number | null;
  gameWinner: 1 | 2 | null;
  myPosition: 0 | 1 | 2 | 3;
  myHand: CardType[];
  lastCante: CanteInfo | null;
  cantedSuits: Suit[];
}

interface GameBoardAIProps {
  gameState: AIGameState;
  onPlayCard: (cardId: string) => void;
  onDeclareCante?: (suit: Suit) => void;
  availableCantes?: AvailableCante[];
  onExit: () => void;
  isProcessing: boolean;
}

// Posiciones relativas: 0 = yo (abajo), 1 = derecha, 2 = enfrente, 3 = izquierda
const POSITION_STYLES = {
  0: 'bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2', // Yo
  1: 'right-1 sm:right-4 top-[35%] sm:top-1/2 -translate-y-1/2',   // Derecha
  2: 'top-14 sm:top-4 left-1/2 -translate-x-1/2',    // Enfrente
  3: 'left-1 sm:left-4 top-[35%] sm:top-1/2 -translate-y-1/2',    // Izquierda
};

// Orden de los palos (oros, copas, espadas, bastos)
const SUIT_ORDER: Record<Suit, number> = {
  oros: 0,
  copas: 1,
  espadas: 2,
  bastos: 3,
};

// Fuerza de las cartas para ordenar (As es la más fuerte)
const CARD_ORDER: Record<number, number> = {
  1: 10,  // As
  3: 9,   // Tres
  12: 8,  // Rey
  11: 7,  // Caballo
  10: 6,  // Sota
  7: 5,
  6: 4,
  5: 3,
  4: 2,
  2: 1,
};

// Función para ordenar cartas por palo y valor
function sortCards(cards: CardType[], trumpSuit: Suit | null): CardType[] {
  return [...cards].sort((a, b) => {
    // Primero el triunfo
    const aIsTrump = a.suit === trumpSuit;
    const bIsTrump = b.suit === trumpSuit;
    if (aIsTrump && !bIsTrump) return -1;
    if (!aIsTrump && bIsTrump) return 1;
    
    // Luego por palo
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    
    // Finalmente por valor (mayor primero)
    const aNum = (a as any).number ?? (a as any).value ?? 1;
    const bNum = (b as any).number ?? (b as any).value ?? 1;
    return (CARD_ORDER[bNum] || bNum) - (CARD_ORDER[aNum] || aNum);
  });
}

export function GameBoardAI({ gameState, onPlayCard, onDeclareCante, availableCantes = [], onExit, isProcessing }: GameBoardAIProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showTrickHistory, setShowTrickHistory] = useState(false);
  const [dealtCards, setDealtCards] = useState<Set<string>>(new Set());
  const [prevHandSize, setPrevHandSize] = useState(0);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());
  const [prevTrickLength, setPrevTrickLength] = useState(0);

  const isMyTurn = gameState.currentPlayerPosition === 0;
  const myTeam = gameState.players[0].team;

  // Ordenar cartas por palo y valor
  const sortedHand = useMemo(() => 
    sortCards(gameState.myHand, gameState.trumpSuit),
    [gameState.myHand, gameState.trumpSuit]
  );

  // Animación de reparto de cartas
  useEffect(() => {
    const currentHandSize = gameState.myHand.length;
    
    if (currentHandSize > prevHandSize || (currentHandSize === 10 && dealtCards.size === 0)) {
      // Nueva ronda o nuevas cartas - animar entrada
      const cardIds = gameState.myHand.map(c => c.id);
      const newCards = cardIds.filter(id => !dealtCards.has(id));
      
      newCards.forEach((id, index) => {
        setTimeout(() => {
          setDealtCards(prev => new Set([...prev, id]));
        }, index * 100);
      });
    } else if (currentHandSize < prevHandSize) {
      // Se jugó una carta - mantener las existentes
      setDealtCards(new Set(gameState.myHand.map(c => c.id)));
    }
    
    setPrevHandSize(currentHandSize);
  }, [gameState.myHand, prevHandSize, dealtCards.size]);

  // Reset al cambiar de ronda
  useEffect(() => {
    if (gameState.roundNumber > 0 && gameState.myHand.length === 10 && dealtCards.size !== 10) {
      setDealtCards(new Set());
    }
  }, [gameState.roundNumber]);

  // Animación de cartas entrando al tapete
  useEffect(() => {
    const currentTrickLength = gameState.currentTrick.length;
    
    if (currentTrickLength > prevTrickLength) {
      // Nueva carta jugada - animarla
      const newCard = gameState.currentTrick[currentTrickLength - 1];
      if (newCard) {
        // Primero añadir a animating (posición inicial)
        setAnimatingCards(prev => new Set([...prev, newCard.card.id]));
        // Después de un frame, remover para que la transición CSS anime hacia la posición final
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setAnimatingCards(prev => {
              const next = new Set(prev);
              next.delete(newCard.card.id);
              return next;
            });
          });
        });
      }
    } else if (currentTrickLength === 0 && prevTrickLength > 0) {
      // Se recogió la baza
      setAnimatingCards(new Set());
    }
    
    setPrevTrickLength(currentTrickLength);
  }, [gameState.currentTrick.length, prevTrickLength]);

  // Obtener cartas válidas para jugar
  const validCardIds = useMemo(() => {
    if (!isMyTurn || isProcessing) return new Set<string>();
    const validCards = getValidCards(
      gameState.myHand,
      gameState.currentTrick,
      gameState.trumpSuit
    );
    return new Set(validCards.map(c => c.id));
  }, [isMyTurn, isProcessing, gameState.myHand, gameState.currentTrick, gameState.trumpSuit]);

  // Detectar si es móvil
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calcular posición en abanico (ajustado para móvil)
  const getCardTransform = (index: number, total: number, isSelected: boolean, isValid: boolean) => {
    const middleIndex = (total - 1) / 2;
    const offsetFromMiddle = index - middleIndex;
    
    // Ángulo de rotación (máximo 35 grados en los extremos) - menor en móvil
    const maxAngle = isMobile ? 20 : 30;
    const angle = (offsetFromMiddle / Math.max(total - 1, 1)) * maxAngle * 2;
    
    // Desplazamiento horizontal - menor en móvil
    const spreadX = isMobile ? 22 : 38;
    const translateX = offsetFromMiddle * spreadX;
    
    // Arco vertical (cartas del centro más arriba) - menor en móvil
    const normalizedOffset = Math.abs(offsetFromMiddle) / Math.max(middleIndex, 1);
    const arcLift = normalizedOffset * normalizedOffset * (isMobile ? 15 : 25);
    
    // Elevación por selección/validez - menor en móvil
    let translateY = arcLift;
    if (isSelected) {
      translateY = isMobile ? -25 : -40;
    } else if (isValid && isMyTurn) {
      translateY = arcLift - (isMobile ? 10 : 15);
    }
    
    return { angle, translateX, translateY };
  };

  // Obtener posición relativa de un jugador
  const getRelativePosition = (playerPosition: number): 0 | 1 | 2 | 3 => {
    return ((playerPosition - gameState.myPosition + 4) % 4) as 0 | 1 | 2 | 3;
  };

  // Manejar click en carta
  const handleCardClick = (card: CardType) => {
    if (!isMyTurn || isProcessing) return;
    if (!validCardIds.has(card.id)) return; // Solo permitir cartas válidas
    
    if (selectedCard === card.id) {
      onPlayCard(card.id);
      setSelectedCard(null);
    } else {
      setSelectedCard(card.id);
    }
  };

  // Limpiar selección cuando cambia el turno
  useEffect(() => {
    if (!isMyTurn) {
      setSelectedCard(null);
    }
  }, [isMyTurn]);

  // Pantalla de fin de juego
  if (gameState.phase === 'finished' && gameState.gameWinner !== null) {
    const wonGame = gameState.gameWinner === myTeam;
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0f]">
        {/* Fondo con efectos */}
        <div className="absolute inset-0">
          {wonGame ? (
            <>
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl animate-pulse" />
              <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            </>
          ) : (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neutral-800/30 rounded-full blur-3xl" />
          )}
        </div>
        
        <div className="relative z-10 text-center">
          {/* Icono animado */}
          <div className={`text-8xl mb-8 ${wonGame ? 'animate-bounce' : ''}`}>
            {wonGame ? '🏆' : '💔'}
          </div>
          
          {/* Título */}
          <h1 className={`text-5xl font-black mb-3 ${wonGame ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-500' : 'text-neutral-300'}`}>
            {wonGame ? '¡VICTORIA!' : 'Derrota'}
          </h1>
          <p className="text-neutral-500 mb-10">
            {wonGame ? '¡Tu equipo ha ganado la partida!' : 'Los bots han ganado esta vez'}
          </p>
          
          {/* Marcador final */}
          <div className="flex justify-center gap-6 mb-10">
            <div className={`px-8 py-5 rounded-2xl border ${wonGame ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-neutral-800/50 border-neutral-700'}`}>
              <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Tu Equipo</div>
              <div className={`text-5xl font-black ${wonGame ? 'text-emerald-400' : 'text-neutral-400'}`}>{gameState.scores[1].games}</div>
            </div>
            <div className="flex items-center text-neutral-600 text-2xl">vs</div>
            <div className={`px-8 py-5 rounded-2xl border ${!wonGame ? 'bg-rose-500/10 border-rose-500/30' : 'bg-neutral-800/50 border-neutral-700'}`}>
              <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Rivales</div>
              <div className={`text-5xl font-black ${!wonGame ? 'text-rose-400' : 'text-neutral-400'}`}>{gameState.scores[2].games}</div>
            </div>
          </div>
          
          {/* Botón */}
          <button
            onClick={onExit}
            className={`
              px-8 py-4 font-semibold text-lg rounded-xl transition-all
              ${wonGame 
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/25' 
                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 border border-neutral-700'
              }
            `}
          >
            {wonGame ? 'Jugar de nuevo' : 'Volver al menú'}
          </button>
        </div>
      </div>
    );
  }

  // Ahora el hook mantiene las 4 cartas visibles, usamos directamente currentTrick
  const trickToShow = gameState.currentTrick;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f0a] relative overflow-hidden">
      {/* Fondo con gradientes sutiles */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-900/20 rounded-full blur-3xl" />
      </div>

      {/* Mesa de juego central - centrada con las cartas */}
      <div className="absolute top-[40%] sm:top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-[280px] h-[200px] sm:w-[400px] sm:h-[280px] lg:w-[560px] lg:h-[380px] bg-gradient-to-br from-emerald-800/40 to-green-900/50 rounded-[50px] sm:rounded-[80px] lg:rounded-[100px] border-2 border-emerald-600/30 shadow-[0_0_60px_rgba(16,185,129,0.15),inset_0_2px_40px_rgba(0,0,0,0.3)]" />
      </div>
      
      {/* Área principal del juego */}
      <div className="flex-1 relative p-4">
        {/* Jugadores en sus posiciones */}
        {gameState.players.map((player) => {
          const relPos = getRelativePosition(player.position);
          if (relPos === 0) return null;
          
          const isCurrent = gameState.currentPlayerPosition === player.position;
          const isAlly = player.team === myTeam;
          const isLead = gameState.leadPlayerPosition === player.position;
          const isWinner = gameState.currentTrickWinner === player.position;
          
          return (
            <div
              key={player.id}
              className={`absolute ${POSITION_STYLES[relPos]} z-10`}
            >
              <div className={`
                backdrop-blur-md rounded-xl sm:rounded-2xl px-2 py-1.5 sm:px-4 sm:py-3 min-w-[90px] sm:min-w-[140px] transition-all duration-300 border
                ${isWinner 
                  ? 'bg-amber-500/90 border-amber-400/50 shadow-lg shadow-amber-500/40 scale-105'
                  : isCurrent 
                    ? 'bg-emerald-500/90 border-emerald-400/50 shadow-lg shadow-emerald-500/30' 
                    : isAlly 
                      ? 'bg-emerald-500/20 border-emerald-500/30' 
                      : 'bg-emerald-900/40 border-emerald-700/30'
                }
              `}>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className={`
                    w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-lg relative
                    ${isWinner ? 'bg-black/20' : isCurrent ? 'bg-black/20' : isAlly ? 'bg-emerald-500/30' : 'bg-emerald-800/40'}
                  `}>
                    {isWinner ? '👑' : player.isAI ? '🤖' : '👤'}
                    {isLead && !isWinner && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500 rounded-full flex items-center justify-center text-[6px] sm:text-[8px] font-bold text-black">
                        M
                      </div>
                    )}
                  </div>
                  <div>
                    <div className={`font-semibold text-xs sm:text-sm ${isWinner ? 'text-black' : isCurrent ? 'text-black' : 'text-white'}`}>
                      {player.name}
                    </div>
                    <div className={`text-[10px] sm:text-xs ${isWinner ? 'text-black/60' : isCurrent ? 'text-black/60' : 'text-white/50'}`}>
                      {isWinner ? '¡Gana!' : `${player.hand.length} cartas`}
                      {isCurrent && !isWinner && (
                        <span className="ml-1 inline-flex">
                          <span className="animate-pulse">●</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Centro del tablero - Cartas jugadas */}
        <div className="absolute top-[40%] sm:top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 sm:w-64 lg:w-80 h-36 sm:h-44 lg:h-56">
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Contenedor centrado para las cartas */}
            <div className="relative w-28 sm:w-40 lg:w-48 h-20 sm:h-28 lg:h-32">
              {trickToShow.map((played, idx) => {
                const relPos = getRelativePosition(played.position);
                const isAnimating = animatingCards.has(played.card.id);
                const isWinningCard = gameState.currentTrickWinner === played.position && trickToShow.length === 4;
                
                // Posiciones en cruz centradas
                const positions = {
                  0: { x: 0, y: 30, rotate: 0 },     // Abajo (yo)
                  1: { x: 40, y: 0, rotate: 8 },    // Derecha
                  2: { x: 0, y: -30, rotate: 0 },   // Arriba
                  3: { x: -40, y: 0, rotate: -8 },  // Izquierda
                };
                
                const pos = positions[relPos];
                
                // Posición inicial según de dónde viene la carta
                const startPositions = {
                  0: { x: 0, y: 200 },    // Desde abajo
                  1: { x: 200, y: 0 },    // Desde derecha
                  2: { x: 0, y: -200 },   // Desde arriba
                  3: { x: -200, y: 0 },   // Desde izquierda
                };
                
                const startPos = startPositions[relPos];
                
                return (
                  <div
                    key={played.card.id}
                    className={`absolute left-1/2 top-1/2 transition-all ease-out ${isWinningCard ? 'z-10' : ''}`}
                    style={{ 
                      zIndex: isWinningCard ? 10 : idx + 1,
                      filter: isWinningCard 
                        ? 'drop-shadow(0 0 20px rgba(251,191,36,0.8)) drop-shadow(0 0 40px rgba(251,191,36,0.5))'
                        : 'drop-shadow(0 8px 20px rgba(0,0,0,0.5))',
                      transform: isAnimating
                        ? `translate(calc(-50% + ${startPos.x}px), calc(-50% + ${startPos.y}px)) rotate(0deg) scale(1.1)`
                        : `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${pos.rotate}deg) scale(${isWinningCard ? 1.1 : 1})`,
                      transitionDuration: '400ms',
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    <Card card={played.card} size="sm" />
                    {isWinningCard && (
                      <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-6 sm:h-6 bg-amber-500 rounded-full flex items-center justify-center text-xs sm:text-sm shadow-lg animate-bounce">
                        👑
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {trickToShow.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-600/20">
                  <span className="text-emerald-500/40 text-4xl">♠</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Panel superior izquierdo - Marcador moderno */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20">
          <div className="bg-neutral-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-neutral-800 min-w-[100px] sm:min-w-[160px]">
            <div className="text-neutral-500 text-[8px] sm:text-[10px] uppercase tracking-wider mb-1 sm:mb-3">Ronda {gameState.roundNumber}</div>
            
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-emerald-400">{gameState.scores[myTeam].points}</div>
                <div className="text-[8px] sm:text-[10px] text-neutral-500 uppercase">Nos</div>
              </div>
              <div className="text-neutral-600 text-base sm:text-xl font-light">:</div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-rose-400">{gameState.scores[myTeam === 1 ? 2 : 1].points}</div>
                <div className="text-[8px] sm:text-[10px] text-neutral-500 uppercase">Ellos</div>
              </div>
            </div>
            
            <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-neutral-800">
              <div className="flex justify-center gap-1.5 sm:gap-2">
                {[1, 2, 3].map(g => (
                  <div 
                    key={g} 
                    className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                      g <= gameState.scores[myTeam].games 
                        ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                        : g <= gameState.scores[myTeam === 1 ? 2 : 1].games 
                        ? 'bg-rose-400 shadow-lg shadow-rose-400/50' 
                        : 'bg-neutral-700'
                    }`}
                  />
                ))}
              </div>
              <div className="text-[7px] sm:text-[9px] text-neutral-600 text-center mt-1">Rondas</div>
            </div>
            
            {/* Botón historial de bazas */}
            {gameState.trickHistory && gameState.trickHistory.length > 0 && (
              <button
                onClick={() => setShowTrickHistory(true)}
                className="mt-2 sm:mt-3 w-full py-1.5 sm:py-2 px-2 sm:px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg text-[10px] sm:text-xs text-emerald-400 flex items-center justify-center gap-1 sm:gap-2 transition-all"
              >
                <span>📜</span>
                <span>Bazas ({gameState.trickHistory.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Triunfo */}
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4 z-20">
          <TrumpIndicator 
            trumpSuit={gameState.trumpSuit} 
            trumpCard={gameState.trumpCard} 
          />
        </div>

        {/* Indicador de turno - moderno */}
        {isMyTurn && !isProcessing && (
          <div className="absolute top-[35%] sm:top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold px-4 py-2 sm:px-6 sm:py-2.5 rounded-full shadow-xl shadow-emerald-500/40 flex items-center gap-2 text-sm sm:text-base">
              <span className="w-2 h-2 bg-white/50 rounded-full animate-ping" />
              ¡Tu turno!
            </div>
          </div>
        )}

        {/* Botón salir - moderno */}
        <button
          onClick={onExit}
          className="absolute bottom-2 sm:bottom-4 right-2 sm:right-4 px-3 py-2 sm:px-4 sm:py-2.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg sm:rounded-xl text-xs sm:text-sm z-20 transition-all border border-neutral-800 backdrop-blur-md flex items-center gap-1 sm:gap-2"
        >
          <span>←</span>
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>

      {/* Mi mano de cartas - en abanico realista */}
      <div className="bg-gradient-to-t from-neutral-950 via-neutral-900/80 to-transparent pt-1 sm:pt-2 pb-4 sm:pb-8 relative z-10">
        <div className="max-w-4xl mx-auto px-2">
          {/* Contenedor del abanico */}
          <div 
            className="relative flex items-end justify-center"
            style={{ height: 'clamp(120px, 25vh, 200px)', perspective: '1000px' }}
          >
            {sortedHand.map((card, idx) => {
              const isValid = validCardIds.has(card.id);
              const isSelected = selectedCard === card.id;
              const canInteract = isMyTurn && !isProcessing && isValid;
              const isDealt = dealtCards.has(card.id);
              const transform = getCardTransform(idx, sortedHand.length, isSelected, isValid);
              
              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card)}
                  className={`
                    absolute transition-all ease-out
                    ${canInteract ? 'cursor-pointer' : 'cursor-not-allowed'}
                    ${isSelected ? 'z-30' : isValid ? 'z-20 hover:z-30' : 'z-10'}
                    ${isDealt ? 'opacity-100' : 'opacity-0'}
                  `}
                  style={{ 
                    transitionDuration: isDealt ? '400ms' : '0ms',
                    transitionDelay: !isDealt ? `${idx * 80}ms` : '0ms',
                    transform: isDealt 
                      ? `translateX(${transform.translateX}px) translateY(${transform.translateY}px) rotate(${transform.angle}deg)`
                      : 'translateX(0) translateY(-300px) rotate(0deg) scale(0.7)',
                    transformOrigin: 'bottom center',
                  }}
                >
                  <div 
                    className={`
                      transition-all duration-200
                      ${canInteract ? 'hover:-translate-y-5 hover:scale-110' : ''}
                      ${!isValid && isMyTurn ? 'opacity-40 grayscale' : ''}
                      ${isSelected ? 'scale-110' : ''}
                    `}
                    style={{
                      filter: isSelected 
                        ? 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.9)) drop-shadow(0 10px 20px rgba(0,0,0,0.5))' 
                        : isValid && isMyTurn
                          ? 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5))'
                          : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))',
                    }}
                  >
                    <Card card={card} size={isMobile ? "md" : "lg"} playable={canInteract} selected={isSelected} />
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Instrucciones - estilo moderno */}
          <div className="text-center mt-2 sm:mt-4">
            <div className={`
              inline-flex items-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm transition-all
              ${isMyTurn && !isProcessing 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-emerald-900/30 text-emerald-600 border border-emerald-800/50'}
            `}>
              {isMyTurn && !isProcessing ? (
                <>
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="hidden sm:inline">Toca una carta para seleccionar, dos veces para jugar</span>
                  <span className="sm:hidden">Toca 2 veces para jugar</span>
                </>
              ) : isProcessing ? (
                <>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span className="hidden sm:inline">Los bots están pensando...</span>
                  <span className="sm:hidden">Pensando...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                  <span>Turno de {gameState.players.find(p => p.position === gameState.currentPlayerPosition)?.name}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Botones de cante cuando el jugador puede cantar */}
          {isMyTurn && !isProcessing && availableCantes && availableCantes.length > 0 && (
            <div className="flex justify-center gap-2 sm:gap-3 mt-2 sm:mt-4 flex-wrap px-2">
              {availableCantes.map((cante, idx) => {
                const suitIcons: Record<Suit, string> = { oros: '🪙', copas: '🏆', espadas: '⚔️', bastos: '🏏' };
                const is40 = cante.points === 40;
                return (
                  <button
                    key={idx}
                    onClick={() => onDeclareCante?.(cante.suit)}
                    className={`
                      px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-all
                      ${is40 
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:from-amber-400 hover:to-yellow-400 shadow-lg shadow-amber-500/30' 
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/30'
                      }
                    `}
                  >
                    <span>{suitIcons[cante.suit]}</span>
                    <span>¡{is40 ? 'Las 40' : '20 en'} {cante.suit}!</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de historial de bazas */}
      {showTrickHistory && gameState.trickHistory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowTrickHistory(false)}>
          <div className="bg-neutral-900/95 border border-neutral-700 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Historial de Bazas</h2>
              <button onClick={() => setShowTrickHistory(false)} className="text-neutral-500 hover:text-white text-2xl">&times;</button>
            </div>
            
            {gameState.trickHistory.length === 0 ? (
              <p className="text-neutral-500 text-center py-8">No hay bazas aún</p>
            ) : (
              <div className="space-y-4">
                {gameState.trickHistory.map((trick, trickIdx) => {
                  const winnerPlayer = gameState.players.find(p => p.position === trick.winner);
                  return (
                    <div key={trickIdx} className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-700">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-neutral-400">Baza {trickIdx + 1}</span>
                        <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">
                          +{trick.points} pts → {winnerPlayer?.name}
                        </span>
                      </div>
                      <div className="flex justify-center gap-2">
                        {trick.cards.map((played, cardIdx) => (
                          <div 
                            key={cardIdx} 
                            className={`relative ${played.position === trick.winner ? 'ring-2 ring-amber-400 rounded-lg' : ''}`}
                          >
                            <Card card={played.card} size="sm" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Historial de cantes */}
            {gameState.canteHistory && gameState.canteHistory.length > 0 && (
              <div className="mt-6 pt-4 border-t border-neutral-700">
                <h3 className="text-lg font-semibold text-white mb-3">Cantes</h3>
                <div className="space-y-2">
                  {gameState.canteHistory.map((cante, idx) => {
                    const suitIcons: Record<Suit, string> = { oros: '🪙', copas: '🏆', espadas: '⚔️', bastos: '🏏' };
                    const is40 = cante.points === 40;
                    return (
                      <div key={idx} className="flex items-center justify-between bg-neutral-800/30 rounded-lg px-3 py-2">
                        <span className="text-sm text-neutral-300">
                          {suitIcons[cante.suit]} {cante.playerName}: {is40 ? 'Las 40' : '20'} en {cante.suit}
                        </span>
                        <span className={`text-sm font-bold ${is40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          +{cante.points}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default GameBoardAI;
