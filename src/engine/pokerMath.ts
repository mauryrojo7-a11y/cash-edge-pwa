import type {
  BlindStructure,
  CardCode,
  GameRegime,
  MathCalculationInput,
  MathCalculationResult,
  PotTopology,
  ProceduralMathDrill,
  Rank,
  RelativePosition,
  SprZone,
  Street,
  Suit,
  TablePosition,
} from '../types/poker';

const RANKS: readonly Rank[] = [
  'A',
  'K',
  'Q',
  'J',
  'T',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
];

const SUITS: readonly Suit[] = ['s', 'h', 'd', 'c'];

export const LIVE_BLIND_STRUCTURE: BlindStructure = {
  id: 'live-ars-100-200',
  label: '$100/$200 ARS (Vivo)',
  currency: 'ARS',
  smallBlind: 100,
  bigBlind: 200,
  rakePct: 0,
  rakeCapBb: 0,
};

export const GGPOKER_BLIND_STRUCTURE: BlindStructure = {
  id: 'gg-nl10-usd',
  label: 'NL10 $0.05/$0.10 USD',
  currency: 'USD',
  smallBlind: 0.05,
  bigBlind: 0.1,
  rakePct: 5,
  rakeCapBb: 3,
};

/**
 * Calcula el factor de realización de equity (EQR) penalizando posición desventajosa,
 * multiplicidad de jugadores activos, oponentes por hablar detrás, filtrado por
 * transición Multiway -> HU y la extracción por rake alto.
 * En 'River' devuelve 1.0 exacto ya que un Call va directo al showdown sin calles futuras.
 */
export function computeEquityRealizationFactor(
  topology: PotTopology,
  regime: GameRegime = 'LIVE_MULTIWAY',
  street?: Street
): number {
  if (street === 'River') {
    return 1.0;
  }

  let eqr = 1.0;

  if (topology.heroRelativePosition === 'OOP') {
    eqr -= 0.12;
  } else if (topology.heroRelativePosition === 'SANDWICH') {
    eqr -= 0.2;
  }

  const extraPlayers = Math.max(0, topology.currentActivePlayers - 2);
  eqr -= 0.08 * extraPlayers;

  const behindPlayers = Math.max(0, topology.playersToActBehind);
  eqr -= 0.07 * behindPlayers;

  if (topology.isTransitionedToHU) {
    eqr -= 0.04;
  }

  if (regime === 'GGPOKER_HIGH_RAKE') {
    eqr -= 0.04;
  }

  const clamped = Math.min(1.05, Math.max(0.35, eqr));
  return Math.round(clamped * 10000) / 10000;
}

/**
 * Clasifica el SPR (Stack-to-Pot Ratio) según los umbrales del dominio.
 */
export function classifySprZone(spr: number): SprZone {
  if (spr <= 3.5) {
    return 'COMMITTED_LOW_SPR';
  }
  if (spr < 8.0) {
    return 'MEDIUM_SPR_CAUTION';
  }
  return 'DEEP_SPR_NUTS_ONLY';
}

/**
 * Evalúa las métricas matemáticas exactas del spot según las fórmulas definidas en .antigravityrules.
 */
export function evaluatePokerMath(input: MathCalculationInput): MathCalculationResult {
  const currentPot = Math.max(0, input.currentPot);
  const villainBet = Math.max(0, input.villainBet);
  const heroCall = Math.max(0, input.heroCall);
  const effectiveStack = Math.max(0, input.effectiveStack);
  const rawEquityPct = Math.min(100, Math.max(0, input.rawEquityPct));

  const finalPot = currentPot + villainBet + heroCall;
  const potOddsPct = finalPot > 0 ? (heroCall / finalPot) * 100 : 0;

  const potPlusVillainBet = currentPot + villainBet;
  const mdfHeadsUpPct =
    villainBet > 0 && potPlusVillainBet > 0
      ? (1 - villainBet / potPlusVillainBet) * 100
      : 100;

  const defenderCount = Math.max(1, input.topology.currentActivePlayers - 1);
  const effectiveMdfPct =
    villainBet > 0 && potPlusVillainBet > 0
      ? (1 - Math.pow(villainBet / potPlusVillainBet, 1 / defenderCount)) * 100
      : 100;

  const spr = currentPot > 0 ? effectiveStack / currentPot : 0;
  const sprZone = classifySprZone(spr);

  const eqrFactor = computeEquityRealizationFactor(input.topology, input.regime, input.street);
  const realizedEquityPct = Math.min(100, Math.max(0, rawEquityPct * eqrFactor));

  const evCall = (realizedEquityPct / 100) * finalPot - heroCall;
  const isPositiveEvCall = evCall > 0;

  const denomBluffPct = currentPot + 2 * villainBet;
  const optimalBluffPct =
    villainBet > 0 && denomBluffPct > 0 ? (villainBet / denomBluffPct) * 100 : 0;

  const bluffsPerValueCombo =
    villainBet > 0 && potPlusVillainBet > 0 ? villainBet / potPlusVillainBet : 0;

  return {
    finalPot,
    potOddsPct,
    mdfHeadsUpPct,
    effectiveMdfPct,
    defenderCount,
    spr,
    sprZone,
    eqrFactor,
    realizedEquityPct,
    evCall,
    isPositiveEvCall,
    optimalBluffPct,
    bluffsPerValueCombo,
  };
}

