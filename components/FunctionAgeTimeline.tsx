'use client';

import { useCallback, useId, useMemo, useRef, useState } from 'react';
import type { GameQuestion } from '@/lib/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Downsample large datasets to a target count using largest-triangle-three-buckets
function downsample<T extends { date: string; count: number }>(data: T[], target: number): T[] {
  if (data.length <= target) return data;
  const result: T[] = [data[0]!];
  const bucketSize = (data.length - 2) / (target - 2);
  let a = 0;
  for (let i = 0; i < target - 2; i++) {
    const bucketStart = Math.floor((i + 1) * bucketSize) + 1;
    const bucketEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, data.length - 1);
    let maxArea = -1, maxIdx = bucketStart;
    const ax = a, ay = data[a]!.count;
    for (let j = bucketStart; j < bucketEnd; j++) {
      const bx = j, by = data[j]!.count;
      const nextAX = (i + 2) * bucketSize / 2;
      const area = Math.abs((ax - nextAX) * (by - ay) - (bx - nextAX) * (ay - ay)) / 2;
      if (area > maxArea) { maxArea = area; maxIdx = j; }
    }
    result.push(data[maxIdx]!);
    a = maxIdx;
  }
  result.push(data[data.length - 1]!);
  return result;
}

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

  // Build sparkline path — DOWNSAMPLE to max 52 buckets to prevent lag
  const sparkPath = useMemo(() => {
    const data = question.sparklineData;
    if (!data || data.length === 0) return { path: '', maxCount: 1, buckets: [] };
    const MAX_BUCKETS = 52;
    const sampled = data.length <= MAX_BUCKETS ? data : downsample(data, MAX_BUCKETS);
    const W = 1000;
    const H = 120;
    const maxCount = Math.max(...sampled.map(d => d.count), 1);
    if (sampled.length === 1) {
      const y = H - (sampled[0]!.count / maxCount) * (H - 10);
      return { path: `M 0 ${y.toFixed(2)} L ${W} ${y.toFixed(2)} L ${W} 120 L 0 120 Z`, maxCount, buckets: sampled };
    }
    const points = sampled.map((bucket, i) => ({
      x: (i / (sampled.length - 1)) * W,
      y: H - (bucket.count / maxCount) * (H - 10),
    }));
    const line = points.slice(1).reduce((acc, pt, i) => {
      const prev = points[i]!;
      const cpX = ((prev.x + pt.x) / 2).toFixed(2);
      return `${acc} C ${cpX} ${prev.y.toFixed(2)} ${cpX} ${pt.y.toFixed(2)} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
    }, `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`);
    return { path: `${line} L 1000 120 L 0 120 Z`, maxCount, buckets: sampled };
  }, [question.sparklineData]);

  // Year ticks for axis — single render
  const yearTicks = useMemo(() => {
    if (!question.sparklineData || question.sparklineData.length === 0) return [];
    const n = question.sparklineData.length;
    const seen = new Set<number>();
    return question.sparklineData.reduce<{ year: number; pct: number }[]>((acc, d, i) => {
      const year = new Date(d.date).getFullYear();
      if (!seen.has(year)) { seen.add(year); acc.push({ year, pct: n > 1 ? (i / (n - 1)) * 100 : 50 }); }
      return acc;
    }, []);
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

      {/* Year axis — single render */}
      {yearTicks.length > 0 && (
        <div className="vim-timeline-axis">
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
