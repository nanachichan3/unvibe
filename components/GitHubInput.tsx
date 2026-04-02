'use client';

import { useState, useCallback } from 'react';
import { Github, ExternalLink, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  const sshMatch = input.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2].replace('.git', '') };
  const httpsMatch = input.match(/github\.com\/([^/]+)\/([^/\s#?]+)/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2].replace('.git', '') };
  return null;
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
    setErrorMsg('');

    const parsed = parseGitHubUrl(url.trim());
    if (!parsed) {
      setStep('error');
      onError('Invalid GitHub URL. Use format: https://github.com/user/repo');
      return;
    }

    const { owner, repo } = parsed;
    const hdrs = githubHeaders(token || undefined);

    try {
      // 1. Get repository info to find the default branch
      const infoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: hdrs });
      if (!infoRes.ok) {
        if (infoRes.status === 404) {
          setStep('error');
          onError(`Repository "${owner}/${repo}" not found. Check the URL and try again.`);
          return;
        }
        if (infoRes.status === 403) {
          setStep('error');
          onError('GitHub API rate limit exceeded. Try adding a GitHub token.');
          return;
        }
        throw new Error(`GitHub API error: ${infoRes.status}`);
      }
      const infoData = await infoRes.json();
      const branch = infoData.default_branch || 'main';
      setRepoInfo({ owner, repo, branch, files: 0 });

      // 2. Fetch all files via contents API (recursive, handles large repos better)
      const files = await fetchAllFiles(owner, repo, branch, hdrs, (count) => {
        setRepoInfo(prev => prev ? { ...prev, files: count } : null);
      });

      if (files.length === 0) {
        setStep('error');
        onError('No source files found in this repository.');
        return;
      }

      setRepoInfo({ owner, repo, branch, files: files.length });
      const metrics = calculateMetrics(files);
      const questions = generateStaticQuestions(files, metrics);
      onDataLoaded(files, metrics, questions, { owner, repo, token: token || undefined });
    } catch (err) {
      setStep('error');
      const msg = err instanceof Error ? err.message : 'Failed to fetch repository';
      onError(msg);
    }
  }, [url, token, onDataLoaded, onError]);

  const [errorMsg, setErrorMsg] = useState('');

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <Github size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: '14px' }} />
        <div style={{ flex: 1 }}>
          <input
            type="text"
            value={url}
            onChange={e => { setUrl(e.target.value); setStep('idle'); setErrorMsg(''); }}
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
                ? `${repoInfo.owner}/${repoInfo.repo} · ${repoInfo.files.toLocaleString()} files`
                : `${repoInfo.owner}/${repoInfo.repo} · fetching...`
              }
            </div>
          )}
        </div>
      </div>

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
            Get a token at github.com/settings/tokens — needs &apos;repo&apos; scope for private repos
          </p>
        </div>
      </details>

      {step === 'error' && errorMsg && (
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
          {errorMsg}
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

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// Fetch all files from a repository using recursive tree API
async function fetchAllFiles(
  owner: string,
  repo: string,
  branch: string,
  headers: Record<string, string>,
  onProgress: (count: number) => void
): Promise<FileInfo[]> {
  // Use the git/trees endpoint with recursive=1 — works for any size repo
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    { headers }
  );

  if (!res.ok) {
    throw new Error(`Could not fetch repository tree (${res.status}). Try adding a GitHub token.`);
  }

  const data = await res.json();
  const tree: Array<{ path: string; type: string; size: number; sha: string }> = data.tree || [];

  // Filter to source files only, limit to 2000
  const sourceFiles = tree
    .filter((f: { type: string; path: string }) =>
      f.type === 'blob' &&
      !f.path.includes('node_modules/') &&
      !f.path.includes('.git/') &&
      !f.path.startsWith('dist/') &&
      !f.path.startsWith('build/') &&
      !f.path.startsWith('vendor/') &&
      !f.path.endsWith('.lock') &&
      !f.path.endsWith('.log')
    )
    .slice(0, 2000);

  const files: FileInfo[] = [];
  const TEXT_EXTS = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
    '.py', '.pyw', '.rb', '.go', '.rs', '.java', '.kt', '.cs',
    '.cpp', '.c', '.h', '.hpp', '.swift', '.vue', '.svelte',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.json', '.jsonc', '.yaml', '.yml', '.xml', '.toml', '.ini', '.env',
    '.md', '.markdown', '.rst',
    '.sql', '.sh', '.bash', '.zsh', '.fish', '.ps1', '.bat', '.cmd',
    '.tf', '.tfvars', '.graphql', '.gql', '.ex', '.exs', '.erl', '.hrl',
    '.hs', '.ml', '.clj', '.cljs', '.scala', '.lua', '.dart', '.r', '.R',
    '.m', '.mm', '.nb', '.p8', '.php', '.blade.php',
  ]);
  const LANG_MAP: Record<string, string> = {
    '.js': 'JavaScript', '.jsx': 'React', '.ts': 'TypeScript', '.tsx': 'React',
    '.py': 'Python', '.rb': 'Ruby', '.go': 'Go', '.rs': 'Rust',
    '.java': 'Java', '.kt': 'Kotlin', '.cs': 'C#', '.cpp': 'C++',
    '.c': 'C', '.h': 'C Header', '.swift': 'Swift', '.vue': 'Vue',
    '.svelte': 'Svelte', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS',
    '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.xml': 'XML',
    '.md': 'Markdown', '.sql': 'SQL', '.sh': 'Shell', '.bash': 'Bash',
  };

  let count = 0;
  // Fetch content for text files with controlled concurrency
  const toFetch = sourceFiles.filter(f => {
    const ext = f.path.substring(f.path.lastIndexOf('.')).toLowerCase();
    return TEXT_EXTS.has(ext);
  });

  const batchSize = 5;
  for (let i = 0; i < toFetch.length; i += batchSize) {
    const batch = toFetch.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(f => fetchFileContent(owner, repo, branch, f.path, f.size, headers))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const file = toFetch[i + j];
      if (result.status === 'fulfilled' && result.value) {
        files.push(result.value);
        count++;
        if (count % 20 === 0) onProgress(count);
      } else {
        // Include file even without content
        files.push({
          path: file.path,
          name: file.path.split('/').pop() || file.path,
          extension: file.path.substring(file.path.lastIndexOf('.')).toLowerCase(),
          size: file.size,
          lines: 0,
        });
        count++;
      }
    }
  }

  onProgress(files.length);
  return files;
}

