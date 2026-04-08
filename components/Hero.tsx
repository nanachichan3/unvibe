'use client';

import { useState, useCallback, useRef } from 'react';
import { Github, ExternalLink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { FileInfo, ComplexityMetrics, GameQuestion } from '@/lib/types';
import { calculateMetrics, generateStaticQuestions } from '@/lib/parser';

interface HeroProps {
  onFile: (file: File) => void;
  onGitHubData: (files: FileInfo[], metrics: ComplexityMetrics, questions: GameQuestion[], gitHubData: { owner: string; repo: string; token?: string }) => void;
  onError: (msg: string) => void;
}

function githubHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const sshMatch = input.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2].replace('.git', '') };
  const httpsMatch = input.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2].replace('.git', '') };
  return null;
}

async function fetchAllFiles(
  owner: string, repo: string, branch: string, headers: Record<string, string>
): Promise<FileInfo[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );
  if (!res.ok) throw new Error(`Could not fetch repository tree (${res.status}).`);
  const data = await res.json();
  const tree: Array<{ path: string; type: string; size: number }> = data.tree || [];

  const TEXT_EXTS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.cs',
    '.cpp', '.c', '.h', '.hpp', '.swift', '.vue', '.svelte', '.html', '.css', '.scss', '.less',
    '.json', '.jsonc', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env', '.md', '.sql', '.sh', '.bash',
    '.zsh', '.ps1', '.tf', '.tfvars', '.graphql', '.ex', '.exs', '.erl', '.hs', '.ml', '.clj', '.scala',
    '.lua', '.dart', '.r', '.m', '.mm', '.php', '.blade.php',
  ]);

  const sourceFiles = tree
    .filter((f) =>
      f.type === 'blob' &&
      !f.path.includes('node_modules/') &&
      !f.path.includes('.git/') &&
      !f.path.startsWith('dist/') &&
      !f.path.startsWith('build/') &&
      !f.path.startsWith('vendor/')
    )
    .slice(0, 2000);

  const toFetch = sourceFiles.filter(f => {
    const ext = f.path.substring(f.path.lastIndexOf('.')).toLowerCase();
    return TEXT_EXTS.has(ext);
  });

  const files: FileInfo[] = [];
  for (let i = 0; i < toFetch.length; i += 5) {
    const batch = toFetch.slice(i, i + 5);
    const results = await Promise.allSettled(
      batch.map(f => fetchFileContent(owner, repo, branch, f.path, f.size, headers))
    );
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const file = toFetch[i + j];
      if (result.status === 'fulfilled' && result.value) {
        files.push(result.value);
      } else {
        const ext = file.path.substring(file.path.lastIndexOf('.')).toLowerCase() || '';
        files.push({ path: file.path, name: file.path.split('/').pop() || file.path, extension: ext, size: file.size, lines: 0 });
      }
    }
  }
  return files;
}

async function fetchFileContent(
  owner: string, repo: string, branch: string, path: string, size: number, headers: Record<string, string>
): Promise<FileInfo | null> {
  try {
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase() || '';
    if (size > 200 * 1024) {
      return { path, name: path.split('/').pop() || path, extension: ext, size, lines: 0 };
    }
    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      { headers: { Accept: 'text/plain' } }
    );
    if (!res.ok) return null;
    const content = await res.text();
    return { path, name: path.split('/').pop() || path, extension: ext, size: content.length, lines: content.split('\n').length, content: content.substring(0, 3000) };
  } catch {
    return null;
  }
}

