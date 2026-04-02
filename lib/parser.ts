import JSZip from 'jszip';
import type { FileInfo, DirectoryNode, LanguageStats, ComplexityMetrics } from './types';
import { sanitizeZipPath, formatBytes } from './sanitize';

// Security limits
const MAX_FILE_SIZE = 100 * 1024 * 1024;        // 100MB per file
const MAX_ARCHIVE_SIZE = 500 * 1024 * 1024;       // 500MB total archive
const MAX_COMPRESSION_RATIO = 100;               // Suspicious if compressed:uncompressed > 1:100
const MAX_FILES = 50_000;                          // Prevent zip bomb via sheer count

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  '.js': 'JavaScript',
  '.jsx': 'React',
  '.ts': 'TypeScript',
  '.tsx': 'React',
  '.py': 'Python',
  '.rb': 'Ruby',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.cs': 'C#',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.xml': 'XML',
  '.md': 'Markdown',
  '.sql': 'SQL',
  '.sh': 'Shell',
  '.bash': 'Bash',
  '.zsh': 'Zsh',
  '.ps1': 'PowerShell',
  '.dockerfile': 'Dockerfile',
  '.tf': 'Terraform',
  '.graphql': 'GraphQL',
  '.ex': 'Elixir',
  '.erl': 'Erlang',
  '.hs': 'Haskell',
  '.ml': 'OCaml',
  '.clj': 'Clojure',
  '.scala': 'Scala',
  '.r': 'R',
  '.lua': 'Lua',
  '.dart': 'Dart',
  '.m': 'Objective-C',
  '.mm': 'Objective-C++',
};

const LANGUAGE_COLORS: Record<string, string> = {
  'JavaScript': '#f7df1e',
  'TypeScript': '#3178c6',
  'React': '#61dafb',
  'Python': '#3776ab',
  'Ruby': '#cc342d',
  'Go': '#00add8',
  'Rust': '#dea584',
  'Java': '#b07219',
  'Kotlin': '#a97bff',
  'C#': '#178600',
  'C++': '#f34b7d',
  'C': '#555555',
  'PHP': '#4f5d95',
  'Swift': '#fa7343',
  'Vue': '#42b883',
  'Svelte': '#ff3e00',
  'HTML': '#e34c26',
  'CSS': '#563d7c',
  'SCSS': '#c6538c',
  'Shell': '#89e051',
  'Markdown': '#083fa1',
  'SQL': '#e38c00',
  'YAML': '#cb171e',
  'JSON': '#292929',
};

export async function parseArchive(file: File): Promise<FileInfo[]> {
  // File size guard
  if (file.size > MAX_ARCHIVE_SIZE) {
    throw new Error(`Archive too large. Maximum size is ${formatBytes(MAX_ARCHIVE_SIZE)}. Received ${formatBytes(file.size)}.`);
  }

  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  const files: FileInfo[] = [];

  const fileEntries = Object.entries(contents.files).filter(
    ([name, entry]) => !(entry as unknown as { dir?: boolean }).dir && !name.includes('node_modules') && !name.includes('.git')
  );

  // Count guard
  if (fileEntries.length > MAX_FILES) {
    throw new Error(`Too many files. Maximum is ${MAX_FILES.toLocaleString()} files. Found ${fileEntries.length.toLocaleString()}.`);
  }

  let totalUncompressedSize = 0;

  for (const [name, entry] of fileEntries) {
    // Validate path — prevents zip slip
    const safeName = sanitizeZipPath(name);
    if (safeName === null) {
      console.warn(`[Unvibe] Blocked malicious path: ${name}`);
      continue;
    }

    try {
      // Per-file size check — access internal JSZip _data via type assertion
      const zipEntry = entry as unknown as { _data?: { uncompressedSize: number; compressedSize: number } };
      const uncompressedSize = zipEntry._data?.uncompressedSize || 0;
      totalUncompressedSize += uncompressedSize;

      if (uncompressedSize > MAX_FILE_SIZE) {
        throw new Error(`File "${name}" exceeds ${formatBytes(MAX_FILE_SIZE)} limit.`);
      }

      // Zip bomb detection: if compression ratio is insane, abort
      const compressedSize = zipEntry._data?.compressedSize || 0;
      if (compressedSize && uncompressedSize / compressedSize > MAX_COMPRESSION_RATIO) {
        console.warn(`[Unvibe] Suspicious compression ratio in: ${name}`);
      }

      if (totalUncompressedSize > MAX_ARCHIVE_SIZE * 10) {
        throw new Error('Archive appears to be a zip bomb. Total uncompressed size exceeds safe limit.');
      }

      const content = await entry.async('string');
      const extension = safeName.substring(safeName.lastIndexOf('.')).toLowerCase();
      const lines = content.split('\n').length;

      files.push({
        path: safeName,
        name: safeName.split('/').pop() || safeName,
        extension,
        size: compressedSize,
        lines,
        content: extension === '.json' || extension === '.md' ? content.substring(0, 5000) : undefined,
      });
    } catch (err) {
      // Surface file-level errors without crashing the whole parse
      console.warn(`[Unvibe] Could not extract "${name}":`, err instanceof Error ? err.message : err);
    }
  }

  return files;
}

