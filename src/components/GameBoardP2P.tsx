import { useState, useEffect, useMemo } from 'react';
import { Card } from './Card';
import { TrumpIndicator } from './TrumpIndicator';
import { getValidCards } from '../hooks/useAIGame';
import type { Card as CardType, Suit } from '../types/card';
import type { PeerGameState } from '../types/peer';

interface GameBoardP2PProps {
  gameState: PeerGameState;
  myPlayerId: string;
  myHand: CardType[];
  onPlayCard: (card: CardType) => void;
  onExit: () => void;
}

// Posiciones relativas: 0 = yo (abajo), 1 = derecha, 2 = enfrente, 3 = izquierda
const POSITION_STYLES = {
  0: 'bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2',
  1: 'right-1 sm:right-4 top-[40%] sm:top-1/2 -translate-y-1/2',
  2: 'top-2 sm:top-4 left-1/2 -translate-x-1/2',
  3: 'left-1 sm:left-4 top-[40%] sm:top-1/2 -translate-y-1/2',
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

export function GameBoardP2P({ gameState, myPlayerId, myHand, onPlayCard, onExit }: GameBoardP2PProps) {
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [dealtCards, setDealtCards] = useState<Set<string>>(new Set());
  const [prevHandSize, setPrevHandSize] = useState(0);
  const [animatingCards, setAnimatingCards] = useState<Set<string>>(new Set());
  const [prevTrickLength, setPrevTrickLength] = useState(0);

  // Encontrar mi jugador y posición
  const myPlayer = gameState.players.find(p => p.id === myPlayerId);
  const myPosition = myPlayer?.position ?? 0;
  const myTeam = myPlayer?.team ?? 1;

  // Verificar si es mi turno
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const isProcessing = false; // En P2P no hay procesamiento de IA

  // Ordenar cartas por palo y valor
  const sortedHand = useMemo(() =>
    sortCards(myHand, gameState.trumpSuit as Suit),
    [myHand, gameState.trumpSuit]
  );

  // Animación de reparto de cartas
  useEffect(() => {
    const currentHandSize = myHand.length;

    if (currentHandSize > prevHandSize || (currentHandSize === 10 && dealtCards.size === 0)) {
      const cardIds = myHand.map(c => c.id);
      const newCards = cardIds.filter(id => !dealtCards.has(id));

      newCards.forEach((id, index) => {
        setTimeout(() => {
          setDealtCards(prev => new Set([...prev, id]));
        }, index * 100);
      });
    } else if (currentHandSize < prevHandSize) {
      setDealtCards(new Set(myHand.map(c => c.id)));
    }

    setPrevHandSize(currentHandSize);
  }, [myHand, prevHandSize]);

  // Reset al cambiar de ronda
  useEffect(() => {
    if (gameState.roundNumber > 0 && myHand.length === 10 && dealtCards.size !== 10) {
      setDealtCards(new Set());
    }
  }, [gameState.roundNumber, myHand.length]);

  // Animación de cartas entrando al tapete
  useEffect(() => {
    const currentTrickLength = gameState.currentTrick.length;

    if (currentTrickLength > prevTrickLength) {
      const newCard = gameState.currentTrick[currentTrickLength - 1];
      if (newCard) {
        setAnimatingCards(prev => new Set([...prev, newCard.card.id]));
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
      setAnimatingCards(new Set());
    }

    setPrevTrickLength(currentTrickLength);
  }, [gameState.currentTrick.length, prevTrickLength, gameState.currentTrick]);

  // Obtener cartas válidas para jugar
  const validCardIds = useMemo(() => {
    if (!isMyTurn || isProcessing) return new Set<string>();
    const validCards = getValidCards(
      myHand,
      gameState.currentTrick as any,
      gameState.trumpSuit as Suit
    );
    return new Set(validCards.map(c => c.id));
  }, [isMyTurn, isProcessing, myHand, gameState.currentTrick, gameState.trumpSuit]);

  // Calcular posición en abanico
  const getCardTransform = (index: number, total: number, isSelected: boolean, isValid: boolean) => {
    const middleIndex = (total - 1) / 2;
    const offsetFromMiddle = index - middleIndex;

    const maxAngle = 30;
    const angle = (offsetFromMiddle / Math.max(total - 1, 1)) * maxAngle * 2;

    const spreadX = window.innerWidth < 640 ? 18 : 38;
    const translateX = offsetFromMiddle * spreadX;

    const normalizedOffset = Math.abs(offsetFromMiddle) / Math.max(middleIndex, 1);
    const arcLift = normalizedOffset * normalizedOffset * (window.innerWidth < 640 ? 15 : 25);

    let translateY = arcLift;
    if (isSelected) {
      translateY = window.innerWidth < 640 ? -25 : -40;
    } else if (isValid && isMyTurn) {
      translateY = arcLift - (window.innerWidth < 640 ? 8 : 15);
    }

    return { angle, translateX, translateY };
  };

  // Obtener posición relativa de un jugador
  const getRelativePosition = (playerPosition: number): 0 | 1 | 2 | 3 => {
    return ((playerPosition - myPosition + 4) % 4) as 0 | 1 | 2 | 3;
  };

  // Manejar click en carta
  const handleCardClick = (card: CardType) => {
    if (!isMyTurn || isProcessing) return;
    if (!validCardIds.has(card.id)) return;

    if (selectedCard === card.id) {
      onPlayCard(card);
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

  const trickToShow = gameState.currentTrick;

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f0a] relative overflow-hidden">
      {/* Fondo con gradientes sutiles */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-900/20 rounded-full blur-3xl" />
      </div>

      {/* Mesa de juego central */}
      <div className="absolute top-[45%] sm:top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div className="w-[280px] h-[200px] sm:w-[400px] sm:h-[280px] lg:w-[560px] lg:h-[380px] bg-gradient-to-br from-emerald-800/40 to-green-900/50 rounded-[50px] sm:rounded-[80px] lg:rounded-[100px] border-2 border-emerald-600/30 shadow-[0_0_60px_rgba(16,185,129,0.15),inset_0_2px_40px_rgba(0,0,0,0.3)]" />
      </div>

      {/* Área principal del juego */}
      <div className="flex-1 relative p-4">
        {/* Jugadores en sus posiciones */}
        {gameState.players.map((player) => {
          const relPos = getRelativePosition(player.position);
          if (relPos === 0) return null;

          const isCurrent = gameState.currentPlayerIndex === player.position;
          const isAlly = player.team === myTeam;

          return (
            <div
              key={player.id}
              className={`absolute ${POSITION_STYLES[relPos]} z-10`}
            >
              <div className={`
                backdrop-blur-md rounded-xl sm:rounded-2xl px-2 py-1.5 sm:px-4 sm:py-3 min-w-[90px] sm:min-w-[140px] transition-all duration-300 border
                ${isCurrent
                  ? 'bg-emerald-500/90 border-emerald-400/50 shadow-lg shadow-emerald-500/30'
                  : isAlly
                    ? 'bg-emerald-500/20 border-emerald-500/30'
                    : 'bg-emerald-900/40 border-emerald-700/30'
                }
              `}>
                <div className="flex items-center gap-1.5 sm:gap-3">
                  <div className={`
                    w-7 h-7 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center text-sm sm:text-lg relative
                    ${isCurrent ? 'bg-black/20' : isAlly ? 'bg-emerald-500/30' : 'bg-emerald-800/40'}
                  `}>
                    👤
                  </div>
                  <div>
                    <div className={`font-semibold text-xs sm:text-sm ${isCurrent ? 'text-black' : 'text-white'}`}>
                      {player.name}
                    </div>
                    <div className={`text-[10px] sm:text-xs ${isCurrent ? 'text-black/60' : 'text-white/50'}`}>
                      {player.cardCount} cartas
                      {isCurrent && (
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
            <div className="relative w-28 sm:w-40 lg:w-48 h-20 sm:h-28 lg:h-32">
              {trickToShow.map((played, idx) => {
                const relPos = getRelativePosition(played.position);
                const isAnimating = animatingCards.has(played.card.id);
                const isWinningCard = gameState.currentTrickWinner === played.position && trickToShow.length === 4;

                const positions = {
                  0: { x: 0, y: 30, rotate: 0 },
                  1: { x: 40, y: 0, rotate: 8 },
                  2: { x: 0, y: -30, rotate: 0 },
                  3: { x: -40, y: 0, rotate: -8 },
                };

                const pos = positions[relPos];

                const startPositions = {
                  0: { x: 0, y: 200 },
                  1: { x: 200, y: 0 },
                  2: { x: 0, y: -200 },
                  3: { x: -200, y: 0 },
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
                        : `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) rotate(${pos.rotate}deg) scale(${isWinningCard ? 1.4 : 1.2})`,
                      transitionDuration: '400ms',
                      transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    <Card card={played.card} size="md" />
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

        {/* Panel superior izquierdo - Marcador */}
        <div className="absolute top-2 sm:top-4 left-2 sm:left-4 z-20">
          <div className="bg-neutral-900/90 backdrop-blur-md rounded-xl sm:rounded-2xl p-2 sm:p-4 border border-neutral-800 min-w-[100px] sm:min-w-[160px]">
            <div className="text-neutral-500 text-[8px] sm:text-[10px] uppercase tracking-wider mb-1 sm:mb-3">Ronda {gameState.roundNumber}</div>

            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-emerald-400">{gameState.scores.find(s => s.team === myTeam)?.roundPoints ?? 0}</div>
                <div className="text-[8px] sm:text-[10px] text-neutral-500 uppercase">Nos</div>
              </div>
              <div className="text-neutral-600 text-base sm:text-xl font-light">:</div>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold text-rose-400">{gameState.scores.find(s => s.team !== myTeam)?.roundPoints ?? 0}</div>
                <div className="text-[8px] sm:text-[10px] text-neutral-500 uppercase">Ellos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Triunfo */}
        <div className="absolute top-1 sm:top-4 right-1 sm:right-4 z-20">
          <div className="scale-75 sm:scale-100 origin-top-right">
            <TrumpIndicator
              trumpSuit={gameState.trumpSuit as any}
              trumpCard={null}
            />
          </div>
        </div>

        {/* Indicador de turno */}
        {isMyTurn && !isProcessing && (
          <div className="absolute top-[42%] sm:top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold px-3 py-1.5 sm:px-6 sm:py-2.5 rounded-full shadow-xl shadow-emerald-500/40 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-base">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/50 rounded-full animate-ping" />
              <span className="hidden sm:inline">¡Tu turno!</span>
              <span className="sm:hidden">Turno</span>
            </div>
          </div>
        )}

        {/* Botón salir */}
        <button
          onClick={onExit}
          className="absolute bottom-1 sm:bottom-4 right-1 sm:right-4 px-2 py-1.5 sm:px-4 sm:py-2.5 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-md sm:rounded-xl text-[10px] sm:text-sm z-20 transition-all border border-neutral-800 backdrop-blur-md flex items-center gap-1 sm:gap-2"
        >
          <span>←</span>
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>

      {/* Mi mano de cartas - en abanico realista */}
      <div className="bg-gradient-to-t from-neutral-950 via-neutral-900/80 to-transparent pt-0 sm:pt-2 pb-2 sm:pb-8 relative z-10">
        <div className="max-w-4xl mx-auto px-1 sm:px-2">
          <div
            className="relative flex items-end justify-center"
            style={{ height: window.innerWidth < 640 ? 'clamp(80px, 18vh, 120px)' : 'clamp(120px, 25vh, 200px)', perspective: '1000px' }}
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
                    <Card card={card} size="xs" className="sm:hidden" playable={canInteract} selected={isSelected} />
                    <Card card={card} size="lg" className="hidden sm:block" playable={canInteract} selected={isSelected} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instrucciones */}
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
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-neutral-500 rounded-full" />
                  <span>Turno de {gameState.players.find(p => p.position === gameState.currentPlayerIndex)?.name}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GameBoardP2P;
