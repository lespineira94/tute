import type { CanteType } from '../types/game';
import type { Suit } from '../types/card';
import { SUIT_NAMES } from '../constants/cards';
import { useState, useEffect } from 'react';

const SUIT_COLORS: Record<Suit, string> = {
  oros: '#f59e0b',
  copas: '#ef4444',
  espadas: '#3b82f6',
  bastos: '#22c55e',
};

interface CanteAnnouncementProps {
  announcement: {
    type: CanteType;
    playerName: string;
    suit: Suit;
  } | null;
  onDismiss?: () => void;
}

export function CanteAnnouncement({ announcement, onDismiss }: CanteAnnouncementProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (announcement) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [announcement, onDismiss]);

  if (!announcement || !visible) return null;

  const isTute = announcement.type === 'tute';
  const color = SUIT_COLORS[announcement.suit];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
      <div
        className={`
          transform transition-all duration-500
          ${visible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}
      >
        <div
          className={`
            px-10 py-8 rounded-2xl shadow-2xl text-center backdrop-blur-xl border
            ${isTute 
              ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-400/50' 
              : 'bg-neutral-900/95 border-neutral-700/50'}
          `}
          style={!isTute ? { boxShadow: `0 0 60px ${color}30` } : undefined}
        >
          {isTute ? (
            <>
              <div className="text-6xl font-black mb-3 text-black animate-pulse">¡TUTE!</div>
              <div className="text-xl text-black/80 font-medium">{announcement.playerName}</div>
              <div className="text-sm text-black/60 mt-1">¡Gana la ronda!</div>
            </>
          ) : (
            <>
              <div 
                className="text-5xl font-black mb-3"
                style={{ color }}
              >
                ¡{announcement.type}!
              </div>
              <div className="text-lg text-white font-medium">{announcement.playerName}</div>
              <div 
                className="text-sm mt-2 px-3 py-1 rounded-full inline-block"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {SUIT_NAMES[announcement.suit]}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface CanteDialogProps {
  availableCantes: Array<{ type: '20' | '40'; suit: Suit }>;
  onDeclare: (type: '20' | '40', suit: Suit) => void;
  onSkip: () => void;
}

export function CanteDialog({ availableCantes, onDeclare, onSkip }: CanteDialogProps) {
  if (availableCantes.length === 0) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 rounded-2xl p-6 shadow-2xl max-w-sm border border-neutral-800">
        <h3 className="text-xl font-bold text-white mb-5 text-center">
          ¿Quieres cantar?
        </h3>

        <div className="space-y-2.5 mb-5">
          {availableCantes.map(({ type, suit }) => {
            const color = SUIT_COLORS[suit];
            return (
              <button
                key={`${type}-${suit}`}
                onClick={() => onDeclare(type, suit)}
                className={`
                  w-full py-3.5 px-4 rounded-xl font-bold text-lg
                  transition-all hover:scale-[1.02] active:scale-[0.98]
                  ${type === '40' 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-lg shadow-amber-500/25' 
                    : 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'}
                `}
              >
                <span className="mr-2">{type}</span>
                <span 
                  className="px-2 py-0.5 rounded text-sm"
                  style={{ 
                    color: type === '40' ? 'black' : color,
                    backgroundColor: type === '40' ? 'rgba(0,0,0,0.15)' : `${color}20`
                  }}
                >
                  {SUIT_NAMES[suit]}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={onSkip}
          className="w-full py-2.5 px-4 rounded-xl bg-neutral-800/50 text-neutral-500 hover:bg-neutral-800 hover:text-neutral-400 transition-all border border-neutral-800"
        >
          No cantar
        </button>
      </div>
    </div>
  );
}

export default CanteAnnouncement;
