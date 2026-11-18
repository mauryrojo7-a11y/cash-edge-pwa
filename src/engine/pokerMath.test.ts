import { describe, expect, it } from 'vitest';
import rawSpots from '../data/trainingSpots.json';
import type { PotTopology, TrainingSpot } from '../types/poker';
import {
  classifySprZone,
  computeEquityRealizationFactor,
  evaluatePokerMath,
  formatBbOrCurrency,
  generateProceduralMathDrill,
  GGPOKER_BLIND_STRUCTURE,
  LIVE_BLIND_STRUCTURE,
} from './pokerMath';
import {
  createInitialProgressState,
  getActiveLeaks,
  recordSpotAttempt,
  selectNextSmartSpot,
} from './spacedRepetition';

const SPOTS = rawSpots as TrainingSpot[];

function makeTopology(overrides: Partial<PotTopology> = {}): PotTopology {
  return {
    initialFlopPlayers: 2,
    currentActivePlayers: 2,
    playersToActBehind: 0,
    heroRelativePosition: 'IP',
    isTransitionedToHU: false,
    transitionStreet: null,
    rangeFilterNote: null,
    ...overrides,
  };
}

describe('pokerMath — Fórmulas exactas y EQR', () => {
  it('calcula Pot Odds exactas incluyendo heroCall en finalPot', () => {
    const result = evaluatePokerMath({
      currentPot: 100,
      villainBet: 50,
      heroCall: 50,
      effectiveStack: 200,
      rawEquityPct: 30,
      topology: makeTopology(),
      regime: 'LIVE_MULTIWAY',
    });

    // finalPot = 100 + 50 + 50 = 200; potOdds = 50 / 200 = 25%
    expect(result.finalPot).toBe(200);
    expect(result.potOddsPct).toBeCloseTo(25, 6);
  });

  it('calcula MDF Heads-Up y ratio Bluff-to-Value exactos para 50%, 100% y 150% del pozo', () => {
    // Apuesta 50% pot (50 en 100): MDF = 1 - 50/150 = 66.6667%
    const halfPot = evaluatePokerMath({
      currentPot: 100,
      villainBet: 50,
      heroCall: 50,
      effectiveStack: 300,
      rawEquityPct: 30,
      topology: makeTopology(),
      regime: 'LIVE_MULTIWAY',
    });
    expect(halfPot.mdfHeadsUpPct).toBeCloseTo(66.666667, 4);
    expect(halfPot.optimalBluffPct).toBeCloseTo(25, 6); // 50 / (100 + 100) = 25%
    expect(halfPot.bluffsPerValueCombo).toBeCloseTo(1 / 3, 6);

    // Apuesta 100% pot (100 en 100): MDF = 50%
    const fullPot = evaluatePokerMath({
      currentPot: 100,
      villainBet: 100,
      heroCall: 100,
      effectiveStack: 300,
      rawEquityPct: 40,
      topology: makeTopology(),
      regime: 'LIVE_MULTIWAY',
    });
    expect(fullPot.mdfHeadsUpPct).toBeCloseTo(50, 6);
    expect(fullPot.optimalBluffPct).toBeCloseTo(33.333333, 4);
    expect(fullPot.bluffsPerValueCombo).toBeCloseTo(0.5, 6);

    // Overbet 150% pot (45 en 30): MDF = 40%
    const overbet150 = evaluatePokerMath({
      currentPot: 30,
      villainBet: 45,
      heroCall: 45,
      effectiveStack: 100,
      rawEquityPct: 50,
      topology: makeTopology(),
      regime: 'GGPOKER_HIGH_RAKE',
    });
    expect(overbet150.mdfHeadsUpPct).toBeCloseTo(40, 6);
    expect(overbet150.optimalBluffPct).toBeCloseTo(37.5, 6);
    expect(overbet150.bluffsPerValueCombo).toBeCloseTo(0.6, 6);
  });

  it('modela el colapso de MDF efectiva en pozos 3-way y 4-way', () => {
    // 4-way => N = 3 defensores. Apuesta 14 en pozo 20 => 1 - (14/34)^(1/3) = 25.6040%
    const fourWay = evaluatePokerMath({
      currentPot: 20,
      villainBet: 14,
      heroCall: 14,
      effectiveStack: 135,
      rawEquityPct: 44,
      topology: makeTopology({
        initialFlopPlayers: 4,
        currentActivePlayers: 4,
        playersToActBehind: 2,
        heroRelativePosition: 'SANDWICH',
      }),
      regime: 'LIVE_MULTIWAY',
    });

    expect(fourWay.defenderCount).toBe(3);
    expect(fourWay.mdfHeadsUpPct).toBeCloseTo(58.8235, 3);
    expect(fourWay.effectiveMdfPct).toBeCloseTo(25.604, 3);
    expect(fourWay.effectiveMdfPct).toBeLessThan(fourWay.mdfHeadsUpPct);
  });

  it('recupera la MDF al 100% HU en transición a Turn/River manteniendo penalización de rango en EQR', () => {
    const flop4Way = makeTopology({
      initialFlopPlayers: 4,
      currentActivePlayers: 4,
      playersToActBehind: 0,
      heroRelativePosition: 'IP',
      isTransitionedToHU: false,
    });

    const turnTransitionHu = makeTopology({
      initialFlopPlayers: 4,
      currentActivePlayers: 2,
      playersToActBehind: 0,
      heroRelativePosition: 'IP',
      isTransitionedToHU: true,
      transitionStreet: 'Turn',
      rangeFilterNote: 'Flop 4-way reducido a HU en Turn',
    });

    const resFlop = evaluatePokerMath({
      currentPot: 40,
      villainBet: 20,
      heroCall: 20,
      effectiveStack: 120,
      rawEquityPct: 45,
      topology: flop4Way,
      regime: 'LIVE_MULTIWAY',
    });

    const resTurn = evaluatePokerMath({
      currentPot: 40,
      villainBet: 20,
      heroCall: 20,
      effectiveStack: 120,
      rawEquityPct: 45,
      topology: turnTransitionHu,
      regime: 'LIVE_MULTIWAY',
    });

    expect(resFlop.effectiveMdfPct).toBeCloseTo(30.6639, 3);
    expect(resTurn.defenderCount).toBe(1);
    expect(resTurn.effectiveMdfPct).toBeCloseTo(resTurn.mdfHeadsUpPct, 6);
    expect(resTurn.effectiveMdfPct).toBeCloseTo(66.6667, 3);
    expect(resTurn.eqrFactor).toBe(0.96); // 1.0 - 0.04 por rango filtrado en transición
  });

  it('clasifica correctamente las zonas de SPR', () => {
    expect(classifySprZone(2.5)).toBe('COMMITTED_LOW_SPR');
    expect(classifySprZone(3.5)).toBe('COMMITTED_LOW_SPR');
    expect(classifySprZone(3.51)).toBe('MEDIUM_SPR_CAUTION');
    expect(classifySprZone(7.99)).toBe('MEDIUM_SPR_CAUTION');
    expect(classifySprZone(8.0)).toBe('DEEP_SPR_NUTS_ONLY');
    expect(classifySprZone(14.0)).toBe('DEEP_SPR_NUTS_ONLY');
  });

  it('penaliza EQR por OOP, SANDWICH, jugadores detrás y High Rake, y calcula EV exacto', () => {
    const ipLive = computeEquityRealizationFactor(makeTopology({ heroRelativePosition: 'IP' }), 'LIVE_MULTIWAY');
    const oopLive = computeEquityRealizationFactor(makeTopology({ heroRelativePosition: 'OOP' }), 'LIVE_MULTIWAY');
    const sandwich4Way = computeEquityRealizationFactor(
      makeTopology({
        initialFlopPlayers: 4,
        currentActivePlayers: 4,
        playersToActBehind: 2,
        heroRelativePosition: 'SANDWICH',
      }),
      'LIVE_MULTIWAY'
    );
    const ipGG = computeEquityRealizationFactor(makeTopology({ heroRelativePosition: 'IP' }), 'GGPOKER_HIGH_RAKE');

    expect(ipLive).toBe(1);
    expect(oopLive).toBe(0.88);
    expect(sandwich4Way).toBe(0.5);
    expect(ipGG).toBe(0.96);

    const math = evaluatePokerMath({
      currentPot: 20,
      villainBet: 14,
      heroCall: 14,
      effectiveStack: 135,
      rawEquityPct: 44,
      topology: makeTopology({
        initialFlopPlayers: 4,
        currentActivePlayers: 4,
        playersToActBehind: 2,
        heroRelativePosition: 'SANDWICH',
      }),
      regime: 'LIVE_MULTIWAY',
    });

    // realizedEquityPct = 44 * 0.5 = 22%; evCall = 0.22 * 48 - 14 = -3.44 BB
    expect(math.realizedEquityPct).toBeCloseTo(22, 6);
    expect(math.evCall).toBeCloseTo(-3.44, 6);
    expect(math.isPositiveEvCall).toBe(false);
  });

  it('devuelve eqrFactor === 1.0 exacto en River incluso OOP y con transición Multiway -> HU', () => {
    const riverOopTransition = makeTopology({
      initialFlopPlayers: 4,
      currentActivePlayers: 2,
      playersToActBehind: 0,
      heroRelativePosition: 'OOP',
      isTransitionedToHU: true,
      transitionStreet: 'Turn',
      rangeFilterNote: 'Transición a HU evaluada en River',
    });

    expect(computeEquityRealizationFactor(riverOopTransition, 'GGPOKER_HIGH_RAKE', 'River')).toBe(
      1.0
    );

    const riverMath = evaluatePokerMath({
      currentPot: 30,
      villainBet: 45,
      heroCall: 45,
      effectiveStack: 65,
      rawEquityPct: 52,
      topology: riverOopTransition,
      regime: 'GGPOKER_HIGH_RAKE',
      street: 'River',
    });

    expect(riverMath.eqrFactor).toBe(1.0);
    expect(riverMath.realizedEquityPct).toBeCloseTo(52, 6);
    expect(riverMath.evCall).toBeCloseTo(17.4, 6);
  });

  it('formatea correctamente BB y monedas ARS/USD', () => {
    expect(formatBbOrCurrency(18, LIVE_BLIND_STRUCTURE, false)).toBe('18 BB');
    expect(formatBbOrCurrency(18, LIVE_BLIND_STRUCTURE, true)).toContain('ARS');
    expect(formatBbOrCurrency(7.5, GGPOKER_BLIND_STRUCTURE, true)).toBe('$0.75 USD');
  });
});

