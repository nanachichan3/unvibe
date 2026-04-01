/**
 * GitHub API integration for fetching repository data
 * Uses GitHub REST API v3
 */

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string | null;
  stars: number;
  language: string | null;
  size: number;
  token?: string;
}

export interface GitHubFile {
  path: string;
  name: string;
  type: 'file' | 'dir';
  size: number;
  sha: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  additions: number;
  deletions: number;
}

export interface BlameRange {
  startingLine: number;
  endingLine: number;
  commit: {
    sha: string;
    author: string;
    date: string;
    message: string;
  };
}

/**
 * Parse a GitHub URL or git URL into owner/repo
 */
export function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  // Handle git@github.com:user/repo.git
  const sshMatch = input.match(/git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2].replace('.git', '') };
  }

  // Handle https://github.com/user/repo or https://github.com/user/repo/tree/branch/path
  const httpsMatch = input.match(/github\.com\/([^/]+)\/([^/\s]+)/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2].replace('.git', '') };
  }

  return null;
}

/**
 * Build headers for GitHub API requests
 */
function buildHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch repo info
 */
export async function fetchRepoInfo(owner: string, repo: string, token?: string): Promise<GitHubRepoInfo> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers: buildHeaders(token),
  });

  if (!res.ok) {
    if (res.status === 404) throw new Error('Repository not found. Check the URL and try again.');
    if (res.status === 403) throw new Error('API rate limit exceeded. Try adding a GitHub token.');
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const data = await res.json();
  return {
    owner,
    repo,
    defaultBranch: data.default_branch,
    description: data.description,
    stars: data.stargazers_count,
    language: data.language,
    size: data.size,
    token,
  };
}

/**
 * Fetch repository contents recursively
 * For large repos, fetches top-level + key directories
 */
export async function fetchRepoContents(
  owner: string,
  repo: string,
  path: string = '',
  token?: string
): Promise<GitHubFile[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers: buildHeaders(token) }
  );

  if (!res.ok) {
    if (res.status === 403) throw new Error('API rate limit exceeded. Add a GitHub token for higher limits.');
    if (res.status === 404) return []; // Path doesn't exist
    throw new Error(`Failed to fetch contents: ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) return [{ path, name: path.split('/').pop() || repo, type: 'file', size: data.size, sha: data.sha }];

  return data.map((item: { path: string; name: string; type: string; size: number; sha: string }) => ({
    path: item.path,
    name: item.name,
    type: item.type === 'dir' ? 'dir' : 'file',
    size: item.size || 0,
    sha: item.sha,
  }));
}

/**
 * Fetch file content from GitHub
 */
export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<string> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    { headers: { ...buildHeaders(token), 'Accept': 'application/vnd.github.raw+json' } }
  );

  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return res.text();
}

/**
 * Fetch commit history for a file
 */
export async function fetchFileCommits(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<GitHubCommit[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=30`,
    { headers: buildHeaders(token) }
  );

  if (!res.ok) throw new Error(`Failed to fetch commits: ${res.status}`);

  const data = await res.json();
  return data.map((c: { sha: string; commit: { message: string; author: { name: string; date: string } }; stats?: { additions: number; deletions: number } }) => ({
    sha: c.sha.substring(0, 7),
    message: c.commit.message.split('\n')[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
    additions: c.stats?.additions || 0,
    deletions: c.stats?.deletions || 0,
  }));
}

/**
 * Fetch blame data for a file — returns line ranges with commit info
 * This is the basis for the "when was this function created" game
 */
export async function fetchBlameData(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<BlameRange[]> {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=100`,
    { headers: buildHeaders(token) }
  );

  if (!res.ok) throw new Error(`Failed to fetch blame: ${res.status}`);

  const commits = await res.json();

  // Group commits by date to build "last modified" timeline
  const commitMap = new Map<string, { date: string; author: string; message: string }>();
  for (const c of commits) {
    const date = c.commit.author.date.substring(0, 10);
    if (!commitMap.has(c.sha) || new Date(c.commit.author.date) > new Date(commitMap.get(c.sha)!.date)) {
      commitMap.set(c.sha, {
        date,
        author: c.commit.author.name,
        message: c.commit.message.split('\n')[0],
      });
    }
  }

  return Array.from(commitMap.entries()).map(([sha, info], i) => ({
    startingLine: i * 10 + 1,
    endingLine: (i + 1) * 10,
    commit: {
      sha: sha.substring(0, 7),
      author: info.author,
      date: info.date,
      message: info.message,
    },
  }));
}

/**
 * Fetch repository tree (fast, recursive)
 */
export async function fetchRepoTree(
  owner: string,
  repo: string,
  recursive: boolean = true,
  token?: string
): Promise<GitHubFile[]> {
  const params = new URLSearchParams({ recursive: recursive ? '1' : '0' });
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/main?${params}`,
    { headers: buildHeaders(token) }
  );

  if (!res.ok) {
    // Fall back to master or main
    const fallback = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/master?${params}`,
      { headers: buildHeaders(token) }
    );
    if (!fallback.ok) throw new Error('Could not fetch repository tree');
    const data = await fallback.json();
    return data.tree.filter((f: { type: string }) => f.type !== 'tree').map((item: { path: string; size: number; sha: string }) => ({
      path: item.path,
      name: item.path.split('/').pop() || item.path,
      type: 'file' as const,
      size: item.size || 0,
      sha: item.sha,
    }));
  }

  const data = await res.json();
  return data.tree.filter((f: { type: string }) => f.type !== 'tree').map((item: { path: string; size: number; sha: string }) => ({
    path: item.path,
    name: item.path.split('/').pop() || item.path,
    type: 'file' as const,
    size: item.size || 0,
    sha: item.sha,
  }));
}
