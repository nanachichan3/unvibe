'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import AIKeySetup, { getStoredApiKey } from '../AIKeySetup';
import { getStoredModel } from '@/lib/ai/client';
import TokenMeter from '../TokenMeter';
import { generateFindTheBug } from '@/lib/ai/generators';
import { detectBugs, type BugMatch } from '@/lib/patterns/bugs';
import type { FileInfo } from '@/lib/types';

interface FindTheBugProps {
  files: FileInfo[];
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

function highlightCodeWithBug(code: string, bugLine: number): React.ReactNode {
  const lines = code.split('\n');
  const result = lines.map((line, i) => {
    const lineNum = i + 1;
    const isBug = lineNum === bugLine;
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Basic highlighting
    let highlighted = escaped
      .replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955">$1</span>')
      .replace(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span style="color:#ce9178">$1$2$3</span>')
      .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default)\b/g, '<span style="color:#569cd6">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

    if (isBug) {
      return `<span style="background:rgba(248,81,73,0.2);display:block;margin:0 -16px;padding:0 16px;border-left:3px solid #f85149;">${String(lineNum).padStart(3, ' ')} | ${highlighted}</span>`;
    }

    return `<span style="display:block;margin:0 -16px;padding:0 16px;">${String(lineNum).padStart(3, ' ')} | ${highlighted}</span>`;
  });

  return <code dangerouslySetInnerHTML={{ __html: result.join('') }} />;
}

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
      .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default)\b/g, '<span style="color:#569cd6">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

    return `<span style="display:block;margin:0 -16px;padding:0 16px;">${String(lineNum).padStart(3, ' ')} | ${highlighted}</span>`;
  });

  return <code dangerouslySetInnerHTML={{ __html: result.join('') }} />;
}

