'use client';

import { useState, useCallback, useMemo } from 'react';
import { FolderTree, ChevronDown, ChevronRight, Github, ExternalLink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { FileInfo, ComplexityMetrics } from '@/lib/types';
import { buildDirectoryTree } from '@/lib/parser';
import { escapeHtml } from '@/lib/sanitize';

interface GitHubSource {
  owner: string;
  repo: string;
  token?: string;
}

interface GitHubRoundData {
  fileCommits: Record<string, string[]>;
  allCommitDates: string[];
  fileAuthors: Record<string, string>;
  repoStart: string;
  repoEnd: string;
}

interface DashboardFilesProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  gitHubData?: GitHubSource;
  onGitHubRoundData: (data: GitHubRoundData | null) => void;
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

export function DashboardFiles({ files, metrics, gitHubData, onGitHubRoundData }: DashboardFilesProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['root']));
  const [ghUrl, setGhUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [ghStep, setGhStep] = useState<'idle' | 'loading' | 'error'>('idle');
  const [ghError, setGhError] = useState('');
  const [ghRepoInfo, setGhRepoInfo] = useState<{ owner: string; repo: string; branch: string; files: number } | null>(null);

  const tree = useMemo(() => buildDirectoryTree(files), [files]);

  const toggleDir = useCallback((path: string) => {
    setExpandedDirs(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

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
      // Get repo info
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
      setGhRepoInfo({ owner, repo, branch, files: 0 });

      // Fetch all files via tree API
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: hdrs }
      );
      if (!treeRes.ok) throw new Error(`Could not fetch repo tree (${treeRes.status})`);

      const treeData = await treeRes.json();
      const tree: Array<{ path: string; type: string; size: number }> = treeData.tree || [];

      const sourceFiles = tree
        .filter((f: { type: string; path: string }) =>
          f.type === 'blob' &&
          !f.path.includes('node_modules/') &&
          !f.path.includes('.git/') &&
          !f.path.startsWith('dist/') &&
          !f.path.startsWith('build/') &&
          !f.path.startsWith('vendor/')
        )
        .slice(0, 2000);

      setGhRepoInfo({ owner, repo, branch, files: sourceFiles.length });
      setGhStep('idle');

      // Build GitHub round data for games
      onGitHubRoundData({
        fileCommits: {},
        allCommitDates: [],
        fileAuthors: {},
        repoStart: infoData.created_at,
        repoEnd: infoData.pushed_at,
      });

    } catch (err) {
      setGhStep('error');
      setGhError(err instanceof Error ? err.message : 'Failed to fetch repository');
    }
  }, [ghUrl, ghToken, onGitHubRoundData]);

  return (
    <div>
      {/* Stats summary */}
      <div className="db-grid" style={{ marginBottom: 24 }}>
        <div className="db-tile tile-dark span-4">
          <span className="tile-tag">Total Files</span>
          <div className="tile-big">{metrics.totalFiles.toLocaleString()}</div>
        </div>
        <div className="db-tile tile-dark span-4">
          <span className="tile-tag">Total Lines</span>
          <div className="tile-big">{metrics.totalLines.toLocaleString()}</div>
        </div>
        <div className="db-tile tile-dark span-4">
          <span className="tile-tag">Languages</span>
          <div className="tile-big">{metrics.languageDistribution.length}</div>
        </div>
      </div>

      {/* GitHub input */}
      {gitHubData && (
        <div className="db-tile tile-dark span-12" style={{ marginBottom: 24 }}>
          <span className="tile-tag tile-tag--muted">
            <Github size={11} style={{ display: 'inline', marginRight: 4 }} />
            GitHub Repository
          </span>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--vim-comment)', marginBottom: 16 }}>
            Connected to <strong style={{ color: 'var(--vim-keyword)' }}>{gitHubData.owner}/{gitHubData.repo}</strong>
            {gitHubData.token && <span style={{ marginLeft: 8, color: '#34d399' }}>✓ Token set</span>}
          </p>

          <details>
            <summary style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: 'var(--vim-comment)',
              cursor: 'pointer',
              userSelect: 'none',
            }}>
              {ghRepoInfo ? `Connected: ${ghRepoInfo.owner}/${ghRepoInfo.repo} · ${ghRepoInfo.files} files` : '+ Fetch a different repository'}
            </summary>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={ghUrl}
                  onChange={e => { setGhUrl(e.target.value); setGhStep('idle'); setGhError(''); }}
                  placeholder="https://github.com/user/repo"
                  onKeyDown={e => e.key === 'Enter' && handleGhFetch()}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={handleGhFetch}
                  disabled={!ghUrl.trim() || ghStep === 'loading'}
                  className="btn-primary"
                  style={{ opacity: !ghUrl.trim() || ghStep === 'loading' ? 0.5 : 1, fontSize: 12, padding: '10px 16px' }}
                >
                  {ghStep === 'loading' ? (
                    <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Fetching...</>
                  ) : (
                    <><Github size={13} /> Fetch</>
                  )}
                </button>
              </div>

              <details style={{ marginBottom: 8 }}>
                <summary style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: 'var(--vim-comment)',
                  cursor: 'pointer',
                }}>
                  {ghToken ? '✓ Token set' : '+ Add GitHub token (for private repos)'}
                </summary>
                <div style={{ marginTop: 8 }}>
                  <input
                    type="password"
                    value={ghToken}
                    onChange={e => setGhToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxx"
                    style={{ width: '100%' }}
                  />
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--vim-line-number)', marginTop: 6 }}>
                    Get a token at github.com/settings/tokens — needs 'repo' scope
                  </p>
                </div>
              </details>

              {ghRepoInfo && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(52,211,153,0.08)',
                  border: '1px solid rgba(52,211,153,0.2)',
                  borderRadius: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: '#34d399',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <CheckCircle size={14} />
                  {ghRepoInfo.owner}/{ghRepoInfo.repo} · {ghRepoInfo.files.toLocaleString()} files
                  <a
                    href={`https://github.com/${ghRepoInfo.owner}/${ghRepoInfo.repo}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginLeft: 'auto', color: 'var(--vim-keyword)' }}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {ghStep === 'error' && ghError && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12,
                  color: '#f87171',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  {ghError}
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* File browser */}
      <div className="db-tile tile-dark span-12">
        <span className="tile-tag tile-tag--muted">
          <FolderTree size={11} style={{ display: 'inline', marginRight: 4 }} />
          File Browser
        </span>
        <div style={{ maxHeight: 500, overflow: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, marginTop: 12 }}>
          {renderTree(tree, expandedDirs, toggleDir)}
        </div>
      </div>
    </div>
  );
}

function renderTree(
  node: ReturnType<typeof buildDirectoryTree>,
  expanded: Set<string>,
  toggle: (path: string) => void,
  depth = 0
): React.ReactNode {
  if (depth > 4) return null;
  return (
    <div style={{ paddingLeft: depth > 0 ? 20 : 0 }}>
      {node.children?.map((child, i) => (
        <div key={i}>
          <div
            onClick={() => child.type === 'directory' && toggle(child.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 8px',
              borderRadius: 4,
              cursor: child.type === 'directory' ? 'pointer' : 'default',
              color: child.type === 'directory' ? 'var(--vim-fg)' : 'var(--vim-comment)',
            }}
          >
            {child.type === 'directory' ? (
              expanded.has(child.path)
                ? <ChevronDown size={13} />
                : <ChevronRight size={13} />
            ) : (
              <span style={{ width: 13 }} />
            )}
            <span style={{ fontSize: 13 }}>
              {child.type === 'directory' ? '📁' : '📄'}
            </span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {escapeHtml(child.name)}
            </span>
            {child.fileInfo && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--vim-line-number)', flexShrink: 0 }}>
                {child.fileInfo.lines.toLocaleString()} lines
              </span>
            )}
          </div>
          {child.type === 'directory' && expanded.has(child.path) && renderTree(child, expanded, toggle, depth + 1)}
        </div>
      ))}
    </div>
  );
}
