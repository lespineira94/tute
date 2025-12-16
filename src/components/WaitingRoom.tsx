import type { PublicPlayer } from '../types/player';
import type { Room } from '../types/room';

interface WaitingRoomProps {
  room: Room;
  playerId: string;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function WaitingRoom({ room, playerId, onStartGame, onLeaveRoom }: WaitingRoomProps) {
  const isHost = room.hostId === playerId;
  const canStart = room.players.length === 4;

  // Organizar jugadores por equipo
  const team1Players = room.players.filter(p => p.position % 2 === 0);
  const team2Players = room.players.filter(p => p.position % 2 === 1);
  const emptyTeam1Slots = 2 - team1Players.length;
  const emptyTeam2Slots = 2 - team2Players.length;

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0f0a]">
      {/* Fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Código de sala */}
        <div className="text-center mb-8">
          <p className="text-emerald-600 text-xs uppercase tracking-widest mb-3">Código de sala</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-mono font-black text-emerald-400 tracking-[0.2em]">
              {room.code}
            </span>
            <button
              onClick={copyCode}
              className="p-2 bg-emerald-800/50 hover:bg-emerald-700/50 rounded-lg transition-all border border-emerald-700/50"
              title="Copiar"
            >
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Card principal */}
        <div className="bg-emerald-950/50 backdrop-blur-xl rounded-2xl border border-emerald-800/50 p-6">
          {/* Equipos */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Equipo 1 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-600 text-xs uppercase tracking-wide">Equipo 1</span>
              </div>
              <div className="space-y-2">
                {team1Players.map(player => (
                  <PlayerSlot key={player.id} player={player} isMe={player.id === playerId} />
                ))}
                {Array(emptyTeam1Slots).fill(0).map((_, i) => (
                  <EmptySlot key={`empty-1-${i}`} />
                ))}
              </div>
            </div>

            {/* Equipo 2 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-teal-600 text-xs uppercase tracking-wide">Equipo 2</span>
              </div>
              <div className="space-y-2">
                {team2Players.map(player => (
                  <PlayerSlot key={player.id} player={player} isMe={player.id === playerId} />
                ))}
                {Array(emptyTeam2Slots).fill(0).map((_, i) => (
                  <EmptySlot key={`empty-2-${i}`} />
                ))}
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center justify-center gap-2 py-3 mb-4">
            <div className="flex -space-x-1">
              {[0,1,2,3].map(i => (
                <div 
                  key={i}
                  className={`w-3 h-3 rounded-full border-2 border-emerald-950 ${
                    i < room.players.length ? 'bg-emerald-500' : 'bg-emerald-900'
                  }`}
                />
              ))}
            </div>
            <span className="text-emerald-600 text-sm">
              {room.players.length}/4 jugadores
            </span>
          </div>

          {/* Botones */}
          <div className="space-y-2">
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`
                  w-full py-3 font-semibold rounded-xl transition-all
                  ${canStart
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-emerald-900/50 text-emerald-700 cursor-not-allowed'
                  }
                `}
              >
                {canStart ? 'Comenzar partida' : 'Esperando jugadores...'}
              </button>
            ) : (
              <div className="py-3 text-center text-emerald-600 text-sm">
                Esperando al anfitrión...
              </div>
            )}

            <button
              onClick={onLeaveRoom}
              className="w-full py-2.5 text-emerald-700 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all text-sm"
            >
              Salir de la sala
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerSlot({ player, isMe }: { player: PublicPlayer; isMe: boolean }) {
  return (
    <div className={`
      rounded-xl p-3 transition-all
      ${isMe ? 'bg-emerald-500/20 border border-emerald-500/40' : 'bg-emerald-900/30 border border-emerald-800/50'}
    `}>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-800/50 flex items-center justify-center text-sm font-bold text-emerald-300">
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${isMe ? 'text-emerald-400' : 'text-emerald-200'}`}>
            {player.name}
            {isMe && <span className="text-xs opacity-60 ml-1">(tú)</span>}
          </p>
          {player.isHost && (
            <p className="text-xs text-green-400">Host</p>
          )}
        </div>
        <div className={`w-2 h-2 rounded-full ${
          player.connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-yellow-500 animate-pulse'
        }`} />
      </div>
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="border border-dashed border-emerald-800/50 rounded-xl p-3 flex items-center justify-center h-14">
      <span className="text-emerald-800 text-sm">Vacío</span>
    </div>
  );
}

export default WaitingRoom;
