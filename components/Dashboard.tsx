'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Files, Code, Layers, AlertTriangle, TrendingUp, FolderTree, ChevronDown, ChevronRight, Bot, RefreshCw } from 'lucide-react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import { buildDirectoryTree } from '@/lib/parser';
import Games from './Games';

interface DashboardProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  questions: GameQuestion[];
}

const LOAD_COLORS = {
  low: '#34D399',
  medium: '#FBBF24',
  high: '#F97316',
  critical: '#F87171',
};

const LANG_COLORS = ['#7B5CFF', '#5C8FFF', '#34D399', '#FBBF24', '#F97316', '#F87171', '#EC4899', '#8B5CF6'];

export default function Dashboard({ files, metrics, questions }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'games'>('overview');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['root']));
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState<{ apiKey: string; provider: 'gemini' | 'openai' }>({ apiKey: '', provider: 'gemini' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ insights: string[]; cognitiveDebtSignals: string[] } | null>(null);
  const [extraQuestions, setExtraQuestions] = useState<GameQuestion[]>([]);

  const tree = buildDirectoryTree(files);
  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'files' as const, label: 'Files' },
    { id: 'games' as const, label: 'Games' },
  ];

  const toggleDir = (path: string) => {
    const next = new Set(expandedDirs);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedDirs(next);
  };

  const runAIAnalysis = async () => {
    if (!aiConfig.apiKey) return;
    setAiLoading(true);
    try {
      const { generateAIQuestions, analyzeWithAI } = await import('@/lib/ai');
      const [analysis, newQuestions] = await Promise.all([
        analyzeWithAI(files, metrics, { apiKey: aiConfig.apiKey, provider: aiConfig.provider }),
        generateAIQuestions(files, metrics, { apiKey: aiConfig.apiKey, provider: aiConfig.provider }),
      ]);
      setAiInsights(analysis);
      setExtraQuestions(newQuestions);
    } catch (err) {
      console.error('AI analysis failed:', err);
    }
    setAiLoading(false);
  };

  const allQuestions = [...questions, ...extraQuestions];

  return (
    <section style={{ padding: '80px 0 120px' }}>
      <div className="container">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '40px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'Outfit',
              fontSize: '32px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '8px',
            }}>
              Your Codebase
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              {metrics.totalFiles.toLocaleString()} files · {metrics.totalLines.toLocaleString()} lines · {metrics.languageDistribution.length} languages
            </p>
          </div>

          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--border-subtle)' }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 20px',
                  background: activeTab === tab.id ? 'var(--bg-elevated)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'Outfit',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {[
                { icon: Files, label: 'Files', value: metrics.totalFiles.toLocaleString(), color: 'var(--accent)' },
                { icon: Code, label: 'Lines', value: metrics.totalLines.toLocaleString(), color: '#5C8FFF' },
                { icon: Layers, label: 'Languages', value: String(metrics.languageDistribution.length), color: '#34D399' },
                { icon: AlertTriangle, label: 'Complexity', value: metrics.estimatedCognitiveLoad, color: LOAD_COLORS[metrics.estimatedCognitiveLoad] },
              ].map(({ icon: Icon, label, value, color }, i) => (
                <div key={i} className="card animate-fade-up" style={{ padding: '24px', animationDelay: `${i * 80}ms` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'JetBrains Mono' }}>{label}</span>
                    <Icon size={16} color={color} />
                  </div>
                  <div style={{ fontFamily: 'Outfit', fontSize: '32px', fontWeight: 700, color, letterSpacing: '-0.02em', textTransform: 'capitalize' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
              <div className="card animate-fade-up" style={{ padding: '28px', animationDelay: '320ms' }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--accent)', borderRadius: '50%', display: 'inline-block' }} />
                  Language Distribution
                </h3>
                <div style={{ height: '240px' }}>
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
                        contentStyle={{ background: '#16161D', border: '1px solid #2A2A36', borderRadius: '8px', fontSize: '13px' }}
                        formatter={(value: number) => [`${value.toLocaleString()} lines`, 'Lines']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '16px' }}>
                  {metrics.languageDistribution.slice(0, 6).map((lang, i) => (
                    <div key={lang.language} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: LANG_COLORS[i], display: 'inline-block' }} />
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{lang.language}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card animate-fade-up" style={{ padding: '28px', animationDelay: '400ms' }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color="var(--accent)" />
                  Lines by Language
                </h3>
                <div style={{ height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.languageDistribution.slice(0, 8)} layout="vertical">
                      <XAxis type="number" stroke="#5C5C6E" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="language" stroke="#5C5C6E" fontSize={11} width={70} />
                      <Tooltip
                        contentStyle={{ background: '#16161D', border: '1px solid #2A2A36', borderRadius: '8px', fontSize: '13px' }}
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
            <div className="card animate-fade-up" style={{ padding: '28px', animationDelay: '480ms', marginBottom: '32px' }}>
              <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, marginBottom: '20px' }}>
                Largest Files
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {metrics.largestFiles.slice(0, 8).map((file, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'JetBrains Mono', minWidth: '20px' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: '13px', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.path}
                    </span>
                    <span style={{ fontSize: '12px', fontFamily: 'JetBrains Mono', color: 'var(--accent)' }}>
                      {file.lines.toLocaleString()} lines
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="card animate-fade-up" style={{ padding: '28px', animationDelay: '560ms' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiInsights ? '24px' : 0 }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bot size={16} color="var(--accent)" />
                  AI Insights
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>(bring your own key)</span>
                </h3>
                <button
                  onClick={() => setShowAIConfig(!showAIConfig)}
                  style={{
                    padding: '8px 16px',
                    background: showAIConfig ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {showAIConfig ? 'Hide' : 'Configure'}
                </button>
              </div>

              {showAIConfig && (
                <div style={{
                  padding: '24px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '24px',
                }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                    Add your API key for cognitive debt analysis and unlimited game questions.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <select
                      value={aiConfig.provider}
                      onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value as 'openai' | 'gemini' })}
                      style={{
                        padding: '12px 16px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="gemini">Gemini</option>
                      <option value="openai">OpenAI</option>
                    </select>
                    <input
                      type="password"
                      placeholder="API key..."
                      value={aiConfig.apiKey}
                      onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    onClick={runAIAnalysis}
                    disabled={!aiConfig.apiKey || aiLoading}
                    className="btn-primary"
                    style={{ opacity: !aiConfig.apiKey || aiLoading ? 0.5 : 1, fontSize: '14px', padding: '12px 24px' }}
                  >
                    {aiLoading ? (
                      <><RefreshCw size={14} className="animate-spin" /> Analyzing...</>
                    ) : (
                      <><Bot size={14} /> Run AI Analysis</>
                    )}
                  </button>
                </div>
              )}

              {aiInsights && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <h4 style={{ fontSize: '13px', color: '#34D399', fontWeight: 600, marginBottom: '12px', fontFamily: 'Outfit' }}>💡 Insights</h4>
                    {aiInsights.insights.map((insight, i) => (
                      <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', paddingLeft: '14px', borderLeft: '2px solid #34D399', lineHeight: 1.6 }}>
                        {insight}
                      </p>
                    ))}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '13px', color: '#FBBF24', fontWeight: 600, marginBottom: '12px', fontFamily: 'Outfit' }}>⚠️ Cognitive Debt</h4>
                    {aiInsights.cognitiveDebtSignals.map((signal, i) => (
                      <p key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', paddingLeft: '14px', borderLeft: '2px solid #FBBF24', lineHeight: 1.6 }}>
                        {signal}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Files Tab */}
        {activeTab === 'files' && (
          <div className="card animate-fade-up" style={{ padding: '28px' }}>
            <h3 style={{ fontFamily: 'Outfit', fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderTree size={18} color="var(--accent)" />
              File Browser
            </h3>
            <div style={{ maxHeight: '600px', overflow: 'auto', fontFamily: 'JetBrains Mono', fontSize: '13px' }}>
              {renderTree(tree, expandedDirs, toggleDir)}
            </div>
          </div>
        )}

        {/* Games Tab */}
        {activeTab === 'games' && (
          <Games questions={allQuestions} />
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        @media (max-width: 1024px) {
          .grid-4-view { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 640px) {
          .grid-4-view { grid-template-columns: 1fr !important; }
          .grid-charts { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

function renderTree(node: ReturnType<typeof buildDirectoryTree>, expanded: Set<string>, toggle: (path: string) => void, depth = 0): React.ReactNode {
  if (depth > 4) return null;
  return (
    <div style={{ paddingLeft: depth > 0 ? '20px' : 0 }}>
      {node.children?.map((child, i) => (
        <div key={i}>
          <div
            onClick={() => child.type === 'directory' && toggle(child.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 8px',
              borderRadius: '4px',
              cursor: child.type === 'directory' ? 'pointer' : 'default',
              color: child.type === 'directory' ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {child.type === 'directory' ? (
              expanded.has(child.path)
                ? <ChevronDown size={13} />
                : <ChevronRight size={13} />
            ) : (
              <span style={{ width: '13px' }} />
            )}
            <span style={{ fontSize: '13px' }}>{child.type === 'directory' ? '📁' : '📄'}</span>
            <span>{child.name}</span>
            {child.fileInfo && (
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
                {child.fileInfo.lines} lines
              </span>
            )}
          </div>
          {child.type === 'directory' && expanded.has(child.path) && renderTree(child, expanded, toggle, depth + 1)}
        </div>
      ))}
    </div>
  );
}
