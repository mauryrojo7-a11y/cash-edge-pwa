import { AlertTriangle, CheckCircle2, Layers, UserCheck, Users } from 'lucide-react';
import type { ActionType, MathCalculationResult, TrainingSpot } from '../types/poker';
import { formatBbOrCurrency } from '../engine/pokerMath';
import { MODULE_LABELS } from '../engine/spacedRepetition';
import { PlayingCard } from './PlayingCard';
import { FeedbackPanel } from './FeedbackPanel';
import { ActionThumbBar } from './ActionThumbBar';

interface SpotTrainerViewProps {
  spot: TrainingSpot | null;
  mathResult: MathCalculationResult | null;
  selectedAction: ActionType | null;
  displayInCurrency: boolean;
  leaksOnlyMode: boolean;
  remainingLeaksCount: number;
  onExitLeaksMode: () => void;
  onSelectAction: (action: ActionType) => void;
  onNextSpot: () => void;
}

export function SpotTrainerView({
  spot,
  mathResult,
  selectedAction,
  displayInCurrency,
  leaksOnlyMode,
  remainingLeaksCount,
  onExitLeaksMode,
  onSelectAction,
  onNextSpot,
}: SpotTrainerViewProps) {
  if (!spot || !mathResult) {
    return (
      <div className="mx-auto max-w-md px-3 py-8 animate-fade-slide-up">
        <div className="glass-card rounded-2xl border-emerald-500/40 p-6 text-center space-y-3">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <h2 className="text-base font-extrabold text-emerald-300">
            ¡Cero Leaks Activos en este Régimen!
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Has corregido todos los errores registrados en este régimen con dos aciertos consecutivos.
          </p>
          <button
            type="button"
            onClick={onExitLeaksMode}
            className="mt-2 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-500 px-5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 active:scale-95 transition-all"
          >
            Volver a todos los Spots
          </button>
        </div>
      </div>
    );
  }

  const isLive = spot.regime === 'LIVE_MULTIWAY';
  const hasAnswered = selectedAction !== null;
  const isCorrect = selectedAction === spot.correctAction;
  const { topology, mathInput, blindStructure } = spot;
  const emptyBoardSlots = Math.max(0, 5 - spot.boardCards.length);

  return (
    <>
      <main
        key={spot.id}
        className="mx-auto max-w-md px-3 pt-3 pb-28 space-y-3 animate-fade-slide-up"
      >
        {/* Banner modo solo errores */}
        {leaksOnlyMode && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 px-3 py-2 text-xs backdrop-blur-md">
            <span className="flex items-center gap-1.5 font-bold text-rose-200 tabular-nums">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              Modo Solo Errores ({remainingLeaksCount} leaks activos)
            </span>
            <button
              type="button"
              onClick={onExitLeaksMode}
              className="rounded-lg border border-rose-400/40 px-2.5 py-1 text-[11px] font-bold text-rose-100 hover:bg-rose-500/20 active:scale-95 transition"
            >
              Salir
            </button>
          </div>
        )}

        {/* Cabecera del spot + Badges + Mesa */}
        <section className="glass-card rounded-2xl p-3.5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider border ${
                    isLive
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                      : 'bg-sky-500/15 text-sky-300 border-sky-500/35'
                  }`}
                >
                  {MODULE_LABELS[spot.module]}
                </span>
                <span className="rounded-full border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                  {spot.street}
                </span>
              </div>
              <h1 className="mt-1.5 text-sm font-black text-white leading-snug">
                {spot.title}
              </h1>
            </div>
            <div className="text-right shrink-0">
              <span className="block text-[10px] text-slate-400">{blindStructure.label}</span>
              <span className="font-mono text-xs font-bold tabular-nums text-slate-200">
                Hero: {spot.heroPosition} ({topology.heroRelativePosition})
              </span>
            </div>
          </div>

          {/* Badge refinado en ámbar para TRANSICIÓN (Multiway -> HU) */}
          {topology.isTransitionedToHU && (
            <div
              role="status"
              className="rounded-xl border border-amber-400/50 border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-slate-950/70 p-2.5 space-y-1 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-amber-300">
                  <Layers className="h-3.5 w-3.5 text-amber-400" />
                  TRANSICIÓN (Multiway → HU)
                </span>
                <span className="rounded-full border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-amber-200">
                  Flop {topology.initialFlopPlayers}-way → {topology.transitionStreet ?? spot.street} HU
                </span>
              </div>
              {topology.rangeFilterNote && (
                <p className="text-[11px] leading-snug text-amber-100/90">
                  {topology.rangeFilterNote}
                </p>
              )}
            </div>
          )}

          {/* Indicador multiway / sándwich cuando no es transición */}
          {!topology.isTransitionedToHU &&
            (topology.currentActivePlayers > 2 || topology.heroRelativePosition === 'SANDWICH') && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-200">
                <Users className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="font-bold">{topology.currentActivePlayers}-Way Activos</span>
                <span className="text-amber-300/70">•</span>
                <span>
                  Posición: <strong>{topology.heroRelativePosition}</strong>
                </span>
                <span className="text-amber-300/70">•</span>
                <span className="tabular-nums">
                  Por hablar detrás: <strong>{topology.playersToActBehind}</strong>
                </span>
              </div>
            )}

          {/* Paño de Mesa Estilizado */}
          <div
            className={`relative overflow-hidden rounded-3xl border-2 border-slate-700/70 p-3.5 space-y-3.5 ${
              isLive ? 'felt-live' : 'felt-gg'
            }`}
          >
            {/* Aro interior sutil del paño */}
            <div className="pointer-events-none absolute inset-1.5 rounded-[20px] border border-white/5" />

            {/* Indicador superior limpio: Pozo, Call y SPR */}
            <div className="relative z-10 flex items-center justify-between gap-1.5">
              <div className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1 text-[11px] font-mono tabular-nums">
                <span className="text-slate-400 mr-1">Pozo</span>
                <strong className="text-white">
                  {formatBbOrCurrency(mathInput.currentPot, blindStructure, displayInCurrency)}
                </strong>
              </div>

              <div className="rounded-full border border-amber-500/35 bg-amber-500/10 px-2.5 py-1 text-[11px] font-mono tabular-nums">
                <span className="text-amber-200/80 mr-1">Call</span>
                <strong className="text-amber-300">
                  {formatBbOrCurrency(mathInput.heroCall, blindStructure, displayInCurrency)}
                </strong>
              </div>

              <div className="rounded-full border border-slate-700/80 bg-slate-950/75 px-2.5 py-1 text-[11px] font-mono tabular-nums">
                <span className="text-slate-400 mr-1">SPR</span>
                <strong className={isLive ? 'text-emerald-300' : 'text-sky-300'}>
                  {mathResult.spr.toFixed(2)}
                </strong>
              </div>
            </div>

            {/* Zona Central: Board Comunitario */}
            <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5 py-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {spot.boardCards.length > 0 ? `Board (${spot.street})` : 'Mesa Preflop'}
              </span>

              {spot.boardCards.length > 0 ? (
                <div className="flex items-center justify-center gap-1.5">
                  {spot.boardCards.map((card) => (
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
              ) : (
                <div className="flex items-center justify-center gap-1.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <div
                      key={idx}
                      aria-hidden="true"
                      className="w-10 h-14 rounded-lg border border-dashed border-slate-700/50 bg-slate-950/25"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Zona Inferior: Cartas de Hero en abanico sutil + Stack Efectivo */}
            <div className="relative z-10 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center pl-1 py-1">
                  <PlayingCard
                    card={spot.heroCards[0]}
                    size="lg"
                    className="-rotate-3 origin-bottom-right transition-transform"
                  />
                  <PlayingCard
                    card={spot.heroCards[1]}
                    size="lg"
                    className="-ml-2 rotate-3 origin-bottom-left transition-transform"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Tu Mano
                  </span>
                  <span className="font-mono text-xs font-extrabold text-white">
                    {spot.heroPosition} • {topology.heroRelativePosition}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-wider text-slate-400">
                  Stack Efec.
                </span>
                <span className="font-mono text-sm font-black tabular-nums text-slate-100">
                  {formatBbOrCurrency(mathInput.effectiveStack, blindStructure, displayInCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Perfil del villano */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/65 p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <UserCheck className="h-3.5 w-3.5 text-sky-400" />
                {spot.villain.name} ({spot.villain.position})
              </span>
              <span className="rounded-full border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {spot.villain.archetype}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">{spot.villain.tendencySummary}</p>
            {spot.villain.statsBadge && (
              <span className="inline-block font-mono text-[10px] font-semibold tabular-nums text-sky-300">
                {spot.villain.statsBadge}
              </span>
            )}
          </div>

          {/* Secuencia de acción */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Secuencia de la Mano
            </span>
            <ul className="space-y-1 text-xs text-slate-200">
              {spot.actionHistory.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span
                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      isLive ? 'bg-emerald-400/80' : 'bg-sky-400/80'
                    }`}
                  />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Feedback inmediato tras responder */}
        {hasAnswered && selectedAction && (
          <FeedbackPanel
            isCorrect={isCorrect}
            chosenAction={selectedAction}
            correctAction={spot.correctAction}
            recommendedSizing={spot.recommendedSizing}
            mathResult={mathResult}
            rawEquityPct={mathInput.rawEquityPct}
            blindStructure={blindStructure}
            displayInCurrency={displayInCurrency}
            structuralExplanation={spot.structuralExplanation}
            redTeamAlert={spot.redTeamAlert}
          />
        )}
      </main>

      <ActionThumbBar
        actions={spot.availableActions}
        hasAnswered={hasAnswered}
        regime={spot.regime}
        correctAction={spot.correctAction}
        selectedAction={selectedAction}
        nextLabel="Siguiente Spot"
        onSelectAction={onSelectAction}
        onNext={onNextSpot}
      />
    </>
  );
}
