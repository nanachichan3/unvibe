'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import TokenMeter from '../TokenMeter';
import { generateRefactorOptions } from '@/lib/ai/generators';
import type { FileInfo } from '@/lib/types';

// ── Code smell detection & synthetic messy code ─────────────────────────────

interface CodeSmell {
  type: 'if-else-chain' | 'callback-hell' | 'mutation-loop' | 'magic-number' | 'long-function';
  severity: 'easy' | 'medium' | 'hard';
  description: string;
  snippet: string;
  correctRefactor: string;
  wrongOptions: string[];
}

// Pre-built messy code examples with their smells
const SYNTHETIC_EXAMPLES: CodeSmell[] = [
  {
    type: 'if-else-chain',
    severity: 'easy',
    description: 'Repeated if-else chain that could use an object map',
    snippet: `function getStatusMessage(status) {
  if (status === 'pending') {
    return 'Your request is pending review.';
  } else if (status === 'approved') {
    return 'Your request was approved!';
  } else if (status === 'rejected') {
    return 'Your request was rejected.';
  } else if (status === 'cancelled') {
    return 'Your request was cancelled.';
  } else if (status === 'expired') {
    return 'Your request has expired.';
  } else {
    return 'Unknown status.';
  }
}`,
    correctRefactor: 'Use an object map to replace the if-else chain',
    wrongOptions: [
      'Add more comments to explain each branch',
      'Use a switch statement instead',
      'Remove all conditional branches and return a generic message',
    ],
  },
  {
    type: 'magic-number',
    severity: 'easy',
    description: 'Hardcoded magic number that should be a named constant',
    snippet: `function calculateDeadline(createdAt) {
  const now = new Date();
  const diff = now.getTime() - createdAt.getTime();
  const daysPassed = diff / 86400000;
  if (daysPassed > 30) {
    return 'deadline passed';
  }
  return 'still active';
}`,
    correctRefactor: 'Replace magic number 86400000 with a named constant MS_PER_DAY',
    wrongOptions: [
      'Use floating point division instead of integer',
      'Add a comment explaining what 86400000 means',
      'Move the calculation into a separate function',
    ],
  },
  {
    type: 'callback-hell',
    severity: 'medium',
    description: 'Nested .then() callbacks that could use async/await',
    snippet: `function fetchUserData(userId) {
  return fetchUser(userId)
    .then(user => {
      return fetchPosts(user.id)
        .then(posts => {
          return fetchComments(posts[0].id)
            .then(comments => {
              return fetchLikes(comments[0].id)
                .then(likes => {
                  return { user, posts, comments, likes };
                });
            });
        });
    });
}`,
    correctRefactor: 'Replace nested .then() chains with async/await for flat, readable code',
    wrongOptions: [
      'Add more .then() nesting for better structure',
      'Use Promises.all to fetch everything at once',
      'Remove all callbacks and return the raw data immediately',
    ],
  },
  {
    type: 'mutation-loop',
    severity: 'easy',
    description: 'Mutable loop accumulator that could use functional array methods',
    snippet: `function filterAndTransform(items) {
  let result = [];
  for (let i = 0; i < items.length; i++) {
    if (items[i].isActive) {
      let item = items[i];
      item.name = item.name.trim();
      item.value = item.value * 2;
      result.push(item);
    }
  }
  return result;
}`,
    correctRefactor: 'Replace for loop with .filter().map() functional chain',
    wrongOptions: [
      'Use while loop instead of for loop',
      'Add more variables to track state during iteration',
      'Convert to a recursive function',
    ],
  },
  {
    type: 'if-else-chain',
    severity: 'medium',
    description: 'Repeated if-else with similar logic that duplicates behavior',
    snippet: `function processPayment(order, paymentMethod) {
  if (paymentMethod === 'credit_card') {
    const fee = order.total * 0.029;
    const total = order.total + fee;
    return { success: true, total };
  } else if (paymentMethod === 'debit_card') {
    const fee = order.total * 0.015;
    const total = order.total + fee;
    return { success: true, total };
  } else if (paymentMethod === 'paypal') {
    const fee = order.total * 0.034;
    const total = order.total + fee;
    return { success: true, total };
  } else if (paymentMethod === 'bank_transfer') {
    const fee = order.total * 0.008;
    const total = order.total + fee;
    return { success: true, total };
  }
  return { success: false, error: 'Unknown payment method' };
}`,
    correctRefactor: 'Use an object map to define fee rates and calculate uniformly',
    wrongOptions: [
      'Extract each branch into a separate function',
      'Add more payment methods to cover edge cases',
      'Return the raw order without processing',
    ],
  },
  {
    type: 'magic-number',
    severity: 'hard',
    description: 'Multiple magic numbers scattered throughout calculation',
    snippet: `function calculateScore(stats) {
  const baseScore = stats.points;
  const timeBonus = (stats.timeRemaining / 3600) * 100;
  const comboMultiplier = stats.consecutiveWins * 0.5;
  const finalScore = (baseScore + timeBonus) * (1 + comboMultiplier);
  if (finalScore > 10000) {
    return finalScore * 0.95;
  } else if (finalScore > 5000) {
    return finalScore * 0.97;
  } else if (finalScore > 1000) {
    return finalScore * 0.99;
  }
  return finalScore;
}`,
    correctRefactor: 'Replace magic numbers with named constants for time window, base multiplier, and thresholds',
    wrongOptions: [
      'Use only integer calculations to avoid decimals',
      'Nest the threshold checks more deeply',
      'Remove all numeric constants and use only variables',
    ],
  },
];

