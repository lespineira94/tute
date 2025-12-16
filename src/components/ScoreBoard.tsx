import type { TeamScore as TypedTeamScore } from '../types/game';

// Tipo flexible para manejar diferentes formatos del servidor
interface FlexibleScore {
  roundPoints?: number;
  roundsWon?: number;
  points?: number;
  games?: number;
  cantes?: any[];
}

interface ScoreBoardProps {
  scores: [TypedTeamScore, TypedTeamScore] | { 1: FlexibleScore; 2: FlexibleScore } | FlexibleScore[];
  targetRounds: number;
  myTeam?: 0 | 1;
}

const TEAM_COLORS = [
  { bg: 'bg-sky-500/20', border: 'border-sky-500/30', dot: 'bg-sky-400', text: 'text-sky-400' },
  { bg: 'bg-rose-500/20', border: 'border-rose-500/30', dot: 'bg-rose-400', text: 'text-rose-400' },
];

export function ScoreBoard({ scores, targetRounds, myTeam }: ScoreBoardProps) {
  // Normalizar scores a un array
  const scoreArray: FlexibleScore[] = Array.isArray(scores)
    ? scores
    : [
        (scores as { 1: FlexibleScore; 2: FlexibleScore })[1] || { points: 0, games: 0 },
        (scores as { 1: FlexibleScore; 2: FlexibleScore })[2] || { points: 0, games: 0 },
      ];

  // Función helper para obtener puntos
  const getPoints = (score: FlexibleScore) => score.roundPoints ?? score.points ?? 0;
  const getRoundsWon = (score: FlexibleScore) => score.roundsWon ?? score.games ?? 0;

  return (
    <div className="bg-neutral-900/90 backdrop-blur rounded-xl p-3 border border-neutral-800 min-w-[180px]">
      <div className="text-neutral-500 text-[10px] uppercase tracking-wider mb-3">Marcador</div>
      
      <div className="space-y-2">
        {scoreArray.map((score, index) => {
          const colors = TEAM_COLORS[index];
          const isMyTeam = myTeam === index;
          
          return (
            <div
              key={index}
              className={`
                rounded-lg p-2.5 border transition-all
                ${isMyTeam 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : `${colors.bg} ${colors.border}`
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isMyTeam ? 'bg-emerald-400' : colors.dot}`} />
                  <span className={`text-sm font-medium ${isMyTeam ? 'text-emerald-300' : 'text-neutral-300'}`}>
                    Equipo {index + 1}
                  </span>
                  {isMyTeam && (
                    <span className="text-[10px] text-emerald-500 bg-emerald-500/20 px-1.5 py-0.5 rounded">TÚ</span>
                  )}
                </div>
                <span className="text-lg font-bold text-white">{getPoints(score)}</span>
              </div>
              
              {/* Rondas ganadas */}
              <div className="flex gap-1.5 justify-end">
                {Array(targetRounds).fill(0).map((_, i) => (
                  <div
                    key={i}
                    className={`
                      w-3 h-3 rounded-full transition-all
                      ${i < getRoundsWon(score) 
                        ? (isMyTeam ? 'bg-emerald-400' : colors.dot)
                        : 'bg-neutral-700'}
                    `}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cantes de la ronda */}
      {scoreArray.some(s => s.cantes && s.cantes.length > 0) && (
        <div className="mt-3 pt-3 border-t border-neutral-800">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-2">Cantes</div>
          <div className="space-y-1">
            {scoreArray.flatMap((score, teamIndex) => 
              (score.cantes || []).map((cante: any, i: number) => (
                <div 
                  key={`${teamIndex}-${i}`} 
                  className="flex justify-between items-center text-xs"
                >
                  <span className="text-neutral-400">Equipo {teamIndex + 1}</span>
                  <span className={
                    cante.type === 'tute' 
                      ? 'text-amber-400 font-bold bg-amber-400/20 px-2 py-0.5 rounded' 
                      : 'text-neutral-300'
                  }>
                    {cante.type === 'tute' ? '¡TUTE!' : cante.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ScoreBoard;
