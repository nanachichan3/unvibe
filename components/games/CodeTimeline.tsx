'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import AIKeySetup, { getStoredApiKey, getStoredModel } from '../AIKeySetup';
import TokenMeter from '../TokenMeter';
import { generateCodeTimeline, detectCodeEra, ERA_RANGES } from '@/lib/ai/generators';
import type { FileInfo } from '@/lib/types';

interface CodeTimelineProps {
  files: FileInfo[];
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

// Simple syntax highlighter using CSS classes
function highlightCode(code: string): React.ReactNode {
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

function getEraOptions(correctEra: string): string[] {
  const correct = ERA_RANGES.find(e => e.era === correctEra) || ERA_RANGES[0]!;
  const options = [correct.label];
  const wrong = ERA_RANGES.filter(e => e.era !== correctEra).slice(0, 3);
  options.push(...wrong.map(e => e.label));
  return shuffleArray(options);
}

function extractSnippetFromFile(file: FileInfo, minLength = 100, maxLength = 600): string {
  if (!file.content) return '';

  const content = file.content;

  // Try to find a function first
  const funcMatch = content.match(/(?:export\s+)?(?:async\s+)?(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>[^;]+;?/);
  if (funcMatch) {
    const snippet = funcMatch[0]!;
    if (snippet.length >= minLength) return snippet.substring(0, maxLength);
  }

  const funcBlockMatch = content.match(/(?:export\s+)?(?:async\s+)?function\s+\w+\s*(?:<[^>]*>)?\s*\([^)]*\)[^{]*\{[\s\S]{100,600}?\}/);
  if (funcBlockMatch) {
    return funcBlockMatch[0]!;
  }

  // Fall back to first N characters of content
  return content.substring(0, maxLength);
}

export default function CodeTimeline({
  files,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: CodeTimelineProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    explanation: string;
    snippet: string;
    era: string;
    markers: string[];
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuestion = useCallback(async () => {
    setIsGenerating(true);
    setSelected(null);
    setRevealed(false);
    setRoundTokens(0);

    // Pick a random file with content
    const codeFiles = files.filter(f => f.content && f.content.length > 100);
    if (codeFiles.length === 0) {
      setQuestion({
        options: ['Before 2015', '2015-2016', '2017-2019', '2020+'],
        answer: '2015-2016',
        explanation: 'No code files found.',
        snippet: '// No code available',
        era: '2015+',
        markers: [],
      });
      setIsGenerating(false);
      return;
    }

    const file = codeFiles[Math.floor(Math.random() * codeFiles.length)]!;
    const snippet = extractSnippetFromFile(file) || '';

    if (mode === 'simple') {
      // Simple mode: use detectCodeEra
      const result = detectCodeEra(snippet);
      const correctLabel = ERA_RANGES.find(e => e.era === result.era)?.label || ERA_RANGES[0]!.label;

      setQuestion({
        options: getEraOptions(result.era),
        answer: correctLabel,
        explanation: result.confidence > 0
          ? `Detected ${result.markers.length} era marker(s): ${result.markers.slice(0, 3).join(', ')}${result.markers.length > 3 ? '...' : ''}`
          : 'No clear era markers detected. Guessed based on code patterns.',
        snippet,
        era: result.era,
        markers: result.markers,
      });
      setIsGenerating(false);
    } else {
      // AI mode
      if (!apiKey && !getStoredApiKey()) {
        setQuestion({
          options: ['Before 2015', '2015-2016', '2017-2019', '2020+'],
          answer: '2015-2016',
          explanation: 'API key required for AI mode.',
          snippet,
          era: '2015+',
          markers: [],
        });
        setIsGenerating(false);
        return;
      }

      try {
        const result = await generateCodeTimeline(snippet, apiKey || getStoredApiKey() || '', getStoredModel());
        setRoundTokens(result.tokenCost);
        onSessionTokensChange(sessionTokens + result.tokenCost);

        setQuestion({
          options: result.options,
          answer: result.era,
          explanation: result.explanation,
          snippet,
          era: result.era,
          markers: [],
        });
      } catch (err) {
        setQuestion({
          options: ['Before 2015', '2015-2016', '2017-2019', '2020+'],
          answer: '2015-2016',
          explanation: `AI error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          snippet,
          era: '2015+',
          markers: [],
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
          <span>⏰ Code Timeline</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            {mode === 'ai' ? 'Analyzing with AI...' : 'Detecting era markers...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>⏰ Code Timeline</span>
        <span className="vim-difficulty vim-difficulty-medium">medium</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Mode toggle */}
        <ModeToggle
          simple={mode === 'simple'}
          onSimpleChange={(v) => setMode(v ? 'simple' : 'ai')}
          roundTokens={roundTokens}
        />

        {mode === 'ai' && <AIKeySetup compact />}

        {/* Token meter for AI mode */}
        {mode === 'ai' && <TokenMeter sessionTokens={sessionTokens} roundTokens={roundTokens} />}

        {/* Code snippet */}
        {question && (
          <div className="vim-code" style={{ marginBottom: '20px' }}>
            <div className="vim-code-header">
              <span>// code snippet</span>
              <span style={{ color: '#569cd6' }}>timeline</span>
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
          When was this code likely written?
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
            {question.markers.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#858585' }}>
                <span>Detected markers: </span>
                {question.markers.slice(0, 5).map((marker, i) => (
                  <span key={i} style={{ background: '#2d2d2d', padding: '2px 6px', borderRadius: '3px', marginRight: '4px' }}>
                    {marker}
                  </span>
                ))}
              </div>
            )}
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