async function fetchFileContent(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  size: number,
  headers: Record<string, string>
): Promise<FileInfo | null> {
  try {
    const ext = path.substring(path.lastIndexOf('.')).toLowerCase() || '';
    const lang = (({ '.js': 'JavaScript', '.jsx': 'React', '.ts': 'TypeScript', '.tsx': 'React', '.py': 'Python', '.rb': 'Ruby', '.go': 'Go', '.rs': 'Rust', '.java': 'Java', '.kt': 'Kotlin', '.cs': 'C#', '.cpp': 'C++', '.c': 'C', '.h': 'C Header', '.swift': 'Swift', '.vue': 'Vue', '.svelte': 'Svelte', '.html': 'HTML', '.css': 'CSS', '.scss': 'SCSS', '.json': 'JSON', '.yaml': 'YAML', '.yml': 'YAML', '.md': 'Markdown', '.sql': 'SQL', '.sh': 'Shell' } as Record<string,string>)[ext]) || 'Other';

    // Skip large files (>200KB) without reading content
    if (size > 200 * 1024) {
      return { path, name: path.split('/').pop() || path, extension: ext, size, lines: 0 };
    }

    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      { headers: { Accept: 'text/plain' } }
    );

    if (!res.ok) return null;
    const content = await res.text();
    const lines = content.split('\n').length;

    return {
      path,
      name: path.split('/').pop() || path,
      extension: ext,
      size: content.length,
      lines,
      content: (ext === '.json' || ext === '.md') ? content.substring(0, 5000) : content.substring(0, 3000),
    };
  } catch {
    return null;
  }
}
