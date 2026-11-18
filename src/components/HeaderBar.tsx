import {
  AlertTriangle,
  Calculator,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Target,
} from 'lucide-react';
import type { GameRegime } from '../types/poker';

export type AppView = 'spots' | 'blitz' | 'leaks';

interface HeaderBarProps {
  regime: GameRegime;
  onChangeRegime: (regime: GameRegime) => void;
  activeView: AppView;
  onChangeView: (view: AppView) => void;
  displayInCurrency: boolean;
  onToggleCurrency: () => void;
  secondsRemaining: number;
  isTimerRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  streakDays: number;
  activeLeaksCount: number;
}

function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function HeaderBar({
  regime,
  onChangeRegime,
  activeView,
  onChangeView,
  displayInCurrency,
  onToggleCurrency,
  secondsRemaining,
  isTimerRunning,
  onToggleTimer,
  onResetTimer,
  streakDays,
  activeLeaksCount,
}: HeaderBarProps) {
  const isLive = regime === 'LIVE_MULTIWAY';
  const sessionCompleted = secondsRemaining === 0;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#070b14]/85 backdrop-blur-xl pt-safe">
      <div className="mx-auto max-w-md px-3 py-2 space-y-2">
        {/* Fila 1: Marca, Racha, Badge Temporizador 15:00 y Toggle BB/$ */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-black tracking-tight text-white">
              CASH
              <span className={isLive ? 'text-emerald-400' : 'text-sky-400'}>EDGE</span>
            </span>
            <span
              title="Racha diaria"
              className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-amber-300"
            >
              <Flame className="h-3 w-3 text-amber-400" />
              {streakDays}d
            </span>
          </div>

          {/* Temporizador Sesión 15:00 como badge interactivo */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleTimer}
              aria-label={isTimerRunning ? 'Pausar sesión de 15 minutos' : 'Iniciar sesión de 15 minutos'}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition active:scale-95 ${
                sessionCompleted
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : isTimerRunning
                    ? isLive
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                      : 'border-sky-500/40 bg-sky-500/10 text-sky-200'
                    : 'border-slate-700/80 bg-slate-900/90 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {isTimerRunning && !sessionCompleted && (
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                      isLive ? 'bg-emerald-400' : 'bg-sky-400'
                    }`}
                  />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    sessionCompleted
                      ? 'bg-emerald-400'
                      : isTimerRunning
                        ? isLive
                          ? 'bg-emerald-400'
                          : 'bg-sky-400'
                        : 'bg-slate-500'
                  }`}
                />
              </span>

              <span className="font-mono text-xs font-extrabold tabular-nums">
                {sessionCompleted ? '15:00 OK' : formatTimer(secondsRemaining)}
              </span>

              {isTimerRunning ? (
                <Pause className="h-3 w-3 opacity-80" />
              ) : (
                <Play className="h-3 w-3 opacity-80" />
              )}
            </button>

            <button
              type="button"
              onClick={onResetTimer}
              aria-label="Reiniciar temporizador 15:00"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-800 bg-slate-900/90 text-slate-400 hover:border-slate-600 hover:text-white active:scale-95 transition"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleCurrency}
            aria-label="Cambiar unidad entre Big Blinds y moneda"
            className="rounded-full border border-slate-700/80 bg-slate-900/90 px-2.5 py-1 font-mono text-[11px] font-extrabold tabular-nums text-slate-200 hover:border-slate-500 active:scale-95 transition"
          >
            {displayInCurrency ? (isLive ? 'ARS' : 'USD') : 'BB'}
          </button>
        </div>

        {/* Fila 2: Interruptor segmentado tipo pill */}
        <div
          role="group"
          aria-label="Selector de régimen"
          className="grid grid-cols-2 gap-1 rounded-full border border-slate-800/90 bg-slate-950/90 p-1 shadow-inner"
        >
          <button
            type="button"
            onClick={() => onChangeRegime('LIVE_MULTIWAY')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              isLive
                ? 'bg-gradient-to-r from-emerald-500/25 to-emerald-500/15 text-emerald-200 border border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            Vivo (Multiway)
          </button>
          <button
            type="button"
            onClick={() => onChangeRegime('GGPOKER_HIGH_RAKE')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
              !isLive
                ? 'bg-gradient-to-r from-sky-500/25 to-indigo-500/20 text-sky-200 border border-sky-500/50 shadow-sm shadow-sky-500/10'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            GGPoker (6-Max)
          </button>
        </div>

        {/* Fila 3: Navegación por 3 vistas */}
        <nav aria-label="Vistas principales" className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeView('spots')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold border transition-all ${
              activeView === 'spots'
                ? 'border-slate-600/80 bg-slate-800/90 text-white shadow-sm'
                : 'border-transparent bg-slate-900/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="h-3.5 w-3.5" />
            Spots
          </button>
          <button
            type="button"
            onClick={() => onChangeView('blitz')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold border transition-all ${
              activeView === 'blitz'
                ? 'border-slate-600/80 bg-slate-800/90 text-white shadow-sm'
                : 'border-transparent bg-slate-900/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            Blitz Math
          </button>
          <button
            type="button"
            onClick={() => onChangeView('leaks')}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-bold border transition-all ${
              activeView === 'leaks'
                ? 'border-slate-600/80 bg-slate-800/90 text-white shadow-sm'
                : 'border-transparent bg-slate-900/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Leaks
            {activeLeaksCount > 0 && (
              <span className="rounded-full bg-rose-500/25 border border-rose-500/40 px-1.5 py-0.2 font-mono text-[10px] font-extrabold tabular-nums text-rose-300">
                {activeLeaksCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
