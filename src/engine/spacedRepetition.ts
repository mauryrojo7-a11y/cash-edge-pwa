import type {
  BlitzPerformanceStat,
  GameRegime,
  ModulePerformanceStat,
  RegimePerformanceStat,
  SpotModule,
  SpotPerformanceRecord,
  TrainingProgressState,
  TrainingSpot,
} from '../types/poker';

export const PROGRESS_STORAGE_KEY = 'cash_edge_pwa_progress_v1';

export const LIVE_MODULES: readonly SpotModule[] = [
  'PREFLOP_SQUEEZE',
  'MULTIWAY_FLOP',
  'TRANSITION_TURN_RIVER',
  'RIVER_EXPLOIT',
];

export const GG_MODULES: readonly SpotModule[] = [
  'PREFLOP_3BET_OR_FOLD',
  'BLIND_VS_BLIND',
  'THREE_BET_POT',
  'OVERBET_DEFENSE',
];

export const MODULE_LABELS: Record<SpotModule, string> = {
  PREFLOP_SQUEEZE: 'Squeeze Preflop (Multiway)',
  MULTIWAY_FLOP: 'Flops Multiway & Sándwich',
  TRANSITION_TURN_RIVER: 'Transición Multiway → HU',
  RIVER_EXPLOIT: 'River Exploit & Blockers',
  PREFLOP_3BET_OR_FOLD: 'Preflop 3-Bet o Fold',
  BLIND_VS_BLIND: 'Guerra de Ciegas (BvB / BTN)',
  THREE_BET_POT: '3-Bet Pots & SPR',
  OVERBET_DEFENSE: 'Defensa vs Overbets',
};

