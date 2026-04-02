'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { GameQuestion } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatShortDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function xForTimeMs(ms: number, rangeStart: Date, rangeEnd: Date): number {
  const t0 = rangeStart.getTime();
  const t1 = rangeEnd.getTime();
  if (t1 <= t0) return 500;
  const p = Math.max(0, Math.min(1, (ms - t0) / (t1 - t0)));
  return p * 1000;
}

function roundPointsForError(err01: number, difficulty: 'easy' | 'medium' | 'hard'): number {
  const e = Math.max(0, Math.min(1, err01));
  if (difficulty === 'easy') return Math.round(1000 * (1 - Math.sqrt(e)));
  if (difficulty === 'hard') return Math.round(1000 * (1 - e) * (1 - e));
  return Math.round(1000 * (1 - e));
}

type Props = {
  question: GameQuestion;
  revealed: boolean;
  onGuess: (guessMs: number, points: number) => void;
};

export function FunctionAgeTimeline({ question, revealed, onGuess }: Props) {
  const gradientId = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [guessMs, setGuessMs] = useState<number | null>(null);
  const [roundPoints, setRoundPoints] = useState<number | null>(null);
  const pointerDownRef = useRef(false);

  const rangeStart = useMemo(() => {
    if (!question.dateRange) return new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    return new Date(question.dateRange.start);
  }, [question.dateRange]);

  const rangeEnd = useMemo(() => {
    if (!question.dateRange) return new Date();
    return new Date(question.dateRange.end);
  }, [question.dateRange]);

  const correctMs = useMemo(() => {
    if (!question.proximateAnswer) return Date.now();
    return new Date(question.proximateAnswer).getTime();
  }, [question.proximateAnswer]);

  // Build sparkline path from commit activity data
  const sparkPath = useMemo(() => {
    const data = question.sparklineData;
    if (!data || data.length === 0) {
      // Fallback: just show a flat line
      return { path: '', maxCount: 1 };
    }
    const W = 1000;
    const H = 120;
    const maxCount = Math.max(...data.map(d => d.count), 1);
    if (data.length === 1) {
      const y = H - (data[0]!.count / maxCount) * (H - 10);
      return {
        path: `M 0 ${y.toFixed(2)} L ${W} ${y.toFixed(2)} L ${W} 120 L 0 120 Z`,
        maxCount,
      };
    }
    const points = data.map((bucket, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - (bucket.count / maxCount) * (H - 10);
      return { x, y };
    });
    const line = points.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      const prev = points[i - 1]!;
      const cpX = ((prev.x + pt.x) / 2).toFixed(2);
      return `${acc} C ${cpX} ${prev.y.toFixed(2)} ${cpX} ${pt.y.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    }, '');
    return {
      path: `${line} L 1000 120 L 0 120 Z`,
      maxCount,
    };
  }, [question.sparklineData]);

  // Year ticks for axis
  const yearTicks = useMemo(() => {
    const ticks: { year: number; pct: number }[] = [];
    if (!question.sparklineData || question.sparklineData.length === 0) return ticks;
    const n = question.sparklineData.length;
    let prevYear: number | null = null;
    question.sparklineData.forEach((d, i) => {
      const year = new Date(d.date).getFullYear();
      if (year !== prevYear) {
        prevYear = year;
        ticks.push({ year, pct: n > 1 ? (i / (n - 1)) * 100 : 50 });
      }
    });
    return ticks;
  }, [question.sparklineData]);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (revealed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    setHoverPct(pct);
  }, [revealed]);

  const handlePointerLeave = useCallback(() => {
    if (!pointerDownRef.current) setHoverPct(null);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (revealed) return;
    pointerDownRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    setHoverPct(pct);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [revealed]);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointerDownRef.current || revealed) return;
    pointerDownRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch { /* not captured */ }
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width)));
    const t0 = rangeStart.getTime();
    const t1 = rangeEnd.getTime();
    const guess = new Date(t0 + pct * (t1 - t0));
    const guessTimeMs = guess.getTime();
    const span = t1 - t0;
    const err01 = span > 0 ? Math.abs(guessTimeMs - correctMs) / span : 0;
    const pts = roundPointsForError(err01, question.difficulty);
    setGuessMs(guessTimeMs);
    setRoundPoints(pts);
    setHoverPct(null);
    onGuess(guessTimeMs, pts);
  }, [revealed, rangeStart, rangeEnd, correctMs, question.difficulty, onGuess]);

  const handlePointerCancel = useCallback(() => {
    pointerDownRef.current = false;
    setHoverPct(null);
  }, []);

  const hoverDate = useMemo(() => {
    if (hoverPct === null) return null;
    const t0 = rangeStart.getTime();
    const t1 = rangeEnd.getTime();
    return new Date(t0 + hoverPct * (t1 - t0));
  }, [hoverPct, rangeStart, rangeEnd]);

  const xCorrect = xForTimeMs(correctMs, rangeStart, rangeEnd);
  const xGuess = guessMs !== null ? xForTimeMs(guessMs, rangeStart, rangeEnd) : null;

  return (
    <div className="vim-timeline">
      {/* Date range label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span className="vim-timeline-label">
          📅 {formatShortDate(rangeStart)} → {formatShortDate(rangeEnd)}
        </span>
        {revealed && roundPoints !== null && (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
            color: '#22c55e',
            fontWeight: 700,
          }}>
            +{roundPoints.toLocaleString()} pts
          </span>
        )}
      </div>

      {/* SVG timeline */}
      <svg
        ref={svgRef}
        className="vim-timeline-svg"
        viewBox="0 0 1000 120"
        preserveAspectRatio="none"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{ cursor: revealed ? 'default' : 'crosshair' }}
        role="img"
        aria-label="Commit activity timeline — click to guess when this function was last modified"
      >
        <defs>
          <linearGradient id={`sparkGradient-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#569cd6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#264f78" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Sparkline fill */}
        {sparkPath.path && (
          <path d={sparkPath.path} fill={`url(#sparkGradient-${gradientId})`} />
        )}

        {/* Hover line */}
        {hoverPct !== null && !revealed && (
          <line
            x1={hoverPct * 1000}
            x2={hoverPct * 1000}
            y1={4}
            y2={116}
            stroke="rgba(212, 212, 212, 0.4)"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* User's guess line (after reveal) */}
        {revealed && xGuess !== null && (
          <line
            x1={xGuess}
            x2={xGuess}
            y1={4}
            y2={116}
            stroke="rgba(37, 99, 235, 0.9)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Correct answer line (after reveal) */}
        {revealed && (
          <line
            x1={xCorrect}
            x2={xCorrect}
            y1={4}
            y2={116}
            stroke="rgba(34, 197, 94, 0.9)"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
          />
        )}

        {/* Hover tooltip dot */}
        {hoverPct !== null && !revealed && (
          <circle
            cx={hoverPct * 1000}
            cy={60}
            r={5}
            fill="#d4d4d4"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* Year axis */}
      {yearTicks.length > 0 && (
        <div className="vim-timeline-axis">
          {yearTicks.map((t, i) => (
            <span
              key={`${t.year}-${i}`}
              style={{
                position: 'absolute',
                left: `${t.pct}%`,
                transform: 'translateX(-50%)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '10px',
                color: '#858585',
              }}
            >
              {t.year}
            </span>
          ))}
          <div style={{ position: 'relative', height: '20px', marginTop: '4px' }}>
            {yearTicks.map((t, i) => (
              <span
                key={`${t.year}-${i}`}
                style={{
                  position: 'absolute',
                  left: `${t.pct}%`,
                  transform: 'translateX(-50%)',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '10px',
                  color: '#858585',
                }}
              >
                {t.year}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {hoverDate && !revealed && (
        <div
          className="vim-timeline-tooltip"
          style={{
            left: `${hoverPct! * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -120%)',
          }}
        >
          {formatShortDate(hoverDate)}
        </div>
      )}

      {/* After reveal: show answer info */}
      {revealed && guessMs !== null && (
        <div style={{ marginTop: '12px' }}>
          <div className="vim-reveal">
            <div className="vim-reveal-line vim-reveal-guess" />
            <span className="vim-reveal-label">Your guess:</span>
            <span style={{ color: 'rgba(37, 99, 235, 0.9)', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
              {formatShortDate(new Date(guessMs))}
            </span>
          </div>
          <div className="vim-reveal">
            <div className="vim-reveal-line vim-reveal-correct" />
            <span className="vim-reveal-label">Correct:</span>
            <span style={{ color: '#22c55e', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
              {formatShortDate(new Date(correctMs))}
            </span>
          </div>
          {roundPoints !== null && (
            <div style={{
              marginTop: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '13px',
              color: '#dcdcaa',
            }}>
              <strong>+{roundPoints.toLocaleString()}</strong> points
              {roundPoints === 1000 && <span style={{ color: '#6a9955', marginLeft: '8px' }}>// Perfect!</span>}
              {roundPoints < 100 && roundPoints > 0 && <span style={{ color: '#6a9955', marginLeft: '8px' }}>// Close!</span>}
              {roundPoints === 0 && <span style={{ color: '#f14c4c', marginLeft: '8px' }}>// Way off</span>}
            </div>
          )}
        </div>
      )}

      {/* Instruction */}
      {!revealed && (
        <p style={{
          marginTop: '12px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11px',
          color: '#6a9955',
          fontStyle: 'italic',
        }}>
          // Click on the timeline to guess when this function was last modified
        </p>
      )}
    </div>
  );
}