// Pattern detector for real code files
function detectCodeSmell(code: string): CodeSmell | null {
  // Check for if-else chains
  const ifElseChainRegex = /(?:if\s*\([^)]+\)\s*\{[^}]+\}\s*else\s+)+if\s*\(/g;
  const ifElseMatches = code.match(ifElseChainRegex);
  if (ifElseMatches && ifElseMatches.length >= 2) {
    const lines = code.split('\n');
    const snippet = lines.slice(0, 20).join('\n');
    return {
      type: 'if-else-chain',
      severity: 'easy',
      description: 'Repeated if-else chain that could use an object map',
      snippet,
      correctRefactor: 'Use an object map to replace the if-else chain',
      wrongOptions: [
        'Add more comments to explain each branch',
        'Use a switch statement instead',
        'Remove all conditional branches and return a generic message',
      ],
    };
  }

  // Check for magic numbers (large numeric literals)
  const magicNumberRegex = /\b([1-9]\d{4,})\b/g;
  const magicMatches = code.match(magicNumberRegex);
  if (magicMatches && magicMatches.length > 0) {
    const lines = code.split('\n');
    const snippet = lines.slice(0, 15).join('\n');
    return {
      type: 'magic-number',
      severity: 'easy',
      description: 'Hardcoded magic number that should be a named constant',
      snippet,
      correctRefactor: 'Replace magic number with a named constant',
      wrongOptions: [
        'Use floating point division instead of integer',
        'Add a comment explaining what the number means',
        'Move the calculation into a separate function',
      ],
    };
  }

  // Check for callback hell (.then chaining)
  const callbackHellRegex = /\.then\s*\([^)]+\)\s*=>\s*\{[^}]*\.then/g;
  if (callbackHellRegex.test(code)) {
    const lines = code.split('\n');
    const snippet = lines.slice(0, 20).join('\n');
    return {
      type: 'callback-hell',
      severity: 'medium',
      description: 'Nested .then() callbacks that could use async/await',
      snippet,
      correctRefactor: 'Replace nested .then() chains with async/await',
      wrongOptions: [
        'Add more .then() nesting for better structure',
        'Use Promises.all to fetch everything at once',
        'Remove all callbacks and return raw data immediately',
      ],
    };
  }

  // Check for mutation loops
  const mutationLoopRegex = /(?:let|var)\s+\w+\s*=\s*\[\][^;]*for\s*\([^)]+\)[^;]*\.push/g;
  if (mutationLoopRegex.test(code)) {
    const lines = code.split('\n');
    const snippet = lines.slice(0, 15).join('\n');
    return {
      type: 'mutation-loop',
      severity: 'easy',
      description: 'Mutable loop accumulator that could use functional array methods',
      snippet,
      correctRefactor: 'Replace for loop with .filter().map() functional chain',
      wrongOptions: [
        'Use while loop instead of for loop',
        'Add more variables to track state during iteration',
        'Convert to a recursive function',
      ],
    };
  }

  return null;
}

// ── Highlighting ─────────────────────────────────────────────────────────────

function highlightCode(code: string): React.ReactNode {
  const lines = code.split('\n');
  const result = lines.map((line, i) => {
    const lineNum = i + 1;
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let highlighted = escaped
      .replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>')
      .replace(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span style="color:#ce9178">$1$2$3</span>')
      .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|typeof)\b/g, '<span style="color:#569cd6">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

    return `<span style="display:block;margin:0;padding:1px 0;">${String(lineNum).padStart(3, ' ')} | ${highlighted}</span>`;
  });

  return <code dangerouslySetInnerHTML={{ __html: result.join('') }} />;
}

// ── Props & Component ────────────────────────────────────────────────────────

