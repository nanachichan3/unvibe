'use client';

import { useState, useCallback } from 'react';
import { Github, ExternalLink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { parseGitHubUrl, fetchRepoInfo, fetchRepoTree } from '@/lib/github';
import type { FileInfo } from '@/lib/types';
import { calculateMetrics, generateStaticQuestions } from '@/lib/parser';

interface GitHubInputProps {
  onDataLoaded: (files: FileInfo[], metrics: ReturnType<typeof calculateMetrics>, questions: ReturnType<typeof generateStaticQuestions>, gitHubData: { owner: string; repo: string; token?: string }) => void;
  onError: (msg: string) => void;
}

type Step = 'idle' | 'loading' | 'error';

function githubHeaders(token?: string): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/vnd.github+json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

export default function GitHubInput({ onDataLoaded, onError }: GitHubInputProps) {
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [repoInfo, setRepoInfo] = useState<{ owner: string; repo: string; branch: string; files: number } | null>(null);

  const handleFetch = useCallback(async () => {
    if (!url.trim()) return;
    setStep('loading');
    setRepoInfo(null);

    const parsed = parseGitHubUrl(url.trim());
    if (!parsed) {
      setStep('error');
      onError('Invalid GitHub URL. Use format: https://github.com/user/repo');
      return;
    }

    try {
      const { owner, repo } = parsed;
      const info = await fetchRepoInfo(owner, repo, token || undefined);
      setRepoInfo({ owner, repo, branch: info.defaultBranch, files: 0 });

      // Fetch tree — this gets all files efficiently
      setRepoInfo({ owner, repo, branch: info.defaultBranch, files: 0 });

      const files = await fetchRepoTreeWithContent(owner, repo, token || undefined, (count) => {
        setRepoInfo(prev => prev ? { ...prev, files: count } : null);
      });

      if (files.length === 0) {
        setStep('error');
        onError('No files found in repository.');
        return;
      }

      setRepoInfo({ owner, repo, branch: info.defaultBranch, files: files.length });

      const metrics = calculateMetrics(files);
      const questions = generateStaticQuestions(files, metrics);
      onDataLoaded(files, metrics, questions, { owner, repo, token: token || undefined });
    } catch (err) {
      setStep('error');
      onError(err instanceof Error ? err.message : 'Failed to fetch repository');
    }
  }, [url, token, onDataLoaded, onError]);

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '12px',
      }}>
        <Github size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: '14px' }} />
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setStep('idle'); }}
            placeholder="https://github.com/user/repo"
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-elevated)',
              border: `1px solid ${step === 'error' ? 'var(--error)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              color: '#fff',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'var(--font-jetbrains)',
            }}
          />
          {repoInfo && (
            <div style={{
              marginTop: '8px',
              padding: '10px 14px',
              background: 'rgba(52,211,153,0.08)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: '#34D399',
            }}>
              <CheckCircle size={14} />
              {repoInfo.files > 0
                ? `${repoInfo.owner}/${repoInfo.repo} · ${repoInfo.files.toLocaleString()} files fetched`
                : `${repoInfo.owner}/${repoInfo.repo} · fetching files...`
              }
            </div>
          )}
        </div>
      </div>

      {/* Optional token */}
      <details style={{ marginBottom: '12px' }}>
        <summary style={{
          fontSize: '12px',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          userSelect: 'none',
        }}>
          {token ? '✓ Token set — private repos accessible' : '+ Add GitHub token (for private repos)'}
        </summary>
        <div style={{ marginTop: '8px' }}>
          <input
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            style={{
              width: '100%',
              padding: '10px 14px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'var(--font-jetbrains)',
            }}
          />
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Get a token at github.com/settings/tokens — needs 'repo' scope for private repos
          </p>
        </div>
      </details>

      {step === 'error' && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.2)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--error)',
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={14} />
          {url && !parseGitHubUrl(url) ? 'Invalid GitHub URL format' : ''}
        </div>
      )}

      <button
        onClick={handleFetch}
        disabled={!url.trim() || step === 'loading'}
        className="btn-primary"
        style={{
          width: '100%',
          justifyContent: 'center',
          opacity: !url.trim() || step === 'loading' ? 0.6 : 1,
          fontSize: '14px',
          padding: '12px 24px',
        }}
      >
        {step === 'loading' ? (
          <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Fetching repository...</>
        ) : (
          <><Github size={15} /> Analyze GitHub Repo</>
        )}
      </button>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
        Only public data is fetched — nothing is stored
        <a href="https://github.com/settings/tokens" target="_blank" rel="noopener" style={{ color: 'var(--accent)', marginLeft: '4px' }}>
          <ExternalLink size={10} style={{ display: 'inline' }} />
        </a>
      </p>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// Helper to fetch files with progress
async function fetchRepoTreeWithContent(
  owner: string,
  repo: string,
  token: string | undefined,
  onProgress: (count: number) => void
): Promise<FileInfo[]> {
  const { fetchRepoTree, fetchFileContent } = await import('@/lib/github');

  // First get the tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
    { headers: githubHeaders(token) }
  );

  if (!treeRes.ok) {
    // Try master
    const masterRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/master?recursive=1`,
      { headers: githubHeaders(token) }
    );
    if (!masterRes.ok) throw new Error('Could not fetch repository tree');
    const data = await masterRes.json();
    return processTree(data.tree, owner, repo, githubHeaders(token), onProgress);
  }

  const data = await treeRes.json();
  return processTree(data.tree, owner, repo, githubHeaders(token), onProgress);
}

