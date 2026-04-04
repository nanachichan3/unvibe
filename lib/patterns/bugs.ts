// Bug pattern definitions and detector
// Each pattern represents a common JavaScript/TypeScript bug

export interface BugPattern {
  id: string;
  name: string;
  severity: 'easy' | 'medium' | 'hard';
  description: string;       // "What's wrong"
  fixSuggestion: string;    // "How to fix it"
  pattern: RegExp | string;  // Code pattern to detect
  matchScope: 'any' | 'function' | 'expression';
}

export interface BugMatch {
  pattern: BugPattern;
  line: number;
  snippet: string;     // 3-line context around the bug
  fullFunction: string; // the enclosing function (for the game display)
}

// ── Bug Pattern Database ──────────────────────────────────────────────────────

export const BUG_PATTERNS: BugPattern[] = [
  // ── EASY ──────────────────────────────────────────────────────────────────

  {
    id: 'loose-equality',
    name: 'Loose equality (== instead of ===)',
    severity: 'easy',
    description: 'Using == instead of === can cause unexpected type coercion.',
    fixSuggestion: 'Use strict equality (===) to avoid implicit type coercion.',
    pattern: /[^=!]={2}[^=]|(?<![=!])={2}(?![=])/,
    matchScope: 'expression',
  },
  {
    id: 'var-declaration',
    name: 'var instead of const/let',
    severity: 'easy',
    description: 'var has function-scoped hoisting which can cause confusing behavior.',
    fixSuggestion: 'Use const or let for block-scoped variables.',
    pattern: /\bvar\s+/,
    matchScope: 'any',
  },
  {
    id: 'reassigned-const',
    name: 'Reassigned const variable',
    severity: 'easy',
    description: 'A const variable cannot be reassigned after initialization.',
    fixSuggestion: "Use let instead of const, or do not reassign the variable.",
    pattern: /\bconst\s+\w+\s*=[^=]+\s*;[^{]*\n\s*\w+\s*=/,
    matchScope: 'function',
  },
  {
    id: 'mutated-default-arg',
    name: 'Mutated default argument',
    severity: 'easy',
    description: 'Mutating a default argument value means the mutation persists across calls.',
    fixSuggestion: 'Clone or safely initialize the default value inside the function.',
    pattern: /function[\\s\\S]*?\\([^)]*=\\s*\\[[^\\]]*\\]?\\s*\\)[^{]*\\{[^}]*\\w+\\s*=/,
    matchScope: 'function',
  },
  {
    id: 'json-parse-no-try',
    name: 'JSON.parse without try/catch',
    severity: 'easy',
    description: 'JSON.parse throws a SyntaxError if the string is malformed, crashing the program.',
    fixSuggestion: 'Wrap JSON.parse in a try/catch block to handle parse errors gracefully.',
    pattern: /JSON\.parse\s*\([^)]+\)(?!\s*(?:catch|\/\/|if))/,
    matchScope: 'expression',
  },
  {
    id: 'await-non-async',
    name: 'await in non-async function',
    severity: 'easy',
    description: 'await can only be used inside async functions.',
    fixSuggestion: 'Make the function async or remove the await keyword.',
    pattern: /^\s*(?!async\s)function[^{]*\{[^}]*\bawait\s+/m,
    matchScope: 'function',
  },
  {
    id: ' assignment-instead-of-comparison',
    name: 'Assignment instead of comparison',
    severity: 'easy',
    description: 'Using = instead of == or === in a conditional.',
    fixSuggestion: 'Use == or === for comparison, or extract the assignment outside the condition.',
    pattern: /if\s*\(\s*\w+\s*=\s*[^=]/,
    matchScope: 'expression',
  },
  {
    id: 'undefined-in-obj-destructure',
    name: 'Destructuring with default from undefined property',
    severity: 'easy',
    description: 'Accessing a property of undefined will throw a TypeError.',
    fixSuggestion: 'Check if the parent object exists before accessing its properties.',
    pattern: /undefined\s*\.\w+|\?\.\w+(?<!\?\.)/,
    matchScope: 'expression',
  },

  // ── MEDIUM ────────────────────────────────────────────────────────────────

  {
    id: 'closure-in-loop',
    name: 'Closure capturing loop variable',
    severity: 'medium',
    description: 'A closure (callback/setTimeout/event handler) inside a loop captures the variable by reference, not value. All closures see the final value.',
    fixSuggestion: 'Use an IIFE or let (block-scoped) instead of var to capture the value per iteration.',
    pattern: /for\s*\(\s*(?:let|var)\s+\w+\s*=\s*\d+\s*;[^{]*\{[^}]*(?:setTimeout|addEventListener|\.then|callback|=>\s*\(\)\s*=>)/,
    matchScope: 'function',
  },
  {
    id: 'missing-return',
    name: 'Missing return statement',
    severity: 'medium',
    description: "A function that should return a value does not have a return statement in all code paths.",
    fixSuggestion: 'Ensure all code paths return a value, or return a default.',
    pattern: /function\s+\w+[^{]*\{[^}]*if\s*\([^)]*\)[^{]*\{[^}]*return[^}]*\}[^}]*return[^}]*\}/,
    matchScope: 'function',
  },
  {
    id: 'wrong-array-method',
    name: 'Wrong array method (find used when filter needed)',
    severity: 'medium',
    description: 'Using Array.find() when Array.filter() was intended, or vice versa.',
    fixSuggestion: 'Use filter() to get all matching elements, or find() to get the first match only.',
    pattern: /\.find\s*\(\s*(?:\([^)]*\)\s*=>\s*\w+\s*===|function\s*\(\w+\)\s*\{\s*return\s*\w+\s*===)/,
    matchScope: 'expression',
  },
  {
    id: 'unnecessary-new-boolean',
    name: 'Unnecessary new Boolean() wrapper',
    severity: 'medium',
    description: 'new Boolean() creates a Boolean object, not a primitive. It is truthy even when false.',
    fixSuggestion: 'Use the primitive Boolean() or just a literal true/false value.',
    pattern: /\bnew\s+Boolean\s*\(/,
    matchScope: 'expression',
  },
  {
    id: 'unnecessary-new-string',
    name: 'Unnecessary new String() wrapper',
    severity: 'medium',
    description: 'new String() creates a String object, not a primitive. Use of typeof and === will behave unexpectedly.',
    fixSuggestion: 'Use string literals or String() as a function for type conversion.',
    pattern: /\bnew\s+String\s*\(/,
    matchScope: 'expression',
  },
  {
    id: 'double-negation',
    name: 'Double negation (!!) to coerce to boolean',
    severity: 'medium',
    description: '!! is an obscure way to coerce to boolean. Boolean() is clearer.',
    fixSuggestion: 'Use Boolean(x) or explicit comparison instead of !! for clarity.',
    pattern: /![^!]![^!]/,
    matchScope: 'expression',
  },
  {
    id: 'unnecessary-equality-check-boolean',
    name: 'Unnecessary comparison with boolean',
    severity: 'medium',
    description: 'Checking if a boolean equals true/false is redundant.',
    fixSuggestion: 'Use the boolean value directly: if (x) instead of if (x === true).',
    pattern: /=== \w*(?:true|false)|(?:true|false) === /,
    matchScope: 'expression',
  },
  {
    id: 'for-in-array',
    name: 'for...in on an array',
    severity: 'medium',
    description: 'for...in iterates over enumerable properties/keys, not values, and includes the prototype chain. Use for...of for arrays.',
    fixSuggestion: 'Use for...of or Array.forEach() instead of for...in for arrays.',
    pattern: /for\s*\(\s*(?:let|var|const)\s+\w+\s+in\s+/,
    matchScope: 'any',
  },
  {
    id: 'nested-callbacks',
    name: 'Deeply nested callbacks (callback hell)',
    severity: 'medium',
    description: 'Multiple levels of nested callbacks make code hard to read and maintain.',
    fixSuggestion: 'Flatten the structure using async/await or Promise chains.',
    pattern: /\{[^}]{0,100}\{[^{]{0,80}\{[^{]{0,80}\w+\(/,
    matchScope: 'function',
  },

  // ── HARD ───────────────────────────────────────────────────────────────────

  {
    id: 'proto-pollution',
    name: 'Prototype pollution (__proto__ manipulation)',
    severity: 'hard',
    description: 'Merging user-controlled objects into existing prototypes can lead to prototype pollution attacks.',
    fixSuggestion: 'Avoid using __proto__ or Object.assign with untrusted input. Use safe merge utilities.',
    pattern: /__proto__|constructor\s*=\s*\w+|Object\.assign\s*\([^,]+,\s*(?:req|user|input)/,
    matchScope: 'any',
  },
  {
    id: 'dynamic-function',
    name: 'Dynamic Function() constructor',
    severity: 'hard',
    description: 'Using the Function constructor with dynamic input can lead to code injection vulnerabilities.',
    fixSuggestion: 'Avoid dynamic code execution. Use safer alternatives like JSON.parse for data.',
    pattern: /\bFunction\s*\(/,
    matchScope: 'any',
  },
  {
    id: 'implicit-any',
    name: 'Implicit any in TypeScript',
    severity: 'hard',
    description: 'TypeScript variable with no type annotation and no inferred type from initialization.',
    fixSuggestion: 'Add explicit type annotations or ensure TypeScript strict mode is enabled.',
    pattern: /:\s*any\b/,
    matchScope: 'expression',
  },
  {
    id: 'catch-swallows-error',
    name: 'Empty catch or swallow error',
    severity: 'hard',
    description: 'A catch block that silently ignores errors makes debugging very difficult.',
    fixSuggestion: 'Log the error, rethrow it, or handle it explicitly.',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    matchScope: 'any',
  },
  {
    id: 'double-negative-boolean',
    name: 'Double negation !! for boolean coercion',
    severity: 'hard',
    description: 'Using !! to coerce a value to boolean is idiomatic but obscure.',
    fixSuggestion: 'Use Boolean() or explicit comparisons for clarity.',
    pattern: /!!/,
    matchScope: 'expression',
  },
  {
    id: 'off-by-one-iteration',
    name: 'Off-by-one in loop condition',
    severity: 'hard',
    description: 'A loop that runs one iteration too many or too few due to incorrect boundary check.',
    fixSuggestion: 'Verify loop boundaries: < vs <=, and ensure array indices stay in bounds.',
    pattern: /for\s*\([^)]*<=\s*\w+\.length[^)]*\)/,
    matchScope: 'any',
  },
  {
    id: 'race-condition',
    name: 'Potential race condition with shared state',
    severity: 'hard',
    description: 'Async operations on shared mutable state without synchronization can cause race conditions.',
    fixSuggestion: 'Use locks, mutexes, or ensure operations complete before the next accesses shared state.',
    pattern: /async\s+\w+[^{]*\{[^}]*(?:fetch|readFile|db\.)[^}]*\}[^}]*\}\s*\)[^}]*\}/,
    matchScope: 'function',
  },
  {
    id: 'memory-leak-event-listener',
    name: 'Event listener not removed (memory leak)',
    severity: 'hard',
    description: 'Adding event listeners without removing them causes memory leaks in long-running applications.',
    fixSuggestion: 'Remove event listeners in cleanup code (componentWillUnmount, cleanup functions).',
    pattern: /addEventListener\s*\([^)]+\)(?!\s*(?:removeEventListener|cleanup|\}))/,
    matchScope: 'any',
  },
];

