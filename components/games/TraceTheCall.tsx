'use client';

import React, { useCallback, useEffect, useState } from 'react';
import ModeToggle from '../ModeToggle';
import AIKeySetup, { getStoredApiKey } from '../AIKeySetup';
import TokenMeter from '../TokenMeter';
import type { FileInfo } from '@/lib/types';
import { trackAIGamePlayed } from '@/lib/analytics';

interface TraceTheCallProps {
  files: FileInfo[];
  apiKey?: string;
  sessionTokens: number;
  onSessionTokensChange: (tokens: number) => void;
}

interface ParsedFunction {
  name: string;
  startLine: number;
  endLine: number;
  body: string;
  returnType: string;
  isAsync: boolean;
}

interface CallNode {
  name: string;
  expanded: boolean;
  children: CallNode[];
  body: string;
  returnType: string;
  depth: number;
}

const RETURN_TYPES = [
  'Promise<User>',
  '{ id: number; name: string }',
  'User | null',
  'void',
  'string | undefined',
  'any',
  'string',
  'number',
  'boolean',
  'User[]',
];

// Find all function declarations in file content
function findFunctions(content: string): ParsedFunction[] {
  const lines = content.split('\n');
  const functions: ParsedFunction[] = [];

  // Match function declarations
  const funcDeclRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(?:<[^>]*>)?\s*\(([^)]*)\)\s*(?::\s*([^=]+))?/g;
  // Match arrow functions / const declarations
  const constFuncRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z_]\w*)\s*(?::\s*([^=]+))?\s*=>/g;

  let match;

  // Find function declarations
  while ((match = funcDeclRegex.exec(content)) !== null) {
    const name = match[1]!;
    const returnType = match[3]?.trim() || 'any';
    const isAsync = match[0].includes('async');

    // Find line number
    const beforeMatch = content.substring(0, match.index);
    const startLine = beforeMatch.split('\n').length;

    // Find function body extent using brace matching
    const afterMatch = content.substring(match.index + match[0].length);
    let depth = 0;
    let endPos = 0;
    let started = false;

    for (let i = 0; i < afterMatch.length; i++) {
      const c = afterMatch[i]!;
      if (c === '{') {
        depth++;
        started = true;
      } else if (c === '}') {
        depth--;
        if (started && depth === 0) {
          endPos = i + 1;
          break;
        }
      }
    }

    const bodyStart = match.index + match[0].length;
    const bodyEnd = match.index + match[0].length + endPos;
    const body = content.substring(bodyStart, bodyEnd);

    if (body.split('\n').length >= 2) {
      functions.push({ name, startLine, endLine: startLine + body.split('\n').length, body, returnType, isAsync });
    }
  }

  return functions;
}

