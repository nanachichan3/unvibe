// ── Code Era Detection (G9: Code Timeline) ───────────────────────────────────

export interface EraResult {
  era: string;         // "pre-2015", "2015+", "2017+", "2020+", "2023+"
  confidence: number;   // 0-1
  markers: string[];    // descriptions of matched markers
}

export const ERA_RANGES: Array<{ era: string; label: string; weight: number }> = [
  { era: 'pre-2015', label: 'Before 2015 (ES5 era)', weight: 1 },
  { era: '2015+', label: '2015-2016 (ES6/ES2015)', weight: 2 },
  { era: '2017+', label: '2017-2019 (async/await, React hooks)', weight: 2 },
  { era: '2020+', label: '2020-2022 (optional chaining, ??)', weight: 2 },
  { era: '2023+', label: '2023+ (React Server Components)', weight: 1 },
];

const ERA_MARKERS: Array<{ pattern: RegExp; era: string; description: string; weight: number }> = [
  // Pre-2015 patterns
  { pattern: /\bvar\s+\w+\s*=/, era: 'pre-2015', description: 'var keyword (ES5)', weight: 1 },
  { pattern: /\$\.\w+\(/, era: 'pre-2015', description: 'jQuery pattern ($())', weight: 2 },
  { pattern: /document\.getElementById/, era: 'pre-2015', description: 'Vanilla DOM manipulation', weight: 1 },
  { pattern: /\.ajax\s*\(/, era: 'pre-2015', description: 'jQuery AJAX', weight: 2 },
  { pattern: /require\s*\(/, era: 'pre-2015', description: 'CommonJS require()', weight: 1 },
  { pattern: /module\.exports/, era: 'pre-2015', description: 'CommonJS exports', weight: 1 },
  { pattern: /callback\s*\)\s*\);/, era: 'pre-2015', description: 'Callback pyramid', weight: 1 },

  // 2015+ patterns (ES6)
  { pattern: /\bconst\s+\w+\s*=/, era: '2015+', description: 'const keyword (ES6)', weight: 1 },
  { pattern: /\blet\s+\w+\s*=/, era: '2015+', description: 'let keyword (ES6)', weight: 1 },
  { pattern: /=>\s*[{(]/, era: '2015+', description: 'Arrow functions', weight: 1 },
  { pattern: /`[^`]*\$\{[^}]+\}[^`]*`/, era: '2015+', description: 'Template literals', weight: 1 },
  { pattern: /\bimport\s+.*\s+from\s+['"]/, era: '2015+', description: 'ES6 import', weight: 1 },
  { pattern: /import\s+\{[^}]+\}\s+from/, era: '2015+', description: 'ES6 named imports', weight: 1 },
  { pattern: /\bclass\s+\w+\s+extends\b/, era: '2015+', description: 'ES6 class inheritance', weight: 1 },
  { pattern: /\bSet\s*<|, Map\s*</, era: '2015+', description: 'ES6 generic collections', weight: 1 },
  { pattern: /\bPromise\s*</, era: '2015+', description: 'ES6 Promises', weight: 1 },
  { pattern: /: string\s*\|/, era: '2015+', description: 'TypeScript union types', weight: 1 },
  { pattern: /interface\s+\w+\s*\{/, era: '2015+', description: 'TypeScript interfaces', weight: 1 },

  // 2017+ patterns
  { pattern: /\basync\s+/, era: '2017+', description: 'async function', weight: 2 },
  { pattern: /\bawait\s+/, era: '2017+', description: 'await keyword', weight: 2 },
  { pattern: /useState\s*</, era: '2017+', description: 'React useState hook', weight: 2 },
  { pattern: /useEffect\s*\(/, era: '2017+', description: 'React useEffect hook', weight: 2 },
  { pattern: /useMemo\s*\(/, era: '2017+', description: 'React useMemo hook', weight: 2 },
  { pattern: /useCallback\s*\(/, era: '2017+', description: 'React useCallback hook', weight: 2 },
  { pattern: /React\.useState/, era: '2017+', description: 'React hooks (class-to-hooks era)', weight: 2 },

  // 2020+ patterns
  { pattern: /\?\?\s*[=]/, era: '2020+', description: 'Nullish coalescing operator (??)', weight: 2 },
  { pattern: /\?.\s*\w/, era: '2020+', description: 'Optional chaining (?.)', weight: 2 },
  { pattern: /\.replaceAll\s*\(/, era: '2020+', description: 'String replaceAll (ES2021)', weight: 2 },
  { pattern: /\bPromise\.allSettled/, era: '2020+', description: 'Promise.allSettled (ES2020)', weight: 1 },
  { pattern: /\bglobalThis\./, era: '2020+', description: 'globalThis (ES2020)', weight: 1 },
  { pattern: /BigInt\s*\(/, era: '2020+', description: 'BigInt type', weight: 1 },
  { pattern: /\bimport\s*\(/, era: '2020+', description: 'Dynamic import()', weight: 1 },

  // 2023+ patterns
  { pattern: /\buse\s*\(\s*\w+/, era: '2023+', description: 'React Server Components / use()', weight: 3 },
  { pattern: /'use client'/, era: '2023+', description: 'React Server Components directive', weight: 3 },
  { pattern: /'use server'/, era: '2023+', description: 'React Server Components directive', weight: 3 },
  { pattern: /React\.startTransition/, era: '2023+', description: 'React 18 startTransition', weight: 2 },
  { pattern: /\bSuspense\s*/, era: '2023+', description: 'React Suspense (RSC era)', weight: 2 },
  { pattern: /Server\s*\.\s*Component/, era: '2023+', description: 'Server Component pattern', weight: 3 },
  { pattern: /\btop-level\s+await\b/, era: '2023+', description: 'Top-level await (ES2022)', weight: 2 },
];

export function detectCodeEra(content: string): EraResult {
  const matchedMarkers: Array<{ era: string; description: string; weight: number }> = [];

  for (const marker of ERA_MARKERS) {
    if (marker.pattern.test(content)) {
      matchedMarkers.push({
        era: marker.era,
        description: marker.description,
        weight: marker.weight,
      });
    }
  }

  // Score each era
  const eraScores: Record<string, number> = {};
  for (const match of matchedMarkers) {
    eraScores[match.era] = (eraScores[match.era] || 0) + match.weight;
  }

  // Find the era with the highest score
  let topEra = ERA_RANGES[0]!.era;
  let topScore = 0;
  for (const [era, score] of Object.entries(eraScores)) {
    if (score > topScore) {
      topScore = score;
      topEra = era;
    }
  }

  // Calculate confidence (0-1) based on marker matches
  const confidence = Math.min(1, matchedMarkers.length / 3);

  return {
    era: topEra,
    confidence,
    markers: matchedMarkers.map(m => m.description),
  };
}

// AI-powered question generators for games

import { createAIGenerator, parseJSON, type AIResponse, getStoredModel } from './client';

// ── Shared prompt builder ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a code analysis AI for a game called "Unvibe". You generate quiz questions about code snippets.
Answer ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

// ── G1: What Does This Do? ───────────────────────────────────────────────────

export interface WhatDoesThisDoResult {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  tokenCost: number;
}

export async function generateWhatDoesThisDo(
  snippet: string,
  apiKey: string,
  model?: string,
): Promise<WhatDoesThisDoResult> {
  const effectiveModel = model || getStoredModel();
  const generator = createAIGenerator({ apiKey, model: effectiveModel });

  const prompt = `${SYSTEM_PROMPT}

Given this code snippet:
\`\`\`
${snippet.substring(0, 2000)}
\`\`\`

Generate 1 correct and 3 wrong but plausible descriptions of what this code does.

Rules for descriptions:
- Each description should be 1-2 sentences
- Correct answer should accurately describe the behavior
- Wrong answers should be plausible but incorrect (swap verbs like "filter"↔"map", swap subjects like "users"↔"products", or add/remove side effects)
- Do NOT use letter prefixes like "A)", "B)" etc. — just the description text

Return JSON:
{
  "correct": "description of what this does",
  "options": ["correct description", "wrong description 1", "wrong description 2", "wrong description 3"],
  "explanation": "brief explanation of the correct answer",
  "tokenCost": number // estimated tokens used for this call (input + output)
}`;

  const response = await generator.generate(prompt);
  const parsed = parseJSON<{ correct: string; options: string[]; explanation: string }>(response.text);

  if (!parsed || !parsed.options || parsed.options.length < 4) {
    return {
      question: 'What does this code do?',
      options: ['Processes data', 'Filters items', 'Creates users', 'Deletes records'],
      answer: 'Processes data',
      explanation: 'Unable to generate better options.',
      tokenCost: response.inputTokens + response.outputTokens,
    };
  }

  return {
    question: 'What does this code do?',
    options: parsed.options,
    answer: parsed.correct,
    explanation: parsed.explanation,
    tokenCost: response.inputTokens + response.outputTokens,
  };
}

// ── G2: Find the Bug ─────────────────────────────────────────────────────────

export interface FindTheBugResult {
  bugDescription: string;
  fixSuggestion: string;
  options: string[];
  answer: string;
  tokenCost: number;
}

export async function generateFindTheBug(
  snippet: string,
  apiKey: string,
  model?: string,
): Promise<FindTheBugResult> {
  const effectiveModel = model || getStoredModel();
  const generator = createAIGenerator({ apiKey, model: effectiveModel });

  const prompt = `${SYSTEM_PROMPT}

Analyze this code and identify the most significant bug:

\`\`\`
${snippet.substring(0, 2000)}
\`\`\`

Rules:
- Pick the most impactful/real bug in the code (not a stylistic preference)
- Bug descriptions should be specific: e.g. "== instead of === causes type coercion" not just "loose equality"
- Fix suggestions should be actionable: e.g. "Use === for strict equality comparison"
- Wrong options should describe OTHER potential bugs (not the correct one) that could plausibly be in this code

Return JSON:
{
  "bugDescription": "specific description of the bug",
  "fixSuggestion": "how to fix it",
  "options": ["bug description 1 (correct)", "wrong bug 2", "wrong bug 3", "wrong bug 4"],
  "tokenCost": number
}`;

  const response = await generator.generate(prompt);
  const parsed = parseJSON<{ bugDescription: string; fixSuggestion: string; options: string[] }>(response.text);

  if (!parsed || !parsed.options || parsed.options.length < 4) {
    return {
      bugDescription: 'Potential type coercion issue',
      fixSuggestion: 'Use strict equality ===',
      options: ['Loose equality (==) instead of ===', 'Missing return statement', 'Wrong array method', 'Unused variable'],
      answer: 'Loose equality (==) instead of ===',
      tokenCost: response.inputTokens + response.outputTokens,
    };
  }

  return {
    bugDescription: parsed.bugDescription,
    fixSuggestion: parsed.fixSuggestion,
    options: parsed.options,
    answer: parsed.options[0]!,
    tokenCost: response.inputTokens + response.outputTokens,
  };
}

// ── G4: Spot the Vulnerability ───────────────────────────────────────────────

export interface SpotTheVulnResult {
  vulnerableIndex: number;
  vulnerability: string;
  explanation: string;
  options: string[];
  tokenCost: number;
}

export async function generateSpotVuln(
  snippets: { label: string; code: string }[],
  apiKey: string,
  model?: string,
): Promise<SpotTheVulnResult> {
  const effectiveModel = model || getStoredModel();
  const generator = createAIGenerator({ apiKey, model: effectiveModel });

  const snippetTexts = snippets
    .map((s, i) => `[${i}] ${s.label}:\n\`\`\`\n${s.code.substring(0, 500)}\n\`\`\``)
    .join('\n\n');

  const prompt = `${SYSTEM_PROMPT}

Four code snippets are shown. Exactly ONE contains a security vulnerability. Identify which one.

${snippetTexts}

Rules:
- Only ONE snippet has a real security vulnerability
- The vulnerability should be a genuine security issue (XSS, SQL injection, code injection, etc.)
- Other snippets should be clean (minor code quality issues don't count as vulnerabilities)
- Options should be just the label text of each snippet

Return JSON:
{
  "vulnerableIndex": 0, // 0-based index of the vulnerable snippet
  "vulnerability": "name of the vulnerability type",
  "explanation": "why this is vulnerable and the others aren't",
  "options": ["A) first label", "B) second label", "C) third label", "D) fourth label"],
  "tokenCost": number
}`;

  const response = await generator.generate(prompt);
  const parsed = parseJSON<{ vulnerableIndex: number; vulnerability: string; explanation: string; options: string[] }>(response.text);

  if (!parsed) {
    return {
      vulnerableIndex: 0,
      vulnerability: 'Security vulnerability',
      explanation: 'Unable to analyze.',
      options: snippets.map((s, i) => `${String.fromCharCode(65 + i)}) ${s.label}`),
      tokenCost: response.inputTokens + response.outputTokens,
    };
  }

  return {
    vulnerableIndex: parsed.vulnerableIndex,
    vulnerability: parsed.vulnerability,
    explanation: parsed.explanation,
    options: parsed.options,
    tokenCost: response.inputTokens + response.outputTokens,
  };
}

// ── G5: Type Inference ───────────────────────────────────────────────────────

export interface TypeInferenceResult {
  returnType: string;
  options: string[];
  explanation: string;
  tokenCost: number;
}

export async function generateTypeInference(
  snippet: string,
  apiKey: string,
  model?: string,
): Promise<TypeInferenceResult> {
  const effectiveModel = model || getStoredModel();
  const generator = createAIGenerator({ apiKey, model: effectiveModel });

  const prompt = `${SYSTEM_PROMPT}

Analyze this code and determine the return type of the function:

\`\`\`
${snippet.substring(0, 1500)}
\`\`\`

Rules:
- Answer the return type as a TypeScript-like type (e.g., "Promise<string>", "number[]", "User | null", "void")
- Include "?" for nullable types
- Options should include the correct type and 3 plausible but wrong alternatives

Return JSON:
{
  "returnType": "the inferred return type",
  "options": ["correct type", "wrong type 1", "wrong type 2", "wrong type 3"],
  "explanation": "how you determined the return type",
  "tokenCost": number
}`;

  const response = await generator.generate(prompt);
  const parsed = parseJSON<{ returnType: string; options: string[]; explanation: string }>(response.text);

  if (!parsed || !parsed.options || parsed.options.length < 4) {
    return {
      returnType: 'unknown',
      options: ['string', 'number', 'boolean', 'object'],
      explanation: 'Unable to infer type.',
      tokenCost: response.inputTokens + response.outputTokens,
    };
  }

  return {
    returnType: parsed.returnType,
    options: parsed.options,
    explanation: parsed.explanation,
    tokenCost: response.inputTokens + response.outputTokens,
  };
}

// ── G6: Refactor This ─────────────────────────────────────────────────────────

export interface RefactorResult {
  correctRefactor: string;
  options: string[];
  explanation: string;
  tokenCost: number;
}

export async function generateRefactorOptions(
  snippet: string,
  apiKey: string,
  model?: string,
): Promise<RefactorResult> {
  const effectiveModel = model || getStoredModel();
  const generator = createAIGenerator({ apiKey, model: effectiveModel });

  const prompt = `${SYSTEM_PROMPT}

Given this messy/buggy code, generate 4 refactored versions. Exactly ONE should be better AND correct. The others should be plausible but worse (over-engineered, still buggy, or style-only).

\`\`\`
${snippet.substring(0, 1500)}
\`\`\`

Rules:
- Correct refactor should fix the main issue and improve readability
- Wrong options should each have a specific flaw: over-engineered, still buggy, style-only, or incomplete fix
- Present each option as a short description of what makes it different (not the full code)

Return JSON:
{
  "correctRefactor": "description of the correct refactor",
  "options": ["correct description", "over-engineered option", "still buggy option", "style-only option"],
  "explanation": "why the correct option is better",
  "tokenCost": number
}`;

  const response = await generator.generate(prompt);
  const parsed = parseJSON<{ correctRefactor: string; options: string[]; explanation: string }>(response.text);

  if (!parsed || !parsed.options || parsed.options.length < 4) {
    return {
      correctRefactor: 'Simplified with better naming',
      options: ['Simplified with better naming', 'Added more abstraction', 'Removed all comments', 'Used a different language'],
      explanation: 'Unable to generate better options.',
      tokenCost: response.inputTokens + response.outputTokens,
    };
  }

  return {
    correctRefactor: parsed.correctRefactor,
    options: parsed.options,
    explanation: parsed.explanation,
    tokenCost: response.inputTokens + response.outputTokens,
  };
}

// ── G9: Code Timeline ─────────────────────────────────────────────────────────

export interface CodeTimelineResult {
  era: string;
  options: string[];
  explanation: string;
  tokenCost: number;
}

export async function generateCodeTimeline(
  snippet: string,
  apiKey: string,
  model?: string,
): Promise<CodeTimelineResult> {
  const effectiveModel = model || getStoredModel();
  const generator = createAIGenerator({ apiKey, model: effectiveModel });

  const prompt = `${SYSTEM_PROMPT}

Analyze this code and estimate when it was likely written based on its style and syntax.

\`\`\`
${snippet.substring(0, 2000)}
\`\`\`

Rules:
- Consider JavaScript/TypeScript era markers: var (pre-2015), const/let (ES6 2015), async/await (ES2017), optional chaining ?.
- Other patterns: jQuery (pre-2015), React hooks (2019+), TypeScript generics (2015+), React Server Components (2023+)
- Give 4 year/era range options, one correct

Return JSON:
{
  "era": "estimated era",
  "options": ["Before 2015", "2015-2019", "2020-2022", "2023+"],
  "explanation": "which patterns indicated this era",
  "tokenCost": number
}`;

  const response = await generator.generate(prompt);
  const parsed = parseJSON<{ era: string; options: string[]; explanation: string }>(response.text);

  if (!parsed || !parsed.options || parsed.options.length < 4) {
    return {
      era: '2015+',
      options: ['Before 2015', '2015-2019', '2020-2022', '2023+'],
      explanation: 'Unable to analyze.',
      tokenCost: response.inputTokens + response.outputTokens,
    };
  }

  return {
    era: parsed.era,
    options: parsed.options,
    explanation: parsed.explanation,
    tokenCost: response.inputTokens + response.outputTokens,
  };
}

// ── G11: Line Author ──────────────────────────────────────────────────────────

export interface LineAuthorResult {
  author: string;
  options: string[];
  explanation: string;
  tokenCost: number;
}

export async function generateLineAuthor(
  line: string,
  contributors: string[],
  apiKey: string,
  model?: string,
): Promise<LineAuthorResult> {
  const effectiveModel = model || getStoredModel();
  const generator = createAIGenerator({ apiKey, model: effectiveModel });

  const prompt = `${SYSTEM_PROMPT}

A specific line of code was selected from a repository. Based on its style, naming conventions, and patterns, which contributor likely wrote it?

Line:
\`\`\`
${line.substring(0, 300)}
\`\`\`

Contributors to choose from:
${contributors.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Rules:
- Pick the contributor whose style most closely matches this line
- Consider: naming conventions, formatting style, common patterns, variable naming
- The 3 wrong options should be other contributors from the list

Return JSON:
{
  "author": "name of the author",
  "options": ["correct author", "wrong author 1", "wrong author 2", "wrong author 3"],
  "explanation": "what style cues indicated this author",
  "tokenCost": number
}`;

  const response = await generator.generate(prompt);
  const parsed = parseJSON<{ author: string; options: string[]; explanation: string }>(response.text);

  const allAuthors = contributors.slice(0, 4);
  while (allAuthors.length < 4) {
    allAuthors.push(`Contributor ${allAuthors.length + 1}`);
  }

  if (!parsed || !parsed.options || parsed.options.length < 4) {
    return {
      author: contributors[0] ?? 'Unknown',
      options: allAuthors,
      explanation: 'Unable to analyze.',
      tokenCost: response.inputTokens + response.outputTokens,
    };
  }

  return {
    author: parsed.author,
    options: parsed.options,
    explanation: parsed.explanation,
    tokenCost: response.inputTokens + response.outputTokens,
  };
}
