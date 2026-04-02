'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import type { GitHubRoundData } from '@/lib/parser';
import { generateRoundQuestion } from '@/lib/parser';
import { FunctionAgeTimeline } from './FunctionAgeTimeline';

// Shared game type definitions — imported by Dashboard for the selector
export const GAME_TYPES = [
  { id: 'guess-file', label: '🔍 Guess the File', desc: 'Identify files by description' },
  { id: 'function-age', label: '📅 Function Age', desc: 'When was this code last modified?' },
  { id: 'dependency-path', label: '🔗 Dependency Path', desc: 'Trace how files connect' },
  { id: 'component-duel', label: '⚔️ Component Duel', desc: 'Match features to files' },
  { id: 'complexity-race', label: '⚡ Complexity Race', desc: 'Rank files by size, fastest wins' },
  { id: 'commit-message', label: '💬 Commit Message', desc: 'Guess the commit from a diff' },
] as const;

export type GameTypeId = typeof GAME_TYPES[number]['id'];

interface GamesProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  gitHubData?: GitHubRoundData;
  soloGame: string | null;
  setSoloGame: (id: string | null) => void;
}

// ── Score persistence ───────────────────────────────────────────

const STORAGE_KEY = 'unvibe-vim-game-score';

export type InfiniteScore = { totalPoints: number; roundsPlayed: number };

function defaultScore(): InfiniteScore {
  return { totalPoints: 0, roundsPlayed: 0 };
}

function loadScore(): InfiniteScore {
  if (typeof window === 'undefined') return defaultScore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultScore();
    const parsed = JSON.parse(raw);
    return {
      totalPoints: Math.max(0, Math.floor(parsed.totalPoints ?? 0)),
      roundsPlayed: Math.max(0, Math.floor(parsed.roundsPlayed ?? 0)),
    };
  } catch {
    return defaultScore();
  }
}

function saveScore(score: InfiniteScore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(score));
  } catch { /* ignore */ }
}

function clearScore(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}

// ── Seeded PRNG (same as parser) ───────────────────────────────

function randomUint32(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}

