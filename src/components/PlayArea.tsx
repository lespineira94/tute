import type { PlayedCard } from '../types/game';
import type { PublicPlayer, PlayerPosition } from '../types/player';
import Card from './Card';

interface PlayAreaProps {
  currentTrick: PlayedCard[];
  players: PublicPlayer[];
  currentPlayerId: string | null;
}

// Mapeo de posición del jugador a posición visual en la mesa
const POSITION_STYLES: Record<PlayerPosition, { top?: string; bottom?: string; left?: string; right?: string; transform?: string }> = {
  0: { bottom: '0', left: '50%', transform: 'translateX(-50%)' },
  1: { right: '0', top: '50%', transform: 'translateY(-50%)' },
  2: { top: '0', left: '50%', transform: 'translateX(-50%)' },
  3: { left: '0', top: '50%', transform: 'translateY(-50%)' },
};

export function PlayArea({ currentTrick, players }: PlayAreaProps) {
  // Crear mapa de playerId a posición
  const playerPositions = new Map(players.map(p => [p.id, p.position]));

  return (
    <div className="relative w-56 h-40">
      {/* Cartas jugadas en la baza actual */}
      {currentTrick.map((playedCard, idx) => {
        const position = playerPositions.get(playedCard.playerId);
        if (position === undefined) return null;

        const style = POSITION_STYLES[position];
        
        return (
          <div
            key={playedCard.card.id}
            className="absolute transition-all duration-500 ease-out"
            style={{
              ...style,
              // Ajustar para que las cartas queden más centradas
              ...(position === 0 && { bottom: '15%' }),
              ...(position === 1 && { right: '15%' }),
              ...(position === 2 && { top: '15%' }),
              ...(position === 3 && { left: '15%' }),
              zIndex: idx + 1,
            }}
          >
            <Card 
              card={playedCard.card} 
              size="md" 
              faceUp={true}
            />
          </div>
        );
      })}

      {/* Indicador vacío */}
      {currentTrick.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-emerald-500/30 text-4xl">🃏</span>
        </div>
      )}
    </div>
  );
}

export default PlayArea;
