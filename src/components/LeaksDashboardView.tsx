import { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Flame,
  RotateCcw,
  Target,
  Zap,
} from 'lucide-react';
import type { GameRegime, TrainingProgressState, TrainingSpot } from '../types/poker';
import {
  getActiveLeaks,
  getModuleSummaries,
  getRegimeAccuracyPct,
  MODULE_LABELS,
} from '../engine/spacedRepetition';

interface LeaksDashboardViewProps {
  regime: GameRegime;
  spots: readonly TrainingSpot[];
  progressState: TrainingProgressState;
  onTrainLeaksOnly: () => void;
  onTrainAllSpots: () => void;
  onResetProgress: () => void;
}

export function LeaksDashboardView({
  regime,
  spots,
  progressState,
  onTrainLeaksOnly,
  onTrainAllSpots,
  onResetProgress,
}: LeaksDashboardViewProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  const isLive = regime === 'LIVE_MULTIWAY';
  const regimeAccuracy = getRegimeAccuracyPct(progressState, regime);
  const moduleSummaries = getModuleSummaries(progressState, regime);
  const activeLeaks = getActiveLeaks(spots, regime, progressState);
  const blitzStat = progressState.blitzStats[regime];
  const avgBlitzSec =
    blitzStat.attempts > 0 ? blitzStat.totalResponseMs / blitzStat.attempts / 1000 : null;
  const blitzEvPct =
    blitzStat.attempts > 0 ? Math.round((blitzStat.correctEv / blitzStat.attempts) * 100) : null;
  const blitzOddsPct =
    blitzStat.attempts > 0
      ? Math.round((blitzStat.correctPotOdds / blitzStat.attempts) * 100)
      : null;

  return (
    <main className="mx-auto max-w-md px-3 pt-3 pb-10 space-y-3 animate-fade-slide-up">
      {/* Tarjetas de Resumen */}
      <section className="grid grid-cols-3 gap-2">
        <div className="glass-card rounded-2xl p-3 text-center">
          <Flame className="mx-auto h-5 w-5 text-amber-400" />
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-white">
            {progressState.streakDays}d
          </p>
          <span className="text-[10px] text-slate-400">Racha Diaria</span>
        </div>

        <div className="glass-card rounded-2xl p-3 text-center">
          <Target
            className={`mx-auto h-5 w-5 ${isLive ? 'text-emerald-400' : 'text-sky-400'}`}
          />
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-white">
            {regimeAccuracy !== null ? `${regimeAccuracy}%` : '—'}
          </p>
          <span className="text-[10px] text-slate-400">Precisión Spots</span>
        </div>

        <div className="glass-card rounded-2xl p-3 text-center">
          <AlertTriangle
            className={`mx-auto h-5 w-5 ${
              activeLeaks.length > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          />
          <p className="mt-1 font-mono text-lg font-black tabular-nums text-white">
            {activeLeaks.length}
          </p>
          <span className="text-[10px] text-slate-400">Leaks Activos</span>
        </div>
      </section>

      {/* Botón CTA principal: Entrenar solo errores */}
      <section className="glass-card rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-white">
              Cola Inteligente de Errores (Leaks)
            </h2>
            <p className="text-[11px] text-slate-400">
              {activeLeaks.length > 0
                ? 'Repite tus spots fallados hasta lograr 2 aciertos seguidos en cada uno.'
                : 'No tienes leaks pendientes en este régimen. Sigue practicando spots o Blitz Math.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            disabled={activeLeaks.length === 0}
            onClick={onTrainLeaksOnly}
            className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 px-4 text-sm font-black text-white shadow-lg shadow-rose-500/20 hover:from-rose-500 hover:to-red-400 active:scale-95 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:shadow-none transition-all"
          >
            <AlertTriangle className="h-4 w-4" />
            Entrenar solo errores ({activeLeaks.length})
          </button>

          {activeLeaks.length === 0 && (
            <button
              type="button"
              onClick={onTrainAllSpots}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 text-xs font-extrabold text-emerald-300 hover:bg-emerald-500/25 active:scale-95 transition-all"
            >
              <Award className="h-4 w-4" />
              Ir a Spots del Régimen
            </button>
          )}
        </div>
      </section>

      {/* Precisión por Módulo del Régimen Activo */}
      <section className="glass-card rounded-2xl p-3.5 space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
          Rendimiento por Módulo ({isLive ? 'Modo Vivo' : 'Modo GGPoker'})
        </h2>
        <div className="space-y-2.5">
          {moduleSummaries.map((mod) => {
            const pct = mod.accuracyPct ?? 0;
            return (
              <div key={mod.module} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{mod.label}</span>
                  <span className="font-mono tabular-nums text-slate-300">
                    {mod.attempts > 0
                      ? `${mod.correct}/${mod.attempts} (${pct}%)`
                      : 'Sin intentos'}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/50">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      mod.attempts === 0
                        ? 'bg-slate-700'
                        : pct >= 75
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                          : pct >= 50
                            ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                            : 'bg-gradient-to-r from-rose-600 to-rose-400'
                    }`}
                    style={{ width: `${mod.attempts === 0 ? 0 : Math.max(6, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Métricas de Blitz Math */}
      <section className="glass-card rounded-2xl p-3.5 space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-300">
          <Zap className="h-4 w-4 text-amber-400" />
          Blitz Math ({isLive ? 'Vivo' : 'GGPoker'})
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-2">
            <span className="block text-[10px] text-slate-400">Pot Odds OK</span>
            <span className="font-mono text-sm font-extrabold tabular-nums text-slate-100">
              {blitzOddsPct !== null ? `${blitzOddsPct}%` : '—'}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-2">
            <span className="block text-[10px] text-slate-400">Call/Fold EV</span>
            <span className="font-mono text-sm font-extrabold tabular-nums text-emerald-400">
              {blitzEvPct !== null ? `${blitzEvPct}%` : '—'}
            </span>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-2">
            <span className="block text-[10px] text-slate-400">Tiempo Medio</span>
            <span className="font-mono text-sm font-extrabold tabular-nums text-amber-300">
              {avgBlitzSec !== null ? `${avgBlitzSec.toFixed(1)}s` : '—'}
            </span>
          </div>
        </div>
      </section>

      {/* Detalle de Leaks Pendientes */}
      {activeLeaks.length > 0 && (
        <section className="glass-card rounded-2xl p-3.5 space-y-2">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-rose-300">
            Spots Marcados como Leak
          </h2>
          <ul className="space-y-1.5">
            {activeLeaks.map((leakSpot) => {
              const record = progressState.spotRecords[leakSpot.id];
              return (
                <li
                  key={leakSpot.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-950/75 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-100">{leakSpot.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {MODULE_LABELS[leakSpot.module]}
                    </p>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[10px] tabular-nums">
                    <span className="block font-bold text-rose-400">
                      {record?.mistakeCount ?? 1} fallo(s)
                    </span>
                    <span className="text-slate-400">
                      {record?.consecutiveCorrect ?? 0}/2 para limpiar
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Reinicio seguro de estadísticas */}
      <div className="pt-1 text-center">
        {!confirmReset ? (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-300 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reiniciar estadísticas locales
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs">
            <span className="text-rose-200">¿Borrar historial?</span>
            <button
              type="button"
              onClick={() => {
                onResetProgress();
                setConfirmReset(false);
              }}
              className="rounded-lg bg-rose-500 px-2.5 py-1 font-bold text-white active:scale-95 transition"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 active:scale-95 transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
