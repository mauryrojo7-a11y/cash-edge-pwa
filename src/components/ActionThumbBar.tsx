import { ArrowRight } from 'lucide-react';
import type { ActionType, GameRegime } from '../types/poker';

interface ActionThumbBarProps {
  actions: readonly ActionType[];
  hasAnswered: boolean;
  regime?: GameRegime;
  correctAction?: ActionType;
  selectedAction?: ActionType | null;
  disabledAction?: boolean;
  nextLabel?: string;
  onSelectAction: (action: ActionType) => void;
  onNext: () => void;
}

function getActionStyle(action: ActionType, regime: GameRegime): string {
  switch (action) {
    case 'Fold':
      return 'border-slate-700/90 bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white';
    case 'Check':
      return 'border-slate-600/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700';
    case 'Call':
      return regime === 'LIVE_MULTIWAY'
        ? 'border-emerald-500/55 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30 shadow-md shadow-emerald-950/30'
        : 'border-sky-500/55 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30 shadow-md shadow-sky-950/30';
    case 'Bet':
      return 'border-sky-400/55 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30';
    case 'Raise':
    case 'Squeeze':
      return 'border-amber-400/60 bg-gradient-to-b from-amber-500/25 to-amber-600/20 text-amber-100 hover:from-amber-500/35 hover:to-amber-600/30';
    case 'All-in':
      return 'border-rose-400/75 bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-lg shadow-rose-600/25 hover:from-rose-500 hover:to-red-500';
  }
}

export function ActionThumbBar({
  actions,
  hasAnswered,
  regime = 'LIVE_MULTIWAY',
  correctAction,
  selectedAction,
  disabledAction = false,
  nextLabel = 'Siguiente Spot',
  onSelectAction,
  onNext,
}: ActionThumbBarProps) {
  const gridColsClass =
    actions.length <= 2
      ? 'grid-cols-2'
      : actions.length === 3
        ? 'grid-cols-3'
        : 'grid-cols-4';

  const isLive = regime === 'LIVE_MULTIWAY';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-lg pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md px-3 pt-2.5">
        {hasAnswered ? (
          <button
            type="button"
            onClick={onNext}
            className={`flex w-full min-h-[50px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black tracking-tight shadow-lg active:scale-95 transition-all ${
              isLive
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-300'
                : 'bg-gradient-to-r from-sky-500 to-indigo-400 text-slate-950 shadow-sky-500/25 hover:from-sky-400 hover:to-indigo-300'
            }`}
          >
            {nextLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <div className={`grid gap-2 ${gridColsClass}`}>
            {actions.map((action) => {
              const isSelected = selectedAction === action;
              const isCorrectHint = hasAnswered && correctAction === action;
              return (
                <button
                  key={action}
                  type="button"
                  disabled={disabledAction}
                  onClick={() => onSelectAction(action)}
                  className={`min-h-[50px] rounded-2xl border px-2 text-xs sm:text-sm font-extrabold tracking-tight active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed ${getActionStyle(
                    action,
                    regime
                  )} ${isSelected || isCorrectHint ? 'ring-2 ring-white' : ''}`}
                >
                  {action}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