export default function FindTheBug({
  files,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: FindTheBugProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    bugDescription: string;
    fixSuggestion: string;
    snippet: string;
    bugLine: number;
    explanation: string;
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
      // Find a file with bugs
      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      if (codeFiles.length === 0) {
        setQuestion({
          options: ['Loose equality (== instead of ===)', 'Missing return statement', 'Wrong array method', 'Unused variable'],
          answer: 'Loose equality (== instead of ===)',
          bugDescription: 'Loose equality (== instead of ===)',
          fixSuggestion: 'Use strict equality (===)',
          snippet: '// No code available',
          bugLine: 1,
          explanation: 'No code files found for bug detection.',
        });
        setIsGenerating(false);
        return;
      }

      // Try to find bugs in random files
      let bugMatch: BugMatch | null = null;
      const shuffled = [...codeFiles].sort(() => Math.random() - 0.5);

      for (const file of shuffled) {
        if (!file.content) continue;
        const bugs = detectBugs(file.content);
        if (bugs.length > 0) {
          bugMatch = bugs[Math.floor(Math.random() * bugs.length)]!;
          break;
        }
      }

      if (!bugMatch) {
        // Fallback: inject a synthetic bug for demo
        const file = codeFiles[0]!;
        const snippet = `function processData(items) {
  var result = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i] == null) {
      continue;
    }
    result.push(items[i]);
  }
  return result;
}`;
        const bugLine = 4;
        const correctDesc = 'Loose equality (== instead of ===) causes type coercion';
        const otherBugs = [
          'Missing return statement in conditional path',
          'Incorrect array method (find used when filter needed)',
          'Mutated default argument',
        ];

        setQuestion({
          options: shuffleArray([correctDesc, ...otherBugs]),
          answer: correctDesc,
          bugDescription: correctDesc,
          fixSuggestion: 'Use strict equality (===)',
          snippet,
          bugLine,
          explanation: 'The == null check uses loose equality. Use === null instead.',
        });
        setIsGenerating(false);
        return;
      }

      const correctDesc = bugMatch.pattern.description;
      const allBugDescs = bugMatch.pattern.severity === 'easy'
        ? [
          'Missing return statement in conditional path',
          'Incorrect array method (find used when filter needed)',
          'Mutated default argument',
          'await in non-async function',
          'Reassigned const variable',
        ]
        : bugMatch.pattern.severity === 'medium'
          ? [
            'Loose equality (== instead of ===)',
            'Missing return statement',
            'for...in on an array',
            'Double negation (!!)',
          ]
          : [
            'Prototype pollution (__proto__)',
            'Dynamic Function() constructor',
            'Empty catch swallows error',
            'Race condition with shared state',
          ];

      const wrongDescs = allBugDescs.filter(d => d !== correctDesc).slice(0, 3);

      setQuestion({
        options: shuffleArray([correctDesc, ...wrongDescs]),
        answer: correctDesc,
        bugDescription: correctDesc,
        fixSuggestion: bugMatch.pattern.fixSuggestion,
        snippet: bugMatch.fullFunction,
        bugLine: bugMatch.line,
        explanation: `Line ${bugMatch.line}: ${bugMatch.pattern.fixSuggestion}`,
      });
      setIsGenerating(false);
    } else {
      // AI mode
      if (!apiKey && !getStoredApiKey()) {
        setQuestion({
          options: ['Loose equality', 'Missing return', 'Wrong method', 'Unused var'],
          answer: 'Loose equality',
          bugDescription: 'Loose equality',
          fixSuggestion: 'Use ===',
          snippet: '// API key required',
          bugLine: 1,
          explanation: 'API key required for AI mode.',
        });
        setIsGenerating(false);
        return;
      }

      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      if (codeFiles.length === 0) {
        setQuestion({
          options: ['Loose equality', 'Missing return', 'Wrong method', 'Unused var'],
          answer: 'Loose equality',
          bugDescription: 'Loose equality',
          fixSuggestion: 'Use ===',
          snippet: '// No code available',
          bugLine: 1,
          explanation: 'No code files found.',
        });
        setIsGenerating(false);
        return;
      }

      const file = codeFiles[Math.floor(Math.random() * codeFiles.length)]!;
      const snippet = (file.content || '').substring(0, 1500);

      try {
        const result = await generateFindTheBug(snippet, apiKey || getStoredApiKey() || '', getStoredModel());
        setRoundTokens(result.tokenCost);
        onSessionTokensChange(sessionTokens + result.tokenCost);

        // Try to find the bug line for highlighting
        const bugs = detectBugs(snippet);
        const bugLine = bugs.length > 0 ? bugs[0]!.line : Math.floor(Math.random() * snippet.split('\n').length) + 1;

        setQuestion({
          options: result.options,
          answer: result.answer,
          bugDescription: result.bugDescription,
          fixSuggestion: result.fixSuggestion,
          snippet,
          bugLine: Math.min(bugLine, snippet.split('\n').length),
          explanation: result.fixSuggestion,
        });
      } catch (err) {
        setQuestion({
          options: ['Loose equality', 'Missing return', 'Wrong method', 'Unused var'],
          answer: 'Loose equality',
          bugDescription: 'Loose equality',
          fixSuggestion: 'Use ===',
          snippet,
          bugLine: 1,
          explanation: `AI error: ${err instanceof Error ? err.message : 'Unknown'}`,
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
          <span>🔎 Find the Bug</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            {mode === 'ai' ? 'Analyzing with AI...' : 'Scanning for bugs...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>🔎 Find the Bug</span>
        <span className="vim-difficulty vim-difficulty-medium">medium</span>
      </div>

      <div style={{ padding: '20px' }}>
        <ModeToggle
          simple={mode === 'simple'}
          onSimpleChange={(v) => setMode(v ? 'simple' : 'ai')}
          roundTokens={roundTokens}
        />

        {mode === 'ai' && <AIKeySetup compact />}

        {mode === 'ai' && <TokenMeter sessionTokens={sessionTokens} roundTokens={roundTokens} />}

        {/* Bug description label */}
        {question && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#f85149',
              background: 'rgba(248,81,73,0.1)',
              border: '1px solid rgba(248,81,73,0.3)',
              borderRadius: '4px',
              padding: '6px 12px',
              marginBottom: '12px',
            }}
          >
            ⚠ Bug on line {question.bugLine}
          </div>
        )}

        {/* Code snippet with highlighted line */}
        {question && (
          <div className="vim-code" style={{ marginBottom: '20px' }}>
            <div className="vim-code-header">
              <span>// code snippet</span>
              <span style={{ color: '#569cd6' }}>bug on line {question.bugLine}</span>
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
              {highlightCodeWithBug(question.snippet.substring(0, 1500), question.bugLine)}
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
          What is the bug in this code?
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
                  <span className="vim-option-text">{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Result */}
        {revealed && question && (
          <div className={`vim-result ${selected === question.answer ? 'vim-result-correct' : 'vim-result-wrong'}`}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ color: '#f85149', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                {question.bugDescription}
              </span>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6a9955' }}>
              Fix: {question.explanation}
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
