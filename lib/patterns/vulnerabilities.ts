// Security vulnerability pattern definitions and detector

export interface VulnerabilityPattern {
  id: string;
  name: string;
  severity: 'easy' | 'medium' | 'hard';
  description: string;       // "What's wrong"
  fixSuggestion: string;    // "How to fix it"
  pattern: RegExp | string;  // Code pattern to detect
  matchScope: 'any' | 'function' | 'expression';
  cwe?: string;              // CWE identifier
}

export interface VulnerabilityMatch {
  pattern: VulnerabilityPattern;
  line: number;
  snippet: string;     // 3-line context around the bug
  fullFunction: string;
}

// ── Vulnerability Pattern Database ─────────────────────────────────────────────

export const VULNERABILITY_PATTERNS: VulnerabilityPattern[] = [
  {
    id: 'eval-usage',
    name: 'Use of eval()',
    severity: 'easy',
    description: 'eval() executes arbitrary JavaScript code. User-controlled input to eval() is a code injection vulnerability.',
    fixSuggestion: 'Avoid eval(). Use safer alternatives like JSON.parse() for data or Function constructors with sanitized input.',
    pattern: /\beval\s*\(/,
    matchScope: 'any',
    cwe: 'CWE-95',
  },
  {
    id: 'new-function-constructor',
    name: 'Dynamic Function() constructor',
    severity: 'easy',
    description: 'The Function constructor creates a function from a string, equivalent to eval() and prone to code injection.',
    fixSuggestion: 'Avoid the Function constructor with dynamic input. Refactor to use explicit function logic.',
    pattern: /\bFunction\s*\(\s*(?:['"`]|req|body|input|user|params|query)/,
    matchScope: 'any',
    cwe: 'CWE-95',
  },
  {
    id: 'innerHTML-concatenation',
    name: 'innerHTML with string concatenation',
    severity: 'easy',
    description: 'Setting innerHTML with user-controlled content allows XSS (cross-site scripting) attacks.',
    fixSuggestion: 'Use textContent for plain text, or sanitize HTML with DOMPurify before inserting.',
    pattern: /\.innerHTML\s*=\s*(?:['"`][^`]*\$|\+|template|[^;]*\+\s*(?:req|body|input|user|params|query|\w+\.(?:body|params|query)))/,
    matchScope: 'expression',
    cwe: 'CWE-79',
  },
  {
    id: 'innerHTML-assignment',
    name: 'Direct innerHTML assignment of user data',
    severity: 'easy',
    description: 'Assigning raw user input to innerHTML allows HTML/script injection.',
    fixSuggestion: 'Use textContent or sanitize input before DOM insertion.',
    pattern: /\.innerHTML\s*=\s*(?:req|body|input|user|params|query|\w+\.(?:body|params|query))/,
    matchScope: 'expression',
    cwe: 'CWE-79',
  },
  {
    id: 'hardcoded-password',
    name: 'Hardcoded password or secret',
    severity: 'easy',
    description: 'Hardcoded credentials in source code can be leaked through version control and reverse engineering.',
    fixSuggestion: 'Move secrets to environment variables or a secrets manager (e.g., AWS Secrets Manager, HashiCorp Vault).',
    pattern: /(?:password|passwd|pwd|secret|api_key|apikey|api-key|auth_token|token)\s*[=:]\s*['"`][^'"`]{3,}['"`]/i,
    matchScope: 'any',
    cwe: 'CWE-798',
  },
  {
    id: 'sql-template-literal',
    name: 'SQL query using template literals',
    severity: 'medium',
    description: 'Building SQL queries with template literals (backticks) risks SQL injection if user input is included.',
    fixSuggestion: 'Use parameterized queries (prepared statements) instead of string concatenation or template literals.',
    pattern: /`\s*(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s+[^`]*\$\{[^}]+\}/i,
    matchScope: 'expression',
    cwe: 'CWE-89',
  },
  {
    id: 'sql-string-concat',
    name: 'SQL query built with string concatenation',
    severity: 'medium',
    description: 'Concatenating user input directly into SQL queries allows SQL injection attacks.',
    fixSuggestion: 'Use parameterized queries or an ORM that handles escaping automatically.',
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\s+[^\n;'"]*[+]\s*(?:req|body|params|query|input|user)/i,
    matchScope: 'expression',
    cwe: 'CWE-89',
  },
  {
    id: 'path-traversal-fs',
    name: 'Path traversal in file system operations',
    severity: 'medium',
    description: 'Using user input (req.params, req.body, etc.) directly in file system operations without sanitization allows path traversal attacks.',
    fixSuggestion: 'Validate and sanitize all file paths. Use path.resolve() and whitelist allowed directories.',
    pattern: /(?:readFile|readFileSync|writeFile|writeFileSync|createReadStream|unlink|rmdir|readdir)\s*\([^)]*(?:req|body|params|query)\.[^)]+\)/,
    matchScope: 'expression',
    cwe: 'CWE-22',
  },
  {
    id: 'weak-crypto-random',
    name: 'Math.random() used for security tokens',
    severity: 'medium',
    description: 'Math.random() is not cryptographically secure. Using it for tokens, IDs, or passwords is a security vulnerability.',
    fixSuggestion: 'Use crypto.randomBytes() in Node.js or the Web Crypto API (crypto.getRandomValues()) for security-sensitive values.',
    pattern: /(?:token|id|key|nonce|salt|IV|IV)\s*[=:]\s*Math\.random\s*\(\)/i,
    matchScope: 'expression',
    cwe: 'CWE-338',
  },
  {
    id: 'cors-wildcard',
    name: 'CORS wildcard with credentials',
    severity: 'medium',
    description: 'Setting Access-Control-Allow-Origin to "*" while allowing credentials exposes the API to cross-origin attacks.',
    fixSuggestion: 'Use specific origin domains, validate the Origin header server-side, or use CORS libraries.',
    pattern: /Access-Control-Allow-Origin\s*[:=]\s*['"]?\*['"]?(?!\s*(?:if|,|$))/,
    matchScope: 'expression',
    cwe: 'CWE-942',
  },
  {
    id: 'jwt-algorithm-none',
    name: 'JWT algorithm not checked (alg: none)',
    severity: 'medium',
    description: 'If a JWT library allows the "none" algorithm, attackers can forge tokens by changing the alg header.',
    fixSuggestion: 'Explicitly specify and verify the expected algorithm (e.g., HS256, RS256). Use libraries that enforce algorithm allowlisting.',
    pattern: /(?:jwt|token|verify)\s*\([^)]*algorithm\s*:[^}]*\}/,
    matchScope: 'expression',
    cwe: 'CWE-347',
  },
  {
    id: 'hidden-sensitive-data',
    name: 'Hidden elements containing sensitive data',
    severity: 'medium',
    description: 'Sensitive data in hidden HTML elements can be accessed via browser DevTools or page source.',
    fixSuggestion: 'Don\'t store sensitive data in hidden HTML elements. Keep it server-side or in HttpOnly cookies.',
    pattern: /<input[^>]+type\s*=\s*['"]hidden['"][^>]+value\s*=[^>]*(?:password|token|key|secret|api|auth)/i,
    matchScope: 'any',
    cwe: 'CWE-200',
  },
  {
    id: 'localstorage-sensitive',
    name: 'localStorage for sensitive data',
    severity: 'medium',
    description: 'localStorage is accessible to JavaScript and XSS attacks. Storing sensitive data there exposes it to theft.',
    fixSuggestion: 'Use HttpOnly cookies or sessionStorage for sensitive data. Prefer server-side session management.',
    pattern: /(?:localStorage|sessionStorage)\s*\.\s*(?:setItem|getItem)\s*\([^)]*(?:token|key|secret|password|auth|credential|session)/,
    matchScope: 'expression',
    cwe: 'CWE-922',
  },
  {
    id: 'deserialize-untrusted',
    name: 'Deserialization of untrusted data',
    severity: 'hard',
    description: 'Deserializing untrusted data (e.g., from user input, cookies, or external APIs) can lead to code execution attacks.',
    fixSuggestion: 'Avoid deserialization of untrusted data. Use JSON.parse() for data interchange, or use cryptographically signed serialized formats.',
    pattern: /\b(?:unserialize|deserialize|yaml\.load|JSON\.parse)\s*\([^)]*(?:req|body|input|params|query|cookie|user|external)/,
    matchScope: 'expression',
    cwe: 'CWE-502',
  },
  {
    id: 'command-injection',
    name: 'Shell command with user input',
    severity: 'hard',
    description: 'Passing unsanitized user input to shell commands (exec, spawn, system) risks command injection attacks.',
    fixSuggestion: 'Avoid shell commands with user input. Use child_process with an array of arguments, or whitelist allowed inputs.',
    pattern: /(?:exec|execSync|spawn|spawnSync|system|child_process)\s*\([^)]*(?:req|body|params|query|input|user)/,
    matchScope: 'expression',
    cwe: 'CWE-78',
  },
  {
    id: 'xss-vulnerability',
    name: 'Reflected XSS in URL parameter',
    severity: 'hard',
    description: 'User-controlled URL parameters rendered to the page without sanitization allow reflected XSS attacks.',
    fixSuggestion: 'Escape user input before rendering. Use a framework\'s built-in XSS protection or DOMPurify.',
    pattern: /(?:innerHTML|dangerouslySetInnerHTML|insertAdjacentHTML)\s*=\s*(?:req|params|query|url|window\.location)/,
    matchScope: 'expression',
    cwe: 'CWE-79',
  },
  {
    id: 'xxe-xml',
    name: 'XML parsing vulnerable to XXE',
    severity: 'hard',
    description: 'Processing XML with untrusted data without disabling external entities allows XXE (XML External Entity) attacks.',
    fixSuggestion: 'Disable external entities in your XML parser (e.g., in JavaScript: xxe: false). Use JSON for data interchange when possible.',
    pattern: /DOMParser|XMLHttpRequest|node-expat|xml2js|sax-js|xxe/,
    matchScope: 'expression',
    cwe: 'CWE-611',
  },
];

// ── Detector ──────────────────────────────────────────────────────────────────

/**
 * Detect all security vulnerabilities in a code string.
 */
export function detectVulnerabilities(content: string): VulnerabilityMatch[] {
  const lines = content.split('\n');
  const matches: VulnerabilityMatch[] = [];

  const functionRanges = extractFunctionRanges(content);

  for (const pattern of VULNERABILITY_PATTERNS) {
    try {
      let regex: RegExp;
      if (typeof pattern.pattern === 'string') {
        regex = new RegExp(pattern.pattern, 'g');
      } else {
        regex = new RegExp(pattern.pattern.source, pattern.pattern.flags.includes('g') ? pattern.pattern.flags : pattern.pattern.flags + 'g');
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        regex.lastIndex = 0;
        if (regex.test(line)) {
          const lineNum = i + 1;
          const snippet = getSnippetAroundLine(lines, lineNum, 3);
          const fullFunction = getEnclosingFunction(content, lineNum, functionRanges);
          matches.push({
            pattern,
            line: lineNum,
            snippet,
            fullFunction,
          });
        }
      }
    } catch {
      // Skip invalid patterns
    }
  }

  return matches;
}

function getSnippetAroundLine(lines: string[], lineNum: number, radius: number): string {
  const start = Math.max(0, lineNum - radius - 1);
  const end = Math.min(lines.length, lineNum + radius);
  return lines.slice(start, end).join('\n');
}

function extractFunctionRanges(content: string): Array<{ start: number; end: number; name: string }> {
  const ranges: Array<{ start: number; end: number; name: string }> = [];
  const lines = content.split('\n');
  const stack: Array<{ start: number; name: string }> = [];

  const funcRegex = new RegExp(
    '(?:^|\\n)(?:(async\\s+)?function\\s*(\\w*)\\s*(?:<[^>]*>\\s*)?\\(' +
    '|(?:(?:export|public|private|protected)\\s+)*(?:async\\s+)?(?:function\\s+)?(\\w*)\\s*(?:<[^>]*>\\s*)?\\(' +
    '|(?:class|interface|type)\\s+(\\w+)|(\\w+)\\s*[=:]\\s*(?:(?:async\\s*)?(?:(?:\\([^)]*\\)|[^\\(]*)\\s*=>))',
    'gm'
  );

  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const name = match[2] || match[3] || match[4] || match[5] || '(anonymous)';
    const offset = content.substring(0, match.index).split('\n').length;
    const line = lines[offset - 1] || '';

    const braceMatch = line.match(/[{(]\s*$/);
    if (braceMatch || line.trim().endsWith('{')) {
      stack.push({ start: offset, name });
    }
  }

  let braceCount = 0;
  let inString: string | null = null;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const prev = content[i - 1];
    if (inString) {
      if (ch === inString && prev !== '\\') inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') {
      if (stack.length > 0 && braceCount === 0) {
        const top = stack[stack.length - 1]!;
        const lineNum = content.substring(0, i).split('\n').length;
        if (!ranges.find(r => r.start === top.start)) {
          ranges.push({ start: top.start, end: -1, name: top.name });
        }
      }
      braceCount++;
    } else if (ch === '}') {
      braceCount = Math.max(0, braceCount - 1);
      if (braceCount === 0 && stack.length > 0) {
        const top = stack.pop()!;
        const lineNum = content.substring(0, i).split('\n').length;
        const range = ranges.find(r => r.start === top.start && r.end === -1);
        if (range) range.end = lineNum;
      }
    }
  }

  return ranges;
}

function getEnclosingFunction(content: string, lineNum: number, functionRanges: Array<{ start: number; end: number; name: string }>): string {
  const matching = functionRanges
    .filter(r => r.start <= lineNum && (r.end === -1 || r.end >= lineNum))
    .sort((a, b) => b.start - a.start);

  if (matching.length > 0) {
    const range = matching[0]!;
    const lines = content.split('\n');
    const start = Math.max(0, range.start - 1);
    const end = range.end === -1 ? lines.length : range.end;
    return lines.slice(start, end).join('\n');
  }

  const allLines = content.split('\n');
  const start = Math.max(0, lineNum - 6);
  const end = Math.min(allLines.length, lineNum + 4);
  return allLines.slice(start, end).join('\n');
}