async function processTree(
  tree: Array<{ path: string; type: string; size: number; sha: string }>,
  owner: string,
  repo: string,
  headers: Record<string, string>,
  onProgress: (count: number) => void
): Promise<FileInfo[]> {
  const files: FileInfo[] = [];
  const MAX_FILES = 2000; // Limit for performance

  // Filter to source files only
  const sourceFiles = tree
    .filter((f: { type: string; path: string }) =>
      f.type === 'blob' &&
      !f.path.includes('node_modules') &&
      !f.path.includes('.git') &&
      !f.path.includes('dist/') &&
      !f.path.includes('build/') &&
      !f.path.includes('vendor/')
    )
    .slice(0, MAX_FILES);

  let count = 0;
  const semaphore = 5; // Max concurrent requests
  const queue = [...sourceFiles];
  const running: Promise<void>[] = [];

  while (queue.length > 0 || running.length > 0) {
    while (queue.length > 0 && running.length < semaphore) {
      const item = queue.shift()!;
      const p = fetchFile(owner, repo, item.path, headers).then(file => {
        if (file) {
          files.push(file);
          count++;
          if (count % 20 === 0) onProgress(count);
        }
        return null;
      }).catch(() => null);
      running.push(p as unknown as Promise<void>);
    }

    if (running.length > 0) {
      await Promise.race(running);
      // Remove completed
      for (let i = running.length - 1; i >= 0; i--) {
        const r = running[i] as unknown as Promise<unknown>;
        const done = await Promise.race([r, Promise.resolve(null)]);
        if (done !== null) running.splice(i, 1);
      }
    }
  }

  onProgress(files.length);
  return files;
}

async function fetchFile(
  owner: string,
  repo: string,
  path: string,
  headers: Record<string, string>
): Promise<FileInfo | null> {
  try {
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase() || '';
    const lang = getLanguage(ext, path);

    // Only fetch text files
    const textExtensions = ['.js', '.ts', '.tsx', '.jsx', '.py', '.go', '.rs', '.java', '.rb', '.php', '.cs', '.cpp', '.c', '.h', '.hpp', '.swift', '.kt', '.vue', '.svelte', '.html', '.css', '.scss', '.json', '.yaml', '.yml', '.xml', '.md', '.sql', '.sh', '.bash', '.zsh', '.ps1', '.tf', '.graphql', '.ex', '.erl', '.hs', '.ml', '.clj', '.scala', '.lua', '.dart', '.r', '.m'];

    if (!textExtensions.includes(ext)) {
      return {
        path,
        name: path.split('/').pop() || path,
        extension: ext,
        size: 0,
        lines: 0,
      };
    }

    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`,
      { headers }
    );

    if (!res.ok) {
      // Try with master branch
      const masterRes = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`,
        { headers }
      );
      if (!masterRes.ok) {
        return {
          path,
          name: path.split('/').pop() || path,
          extension: ext,
          size: 0,
          lines: 0,
        };
      }
      const content = await masterRes.text();
      const lines = content.split('\n').length;
      return {
        path,
        name: path.split('/').pop() || path,
        extension: ext,
        size: new TextEncoder().encode(content).length,
        lines,
        content: (ext === '.json' || ext === '.md') ? content.substring(0, 5000) : undefined,
      };
    }

    const content = await res.text();
    const lines = content.split('\n').length;
    return {
      path,
      name: path.split('/').pop() || path,
      extension: ext,
      size: new TextEncoder().encode(content).length,
      lines,
      content: (ext === '.json' || ext === '.md') ? content.substring(0, 5000) : undefined,
    };
  } catch {
    return null;
  }
}

function getLanguage(ext: string, path: string): string {
  const map: Record<string, string> = {
    '.js': 'JavaScript', '.jsx': 'React', '.ts': 'TypeScript', '.tsx': 'React',
    '.py': 'Python', '.rb': 'Ruby', '.go': 'Go', '.rs': 'Rust',
    '.java': 'Java', '.kt': 'Kotlin', '.cs': 'C#', '.cpp': 'C++',
    '.c': 'C', '.h': 'C Header', '.swift': 'Swift', '.vue': 'Vue',
    '.svelte': 'Svelte', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.xml': 'XML',
    '.md': 'Markdown', '.sql': 'SQL', '.sh': 'Shell', '.bash': 'Bash',
  };
  return map[ext] || 'Other';
}
