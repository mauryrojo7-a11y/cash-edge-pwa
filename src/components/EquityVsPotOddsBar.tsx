interface EquityVsPotOddsBarProps {
  potOddsPct: number;
  realizedEquityPct: number;
}

export function EquityVsPotOddsBar({
  potOddsPct,
  realizedEquityPct,
}: EquityVsPotOddsBarProps) {
  const clampedOdds = Math.min(100, Math.max(0, potOddsPct));
  const clampedEq = Math.min(100, Math.max(0, realizedEquityPct));
  const deltaPct = realizedEquityPct - potOddsPct;
  const isPositive = deltaPct >= 0;

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/75 p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-300">Pot Odds vs Eq. Realizada</span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-extrabold tabular-nums ${
            isPositive
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
          }`}
        >
          {isPositive ? '+' : ''}
          {deltaPct.toFixed(1)}% margen
        </span>
      </div>

      {/* Barra horizontal comparativa */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-800/90 ring-1 ring-slate-700/60">
        {/* Relleno de Equity Realizada */}
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isPositive
              ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
              : 'bg-gradient-to-r from-rose-600 to-rose-400'
          }`}
          style={{ width: `${Math.max(2, clampedEq)}%` }}
        />

        {/* Marcador vertical del umbral de Pot Odds requeridas */}
        <div
          title={`Pot Odds requeridas: ${potOddsPct.toFixed(1)}%`}
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.95)]"
          style={{ left: `calc(${clampedOdds}% - 1px)` }}
        />
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums">
        <span className="text-slate-300">
          Requerido (Pot Odds): <strong className="text-white">{potOddsPct.toFixed(1)}%</strong>
        </span>
        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
          Realizada: <strong>{realizedEquityPct.toFixed(1)}%</strong>
        </span>
      </div>
    </div>
  );
}