export function buildDirectoryTree(files: FileInfo[]): DirectoryNode {
  const root: DirectoryNode = {
    name: 'root',
    path: '',
    type: 'directory',
    children: [],
    depth: 0,
  };

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join('/');

      let node = current.children?.find(c => c.name === part);

      if (!node) {
        node = {
          name: part,
          path,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : [],
          fileInfo: isFile ? file : undefined,
          depth: i + 1,
        };
        current.children = current.children || [];
        current.children.push(node);
      }

      current = node;
    }
  }

  return root;
}

export function calculateMetrics(files: FileInfo[]): ComplexityMetrics {
  const totalFiles = files.length;
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);
  const avgFileSize = totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0;

  const largestFiles = [...files]
    .sort((a, b) => b.lines - a.lines)
    .slice(0, 10);

  const languageMap = new Map<string, { files: number; lines: number }>();
  const extMap = new Map<string, number>();

  for (const file of files) {
    const lang = LANGUAGE_EXTENSIONS[file.extension] || 'Other';
    const existing = languageMap.get(lang) || { files: 0, lines: 0 };
    existing.files++;
    existing.lines += file.lines;
    languageMap.set(lang, existing);

    extMap.set(file.extension || 'no-ext', (extMap.get(file.extension || 'no-ext') || 0) + 1);
  }

  const languageDistribution: LanguageStats[] = Array.from(languageMap.entries())
    .map(([language, data]) => ({
      language,
      files: data.files,
      lines: data.lines,
      percentage: Math.round((data.lines / totalLines) * 100) || 0,
      color: LANGUAGE_COLORS[language] || '#888888',
    }))
    .sort((a, b) => b.lines - a.lines);

  const fileTypeDistribution = Array.from(extMap.entries())
    .map(([ext, count]) => ({ ext, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const deepDirs = new Map<string, number>();
  for (const file of files) {
    const depth = file.path.split('/').length;
    const dir = file.path.substring(0, file.path.lastIndexOf('/'));
    if (!deepDirs.has(dir) || deepDirs.get(dir)! < depth) {
      deepDirs.set(dir, depth);
    }
  }
  const deepestDirectories = Array.from(deepDirs.entries())
    .map(([path, depth]) => ({ path: path || '/', depth }))
    .sort((a, b) => b.depth - a.depth)
    .slice(0, 5);

  let estimatedCognitiveLoad: ComplexityMetrics['estimatedCognitiveLoad'] = 'low';
  if (totalLines > 100000 || languageDistribution.length > 10) estimatedCognitiveLoad = 'critical';
  else if (totalLines > 50000 || languageDistribution.length > 7) estimatedCognitiveLoad = 'high';
  else if (totalLines > 10000 || languageDistribution.length > 4) estimatedCognitiveLoad = 'medium';

  return {
    totalFiles,
    totalLines,
    avgFileSize,
    largestFiles,
    deepestDirectories,
    languageDistribution,
    fileTypeDistribution,
    estimatedCognitiveLoad,
  };
}

export function generateStaticQuestions(files: FileInfo[], metrics: ComplexityMetrics): import('./types').GameQuestion[] {
  const questions: import('./types').GameQuestion[] = [];
  const topFiles = metrics.largestFiles.slice(0, 5);

  // ── GUESS FILE (existing) ──────────────────────────────────────────────
  for (const file of topFiles) {
    if (file.lines > 50) {
      questions.push({
        id: `guess-${file.path}`,
        type: 'guess-file',
        question: `Which file has ${file.lines.toLocaleString()} lines?`,
        options: shuffleArray([
          file.name,
          ...getRandomItems(files.filter(f => f.path !== file.path).map(f => f.name), 3),
        ]),
        answer: file.name,
        explanation: `${file.path} contains ${file.lines.toLocaleString()} lines of code`,
        difficulty: file.lines > 500 ? 'hard' : file.lines > 200 ? 'medium' : 'easy',
      });
    }
  }

  // Language detection
  const topLangs = metrics.languageDistribution.slice(0, 4);
  for (const lang of topLangs) {
    if (lang.files >= 2) {
      const langFiles = files.filter(f => (LANGUAGE_EXTENSIONS[f.extension] || 'Other') === lang.language);
      const randomFile = langFiles[Math.floor(Math.random() * langFiles.length)];
      if (randomFile) {
        questions.push({
          id: `lang-${randomFile.path}`,
          type: 'guess-file',
          question: `What language is ${randomFile.name} written in?`,
          options: shuffleArray([lang.language, ...getRandomItems(metrics.languageDistribution.map(l => l.language).filter(l => l !== lang.language), 3)]),
          answer: lang.language,
          explanation: `${randomFile.name} is ${lang.language} (${lang.percentage}% of codebase)`,
          difficulty: 'easy',
        });
      }
    }
  }

  // File extension questions
  const topExts = metrics.fileTypeDistribution.slice(0, 4);
  for (const extData of topExts) {
    if (extData.count >= 3) {
      questions.push({
        id: `ext-${extData.ext}`,
        type: 'guess-file',
        question: `How many ${extData.ext} files are in this project?`,
        options: shuffleArray([
          String(extData.count),
          String(Math.max(1, extData.count - Math.floor(Math.random() * 5))),
          String(extData.count + Math.floor(Math.random() * 5) + 1),
          String(Math.floor(extData.count / 2)),
        ]),
        answer: String(extData.count),
        explanation: `There are ${extData.count} ${extData.ext} files`,
        difficulty: 'medium',
      });
    }
  }

  // ── COMPLEXITY RACE ────────────────────────────────────────────────────
  // "Rank these files by size: smallest → largest"
  if (topFiles.length >= 4) {
    const raceFiles = shuffleArray(topFiles.slice(0, 5)).slice(0, 4);
    const correct = raceFiles.map(f => f.name);
    const question = {
      id: 'race-complexity',
      type: 'complexity-race' as const,
      question: `Rank these files from SMALLEST to LARGEST (click in order):`,
      options: raceFiles.map(f => `${f.name} (${f.lines} lines)`),
      answer: correct.join('|'),
      explanation: correct.map((f, i) => `${i + 1}. ${f}`).join(', '),
      difficulty: 'medium' as const,
    };
    questions.push(question);
  }

  // ── COMPONENT DUEL ─────────────────────────────────────────────────────
  // "Which file handles [functionality]?"
  const fileFunctionalities = inferFilePurpose(files);
  for (const [fileName, purpose] of fileFunctionalities.slice(0, 4)) {
    const wrongFiles = getRandomItems(files.filter(f => f.name !== fileName).map(f => f.name), 3);
    const allOpts = shuffleArray([purpose, ...wrongFiles]);
    questions.push({
      id: `duel-${fileName}`,
      type: 'component-duel',
      question: `Which file is most likely responsible for "${purpose}"?`,
      options: allOpts,
      answer: purpose,
      explanation: `${fileName} is typically responsible for ${purpose}`,
      difficulty: 'medium' as const,
    });
  }

  // ── DEPENDENCY PATH ─────────────────────────────────────────────────────
  // "What imports [file]?" — detect common import patterns
  const importPairs = inferDependencyPairs(files);
  for (const [targetFile, importers] of importPairs.slice(0, 3)) {
    if (importers.length === 0) continue;
    const correctImporter = importers[0];
    const wrongFiles = getRandomItems(files.filter(f => f.name !== correctImporter && f.name !== targetFile).map(f => f.name), 3);
    const allOpts = shuffleArray([correctImporter, ...wrongFiles]);
    questions.push({
      id: `dep-${targetFile}`,
      type: 'dependency-path',
      question: `Which file imports "${targetFile}"?`,
      options: allOpts,
      answer: correctImporter,
      explanation: `${correctImporter} imports ${targetFile}`,
      difficulty: 'hard' as const,
    });
  }

  // ── COMMIT MESSAGE ──────────────────────────────────────────────────────
  // "Given this file, pick the most likely commit message"
  const commitPairs = inferCommitMessages(topFiles.slice(0, 5));
  for (const [fileName, msgs] of commitPairs) {
    if (msgs.length < 2) continue;
    const correct = msgs[0];
    const wrong = getRandomItems(msgs.slice(1).concat(getDefaultCommitMessages()), 3);
    questions.push({
      id: `commit-${fileName}`,
      type: 'commit-message',
      question: `A developer just edited \`${fileName}\`. What did they most likely do?`,
      options: shuffleArray([correct, ...wrong]),
      answer: correct,
      explanation: `Most commits touching ${fileName} follow this pattern`,
      difficulty: 'easy' as const,
    });
  }

  return questions;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Infer what a file likely does based on its name and path */
function inferFilePurpose(files: FileInfo[]): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const PURPOSE_PATTERNS: Array<[RegExp[], string]> = [
    [[/auth/i, /login/i, /signin/i], 'Authentication & login'],
    [[/api/i, /route/i, /endpoint/i], 'API endpoints'],
    [[/config/i, /settings/i, /env/i], 'Configuration'],
    [[/db/i, /database/i, /model/i, /schema/i], 'Database operations'],
    [[/util/i, /helper/i, /tool/i], 'Utility functions'],
    [[/test/i, /spec/i, /__tests?__/i], 'Unit tests'],
    [[/component/i, /ui/i, /widget/i], 'UI components'],
    [[/service/i, /logic/i, /biz/i], 'Business logic'],
    [[/middleware/i], 'Request middleware'],
    [[/router/i, /route/i], 'Routing'],
    [[/error/i, /exception/i], 'Error handling'],
    [[/log/i, /logger/i, /audit/i], 'Logging'],
    [[/cache/i, /redis/i], 'Caching'],
    [[/email/i, /mail/i, /notification/i], 'Notifications'],
    [[/upload/i, /file/i, /storage/i], 'File handling'],
    [[/validator/i, /schema/i, /type/i], 'Validation'],
    [[/session/i, /cookie/i, /token/i], 'Session management'],
    [[/payment/i, /billing/i, /invoice/i], 'Payment processing'],
    [[/analytics/i, /track/i, /metric/i], 'Analytics'],
    [[/export/i, /import/i, /csv/i], 'Data import/export'],
  ];

  for (const file of files.slice(0, 30)) {
    const name = file.name;
    for (const [patterns, purpose] of PURPOSE_PATTERNS) {
      if (patterns.some(p => p.test(name) || p.test(file.path))) {
        if (!pairs.some(([, p]) => p === purpose)) {
          pairs.push([name, purpose]);
        }
      }
    }
  }
  return pairs;
}

/** Try to detect import relationships between files */
function inferDependencyPairs(files: FileInfo[]): Array<[string, string[]]> {
  const pairs: Array<[string, string[]]> = [];
  const fileNameMap = new Map(files.map(f => [f.name.toLowerCase(), f.name]));

  for (const file of files.slice(0, 50)) {
    if (!file.content) continue;
    // Look for CommonJS/ES6 import patterns
    const importMatches = file.content.matchAll(/(?:import|require)\(['"]([^'"]+)['"]\)/g);
    for (const match of importMatches) {
      const imported = match[1];
      // Try to resolve relative imports or module names
      const lastSlash = file.path.lastIndexOf('/');
      const fileDir = file.path.substring(0, lastSlash);
      let resolved = imported;
      if (imported.startsWith('.')) {
        resolved = imported.replace(/\.[^.]+$/, '').split('/').pop() || imported;
      }
      const resolvedLower = resolved.toLowerCase();
      const targetName = fileNameMap.get(resolvedLower) ||
        files.find(f => f.name.toLowerCase().includes(resolvedLower))?.name;
      if (targetName && targetName !== file.name) {
        const existing = pairs.find(([t]) => t === targetName);
        if (existing) {
          if (!existing[1].includes(file.name)) existing[1].push(file.name);
        } else {
          pairs.push([targetName, [file.name]]);
        }
      }
    }
  }

  return pairs;
}

/** Generate plausible commit message pairs from file names */
function inferCommitMessages(topFiles: FileInfo[]): Array<[string, string[]]> {
  return topFiles.map(f => {
    const name = f.name.toLowerCase();
    let msgs: string[];
    if (/auth|login|signin/.test(name)) {
      msgs = ['Add OAuth2 login flow', 'Fix session token expiry', 'Update password policy'];
    } else if (/api|route|endpoint/.test(name)) {
      msgs = ['Add new REST endpoint', 'Add pagination to GET /items', 'Rate limiting middleware'];
    } else if (/test|spec/.test(name)) {
      msgs = ['Add unit tests for auth', 'Increase test coverage', 'Mock external API calls'];
    } else if (/config|env|settings/.test(name)) {
      msgs = ['Add staging environment vars', 'Update API base URL', 'Enable debug mode'];
    } else if (/component|ui|widget/.test(name)) {
      msgs = ['Refactor button component styles', 'Add dark mode support', 'Fix accessibility issues'];
    } else if (/db|database|model|schema/.test(name)) {
      msgs = ['Add index on user_id column', 'Create migration for orders table', 'Optimize slow query'];
    } else if (/util|helper/.test(name)) {
      msgs = ['Extract date formatting helpers', 'Add input sanitization', 'Fix timezone bug'];
    } else if (/middleware/.test(name)) {
      msgs = ['Add CORS headers', 'Log request durations', 'Rate limit API calls'];
    } else if (/error|exception/.test(name)) {
      msgs = ['Add custom error class', 'Log stack traces to Sentry', 'Handle 404 gracefully'];
    } else {
      msgs = ['Refactor for readability', 'Add error handling', 'Performance optimization', 'Update dependencies'];
    }
    return [f.name, msgs] as [string, string[]];
  });
}

function getDefaultCommitMessages(): string[] {
  return [
    'Fix typo in variable name',
    'Update dependencies',
    'Refactor for readability',
    'Add comments',
    'Fix CSS spacing',
    'Remove unused imports',
    'Minor cleanup',
    'Fix edge case',
  ];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getRandomItems<T>(array: T[], count: number): T[] {
  return shuffleArray(array).slice(0, count);
}
