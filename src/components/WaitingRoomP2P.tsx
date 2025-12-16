import type { PeerGameState } from '../types';

interface WaitingRoomP2PProps {
  roomCode: string;
  isHost: boolean;
  gameState: PeerGameState;
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export function WaitingRoomP2P({
  roomCode,
  isHost,
  gameState,
  onStartGame,
  onLeaveRoom,
}: WaitingRoomP2PProps) {
  const playerCount = gameState.players.length;
  const canStart = isHost && playerCount === 4;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050a05]">
      {/* Fondo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-green-600/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Código de sala */}
        <div className="text-center mb-8">
          <div className="inline-block bg-emerald-950/50 backdrop-blur-xl rounded-2xl border border-emerald-800/50 px-8 py-6">
            <p className="text-emerald-600 text-sm font-medium mb-2">Código de Sala P2P</p>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500 tracking-wider font-mono">
              {roomCode}
            </div>
            <p className="text-emerald-700 text-xs mt-3">
              Comparte este código con tus amigos
            </p>
          </div>
        </div>

        {/* Card de sala */}
        <div className="bg-emerald-950/50 backdrop-blur-xl rounded-2xl border border-emerald-800/50 overflow-hidden mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {isHost ? '👑 Sala de Espera' : '🎮 Sala de Espera'}
                </h2>
                <p className="text-emerald-600 text-sm mt-1">
                  {isHost ? 'Eres el anfitrión' : 'Esperando al anfitrión...'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-emerald-400">
                  {playerCount}/4
                </div>
                <p className="text-emerald-700 text-xs">jugadores</p>
              </div>
            </div>

            {/* Lista de jugadores */}
            <div className="space-y-2 mb-6">
              {gameState.players.map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 bg-emerald-900/30 rounded-xl border border-emerald-800/50"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-white flex items-center gap-2">
                      {player.name}
                      {player.id === gameState.hostId && (
                        <span className="text-yellow-400 text-sm">👑</span>
                      )}
                    </div>
                    <div className="text-xs text-emerald-600">
                      {idx === 0 || idx === 2 ? 'Equipo 1' : 'Equipo 2'} • Posición {idx + 1}
                    </div>
                  </div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                </div>
              ))}

              {/* Slots vacíos */}
              {[...Array(4 - playerCount)].map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className="flex items-center gap-3 p-3 bg-emerald-900/10 rounded-xl border border-emerald-800/30 border-dashed"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center">
                    <span className="text-emerald-800 text-xl">?</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-emerald-800">Esperando jugador...</div>
                    <div className="text-xs text-emerald-900">
                      {playerCount + idx === 0 || playerCount + idx === 2 ? 'Equipo 1' : 'Equipo 2'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Información */}
            <div className="bg-emerald-900/20 rounded-xl p-4 border border-emerald-800/30">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <p className="text-emerald-400 text-sm font-medium mb-1">
                    Conexión P2P directa
                  </p>
                  <p className="text-emerald-700 text-xs leading-relaxed">
                    Los jugadores se conectan directamente entre sí sin servidor.
                    {playerCount < 4 && ' Se necesitan 4 jugadores para comenzar.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="border-t border-emerald-800/50 p-4 flex gap-3">
            <button
              onClick={onLeaveRoom}
              className="flex-1 py-3 bg-emerald-900/50 hover:bg-emerald-800/50 text-white rounded-xl transition-all font-medium border border-emerald-800/50"
            >
              Salir
            </button>
            
            {isHost && (
              <button
                onClick={onStartGame}
                disabled={!canStart}
                className={`
                  flex-1 py-3 font-semibold rounded-xl transition-all shadow-lg
                  ${canStart
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-emerald-500/20'
                    : 'bg-emerald-900/30 text-emerald-800 cursor-not-allowed'
                  }
                `}
              >
                {canStart ? '🎮 Iniciar Partida' : `Esperando jugadores (${playerCount}/4)`}
              </button>
            )}
          </div>
        </div>

        {/* Nota técnica */}
        <p className="text-center text-emerald-900 text-xs">
          Conexión peer-to-peer • Sin servidor central • Privado
        </p>
      </div>
    </div>
  );
}

export default WaitingRoomP2P;