export default function Hero({ onFile, onGitHubData, onError }: HeroProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<'zip' | 'github'>('zip');
  const [ghUrl, setGhUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [ghStep, setGhStep] = useState<'idle' | 'loading' | 'error'>('idle');
  const [ghError, setGhError] = useState('');
  const [ghRepoInfo, setGhRepoInfo] = useState<{ owner: string; repo: string; files: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const { parseArchive, calculateMetrics, generateStaticQuestions } = await import('@/lib/parser');
      const files = await parseArchive(file);
      if (files.length === 0) {
        setError('No readable files found. Make sure you\'re uploading a valid zip/tar archive.');
        setLoading(false);
        return;
      }
      const metrics = calculateMetrics(files);
      const questions = generateStaticQuestions(files, metrics);
      onFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse archive');
      setLoading(false);
    }
  }, [onFile]);

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

  const handleGhFetch = useCallback(async () => {
    if (!ghUrl.trim()) return;
    setGhStep('loading');
    setGhError('');
    setGhRepoInfo(null);

    const parsed = parseGitHubUrl(ghUrl.trim());
    if (!parsed) {
      setGhStep('error');
      setGhError('Invalid GitHub URL. Use format: https://github.com/user/repo');
      return;
    }

    const { owner, repo } = parsed;
    const hdrs = githubHeaders(ghToken || undefined);

    try {
      const infoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: hdrs });
      if (!infoRes.ok) {
        if (infoRes.status === 404) {
          setGhStep('error');
          setGhError(`Repository "${owner}/${repo}" not found. Check the URL.`);
          return;
        }
        if (infoRes.status === 403) {
          setGhStep('error');
          setGhError('GitHub API rate limit exceeded. Try adding a GitHub token.');
          return;
        }
        throw new Error(`GitHub API error: ${infoRes.status}`);
      }
      const infoData = await infoRes.json();
      const branch = infoData.default_branch || 'main';
      setGhRepoInfo({ owner, repo, files: 0 });

      const files = await fetchAllFiles(owner, repo, branch, hdrs);
      if (files.length === 0) {
        setGhStep('error');
        setGhError('No source files found in this repository.');
        return;
      }
      setGhRepoInfo({ owner, repo, files: files.length });
      const metrics = calculateMetrics(files);
      const questions = generateStaticQuestions(files, metrics);
      onGitHubData(files, metrics, questions, { owner, repo, token: ghToken || undefined });
    } catch (err) {
      setGhStep('error');
      setGhError(err instanceof Error ? err.message : 'Failed to fetch repository');
    }
  }, [ghUrl, ghToken, onGitHubData]);

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
          marginBottom: '32px',
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

        {/* Source toggle :set command style */}
        <div style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '16px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
        }}>
          <span style={{ color: 'var(--vim-comment)', marginRight: '8px' }}>:set source=</span>
          {([
            { id: 'zip' as const, label: 'zip' },
            { id: 'github' as const, label: 'github' },
          ]).map(({ id, label }) => (
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
              {/* GitHub URL */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <Github size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 14 }} />
                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={ghUrl}
                    onChange={e => { setGhUrl(e.target.value); setGhStep('idle'); setGhError(''); }}
                    placeholder="https://github.com/user/repo"
                    onKeyDown={e => e.key === 'Enter' && handleGhFetch()}
                    style={{ width: '100%' }}
                  />
                  {ghRepoInfo && (
                    <div style={{
                      marginTop: 8, padding: '10px 14px',
                      background: 'rgba(52,211,153,0.08)',
                      border: '1px solid rgba(52,211,153,0.2)',
                      borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: 13, color: '#34d399', fontFamily: "'JetBrains Mono', monospace",
                    }}>
                      <CheckCircle size={14} />
                      {ghRepoInfo.owner}/{ghRepoInfo.repo}
                      {ghRepoInfo.files > 0 ? ` · ${ghRepoInfo.files.toLocaleString()} files` : ' · fetching...'}
                      <a href={`https://github.com/${ghRepoInfo.owner}/${ghRepoInfo.repo}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--vim-keyword)' }}>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <details style={{ marginBottom: 12 }}>
                <summary style={{ fontSize: 12, color: 'var(--vim-comment)', cursor: 'pointer', userSelect: 'none', fontFamily: "'JetBrains Mono', monospace" }}>
                  {ghToken ? '✓ Token set — private repos accessible' : '+ Add GitHub token (for private repos)'}
                </summary>
                <div style={{ marginTop: 8 }}>
                  <input
                    type="password"
                    value={ghToken}
                    onChange={e => setGhToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontSize: 11, color: 'var(--vim-line-number)', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
                    Get a token at github.com/settings/tokens — needs &apos;repo&apos; scope for private repos
                  </p>
                </div>
              </details>

              {ghStep === 'error' && ghError && (
                <div style={{
                  padding: '10px 14px', background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8,
                  fontSize: 12, color: '#f87171', marginBottom: 12, display: 'flex', alignItems: 'flex-start', gap: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {ghError}
                </div>
              )}

              <button
                onClick={handleGhFetch}
                disabled={!ghUrl.trim() || ghStep === 'loading'}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: !ghUrl.trim() || ghStep === 'loading' ? 0.5 : 1, fontSize: 14, padding: '12px 24px' }}
              >
                {ghStep === 'loading' ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Fetching repository...</>
                ) : (
                  <><Github size={14} /> Analyze GitHub Repo</>
                )}
              </button>

              <p style={{ fontSize: 11, color: 'var(--vim-comment)', marginTop: 8, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }}>
                Only public data is fetched — nothing is stored
              </p>
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
