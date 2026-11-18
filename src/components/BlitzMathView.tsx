import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Layers, XCircle, Zap } from 'lucide-react';
import type {
  ActionType,
  GameRegime,
  ProceduralMathDrill,
  TrainingProgressState,
} from '../types/poker';
import { formatBbOrCurrency } from '../engine/pokerMath';
import { PlayingCard } from './PlayingCard';
import { ActionThumbBar } from './ActionThumbBar';
import { EquityVsPotOddsBar } from './EquityVsPotOddsBar';

interface BlitzMathViewProps {
  regime: GameRegime;
  drill: ProceduralMathDrill;
  displayInCurrency: boolean;
  progressState: TrainingProgressState;
  onCompleteDrill: (
    isEvCorrect: boolean,
    isPotOddsCorrect: boolean,
    responseMs: number
  ) => void;
  onNextDrill: () => void;
}

export function BlitzMathView({
  regime,
  drill,
  displayInCurrency,
  progressState,
  onCompleteDrill,
  onNextDrill,
}: BlitzMathViewProps) {
  const [selectedPotOdds, setSelectedPotOdds] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<'Call' | 'Fold' | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number>(() => Date.now());
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // Reiniciar cronómetro y selecciones cuando cambia el drill
  useEffect(() => {
    setSelectedPotOdds(null);
    setSelectedAction(null);
    const now = Date.now();
    setStartedAtMs(now);
    setElapsedMs(0);
  }, [drill.id]);

  // Cronómetro en vivo hasta responder
  useEffect(() => {
    if (selectedAction !== null) return undefined;
    const timerId = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtMs);
    }, 100);
    return () => window.clearInterval(timerId);
  }, [startedAtMs, selectedAction]);

  const isLive = regime === 'LIVE_MULTIWAY';
  const hasAnswered = selectedAction !== null;
  const blitzStat = progressState.blitzStats[regime];
  const { mathInput, mathResult, blindStructure } = drill;
  const emptyBoardSlots = Math.max(0, 5 - drill.boardCards.length);

  const handleActionSelect = (action: ActionType) => {
    if (hasAnswered || selectedPotOdds === null) return;
    if (action !== 'Call' && action !== 'Fold') return;

    const finalElapsed = Date.now() - startedAtMs;
    setElapsedMs(finalElapsed);
    setSelectedAction(action);

    const isEvCorrect = action === drill.correctAction;
    const isPotOddsCorrect = Math.abs(selectedPotOdds - drill.correctPotOddsPct) < 0.05;
    onCompleteDrill(isEvCorrect, isPotOddsCorrect, finalElapsed);
  };

  const isEvCorrect = selectedAction === drill.correctAction;
  const isPotOddsCorrect =
    selectedPotOdds !== null && Math.abs(selectedPotOdds - drill.correctPotOddsPct) < 0.05;

  const evPrefix = mathResult.evCall >= 0 ? '+' : '-';
  const evDisplay = `${evPrefix}${formatBbOrCurrency(
    Math.abs(mathResult.evCall),
    blindStructure,
    displayInCurrency
  )}`;

  return (
    <>
      <main
        key={drill.id}
        className="mx-auto max-w-md px-3 pt-3 pb-28 space-y-3 animate-fade-slide-up"
      >
        {/* Cabecera Blitz Math con cronómetro tabular y racha */}
        <section className="glass-card flex items-center justify-between rounded-2xl px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <div>
              <p className="text-xs font-black text-white">Blitz Math Infinito</p>
              <p className="text-[11px] text-slate-400">{drill.categoryLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <span className="block text-[10px] text-slate-400">Racha</span>
              <span className="font-mono text-xs font-extrabold tabular-nums text-emerald-400">
                {blitzStat.currentStreak} (Best {blitzStat.bestStreak})
              </span>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 font-mono text-xs font-extrabold tabular-nums text-amber-300">
              <Clock className="h-3.5 w-3.5" />
              {(elapsedMs / 1000).toFixed(1)}s
            </div>
          </div>
        </section>

        {/* Tarjeta del escenario procedural + Paño de Mesa */}
        <section className="glass-card rounded-2xl p-3.5 space-y-3">
          {mathInput.topology.isTransitionedToHU && (
            <div className="rounded-xl border border-amber-400/50 border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-slate-950/70 p-2.5 text-[11px] text-amber-200">
              <div className="flex items-center gap-1.5 font-extrabold text-amber-300">
                <Layers className="h-3.5 w-3.5" />
                TRANSICIÓN (Multiway → HU en {mathInput.topology.transitionStreet})
              </div>
              {mathInput.topology.rangeFilterNote && (
                <p className="mt-0.5 text-amber-100/90">{mathInput.topology.rangeFilterNote}</p>
              )}
            </div>
          )}

          <p className="text-xs leading-relaxed text-slate-200">{drill.scenarioPrompt}</p>

          {/* Paño de Mesa */}
          <div
            className={`relative overflow-hidden rounded-3xl border-2 border-slate-700/70 p-3 space-y-3 ${
              isLive ? 'felt-live' : 'felt-gg'
            }`}
          >
            <div className="pointer-events-none absolute inset-1.5 rounded-[20px] border border-white/5" />

            {/* Pills superiores: Pozo, Call, Equity Bruta y SPR */}
            <div className="relative z-10 flex items-center justify-between gap-1 text-[11px] font-mono tabular-nums">
              <span className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-0.5">
                <span className="text-slate-400 mr-1">Pozo</span>
                <strong className="text-white">
                  {formatBbOrCurrency(mathInput.currentPot, blindStructure, displayInCurrency)}
                </strong>
              </span>
              <span className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-0.5">
                <span className="text-amber-200/80 mr-1">Call</span>
                <strong className="text-amber-300">
                  {formatBbOrCurrency(mathInput.heroCall, blindStructure, displayInCurrency)}
                </strong>
              </span>
              <span className="rounded-full border border-sky-500/35 bg-sky-500/10 px-2.5 py-0.5">
                <span className="text-sky-200/80 mr-1">Eq.</span>
                <strong className="text-sky-300">{mathInput.rawEquityPct.toFixed(0)}%</strong>
              </span>
            </div>

            {/* Cartas: Hero en abanico + Board */}
            <div className="relative z-10 flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center pl-1">
                <PlayingCard
                  card={drill.heroCards[0]}
                  size="md"
                  className="-rotate-3 origin-bottom-right"
                />
                <PlayingCard
                  card={drill.heroCards[1]}
                  size="md"
                  className="-ml-2 rotate-3 origin-bottom-left"
                />
              </div>

              <div className="flex items-center gap-1">
                {drill.boardCards.map((card) => (
                  <PlayingCard key={card} card={card} size="sm" />
                ))}
                {Array.from({ length: emptyBoardSlots }).map((_, idx) => (
                  <div
                    key={idx}
                    aria-hidden="true"
                    className="w-10 h-14 rounded-lg border border-dashed border-slate-700/70 bg-slate-950/35"
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 tabular-nums">
            <span>
              Activos: <strong className="text-slate-200">{mathInput.topology.currentActivePlayers}</strong>
            </span>
            <span>
              Posición: <strong className="text-slate-200">{mathInput.topology.heroRelativePosition}</strong>
            </span>
            <span>
              Detrás: <strong className="text-slate-200">{mathInput.topology.playersToActBehind}</strong>
            </span>
            <span>
              SPR: <strong className="text-slate-200">{mathResult.spr.toFixed(1)}</strong>
            </span>
          </div>
        </section>

        {/* Paso 1: Selección de Pot Odds (%) */}
        <section className="glass-card rounded-2xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
              1. Calcula las Pot Odds Exactas
            </h2>
            <span className="text-[10px] text-slate-400">Incluye tu call en el pozo final</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {drill.potOddsOptionsPct.map((opt) => {
              const isSelected = selectedPotOdds === opt;
              const isRightOption = Math.abs(opt - drill.correctPotOddsPct) < 0.05;

              let buttonClass =
                'border-slate-700/80 bg-slate-950/85 text-slate-200 hover:border-slate-500';
              if (hasAnswered) {
                if (isRightOption) {
                  buttonClass = 'border-emerald-500 bg-emerald-500/20 text-emerald-200';
                } else if (isSelected) {
                  buttonClass = 'border-rose-500 bg-rose-500/20 text-rose-200';
                } else {
                  buttonClass = 'border-slate-800 bg-slate-950/50 text-slate-500';
                }
              } else if (isSelected) {
                buttonClass = 'border-sky-400 bg-sky-500/20 text-sky-100 ring-1 ring-sky-400';
              }

              return (
                <button
                  key={opt}
                  type="button"
                  disabled={hasAnswered}
                  onClick={() => setSelectedPotOdds(opt)}
                  className={`min-h-[50px] rounded-xl border font-mono text-sm font-extrabold tabular-nums active:scale-95 transition-all ${buttonClass}`}
                >
                  {opt.toFixed(1)}%
                </button>
              );
            })}
          </div>

          {!hasAnswered && (
            <p className="text-[11px] text-slate-400 text-center tabular-nums">
              {selectedPotOdds === null
                ? 'Selecciona una Pot Odds arriba para habilitar Call / Fold abajo.'
                : `Pot Odds marcada: ${selectedPotOdds.toFixed(1)}%. Ahora elige Call o Fold abajo.`}
            </p>
          )}
        </section>

        {/* Feedback Blitz Math tras responder */}
        {hasAnswered && (
          <section className="animate-fade-slide-up glass-card rounded-2xl p-3.5 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`rounded-xl border p-2.5 ${
                  isPotOddsCorrect
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-rose-500/40 bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold tabular-nums">
                  {isPotOddsCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span className={isPotOddsCorrect ? 'text-emerald-300' : 'text-rose-300'}>
                    Pot Odds: {drill.correctPotOddsPct.toFixed(1)}%
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] tabular-nums text-slate-300">
                  {mathInput.heroCall} / {mathResult.finalPot} BB = {mathResult.potOddsPct.toFixed(2)}%
                </p>
              </div>

              <div
                className={`rounded-xl border p-2.5 ${
                  isEvCorrect
                    ? 'border-emerald-500/40 bg-emerald-500/10'
                    : 'border-rose-500/40 bg-rose-500/10'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-extrabold">
                  {isEvCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400" />
                  )}
                  <span className={isEvCorrect ? 'text-emerald-300' : 'text-rose-300'}>
                    Decisión: {drill.correctAction}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] tabular-nums text-slate-300">
                  EV: {evDisplay} ({(elapsedMs / 1000).toFixed(1)}s)
                </p>
              </div>
            </div>

            {/* Barra comparativa horizontal */}
            <EquityVsPotOddsBar
              potOddsPct={mathResult.potOddsPct}
              realizedEquityPct={mathResult.realizedEquityPct}
            />

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] rounded-xl border border-slate-800/80 bg-slate-950/75 p-2.5">
              <div>
                <span className="block text-[10px] text-slate-400">Eq. Realizada</span>
                <span className="font-mono font-extrabold tabular-nums text-slate-100">
                  {mathResult.realizedEquityPct.toFixed(1)}%
                </span>
                <span className="block font-mono text-[10px] tabular-nums text-slate-500">
                  EQR {mathResult.eqrFactor.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">MDF Efectiva</span>
                <span className="font-mono font-extrabold tabular-nums text-amber-300">
                  {mathResult.effectiveMdfPct.toFixed(1)}%
                </span>
                <span className="block font-mono text-[10px] tabular-nums text-slate-500">
                  HU: {mathResult.mdfHeadsUpPct.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400">SPR</span>
                <span className="font-mono font-extrabold tabular-nums text-sky-300">
                  {mathResult.spr.toFixed(2)}
                </span>
                <span className="block font-mono text-[10px] tabular-nums text-slate-500">
                  {mathResult.defenderCount} def.
                </span>
              </div>
            </div>
          </section>
        )}
      </main>

      <ActionThumbBar
        actions={['Fold', 'Call']}
        hasAnswered={hasAnswered}
        regime={regime}
        correctAction={drill.correctAction}
        selectedAction={selectedAction}
        disabledAction={selectedPotOdds === null}
        nextLabel="Siguiente Cálculo"
        onSelectAction={handleActionSelect}
        onNext={onNextDrill}
      />
    </>
  );
}
