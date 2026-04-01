'use client';

import { useState, useCallback, useRef } from 'react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import { parseArchive, calculateMetrics, generateStaticQuestions } from '@/lib/parser';
import { Upload, Shield, Zap } from 'lucide-react';
import GitHubInput from './GitHubInput';
interface GitHubSource {
  owner: string;
  repo: string;
  token?: string;
}

interface HeroProps {
  onDataLoaded: (files: FileInfo[], metrics: ComplexityMetrics, questions: GameQuestion[], gitHubData?: GitHubSource) => void;
}

export default function Hero({ onDataLoaded }: HeroProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<'zip' | 'github'>('zip');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const files = await parseArchive(file);
      if (files.length === 0) {
        setError('No readable files found. Make sure you\'re uploading a valid zip/tar archive.');
        setLoading(false);
        return;
      }
      const metrics = calculateMetrics(files);
      const questions = generateStaticQuestions(files, metrics);
      onDataLoaded(files, metrics, questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse archive');
      setLoading(false);
    }
  }, [onDataLoaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleGitHubData = useCallback((
    files: FileInfo[],
    metrics: ComplexityMetrics,
    questions: GameQuestion[],
    gitHubData?: GitHubSource
  ) => {
    onDataLoaded(files, metrics, questions, gitHubData);
  }, [onDataLoaded]);

  const handleGitHubError = useCallback((msg: string) => {
    setError(msg);
  }, []);

  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      paddingTop: '80px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 50% -10%, rgba(123, 92, 255, 0.18) 0%, transparent 60%),
          radial-gradient(ellipse 60% 40% at 80% 80%, rgba(52, 211, 153, 0.06) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
      }} />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(123,92,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(123,92,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="container" style={{ width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div className="badge animate-fade-up" style={{ marginBottom: '24px', animationDelay: '0ms' }}>
            Open Source · Client-Side · AI-Powered
          </div>

          <h1 className="animate-fade-up" style={{
            fontFamily: 'var(--font-outfit)',
            fontSize: 'clamp(42px, 7vw, 80px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            marginBottom: '20px',
            animationDelay: '80ms',
          }}>
            Decode Your
            <br />
            <span className="gradient-text">Codebase</span>
            <br />
            Through Play
          </h1>

          <p className="animate-fade-up" style={{
            fontSize: '18px',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            margin: '0 auto 40px',
            lineHeight: 1.7,
            animationDelay: '160ms',
          }}>
            Upload any project archive or paste a GitHub URL. Get instant insights. Turn your code into games your team will actually want to play.
          </p>

          <div className="animate-fade-up" style={{
            display: 'flex',
            gap: '32px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            animationDelay: '240ms',
          }}>
            {[
              { icon: Shield, label: '100% Private', desc: 'Your code never leaves the browser' },
              { icon: Zap, label: 'Any Language', desc: 'JS, Python, Rust, Go, anything' },
              { icon: Shield, label: 'Games from Code', desc: 'Learn your codebase through play' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px',
                  background: 'var(--accent-subtle)',
                  border: '1px solid rgba(123,92,255,0.2)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={16} color="var(--accent)" />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>{label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Toggle */}
        <div className="animate-fade-up" style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          width: 'fit-content',
          margin: '0 auto 16px',
          border: '1px solid var(--border-subtle)',
          animationDelay: '300ms',
        }}>
          {[
            { id: 'zip' as const, label: '📦 Upload Archive' },
            { id: 'github' as const, label: '🔗 GitHub URL' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveSource(id)}
              style={{
                padding: '10px 20px',
                background: activeSource === id ? 'var(--bg-elevated)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: activeSource === id ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-outfit)',
                fontWeight: 600,
                fontSize: '14px',
                transition: 'all 0.2s',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Drop Zone / GitHub Input */}
        <div className="animate-fade-up" style={{ maxWidth: '720px', margin: '0 auto', animationDelay: '320ms' }}>
          {activeSource === 'zip' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !loading && inputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--accent)' : loading ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-xl)',
                padding: '64px 48px',
                textAlign: 'center',
                background: dragging
                  ? 'rgba(123,92,255,0.06)'
                  : loading
                    ? 'rgba(123,92,255,0.04)'
                    : 'var(--bg-card)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                cursor: loading ? 'default' : 'pointer',
                boxShadow: dragging ? '0 0 60px rgba(123,92,255,0.2)' : 'none',
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '64px', height: '64px',
                    border: '2px solid rgba(123,92,255,0.2)',
                    borderTopColor: 'var(--accent)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <p style={{ fontFamily: 'var(--font-outfit)', fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Analyzing your codebase...
                  </p>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                    Extracting files, measuring complexity, building games
                  </p>
                </div>
              ) : (
                <>
                  <div style={{
                    width: '72px', height: '72px',
                    background: 'var(--accent-subtle)',
                    border: '1px solid rgba(123,92,255,0.2)',
                    borderRadius: '20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 24px',
                    transition: 'transform 0.3s',
                    transform: dragging ? 'scale(1.1)' : 'scale(1)',
                  }}>
                    <Upload size={28} color="var(--accent)" />
                  </div>

                  <h3 style={{
                    fontFamily: 'var(--font-outfit)',
                    fontSize: '22px',
                    fontWeight: 700,
                    marginBottom: '8px',
                    color: dragging ? 'var(--accent)' : 'var(--text-primary)',
                    transition: 'color 0.2s',
                  }}>
                    {dragging ? 'Release to upload' : 'Drop your archive here'}
                  </h3>

                  <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
                    {dragging ? 'Let go and watch the magic happen' : 'or click to browse · zip, tar, gz supported'}
                  </p>

                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['.zip', '.tar', '.gz', '.tar.gz'].map(ext => (
                      <span key={ext} style={{
                        padding: '5px 12px',
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontFamily: 'var(--font-jetbrains)',
                        color: 'var(--text-muted)',
                      }}>
                        {ext}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <input
                ref={inputRef}
                type="file"
                accept=".zip,.tar,.gz,.tar.gz"
                onChange={onChange}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="card" style={{ padding: '32px' }}>
              <GitHubInput onDataLoaded={handleGitHubData} onError={handleGitHubError} />
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '14px 20px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              color: 'var(--error)',
              textAlign: 'left',
            }}>
              {error}
            </div>
          )}

          <p style={{ marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Shield size={13} />
            Your code never leaves this browser — analysis runs 100% client-side
            <span style={{ margin: '0 4px' }}>·</span>
            <a href="https://github.com/nanachichan3/unvibe" target="_blank" rel="noopener" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Open Source
            </a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </section>
  );
}
