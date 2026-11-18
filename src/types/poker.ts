export type GameRegime = 'LIVE_MULTIWAY' | 'GGPOKER_HIGH_RAKE';

export type Street = 'Preflop' | 'Flop' | 'Turn' | 'River';

export type TransitionStreet = 'Turn' | 'River' | null;

export type Rank =
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'T'
  | '9'
  | '8'
  | '7'
  | '6'
  | '5'
  | '4'
  | '3'
  | '2';

export type Suit = 's' | 'h' | 'd' | 'c';

export type CardCode = `${Rank}${Suit}`;

/**
 * Nomenclatura estricta: siempre "All-in" (prohibido usar términos alternativos en el dominio).
 */
export type ActionType =
  | 'Fold'
  | 'Check'
  | 'Call'
  | 'Bet'
  | 'Raise'
  | 'Squeeze'
  | 'All-in';

export type LiveSpotModule =
  | 'PREFLOP_SQUEEZE'
  | 'MULTIWAY_FLOP'
  | 'TRANSITION_TURN_RIVER'
  | 'RIVER_EXPLOIT';

export type GGSpotModule =
  | 'PREFLOP_3BET_OR_FOLD'
  | 'BLIND_VS_BLIND'
  | 'THREE_BET_POT'
  | 'OVERBET_DEFENSE';

export type SpotModule = LiveSpotModule | GGSpotModule;

export type RelativePosition = 'IP' | 'OOP' | 'SANDWICH';

export type TablePosition = 'UTG' | 'MP' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

export type SprZone =
  | 'COMMITTED_LOW_SPR'
  | 'MEDIUM_SPR_CAUTION'
  | 'DEEP_SPR_NUTS_ONLY';

export interface BlindStructure {
  id: string;
  label: string;
  currency: 'ARS' | 'USD';
  smallBlind: number;
  bigBlind: number;
  rakePct: number;
  rakeCapBb: number;
}

export interface PotTopology {
  initialFlopPlayers: number;
  currentActivePlayers: number;
  playersToActBehind: number;
  heroRelativePosition: RelativePosition;
  isTransitionedToHU: boolean;
  transitionStreet: TransitionStreet;
  rangeFilterNote: string | null;
}

export type VillainArchetype =
  | 'Loose-Passive'
  | 'TAG-Regular'
  | 'LAG-Maniac'
  | 'Nit-Omission'
  | 'Pool-6Max-Reg';

export interface VillainProfile {
  name: string;
  position: TablePosition;
  archetype: VillainArchetype;
  tendencySummary: string;
  statsBadge?: string;
}

export interface MathCalculationInput {
  /** Pozo existente antes de la apuesta del villano (en BB). */
  currentPot: number;
  /** Apuesta o subida total que realiza el villano (en BB). */
  villainBet: number;
  /** Cantidad neta que Hero debe pagar para igualar (en BB). */
  heroCall: number;
  /** Stack efectivo restante antes de pagar (en BB). */
  effectiveStack: number;
  /** Equity bruta estimada de Hero contra el rango rival (0 a 100). */
  rawEquityPct: number;
  topology: PotTopology;
  regime: GameRegime;
  /** Calle de la decisión; en 'River' EQR es 1.0 al ir directo a showdown. */
  street?: Street;
}

export interface MathCalculationResult {
  finalPot: number;
  potOddsPct: number;
  mdfHeadsUpPct: number;
  effectiveMdfPct: number;
  defenderCount: number;
  spr: number;
  sprZone: SprZone;
  eqrFactor: number;
  realizedEquityPct: number;
  evCall: number;
  isPositiveEvCall: boolean;
  optimalBluffPct: number;
  bluffsPerValueCombo: number;
}

export interface TrainingSpot {
  id: string;
  regime: GameRegime;
  module: SpotModule;
  title: string;
  street: Street;
  blindStructure: BlindStructure;
  heroPosition: TablePosition;
  heroCards: [CardCode, CardCode];
  boardCards: CardCode[];
  actionHistory: string[];
  villain: VillainProfile;
  topology: PotTopology;
  mathInput: MathCalculationInput;
  availableActions: ActionType[];
  correctAction: ActionType;
  recommendedSizing: string | null;
  structuralExplanation: string;
  redTeamAlert: string;
}

export interface ProceduralMathDrill {
  id: string;
  regime: GameRegime;
  categoryLabel: string;
  street: Street;
  blindStructure: BlindStructure;
  heroPosition: TablePosition;
  heroCards: [CardCode, CardCode];
  boardCards: CardCode[];
  scenarioPrompt: string;
  mathInput: MathCalculationInput;
  mathResult: MathCalculationResult;
  potOddsOptionsPct: number[];
  correctPotOddsPct: number;
  correctAction: 'Call' | 'Fold';
}

export interface SpotPerformanceRecord {
  spotId: string;
  attempts: number;
  correctCount: number;
  mistakeCount: number;
  consecutiveCorrect: number;
  priorityWeight: number;
  isLeak: boolean;
  nextDueStep: number;
  lastAttemptAt: string;
}

export interface ModulePerformanceStat {
  attempts: number;
  correct: number;
}

export interface RegimePerformanceStat {
  attempts: number;
  correct: number;
}

export interface BlitzPerformanceStat {
  attempts: number;
  correctEv: number;
  correctPotOdds: number;
  totalResponseMs: number;
  currentStreak: number;
  bestStreak: number;
}

export interface TrainingProgressState {
  version: number;
  streakDays: number;
  lastActiveDate: string | null;
  globalStepCounter: number;
  regimeStats: Record<GameRegime, RegimePerformanceStat>;
  moduleStats: Record<SpotModule, ModulePerformanceStat>;
  blitzStats: Record<GameRegime, BlitzPerformanceStat>;
  spotRecords: Record<string, SpotPerformanceRecord>;
}
