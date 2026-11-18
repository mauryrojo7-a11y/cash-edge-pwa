import type { CardCode, Suit } from '../types/poker';

interface PlayingCardProps {
  card: CardCode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SUIT_STYLES: Record<
  Suit,
  {
    symbol: string;
    textClass: string;
    label: string;
  }
> = {
  s: {
    symbol: '♠',
    textClass: 'text-slate-900',
    label: 'Picas',
  },
  h: {
    symbol: '♥',
    textClass: 'text-rose-600',
    label: 'Corazones',
  },
  d: {
    symbol: '♦',
    textClass: 'text-blue-600',
    label: 'Diamantes',
  },
  c: {
    symbol: '♣',
    textClass: 'text-emerald-600',
    label: 'Tréboles',
  },
};

// Proporción física de naipe 5:7
const SIZE_CLASSES: Record<
  'sm' | 'md' | 'lg',
  { frame: string; cornerRank: string; cornerSuit: string; centerSuit: string }
> = {
  sm: {
    frame: 'w-10 h-14 rounded-lg px-1 py-0.5',
    cornerRank: 'text-[12px]',
    cornerSuit: 'text-[9px]',
    centerSuit: 'text-[22px]',
  },
  md: {
    frame: 'w-[50px] h-[70px] rounded-xl px-1.5 py-1',
    cornerRank: 'text-[15px]',
    cornerSuit: 'text-[10px]',
    centerSuit: 'text-[26px]',
  },
  lg: {
    frame: 'w-[58px] h-[81px] rounded-xl px-1.5 py-1',
    cornerRank: 'text-[17px]',
    cornerSuit: 'text-[11px]',
    centerSuit: 'text-[30px]',
  },
};

export function PlayingCard({ card, size = 'md', className = '' }: PlayingCardProps) {
  const rank = card.slice(0, -1);
  const suit = card.slice(-1) as Suit;
  const style = SUIT_STYLES[suit];
  const sizing = SIZE_CLASSES[size];
  const displayRank = rank === 'T' ? '10' : rank;

  return (
    <div
      aria-label={`${displayRank} de ${style.label}`}
      className={`relative inline-flex flex-col justify-between select-none border border-slate-300/90 bg-gradient-to-br from-white via-slate-50 to-slate-200/95 ring-1 ring-black/15 shadow-[0_6px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] ${sizing.frame} ${style.textClass} ${className}`}
    >
      {/* Esquina superior izquierda: rango + mini palo */}
      <div className="flex flex-col items-center self-start leading-none">
        <span className={`font-mono font-black tracking-tighter ${sizing.cornerRank}`}>
          {displayRank}
        </span>
        <span className={`leading-none -mt-0.5 ${sizing.cornerSuit}`}>{style.symbol}</span>
      </div>

      {/* Palo grande centrado */}
      <span
        aria-hidden="true"
        className={`absolute left-1/2 top-[56%] -translate-x-1/2 -translate-y-1/2 leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${sizing.centerSuit}`}
      >
        {style.symbol}
      </span>
    </div>
  );
}
