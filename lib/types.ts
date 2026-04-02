// Code analysis types
export interface FileInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  lines: number;
  content?: string;
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryNode[];
  fileInfo?: FileInfo;
  depth: number;
}

export interface LanguageStats {
  language: string;
  files: number;
  lines: number;
  percentage: number;
  color: string;
}

export interface ComplexityMetrics {
  totalFiles: number;
  totalLines: number;
  avgFileSize: number;
  largestFiles: FileInfo[];
  deepestDirectories: { path: string; depth: number }[];
  languageDistribution: LanguageStats[];
  fileTypeDistribution: { ext: string; count: number }[];
  estimatedCognitiveLoad: 'low' | 'medium' | 'high' | 'critical';
}

export interface GameQuestion {
  id: string;
  type: 'guess-file' | 'component-duel' | 'dependency-path' | 'memory-match' | 'function-age' | 'code-author' | 'complexity-race' | 'commit-message';
  question: string;
  options: string[];
  answer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  codeSnippet?: string;
  /** For timeline-based games (function-age, code-author): the correct date as ISO string */
  proximateAnswer?: string;
  /** For timeline-based games: the repo's date range { start, end } */
  dateRange?: { start: string; end: string };
  /** For timeline-based games: sparkline data of commit activity */
  sparklineData?: { date: string; count: number }[];
  /** Author for code-author game */
  authorName?: string;
}

export interface GameSession {
  totalQuestions: number;
  correctAnswers: number;
  streak: number;
  highStreak: number;
  questionsAnswered: Array<{ questionId: string; correct: boolean }>;
}

export interface AIGameConfig {
  apiKey: string;
  provider: 'openai' | 'gemini';
  generateMore: boolean;
}
