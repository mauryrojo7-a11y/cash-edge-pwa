import { CheckCircle2, ShieldAlert, TrendingUp, XCircle } from 'lucide-react';
import type { ActionType, BlindStructure, MathCalculationResult, SprZone } from '../types/poker';
import { formatBbOrCurrency } from '../engine/pokerMath';
import { EquityVsPotOddsBar } from './EquityVsPotOddsBar';

interface FeedbackPanelProps {
  isCorrect: boolean;
  chosenAction: ActionType;
  correctAction: ActionType;
  recommendedSizing: string | null;
  mathResult: MathCalculationResult;
  rawEquityPct: number;
  blindStructure: BlindStructure;
  displayInCurrency: boolean;
  structuralExplanation: string;
  redTeamAlert: string;
}

const SPR_LABELS: Record<SprZone, { label: string; colorClass: string }> = {
  COMMITTED_LOW_SPR: {
    label: 'COMMITTED_LOW_SPR (≤ 3.5)',
    colorClass: 'text-emerald-400',
  },
  MEDIUM_SPR_CAUTION: {
    label: 'MEDIUM_SPR_CAUTION (3.5–8.0)',
    colorClass: 'text-amber-400',
  },
  DEEP_SPR_NUTS_ONLY: {
    label: 'DEEP_SPR_NUTS_ONLY (≥ 8.0)',
    colorClass: 'text-sky-400',
  },
};

export function FeedbackPanel({
  isCorrect,
  chosenAction,
  correctAction,
  recommendedSizing,
  mathResult,
  rawEquityPct,
  blindStructure,
  displayInCurrency,
  structuralExplanation,
  redTeamAlert,
}: FeedbackPanelProps) {
  const sprMeta = SPR_LABELS[mathResult.sprZone];
  const evPrefix = mathResult.evCall >= 0 ? '+' : '-';
  const evFormatted = `${evPrefix}${formatBbOrCurrency(
    Math.abs(mathResult.evCall),
    blindStructure,
    displayInCurrency
  )}`;

  const isMultiway = mathResult.defenderCount > 1;

  return (
    <section
      aria-label="Feedback matemático y estructural"
      className="animate-fade-slide-up glass-card space-y-3 rounded-2xl p-3.5"
    >
      {/* Veredicto inmediato */}
      <div
        className={`flex items-start justify-between gap-2 rounded-xl border p-3 ${
          isCorrect
            ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5'
            : 'border-rose-500/40 bg-gradient-to-r from-rose-500/15 to-rose-500/5'
        }`}
      >
        <div className="flex items-start gap-2.5">
          {isCorrect ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
          )}
          <div>
            <p className={`text-sm font-extrabold ${isCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isCorrect ? 'Decisión Correcta (+EV)' : `Leak Detectado — Elegiste ${chosenAction}`}
            </p>
            <p className="text-xs text-slate-200 mt-0.5">
              Línea óptima: <strong className="text-white">{correctAction}</strong>
              {recommendedSizing ? (
                <span className="ml-1 font-semibold text-emerald-300">({recommendedSizing})</span>
              ) : null}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">
            EV del Call
          </span>
          <span
            className={`font-mono text-sm font-extrabold tabular-nums ${
              mathResult.isPositiveEvCall ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {evFormatted}
          </span>
        </div>
      </div>

      {/* Barra comparativa horizontal instantánea */}
      <EquityVsPotOddsBar
        potOddsPct={mathResult.potOddsPct}
        realizedEquityPct={mathResult.realizedEquityPct}
      />

      {/* Cuadrícula de métricas matemáticas exactas */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-2.5">
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">
            Desglose Equity
          </span>
          <div className="mt-1 flex items-baseline justify-between gap-1 font-mono tabular-nums">
            <span className="font-bold text-slate-200">{rawEquityPct.toFixed(0)}% bruta</span>
            <span className="text-slate-500">×</span>
            <span className="font-extrabold text-sky-300">
              {mathResult.eqrFactor.toFixed(2)} EQR
            </span>
          </div>
          <p className="mt-1 text-[10px] font-mono tabular-nums text-slate-400">
            Final: {mathResult.realizedEquityPct.toFixed(1)}% vs {mathResult.potOddsPct.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-2.5">
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">
            MDF HU vs Multiway
          </span>
          <div className="mt-1 flex items-baseline justify-between gap-1 font-mono tabular-nums">
            <span className="font-bold text-slate-300">{mathResult.mdfHeadsUpPct.toFixed(1)}%</span>
            <span className="text-slate-500">→</span>
            <span className={`font-extrabold ${isMultiway ? 'text-amber-400' : 'text-sky-400'}`}>
              {mathResult.effectiveMdfPct.toFixed(1)}%
            </span>
          </div>
          <p className="mt-1 text-[10px] text-slate-400">
            {isMultiway
              ? `Colapso entre ${mathResult.defenderCount} defensores`
              : '1 defensor (100% sobre Hero)'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-2.5">
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">
            SPR Efectivo
          </span>
          <p className="mt-1 font-mono text-sm font-extrabold tabular-nums text-slate-100">
            {mathResult.spr.toFixed(2)}
          </p>
          <p className={`mt-0.5 text-[10px] font-semibold ${sprMeta.colorClass}`}>
            {sprMeta.label}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-2.5">
          <span className="block text-[10px] uppercase tracking-wider text-slate-400">
            Ratio Bluff rival óptimo
          </span>
          <p className="mt-1 font-mono text-sm font-extrabold tabular-nums text-slate-100">
            {mathResult.optimalBluffPct.toFixed(1)}% bluffs
          </p>
          <p className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-400">
            {mathResult.bluffsPerValueCombo.toFixed(2)} bluffs / combo valor
          </p>
        </div>
      </div>

      {/* Explicación Estructural */}
      <div className="rounded-xl border border-slate-800/80 bg-slate-950/65 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          Explicación Estructural
        </div>
        <p className="text-xs leading-relaxed text-slate-300">{structuralExplanation}</p>
      </div>

      {/* Auditoría Red-Team con borde lateral diferenciado */}
      <div className="rounded-xl border border-amber-500/30 border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-500/12 via-amber-500/5 to-slate-950/85 p-3">
        <div className="mb-1 flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          Auditoría Red-Team (Inversión de EV)
        </div>
        <p className="text-xs leading-relaxed text-amber-100/90">{redTeamAlert}</p>
      </div>
    </section>
  );
}