describe('generateProceduralMathDrill', () => {
  it('genera ejercicios válidos sin cartas repetidas en ambos regímenes', () => {
    for (let i = 0; i < 6; i += 1) {
      const liveDrill = generateProceduralMathDrill('LIVE_MULTIWAY', i);
      const ggDrill = generateProceduralMathDrill('GGPOKER_HIGH_RAKE', i);

      [liveDrill, ggDrill].forEach((drill) => {
        const allCards = [...drill.heroCards, ...drill.boardCards];
        const uniqueCards = new Set(allCards);
        expect(uniqueCards.size).toBe(allCards.length);
        expect(drill.potOddsOptionsPct).toHaveLength(4);
        expect(drill.potOddsOptionsPct).toContain(drill.correctPotOddsPct);
        expect(['Call', 'Fold']).toContain(drill.correctAction);
      });
    }

    // Secuencia % 3 === 2 en LIVE_MULTIWAY debe generar una Transición a HU en Turn
    const transitionDrill = generateProceduralMathDrill('LIVE_MULTIWAY', 2);
    expect(transitionDrill.mathInput.topology.isTransitionedToHU).toBe(true);
    expect(transitionDrill.mathInput.topology.transitionStreet).toBe('Turn');
  });
});

describe('trainingSpots.json — Auditoría de los 16 escenarios curados', () => {
  it('contiene exactamente 8 spots por régimen y 2 por cada módulo', () => {
    expect(SPOTS).toHaveLength(16);

    const liveSpots = SPOTS.filter((s) => s.regime === 'LIVE_MULTIWAY');
    const ggSpots = SPOTS.filter((s) => s.regime === 'GGPOKER_HIGH_RAKE');
    expect(liveSpots).toHaveLength(8);
    expect(ggSpots).toHaveLength(8);

    const countsByModule = SPOTS.reduce<Record<string, number>>((acc, spot) => {
      acc[spot.module] = (acc[spot.module] ?? 0) + 1;
      return acc;
    }, {});

    expect(countsByModule).toEqual({
      PREFLOP_SQUEEZE: 2,
      MULTIWAY_FLOP: 2,
      TRANSITION_TURN_RIVER: 2,
      RIVER_EXPLOIT: 2,
      PREFLOP_3BET_OR_FOLD: 2,
      BLIND_VS_BLIND: 2,
      THREE_BET_POT: 2,
      OVERBET_DEFENSE: 2,
    });
  });

  it('valida cartas únicas, consistencia matemática, transiciones y nomenclatura sin términos prohibidos', () => {
    const serialized = JSON.stringify(SPOTS).toLowerCase();
    expect(serialized).not.toContain('jam');
    expect(serialized).not.toContain('shove');

    for (const spot of SPOTS) {
      const allCards = [...spot.heroCards, ...spot.boardCards];
      expect(new Set(allCards).size).toBe(allCards.length);
      expect(spot.mathInput.street).toBe(spot.street);

      const math = evaluatePokerMath(spot.mathInput);
      if (spot.street === 'River') {
        expect(math.eqrFactor).toBe(1.0);
      }
      if (spot.correctAction === 'Call') {
        expect(math.isPositiveEvCall).toBe(true);
      }
      if (spot.correctAction === 'Fold') {
        expect(math.isPositiveEvCall).toBe(false);
      }
      if (spot.module === 'TRANSITION_TURN_RIVER') {
        expect(spot.topology.isTransitionedToHU).toBe(true);
        expect(spot.topology.transitionStreet).not.toBeNull();
        expect(spot.topology.rangeFilterNote).toBeTruthy();
      }
      expect(spot.structuralExplanation.length).toBeGreaterThan(20);
      expect(spot.redTeamAlert.length).toBeGreaterThan(20);
    }

    const byId = Object.fromEntries(SPOTS.map((spot) => [spot.id, evaluatePokerMath(spot.mathInput)]));
    expect(byId['live-squeeze-01'].finalPot).toBeCloseTo(17.5, 6);
    expect(byId['live-squeeze-01'].potOddsPct).toBeCloseTo(22.857, 2);
    expect(byId['live-squeeze-02'].finalPot).toBeCloseTo(18.0, 6);
    expect(byId['live-squeeze-02'].potOddsPct).toBeCloseTo(13.889, 2);
    expect(byId['gg-pre-01'].finalPot).toBeCloseTo(6.5, 6);
    expect(byId['gg-pre-01'].potOddsPct).toBeCloseTo(38.462, 2);
    expect(byId['gg-pre-02'].finalPot).toBeCloseTo(6.5, 6);
    expect(byId['gg-pre-02'].potOddsPct).toBeCloseTo(38.462, 2);
  });
});