// Find function calls within a body
function findCalls(body: string): string[] {
  const calls: string[] = [];
  // Match functionName( patterns
  const callRegex = /\b([a-zA-Z_]\w*)\s*\(/g;
  let match;

  // Filter out keywords and built-ins
  const keywords = new Set([
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'return',
    'typeof', 'instanceof', 'delete', 'in', 'of', 'await', 'yield', 'async',
    'const', 'let', 'var', 'function', 'import', 'export', 'from', 'default',
    'true', 'false', 'null', 'undefined', 'void', 'debugger', 'with',
    'console', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
    'Promise', 'Map', 'Set', 'Date', 'RegExp', 'Error', 'Symbol', 'parseInt',
    'parseFloat', 'isNaN', 'isFinite', 'encodeURI', 'decodeURI', 'setTimeout',
    'setInterval', 'clearTimeout', 'clearInterval', 'require',
  ]);

  while ((match = callRegex.exec(body)) !== null) {
    const funcName = match[1]!;
    if (!keywords.has(funcName) && funcName[0] !== funcName[0]!.toUpperCase()) {
      if (!calls.includes(funcName)) {
        calls.push(funcName);
      }
    }
  }

  return calls;
}

// Build call graph from files
function buildCallGraph(files: FileInfo[]): Map<string, { calls: string[]; body: string; returnType: string }> {
  const graph = new Map<string, { calls: string[]; body: string; returnType: string }>();

  for (const file of files) {
    if (!file.content) continue;
    const functions = findFunctions(file.content);
    for (const func of functions) {
      const calls = findCalls(func.body);
      if (!graph.has(func.name)) {
        graph.set(func.name, { calls, body: func.body, returnType: func.returnType });
      }
    }
  }

  return graph;
}

// Find entry function with specific depth
function findEntryFunction(
  callGraph: Map<string, { calls: string[]; body: string; returnType: string }>,
  targetDepth: number
): string | null {
  const candidates: Array<{ name: string; depth: number }> = [];

  // Find functions that have enough depth
  for (const [name, info] of callGraph.entries()) {
    const depth = calculateDepth(name, callGraph, new Set());
    if (depth >= targetDepth) {
      candidates.push({ name, depth });
    }
  }

  if (candidates.length === 0) return null;

  // Pick one close to target depth
  const sorted = candidates.sort((a, b) => Math.abs(a.depth - targetDepth) - Math.abs(b.depth - targetDepth));
  return sorted[0]?.name || null;
}

function calculateDepth(
  funcName: string,
  callGraph: Map<string, { calls: string[]; body: string; returnType: string }>,
  visited: Set<string>
): number {
  if (visited.has(funcName)) return 0;
  visited.add(funcName);

  const info = callGraph.get(funcName);
  if (!info || info.calls.length === 0) return 0;

  let maxDepth = 0;
  for (const called of info.calls) {
    if (callGraph.has(called) && called !== funcName) {
      const depth = calculateDepth(called, callGraph, new Set(visited));
      maxDepth = Math.max(maxDepth, depth + 1);
    }
  }

  return maxDepth;
}

// Infer return type following call chain
function inferReturnType(
  funcName: string,
  callGraph: Map<string, { calls: string[]; body: string; returnType: string }>,
  visited?: Set<string>
): string {
  const visitedLocal = visited || new Set<string>();

  if (visitedLocal.has(funcName)) return 'any';
  visitedLocal.add(funcName);

  const info = callGraph.get(funcName);
  if (!info) return 'any';

  // If function has explicit return type that's not 'any', use it
  if (info.returnType && info.returnType !== 'any') {
    // Check if there's a return statement in body
    if (/return\s/.test(info.body) || /return\s*\w+/.test(info.body)) {
      return info.returnType;
    }
  }

  // Follow the call chain
  for (const called of info.calls) {
    if (callGraph.has(called) && called !== funcName) {
      const calledType = inferReturnType(called, callGraph, new Set(visitedLocal));
      if (calledType !== 'any') return calledType;
    }
  }

  // Analyze return patterns in body
  const returnMatches = info.body.match(/return\s+([^;]+)/g);
  if (returnMatches && returnMatches.length > 0) {
    const lastReturn = returnMatches[returnMatches.length - 1]!;
    const returnExpr = lastReturn.replace(/return\s+/, '').trim();

    // Check for Promise patterns
    if (/\bPromise\b|<[^>]+>/.test(info.body) || /async\s+function/.test(info.body)) {
      if (/User/.test(returnExpr)) return 'Promise<User>';
      if (/string/.test(returnExpr)) return 'Promise<string>';
      if (/number/.test(returnExpr)) return 'Promise<number>';
      return 'Promise<any>';
    }

    // Check for null/undefined
    if (/null/.test(returnExpr)) return 'User | null';
    if (/undefined/.test(returnExpr)) return 'string | undefined';

    // Check for object literals
    if (/{\s*id:/.test(returnExpr) || /{\s*name:/.test(returnExpr)) {
      return '{ id: number; name: string }';
    }

    // Check for array
    if (/\[\]/.test(returnExpr) || /\.map\(/.test(info.body)) return 'User[]';

    // Check for basic types
    if (/string/.test(returnExpr)) return 'string';
    if (/number/.test(returnExpr)) return 'number';
    if (/boolean/.test(returnExpr)) return 'boolean';
  }

  // Check if void or no return
  if (!/return\s+/.test(info.body)) return 'void';

  return 'any';
}

// Build expandable call tree
function buildCallTree(
  funcName: string,
  callGraph: Map<string, { calls: string[]; body: string; returnType: string }>,
  depth: number,
  maxDepth: number,
  visited: Set<string>
): CallNode {
  const info = callGraph.get(funcName)!;
  const children: CallNode[] = [];

  if (depth < maxDepth) {
    for (const called of info.calls) {
      if (callGraph.has(called) && !visited.has(called)) {
        const childVisited = new Set(visited);
        childVisited.add(called);
        children.push(buildCallTree(called, callGraph, depth + 1, maxDepth, childVisited));
      }
    }
  }

  return {
    name: funcName,
    expanded: depth === 0,
    children,
    body: info.body,
    returnType: info.returnType,
    depth,
  };
}

// Generate distractors for return type
function generateReturnTypeDistractors(correct: string): string[] {
  const allTypes = RETURN_TYPES.filter(t => t !== correct);
  const shuffled = shuffleArray(allTypes);
  return shuffled.slice(0, 3);
}

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

function FunctionTree({ node, onToggle }: { node: CallNode; onToggle: (name: string) => void }) {
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginLeft: node.depth > 0 ? '20px' : '0', marginTop: '4px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '4px 8px',
          background: node.depth === 0 ? 'rgba(86,156,214,0.1)' : 'transparent',
          borderRadius: '4px',
          borderLeft: node.depth > 0 ? '2px solid #333' : 'none',
        }}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.name)}
            style={{
              background: 'none',
              border: 'none',
              color: '#569cd6',
              cursor: 'pointer',
              padding: '0',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              minWidth: '60px',
            }}
          >
            [{node.expanded ? '- ' : '+ '}]
          </button>
        ) : (
          <span style={{ minWidth: '60px', color: '#333' }}>    </span>
        )}
        <span style={{ color: '#dcdcaa', fontFamily: "'JetBrains Mono', monospace", fontSize: '13px' }}>
          {node.name}()
        </span>
        {node.depth === 0 && (
          <span style={{ color: '#4ec9b0', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' }}>
            → {node.returnType}
          </span>
        )}
      </div>

      {node.expanded && node.body && (
        <div
          style={{
            marginLeft: '20px',
            marginTop: '4px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            padding: '8px',
            fontSize: '11px',
            maxHeight: '200px',
            overflow: 'auto',
          }}
        >
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: "'JetBrains Mono', monospace" }}>
            {highlightCode(node.body.substring(0, 500))}
          </pre>
        </div>
      )}

      {node.expanded && node.children.map(child => (
        <FunctionTree key={child.name + child.depth} node={child} onToggle={onToggle} />
      ))}
    </div>
  );
}

