'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import AIKeySetup from '../AIKeySetup';
import TokenMeter from '../TokenMeter';
import { generateTypeInference } from '@/lib/ai/generators';
import type { FileInfo } from '@/lib/types';

interface TypeInferenceProps {
  files: FileInfo[];
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

// ── Type inference heuristics ─────────────────────────────────────────────────

interface TypeInfo {
  type: string;
  confidence: 'high' | 'medium' | 'low';
  displaySnippet: string;
  targetVariable: string;
}

function inferSimpleType(snippet: string, difficulty: Difficulty): TypeInfo | null {
  const lines = snippet.split('\n');

  // Look for explicit return type annotations first
  const returnTypeMatch = snippet.match(/(?:=>\s*|:)\s*([^=({]+?)(?:\s*\{|\s*=>|\s*;|\s*\|\||\s*\?|$)/);
  if (returnTypeMatch) {
    const t = returnTypeMatch[1]!.trim();
    if (t && t.length < 50) {
      return {
        type: t,
        confidence: 'high',
        displaySnippet: snippet,
        targetVariable: 'result',
      };
    }
  }

  // Look for return statements with literals
  for (const line of lines) {
    const trimmed = line.trim();

    // return "string" or return 'string' → string
    const strMatch = trimmed.match(/return\s+(['"`])(.*?)\1/);
    if (strMatch) {
      return {
        type: 'string',
        confidence: 'high',
        displaySnippet: snippet.replace(strMatch[0]!, 'return ?'),
        targetVariable: 'result',
      };
    }

    // return 123 or return 1.5 → number
    const numMatch = trimmed.match(/return\s+(\d+\.?\d*)/);
    if (numMatch) {
      return {
        type: 'number',
        confidence: 'high',
        displaySnippet: snippet.replace(numMatch[0]!, 'return ?'),
        targetVariable: 'result',
      };
    }

    // return true/false/null/undefined → boolean/null/undefined
    const keywordMatch = trimmed.match(/return\s+(true|false|null|undefined)/);
    if (keywordMatch) {
      const kw = keywordMatch[1]!;
      if (kw === 'true' || kw === 'false') {
        return {
          type: 'boolean',
          confidence: 'high',
          displaySnippet: snippet.replace(keywordMatch[0]!, 'return ?'),
          targetVariable: 'result',
        };
      }
      if (kw === 'null') {
        return {
          type: 'null',
          confidence: 'high',
          displaySnippet: snippet.replace(keywordMatch[0]!, 'return ?'),
          targetVariable: 'result',
        };
      }
    }

    // return [] or return [1, 2, 3] → array type
    const arrMatch = trimmed.match(/return\s+\[([^\]]*)\]/);
    if (arrMatch) {
      const content = arrMatch[1]!.trim();
      if (content === '') {
        return {
          type: 'unknown[]',
          confidence: 'medium',
          displaySnippet: snippet.replace(arrMatch[0]!, 'return ?'),
          targetVariable: 'result',
        };
      }
      if (/^\d/.test(content)) {
        return {
          type: 'number[]',
          confidence: 'high',
          displaySnippet: snippet.replace(arrMatch[0]!, 'return ?'),
          targetVariable: 'result',
        };
      }
      if (/^['"`]/.test(content)) {
        return {
          type: 'string[]',
          confidence: 'high',
          displaySnippet: snippet.replace(arrMatch[0]!, 'return ?'),
          targetVariable: 'result',
        };
      }
    }

    // return {} or return { ... } → object
    const objMatch = trimmed.match(/return\s+\{[^}]+\}/);
    if (objMatch && objMatch[0]!.split('\n').length < 5) {
      return {
        type: 'object',
        confidence: 'medium',
        displaySnippet: snippet.replace(objMatch[0]!, 'return ?'),
        targetVariable: 'result',
      };
    }
  }

  // Look for variable assignments with types
  const constMatch = snippet.match(/const\s+\w+\s*(?::\s*([^=]+))?\s*=/);
  if (constMatch && constMatch[1]) {
    const t = constMatch[1]!.trim();
    if (t.length < 40) {
      return {
        type: t,
        confidence: 'high',
        displaySnippet: snippet,
        targetVariable: constMatch[0]!.match(/const\s+(\w+)/)?.[1] || 'x',
      };
    }
  }

  // Look for ternary expressions
  if (snippet.includes('?')) {
    if (difficulty === 'easy') {
      return {
        type: 'boolean',
        confidence: 'medium',
        displaySnippet: snippet,
        targetVariable: 'result',
      };
    }
    // Medium/hard: look for union types in ternary
    const ternaryParts = snippet.split('?');
    if (ternaryParts.length >= 2) {
      const afterQ = ternaryParts[1]!.split(':')[0]!;
      const afterColon = ternaryParts[1]!.split(':')[1] ?? '';
      if (afterQ.trim() === 'null' || afterQ.trim() === 'undefined') {
        return {
          type: 'T | null',
          confidence: 'medium',
          displaySnippet: snippet,
          targetVariable: 'result',
        };
      }
    }
  }

  // Look for async functions
  if (snippet.includes('async')) {
    if (snippet.includes('await')) {
      return {
        type: 'Promise<unknown>',
        confidence: 'medium',
        displaySnippet: snippet,
        targetVariable: 'result',
      };
    }
  }

  // Look for .map(), .filter(), .reduce() → array types
  if (snippet.includes('.map(')) {
    return {
      type: 'unknown[]',
      confidence: 'medium',
      displaySnippet: snippet,
      targetVariable: 'result',
    };
  }
  if (snippet.includes('.filter(')) {
    return {
      type: 'T[]',
      confidence: 'medium',
      displaySnippet: snippet,
      targetVariable: 'result',
    };
  }
  if (snippet.includes('.reduce(')) {
    return {
      type: 'U',
      confidence: 'low',
      displaySnippet: snippet,
      targetVariable: 'result',
    };
  }

  // Look for object property access patterns
  if (snippet.includes('Object.keys') || snippet.includes('Object.values')) {
    return {
      type: 'string[]',
      confidence: 'high',
      displaySnippet: snippet,
      targetVariable: 'result',
    };
  }

  // Default fallback
  return null;
}

function generateDistractors(correctType: string, difficulty: Difficulty): string[] {
  const easyDistractors = ['string', 'number', 'boolean', 'object'];
  const mediumDistractors = ['string[]', 'number[]', 'boolean', 'object', 'null', 'undefined'];
  const hardDistractors = ['Promise<T>', 'T[]', 'Record<string, unknown>', 'Partial<T>', 'T | null'];

  let pool: string[];
  switch (difficulty) {
    case 'easy':
      pool = easyDistractors;
      break;
    case 'medium':
      pool = mediumDistractors;
      break;
    case 'hard':
      pool = hardDistractors;
      break;
  }

  const distractors = pool.filter(t => t !== correctType);
  // Shuffle and pick up to 3
  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]!];
  }
  return distractors.slice(0, 3);
}

function extractFunctionFromFile(file: FileInfo, minLines = 3, maxLines = 30): string | null {
  if (!file.content) return null;
  const lines = file.content.split('\n');

  const funcMatches: Array<{ start: number; end: number; name: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // function declarations
    if (/^\s*(?:export\s+)?(?:async\s+)?function\s+\w+/.test(line)) {
      let depth = 0;
      let end = -1;
      const fullText = lines.slice(i).join('\n');
      for (let j = 0; j < fullText.length; j++) {
        const c = fullText[j]!;
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            end = i + fullText.substring(0, j + 1).split('\n').length;
            break;
          }
        }
      }
      if (end < 0) end = i + Math.min(20, lines.length - i);
      const funcBody = lines.slice(i, end).join('\n');
      if (funcBody.split('\n').length >= minLines) {
        funcMatches.push({ start: i, end, name: line.match(/function\s+(\w+)/)?.[1] || '(anonymous)' });
      }
    }

    // arrow functions / const declarations
    if (/^\s*(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/.test(line)) {
      let depth = 0;
      let end = -1;
      const fullText = lines.slice(i).join('\n');
      for (let j = 0; j < fullText.length; j++) {
        const c = fullText[j]!;
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            end = i + fullText.substring(0, j + 1).split('\n').length;
            break;
          }
        }
      }
      if (end < 0) end = i + Math.min(20, lines.length - i);
      const funcBody = lines.slice(i, end).join('\n');
      if (funcBody.split('\n').length >= minLines) {
        funcMatches.push({ start: i, end, name: line.match(/(?:const|let|var)\s+(\w+)/)?.[1] || '(anonymous)' });
      }
    }
  }