function createEmptyBlitzStat(): BlitzPerformanceStat {
  return {
    attempts: 0,
    correctEv: 0,
    correctPotOdds: 0,
    totalResponseMs: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

export function createInitialProgressState(): TrainingProgressState {
  return {
    version: 1,
    streakDays: 0,
    lastActiveDate: null,
    globalStepCounter: 0,
    regimeStats: {
      LIVE_MULTIWAY: { attempts: 0, correct: 0 },
      GGPOKER_HIGH_RAKE: { attempts: 0, correct: 0 },
    },
    moduleStats: {
      PREFLOP_SQUEEZE: { attempts: 0, correct: 0 },
      MULTIWAY_FLOP: { attempts: 0, correct: 0 },
      TRANSITION_TURN_RIVER: { attempts: 0, correct: 0 },
      RIVER_EXPLOIT: { attempts: 0, correct: 0 },
      PREFLOP_3BET_OR_FOLD: { attempts: 0, correct: 0 },
      BLIND_VS_BLIND: { attempts: 0, correct: 0 },
      THREE_BET_POT: { attempts: 0, correct: 0 },
      OVERBET_DEFENSE: { attempts: 0, correct: 0 },
    },
    blitzStats: {
      LIVE_MULTIWAY: createEmptyBlitzStat(),
      GGPOKER_HIGH_RAKE: createEmptyBlitzStat(),
    },
    spotRecords: {},
  };
}

function getStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDateKey(date: Date = new Date()): string {
  const prev = new Date(date.getTime());
  prev.setDate(prev.getDate() - 1);
  return getLocalDateKey(prev);
}

function updateDailyStreak(
  state: TrainingProgressState,
  now: Date
): { streakDays: number; lastActiveDate: string } {
  const todayKey = getLocalDateKey(now);
  const yesterdayKey = getPreviousDateKey(now);

  if (state.lastActiveDate === todayKey) {
    return {
      streakDays: Math.max(1, state.streakDays),
      lastActiveDate: todayKey,
    };
  }

  if (state.lastActiveDate === yesterdayKey) {
    return {
      streakDays: state.streakDays + 1,
      lastActiveDate: todayKey,
    };
  }

  return {
    streakDays: 1,
    lastActiveDate: todayKey,
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function sanitizeModuleStats(
  raw: unknown,
  base: Record<SpotModule, ModulePerformanceStat>
): Record<SpotModule, ModulePerformanceStat> {
  if (!isPlainRecord(raw)) return base;
  const result = { ...base };
  (Object.keys(base) as SpotModule[]).forEach((modKey) => {
    const entry = raw[modKey];
    if (isPlainRecord(entry)) {
      result[modKey] = {
        attempts: sanitizeNumber(entry.attempts),
        correct: sanitizeNumber(entry.correct),
      };
    }
  });
  return result;
}

function sanitizeRegimeStats(
  raw: unknown,
  base: Record<GameRegime, RegimePerformanceStat>
): Record<GameRegime, RegimePerformanceStat> {
  if (!isPlainRecord(raw)) return base;
  const result = { ...base };
  (['LIVE_MULTIWAY', 'GGPOKER_HIGH_RAKE'] as GameRegime[]).forEach((regimeKey) => {
    const entry = raw[regimeKey];
    if (isPlainRecord(entry)) {
      result[regimeKey] = {
        attempts: sanitizeNumber(entry.attempts),
        correct: sanitizeNumber(entry.correct),
      };
    }
  });
  return result;
}

function sanitizeBlitzStats(
  raw: unknown,
  base: Record<GameRegime, BlitzPerformanceStat>
): Record<GameRegime, BlitzPerformanceStat> {
  if (!isPlainRecord(raw)) return base;
  const result = { ...base };
  (['LIVE_MULTIWAY', 'GGPOKER_HIGH_RAKE'] as GameRegime[]).forEach((regimeKey) => {
    const entry = raw[regimeKey];
    if (isPlainRecord(entry)) {
      result[regimeKey] = {
        attempts: sanitizeNumber(entry.attempts),
        correctEv: sanitizeNumber(entry.correctEv),
        correctPotOdds: sanitizeNumber(entry.correctPotOdds),
        totalResponseMs: sanitizeNumber(entry.totalResponseMs),
        currentStreak: sanitizeNumber(entry.currentStreak),
        bestStreak: sanitizeNumber(entry.bestStreak),
      };
    }
  });
  return result;
}

function sanitizeSpotRecords(raw: unknown): Record<string, SpotPerformanceRecord> {
  if (!isPlainRecord(raw)) return {};
  const records: Record<string, SpotPerformanceRecord> = {};
  for (const [spotId, entry] of Object.entries(raw)) {
    if (!isPlainRecord(entry)) continue;
    records[spotId] = {
      spotId,
      attempts: sanitizeNumber(entry.attempts),
      correctCount: sanitizeNumber(entry.correctCount),
      mistakeCount: sanitizeNumber(entry.mistakeCount),
      consecutiveCorrect: sanitizeNumber(entry.consecutiveCorrect),
      priorityWeight: sanitizeNumber(entry.priorityWeight, 1),
      isLeak: Boolean(entry.isLeak),
      nextDueStep: sanitizeNumber(entry.nextDueStep),
      lastAttemptAt: typeof entry.lastAttemptAt === 'string' ? entry.lastAttemptAt : '',
    };
  }
  return records;
}

export function loadProgressState(): TrainingProgressState {
  const fallback = createInitialProgressState();
  const storage = getStorage();
  if (!storage) return fallback;

  try {
    const rawJson = storage.getItem(PROGRESS_STORAGE_KEY);
    if (!rawJson) return fallback;
    const parsed: unknown = JSON.parse(rawJson);
    if (!isPlainRecord(parsed)) return fallback;

    return {
      version: 1,
      streakDays: sanitizeNumber(parsed.streakDays),
      lastActiveDate: typeof parsed.lastActiveDate === 'string' ? parsed.lastActiveDate : null,
      globalStepCounter: sanitizeNumber(parsed.globalStepCounter),
      regimeStats: sanitizeRegimeStats(parsed.regimeStats, fallback.regimeStats),
      moduleStats: sanitizeModuleStats(parsed.moduleStats, fallback.moduleStats),
      blitzStats: sanitizeBlitzStats(parsed.blitzStats, fallback.blitzStats),
      spotRecords: sanitizeSpotRecords(parsed.spotRecords),
    };
  } catch {
    return fallback;
  }
}

export function saveProgressState(state: TrainingProgressState): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silenciar errores de cuota llena sin romper la UI
  }
}

export function resetProgressState(): TrainingProgressState {
  const fresh = createInitialProgressState();
  saveProgressState(fresh);
  return fresh;
}

/**
 * Registra el intento de un spot curado, actualiza la racha diaria y recalcula
 * su prioridad de repetición espaciada (los fallos quedan marcados como leaks).
 */
export function recordSpotAttempt(
  state: TrainingProgressState,
  spot: TrainingSpot,
  isCorrect: boolean,
  now: Date = new Date()
): TrainingProgressState {
  const nextStep = state.globalStepCounter + 1;
  const streak = updateDailyStreak(state, now);

  const prevRegime = state.regimeStats[spot.regime];
  const prevModule = state.moduleStats[spot.module];
  const prevRecord: SpotPerformanceRecord = state.spotRecords[spot.id] ?? {
    spotId: spot.id,
    attempts: 0,
    correctCount: 0,
    mistakeCount: 0,
    consecutiveCorrect: 0,
    priorityWeight: 1,
    isLeak: false,
    nextDueStep: 0,
    lastAttemptAt: '',
  };

  const consecutiveCorrect = isCorrect ? prevRecord.consecutiveCorrect + 1 : 0;
  const stillLeak = isCorrect ? prevRecord.isLeak && consecutiveCorrect < 2 : true;

  const priorityWeight = isCorrect
    ? Math.max(1, prevRecord.priorityWeight - 2)
    : Math.min(12, prevRecord.priorityWeight + 4);

  const stepInterval = isCorrect ? Math.min(10, 3 + consecutiveCorrect * 2) : 2;

  const updatedRecord: SpotPerformanceRecord = {
    spotId: spot.id,
    attempts: prevRecord.attempts + 1,
    correctCount: prevRecord.correctCount + (isCorrect ? 1 : 0),
    mistakeCount: prevRecord.mistakeCount + (isCorrect ? 0 : 1),
    consecutiveCorrect,
    priorityWeight,
    isLeak: stillLeak,
    nextDueStep: nextStep + stepInterval,
    lastAttemptAt: now.toISOString(),
  };

  const nextState: TrainingProgressState = {
    ...state,
    streakDays: streak.streakDays,
    lastActiveDate: streak.lastActiveDate,
    globalStepCounter: nextStep,
    regimeStats: {
      ...state.regimeStats,
      [spot.regime]: {
        attempts: prevRegime.attempts + 1,
        correct: prevRegime.correct + (isCorrect ? 1 : 0),
      },
    },
    moduleStats: {
      ...state.moduleStats,
      [spot.module]: {
        attempts: prevModule.attempts + 1,
        correct: prevModule.correct + (isCorrect ? 1 : 0),
      },
    },
    spotRecords: {
      ...state.spotRecords,
      [spot.id]: updatedRecord,
    },
  };

  saveProgressState(nextState);
  return nextState;
}

/**
 * Registra un ejercicio de Blitz Math incluyendo precisión de Pot Odds, decisión EV y tiempo.
 */
export function recordBlitzAttempt(
  state: TrainingProgressState,
  regime: GameRegime,
  isEvCorrect: boolean,
  isPotOddsCorrect: boolean,
  responseMs: number,
  now: Date = new Date()
): TrainingProgressState {
  const streak = updateDailyStreak(state, now);
  const prev = state.blitzStats[regime];
  const fullSuccess = isEvCorrect && isPotOddsCorrect;
  const currentStreak = fullSuccess ? prev.currentStreak + 1 : 0;
  const bestStreak = Math.max(prev.bestStreak, currentStreak);

  const nextState: TrainingProgressState = {
    ...state,
    streakDays: streak.streakDays,
    lastActiveDate: streak.lastActiveDate,
    blitzStats: {
      ...state.blitzStats,
      [regime]: {
        attempts: prev.attempts + 1,
        correctEv: prev.correctEv + (isEvCorrect ? 1 : 0),
        correctPotOdds: prev.correctPotOdds + (isPotOddsCorrect ? 1 : 0),
        totalResponseMs: prev.totalResponseMs + Math.max(0, Math.round(responseMs)),
        currentStreak,
        bestStreak,
      },
    },
  };

  saveProgressState(nextState);
  return nextState;
}

/**
 * Selecciona el próximo spot inteligente priorizando leaks vencidos, luego spots no vistos,
 * luego leaks pendientes y finalmente el spot más antiguo en cola.
 */
export function selectNextSmartSpot(
  spots: readonly TrainingSpot[],
  regime: GameRegime,
  state: TrainingProgressState,
  options?: {
    excludeSpotId?: string | null;
    leaksOnly?: boolean;
  }
): TrainingSpot | null {
  const regimeSpots = spots.filter((spot) => spot.regime === regime);
  if (regimeSpots.length === 0) return null;

  const leaksOnly = options?.leaksOnly ?? false;
  const excludeSpotId = options?.excludeSpotId ?? null;

  let candidates = regimeSpots;
  if (leaksOnly) {
    const leakSpots = regimeSpots.filter((spot) => state.spotRecords[spot.id]?.isLeak);
    if (leakSpots.length === 0) {
      return null;
    }
    candidates = leakSpots;
  }

  const filtered =
    candidates.length > 1 && excludeSpotId
      ? candidates.filter((spot) => spot.id !== excludeSpotId)
      : candidates;

  const currentStep = state.globalStepCounter;

  const scoreSpot = (spot: TrainingSpot): number => {
    const record = state.spotRecords[spot.id];
    if (!record || record.attempts === 0) {
      // Spots no vistos tienen alta prioridad base, pero debajo de leaks vencidos
      return 500;
    }

    const isDue = currentStep >= record.nextDueStep;
    const overdueSteps = currentStep - record.nextDueStep;

    if (record.isLeak && isDue) {
      return 1000 + record.priorityWeight * 25 + overdueSteps * 5;
    }

    if (record.isLeak) {
      return 400 + record.priorityWeight * 20 - Math.max(0, record.nextDueStep - currentStep) * 10;
    }

    if (isDue) {
      return 200 + overdueSteps * 5;
    }

    return 50 - Math.max(0, record.nextDueStep - currentStep) * 5;
  };

  const ranked = [...filtered].sort((a, b) => scoreSpot(b) - scoreSpot(a));
  return ranked[0] ?? null;
}

export function getActiveLeaks(
  spots: readonly TrainingSpot[],
  regime: GameRegime,
  state: TrainingProgressState
): TrainingSpot[] {
  return spots
    .filter((spot) => spot.regime === regime && Boolean(state.spotRecords[spot.id]?.isLeak))
    .sort((a, b) => {
      const weightA = state.spotRecords[a.id]?.priorityWeight ?? 0;
      const weightB = state.spotRecords[b.id]?.priorityWeight ?? 0;
      return weightB - weightA;
    });
}

export function getRegimeAccuracyPct(
  state: TrainingProgressState,
  regime: GameRegime
): number | null {
  const stat = state.regimeStats[regime];
  if (!stat || stat.attempts === 0) return null;
  return Math.round((stat.correct / stat.attempts) * 100);
}

export interface ModuleSummaryItem {
  module: SpotModule;
  label: string;
  attempts: number;
  correct: number;
  accuracyPct: number | null;
}

export function getModuleSummaries(
  state: TrainingProgressState,
  regime: GameRegime
): ModuleSummaryItem[] {
  const modules = regime === 'LIVE_MULTIWAY' ? LIVE_MODULES : GG_MODULES;
  return modules.map((mod) => {
    const stat = state.moduleStats[mod];
    return {
      module: mod,
      label: MODULE_LABELS[mod],
      attempts: stat.attempts,
      correct: stat.correct,
      accuracyPct: stat.attempts > 0 ? Math.round((stat.correct / stat.attempts) * 100) : null,
    };
  });
}