export default function TraceTheCall({
  files,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: TraceTheCallProps) {
  const [mode, setMode] = useState<'simple' | 'ai'>('simple');
  const [roundTokens, setRoundTokens] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    explanation: string;
    entryFunction: string;
    callTree: CallNode | null;
    difficulty: 'easy' | 'medium' | 'hard';
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(new Set());

  const generateQuestion = useCallback(async () => {
    setIsGenerating(true);
    setSelected(null);
    setRevealed(false);
    setRoundTokens(0);
    setExpandedFunctions(new Set());

    // Both modes use heuristics for this game
    const codeFiles = files.filter(f => f.content && f.content.length > 100);

    if (codeFiles.length === 0) {
      setQuestion({
        options: ['Promise<User>', '{ id: number; name: string }', 'User | null', 'void'],
        answer: 'void',
        explanation: 'No code files found.',
        entryFunction: 'unknown',
        callTree: null,
        difficulty,
      });
      setIsGenerating(false);
      return;
    }

    const callGraph = buildCallGraph(codeFiles);

    if (callGraph.size < 2) {
      // Generate synthetic call chain
      const syntheticTree = buildSyntheticTree(difficulty);
      setQuestion({
        options: shuffleArray([syntheticTree.answer, ...generateReturnTypeDistractors(syntheticTree.answer)]),
        answer: syntheticTree.answer,
        explanation: syntheticTree.explanation,
        entryFunction: syntheticTree.entryFunction,
        callTree: syntheticTree.tree,
        difficulty,
      });
      setIsGenerating(false);
      return;
    }

    const depthMap: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
    const targetDepth = depthMap[difficulty];

    const entryFunc = findEntryFunction(callGraph, targetDepth);

    if (!entryFunc) {
      const syntheticTree = buildSyntheticTree(difficulty);
      setQuestion({
        options: shuffleArray([syntheticTree.answer, ...generateReturnTypeDistractors(syntheticTree.answer)]),
        answer: syntheticTree.answer,
        explanation: syntheticTree.explanation,
        entryFunction: syntheticTree.entryFunction,
        callTree: syntheticTree.tree,
        difficulty,
      });
      setIsGenerating(false);
      return;
    }

    const returnType = inferReturnType(entryFunc, callGraph);
    const maxShowDepth = depthMap[difficulty];
    const callTree = buildCallTree(entryFunc, callGraph, 0, maxShowDepth, new Set([entryFunc]));

    const correct = returnType || 'void';
    const distractors = generateReturnTypeDistractors(correct);

    setQuestion({
      options: shuffleArray([correct, ...distractors]),
      answer: correct,
      explanation: `Following the call chain from ${entryFunc}() to its dependencies reveals the ultimate return type is ${correct}.`,
      entryFunction: entryFunc,
      callTree,
      difficulty,
    });

    setIsGenerating(false);
  }, [files, difficulty]);

  useEffect(() => {
    generateQuestion();
  }, [generateQuestion]);

  const handleToggle = (name: string) => {
    setExpandedFunctions(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const handleAnswer = (option: string) => {
    if (revealed) return;
    setSelected(option);
    setRevealed(true);
    trackAIGamePlayed({ gameType: 'dependency-path', answered: true, correct: question?.answer === option, tokensUsed: sessionTokens });
  };

  const nextRound = () => {
    generateQuestion();
  };

  const cycleDifficulty = () => {
    const cycle: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    const idx = cycle.indexOf(difficulty);
    setDifficulty(cycle[(idx + 1) % cycle.length]!);
  };

  if (isGenerating && !question) {
    return (
      <div className="vim-card">
        <div className="vim-card-header">
          <span>📞 Trace the Call</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p style={{ marginTop: '12px', fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
            Building call graph...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>📞 Trace the Call</span>
        <button
          onClick={cycleDifficulty}
          className={`vim-difficulty vim-difficulty-${difficulty}`}
          style={{ cursor: 'pointer', border: 'none' }}
        >
          {difficulty}
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        <ModeToggle
          simple={mode === 'simple'}
          onSimpleChange={(v) => setMode(v ? 'simple' : 'ai')}
          roundTokens={roundTokens}
        />

        {mode === 'ai' && <AIKeySetup compact />}

        {mode === 'ai' && <TokenMeter sessionTokens={sessionTokens} roundTokens={roundTokens} />}

        {question && (
          <div className="vim-code" style={{ marginBottom: '20px', marginTop: '16px' }}>
            <div className="vim-code-header">
              <span>// call graph</span>
              <span style={{ color: '#4ec9b0' }}>depth: {question.difficulty}</span>
            </div>
            <div
              className="vim-code-content"
              style={{
                maxHeight: '350px',
                overflow: 'auto',
                margin: 0,
                padding: '16px',
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '0 0 4px 4px',
              }}
            >
              {question.callTree ? (
                <FunctionTree
                  node={question.callTree}
                  onToggle={handleToggle}
                />
              ) : (
                <pre style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '12px' }}>
                  {highlightCode('// No call graph available')}
                </pre>
              )}
            </div>
          </div>
        )}

        {question && (
          <h3
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '14px',
              color: '#d4d4d4',
              marginBottom: '16px',
            }}
          >
            What does <span style={{ color: '#4ec9b0' }}>{question.entryFunction}()</span> ultimately return?
          </h3>
        )}

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

function buildSyntheticTree(difficulty: 'easy' | 'medium' | 'hard'): {
  answer: string;
  explanation: string;
  entryFunction: string;
  tree: CallNode;
} {
  if (difficulty === 'easy') {
    const tree: CallNode = {
      name: 'getUser',
      expanded: true,
      children: [],
      body: `function getUser(id) {
  return fetchUser(id);
}`,
      returnType: 'User | null',
      depth: 0,
    };
    return {
      answer: 'User | null',
      explanation: 'getUser() directly returns the result of fetchUser() which can return null.',
      entryFunction: 'getUser',
      tree,
    };
  }

  if (difficulty === 'medium') {
    const inner: CallNode = {
      name: 'parseUser',
      expanded: false,
      children: [],
      body: `function parseUser(json) {
  return JSON.parse(json);
}`,
      returnType: 'any',
      depth: 1,
    };
    const tree: CallNode = {
      name: 'loadUser',
      expanded: true,
      children: [inner],
      body: `async function loadUser(id) {
  const data = await fetchData(id);
  return parseUser(data);
}`,
      returnType: 'any',
      depth: 0,
    };
    return {
      answer: 'Promise<User>',
      explanation: 'loadUser() is async and returns the result of parseUser(), which ultimately returns parsed User data.',
      entryFunction: 'loadUser',
      tree,
    };
  }

  // hard
  const innermost: CallNode = {
    name: 'transformData',
    expanded: false,
    children: [],
    body: `function transformData(raw) {
  return { id: raw.id, name: raw.name };
}`,
    returnType: '{ id: number; name: string }',
    depth: 2,
  };
  const middle: CallNode = {
    name: 'processResult',
    expanded: false,
    children: [innermost],
    body: `function processResult(result) {
  return transformData(result);
}`,
    returnType: '{ id: number; name: string }',
    depth: 1,
  };
  const tree: CallNode = {
    name: 'handleUser',
    expanded: true,
    children: [middle],
    body: `async function handleUser(input) {
  const validated = await validate(input);
  const processed = processResult(validated);
  return processed;
}`,
    returnType: '{ id: number; name: string }',
    depth: 0,
  };
  return {
    answer: '{ id: number; name: string }',
    explanation: 'handleUser() calls processResult() which calls transformData(), returning an object literal.',
    entryFunction: 'handleUser',
    tree,
  };
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]!];
  }
  return shuffled;
}