  if (funcMatches.length === 0) return null;

  // Filter by maxLines
  const valid = funcMatches.filter(m => {
    const len = lines.slice(m.start, m.end).join('\n').split('\n').length;
    return len <= maxLines;
  });

  if (valid.length === 0) return null;

  const chosen = valid[Math.floor(Math.random() * valid.length)]!;
  return lines.slice(chosen.start, chosen.end).join('\n');
}

// ── Built-in type inference questions by difficulty ─────────────────────────

const BUILT_IN_QUESTIONS: Record<Difficulty, Array<{ snippet: string; correctType: string; variable: string }>> = {
  easy: [
    {
      snippet: `function getGreeting() {
  return "Hello, World!";
}`,
      correctType: 'string',
      variable: 'result',
    },
    {
      snippet: `function getAge() {
  return 25;
}`,
      correctType: 'number',
      variable: 'result',
    },
    {
      snippet: `function isValid() {
  return true;
}`,
      correctType: 'boolean',
      variable: 'result',
    },
    {
      snippet: `function getConfig() {
  return { theme: "dark", debug: false };
}`,
      correctType: 'object',
      variable: 'result',
    },
    {
      snippet: `function getCount() {
  const n = 42;
  return n;
}`,
      correctType: 'number',
      variable: 'result',
    },
    {
      snippet: `function getMessage() {
  const msg = "welcome";
  return msg;
}`,
      correctType: 'string',
      variable: 'result',
    },
  ],
  medium: [
    {
      snippet: `function getUsers() {
  return ["alice", "bob", "charlie"];
}`,
      correctType: 'string[]',
      variable: 'result',
    },
    {
      snippet: `function findUser(id: number) {
  return id ? { name: "User" } : null;
}`,
      correctType: 'User | null',
      variable: 'result',
    },
    {
      snippet: `async function fetchData() {
  const response = await fetch("/api/data");
  return response.json();
}`,
      correctType: 'Promise<unknown>',
      variable: 'result',
    },
    {
      snippet: `function getScores() {
  return [95, 82, 71, 90];
}`,
      correctType: 'number[]',
      variable: 'result',
    },
    {
      snippet: `function parseJSON(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}`,
      correctType: 'unknown',
      variable: 'result',
    },
  ],
  hard: [
    {
      snippet: `function process<T extends string>(value: T) {
  return value;
}`,
      correctType: 'T',
      variable: 'result',
    },
    {
      snippet: `function getKeys<T extends object>(obj: T) {
  return Object.keys(obj) as (keyof T)[];
}`,
      correctType: '(keyof T)[]',
      variable: 'result',
    },
    {
      snippet: `function createPair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}`,
      correctType: '[T, U]',
      variable: 'result',
    },
    {
      snippet: `type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};`,
      correctType: 'DeepPartial<T>',
      variable: 'result',
    },
    {
      snippet: `function infer<T>(arr: T[]): T extends string ? never : T[] {
  return arr;
}`,
      correctType: 'T extends string ? never : T[]',
      variable: 'result',
    },
  ],
};

