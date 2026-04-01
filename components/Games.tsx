'use client';

import { useState, useEffect } from 'react';
import { Trophy, Zap, Target, RefreshCw, CheckCircle, XCircle, Brain, Swords } from 'lucide-react';
import type { GameQuestion, GameSession } from '@/lib/types';

interface GamesProps {
  questions: GameQuestion[];
}

const STORAGE_KEY = 'unvibe_game_session';

export default function Games({ questions }: GamesProps) {
  const [session, setSession] = useState<GameSession>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return { ...parsed, questionsAnswered: [], streak: 0 };
        } catch {
          return { totalQuestions: 0, correctAnswers: 0, streak: 0, highStreak: 0, questionsAnswered: [] };
        }
      }
    }
    return { totalQuestions: 0, correctAnswers: 0, streak: 0, highStreak: 0, questionsAnswered: [] };
  });
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameMode, setGameMode] = useState<'quiz' | 'duel'>('quiz');
  const [duelScore, setDuelScore] = useState({ player: 0, ai: 0 });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

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
      highStreak: Math.max(session.highStreak, isCorrect ? session.streak + 1 : 0),
      questionsAnswered: [...session.questionsAnswered, q.id],
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

  const nextQuestion = () => {
    setSelected(null);
    setShowResult(false);
    setCurrentQ((currentQ + 1) % questions.length);
  };

  const resetGame = () => {
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setDuelScore({ player: 0, ai: 0 });
  };

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px' }}>
        <div style={{ width: '72px', height: '72px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Brain size={32} color="var(--text-muted)" />
        </div>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '22px', marginBottom: '12px' }}>No Questions Yet</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Upload more files or enable AI analysis to generate game questions.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
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
                  fontSize: '12px', fontFamily: 'JetBrains Mono', fontWeight: 600,
                  flexShrink: 0,
                  color: isSelected ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ flex: 1 }}>{option}</span>
                {showResult && isCorrect && <CheckCircle size={18} color="#34D399" />}
                {showResult && isSelected && !isCorrect && <XCircle size={18} color="#F87171" />}
              </button>
            );
          })}
        </div>

        {/* Result explanation */}
        {showResult && (
          <div style={{
            padding: '16px 20px',
            background: correct ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
            border: `1px solid ${correct ? 'rgba(52,211,153,0.2)' : 'rgba(248,113,113,0.2)'}`,
            borderRadius: 'var(--radius-md)',
            marginBottom: '24px',
          }}>
            <p style={{ fontWeight: 600, color: correct ? '#34D399' : '#F87171', marginBottom: '4px', fontFamily: 'Outfit' }}>
              {correct ? '✓ Correct!' : '✗ Wrong'}
            </p>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {q.explanation}
            </p>
          </div>
        )}

        {/* Next button */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button onClick={nextQuestion} className="btn-primary">
            Next Question <RefreshCw size={15} />
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Question {currentQ + 1} of {questions.length}
        </p>
      </div>
    </div>
  );
}
