'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { GitHubRoundData } from '@/lib/parser';

interface CommitAuthorProps {
  gitHubData: GitHubRoundData;
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

// Generate plausible commit message from file path
function generateCommitMessage(filePath: string): string {
  const fileName = filePath.split('/').pop() || filePath;
  const actions = ['Update', 'Fix', 'Refactor', 'Add', 'Remove', 'Clean up'];
  const action = actions[fileName.charCodeAt(0) % actions.length];
  return `${action} ${fileName}`;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]!];
  }
  return shuffled;
}

export default function CommitAuthor({
  gitHubData,
  apiKey,
  sessionTokens,
  onSessionTokensChange,
}: CommitAuthorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const [question, setQuestion] = useState<{
    options: string[];
    answer: string;
    explanation: string;
    filePath: string;
    commitMessage: string;
    authorName: string;
  } | null>(null);

  const generateQuestion = useCallback(() => {
    if (!gitHubData || Object.keys(gitHubData.fileAuthors).length === 0) {
      return;
    }

    setSelected(null);
    setRevealed(false);

    // Pick a random file from fileAuthors
    const filePaths = Object.keys(gitHubData.fileAuthors);
    const randomFilePath = filePaths[Math.floor(Math.random() * filePaths.length)!];
    const correctAuthor = gitHubData.fileAuthors[randomFilePath]!;

    // Get all unique authors
    const allAuthors = [...new Set(Object.values(gitHubData.fileAuthors))];

    // Pick 3 wrong authors
    const wrongAuthors = shuffleArray(
      allAuthors.filter((a) => a !== correctAuthor)
    ).slice(0, 3);

    // If not enough authors, generate some
    while (wrongAuthors.length < 3) {
      const fakeAuthor = `Contributor ${wrongAuthors.length + 1}`;
      if (!wrongAuthors.includes(fakeAuthor)) {
        wrongAuthors.push(fakeAuthor);
      }
    }

    const options = shuffleArray([correctAuthor, ...wrongAuthors]);
    const commitMessage = generateCommitMessage(randomFilePath);

    setQuestion({
      options,
      answer: correctAuthor,
      explanation: `${correctAuthor} made the last commit to ${randomFilePath.split('/').pop()}.`,
      filePath: randomFilePath,
      commitMessage,
      authorName: correctAuthor,
    });
  }, [gitHubData]);

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

  if (!gitHubData || Object.keys(gitHubData.fileAuthors).length === 0) {
    return (
      <div className="vim-card">
        <div className="vim-card-header">
          <span>👤 Commit Author</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px' }}>
            GitHub data required for this game.
          </p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', marginTop: '8px' }}>
            Upload a repository with commit history to play.
          </p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="vim-card">
        <div className="vim-card-header">
          <span>👤 Commit Author</span>
        </div>
        <div style={{ padding: '40px', textAlign: 'center', color: '#858585' }}>
          <div className="vim-spinner" />
          <p
            style={{
              marginTop: '12px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
            }}
          >
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="vim-card">
      <div className="vim-card-header">
        <span>👤 Commit Author</span>
        <span className="vim-difficulty vim-difficulty-medium">medium</span>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Commit card */}
        <div
          className="vim-terminal"
          style={{
            marginBottom: '20px',
            padding: '16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            border: '1px solid #3c3c3c',
          }}
        >
          {/* Author avatar and name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: getAvatarColor(question.authorName),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {getInitials(question.authorName)}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '14px',
                  color: '#d4d4d4',
                  fontWeight: 'bold',
                }}
              >
                {question.authorName}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                  color: '#6a9955',
                }}
              >
                commit: {question.commitMessage}
              </div>
            </div>
          </div>

          {/* File info */}
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '12px',
              color: '#858585',
              borderTop: '1px solid #3c3c3c',
              paddingTop: '12px',
              marginTop: '4px',
            }}
          >
            <span style={{ color: '#569cd6' }}>file:</span> {question.filePath}
          </div>
        </div>

        {/* Question */}
        <h3
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '14px',
            color: '#d4d4d4',
            marginBottom: '16px',
          }}
        >
          Who made this commit?
        </h3>

        {/* Options */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}
        >
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

        {/* Result */}
        {revealed && (
          <div
            className={`vim-result ${selected === question.answer ? 'vim-result-correct' : 'vim-result-wrong'}`}
          >
            <p
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '13px',
                color: '#6a9955',
              }}
            >
              {question.explanation}
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
