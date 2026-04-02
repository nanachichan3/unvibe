'use client';

import { useState, useCallback, useRef } from 'react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import { parseArchive, calculateMetrics, generateStaticQuestions } from '@/lib/parser';
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
      background: 'var(--vim-bg)',
    }}>
      {/* Subtle grid pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(86, 156, 214, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(86, 156, 214, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      {/* Cursor blink accent */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '10%',
        width: '2px',
        height: '60px',
        background: 'var(--vim-keyword)',
        animation: 'vim-blink 1s step-end infinite',
        opacity: 0.3,
      }} />

      <div className="container" style={{ width: '100%', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: '40px' }}>
          {/* Comment-style header */}
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            color: 'var(--vim-comment)',
            marginBottom: '16px',
            lineHeight: 1.8,
          }}>
            <div>{"// unvibe — codebase exploration through games"}</div>
            <div>{"// open source · client-side only · no data leaves your browser"}</div>
          </div>

          {/* Main title — vim style */}
          <h1 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'clamp(32px, 5vw, 64px)',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            marginBottom: '20px',
            color: 'var(--vim-fg)',
          }}>
            <span style={{ color: 'var(--vim-comment)' }}>~</span>
            {' Decode your '}
            <span style={{ color: 'var(--vim-keyword)' }}>codebase</span>
            <br />
            <span style={{ color: 'var(--vim-comment)' }}>{'->'}</span>
            {' through '}
            <span style={{
              background: 'linear-gradient(90deg, #569cd6, #6eb0f0, #34d399)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>play</span>
          </h1>

          <p style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
            color: 'var(--vim-comment)',
            maxWidth: '540px',
            marginBottom: '32px',
            lineHeight: 1.7,
          }}>
            Upload any project archive or paste a GitHub URL.
            Get instant insights. Turn your code into games your team will actually want to play.
          </p>

          {/* Feature flags in vim style */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
          }}>
            {[
              { label: 'private', desc: '100% client-side' },
              { label: 'any-lang', desc: 'JS, Python, Rust, Go...' },
              { label: 'games', desc: 'learn by playing' },
            ].map(({ label, desc }) => (
              <span key={label} style={{
                color: 'var(--vim-comment)',
                background: 'var(--vim-active-line)',
                border: '1px solid var(--vim-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
              }}>
                <span style={{ color: 'var(--vim-keyword)' }}>[</span>
                {label}
                <span style={{ color: 'var(--vim-keyword)' }}>]</span>
                <span style={{ color: 'var(--vim-line-number)', marginLeft: '6px' }}>// {desc}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Source toggle :set command style */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '16px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
        }}>
          <span style={{ color: 'var(--vim-comment)', marginRight: '8px' }}>:set source=</span>
          {[
            { id: 'zip' as const, label: 'zip' },
            { id: 'github' as const, label: 'github' },
          ].map(({ id, label }) => (
            <span
              key={id}
              onClick={() => setActiveSource(id)}
              style={{
                color: activeSource === id ? 'var(--vim-keyword)' : 'var(--vim-string)',
                background: activeSource === id ? 'rgba(86,156,214,0.1)' : 'transparent',
                border: `1px solid ${activeSource === id ? 'var(--vim-keyword)' : 'var(--vim-border)'}`,
                borderRadius: 'var(--radius-sm)',
                padding: '3px 10px',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {label}
            </span>
          ))}
        </div>

        {/* Drop zone / GitHub Input */}
        <div style={{ maxWidth: '720px' }}>
          {activeSource === 'zip' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => !loading && inputRef.current?.click()}
              className="drop-zone"
              style={{
                border: `2px dashed ${dragging ? 'var(--vim-keyword)' : loading ? 'var(--vim-keyword)' : 'var(--vim-border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '48px 32px',
                textAlign: 'center',
                background: dragging ? 'rgba(86,156,214,0.04)' : 'transparent',
                cursor: loading ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  {/* Spinner */}
                  <div style={{
                    width: '32px', height: '32px',
                    border: '2px solid rgba(86,156,214,0.2)',
                    borderTopColor: 'var(--vim-keyword)',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: 'var(--vim-fg)' }}>
                    <span style={{ color: 'var(--vim-keyword)' }}>$</span>
                    {' '}analyzing codebase...
                  </div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: 'var(--vim-comment)' }}>
                    extracting files, measuring complexity, building games
                  </div>
                </div>
              ) : (
                <div>
                  {/* Terminal prompt style */}
                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                    color: 'var(--vim-function)',
                    marginBottom: '16px',
                  }}>
                    <span style={{ color: 'var(--vim-keyword)' }}>$</span>
                    {' '}
                    <span style={{ color: 'var(--vim-fg)' }}>drop archive here</span>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '14px',
                      background: 'var(--vim-cursor)',
                      marginLeft: '2px',
                      verticalAlign: 'middle',
                      animation: 'vim-blink 1s step-end infinite',
                    }} />
                  </div>

                  <div style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    color: 'var(--vim-comment)',
                    marginBottom: '20px',
                  }}>
                    or click to browse · zip, tar, gz supported
                  </div>

                  {/* File type tags */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {['.zip', '.tar', '.gz', '.tar.gz'].map(ext => (
                      <span key={ext} style={{
                        padding: '4px 10px',
                        background: 'var(--vim-active-line)',
                        border: '1px solid var(--vim-border)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '11px',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: 'var(--vim-string)',
                      }}>
                        {ext}
                      </span>
                    ))}
                  </div>
                </div>
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
            <div className="card" style={{ padding: '24px' }}>
              <GitHubInput onDataLoaded={handleGitHubData} onError={handleGitHubError} />
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(241, 76, 76, 0.08)',
              border: '1px solid rgba(241, 76, 76, 0.25)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: 'var(--error)',
            }}>
              <span style={{ color: 'var(--vim-keyword)' }}>E:</span> {error}
            </div>
          )}

          {/* Privacy note */}
          <div style={{
            marginTop: '16px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '11px',
            color: 'var(--vim-comment)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ color: 'var(--vim-keyword)' }}>//</span>
            your code never leaves this browser
            <span style={{ color: 'var(--vim-border)', margin: '0 4px' }}>|</span>
            <a
              href="https://github.com/nanachichan3/unvibe"
              target="_blank"
              rel="noopener"
              style={{ color: 'var(--vim-keyword)', textDecoration: 'none' }}
            >
              github.com/nanachichan3/unvibe
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes vim-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </section>
  );
}
