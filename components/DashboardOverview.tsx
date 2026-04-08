'use client';

import { useMemo, useState } from 'react';
import { Files, Code, Layers, AlertTriangle, Bot, RefreshCw, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { FileInfo, ComplexityMetrics } from '@/lib/types';
import { escapeHtml } from '@/lib/sanitize';
import { buildDirectoryTree } from '@/lib/parser';

const LOAD_COLORS: Record<string, string> = {
  low: '#34D399',
  medium: '#FBBF24',
  high: '#F97316',
  critical: '#F87171',
};

const LANG_COLORS = ['#569cd6', '#4ec9b0', '#22c55e', '#fbbf24', '#f97316', '#f87171', '#ec4899', '#8b5cf6'];

interface DashboardOverviewProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  showDebug: boolean;
  debugQuery: string;
  debugPage: number;
  debugTotalPages: number;
  safeDebugPage: number;
  debugPageItems: FileInfo[];
  onToggleDebug: () => void;
  onDebugQueryChange: (q: string) => void;
  onDebugPageChange: (p: number) => void;
}

export function DashboardOverview({
  files,
  metrics,
}: DashboardOverviewProps) {
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({ apiKey: '', provider: 'gemini' as 'gemini' | 'openai' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ insights: string[]; cognitiveDebtSignals: string[] } | null>(null);

  const updateAiConfig = (config: typeof aiConfig) => {
    setAiConfig(config);
    try {
      localStorage.setItem('unvibe_api_key', config.apiKey);
      localStorage.setItem('unvibe_api_provider', config.provider);
    } catch { /* ignore */ }
  };

  const runAIAnalysis = async () => {
    if (!aiConfig.apiKey) return;
    setAiLoading(true);
    setAiError(null);
    setAiSuccess(false);
    try {
      const { analyzeWithAI } = await import('@/lib/ai');
      const analysis = await analyzeWithAI(files, metrics, { apiKey: aiConfig.apiKey, provider: aiConfig.provider });
      setAiInsights(analysis);
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 3000);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI analysis failed. Check your API key and try again.');
    }
    setAiLoading(false);
  };

  return (
    <div>
      {/* Stat tiles */}
      <div className="db-grid" style={{ marginBottom: 24 }}>
        <div className="db-tile tile-dark span-3">
          <span className="tile-tag">
            <Files size={11} style={{ display: 'inline', marginRight: 4 }} />
            Files
          </span>
          <div className="tile-big">{metrics.totalFiles.toLocaleString()}</div>
          <p className="tile-sub">source files analyzed</p>
        </div>

        <div className="db-tile tile-dark span-3">
          <span className="tile-tag">
            <Code size={11} style={{ display: 'inline', marginRight: 4 }} />
            Lines
          </span>
          <div className="tile-big">{metrics.totalLines.toLocaleString()}</div>
          <p className="tile-sub">total lines of code</p>
        </div>

        <div className="db-tile tile-dark span-3">
          <span className="tile-tag">
            <Layers size={11} style={{ display: 'inline', marginRight: 4 }} />
            Languages
          </span>
          <div className="tile-big tile-big--ink">{metrics.languageDistribution.length}</div>
          <p className="tile-sub">different languages</p>
        </div>

        <div className="db-tile tile-dark span-3">
          <span className="tile-tag">
            <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
            Complexity
          </span>
          <div className="tile-big" style={{ color: LOAD_COLORS[metrics.estimatedCognitiveLoad] }}>
            {metrics.estimatedCognitiveLoad}
          </div>
          <p className="tile-sub">cognitive load estimate</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="db-grid" style={{ marginBottom: 24 }}>
        {/* Language pie */}
        <div className="db-tile tile-dark span-6">
          <span className="tile-tag tile-tag--muted">Language Distribution</span>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.languageDistribution.slice(0, 6)}
                  dataKey="lines"
                  nameKey="language"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  label={({ language, percentage }) => `${percentage}%`}
                  labelLine={false}
                >
                  {metrics.languageDistribution.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={LANG_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: 4, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                  formatter={(value: number) => [`${value.toLocaleString()} lines`, 'Lines']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            {metrics.languageDistribution.slice(0, 6).map((lang, i) => (
              <div key={lang.language} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: LANG_COLORS[i], display: 'inline-block' }} />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--vim-comment)' }}>{lang.language}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lines by language bar */}
        <div className="db-tile tile-dark span-6">
          <span className="tile-tag tile-tag--muted">Lines by Language</span>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.languageDistribution.slice(0, 8)} layout="vertical">
                <XAxis type="number" stroke="#5c5c6e" fontSize={11} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="language" stroke="#5c5c6e" fontSize={11} width={70} />
                <Tooltip
                  contentStyle={{ background: '#1e1e1e', border: '1px solid #3c3c3c', borderRadius: 4, fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                  formatter={(value: number) => [`${value.toLocaleString()} lines`, 'Lines']}
                />
                <Bar dataKey="lines" radius={[0, 4, 4, 0]}>
                  {metrics.languageDistribution.slice(0, 8).map((_, i) => (
                    <Cell key={i} fill={LANG_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Largest files */}
      <div className="db-tile tile-dark span-12" style={{ marginBottom: 24 }}>
        <span className="tile-tag tile-tag--muted">Largest Files</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {metrics.largestFiles.slice(0, 8).map((file, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              background: 'var(--vim-bg)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <span style={{ color: 'var(--vim-line-number)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", minWidth: 20 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: 'var(--vim-comment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {escapeHtml(file.path)}
              </span>
              <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--vim-keyword)' }}>
                {file.lines.toLocaleString()} lines
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* File type distribution */}
      <div className="db-grid" style={{ marginBottom: 24 }}>
        <div className="db-tile tile-dark span-6">
          <span className="tile-tag tile-tag--muted">File Types</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metrics.fileTypeDistribution.slice(0, 8).map((ext, i) => (
              <div key={ext.ext} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--vim-comment)', minWidth: 60 }}>{ext.ext}</span>
                <div className="channel-bar-track" style={{ flex: 1 }}>
                  <div className="channel-bar-fill" style={{
                    width: `${Math.round((ext.count / (metrics.fileTypeDistribution[0]?.count ?? 1)) * 100)}%`,
                    background: LANG_COLORS[i % LANG_COLORS.length],
                  }} />
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--vim-comment)', minWidth: 30, textAlign: 'right' }}>
                  {ext.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Deepest directories */}
        <div className="db-tile tile-dark span-6">
          <span className="tile-tag tile-tag--muted">Deepest Directories</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metrics.deepestDirectories.map((dir, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                background: 'var(--vim-bg)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--vim-line-number)', minWidth: 30 }}>{dir.depth}x</span>
                <span style={{ flex: 1, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: 'var(--vim-comment)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {escapeHtml(dir.path)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div className="db-tile tile-dark span-12">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAIConfig || aiInsights ? 24 : 0 }}>
          <span className="tile-tag" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Bot size={11} />
            AI Insights
            <span style={{ fontSize: 10, color: 'var(--vim-line-number)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(BYOK)</span>
          </span>
          <button
            className="db-reset-btn"
            onClick={() => setShowAIConfig(prev => !prev)}
            style={{ fontSize: 11, padding: '4px 12px' }}
          >
            {showAIConfig ? 'Hide' : 'Configure'}
          </button>
        </div>

        {showAIConfig && (
          <div style={{
            padding: 24,
            background: 'var(--vim-bg)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 24,
          }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--vim-comment)', marginBottom: 16 }}>
              Add your API key for cognitive debt analysis. Your key is stored locally and never sent to our servers.
            </p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <select
                value={aiConfig.provider}
                onChange={e => updateAiConfig({ ...aiConfig, provider: e.target.value as 'gemini' | 'openai' })}
                style={{ padding: '10px 14px', minWidth: 120 }}
              >
                <option value="gemini">Gemini</option>
                <option value="openai">OpenAI</option>
              </select>
              <input
                type="password"
                placeholder="Paste your API key..."
                value={aiConfig.apiKey}
                onChange={e => updateAiConfig({ ...aiConfig, apiKey: e.target.value })}
                style={{ flex: 1, minWidth: 200 }}
              />
            </div>

            {aiError && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: 8,
                fontSize: 12,
                color: '#f87171',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                {aiError}
              </div>
            )}

            {aiSuccess && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(52,211,153,0.08)',
                border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 8,
                fontSize: 12,
                color: '#34d399',
                marginBottom: 12,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                ✓ AI analysis complete — insights shown below.
              </div>
            )}

            <button
              onClick={runAIAnalysis}
              disabled={!aiConfig.apiKey || aiLoading}
              className="btn-primary"
              style={{ opacity: !aiConfig.apiKey || aiLoading ? 0.5 : 1, fontSize: 13, padding: '10px 20px' }}
            >
              {aiLoading ? (
                <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing...</>
              ) : (
                <><Bot size={14} /> Run AI Analysis</>
              )}
            </button>
          </div>
        )}

        {aiInsights && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#34d399', fontWeight: 600, marginBottom: 12 }}>
                💡 Insights
              </h4>
              {aiInsights.insights.map((insight, i) => (
                <p key={i} style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: 'var(--vim-comment)',
                  marginBottom: 10,
                  paddingLeft: 14,
                  borderLeft: '2px solid #34d399',
                  lineHeight: 1.6,
                }}>
                  {insight}
                </p>
              ))}
            </div>
            <div>
              <h4 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#fbbf24', fontWeight: 600, marginBottom: 12 }}>
                ⚠️ Cognitive Debt
              </h4>
              {aiInsights.cognitiveDebtSignals.map((signal, i) => (
                <p key={i} style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: 'var(--vim-comment)',
                  marginBottom: 10,
                  paddingLeft: 14,
                  borderLeft: '2px solid #fbbf24',
                  lineHeight: 1.6,
                }}>
                  {signal}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