describe('spacedRepetition — Cola inteligente y leaks', () => {
  it('marca un spot fallado como leak, lo prioriza en cola y lo limpia tras 2 aciertos consecutivos', () => {
    let state = createInitialProgressState();
    const liveSpots = SPOTS.filter((s) => s.regime === 'LIVE_MULTIWAY');
    const failedSpot = liveSpots[0];

    // Falla el primer spot
    state = recordSpotAttempt(state, failedSpot, false, new Date('2026-11-18T10:00:00Z'));
    expect(state.streakDays).toBe(1);
    expect(getActiveLeaks(SPOTS, 'LIVE_MULTIWAY', state).map((s) => s.id)).toContain(failedSpot.id);

    // Avanzar algunos pasos respondiendo otros spots para que venza nextDueStep del leak
    state = recordSpotAttempt(state, liveSpots[1], true, new Date('2026-11-18T10:01:00Z'));
    state = recordSpotAttempt(state, liveSpots[2], true, new Date('2026-11-18T10:02:00Z'));

    const nextRecommended = selectNextSmartSpot(SPOTS, 'LIVE_MULTIWAY', state, {
      excludeSpotId: liveSpots[2].id,
      leaksOnly: false,
    });
    expect(nextRecommended?.id).toBe(failedSpot.id);

    // 1er acierto en el leak: sigue siendo leak hasta 2 seguidos
    state = recordSpotAttempt(state, failedSpot, true, new Date('2026-11-18T10:03:00Z'));
    expect(getActiveLeaks(SPOTS, 'LIVE_MULTIWAY', state).map((s) => s.id)).toContain(failedSpot.id);

    // 2do acierto consecutivo: se limpia el leak
    state = recordSpotAttempt(state, failedSpot, true, new Date('2026-11-18T10:04:00Z'));
    expect(getActiveLeaks(SPOTS, 'LIVE_MULTIWAY', state).map((s) => s.id)).not.toContain(
      failedSpot.id
    );
  });
});
