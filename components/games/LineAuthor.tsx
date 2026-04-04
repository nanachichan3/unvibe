'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import AIKeySetup from '../AIKeySetup';
import TokenMeter from '../TokenMeter';
import { generateLineAuthor } from '@/lib/ai/generators';
import type { FileInfo } from '@/lib/types';
import type { GitHubRoundData } from '@/lib/parser';

interface LineAuthorProps {
  files: FileInfo[];
  gitHubData?: GitHubRoundData;
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

// Avatar helpers
function getAvatarColor(name: string): string {
  const colors = ['#569cd6', '#ce9178', '#b5cea8', '#9b87f5', '#c586c0', '#22c55e'];
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;
  return colors[idx];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Extract lines from file content at a random position
function extractLines(content: string, count: number = 3): { lines: string; startLine: number; endLine: number } {
  const allLines = content.split('\n');
  if (allLines.length <= count) {
    return { lines: content, startLine: 1, endLine: allLines.length };
  }
  // Pick a random starting position that's not too close to the end
  const maxStart = Math.max(1, allLines.length - count - 1);
  const startLine = Math.floor(Math.random() * maxStart) + 1;
  const endLine = Math.min(startLine + count - 1, allLines.length);
  const lines = allLines.slice(startLine - 1, startLine - 1 + count).join('\n');
  return { lines, startLine, endLine };
}

// Simple syntax highlighter for code display
function highlightCode(code: string, startLine: number = 1): React.ReactNode {
  const lines = code.split('\n');
  const result = lines.map((line, i) => {
    const lineNum = startLine + i;
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    let highlighted = escaped
      .replace(/(\/\/[^\n]*)/g, '<span style="color:#6a9955">$1</span>')
      .replace(/(['"`])((?:(?!\1)[^\\]|\\.)*)(\1)/g, '<span style="color:#ce9178">$1$2$3</span>')
      .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default)\b/g, '<span style="color:#569cd6">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

    return `<span style="display:block;margin:0;padding:1px 0;">${String(lineNum).padStart(3, ' ')} | ${highlighted}</span>`;
  });

  return <code dangerouslySetInnerHTML={{ __html: result.join('') }} />;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]!];
  }
  return shuffled;
}

// Fallback fake authors for when no GitHub data
const FALLBACK_AUTHORS = [
  'Sarah Chen',
  'Marcus Rodriguez',
  'Priya Patel',
  'Alex Kim',
  'Jordan Taylor',
  'Sam Wilson',
  'Chris Lee',
  'Taylor Brown',
];

export default function LineAuthor({
  files,
  gitHubData,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: LineAuthorProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    explanation: string;
    snippet: string;
    fileName: string;
    filePath: string;
    startLine: number;
    endLine: number;
    authorName: string;
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
      // Simple mode: use gitHubData.fileAuthors if available
      if (!gitHubData || Object.keys(gitHubData.fileAuthors).length === 0) {
        // No GitHub data - use fallback with files
        const codeFiles = files.filter((f) => f.content && f.content.length > 50);
        if (codeFiles.length === 0) {
          setQuestion({
            options: FALLBACK_AUTHORS.slice(0, 4),
            answer: FALLBACK_AUTHORS[0],
            explanation: 'No code files available for this game.',
            snippet: '// No code available',
            fileName: 'unknown',
            filePath: 'unknown',
            startLine: 1,
            endLine: 1,
            authorName: FALLBACK_AUTHORS[0],
          });
          setIsGenerating(false);
          return;
        }

        const file = codeFiles[Math.floor(Math.random() * codeFiles.length)!]!;
        const { lines, startLine, endLine } = extractLines(file.content!, 3);
        const correctAuthor = FALLBACK_AUTHORS[Math.floor(Math.random() * FALLBACK_AUTHORS.length)!];
        const wrongAuthors = shuffleArray(FALLBACK_AUTHORS.filter((a) => a !== correctAuthor)).slice(0, 3);

        setQuestion({
          options: shuffleArray([correctAuthor, ...wrongAuthors]),
          answer: correctAuthor,
          explanation: `Based on code style analysis, ${correctAuthor} likely wrote this code.`,
          snippet: lines,
          fileName: file.name,
          filePath: file.path,
          startLine,
          endLine,
          authorName: correctAuthor,
        });
        setIsGenerating(false);
        return;
      }

      // Use gitHubData.fileAuthors
      const filePaths = Object.keys(gitHubData.fileAuthors);
      const randomFilePath = filePaths[Math.floor(Math.random() * filePaths.length)!]!;
      const correctAuthor = gitHubData.fileAuthors[randomFilePath]!;
      const fileName = randomFilePath.split('/').pop() || randomFilePath;

      // Get the file content for snippet
      const file = files.find((f) => f.path === randomFilePath);
      let snippet = '';
      let startLine = 1;
      let endLine = 1;
      if (file?.content) {
        const extracted = extractLines(file.content, 3);
        snippet = extracted.lines;
        startLine = extracted.startLine;
        endLine = extracted.endLine;
      } else {
        snippet = `// Content for ${fileName} not available\n// Lines ${startLine}-${endLine}`;
      }

      // Get all unique authors
      const allAuthors = [...new Set(Object.values(gitHubData.fileAuthors))];
      const wrongAuthors = shuffleArray(
        allAuthors.filter((a) => a !== correctAuthor)
      ).slice(0, 3);

      // Fill with fallback authors if needed
      while (wrongAuthors.length < 3) {
        const fallback = `Contributor ${wrongAuthors.length + 1}`;
        if (!wrongAuthors.includes(fallback) && fallback !== correctAuthor) {
          wrongAuthors.push(fallback);
        } else {
          break;
        }
      }

      setQuestion({
        options: shuffleArray([correctAuthor, ...wrongAuthors.slice(0, 3)]),
        answer: correctAuthor,
        explanation: `${correctAuthor} made the last commit to this file.`,
        snippet,
        fileName,
        filePath: randomFilePath,
        startLine,
        endLine,
        authorName: correctAuthor,
      });
      setIsGenerating(false);
    } else {
      // AI mode
      if (!apiKey) {
        setQuestion({
          options: FALLBACK_AUTHORS.slice(0, 4),
          answer: FALLBACK_AUTHORS[0],
          explanation: 'API key required for AI mode.',
          snippet: '// AI mode requires API key',
          fileName: 'unknown',
          filePath: 'unknown',
          startLine: 1,
          endLine: 1,
          authorName: FALLBACK_AUTHORS[0],
        });
        setIsGenerating(false);
        return;
      }

      // Collect contributors list
      let contributors: string[];
      if (gitHubData && Object.keys(gitHubData.fileAuthors).length > 0) {
        contributors = [...new Set(Object.values(gitHubData.fileAuthors))];
      } else {
        contributors = FALLBACK_AUTHORS;
      }

      // Pick a random file with content
      const codeFiles = files.filter((f) => f.content && f.content.length > 50);
      if (codeFiles.length === 0) {
        setQuestion({
          options: contributors.slice(0, 4),
          answer: contributors[0] ?? 'Unknown',
          explanation: 'No code files available.',
          snippet: '// No code available',
          fileName: 'unknown',
          filePath: 'unknown',
          startLine: 1,
          endLine: 1,
          authorName: contributors[0] ?? 'Unknown',
        });
        setIsGenerating(false);
        return;
      }

      const file = codeFiles[Math.floor(Math.random() * codeFiles.length)!]!;
      const { lines, startLine, endLine } = extractLines(file.content!, 3);

      try {
        const result = await generateLineAuthor(lines, contributors, apiKey);
        setRoundTokens(result.tokenCost);
        onSessionTokensChange(sessionTokens + result.tokenCost);

        setQuestion({
          options: result.options,
          answer: result.author,
          explanation: result.explanation,
          snippet: lines,
          fileName: file.name,
          filePath: file.path,
          startLine,
          endLine,
          authorName: result.author,
        });
      } catch (err) {
        setQuestion({
          options: contributors.slice(0, 4),
          answer: contributors[0] ?? 'Unknown',
          explanation: `AI error: ${err instanceof Error ? err.message : 'Unknown error'}`,
          snippet: lines,
          fileName: file.name,
          filePath: file.path,
          startLine,
          endLine,
          authorName: contributors[0] ?? 'Unknown',
        });
      }
      setIsGenerating(false);
    }
  }, [mode, files, gitHubData, apiKey, sessionTokens, onSessionTokensChange]);

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
          <span>👥 Line Author</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            {mode === 'ai' ? 'Analyzing code style with AI...' : 'Analyzing code...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>👥 Line Author</span>
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

        {/* Code snippet with line numbers */}
        {question && (
          <div className="vim-code" style={{ marginBottom: '20px' }}>
            <div className="vim-code-header">
              <span style={{ color: '#569cd6' }}>{question.fileName}</span>
              <span style={{ color: '#858585' }}>lines {question.startLine}-{question.endLine}</span>
            </div>
            <pre
              className="vim-code-content"
              style={{
                maxHeight: '200px',
                overflow: 'auto',
                margin: 0,
                padding: '16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '0 0 4px 4px',
                fontSize: '12px',
              }}
            >
              {highlightCode(question.snippet.substring(0, 800), question.startLine)}
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
          Who wrote these lines?
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
                  style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
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
                  <span
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: getAvatarColor(option),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: '#fff',
                      flexShrink: 0,
                    }}
                  >
                    {getInitials(option)}
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
