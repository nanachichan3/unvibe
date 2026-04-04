'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import TokenMeter from '../TokenMeter';
import { buildDirectoryTree } from '@/lib/parser';
import type { DirectoryNode, FileInfo, ComplexityMetrics } from '@/lib/types';

interface ReadTheArchitectureProps {
  files: FileInfo[];
  metrics: ComplexityMetrics;
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

interface ArchitectureResult {
  pattern: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

// Detect architectural patterns from directory structure
function detectArchitecturePattern(tree: DirectoryNode): ArchitectureResult {
  const dirNames = new Set<string>();
  const allPaths: string[] = [];

  function collectDirs(node: DirectoryNode) {
    if (node.type === 'directory') {
      dirNames.add(node.name.toLowerCase());
      if (node.path) allPaths.push(node.path.toLowerCase());
    }
    node.children?.forEach(collectDirs);
  }
  collectDirs(tree);

  // Check for each pattern
  const patterns: Array<{ name: string; check: () => boolean; reasoning: string }> = [
    {
      name: 'MVC',
      check: () => {
        return (
          allPaths.some(p => p.includes('/controllers') || p.includes('/controller')) &&
          allPaths.some(p => p.includes('/models') || p.includes('/model')) &&
          allPaths.some(p => p.includes('/views') || p.includes('/view'))
        );
      },
      reasoning: 'Found controllers/, models/, and views/ directories — classic MVC structure',
    },
    {
      name: 'Clean Architecture',
      check: () => {
        return (
          allPaths.some(p => p.includes('/domain')) &&
          allPaths.some(p => p.includes('/application')) &&
          allPaths.some(p => p.includes('/infrastructure'))
        );
      },
      reasoning: 'Found domain/, application/, and infrastructure/ layers — Clean Architecture',
    },
    {
      name: 'Layered Architecture',
      check: () => {
        const hasServices = allPaths.some(p => p.includes('/services') || p.includes('/service'));
        const hasRepos = allPaths.some(p => p.includes('/repositories') || p.includes('/repository'));
        const hasControllers = allPaths.some(p => p.includes('/controllers') || p.includes('/controller'));
        const hasDto = allPaths.some(p => p.includes('/dto'));
        return (hasServices ? 1 : 0) + (hasRepos ? 1 : 0) + (hasControllers ? 1 : 0) + (hasDto ? 1 : 0) >= 3;
      },
      reasoning: 'Multiple distinct layers (services, repositories, controllers, DTOs) detected',
    },
    {
      name: 'Feature-based',
      check: () => {
        return (
          allPaths.some(p => p.includes('/features') || p.includes('/feature')) ||
          allPaths.some(p => p.includes('/modules') || p.includes('/module')) ||
          (dirNames.has('domains') && !!tree.children && tree.children.length > 3)
        );
      },
      reasoning: 'Project organized by features or modules rather than technical layers',
    },
    {
      name: 'Microservices',
      check: () => {
        // Multiple top-level directories that look like independent services
        const topLevelDirs = tree.children?.filter(c => c.type === 'directory' && c.name !== 'node_modules' && c.name !== '.git') || [];
        const serviceIndicators = ['service', 'api', 'gateway', 'worker', 'client', 'server'];
        const serviceDirs = topLevelDirs.filter(d =>
          serviceIndicators.some(si => d.name.toLowerCase().includes(si)) ||
          (d.children && d.children.length > 2)
        );
        return topLevelDirs.length >= 3 && serviceDirs.length >= 2;
      },
      reasoning: 'Multiple independent service directories detected at top level',
    },
    {
      name: 'Hexagonal Architecture',
      check: () => {
        return (
          allPaths.some(p => p.includes('/core')) &&
          (allPaths.some(p => p.includes('/ports')) || allPaths.some(p => p.includes('/adapters')))
        );
      },
      reasoning: 'Found core/ and ports/adapters directories — Hexagonal Architecture',
    },
    {
      name: 'Frontend SPA',
      check: () => {
        const frontendIndicators = ['components', 'pages', 'hooks', 'store', 'context', 'components'];
        const score = frontendIndicators.filter(ind => dirNames.has(ind)).length;
        return score >= 2;
      },
      reasoning: 'Found frontend-specific directories (components/, pages/, hooks/, store/)',
    },
    {
      name: 'Backend API',
      check: () => {
        const backendIndicators = ['api', 'routes', 'middleware', 'controllers', 'models', 'services'];
        const score = backendIndicators.filter(ind => dirNames.has(ind)).length;
        return score >= 3;
      },
      reasoning: 'Found backend-specific directories (api/, routes/, middleware/, models/)',
    },
  ];

  // Find the best matching pattern
  for (const pattern of patterns) {
    if (pattern.check()) {
      return {
        pattern: pattern.name,
        confidence: 'high',
        reasoning: pattern.reasoning,
      };
    }
  }

  // Fallback: detect monolith vs simple structure
  const srcChildren = tree.children?.find(c => c.name === 'src')?.children || tree.children || [];
  const hasMixedDirs = srcChildren.length > 5;

  if (hasMixedDirs) {
    return {
      pattern: 'Monolithic',
      confidence: 'medium',
      reasoning: 'Mixed directory structure without clear pattern separation — likely a monolithic application',
    };
  }

  return {
    pattern: 'Simple Structure',
    confidence: 'low',
    reasoning: 'Small project with minimal directory structure',
  };
}

// Get all architecture pattern names for options
function getAllPatterns(): string[] {
  return [
    'MVC',
    'Clean Architecture',
    'Layered Architecture',
    'Feature-based',
    'Microservices',
    'Hexagonal Architecture',
    'Monolithic',
    'Frontend SPA',
    'Backend API',
  ];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]!];
  }
  return shuffled;
}

