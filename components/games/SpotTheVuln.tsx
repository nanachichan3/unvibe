'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import TokenMeter from '../TokenMeter';
import { generateSpotVuln } from '@/lib/ai/generators';
import { detectVulnerabilities, type VulnerabilityMatch } from '@/lib/patterns/vulnerabilities';
import type { FileInfo } from '@/lib/types';

interface SpotTheVulnProps {
  files: FileInfo[];
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
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
      .replace(/\b(const|let|var|function|async|await|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|throw|new|class|extends|import|export|from|default|require)\b/g, '<span style="color:#569cd6">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');

    return `<span style="display:block;margin:0;padding:1px 0;">${String(lineNum).padStart(3, ' ')} | ${highlighted}</span>`;
  });

  return <code dangerouslySetInnerHTML={{ __html: result.join('') }} />;
}

const LABELS = ['A', 'B', 'C', 'D'];

export default function SpotTheVuln({
  files,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: SpotTheVulnProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [snippets, setSnippets] = useState<Array<{ label: string; code: string; hasVuln: boolean }>>([]);
  const [vulnInfo, setVulnInfo] = useState<{ name: string; explanation: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuestion = useCallback(async () => {
    setIsGenerating(true);
    setSelected(null);
    setRevealed(false);
    setRoundTokens(0);
    setVulnInfo(null);

    const codeFiles = files.filter(f => f.content && f.content.length > 50);
    if (codeFiles.length === 0) {
      // Fallback with synthetic data
      const fallbackSnippets = [
        { label: 'A', code: 'function greet(name) {\n  return `Hello, ${name}!`;\n}', hasVuln: false },
        { label: 'B', code: 'const result = eval(userInput);\nreturn result;', hasVuln: true },
        { label: 'C', code: 'function add(a, b) {\n  return a + b;\n}', hasVuln: false },
        { label: 'D', code: 'const config = require("./config.json");', hasVuln: false },
      ];
      setSnippets(fallbackSnippets);
      setVulnInfo({ name: 'Code injection via eval()', explanation: 'eval() with user input allows arbitrary code execution.' });
      setIsGenerating(false);
      return;
    }

    if (mode === 'simple') {
      // Find files with vulnerabilities
      let vulnFile: { file: FileInfo; match: VulnerabilityMatch } | null = null;
      const shuffled = [...codeFiles].sort(() => Math.random() - 0.5);

      for (const file of shuffled) {
        if (!file.content) continue;
        const vulns = detectVulnerabilities(file.content);
        if (vulns.length > 0) {
          vulnFile = { file, match: vulns[0]! };
          break;
        }
      }

      if (!vulnFile) {
        // Fallback: use a file with a synthetic vuln
        const file = codeFiles[Math.floor(Math.random() * codeFiles.length)]!;
        const vulnCode = `const query = \`SELECT * FROM users WHERE id = \${req.params.id}\`;`;
        const cleanCode = `function getUser(id) {\n  return db.find(u => u.id === id);\n}`;

        const s = shuffleArray([
          { label: 'A', code: cleanCode, hasVuln: false },
          { label: 'B', code: `const password = "hunter2";\nconst token = Math.random();`, hasVuln: true },
          { label: 'C', code: `import { useState } from 'react';`, hasVuln: false },
          { label: 'D', code: `const API_KEY = process.env.KEY;`, hasVuln: false },
        ]);
        setSnippets(s);
        setVulnInfo({ name: 'Hardcoded credentials and weak crypto', explanation: 'Passwords and Math.random() are not safe for tokens.' });
        setIsGenerating(false);
        return;
      }

      // Pick 3 other clean files
      const cleanFiles = codeFiles
        .filter(f => f.path !== vulnFile!.file.path)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);

      const vulnCode = vulnFile.match.fullFunction || vulnFile.file.content?.substring(0, 300) || '';
      const cleanSnippets = cleanFiles.map((f, i) => ({
        label: LABELS[(i >= LABELS.indexOf('A') ? i + 1 : i)],
        code: f.content?.substring(0, 300) || '',
        hasVuln: false,
      }));

      // Insert vuln code at a random position
      const vulnSnippet = { label: 'A', code: vulnCode, hasVuln: true };
      const allSnippets = [...cleanSnippets];
      const insertPos = Math.floor(Math.random() * 4);
      allSnippets.splice(insertPos, 0, vulnSnippet);

      // Relabel
      const relabeled = allSnippets.map((s, i) => ({
        ...s,
        label: LABELS[i]!,
      }));

      setSnippets(relabeled);
      setVulnInfo({
        name: vulnFile.match.pattern.name,
        explanation: vulnFile.match.pattern.fixSuggestion,
      });
      setIsGenerating(false);
    } else {
      // AI mode
      if (!apiKey) {
        setSnippets([
          { label: 'A', code: '// API key required', hasVuln: false },
          { label: 'B', code: '// API key required', hasVuln: false },
          { label: 'C', code: '// API key required', hasVuln: false },
          { label: 'D', code: '// API key required', hasVuln: false },
        ]);
        setVulnInfo({ name: 'API key required', explanation: 'Provide an API key to use AI mode.' });
        setIsGenerating(false);
        return;
      }

      // Pick 4 random files
      const shuffled = [...codeFiles].sort(() => Math.random() - 0.5);
      const selectedFiles = shuffled.slice(0, 4);

      const snippetData = selectedFiles.map((f, i) => ({
        label: LABELS[i]!,
        code: f.content?.substring(0, 500) || '',
        hasVuln: false,
      }));

      try {
        const result = await generateSpotVuln(snippetData, apiKey);
        setRoundTokens(result.tokenCost);
        onSessionTokensChange(sessionTokens + result.tokenCost);

        const updatedSnippets = snippetData.map((s, i) => ({
          ...s,
          hasVuln: i === result.vulnerableIndex,
        }));

        setSnippets(updatedSnippets);
        setVulnInfo({
          name: result.vulnerability,
          explanation: result.explanation,
        });
      } catch (err) {
        setSnippets(snippetData);
        setVulnInfo({
          name: 'AI Error',
          explanation: err instanceof Error ? err.message : 'Unknown error',
        });
      }
      setIsGenerating(false);
    }
  }, [mode, files, apiKey, sessionTokens, onSessionTokensChange]);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleSelect = (label: string) => {
    if (revealed) return;
    setSelected(label);
    setRevealed(true);
  };

  const nextRound = () => {
    generateQuestion();
  };

  const vulnerableLabel = snippets.find(s => s.hasVuln)?.label;

  if (isGenerating && snippets.length === 0) {
    return (
      <div className="vim-card">
        <div className="vim-card-header">
          <span>🛡️ Spot the Vulnerability</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            {mode === 'ai' ? 'Analyzing with AI...' : 'Scanning for vulnerabilities...'}
          </p>
        </div>
      </div>
    );
  }

  // Split into 2x2 grid
  const grid = [
    snippets.slice(0, 2),
    snippets.slice(2, 4),
  ];

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>🛡️ Spot the Vulnerability</span>
        <span className="vim-difficulty vim-difficulty-hard">hard</span>
      </div>

      <div style={{ padding: '20px' }}>
        <ModeToggle
          simple={mode === 'simple'}
          onSimpleChange={(v) => setMode(v ? 'simple' : 'ai')}
          roundTokens={roundTokens}
        />

        {mode === 'ai' && <TokenMeter sessionTokens={sessionTokens} roundTokens={roundTokens} />}

        {/* Instruction */}
        <p
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            color: '#6a9955',
            marginBottom: '16px',
          }}
        >
          // One of these files contains a security vulnerability. Click to identify it.
        </p>

        {/* 2x2 grid of snippets */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          {grid.map((row, rowIdx) =>
            row.map((snippet) => {
              const isSelected = selected === snippet.label;
              const isCorrect = snippet.label === vulnerableLabel;
              let borderColor = '#333';
              let bgColor = 'rgba(0,0,0,0.2)';

              if (revealed && isCorrect) {
                borderColor = '#22c55e';
                bgColor = 'rgba(34,197,94,0.1)';
              } else if (revealed && isSelected && !isCorrect) {
                borderColor = '#f85149';
                bgColor = 'rgba(248,81,73,0.1)';
              } else if (isSelected) {
                borderColor = '#569cd6';
                bgColor = 'rgba(86,156,214,0.1)';
              }

              return (
                <button
                  key={snippet.label}
                  onClick={() => handleSelect(snippet.label)}
                  disabled={revealed}
                  style={{
                    background: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: '4px',
                    padding: 0,
                    cursor: revealed ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    overflow: 'hidden',
                  }}
                >
                  {/* Label */}
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '11px',
                      color: '#858585',
                      padding: '6px 12px',
                      borderBottom: '1px solid #333',
                      background: 'rgba(0,0,0,0.2)',
                    }}
                  >
                    {snippet.label}
                    {revealed && isCorrect && (
                      <span style={{ color: '#22c55e', marginLeft: '6px' }}>✓ vulnerable</span>
                    )}
                    {revealed && isSelected && !isCorrect && (
                      <span style={{ color: '#f85149', marginLeft: '6px' }}>✗ clean</span>
                    )}
                  </div>

                  {/* Code */}
                  <pre
                    style={{
                      margin: 0,
                      padding: '10px',
                      fontSize: '10px',
                      lineHeight: '1.4',
                      maxHeight: '150px',
                      overflow: 'hidden',
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#d4d4d4',
                    }}
                  >
                    {highlightCode(snippet.code.substring(0, 400))}
                  </pre>
                </button>
              );
            })
          )}
        </div>

        {/* Result */}
        {revealed && vulnInfo && (
          <div
            className={`vim-result ${selected === vulnerableLabel ? 'vim-result-correct' : 'vim-result-wrong'}`}
          >
            <div style={{ marginBottom: '8px' }}>
              <span
                style={{
                  color: '#f85149',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {vulnInfo.name}
              </span>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#6a9955' }}>
              {vulnInfo.explanation}
            </p>
            <button
              className="vim-btn vim-btn-primary"
              onClick={nextRound}
              style={{ marginTop: '12px' }}
            >
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
