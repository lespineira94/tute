import { useState } from 'react';

type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

interface LobbyProps {
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
  onQuickPlay: (playerName: string) => void;
  onStartAIGame?: (playerName: string, difficulty: AIDifficulty) => void;
  isConnecting: boolean;
  error: string | null;
}

export function Lobby({ onCreateRoom, onJoinRoom, onQuickPlay, onStartAIGame, isConnecting, error }: LobbyProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'join' | 'quick' | 'rules'>('select');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const [lockLandscape, setLockLandscape] = useState(() => {
    return localStorage.getItem('lockLandscape') === 'true';
  });

  const toggleLandscapeMode = () => {
    const newValue = !lockLandscape;
    setLockLandscape(newValue);
    localStorage.setItem('lockLandscape', String(newValue));
    document.body.classList.toggle('lock-landscape', newValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    if (mode === 'create') {
      onCreateRoom(playerName.trim());
    } else if (mode === 'join') {
      if (!roomCode.trim()) return;
      onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
    } else if (mode === 'quick') {
      if (onStartAIGame) {
        onStartAIGame(playerName.trim(), difficulty);
      } else {
        onQuickPlay(playerName.trim());
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#050a05]">
      {/* Fondo con gradientes sutiles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-emerald-600/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-green-600/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-500 tracking-tight mb-2">
            TUTE
          </h1>
          <p className="text-emerald-700 text-sm font-medium uppercase tracking-widest">
            Juego de cartas por parejas
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-emerald-950/50 backdrop-blur-xl rounded-2xl border border-emerald-800/50 overflow-hidden">
          
          {mode === 'select' && (
            <div className="p-6 space-y-3">
              <button
                onClick={() => setMode('quick')}
                className="w-full p-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-semibold rounded-xl transition-all flex items-center justify-between group shadow-lg shadow-emerald-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-xl">⚡</span>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Partida Rápida</div>
                    <div className="text-xs text-white/70">Juega contra la IA</div>
                  </div>
                </div>
                <span className="text-white/60 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button
                onClick={() => setMode('create')}
                className="w-full p-4 bg-emerald-900/50 hover:bg-emerald-800/50 text-white rounded-xl transition-all flex items-center justify-between group border border-emerald-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-400 text-xl">+</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Crear Sala</div>
                    <div className="text-xs text-neutral-500">Invita a tus amigos</div>
                  </div>
                </div>
                <span className="text-neutral-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full p-4 bg-emerald-900/50 hover:bg-emerald-800/50 text-white rounded-xl transition-all flex items-center justify-between group border border-emerald-700/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-400 text-xl">#</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">Unirse</div>
                    <div className="text-xs text-neutral-500">Tengo un código</div>
                  </div>
                </div>
                <span className="text-neutral-600 group-hover:translate-x-1 transition-transform">→</span>
              </button>

              <div className="pt-3 border-t border-emerald-800/50 space-y-2">
                <button
                  onClick={() => setMode('rules')}
                  className="w-full p-3 text-emerald-600 hover:text-emerald-400 hover:bg-emerald-900/50 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  <span>📖</span>
                  <span>Cómo jugar</span>
                </button>
                
                {/* Botón para bloquear orientación apaisada */}
                <button
                  onClick={toggleLandscapeMode}
                  className="w-full p-3 text-emerald-600 hover:text-emerald-400 hover:bg-emerald-900/50 rounded-xl transition-all text-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span>📱</span>
                    <span>Modo Apaisado</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full transition-colors ${lockLandscape ? 'bg-emerald-500' : 'bg-neutral-700'} relative`}>
                    <div className={`absolute top-0.5 ${lockLandscape ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full transition-all`} />
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'rules' && (
            <div className="p-6">
              <button
                onClick={() => setMode('select')}
                className="text-emerald-600 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 mb-6"
              >
                <span>←</span> Volver
              </button>

              <h2 className="text-xl font-bold text-white mb-6">Reglas del Tute</h2>

              <div className="space-y-5 text-sm max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                <section>
                  <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center text-xs">1</span>
                    Objetivo
                  </h3>
                  <p className="text-neutral-400 leading-relaxed">
                    Ganar <span className="text-white font-medium">3 rondas</span> antes que el rival. Cada ronda se gana con más de 60 puntos.
                  </p>
                </section>

                <section>
                  <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center text-xs">2</span>
                    Valores
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-emerald-900/40 rounded-lg p-2 text-center border border-emerald-800/50">
                      <div className="text-emerald-400 font-bold">11</div>
                      <div className="text-emerald-600">As</div>
                    </div>
                    <div className="bg-emerald-900/40 rounded-lg p-2 text-center border border-emerald-800/50">
                      <div className="text-emerald-400 font-bold">10</div>
                      <div className="text-emerald-600">Tres</div>
                    </div>
                    <div className="bg-emerald-900/40 rounded-lg p-2 text-center border border-emerald-800/50">
                      <div className="text-emerald-400 font-bold">4</div>
                      <div className="text-emerald-600">Rey</div>
                    </div>
                    <div className="bg-emerald-900/40 rounded-lg p-2 text-center border border-emerald-800/50">
                      <div className="text-emerald-400 font-bold">3</div>
                      <div className="text-emerald-600">Caballo</div>
                    </div>
                    <div className="bg-emerald-900/40 rounded-lg p-2 text-center border border-emerald-800/50">
                      <div className="text-emerald-400 font-bold">2</div>
                      <div className="text-emerald-600">Sota</div>
                    </div>
                    <div className="bg-emerald-900/40 rounded-lg p-2 text-center border border-emerald-800/50">
                      <div className="text-emerald-700 font-bold">0</div>
                      <div className="text-emerald-600">Resto</div>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center text-xs">3</span>
                    Reglas de juego
                  </h3>
                  <ul className="text-emerald-200/70 space-y-1.5 leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      Debes seguir el palo de salida
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      Si no tienes, debes poner triunfo
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      Debes superar la carta ganadora si puedes
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-emerald-400 font-semibold mb-2 flex items-center gap-2">
                    <span className="w-6 h-6 bg-emerald-500/20 rounded flex items-center justify-center text-xs">4</span>
                    Cantes
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="bg-emerald-900/40 rounded-lg p-3 flex justify-between items-center border border-emerald-800/50">
                      <span className="text-emerald-200">Rey + Caballo mismo palo</span>
                      <span className="text-emerald-400 font-bold">+20 pts</span>
                    </div>
                    <div className="bg-emerald-900/40 rounded-lg p-3 flex justify-between items-center border border-emerald-800/50">
                      <span className="text-emerald-200">Rey + Caballo del triunfo</span>
                      <span className="text-green-400 font-bold">+40 pts</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {(mode === 'create' || mode === 'join' || mode === 'quick') && (
            <form onSubmit={handleSubmit} className="p-6">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="text-emerald-600 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 mb-6"
              >
                <span>←</span> Volver
              </button>

              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-emerald-500/20">
                  {mode === 'quick' ? '⚡' : mode === 'create' ? '+' : '#'}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {mode === 'create' ? 'Crear Sala' : mode === 'join' ? 'Unirse' : 'Partida Rápida'}
                  </h2>
                  <p className="text-emerald-600 text-sm">
                    {mode === 'quick' ? 'Contra 3 bots' : mode === 'create' ? 'Genera un código' : 'Introduce el código'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {mode === 'quick' && (
                  <div>
                    <label className="block text-emerald-500 text-xs mb-2 font-medium uppercase tracking-wide">Dificultad</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDifficulty('easy')}
                        className={`p-3 rounded-lg border transition-all ${
                          difficulty === 'easy'
                            ? 'bg-emerald-500/20 border-emerald-500 text-white'
                            : 'bg-emerald-900/20 border-emerald-800/50 text-emerald-600 hover:border-emerald-700'
                        }`}
                      >
                        <div className="font-semibold text-sm">🐥 Fácil</div>
                        <div className="text-xs opacity-70">Principiante</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDifficulty('medium')}
                        className={`p-3 rounded-lg border transition-all ${
                          difficulty === 'medium'
                            ? 'bg-emerald-500/20 border-emerald-500 text-white'
                            : 'bg-emerald-900/20 border-emerald-800/50 text-emerald-600 hover:border-emerald-700'
                        }`}
                      >
                        <div className="font-semibold text-sm">🦅 Medio</div>
                        <div className="text-xs opacity-70">Equilibrado</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDifficulty('hard')}
                        className={`p-3 rounded-lg border transition-all ${
                          difficulty === 'hard'
                            ? 'bg-emerald-500/20 border-emerald-500 text-white'
                            : 'bg-emerald-900/20 border-emerald-800/50 text-emerald-600 hover:border-emerald-700'
                        }`}
                      >
                        <div className="font-semibold text-sm">🦁 Difícil</div>
                        <div className="text-xs opacity-70">Desafiante</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDifficulty('expert')}
                        className={`p-3 rounded-lg border transition-all ${
                          difficulty === 'expert'
                            ? 'bg-emerald-500/20 border-emerald-500 text-white'
                            : 'bg-emerald-900/20 border-emerald-800/50 text-emerald-600 hover:border-emerald-700'
                        }`}
                      >
                        <div className="font-semibold text-sm">🦈 Experto</div>
                        <div className="text-xs opacity-70">Maestro</div>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-emerald-500 text-xs mb-2 font-medium uppercase tracking-wide">Nombre</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Tu nombre"
                    maxLength={20}
                    className="w-full px-4 py-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-500 transition-colors"
                    autoFocus
                  />
                </div>

                {mode === 'join' && (
                  <div>
                    <label className="block text-emerald-500 text-xs mb-2 font-medium uppercase tracking-wide">Código</label>
                    <input
                      type="text"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      placeholder="XXXX"
                      maxLength={6}
                      className="w-full px-4 py-3 bg-emerald-900/30 border border-emerald-700/50 rounded-xl text-white placeholder-emerald-700 focus:outline-none focus:border-emerald-500 text-center text-2xl tracking-[0.3em] font-mono uppercase transition-colors"
                    />
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isConnecting || !playerName.trim() || (mode === 'join' && !roomCode.trim())}
                  className={`
                    w-full py-3.5 font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20
                    ${isConnecting 
                      ? 'bg-emerald-900 text-emerald-600 cursor-wait' 
                      : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isConnecting ? 'Conectando...' : mode === 'quick' ? 'Comenzar' : mode === 'create' ? 'Crear' : 'Unirse'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-emerald-800 text-xs">
          Baraja española • 4 jugadores • Parejas
        </p>
      </div>
    </div>
  );
}

export default Lobby;
