import type { PublicPlayer, PlayerPosition } from '../types/player';

interface PlayerInfoProps {
  player: PublicPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
}

export function PlayerInfo({ player, isCurrentTurn, isMe }: PlayerInfoProps) {
  const isAlly = player.team === 0;

  return (
    <div
      className={`
        min-w-[120px] rounded-xl px-4 py-3 transition-all duration-300
        ${isCurrentTurn 
          ? 'bg-amber-500/90 shadow-lg shadow-amber-500/30' 
          : isAlly 
            ? 'bg-sky-600/80' 
            : 'bg-rose-600/80'
        }
        ${player.connectionStatus !== 'connected' ? 'opacity-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={`
            w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm
            ${isCurrentTurn 
              ? 'bg-black/20 text-black' 
              : 'bg-white/20 text-white'
            }
          `}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Nombre */}
          <div className={`text-sm font-medium truncate ${isCurrentTurn ? 'text-black' : 'text-white'}`}>
            {player.name}
            {isMe && (
              <span className={`text-xs ml-1 ${isCurrentTurn ? 'text-black/60' : 'text-white/60'}`}>(Tú)</span>
            )}
          </div>

          {/* Info */}
          <div className={`text-xs ${isCurrentTurn ? 'text-black/70' : 'text-white/70'}`}>
            {player.cardCount} cartas
            {isCurrentTurn && ' • Jugando'}
          </div>
        </div>

        {/* Host badge */}
        {player.isHost && (
          <span className={`text-xs ${isCurrentTurn ? 'text-black/60' : 'text-amber-300'}`}>★</span>
        )}
      </div>

      {/* Estado de conexión */}
      {player.connectionStatus !== 'connected' && (
        <div className="text-xs text-amber-200 mt-1">
          {player.connectionStatus === 'disconnected' ? '⚠ Desconectado' : '⟳ Reconectando...'}
        </div>
      )}
    </div>
  );
}

interface PlayerPositionsProps {
  players: PublicPlayer[];
  currentPlayerId: string | null;
  myId: string;
  myPosition: PlayerPosition;
}

export function PlayerPositions({ players, currentPlayerId, myId, myPosition }: PlayerPositionsProps) {
  // Ordenar jugadores relativos a mi posición
  const getRelativePosition = (playerPos: PlayerPosition): 'bottom' | 'right' | 'top' | 'left' => {
    const diff = (playerPos - myPosition + 4) % 4;
    switch (diff) {
      case 0: return 'bottom';
      case 1: return 'right';
      case 2: return 'top';
      case 3: return 'left';
      default: return 'bottom';
    }
  };

  const positionClasses = {
    bottom: 'absolute bottom-28 left-1/2 -translate-x-1/2 z-10',
    right: 'absolute right-4 top-1/2 -translate-y-1/2 z-10',
    top: 'absolute top-20 left-1/2 -translate-x-1/2 z-10',
    left: 'absolute left-4 top-1/2 -translate-y-1/2 z-10',
  };

  return (
    <>
      {players.map(player => {
        const relPos = getRelativePosition(player.position);
        // No mostrar el jugador actual en posición bottom (ya tiene su mano visible)
        if (relPos === 'bottom') return null;
        
        return (
          <div key={player.id} className={positionClasses[relPos]}>
            <PlayerInfo
              player={player}
              isCurrentTurn={player.id === currentPlayerId}
              isMe={player.id === myId}
            />
          </div>
        );
      })}
    </>
  );
}

export default PlayerInfo;
