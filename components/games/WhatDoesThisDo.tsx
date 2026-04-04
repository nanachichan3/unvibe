'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import TokenMeter from '../TokenMeter';
import AIKeySetup from '../AIKeySetup';
import { generateWhatDoesThisDo } from '@/lib/ai/generators';
import { generateHeuristicDescription, generateDistractors } from '@/lib/patterns/bugs';
import type { FileInfo } from '@/lib/types';

interface WhatDoesThisDoProps {
  files: FileInfo[];
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

// Simple syntax highlighter using CSS classes
function highlightCode(code: string): React.ReactNode {
  const keywords = /\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|type|interface|enum|public|private|protected|static|readonly|const)\b/g;
  const strings = /(['"`])(?:(?!\1)[^\\]|\\.)*\1/g;
  const numbers = /\b\d+\.?\d*\b/g;
  const comments = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
  const functions = /\b([a-zA-Z_]\w*)\s*(?=\()/g;

  // Split by tokens while preserving order
  const parts: Array<{ type: string; text: string }> = [];
  const allTokens: Array<{ type: string; text: string; index: number }> = [];

  let match;
  const tokenRegex = /(?:const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|type|interface|enum|public|private|protected|static|readonly)\b|(['"`])(?:(?!\2)[^\\]|\\.)*\2|\b\d+\.?\d*\b|(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|\b([a-zA-Z_]\w*)\s*(?=\()|./gi;

  // Simple approach: just wrap keywords and strings
  let result = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  result = result.replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>');
  result = result.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955">$1</span>');

  // Strings
  result = result.replace(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span style="color:#ce9178">$1$2$3</span>');

  // Keywords
  result = result.replace(/\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default)\b/g, '<span style="color:#569cd6">$1</span>');

  // Numbers
  result = result.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

  return <code dangerouslySetInnerHTML={{ __html: result }} />;
}

function extractFunctionFromFile(file: FileInfo, minLines = 5, maxLines = 50): string | null {
  if (!file.content) return null;
  const lines = file.content.split('\n');

  // Find function declarations
  const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w*)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*\{/g;
  const arrowRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*=>/g;
  const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^=]+)?\s*\{/g;

  let match;
  const funcMatches: Array<{ start: number; end: number; name: string }> = [];

  // Try to find function-like blocks
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^\s*(?:export\s+)?(?:async\s+)?function\s+\w+/.test(line)) {
      // Find the opening brace and its closing
      let depth = 0;
      let end = -1;
      for (let j = line.indexOf('{'); j < lines.slice(i).join('\n').length; j++) {
        const c = lines.slice(i).join('\n')[j];
        if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth === 0) {
            end = i + lines.slice(i).join('\n').substring(0, j).split('\n').length;
            break;
          }
        }
      }
      const funcBody = lines.slice(i, end > 0 ? end + 1 : i + 20).join('\n');
      if (funcBody.split('\n').length >= minLines && funcBody.split('\n').length <= maxLines) {
        funcMatches.push({ start: i, end: end > 0 ? end + 1 : i + 20, name: line.match(/function\s+(\w+)/)?.[1] || '(anonymous)' });
      }
    }
  }

  if (funcMatches.length === 0) return null;

  // Pick a random function
  const chosen = funcMatches[Math.floor(Math.random() * funcMatches.length)]!;
  return lines.slice(chosen.start, chosen.end).join('\n');
}

export default function WhatDoesThisDo({
  files,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: WhatDoesThisDoProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    explanation: string;
    snippet: string;
    functionName: string;
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
      // Pick a random file with content
      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      if (codeFiles.length === 0) {
        setQuestion({
          options: ['Processes data', 'Filters items', 'Creates records', 'Deletes data'],
          answer: 'Processes data',
          explanation: 'No code files found.',
          snippet: '// No code available',
          functionName: 'unknown',
        });
        setIsGenerating(false);
        return;
      }

      const file = codeFiles[Math.floor(Math.random() * codeFiles.length)]!;
      const snippet = extractFunctionFromFile(file, 5, 50) || file.content?.substring(0, 500) || '';
      const functionName = snippet.match(/function\s+(\w+)/)?.[1] ||
        snippet.match(/(?:const|let)\s+(\w+)\s*=/)?.[1] || 'anonymous';

      const correct = generateHeuristicDescription(functionName, snippet);
      const allDistractors = generateDistractors(correct);
      while (allDistractors.length < 3) {
        allDistractors.push(`${correct.split(' ').slice(0, 2).join(' ')} differently`);
      }

      setQuestion({
        options: shuffleArray([correct, ...allDistractors.slice(0, 3)]),
        answer: correct,
        explanation: `This function ${functionName} appears to ${correct.toLowerCase()}`,
        snippet,
        functionName,
      });
      setIsGenerating(false);
    } else {
      // AI mode
      if (!apiKey) {
        setQuestion({
          options: ['Processes data', 'Filters items', 'Creates records', 'Deletes data'],
          answer: 'Processes data',
          explanation: 'API key required for AI mode.',
          snippet: '// AI mode requires API key',
          functionName: 'unknown',
        });
        setIsGenerating(false);
        return;
      }

      const codeFiles = files.filter(f => f.content && f.content.length > 100);
      if (codeFiles.length === 0) {
        setQuestion({
          options: ['Processes data', 'Filters items', 'Creates records', 'Deletes data'],
          answer: 'Processes data',
          explanation: 'No code files found.',
          snippet: '// No code available',
          functionName: 'unknown',
        });
        setIsGenerating(false);
        return;
      }

      const file = codeFiles[Math.floor(Math.random() * codeFiles.length)]!;
      const snippet = extractFunctionFromFile(file, 5, 50) || file.content?.substring(0, 800) || '';

      try {
        const result = await generateWhatDoesThisDo(snippet, apiKey);
        setRoundTokens(result.tokenCost);
        onSessionTokensChange(sessionTokens + result.tokenCost);

        setQuestion({
          options: result.options,
          answer: result.answer,
          explanation: result.explanation,
          snippet,
          functionName: snippet.match(/function\s+(\w+)/)?.[1] || 'anonymous',
        });
      } catch (err) {
        setQuestion({
          options: ['Processes data', 'Filters items', 'Creates records', 'Deletes data'],
          answer: 'Processes data',
          explanation: `AI error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          snippet,
          functionName: 'unknown',
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
          <span>📖 What Does This Do</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            {mode === 'ai' ? 'Generating with AI...' : 'Analyzing code...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>📖 What Does This Do</span>
        <span className="vim-difficulty vim-difficulty-medium">medium</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Mode toggle */}
        <ModeToggle
          simple={mode === 'simple'}
          onSimpleChange={(v) => setMode(v ? 'simple' : 'ai')}
          roundTokens={roundTokens}
        />

        {/* AI key setup — shows inline form in AI mode when no key, or compact indicator when key exists */}
        {mode === 'ai' && <AIKeySetup compact />}

        {/* Token meter for AI mode */}
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
              }}
            >
              {highlightCode(question.snippet.substring(0, 1000))}
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
          What does this code do?
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