/**
 * Formatea una cantidad expresada en Big Blinds ya sea en "BB" o en la moneda de la mesa.
 */
export function formatBbOrCurrency(
  bbAmount: number,
  blindStructure: BlindStructure,
  displayInCurrency: boolean
): string {
  const roundedBb = Math.round(bbAmount * 10) / 10;
  if (!displayInCurrency) {
    return `${Number.isInteger(roundedBb) ? roundedBb.toFixed(0) : roundedBb.toFixed(1)} BB`;
  }

  const rawMoney = bbAmount * blindStructure.bigBlind;
  if (blindStructure.currency === 'ARS') {
    const formatted = Math.round(rawMoney).toLocaleString('es-AR');
    return `$${formatted} ARS`;
  }

  return `$${rawMoney.toFixed(2)} USD`;
}

function buildShuffledDeck(seedOffset: number): CardCode[] {
  const deck: CardCode[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}`);
    }
  }

  let state = (Date.now() ^ ((seedOffset + 1) * 2654435761)) >>> 0;
  const nextRand = (): number => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    const temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }

  return deck;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildPotOddsOptions(
  correctPotOddsPct: number,
  currentPot: number,
  villainBet: number,
  heroCall: number
): number[] {
  const correct = round1(correctPotOddsPct);
  const options = new Set<number>([correct]);

  // Distractor 1: olvidar incluir el call propio en el denominador (error muy frecuente).
  const potWithoutCall = currentPot + villainBet;
  if (potWithoutCall > 0) {
    const naiveOdds = round1(Math.min(95, (heroCall / potWithoutCall) * 100));
    if (Math.abs(naiveOdds - correct) >= 1.5) {
      options.add(naiveOdds);
    }
  }

  const candidateOffsets = [4.5, -4.5, 8.0, -7.5, 11.5, -10.5, 3.0, -3.0];
  for (const offset of candidateOffsets) {
    if (options.size >= 4) break;
    const candidate = round1(Math.min(72, Math.max(8, correct + offset)));
    const tooClose = Array.from(options).some((existing) => Math.abs(existing - candidate) < 1.8);
    if (!tooClose) {
      options.add(candidate);
    }
  }

  // Respaldo determinista si aún faltan opciones
  let step = 2.5;
  while (options.size < 4) {
    const fallback = round1(Math.min(75, Math.max(5, correct + step)));
    if (!options.has(fallback)) {
      options.add(fallback);
    }
    step = step > 0 ? -step : Math.abs(step) + 2.5;
  }

  return Array.from(options).sort((a, b) => a - b);
}

interface DrillBlueprint {
  categoryLabel: string;
  street: Street;
  boardCount: number;
  heroPosition: TablePosition;
  topology: PotTopology;
  currentPot: number;
  villainBet: number;
  heroCall: number;
  effectiveStack: number;
  rawEquityPct: number;
  promptBuilder: (pot: number, bet: number, stack: number) => string;
}

function pickFrom<T>(items: readonly T[], seed: number): T {
  const index = Math.abs(seed) % items.length;
  return items[index];
}

/**
 * Genera ejercicios infinitos procedurales adaptados al régimen activo para Blitz Math.
 */
export function generateProceduralMathDrill(
  regime: GameRegime,
  sequenceIndex = 0
): ProceduralMathDrill {
  const seedBase = sequenceIndex + Math.floor(Math.random() * 10000);
  const deck = buildShuffledDeck(seedBase);
  const heroCards: [CardCode, CardCode] = [deck[0], deck[1]];

  const liveBlueprints: readonly DrillBlueprint[] = [
    // 0: Flop 3-way IP vs c-bet
    {
      categoryLabel: 'Flop 3-Way (IP)',
      street: 'Flop',
      boardCount: 3,
      heroPosition: 'BTN',
      topology: {
        initialFlopPlayers: 3,
        currentActivePlayers: 3,
        playersToActBehind: 0,
        heroRelativePosition: 'IP',
        isTransitionedToHU: false,
        transitionStreet: null,
        rangeFilterNote: null,
      },
      currentPot: pickFrom([18, 22, 24], seedBase),
      villainBet: pickFrom([6, 9, 12], seedBase + 1),
      heroCall: 0, // se iguala a villainBet abajo
      effectiveStack: pickFrom([110, 140, 175], seedBase + 2),
      rawEquityPct: pickFrom([22, 27, 36, 42], seedBase + 3),
      promptBuilder: (pot, bet, stack) =>
        `Pozo 3-way en Flop (${pot} BB). HJ hace c-bet de ${bet} BB y CO foldea. Cierras la acción IP con ${stack} BB efectivas.`,
    },
    // 1: Flop 4-way Sándwich (colapso de MDF y EQR)
    {
      categoryLabel: 'Flop 4-Way Sándwich',
      street: 'Flop',
      boardCount: 3,
      heroPosition: 'CO',
      topology: {
        initialFlopPlayers: 4,
        currentActivePlayers: 4,
        playersToActBehind: 2,
        heroRelativePosition: 'SANDWICH',
        isTransitionedToHU: false,
        transitionStreet: null,
        rangeFilterNote: null,
      },
      currentPot: pickFrom([20, 24, 28], seedBase),
      villainBet: pickFrom([10, 14, 18], seedBase + 1),
      heroCall: 0,
      effectiveStack: pickFrom([120, 150, 190], seedBase + 2),
      rawEquityPct: pickFrom([28, 34, 48, 56], seedBase + 3),
      promptBuilder: (pot, bet, stack) =>
        `Flop 4-way (${pot} BB). UTG apuesta ${bet} BB y quedan 2 jugadores activos detrás de ti (Sándwich). Stack efectivo: ${stack} BB.`,
    },
    // 2: Transición Multiway -> HU en Turn
    {
      categoryLabel: 'Transición Flop Multiway → Turn HU',
      street: 'Turn',
      boardCount: 4,
      heroPosition: 'BTN',
      topology: {
        initialFlopPlayers: 3,
        currentActivePlayers: 2,
        playersToActBehind: 0,
        heroRelativePosition: 'IP' as RelativePosition,
        isTransitionedToHU: true,
        transitionStreet: 'Turn',
        rangeFilterNote:
          'Pozo nacido 3-way en Flop que se limpia a 1 vs. 1 en Turn: la MDF vuelve a recaer 100% sobre Hero, pero el rango agresor está filtrado.',
      },
      currentPot: pickFrom([36, 44, 52], seedBase),
      villainBet: pickFrom([18, 28, 39], seedBase + 1),
      heroCall: 0,
      effectiveStack: pickFrom([95, 125, 160], seedBase + 2),
      rawEquityPct: pickFrom([26, 33, 43, 49], seedBase + 3),
      promptBuilder: (pot, bet, stack) =>
        `El Flop fue 3-way, el tercero abandonó y ahora en Turn quedan 1 vs. 1 (${pot} BB). El agresor OOP barrela ${bet} BB. Stack: ${stack} BB.`,
    },
  ];

  const ggBlueprints: readonly DrillBlueprint[] = [
    // 0: 3-Bet Pot 1v1 (SPR bajo/medio)
    {
      categoryLabel: '3-Bet Pot 1v1 (High Rake)',
      street: 'Flop',
      boardCount: 3,
      heroPosition: 'BB',
      topology: {
        initialFlopPlayers: 2,
        currentActivePlayers: 2,
        playersToActBehind: 0,
        heroRelativePosition: 'OOP',
        isTransitionedToHU: false,
        transitionStreet: null,
        rangeFilterNote: null,
      },
      currentPot: pickFrom([20, 22, 25], seedBase),
      villainBet: pickFrom([6.5, 11, 16], seedBase + 1),
      heroCall: 0,
      effectiveStack: pickFrom([72, 78, 84], seedBase + 2),
      rawEquityPct: pickFrom([24, 31, 41, 47], seedBase + 3),
      promptBuilder: (pot, bet, stack) =>
        `3-Bet Pot 6-Max en Flop (${pot} BB). Estás OOP en BB y el agresor BTN apuesta ${bet} BB. Stack restante: ${stack} BB.`,
    },
    // 1: Guerra de ciegas SB vs BB / BTN vs BB
    {
      categoryLabel: 'Guerra de Ciegas (SB vs BB)',
      street: 'Turn',
      boardCount: 4,
      heroPosition: 'BB',
      topology: {
        initialFlopPlayers: 2,
        currentActivePlayers: 2,
        playersToActBehind: 0,
        heroRelativePosition: 'IP',
        isTransitionedToHU: false,
        transitionStreet: null,
        rangeFilterNote: null,
      },
      currentPot: pickFrom([14, 18, 22], seedBase),
      villainBet: pickFrom([7, 11, 16.5], seedBase + 1),
      heroCall: 0,
      effectiveStack: pickFrom([82, 88, 92], seedBase + 2),
      rawEquityPct: pickFrom([25, 32, 39, 46], seedBase + 3),
      promptBuilder: (pot, bet, stack) =>
        `SB vs BB en Turn (${pot} BB). Tienes posición en BB y SB dispara segundo barril de ${bet} BB. Stack efectivo: ${stack} BB.`,
    },
    // 2: Defensa contra Overbet en Turn/River
    {
      categoryLabel: 'Defensa vs Overbet (1v1)',
      street: 'River',
      boardCount: 5,
      heroPosition: 'BB',
      topology: {
        initialFlopPlayers: 2,
        currentActivePlayers: 2,
        playersToActBehind: 0,
        heroRelativePosition: 'OOP',
        isTransitionedToHU: false,
        transitionStreet: null,
        rangeFilterNote: null,
      },
      currentPot: pickFrom([24, 30, 36], seedBase),
      villainBet: pickFrom([30, 45, 54], seedBase + 1),
      heroCall: 0,
      effectiveStack: pickFrom([58, 65, 72], seedBase + 2),
      rawEquityPct: pickFrom([26, 33, 44, 52], seedBase + 3),
      promptBuilder: (pot, bet, stack) =>
        `River 6-Max (${pot} BB). Enfrentas una Overbet polarizada de ${bet} BB desde BB OOP. Stack efectivo: ${stack} BB.`,
    },
  ];

  const pool = regime === 'LIVE_MULTIWAY' ? liveBlueprints : ggBlueprints;
  const selectedIndex = Math.abs(sequenceIndex) % pool.length;
  const blueprint = pool[selectedIndex];
  const blindStructure =
    regime === 'LIVE_MULTIWAY' ? LIVE_BLIND_STRUCTURE : GGPOKER_BLIND_STRUCTURE;

  const currentPot = blueprint.currentPot;
  const villainBet = blueprint.villainBet;
  const heroCall = villainBet;
  const effectiveStack = blueprint.effectiveStack;
  let rawEquityPct = blueprint.rawEquityPct;

  let mathInput: MathCalculationInput = {
    currentPot,
    villainBet,
    heroCall,
    effectiveStack,
    rawEquityPct,
    topology: blueprint.topology,
    regime,
    street: blueprint.street,
  };

  let mathResult = evaluatePokerMath(mathInput);

  // Evitar spots demasiado cercanos al breakeven (< 0.25 BB) para decisiones nítidas en Blitz Math
  if (Math.abs(mathResult.evCall) < 0.25) {
    rawEquityPct = mathResult.evCall >= 0 ? Math.min(85, rawEquityPct + 6) : Math.max(10, rawEquityPct - 6);
    mathInput = { ...mathInput, rawEquityPct };
    mathResult = evaluatePokerMath(mathInput);
  }

  const boardCards = deck.slice(2, 2 + blueprint.boardCount);
  const correctPotOddsPct = round1(mathResult.potOddsPct);
  const potOddsOptionsPct = buildPotOddsOptions(
    mathResult.potOddsPct,
    currentPot,
    villainBet,
    heroCall
  );

  return {
    id: `blitz-${regime.toLowerCase()}-${sequenceIndex}-${Date.now()}`,
    regime,
    categoryLabel: blueprint.categoryLabel,
    street: blueprint.street,
    blindStructure,
    heroPosition: blueprint.heroPosition,
    heroCards,
    boardCards,
    scenarioPrompt: blueprint.promptBuilder(currentPot, villainBet, effectiveStack),
    mathInput,
    mathResult,
    potOddsOptionsPct,
    correctPotOddsPct,
    correctAction: mathResult.isPositiveEvCall ? 'Call' : 'Fold',
  };
}
