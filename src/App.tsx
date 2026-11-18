import { useEffect, useMemo, useState } from 'react';
import rawTrainingSpots from './data/trainingSpots.json';
import type {
  ActionType,
  GameRegime,
  ProceduralMathDrill,
  TrainingProgressState,
  TrainingSpot,
} from './types/poker';
import {
  evaluatePokerMath,
  generateProceduralMathDrill,
} from './engine/pokerMath';
import {
  getActiveLeaks,
  loadProgressState,
  recordBlitzAttempt,
  recordSpotAttempt,
  resetProgressState,
  selectNextSmartSpot,
} from './engine/spacedRepetition';
import { HeaderBar, type AppView } from './components/HeaderBar';
import { SpotTrainerView } from './components/SpotTrainerView';
import { BlitzMathView } from './components/BlitzMathView';
import { LeaksDashboardView } from './components/LeaksDashboardView';

const SESSION_DURATION_SECONDS = 15 * 60;
const TRAINING_SPOTS = rawTrainingSpots as TrainingSpot[];

export function App() {
  const [regime, setRegime] = useState<GameRegime>('LIVE_MULTIWAY');
  const [activeView, setActiveView] = useState<AppView>('spots');
  const [displayInCurrency, setDisplayInCurrency] = useState<boolean>(false);
  const [leaksOnlyMode, setLeaksOnlyMode] = useState<boolean>(false);

  const [progressState, setProgressState] = useState<TrainingProgressState>(() =>
    loadProgressState()
  );

  const [currentSpot, setCurrentSpot] = useState<TrainingSpot | null>(() =>
    selectNextSmartSpot(TRAINING_SPOTS, 'LIVE_MULTIWAY', progressState, {
      leaksOnly: false,
    })
  );
  const [selectedSpotAction, setSelectedSpotAction] = useState<ActionType | null>(null);

  const [blitzSequence, setBlitzSequence] = useState<number>(0);
  const [currentDrill, setCurrentDrill] = useState<ProceduralMathDrill>(() =>
    generateProceduralMathDrill('LIVE_MULTIWAY', 0)
  );

  // Temporizador de Sesión 15:00
  const [secondsRemaining, setSecondsRemaining] = useState<number>(SESSION_DURATION_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [timerTouchedByUser, setTimerTouchedByUser] = useState<boolean>(false);

  useEffect(() => {
    if (!isTimerRunning) return undefined;
    const intervalId = window.setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

  const activeLeaks = useMemo(
    () => getActiveLeaks(TRAINING_SPOTS, regime, progressState),
    [regime, progressState]
  );

  const currentSpotMath = useMemo(
    () => (currentSpot ? evaluatePokerMath(currentSpot.mathInput) : null),
    [currentSpot]
  );

  const ensureSessionTimerStarted = () => {
    if (!timerTouchedByUser && !isTimerRunning && secondsRemaining === SESSION_DURATION_SECONDS) {
      setIsTimerRunning(true);
    }
  };

  const handleRegimeChange = (nextRegime: GameRegime) => {
    if (nextRegime === regime) return;
    setRegime(nextRegime);
    setLeaksOnlyMode(false);
    setSelectedSpotAction(null);
    setCurrentSpot(
      selectNextSmartSpot(TRAINING_SPOTS, nextRegime, progressState, {
        leaksOnly: false,
      })
    );
    const nextSeq = blitzSequence + 1;
    setBlitzSequence(nextSeq);
    setCurrentDrill(generateProceduralMathDrill(nextRegime, nextSeq));
  };

  const handleSelectSpotAction = (action: ActionType) => {
    if (!currentSpot || selectedSpotAction !== null) return;
    ensureSessionTimerStarted();
    setSelectedSpotAction(action);
    const isCorrect = action === currentSpot.correctAction;
    setProgressState((prev) => recordSpotAttempt(prev, currentSpot, isCorrect));
  };

  const handleNextSpot = () => {
    setSelectedSpotAction(null);
    const next = selectNextSmartSpot(TRAINING_SPOTS, regime, progressState, {
      excludeSpotId: currentSpot?.id ?? null,
      leaksOnly: leaksOnlyMode,
    });
    setCurrentSpot(next);
  };

  const handleCompleteBlitzDrill = (
    isEvCorrect: boolean,
    isPotOddsCorrect: boolean,
    responseMs: number
  ) => {
    ensureSessionTimerStarted();
    setProgressState((prev) =>
      recordBlitzAttempt(prev, regime, isEvCorrect, isPotOddsCorrect, responseMs)
    );
  };

  const handleNextBlitzDrill = () => {
    const nextSeq = blitzSequence + 1;
    setBlitzSequence(nextSeq);
    setCurrentDrill(generateProceduralMathDrill(regime, nextSeq));
  };

  const handleStartLeaksOnly = () => {
    setLeaksOnlyMode(true);
    setSelectedSpotAction(null);
    setCurrentSpot(
      selectNextSmartSpot(TRAINING_SPOTS, regime, progressState, {
        leaksOnly: true,
      })
    );
    setActiveView('spots');
  };

  const handleExitLeaksOnly = () => {
    setLeaksOnlyMode(false);
    setSelectedSpotAction(null);
    setCurrentSpot(
      selectNextSmartSpot(TRAINING_SPOTS, regime, progressState, {
        leaksOnly: false,
      })
    );
  };

  const handleResetProgress = () => {
    const fresh = resetProgressState();
    setProgressState(fresh);
    setLeaksOnlyMode(false);
    setSelectedSpotAction(null);
    setCurrentSpot(
      selectNextSmartSpot(TRAINING_SPOTS, regime, fresh, {
        leaksOnly: false,
      })
    );
  };

  const isLive = regime === 'LIVE_MULTIWAY';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#070b14] text-slate-100">
      {/* Resplandor radial dinámico en la parte superior según el régimen */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-80 transition-all duration-500"
        style={{
          background: isLive
            ? 'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(16, 185, 129, 0.20), rgba(245, 158, 11, 0.08) 45%, transparent 78%)'
            : 'radial-gradient(ellipse 80% 55% at 50% -10%, rgba(14, 165, 233, 0.22), rgba(99, 102, 241, 0.12) 45%, transparent 78%)',
        }}
      />

      <div className="relative z-10">
        <HeaderBar
          regime={regime}
          onChangeRegime={handleRegimeChange}
          activeView={activeView}
          onChangeView={setActiveView}
          displayInCurrency={displayInCurrency}
          onToggleCurrency={() => setDisplayInCurrency((prev) => !prev)}
          secondsRemaining={secondsRemaining}
          isTimerRunning={isTimerRunning}
          onToggleTimer={() => {
            setTimerTouchedByUser(true);
            if (secondsRemaining === 0) {
              setSecondsRemaining(SESSION_DURATION_SECONDS);
              setIsTimerRunning(true);
            } else {
              setIsTimerRunning((prev) => !prev);
            }
          }}
          onResetTimer={() => {
            setTimerTouchedByUser(true);
            setIsTimerRunning(false);
            setSecondsRemaining(SESSION_DURATION_SECONDS);
          }}
          streakDays={progressState.streakDays}
          activeLeaksCount={activeLeaks.length}
        />

        {activeView === 'spots' && (
          <SpotTrainerView
            spot={currentSpot}
            mathResult={currentSpotMath}
            selectedAction={selectedSpotAction}
            displayInCurrency={displayInCurrency}
            leaksOnlyMode={leaksOnlyMode}
            remainingLeaksCount={activeLeaks.length}
            onExitLeaksMode={handleExitLeaksOnly}
            onSelectAction={handleSelectSpotAction}
            onNextSpot={handleNextSpot}
          />
        )}

        {activeView === 'blitz' && (
          <BlitzMathView
            regime={regime}
            drill={currentDrill}
            displayInCurrency={displayInCurrency}
            progressState={progressState}
            onCompleteDrill={handleCompleteBlitzDrill}
            onNextDrill={handleNextBlitzDrill}
          />
        )}

        {activeView === 'leaks' && (
          <LeaksDashboardView
            regime={regime}
            spots={TRAINING_SPOTS}
            progressState={progressState}
            onTrainLeaksOnly={handleStartLeaksOnly}
            onTrainAllSpots={() => {
              handleExitLeaksOnly();
              setActiveView('spots');
            }}
            onResetProgress={handleResetProgress}
          />
        )}
      </div>
    </div>
  );
}

export default App;