// ── Detector ──────────────────────────────────────────────────────────────────

/**
 * Detect all bug matches in a code string.
 * Returns an array of BugMatch objects with line numbers, 3-line snippets, and enclosing function.
 */
export function detectBugs(content: string): BugMatch[] {
  const lines = content.split('\n');
  const matches: BugMatch[] = [];

  for (const pattern of BUG_PATTERNS) {
    try {
      const source = typeof pattern.pattern === 'string'
        ? pattern.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        : pattern.pattern.source;
      const flags = typeof pattern.pattern === 'string'
        ? 'g'
        : (pattern.pattern.flags.includes('g') ? pattern.pattern.flags : pattern.pattern.flags + 'g');
      const regex = new RegExp(source, flags);

      for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
        const line = lines[lineIdx]!;
        regex.lastIndex = 0;
        if (regex.test(line)) {
          const lineNum = lineIdx + 1;
          const snippet = getSnippetAroundLine(lines, lineNum, 3);
          // fullFunction: show 10 lines of context starting from this line
          const fnStart = Math.max(0, lineIdx - 5);
          const fnEnd = Math.min(lines.length, lineIdx + 6);
          const fullFunction = lines.slice(fnStart, fnEnd).join('\n');
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

  // Simple heuristic: find balanced braces
  let braceCount = 0;
  let inString: string | null = null;
  let parenDepth = 0;
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

  // Fallback: return ~10 lines around the match
  const allLines = content.split('\n');
  const start = Math.max(0, lineNum - 6);
  const end = Math.min(allLines.length, lineNum + 4);
  return allLines.slice(start, end).join('\n');
}

// ── Simple heuristic description generator ────────────────────────────────────

const VERB_SWAPS = [
  ['filter', 'map'], ['map', 'filter'], ['find', 'filter'],
  ['sort', 'reverse'], ['reduce', 'map'], ['push', 'unshift'],
  ['slice', 'splice'], ['concat', 'merge'], ['split', 'join'],
];

const SUBJECT_SWAPS = [
  ['items', 'users'], ['items', 'products'], ['users', 'accounts'],
  ['data', 'result'], ['result', 'response'], ['error', 'exception'],
  ['config', 'options'], ['params', 'args'],
];

const MUTATION_FLAGS = [
  'mutates', 'modifies', 'changes', 'updates', 'edits',
  'doesn\'t mutate', 'doesn\'t modify', 'immutable',
];

export function generateHeuristicDescription(functionName: string, snippet: string): string {
  const lower = (functionName + snippet).toLowerCase();

  // Try to detect verb
  let verb = 'processes';
  if (/fetch|get|retrieve|load|read/.test(lower)) verb = 'fetches';
  else if (/create|add|insert|post/.test(lower)) verb = 'creates';
  else if (/update|modify|change|set/.test(lower)) verb = 'updates';
  else if (/delete|remove|drop/.test(lower)) verb = 'deletes';
  else if (/filter|find|search|query/.test(lower)) verb = 'finds';
  else if (/map|transform|convert|parse/.test(lower)) verb = 'transforms';
  else if (/validate|sanitize|check|verify/.test(lower)) verb = 'validates';
  else if (/sort|order|arrange/.test(lower)) verb = 'sorts';
  else if (/render|display|show|draw/.test(lower)) verb = 'renders';
  else if (/calculate|compute|compute/.test(lower)) verb = 'calculates';

  // Try to detect subject
  let subject = 'data';
  if (/user|customer|account/.test(lower)) subject = 'users';
  else if (/product|item|inventory/.test(lower)) subject = 'products';
  else if (/order|transaction|payment/.test(lower)) subject = 'orders';
  else if (/config|settings|options|env/.test(lower)) subject = 'configuration';
  else if (/file|document|blob/.test(lower)) subject = 'files';
  else if (/token|auth|credential/.test(lower)) subject = 'tokens';
  else if (/cache|memory|buffer/.test(lower)) subject = 'cache entries';
  else if (/error|exception|fail/.test(lower)) subject = 'errors';

  // Detect mutation
  const hasMutation = /[=]\s*(?!=)[^=]|\.push|\.pop|\.splice|\.sort|\.reverse|\.fill/.test(snippet);
  const mutationDesc = hasMutation ? ' (with side effects)' : ' (pure)';

  // Detect async
  const isAsync = /\basync\b|\bawait\b|Promise|\.then/.test(snippet);
  const asyncDesc = isAsync ? ' asynchronously' : '';

  return `${verb.charAt(0).toUpperCase() + verb.slice(1)}${asyncDesc} ${subject}${mutationDesc}`;
}

export function generateDistractors(correct: string): string[] {
  const distractors: string[] = [];
  const lower = correct.toLowerCase();

  // Verb swaps
  for (const [a, b] of VERB_SWAPS) {
    if (lower.includes(a) && !distractors.includes(correct.replace(new RegExp(a, 'i'), b))) {
      distractors.push(correct.replace(new RegExp(a, 'i'), b));
    }
    if (lower.includes(b) && !distractors.includes(correct.replace(new RegExp(b, 'i'), a))) {
      distractors.push(correct.replace(new RegExp(b, 'i'), a));
    }
  }

  // Subject swaps
  for (const [a, b] of SUBJECT_SWAPS) {
    if (lower.includes(a) && !distractors.includes(correct.replace(new RegExp(a, 'i'), b))) {
      distractors.push(correct.replace(new RegExp(a, 'i'), b));
    }
    if (lower.includes(b) && !distractors.includes(correct.replace(new RegExp(b, 'i'), a))) {
      distractors.push(correct.replace(new RegExp(b, 'i'), a));
    }
  }

  // Mutation flag toggles
  for (const flag of MUTATION_FLAGS) {
    const regex = new RegExp(flag.replace(/[()]/g, '').trim(), 'i');
    if (regex.test(correct)) {
      const opposite = MUTATION_FLAGS.find(f => f !== flag);
      if (opposite) {
        distractors.push(correct.replace(regex, opposite));
      }
    }
  }

  return distractors.slice(0, 3);
}
