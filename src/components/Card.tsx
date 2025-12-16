import type { Card as CardType } from '../types/card';

interface CardProps {
  card: CardType;
  faceUp?: boolean;
  playable?: boolean;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

// Dimensiones de las cartas según tamaño (manteniendo proporción 185:275 de los PNGs)
const SIZES = {
  sm: { width: 54, height: 80 },
  md: { width: 74, height: 110 },
  lg: { width: 111, height: 165 },
};

export function Card({
  card,
  faceUp = true,
  playable = false,
  selected = false,
  size = 'md',
  onClick,
  className = '',
}: CardProps) {
  const dimensions = SIZES[size];
  
  // Obtener el número de la carta (soportar tanto 'number' como 'value')
  const cardNumber = (card as any).number ?? (card as any).value ?? 1;
  
  // Construir la ruta de la imagen
  const imagePath = faceUp 
    ? `/cards/${card.suit}-${cardNumber}.png`
    : '/cards/back.png';

  return (
    <div
      onClick={playable ? onClick : undefined}
      className={`
        relative transition-all duration-200 group
        ${playable ? 'cursor-pointer hover:scale-110 hover:-translate-y-3' : 'cursor-default'}
        ${selected ? '-translate-y-4 scale-105' : ''}
        ${className}
      `}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        filter: selected 
          ? 'drop-shadow(0 0 12px rgba(234, 179, 8, 0.8)) drop-shadow(0 8px 16px rgba(0, 0, 0, 0.4))' 
          : playable 
            ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
            : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
      }}
    >
      <img
        src={imagePath}
        alt={faceUp ? `${cardNumber} de ${card.suit}` : 'Carta boca abajo'}
        className="w-full h-full object-contain select-none"
        draggable={false}
        loading="lazy"
      />
      
      {/* Overlay de brillo cuando es jugable y hover */}
      {playable && (
        <div 
          className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.2) 100%)',
          }}
        />
      )}
      
      {/* Borde de selección */}
      {selected && (
        <div 
          className="absolute inset-0 rounded-lg pointer-events-none border-4 border-yellow-400"
          style={{
            boxShadow: 'inset 0 0 15px rgba(234, 179, 8, 0.3)',
          }}
        />
      )}
    </div>
  );
}

export default Card;