interface RefactorThisProps {
  files: FileInfo[];
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

interface Question {
  snippet: string;
  smell: string;
  options: string[];
  answer: string;
  explanation: string;
}

export default function RefactorThis({
  files,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: RefactorThisProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [question, setQuestion] = useState<Question | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuestion = useCallback(async () => {
    setIsGenerating(true);
    setSelected(null);
    setRevealed(false);
    setRoundTokens(0);

    if (mode === 'simple') {
      // Try to find messy code in provided files first
      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      let detectedSmell: CodeSmell | null = null;

      if (codeFiles.length > 0) {
        const shuffled = [...codeFiles].sort(() => Math.random() - 0.5);
        for (const file of shuffled) {
          if (file.content) {
            const smell = detectCodeSmell(file.content);
            if (smell) {
              detectedSmell = smell;
              break;
            }
          }
        }
      }

      // Fall back to synthetic example if no smell found
      if (!detectedSmell) {
        const example = SYNTHETIC_EXAMPLES[Math.floor(Math.random() * SYNTHETIC_EXAMPLES.length)]!;
        detectedSmell = example;
      }

      const correctOption = `${detectedSmell.correctRefactor}`;
      const allOptions = shuffleArray([correctOption, ...detectedSmell.wrongOptions]);

      setQuestion({
        snippet: detectedSmell.snippet,
        smell: detectedSmell.description,
        options: allOptions,
        answer: correctOption,
        explanation: `The correct refactor: ${correctOption}`,
      });
      setIsGenerating(false);
    } else {
      // AI mode
      if (!apiKey) {
        setQuestion({
          snippet: '// API key required for AI mode',
          smell: 'N/A',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          answer: 'Option A',
          explanation: 'Provide an API key to use AI mode.',
        });
        setIsGenerating(false);
        return;
      }

      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      if (codeFiles.length === 0) {
        // Fall back to synthetic example
        const example = SYNTHETIC_EXAMPLES[Math.floor(Math.random() * SYNTHETIC_EXAMPLES.length)]!;
        setQuestion({
          snippet: example.snippet,
          smell: example.description,
          options: shuffleArray([example.correctRefactor, ...example.wrongOptions]),
          answer: example.correctRefactor,
          explanation: `No code files found. Using example: ${example.correctRefactor}`,
        });
        setIsGenerating(false);
        return;
      }

      const file = codeFiles[Math.floor(Math.random() * codeFiles.length)]!;
      const snippet = (file.content || '').substring(0, 1500);

      try {
        const result = await generateRefactorOptions(snippet, apiKey);
        setRoundTokens(result.tokenCost);
        onSessionTokensChange(sessionTokens + result.tokenCost);

        // Build question with the AI-generated options
        // The AI returns "correctRefactor" and "options" array where first is correct
        const correctOption = result.correctRefactor;
        const allOptions = result.options.length >= 4
          ? result.options
          : shuffleArray([correctOption, ...result.options, 'Over-engineered option', 'Still buggy option']);

        setQuestion({
          snippet,
          smell: 'Code smell detected (AI analysis)',
          options: allOptions,
          answer: correctOption,
          explanation: result.explanation,
        });
      } catch (err) {
        // Fallback on error
        const example = SYNTHETIC_EXAMPLES[Math.floor(Math.random() * SYNTHETIC_EXAMPLES.length)]!;
        setQuestion({
          snippet: example.snippet,
          smell: example.description,
          options: shuffleArray([example.correctRefactor, ...example.wrongOptions]),
          answer: example.correctRefactor,
          explanation: `AI error: ${err instanceof Error ? err.message : 'Unknown error'}. Showing example instead.`,
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
          <span>🔄 Refactor This</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            {mode === 'ai' ? 'Analyzing with AI...' : 'Detecting code smells...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>🔄 Refactor This</span>
        <span className="vim-difficulty vim-difficulty-medium">medium</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Mode toggle */}
        <ModeToggle
          simple={mode === 'simple'}
          onSimpleChange={(v) => setMode(v ? 'simple' : 'ai')}
          roundTokens={roundTokens}
        />

        {/* Token meter for AI mode */}
        {mode === 'ai' && <TokenMeter sessionTokens={sessionTokens} roundTokens={roundTokens} />}

        {/* Smell label */}
        {question && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#dcdcaa',
              background: 'rgba(220,220,170,0.1)',
              border: '1px solid rgba(220,220,170,0.3)',
              borderRadius: '4px',
              padding: '6px 12px',
              marginBottom: '12px',
            }}
          >
            ⚡ Code smell: {question.smell}
          </div>
        )}

        {/* Code snippet */}
        {question && (
          <div className="vim-code" style={{ marginBottom: '20px' }}>
            <div className="vim-code-header">
              <span>// messy code</span>
              <span style={{ color: '#569cd6' }}>before refactor</span>
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
          Which refactor makes this code better?
        </h3>

        {/* Options as 2x2 grid with A/B/C/D labels */}
        {question && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '10px',
              marginBottom: '16px',
            }}
          >
            {question.options.map((option, i) => {
              const label = String.fromCharCode(65 + i); // A, B, C, D
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
                  style={{
                    textAlign: 'left',
                    padding: '12px',
                    minHeight: '60px',
                  }}
                >
                  <span
                    className="vim-option-letter"
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      minWidth: '24px',
                    }}
                  >
                    {label}
                  </span>
                  <span className="vim-option-text" style={{ fontSize: '11px' }}>
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
