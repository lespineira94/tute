import type { Suit } from '../types/card';
import { SUIT_NAMES } from '../constants/cards';
import Card from './Card';
import type { Card as CardType } from '../types/card';

interface TrumpIndicatorProps {
  trumpSuit: Suit | null;
  trumpCard?: CardType | null;
}

const SUIT_COLORS: Record<Suit, string> = {
  oros: '#f59e0b',
  copas: '#ef4444',
  espadas: '#3b82f6',
  bastos: '#22c55e',
};

export function TrumpIndicator({ trumpSuit, trumpCard }: TrumpIndicatorProps) {
  if (!trumpSuit) return null;

  const color = SUIT_COLORS[trumpSuit];

  return (
    <div className="bg-neutral-900/90 backdrop-blur rounded-xl p-3 border border-neutral-800">
      <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-2">Triunfo</div>
      
      {trumpCard ? (
        <div className="flex flex-col items-center gap-2">
          <Card card={trumpCard} size="sm" faceUp={true} />
          <div 
            className="text-xs font-semibold px-2 py-0.5 rounded"
            style={{ color, backgroundColor: `${color}20` }}
          >
            {SUIT_NAMES[trumpSuit]}
          </div>
        </div>
      ) : (
        <div 
          className="text-sm font-bold px-3 py-2 rounded-lg text-center"
          style={{ color, backgroundColor: `${color}15` }}
        >
          {SUIT_NAMES[trumpSuit]}
        </div>
      )}
    </div>
  );
}

export default TrumpIndicator;
