'use client';

import { useState, useEffect, useRef } from 'react';
import { Trophy, Zap, Target, RefreshCw, CheckCircle, XCircle, Brain, Swords } from 'lucide-react';
import type { GameQuestion, GameSession } from '@/lib/types';

interface GamesProps {
  questions: GameQuestion[];
}

const STORAGE_KEY = 'unvibe_game_session';

const defaultSession: GameSession = {
  totalQuestions: 0,
  correctAnswers: 0,
  streak: 0,
  highStreak: 0,
  questionsAnswered: [],
};

export default function Games({ questions }: GamesProps) {
  // Always initialize with default state for SSR consistency
  const [session, setSession] = useState<GameSession>(defaultSession);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameMode, setGameMode] = useState<'quiz' | 'duel'>('quiz');
  const [duelScore, setDuelScore] = useState({ player: 0, ai: 0 });
  const [hydrated, setHydrated] = useState(false);

  // Load from sessionStorage only after mount (client-only)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Normalize: reset questionsAnswered and streak on load to avoid stale state
        const normalized: GameSession = {
          totalQuestions: parsed.totalQuestions ?? 0,
          correctAnswers: parsed.correctAnswers ?? 0,
          streak: 0,
          highStreak: parsed.highStreak ?? 0,
          questionsAnswered: [], // Reset on load for fresh session
        };
        setSession(normalized);
      }
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

  // Persist to sessionStorage on change
  useEffect(() => {
    if (hydrated) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session, hydrated]);

  const q = questions[currentQ];
  const answered = selected !== null;
  const correct = selected === q?.answer;
  const accuracy = session.totalQuestions > 0
    ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
    : 0;

  const handleAnswer = (answer: string) => {
    if (answered) return;
    setSelected(answer);
    setShowResult(true);
    const isCorrect = answer === q.answer;
    const newSession = {
      ...session,
      totalQuestions: session.totalQuestions + 1,
      correctAnswers: session.correctAnswers + (isCorrect ? 1 : 0),
      streak: isCorrect ? session.streak + 1 : 0,
      highStreak: isCorrect ? Math.max(session.highStreak, session.streak + 1) : session.highStreak,
      questionsAnswered: [
        ...session.questionsAnswered,
        { questionId: q.id, correct: isCorrect },
      ],
    };
    setSession(newSession);

    if (gameMode === 'duel') {
      const aiCorrect = Math.random() > 0.4;
      setDuelScore(prev => ({
        player: prev.player + (isCorrect ? 1 : 0),
        ai: prev.ai + (aiCorrect ? 1 : 0),
      }));
    }
  };

  const resetGame = () => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
  };

  const nextQuestion = () => {
    resetGame();
    setCurrentQ(prev => (prev + 1) % questions.length);
  };

  if (!hydrated) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
        <div style={{
          width: '36px', height: '36px',
          border: '2px solid rgba(123,92,255,0.2)',
          borderTopColor: '#7B5CFF',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <p>Loading games...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '80px 0' }}>
      <div className="container">
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h2 style={{
            fontFamily: 'var(--font-outfit)',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            marginBottom: '12px',
          }}>
            <span className="gradient-text">Quiz Games</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            {questions.length} questions generated from your codebase
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}>
          {[
            { icon: Trophy, label: 'Correct', value: session.correctAnswers, color: '#34D399' },
            { icon: Target, label: 'Accuracy', value: `${accuracy}%`, color: 'var(--accent)' },
            { icon: Zap, label: 'Streak', value: session.streak, color: '#FBBF24' },
            { icon: Trophy, label: 'Best', value: session.highStreak, color: '#EC4899' },
          ].map(({ icon: Icon, label, value, color }, i) => (
            <div key={i} className="card animate-fade-up" style={{ padding: '24px', animationDelay: `${i * 60}ms`, textAlign: 'center' }}>
              <Icon size={20} color={color} style={{ marginBottom: '10px' }} />
              <div style={{ fontFamily: 'Outfit', fontSize: '28px', fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: 'JetBrains Mono', marginTop: '4px' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
          {[
            { id: 'quiz' as const, label: 'Solo Quiz' },
            { id: 'duel' as const, label: '🤖 AI Duel' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setGameMode(id); resetGame(); }}
              style={{
                padding: '12px 24px',
                background: gameMode === id ? 'var(--accent-subtle)' : 'var(--bg-card)',
                border: `1px solid ${gameMode === id ? 'rgba(123,92,255,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                color: gameMode === id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: 'Outfit',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Duel score */}
        {gameMode === 'duel' && (
          <div className="card animate-fade-up" style={{ padding: '28px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'Outfit', fontSize: '52px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              <span style={{ color: 'var(--accent)' }}>{duelScore.player}</span>
              <span style={{ color: 'var(--text-muted)', margin: '0 20px' }}>:</span>
              <span style={{ color: '#EC4899' }}>{duelScore.ai}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              You vs AI — AI wins ~40% of questions
            </p>
          </div>
        )}

        {/* Question card */}
        <div className="card animate-fade-up" style={{ maxWidth: '680px', margin: '0 auto', padding: '40px', animationDelay: '200ms' }}>
          {/* Difficulty + type */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <span style={{
              padding: '6px 16px',
              background: q.difficulty === 'easy' ? 'rgba(52,211,153,0.1)' : q.difficulty === 'medium' ? 'rgba(251,191,36,0.1)' : 'rgba(248,113,113,0.1)',
              border: `1px solid ${q.difficulty === 'easy' ? 'rgba(52,211,153,0.2)' : q.difficulty === 'medium' ? 'rgba(251,191,36,0.2)' : 'rgba(248,113,113,0.2)'}`,
              borderRadius: '100px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono',
              fontWeight: 600,
              color: q.difficulty === 'easy' ? '#34D399' : q.difficulty === 'medium' ? '#FBBF24' : '#F87171',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {q.type.replace('-', ' ')} · {q.difficulty}
            </span>
          </div>

          <h3 style={{
            fontFamily: 'Outfit',
            fontSize: '22px',
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: '32px',
            lineHeight: 1.4,
            letterSpacing: '-0.01em',
          }}>
            {q.question}
          </h3>

          {/* Code snippet for function-age and code-author */}
          {q.codeSnippet && (q.type === 'function-age' || q.type === 'code-author') && (
            <div style={{
              marginBottom: '24px',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                padding: '10px 16px',
                background: 'var(--bg-secondary)',
                borderBottom: '1px solid var(--border)',
                fontSize: '11px',
                fontFamily: 'var(--font-jetbrains)',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <span>Code snippet</span>
                <span style={{ color: 'var(--accent)' }}>{q.type === 'function-age' ? 'Last modified?' : 'Who wrote this?'}</span>
              </div>
              <pre style={{
                padding: '16px',
                background: 'var(--bg-primary)',
                margin: 0,
                fontSize: '12px',
                fontFamily: 'var(--font-jetbrains)',
                color: 'var(--text-secondary)',
                overflow: 'auto',
                maxHeight: '200px',
                lineHeight: 1.6,
              }}>
                <code>{q.codeSnippet}</code>
              </pre>
            </div>
          )}

          {/* Options */}
          <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            {q.options.map((option, i) => {
              const isSelected = selected === option;
              const isCorrect = option === q.answer;
              let bg = 'var(--bg-elevated)';
              let border = 'var(--border)';

              if (showResult) {
                if (isCorrect) { bg = 'rgba(52,211,153,0.1)'; border = '#34D399'; }
                else if (isSelected) { bg = 'rgba(248,113,113,0.1)'; border = '#F87171'; }
              } else if (isSelected) {
                bg = 'var(--accent-subtle)'; border = 'var(--accent)';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  disabled={answered}
                  style={{
                    padding: '16px 20px',
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: 'var(--radius-md)',
                    color: '#fff',
                    fontSize: '14px',
                    cursor: answered ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    width: '28px', height: '28px',
                    background: 'var(--bg-card)',
                    borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-jetbrains)',
                    color: showResult && isCorrect ? '#34D399' : showResult && isSelected && !isCorrect ? '#F87171' : 'var(--text-muted)',
                    flexShrink: 0,
                  }}>
                    {showResult ? (
                      isCorrect ? <CheckCircle size={14} /> : isSelected ? <XCircle size={14} /> : String.fromCharCode(65 + i)
                    ) : String.fromCharCode(65 + i)}
                  </span>
                  <span style={{ flex: 1, fontFamily: 'var(--font-jetbrains)', fontSize: '13px' }}>{option}</span>
                </button>
              );
            })}
          </div>

          {/* Result */}
          {showResult && (
            <div className="animate-fade-up" style={{
              padding: '20px',
              background: correct ? 'rgba(52,211,153,0.06)' : 'rgba(248,113,113,0.06)',
              border: `1px solid ${correct ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
              borderRadius: 'var(--radius-md)',
              marginBottom: '24px',
            }}>
              <div style={{
                fontFamily: 'var(--font-outfit)',
                fontWeight: 700,
                fontSize: '18px',
                color: correct ? '#34D399' : '#F87171',
                marginBottom: '8px',
              }}>
                {correct ? '✓ Correct!' : '✗ Wrong'}
              </div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                {q.explanation}
              </p>
              <div style={{
                display: 'inline-flex',
                gap: '8px',
                flexWrap: 'wrap',
              }}>
                {q.type === 'guess-file' && (
                  <span style={{ fontSize: '11px', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', fontFamily: 'var(--font-jetbrains)' }}>
                    {q.answer}
                  </span>
                )}
                {q.type === 'function-age' && (
                  <span style={{ fontSize: '11px', padding: '4px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--accent)', fontFamily: 'var(--font-jetbrains)' }}>
                    {q.answer}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={resetGame}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '12px 20px' }}
            >
              <RefreshCw size={14} /> Reset
            </button>
            {answered && (
              <button
                onClick={nextQuestion}
                className="btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', padding: '12px 24px' }}
              >
                Next Question <span style={{ opacity: 0.7 }}>→</span>
              </button>
            )}
          </div>

          {/* Progress */}
          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {questions.map((_, i) => (
              <div
                key={i}
                onClick={() => { setCurrentQ(i); setSelected(null); setShowResult(false); }}
                style={{
                  width: '10px', height: '10px',
                  borderRadius: '50%',
                  background: i === currentQ
                    ? 'var(--accent)'
                    : session.questionsAnswered.find(q => q.questionId === questions[i].id)
                      ? (session.questionsAnswered.find(q => q.questionId === questions[i].id)?.correct ? '#34D399' : '#F87171')
                      : 'var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: i === currentQ ? '2px solid var(--accent)' : 'none',
                  transform: i === currentQ ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
