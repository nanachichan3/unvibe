'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Files, Code, Layers, AlertTriangle, TrendingUp, FolderTree, ChevronDown, ChevronRight } from 'lucide-react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '../lib/types';
import { buildDirectoryTree } from '../lib/parser';
import Games from './Games';

interface DashboardProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  questions: GameQuestion[];
}

const LOAD_COLORS = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

export default function Dashboard({ files, metrics, questions }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'games'>('overview');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['root']));
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [aiConfig, setAiConfig] = useState({ apiKey: '', provider: 'gemini' as 'openai' | 'gemini' });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ insights: string[]; cognitiveDebtSignals: string[] } | null>(null);
  const [extraQuestions, setExtraQuestions] = useState<GameQuestion[]>([]);

  const tree = buildDirectoryTree(files);

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
      const { generateAIQuestions, analyzeWithAI } = await import('../lib/ai');
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
    <section style={{ padding: '80px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '32px', fontWeight: 700 }}>
              Your Codebase
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>
              {metrics.totalFiles.toLocaleString()} files · {metrics.totalLines.toLocaleString()} lines
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['overview', 'files', 'games'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 20px',
                  background: activeTab === tab ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                  border: `1px solid ${activeTab === tab ? 'rgba(0, 240, 255, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  color: activeTab === tab ? '#00f0ff' : 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  fontWeight: 500,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="fade-in">
            <div className="grid-4" style={{ marginBottom: '32px' }}>
              {[
                { icon: Files, label: 'Total Files', value: metrics.totalFiles.toLocaleString(), color: '#00f0ff' },
                { icon: Code, label: 'Total Lines', value: metrics.totalLines.toLocaleString(), color: '#a855f7' },
                { icon: Layers, label: 'Languages', value: metrics.languageDistribution.length.toString(), color: '#10b981' },
                { icon: AlertTriangle, label: 'Complexity', value: metrics.estimatedCognitiveLoad, color: LOAD_COLORS[metrics.estimatedCognitiveLoad] },
              ].map((stat, i) => (
                <div key={i} className="card">
                  <stat.icon size={24} color={stat.color} style={{ marginBottom: '12px' }} />
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {stat.label}
                  </div>
                  <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '28px', fontWeight: 700, color: stat.color, textTransform: 'capitalize' }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-2">
              <div className="card">
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={18} color="#00f0ff" /> Language Distribution
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.languageDistribution.slice(0, 6)}
                        dataKey="lines"
                        nameKey="language"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ language, percentage }) => `${language} ${percentage}%`}
                        labelLine={false}
                      >
                        {metrics.languageDistribution.slice(0, 6).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [`${value.toLocaleString()} lines`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Code size={18} color="#a855f7" /> Lines by Language
                </h3>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.languageDistribution.slice(0, 8)} layout="vertical">
                      <XAxis type="number" stroke="#666" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="language" stroke="#666" fontSize={12} width={80} />
                      <Tooltip
                        contentStyle={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={(value: number) => [`${value.toLocaleString()} lines`, 'Lines']}
                      />
                      <Bar dataKey="lines" radius={[0, 4, 4, 0]}>
                        {metrics.languageDistribution.slice(0, 8).map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: '24px' }}>
              <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Files size={18} color="#ff00ff" /> Largest Files
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {metrics.largestFiles.slice(0, 10).map((file, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '8px',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', minWidth: '24px' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '13px' }}>{file.path}</span>
                    <span style={{ color: '#00f0ff', fontFamily: 'monospace', fontSize: '13px' }}>{file.lines} lines</span>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Section */}
            <div className="card" style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiInsights ? '24px' : 0 }}>
                <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  🤖 AI Insights (Optional)
                </h3>
                <button
                  onClick={() => setShowAIConfig(!showAIConfig)}
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(168, 85, 247, 0.1)',
                    border: '1px solid rgba(168, 85, 247, 0.3)',
                    borderRadius: '8px',
                    color: '#a855f7',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {showAIConfig ? 'Hide' : 'Configure'}
                </button>
              </div>

              {showAIConfig && (
                <div style={{
                  padding: '24px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: '12px',
                  marginBottom: '24px',
                }}>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '16px' }}>
                    Add your API key to unlock AI-powered insights and unlimited game questions. Keys are never stored — they stay in your browser.
                  </p>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <select
                      value={aiConfig.provider}
                      onChange={(e) => setAiConfig({ ...aiConfig, provider: e.target.value as 'openai' | 'gemini' })}
                      style={{
                        padding: '12px 16px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
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
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <button
                    onClick={runAIAnalysis}
                    disabled={!aiConfig.apiKey || aiLoading}
                    className="btn-primary"
                    style={{ opacity: !aiConfig.apiKey || aiLoading ? 0.5 : 1 }}
                  >
                    {aiLoading ? 'Analyzing...' : 'Run AI Analysis'}
                  </button>
                </div>
              )}

              {aiInsights && (
                <div className="grid-2">
                  <div>
                    <h4 style={{ fontSize: '14px', color: '#10b981', fontWeight: 600, marginBottom: '12px' }}>💡 Insights</h4>
                    {aiInsights.insights.map((insight, i) => (
                      <p key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', paddingLeft: '16px', borderLeft: '2px solid #10b981' }}>
                        {insight}
                      </p>
                    ))}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', color: '#f59e0b', fontWeight: 600, marginBottom: '12px' }}>⚠️ Cognitive Debt Signals</h4>
                    {aiInsights.cognitiveDebtSignals.map((signal, i) => (
                      <p key={i} style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px', paddingLeft: '16px', borderLeft: '2px solid #f59e0b' }}>
                        {signal}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="card fade-in">
            <h3 style={{ fontFamily: 'Space Grotesk, sans-serif', fontSize: '18px', fontWeight: 600, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderTree size={18} color="#00f0ff" /> File Browser
            </h3>
            <div style={{
              maxHeight: '600px',
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: '13px',
            }}>
              {renderTree(tree, expandedDirs, toggleDir)}
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <Games questions={allQuestions} />
        )}
      </div>
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
              gap: '8px',
              padding: '6px 8px',
              borderRadius: '4px',
              cursor: child.type === 'directory' ? 'pointer' : 'default',
              color: child.type === 'directory' ? '#00f0ff' : 'rgba(255,255,255,0.8)',
            }}
          >
            {child.type === 'directory' ? (
              expanded.has(child.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span style={{ width: '14px' }} />
            )}
            <span style={{ fontSize: '12px' }}>{child.type === 'directory' ? '📁' : '📄'}</span>
            <span>{child.name}</span>
            {child.fileInfo && (
              <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                {child.fileInfo.lines} lines
              </span>
            )}
          </div>
          {child.type === 'directory' && expanded.has(child.path) && (
            renderTree(child, expanded, toggle, depth + 1)
          )}
        </div>
      ))}
    </div>
  );
}