function mulberry32(seed: number) {
  return function next(): number {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mixSeed(...parts: number[]): number {
  let h = 0xdeadbeef;
  for (const p of parts) {
    h = Math.imul(h ^ p, 0x45d9f3b);
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
    h ^= h + Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

// ── Score calculation ───────────────────────────────────────────

function calcPoints(q: GameQuestion, answer: string, difficulty: 'easy' | 'medium' | 'hard'): number {
  if (q.type === 'function-age' || q.type === 'code-author') {
    // These are timeline games — handled separately with proximity scoring
    return 0;
  }
  if (q.type === 'complexity-race') {
    // complexity-race answer is order-dependent
    if (answer === q.answer) return 100;
    return 0;
  }
  if (answer === q.answer) return 100;
  return 0;
}

// ── Exposure tracking ───────────────────────────────────────────

const EXPOSURE_POWER = 2.45;

function itemWeight(id: string, exposure: Record<string, number>): number {
  const c = exposure[id] ?? 0;
  return 1 / Math.pow(1 + c, EXPOSURE_POWER);
}

function weightedPick<T extends { id: string }>(
  items: T[],
  weightOf: (item: T) => number,
  rand: () => number
): T | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0]!;
  let total = 0;
  const w: number[] = [];
  for (const t of items) {
    const wi = Math.max(weightOf(t), 1e-12);
    w.push(wi);
    total += wi;
  }
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= w[i]!;
    if (r < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

// ── Main Games Component ───────────────────────────────────────

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type Difficulty = typeof DIFFICULTIES[number];

export default function Games({ files, metrics, gitHubData, soloGame, setSoloGame }: GamesProps) {
  const [gameType, setGameType] = useState<string>(soloGame ?? 'guess-file');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [roundKey, setRoundKey] = useState(0);
  const [score, setScore] = useState<InfiniteScore>(defaultScore);
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [sessionSalt] = useState(() => randomUint32());
  const [roundSalt, setRoundSalt] = useState(() => randomUint32());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [complexityOrder, setComplexityOrder] = useState<string[]>([]);
  const [complexityStep, setComplexityStep] = useState(0);
  const [timelineGuess, setTimelineGuess] = useState<{ ms: number; pts: number } | null>(null);

  const exposureRef = useRef<Record<string, number>>({});
  const exposureRefInitialized = useRef(false);

  // Load score and exposure from storage
  useEffect(() => {
    const saved = loadScore();
    setScore(saved);
    try {
      const expRaw = localStorage.getItem(STORAGE_KEY + '_exposure');
      if (expRaw) exposureRef.current = JSON.parse(expRaw);
    } catch { /* ignore */ }
    exposureRefInitialized.current = true;
    setHydrated(true);
  }, []);

  // Persist score
  useEffect(() => {
    if (hydrated) saveScore(score);
  }, [score, hydrated]);

  // Persist exposure
  useEffect(() => {
    if (hydrated) {
      try {
        localStorage.setItem(STORAGE_KEY + '_exposure', JSON.stringify(exposureRef.current));
      } catch { /* ignore */ }
    }
  }, [hydrated, recentIds]);

  // Reset on game type change
  useEffect(() => {
    setRoundKey(0);
    setRoundSalt(randomUint32());
    setRevealed(false);
    setSelected(null);
    setComplexityOrder([]);
    setComplexityStep(0);
    setTimelineGuess(null);
  }, [gameType]);

  // Generate question for current round
  const currentQ = useMemo<GameQuestion | null>(() => {
    if (!hydrated) return null;
    const seedBase = 42; // Could be repo-hashed for determinism
    const q = generateRoundQuestion(roundKey, gameType as 'guess-file' | 'function-age' | 'dependency-path' | 'component-duel' | 'complexity-race' | 'commit-message' | 'code-author', files, metrics, gitHubData, seedBase, difficulty);
    return q;
  }, [roundKey, gameType, files, metrics, gitHubData, difficulty, hydrated]);

  const avgPts = score.roundsPlayed > 0 ? Math.round(score.totalPoints / score.roundsPlayed) : 0;

  const handleAnswer = useCallback((answer: string) => {
    if (!currentQ || revealed) return;
    setSelected(answer);

    if (currentQ.type === 'function-age' || currentQ.type === 'code-author') {
      // Timeline games — don't double-score; timelineGuess carries the points
      setRevealed(true);
      return;
    }

    const pts = calcPoints(currentQ, answer, difficulty);
    setScore(prev => ({
      totalPoints: prev.totalPoints + pts,
      roundsPlayed: prev.roundsPlayed + 1,
    }));
    exposureRef.current[currentQ.id] = (exposureRef.current[currentQ.id] ?? 0) + 1;
    setRecentIds(prev => [...prev, currentQ.id].slice(-20));
    setRevealed(true);
  }, [currentQ, revealed, difficulty]);

  const handleTimelineGuess = useCallback((guessMs: number, pts: number) => {
    if (!currentQ || revealed) return;
    setTimelineGuess({ ms: guessMs, pts });
    setScore(prev => ({
      totalPoints: prev.totalPoints + pts,
      roundsPlayed: prev.roundsPlayed + 1,
    }));
    exposureRef.current[currentQ.id] = (exposureRef.current[currentQ.id] ?? 0) + 1;
    setRecentIds(prev => [...prev, currentQ.id].slice(-20));
    setRevealed(true);
  }, [currentQ, revealed]);

  const nextRound = useCallback(() => {
    setRoundSalt(randomUint32());
    setRevealed(false);
    setSelected(null);
    setComplexityOrder([]);
    setComplexityStep(0);
    setTimelineGuess(null);
    setRoundKey(k => k + 1);
  }, []);

  const complexitySelect = useCallback((option: string) => {
    if (!currentQ || revealed || currentQ.type !== 'complexity-race') return;
    const newOrder = [...complexityOrder, option];
    setComplexityOrder(newOrder);
    setComplexityStep(newOrder.length);

    if (newOrder.length === 4) {
      // Completed — check answer
      const answerStr = newOrder.join('|');
      const pts = calcPoints(currentQ, answerStr, difficulty);
      setScore(prev => ({
        totalPoints: prev.totalPoints + pts,
        roundsPlayed: prev.roundsPlayed + 1,
      }));
      exposureRef.current[currentQ.id] = (exposureRef.current[currentQ.id] ?? 0) + 1;
      setRecentIds(prev => [...prev, currentQ.id].slice(-20));
      setRevealed(true);
    }
  }, [currentQ, revealed, complexityOrder, difficulty]);

  const resetProgress = useCallback(() => {
    if (!window.confirm('Reset all game progress? This will clear your score and exposure history.')) return;
    setScore(defaultScore());
    exposureRef.current = {};
    setRecentIds([]);
    clearScore();
  }, []);

  if (!hydrated) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '80px 0',
        fontFamily: "'JetBrains Mono', monospace",
        color: '#858585',
      }}>
        <div style={{
          width: '36px', height: '36px',
          border: '2px solid rgba(86,156,214,0.2)',
          borderTopColor: '#569cd6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p style={{ fontSize: '13px' }}>Loading games...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="vim-theme" style={{ padding: '0' }}>
      {/* Terminal wrapper */}
      <div className="vim-terminal" style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Title bar */}
        <div className="vim-titlebar">
          <span className="vim-titlebar-dot" style={{ background: '#f14c4c' }} />
          <span className="vim-titlebar-dot" style={{ background: '#fbbf24' }} />
          <span className="vim-titlebar-dot" style={{ background: '#22c55e' }} />
          <span className="vim-titlebar-title">unvibe.games — vim</span>
        </div>

        <div className="vim-content">
          {/* Score echo */}
          <div className="vim-echo">
            <div className="vim-echo-line">:echo $score</div>
            <div>
              <span style={{ color: '#dcdcaa' }}>Total:</span>{' '}
              <span style={{ color: '#569cd6' }}>{score.totalPoints.toLocaleString()}</span>
              {' pts · '}
              <span style={{ color: '#b5cea8' }}>{score.roundsPlayed}</span>
              {' rounds · avg '}
              <span style={{ color: '#ce9178' }}>{avgPts}</span>
              {' pts/round'}
            </div>
          </div>

          {/* Game type selector :set game=TYPE */}
          <div className="vim-set-selector">
            <span className="vim-set-label">:set game=</span>
            {GAME_TYPES.map(gt => (
              <span
                key={gt.id}
                className="vim-set-value"
                onClick={() => { setGameType(gt.id); setSoloGame(gt.id === soloGame ? null : gt.id); }}
                style={{
                  background: gameType === gt.id ? 'rgba(86,156,214,0.15)' : undefined,
                  borderColor: gameType === gt.id ? '#569cd6' : undefined,
                  color: gameType === gt.id ? '#569cd6' : undefined,
                }}
              >
                {gt.id}
              </span>
            ))}
          </div>

          {/* Difficulty selector */}
          <div className="vim-set-selector">
            <span className="vim-set-label">:set difficulty=</span>
            {DIFFICULTIES.map(d => (
              <span
                key={d}
                className="vim-set-value"
                onClick={() => setDifficulty(d)}
                style={{
                  background: difficulty === d ? 'rgba(86,156,214,0.15)' : undefined,
                  borderColor: difficulty === d ? '#569cd6' : undefined,
                  color: difficulty === d ? '#569cd6' : undefined,
                }}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Round key display */}
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6a9955', marginBottom: '16px' }}>
            Round {roundKey + 1} · seed:{roundKey * 31_127 + gameType.length * 7_193}
          </div>

          {/* Question card */}
          {!currentQ ? (
            <div className="vim-empty">
              <div className="vim-empty-title">No question available</div>
              <p>Not enough data in this codebase for the selected game type.</p>
            </div>
          ) : (
            <div className="vim-card" style={{ marginBottom: '20px' }}>
              <div className="vim-card-header">
                <span>{currentQ.type}</span>
                <span className={`vim-difficulty vim-difficulty-${currentQ.difficulty}`}>
                  {currentQ.difficulty}
                </span>
              </div>

              <div style={{ padding: '20px' }}>
                {/* Question */}
                <h3 style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '14px',
                  color: '#d4d4d4',
                  marginBottom: '20px',
                  lineHeight: 1.6,
                  fontWeight: 400,
                }}>
                  {currentQ.question}
                </h3>

                {/* Code snippet */}
                {currentQ.codeSnippet && (
                  <div className="vim-code" style={{ marginBottom: '20px' }}>
                    <div className="vim-code-header">
                      <span>// code snippet</span>
                      <span style={{ color: '#569cd6' }}>{currentQ.type}</span>
                    </div>
                    <div className="vim-code-content">
                      <code>{currentQ.codeSnippet}</code>
                    </div>
                  </div>
                )}

                {/* Function-age timeline */}
                {(currentQ.type === 'function-age' || currentQ.type === 'code-author') && currentQ.sparklineData && currentQ.dateRange && currentQ.proximateAnswer && (
                  <FunctionAgeTimeline
                    question={currentQ}
                    revealed={revealed}
                    onGuess={handleTimelineGuess}
                  />
                )}

                {/* Regular answer options */}
                {currentQ.type !== 'complexity-race' && currentQ.type !== 'function-age' && currentQ.type !== 'code-author' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {currentQ.options.map((option, i) => {
                      const isSelected = selected === option;
                      const isCorrect = option === currentQ.answer;
                      let cls = '';
                      if (revealed) {
                        if (isCorrect) cls = 'vim-option-correct';
                        else if (isSelected) cls = 'vim-option-wrong';
                      } else if (isSelected) {
                        cls = 'vim-option-selected';
                      }
                      return (
                        <button
                          key={i}
                          className={`vim-option ${cls}`}
                          onClick={() => !revealed && handleAnswer(option)}
                          disabled={revealed}
                        >
                          <span className="vim-option-letter">
                            {revealed ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                          </span>
                          <span className="vim-option-text">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Complexity race: click-in-order UI */}
                {currentQ.type === 'complexity-race' && (
                  <div>
                    <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: '#6a9955', marginBottom: '12px' }}>
                      {complexityStep === 0
                        ? '// Click files in order from LARGEST to SMALLEST'
                        : `// Selected: ${complexityStep}/4`}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {currentQ.options.map((option, i) => {
                        const isChosen = complexityOrder.includes(option);
                        const isNext = !isChosen && complexityStep < 4;
                        return (
                          <button
                            key={i}
                            className={`vim-option ${isChosen ? 'vim-option-selected' : ''}`}
                            onClick={() => isNext && !revealed && complexitySelect(option)}
                            disabled={isChosen || revealed}
                            style={{ opacity: isChosen ? 0.5 : 1 }}
                          >
                            <span className="vim-option-letter">
                              {isChosen ? `${complexityOrder.indexOf(option) + 1}` : String.fromCharCode(65 + i)}
                            </span>
                            <span className="vim-option-text">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Timeline info for function-age when no sparkline */}
                {(currentQ.type === 'function-age' || currentQ.type === 'code-author') && !currentQ.sparklineData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                    {currentQ.options.map((option, i) => {
                      const isSelected = selected === option;
                      const isCorrect = option === currentQ.answer;
                      let cls = '';
                      if (revealed) {
                        if (isCorrect) cls = 'vim-option-correct';
                        else if (isSelected) cls = 'vim-option-wrong';
                      } else if (isSelected) {
                        cls = 'vim-option-selected';
                      }
                      return (
                        <button
                          key={i}
                          className={`vim-option ${cls}`}
                          onClick={() => !revealed && handleAnswer(option)}
                          disabled={revealed}
                        >
                          <span className="vim-option-letter">
                            {revealed ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                          </span>
                          <span className="vim-option-text">{option}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Result */}
                {revealed && (
                  <div className={`vim-result ${selected === currentQ.answer || (timelineGuess && timelineGuess.pts > 0) ? 'vim-result-correct' : selected ? 'vim-result-wrong' : ''}`}>
                    {currentQ.type === 'function-age' || currentQ.type === 'code-author' ? (
                      timelineGuess ? (
                        <div>
                          <div className="vim-result-points">+{timelineGuess.pts.toLocaleString()} pts</div>
                          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6a9955', marginTop: '8px' }}>
                            {currentQ.explanation}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#d4d4d4' }}>
                            {currentQ.explanation}
                          </p>
                        </div>
                      )
                    ) : (
                      <div>
                        <p style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '13px',
                          color: selected === currentQ.answer ? '#22c55e' : '#f14c4c',
                          fontWeight: 700,
                          marginBottom: '8px',
                        }}>
                          {selected === currentQ.answer ? '✓ Correct!' : '✗ Wrong'}
                        </p>
                        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6a9955' }}>
                          {currentQ.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Next button */}
                {revealed && (
                  <div className="vim-next">
                    <button className="vim-btn vim-btn-primary" onClick={nextRound}>
                      next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reset button */}
          <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="vim-btn" onClick={resetProgress}>
              :reset
            </button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#6a9955' }}>
              // score and exposure auto-saved in this browser
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