// ── Code highlighter ─────────────────────────────────────────────────────────

function highlightCode(code: string): React.ReactNode {
  const result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let highlighted = result
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>')
    .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955">$1</span>')
    .replace(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span style="color:#ce9178">$1$2$3</span>')
    .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|type|interface|enum|public|private|protected|static|readonly|extends|infer|keyof)\b/g, '<span style="color:#569cd6">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

  return <code dangerouslySetInnerHTML={{ __html: highlighted }} />;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function TypeInference({
  files,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: TypeInferenceProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    explanation: string;
    snippet: string;
    functionName: string;
    difficulty: Difficulty;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuestion = useCallback(async () => {
    setIsGenerating(true);
    setSelected(null);
    setRevealed(false);
    setRoundTokens(0);

    if (mode === 'simple') {
      // Pick random difficulty
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
      const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)]!;

      // First try to extract from user files
      let snippet: string | null = null;
      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      if (codeFiles.length > 0) {
        const shuffled = [...codeFiles].sort(() => Math.random() - 0.5);
        for (const file of shuffled) {
          const extracted = extractFunctionFromFile(file, 3, 30);
          if (extracted) {
            const inferred = inferSimpleType(extracted, difficulty);
            if (inferred) {
              snippet = extracted;
              const distractors = generateDistractors(inferred.type, difficulty);
              while (distractors.length < 3) {
                distractors.push(inferred.type === 'string' ? 'number' : 'string');
              }
              const funcName = snippet.match(/function\s+(\w+)/)?.[1] ||
                snippet.match(/(?:const|let|var)\s+(\w+)/)?.[1] || 'anonymous';

              setQuestion({
                options: shuffleArray([inferred.type, ...distractors.slice(0, 3)]),
                answer: inferred.type,
                explanation: `The return type is \`${inferred.type}\` (${inferred.confidence} confidence)`,
                snippet,
                functionName: funcName,
                difficulty,
              });
              setIsGenerating(false);
              return;
            }
          }
        }
      }

      // Fall back to built-in questions
      const builtIns = BUILT_IN_QUESTIONS[difficulty];
      const chosen = builtIns[Math.floor(Math.random() * builtIns.length)]!;
      const distractors = generateDistractors(chosen.correctType, difficulty);
      const funcName = chosen.snippet.match(/function\s+(\w+)/)?.[1] || 'anonymous';

      setQuestion({
        options: shuffleArray([chosen.correctType, ...distractors.slice(0, 3)]),
        answer: chosen.correctType,
        explanation: `The return type is \`${chosen.correctType}\``,
        snippet: chosen.snippet,
        functionName: funcName,
        difficulty,
      });
      setIsGenerating(false);
    } else {
      // AI mode
      if (!apiKey) {
        setQuestion({
          options: ['string', 'number', 'boolean', 'object'],
          answer: 'string',
          explanation: 'API key required for AI mode.',
          snippet: '// AI mode requires an API key',
          functionName: 'unknown',
          difficulty: 'easy',
        });
        setIsGenerating(false);
        return;
      }

      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      if (codeFiles.length === 0) {
        setQuestion({
          options: ['string', 'number', 'boolean', 'object'],
          answer: 'string',
          explanation: 'No code files found.',
          snippet: '// No code available',
          functionName: 'unknown',
          difficulty: 'easy',
        });
        setIsGenerating(false);
        return;
      }

      const file = codeFiles[Math.floor(Math.random() * codeFiles.length)]!;
      const snippet = extractFunctionFromFile(file, 3, 30) || file.content?.substring(0, 800) || '';

      try {
        const result = await generateTypeInference(snippet, apiKey);
        setRoundTokens(result.tokenCost);
        onSessionTokensChange(sessionTokens + result.tokenCost);

        const funcName = snippet.match(/function\s+(\w+)/)?.[1] ||
          snippet.match(/(?:const|let|var)\s+(\w+)/)?.[1] || 'anonymous';

        setQuestion({
          options: result.options,
          answer: result.returnType,
          explanation: result.explanation,
          snippet,
          functionName: funcName,
          difficulty: 'medium',
        });
      } catch (err) {
        setQuestion({
          options: ['string', 'number', 'boolean', 'object'],
          answer: 'string',
          explanation: `AI error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          snippet,
          functionName: 'unknown',
          difficulty: 'easy',
        });
      }
      setIsGenerating(false);
    }
  }, [mode, files, apiKey, sessionTokens, onSessionTokensChange]);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleAnswer = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
  };

  const nextRound = () => {
    generateQuestion();
  };

  if (isGenerating && !question) {
    return (
      <div className="vim-card">
        <div className="vim-card-header">
          <span>🎯 Type Inference</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            {mode === 'ai' ? 'Inferring type with AI...' : 'Analyzing return types...'}
          </p>
        </div>
      </div>
    );
  }

  const difficultyClass = question?.difficulty === 'easy'
    ? 'vim-difficulty-easy'
    : question?.difficulty === 'hard'
      ? 'vim-difficulty-hard'
      : 'vim-difficulty-medium';

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>🎯 Type Inference</span>
        {question && (
          <span className={`vim-difficulty ${difficultyClass}`}>
            {question.difficulty}
          </span>
        )}
      </div>

      <div style={{ padding: '20px' }}>
        <ModeToggle
          simple={mode === 'simple'}
          onSimpleChange={(v) => setMode(v ? 'simple' : 'ai')}
          roundTokens={roundTokens}
        />

        {mode === 'ai' && <AIKeySetup compact />}

        {mode === 'ai' && <TokenMeter sessionTokens={sessionTokens} roundTokens={roundTokens} />}

        {/* Code snippet */}
        {question && (
          <div className="vim-code" style={{ marginBottom: '20px' }}>
            <div className="vim-code-header">
              <span>// snippet</span>
              <span style={{ color: '#569cd6' }}>{question.functionName}()</span>
            </div>
            <pre
              className="vim-code-content"
              style={{
                maxHeight: '300px',
                overflow: 'auto',
                margin: 0,
                padding: '16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '0 0 4px 4px',
                fontSize: '12px',
              }}
            >
              {highlightCode(question.snippet.substring(0, 1200))}
            </pre>
          </div>
        )}

        {/* Question */}
        <h3
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
            color: '#d4d4d4',
            marginBottom: '16px',
          }}
        >
          What is the return type of this function?
        </h3>

        {/* Options */}
        {question && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {question.options.map((option, i) => {
              const isCorrect = option === question.answer;
              const isSelected = selected === option;
              let cls = '';
              if (revealed) {
                if (isCorrect) cls = 'vim-option-correct';
                else if (isSelected) cls = 'vim-option-wrong';
              } else if (isSelected) {
                cls = 'vim-option-selected';
              }

              return (
                <button
                  key={i}
                  className={`vim-option ${cls}`}
                  onClick={() => !revealed && handleAnswer(option)}
                  disabled={revealed}
                >
                  <span className="vim-option-letter">
                    {revealed
                      ? isCorrect
                        ? '✓'
                        : isSelected
                          ? '✗'
                          : String.fromCharCode(65 + i)
                      : String.fromCharCode(65 + i)}
                  </span>
                  <span className="vim-option-text" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Result */}
        {revealed && question && (
          <div className={`vim-result ${selected === question.answer ? 'vim-result-correct' : 'vim-result-wrong'}`}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', color: '#6a9955' }}>
              {question.explanation}
            </p>
            <button className="vim-btn vim-btn-primary" onClick={nextRound} style={{ marginTop: '12px' }}>
              next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]!];
  }
  return shuffled;
}
