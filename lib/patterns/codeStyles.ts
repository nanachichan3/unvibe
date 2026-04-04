// Code era/style detection — estimates when code was written based on syntax patterns

export interface StyleMarker {
  id?: string;
  era: string;         // "pre-2015", "2015+", "2017+", "2020+", etc.
  weight: number;        // 1-3, how indicative
  pattern: RegExp;
  description: string;  // "var vs const/let", "callbacks vs async/await", etc.
}

export interface EraResult {
  era: string;
  confidence: number;  // 0-1
  markers: string[];    // descriptions of matched markers
}

export const ERA_MARKERS: StyleMarker[] = [
  // ── pre-2015 (ES5 era) ─────────────────────────────────────────────
  {
    id: 'var-keyword',
    era: 'pre-2015',
    weight: 2,
    pattern: /\bvar\s+/,
    description: 'var keyword (ES5, pre-2015)',
  },
  {
    id: 'callback-pattern',
    era: 'pre-2015',
    weight: 2,
    pattern: /\.on\s*\(|addEventListener|node\.on\(|emitter\.on\(/,
    description: 'Event listener callbacks (pre-promises)',
  },
  {
    id: 'jquery-pattern',
    era: 'pre-2015',
    weight: 2,
    pattern: /\$\s*\(|jQuery\s*\(|\$\.\w+\(|jquery/,
    description: 'jQuery patterns ($() or jQuery())',
  },
  {
    id: 'callback-hell',
    era: 'pre-2015',
    weight: 2,
    pattern: /\.then\s*\([^)]*\)\s*\.then\s*\([^)]*\)\s*\.then/,
    description: 'Promise chain (early promise adoption)',
  },
  {
    id: 'function-expressions',
    era: 'pre-2015',
    weight: 1,
    pattern: /function\s+\w+\s*=\s*(?:function\s*\(|[^(]*\s*=>)/,
    description: 'Named function expressions (ES5 style)',
  },
  {
    id: 'commonjs-require',
    era: 'pre-2015',
    weight: 1,
    pattern: /require\s*\(\s*['"][^'"]+['"]\s*\)/,
    description: 'CommonJS require() (pre-ESM)',
  },
  {
    id: 'console-log',
    era: 'any',
    weight: 0,
    pattern: /console\.(log|warn|error|info|debug)\s*\(/,
    description: 'Console statements',
  },

  // ── 2015+ (ES6 era) ───────────────────────────────────────────────
  {
    id: 'const-let',
    era: '2015+',
    weight: 3,
    pattern: /\b(const|let)\s+/,
    description: 'const/let declarations (ES6, 2015)',
  },
  {
    id: 'arrow-functions',
    era: '2015+',
    weight: 2,
    pattern: /(?<![:\w])(\([^)]*\)|[a-zA-Z_]\w*)\s*=>\s*[{(]|\(\)\s*=>/,
    description: 'Arrow functions (ES6)',
  },
  {
    id: 'template-literals',
    era: '2015+',
    weight: 2,
    pattern: /`[^`]*\$\{[^}]+\}/,
    description: 'Template literals with expressions (ES6)',
  },
  {
    id: 'spread-operator',
    era: '2015+',
    weight: 2,
    pattern: /\.\.\.\w+|\[\s*\.\.\.\w+/,
    description: 'Spread operator (ES6)',
  },
  {
    id: 'destructuring',
    era: '2015+',
    weight: 2,
    pattern: /\{\s*\w+\s*(?:,\s*\w+\s*)*\s*\}=|\[\s*\w+\s*(?:,\s*\w+\s*)*\s*\]=/,
    description: 'Destructuring assignment (ES6)',
  },
  {
    id: 'class-extends',
    era: '2015+',
    weight: 3,
    pattern: /class\s+\w+\s+extends\s+\w+/,
    description: 'Class with extends (ES6)',
  },
  {
    id: 'es6-import',
    era: '2015+',
    weight: 2,
    pattern: /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"][^'"]+['"]/,
    description: 'ES6 import statements',
  },
  {
    id: 'for-of',
    era: '2015+',
    weight: 2,
    pattern: /for\s*\(\s*(?:let|var|const)\s+\w+\s+of\s+/,
    description: 'for...of loop (ES6)',
  },
  {
    id: 'enhanced-object-literals',
    era: '2015+',
    weight: 1,
    pattern: /\{\s*\w+\s*\([^)]*\)/,
    description: 'Shorthand method names in objects (ES6)',
  },
  {
    id: 'default-parameters',
    era: '2015+',
    weight: 1,
    pattern: /\(\s*\w+\s*=\s*[^,)]+\s*(?:,\s*\w+\s*=\s*[^,)]+\s*)*\)/,
    description: 'Default parameters (ES6)',
  },

  // ── 2017+ (ES2017 era) ─────────────────────────────────────────────
  {
    id: 'async-await',
    era: '2017+',
    weight: 3,
    pattern: /\basync\s+(?:function|\(\)|(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>)/,
    description: 'async function declaration (ES2017)',
  },
  {
    id: 'await-expression',
    era: '2017+',
    weight: 2,
    pattern: /(?<![:\w])\bawait\s+(?![^{(])/,
    description: 'await expression (ES2017)',
  },
  {
    id: 'promises',
    era: '2017+',
    weight: 1,
    pattern: /\bnew\s+Promise\s*\(|Promise\.(?:all|race|resolve|reject)\b/,
    description: 'Promise-based patterns',
  },

  // ── 2019+ (ES2019 era) ─────────────────────────────────────────────
  {
    id: 'optional-catch-binding',
    era: '2019+',
    weight: 1,
    pattern: /catch\s*(?:\(\s*\))?\s*\{/,
    description: 'Optional catch binding (ES2019)',
  },
  {
    id: 'array-flat',
    era: '2019+',
    weight: 1,
    pattern: /\.flat\s*(?:\(\s*\))?|\.flatMap\s*\(/,
    description: 'Array.flat/flatMap (ES2019)',
  },
  {
    id: 'decorator-typescript',
    era: '2019+',
    weight: 2,
    pattern: /@(?:component|injectable|module|controller|route|Get|Post|Put|Delete|State|Selector)\b/,
    description: 'Decorators (TypeScript/Angular/NestJS style)',
  },

  // ── 2020+ (ES2020 era) ─────────────────────────────────────────────
  {
    id: 'optional-chaining',
    era: '2020+',
    weight: 3,
    pattern: /\?\.(?!\?)\w+|\?\.\(/,
    description: 'Optional chaining (?.) (ES2020)',
  },
  {
    id: 'nullish-coalescing',
    era: '2020+',
    weight: 3,
    pattern: /\?\?\s*(?![=?])/,
    description: 'Nullish coalescing operator (??) (ES2020)',
  },
  {
    id: 'bigint',
    era: '2020+',
    weight: 1,
    pattern: /\b\d+n\b/,
    description: 'BigInt literal (ES2020)',
  },
  {
    id: 'dynamic-import',
    era: '2020+',
    weight: 1,
    pattern: /import\s*\([^)]*\)/,
    description: 'Dynamic import() (ES2020)',
  },

  // ── 2021+ (ES2021 era) ─────────────────────────────────────────────
  {
    id: 'logical-assignment',
    era: '2021+',
    weight: 1,
    pattern: /\?\?=|\|\|=|&&=/,
    description: 'Logical assignment operators (??=, ||=) (ES2021)',
  },
  {
    id: 'numeric-separator',
    era: '2021+',
    weight: 1,
    pattern: /\b\d{1,3}(?:_\d{3})+\b|\b0x[0-9a-fA-F_]+/,
    description: 'Numeric separators (ES2021)',
  },

  // ── React-specific patterns ────────────────────────────────────────
  {
    id: 'use-state-hook',
    era: '2019+',
    weight: 2,
    pattern: /useState\s*(?:<[^>]+>)?\s*\(/,
    description: 'React useState hook (React 16.8+, 2019)',
  },
  {
    id: 'use-effect-hook',
    era: '2019+',
    weight: 2,
    pattern: /useEffect\s*(?:<[^>]+>)?\s*\(/,
    description: 'React useEffect hook (React 16.8+, 2019)',
  },
  {
    id: 'use-client',
    era: '2023+',
    weight: 2,
    pattern: /['"]use client['"]\s*;?\s*$/m,
    description: 'React "use client" directive (React Server Components, 2023)',
  },
  {
    id: 'use-server',
    era: '2024+',
    weight: 2,
    pattern: /['"]use server['"]\s*;?\s*$/m,
    description: 'React "use server" directive (React Server Components, 2024)',
  },
  {
    id: 'react-from-react',
    era: '2015+',
    weight: 1,
    pattern: /from\s+['"]react['"]/,
    description: 'React import (ES6 module style)',
  },
  {
    id: 'function-generator',
    era: '2015+',
    weight: 1,
    pattern: /function\s*\*\s*\w*\s*\(/,
    description: 'Generator function (ES6)',
  },
  {
    id: 'yield-keyword',
    era: '2015+',
    weight: 1,
    pattern: /\byield\s+(?:\w|\d|\"|'|\{|\[)/,
    description: 'yield keyword in generators (ES6)',
  },
  {
    id: 'typescript-generic',
    era: '2015+',
    weight: 1,
    pattern: /<[A-Z]\w*(?:<[^>]+>)?>/,
    description: 'TypeScript generic type parameters',
  },
  {
    id: 'typescript-annotation',
    era: '2015+',
    weight: 1,
    pattern: /:\s*(?:string|number|boolean|any|void|never|unknown|object)\b/,
    description: 'TypeScript type annotations',
  },
];

/**
 * Detect the era of code based on style markers.
 * Returns the most likely era and confidence score.
 */
export function detectCodeEra(content: string): EraResult {
  const matchedMarkers: StyleMarker[] = [];

  for (const marker of ERA_MARKERS) {
    try {
      if (marker.weight === 0) continue; // Skip noise markers like console.log
      const regex = new RegExp(marker.pattern.source, marker.pattern.flags.includes('g') ? marker.pattern.flags : marker.pattern.flags + 'g');
      if (regex.test(content)) {
        matchedMarkers.push(marker);
      }
    } catch {
      // Skip invalid patterns
    }
  }

  if (matchedMarkers.length === 0) {
    return { era: 'pre-2015', confidence: 0.3, markers: ['No modern patterns detected — likely pre-2015'] };
  }

  // Group by era and compute weighted scores
  const eraScores: Record<string, { score: number; maxScore: number; markers: string[] }> = {};

  for (const marker of matchedMarkers) {
    if (!eraScores[marker.era]) {
      eraScores[marker.era] = { score: 0, maxScore: 0, markers: [] };
    }
    eraScores[marker.era].score += marker.weight;
    eraScores[marker.era].maxScore += 3; // max weight is 3
    eraScores[marker.era].markers.push(marker.description);
  }

  // Find the era with the highest normalized score
  let bestEra = 'pre-2015';
  let bestScore = 0;

  for (const [era, data] of Object.entries(eraScores)) {
    const normalized = data.maxScore > 0 ? data.score / data.maxScore : 0;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestEra = era;
    }
  }

  // Confidence is based on how many markers matched and the consistency
  const confidence = Math.min(0.9, 0.2 + matchedMarkers.length * 0.05 + bestScore * 0.3);

  // Unique markers
  const uniqueDescriptions = [...new Set(matchedMarkers.map(m => m.description))];

  return {
    era: bestEra,
    confidence: Math.round(confidence * 100) / 100,
    markers: uniqueDescriptions,
  };
}

// ── Era answer generation ─────────────────────────────────────────────────────

const ERA_RANGES = [
  { era: 'pre-2015', label: 'Before 2015 (ES5 era)', weight: 1 },
  { era: '2015+', label: '2015-2016 (ES6/ES2015)', weight: 2 },
  { era: '2017+', label: '2017-2019 (async/await, React hooks)', weight: 2 },
  { era: '2020+', label: '2020-2022 (optional chaining, ??)', weight: 2 },
  { era: '2023+', label: '2023+ (React Server Components)', weight: 1 },
];

export function getEraOptions(correctEra: string): string[] {
  const correct = ERA_RANGES.find(e => e.era === correctEra) || ERA_RANGES[0]!;
  const options = [correct.label];

  // Add 3 wrong options
  const wrong = ERA_RANGES.filter(e => e.era !== correctEra);
  const shuffled = wrong.sort(() => Math.random() - 0.5);
  options.push(...shuffled.slice(0, 3).map(e => e.label));

  return options.sort(() => Math.random() - 0.5);
}
