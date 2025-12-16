import { useState, useEffect } from 'react';
import type { Card as CardType } from '../types/card';
import Card from './Card';

interface PlayerHandProps {
  cards: CardType[];
  validCardIds?: string[];
  selectedCardId?: string | null;
  onCardClick?: (card: CardType) => void;
  isCurrentPlayer?: boolean;
  faceUp?: boolean;
  position?: 'bottom' | 'top' | 'left' | 'right';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fanStyle?: boolean;
  dealAnimation?: boolean;
}

export function PlayerHand({
  cards,
  validCardIds = [],
  selectedCardId = null,
  onCardClick,
  isCurrentPlayer = false,
  faceUp = true,
  position = 'bottom',
  size = 'md',
  fanStyle = true,
  dealAnimation = true,
}: PlayerHandProps) {
  const [dealtCards, setDealtCards] = useState<Set<string>>(new Set());
  const [prevCardCount, setPrevCardCount] = useState(0);
  
  // Animación de reparto cuando llegan nuevas cartas
  useEffect(() => {
    if (dealAnimation && cards.length > prevCardCount) {
      // Nuevas cartas - animar entrada una por una
      const newCardIds = cards.map(c => c.id).filter(id => !dealtCards.has(id));
      
      newCardIds.forEach((id, index) => {
        setTimeout(() => {
          setDealtCards(prev => new Set([...prev, id]));
        }, index * 100); // 100ms entre cada carta
      });
    } else if (cards.length < prevCardCount) {
      // Se jugó una carta - actualizar sin animación
      setDealtCards(new Set(cards.map(c => c.id)));
    }
    setPrevCardCount(cards.length);
  }, [cards, dealAnimation, prevCardCount, dealtCards]);

  // Reset cuando cambia completamente la mano (nueva ronda)
  useEffect(() => {
    if (cards.length === 10 && dealtCards.size === 0) {
      // Nueva ronda - animar todas las cartas
      cards.forEach((card, index) => {
        setTimeout(() => {
          setDealtCards(prev => new Set([...prev, card.id]));
        }, index * 80);
      });
    }
  }, [cards.length]);

  const isVertical = position === 'left' || position === 'right';
  const totalCards = cards.length;
  
  // Configuración del abanico
  const fanConfig = {
    xs: { maxAngle: 20, cardSpread: 16, liftOnHover: 10 },
    sm: { maxAngle: 25, cardSpread: 22, liftOnHover: 15 },
    md: { maxAngle: 30, cardSpread: 28, liftOnHover: 20 },
    lg: { maxAngle: 35, cardSpread: 32, liftOnHover: 25 },
  };
  
  const config = fanConfig[size];
  
  // Calcular ángulo y posición para cada carta en el abanico
  const getCardTransform = (index: number, isSelected: boolean, isPlayable: boolean) => {
    if (!fanStyle || isVertical) {
      // Modo lineal para posiciones verticales
      return {
        rotate: isVertical ? (position === 'left' ? 90 : -90) : 0,
        translateY: isSelected ? -30 : isPlayable && isCurrentPlayer ? -10 : 0,
        translateX: 0,
      };
    }
    
    // Modo abanico - calcular posición en arco
    const middleIndex = (totalCards - 1) / 2;
    const offsetFromMiddle = index - middleIndex;
    
    // Ángulo de rotación (cartas del centro más verticales)
    const angle = (offsetFromMiddle / Math.max(totalCards - 1, 1)) * config.maxAngle * 2;
    
    // Desplazamiento vertical (arco - cartas del centro más arriba)
    const normalizedOffset = Math.abs(offsetFromMiddle) / Math.max(middleIndex, 1);
    const arcLift = normalizedOffset * normalizedOffset * 20; // Curva parabólica
    
    // Elevación adicional por selección/jugabilidad
    let liftY = arcLift;
    if (isSelected) {
      liftY = -35;
    } else if (isPlayable && isCurrentPlayer) {
      liftY = arcLift - 12;
    }
    
    return {
      rotate: angle,
      translateY: liftY,
      translateX: offsetFromMiddle * config.cardSpread,
    };
  };

  return (
    <div 
      className="relative flex items-end justify-center"
      style={{ 
        height: size === 'lg' ? '180px' : size === 'md' ? '140px' : '100px',
        perspective: '1000px',
      }}
    >
      {cards.map((card, index) => {
        const isPlayable = isCurrentPlayer && validCardIds.includes(card.id);
        const isSelected = card.id === selectedCardId;
        const canInteract = isPlayable && isCurrentPlayer;
        const isDealt = dealtCards.has(card.id);
        const transform = getCardTransform(index, isSelected, isPlayable);

        return (
          <div
            key={card.id}
            className={`
              absolute transition-all ease-out
              ${canInteract ? 'cursor-pointer' : 'cursor-default'}
              ${isSelected ? 'z-30' : isPlayable ? 'z-20 hover:z-30' : 'z-10'}
              ${isDealt ? 'opacity-100' : 'opacity-0'}
            `}
            style={{
              transitionDuration: isDealt ? '300ms' : '0ms',
              transitionDelay: isDealt ? '0ms' : `${index * 80}ms`,
              transform: isDealt 
                ? `
                    translateX(${transform.translateX}px)
                    translateY(${transform.translateY}px)
                    rotate(${transform.rotate}deg)
                  `
                : `
                    translateX(0px)
                    translateY(-200px)
                    rotate(0deg)
                    scale(0.8)
                  `,
              transformOrigin: 'bottom center',
            }}
            onClick={() => canInteract && onCardClick?.(card)}
          >
            <div 
              className={`
                transition-all duration-200
                ${canInteract ? 'hover:-translate-y-4 hover:scale-110' : ''}
                ${!isPlayable && isCurrentPlayer ? 'opacity-40 grayscale' : ''}
                ${isSelected ? 'scale-110' : ''}
              `}
              style={{
                filter: isSelected 
                  ? 'drop-shadow(0 0 20px rgba(234, 179, 8, 0.8))' 
                  : isPlayable && isCurrentPlayer
                    ? 'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5))'
                    : 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))',
              }}
            >
              <Card
                card={card}
                faceUp={faceUp}
                playable={isPlayable}
                selected={isSelected}
                size={size}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PlayerHand;
