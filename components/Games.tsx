'use client';

import { useState, useEffect } from 'react';
import { Trophy, Zap, Target, RefreshCw, CheckCircle, XCircle, Brain } from 'lucide-react';
import type { GameQuestion, GameSession } from '../lib/types';

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
  const [currentQ, setCurrentQ] = useState<number>(0);
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

  const handleAnswer = (answer: string) => {
    if (answered) return;
    setSelected(answer);
    setShowResult(true);

    const newSession = {
      ...session,
      totalQuestions: session.totalQuestions + 1,
      correctAnswers: session.correctAnswers + (answer === q.answer ? 1 : 0),
      streak: answer === q.answer ? session.streak + 1 : 0,
      highStreak: Math.max(
        session.highStreak,
        answer === q.answer ? session.streak + 1 : 0
      ),
      questionsAnswered: [...session.questionsAnswered, q.id],
    };
    setSession(newSession);

    // Simulate AI duel score
    if (gameMode === 'duel') {
      const aiCorrect = Math.random() > 0.4;
      setDuelScore(prev => ({
        player: prev.player + (answer === q.answer ? 1 : 0),
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

  const accuracy = session.totalQuestions > 0
    ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
    : 0;

  if (questions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 40px' }}>
        <Brain size={64} color="rgba(255,255,255,0.2)" style={{ marginBottom: '24px' }} />
        <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '24px', marginBottom: '12px' }}>
          No Questions Available
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>
          Upload more files or enable AI analysis to generate game questions.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Stats Bar */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <Trophy size={24} color="#f59e0b" style={{ marginBottom: '8px' }} />
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 700, color: '#f59e0b' }}>
            {session.correctAnswers}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Correct</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <Target size={24} color="#00f0ff" style={{ marginBottom: '8px' }} />
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 700, color: '#00f0ff' }}>
            {accuracy}%
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Accuracy</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <Zap size={24} color="#a855f7" style={{ marginBottom: '8px' }} />
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 700, color: '#a855f7' }}>
            {session.streak}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Streak</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <Trophy size={24} color="#10b981" style={{ marginBottom: '8px' }} />
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 700, color: '#10b981' }}>
            {session.highStreak}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Best Streak</div>
        </div>
      </div>

      {/* Game Mode Toggle */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
        <button
          onClick={() => { setGameMode('quiz'); resetGame(); }}
          style={{
            padding: '12px 24px',
            background: gameMode === 'quiz' ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
            border: `1px solid ${gameMode === 'quiz' ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px',
            color: gameMode === 'quiz' ? '#00f0ff' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Solo Quiz
        </button>
        <button
          onClick={() => setGameMode('duel')}
          style={{
            padding: '12px 24px',
            background: gameMode === 'duel' ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
            border: `1px solid ${gameMode === 'duel' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px',
            color: gameMode === 'duel' ? '#a855f7' : 'rgba(255,255,255,0.6)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          🤖 AI Duel
        </button>
      </div>

      {/* Duel Score */}
      {gameMode === 'duel' && (
        <div className="card" style={{ marginBottom: '24px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '48px', fontWeight: 700, marginBottom: '16px' }}>
            <span style={{ color: '#00f0ff' }}>{duelScore.player}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 16px' }}>vs</span>
            <span style={{ color: '#a855f7' }}>{duelScore.ai}</span>
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            You vs AI (AI wins ~40% of questions)
          </div>
        </div>
      )}

      {/* Question Card */}
      <div className="card" style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 12px',
          background: q.difficulty === 'easy' ? 'rgba(16, 185, 129, 0.1)' : q.difficulty === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '100px',
          fontSize: '11px',
          fontWeight: 600,
          color: q.difficulty === 'easy' ? '#10b981' : q.difficulty === 'medium' ? '#f59e0b' : '#ef4444',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '24px',
        }}>
          {q.type.replace('-', ' ')} · {q.difficulty}
        </div>

        <h3 style={{
          fontFamily: 'Space Grotesk, sans-serif',
          fontSize: '24px',
          fontWeight: 600,
          marginBottom: '32px',
          lineHeight: 1.4,
        }}>
          {q.question}
        </h3>

        <div style={{ display: 'grid', gap: '12px', textAlign: 'left' }}>
          {q.options.map((option, i) => {
            const isSelected = selected === option;
            const isCorrect = option === q.answer;
            let bg = 'rgba(255,255,255,0.03)';
            let border = 'rgba(255,255,255,0.08)';

            if (showResult) {
              if (isCorrect) {
                bg = 'rgba(16, 185, 129, 0.15)';
                border = '#10b981';
              } else if (isSelected && !isCorrect) {
                bg = 'rgba(239, 68, 68, 0.15)';
                border = '#ef4444';
              }
            } else if (isSelected) {
              bg = 'rgba(0, 240, 255, 0.1)';
              border = '#00f0ff';
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
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '15px',
                  cursor: answered ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{
                  width: '28px',
                  height: '28px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '13px',
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span style={{ flex: 1 }}>{option}</span>
                {showResult && isCorrect && <CheckCircle size={20} color="#10b981" />}
                {showResult && isSelected && !isCorrect && <XCircle size={20} color="#ef4444" />}
              </button>
            );
          })}
        </div>

        {showResult && (
          <div style={{
            marginTop: '24px',
            padding: '16px 20px',
            background: correct ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '12px',
            textAlign: 'left',
          }}>
            <p style={{ fontWeight: 600, color: correct ? '#10b981' : '#ef4444', marginBottom: '4px' }}>
              {correct ? '✓ Correct!' : '✗ Wrong'}
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
              {q.explanation}
            </p>
          </div>
        )}

        <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button onClick={nextQuestion} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Next Question
            <RefreshCw size={16} />
          </button>
        </div>

        <div style={{ marginTop: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          Question {currentQ + 1} of {questions.length}
        </div>
      </div>
    </div>
  );
}