// Render collapsible directory tree
function DirectoryTree({
  node,
  expanded,
  onToggle,
  collapsedPaths,
}: {
  node: DirectoryNode;
  expanded: boolean;
  onToggle: (path: string) => void;
  collapsedPaths: Set<string>;
}) {
  const isExpanded = !collapsedPaths.has(node.path);
  const hasChildren = node.children && node.children.length > 0;

  const indent = node.depth * 16;

  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#858585' }}>
      <div
        style={{
          paddingLeft: `${indent}px`,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          cursor: hasChildren ? 'pointer' : 'default',
          padding: '2px 0',
        }}
        onClick={() => hasChildren && node.path && onToggle(node.path)}
      >
        {hasChildren ? (
          <span style={{ color: '#569cd6', userSelect: 'none' }}>
            {isExpanded ? '[-] ' : '[+] '}
          </span>
        ) : (
          <span style={{ color: '#4ec9b0', marginLeft: '12px' }}>└──</span>
        )}
        <span style={{ color: node.type === 'directory' ? '#dcdcaa' : '#4ec9b0' }}>
          {node.name}
          {node.type === 'directory' && '/'}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children!
            .sort((a, b) => {
              if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <DirectoryTree
                key={child.path}
                node={child}
                expanded={expanded}
                onToggle={onToggle}
                collapsedPaths={collapsedPaths}
              />
            ))}
        </div>
      )}
    </div>
  );
}

export default function ReadTheArchitecture({
  files,
  metrics,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: ReadTheArchitectureProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    explanation: string;
    tree: DirectoryNode;
    detectedPattern: ArchitectureResult;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateQuestion = useCallback(() => {
    setIsGenerating(true);
    setSelected(null);
    setRevealed(false);
    setRoundTokens(0);

    // Build directory tree
    const tree = buildDirectoryTree(files);

    // Detect architecture pattern
    const detectedPattern = detectArchitecturePattern(tree);

    // Generate options: correct answer + 3 distractors
    const allPatterns = getAllPatterns();
    const distractors = shuffleArray(allPatterns.filter(p => p !== detectedPattern.pattern)).slice(0, 3);
    const options = shuffleArray([detectedPattern.pattern, ...distractors]);

    // Determine difficulty based on pattern confidence
    let difficulty: 'easy' | 'medium' | 'hard';
    if (detectedPattern.confidence === 'high') {
      difficulty = 'easy';
    } else if (detectedPattern.confidence === 'medium') {
      difficulty = 'medium';
    } else {
      difficulty = 'hard';
    }

    setQuestion({
      options,
      answer: detectedPattern.pattern,
      explanation: detectedPattern.reasoning,
      tree,
      detectedPattern,
    });

    // Collapse all paths initially
    const allPaths = new Set<string>();
    function collectPaths(node: DirectoryNode) {
      if (node.path) allPaths.add(node.path);
      node.children?.forEach(collectPaths);
    }
    collectPaths(tree);
    setCollapsedPaths(allPaths);

    setIsGenerating(false);
  }, [files]);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleToggle = useCallback((path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

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
          <span>🏗️ Read the Architecture</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            Analyzing directory structure...
          </p>
        </div>
      </div>
    );
  }

  const difficulty = question
    ? question.detectedPattern.confidence === 'high'
      ? 'easy'
      : question.detectedPattern.confidence === 'medium'
        ? 'medium'
        : 'hard'
    : 'medium';

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>🏗️ Read the Architecture</span>
        <span className={`vim-difficulty vim-difficulty-${difficulty}`}>{difficulty}</span>
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

        {/* Directory tree */}
        {question && (
          <div className="vim-terminal" style={{ marginBottom: '20px' }}>
            <div className="vim-terminal-header">
              <span>directory structure</span>
              <span style={{ color: '#6a9955' }}>
                {files.length} files
              </span>
            </div>
            <div
              className="vim-terminal-content"
              style={{
                maxHeight: '350px',
                overflow: 'auto',
                margin: 0,
                padding: '12px 16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '0 0 4px 4px',
              }}
            >
              <DirectoryTree
                node={question.tree}
                expanded={true}
                onToggle={handleToggle}
                collapsedPaths={collapsedPaths}
              />
            </div>
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
          What architectural pattern does this project use?
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
