import type { GameQuestion, FileInfo, ComplexityMetrics } from './types';

export async function generateAIQuestions(
  files: FileInfo[],
  metrics: ComplexityMetrics,
  config: { apiKey: string; provider: 'openai' | 'gemini' },
  gitHubData?: { owner: string; repo: string; token?: string }
): Promise<GameQuestion[]> {
  const sampleFiles = metrics.largestFiles.slice(0, 10);
  const summary = {
    totalFiles: metrics.totalFiles,
    totalLines: metrics.totalLines,
    languages: metrics.languageDistribution.slice(0, 5),
    topFiles: sampleFiles.map(f => ({ name: f.name, path: f.path, lines: f.lines, ext: f.extension })),
  };

  const questionTypes = gitHubData
    ? 'guess-file, component-duel, dependency-path, function-age, code-author'
    : 'guess-file, component-duel, dependency-path';

  const prompt = `You are designing quiz questions for a game called "Unvibe" that helps software teams understand their codebase.

Given this codebase summary:
${JSON.stringify(summary, null, 2)}

Generate 10 quiz questions across these types:
1. "guess-file" - Identify a file from description
2. "component-duel" - Which component handles X functionality
3. "dependency-path" - Trace how components connect
${gitHubData ? '4. "function-age" - Show a code snippet, guess when it was last modified (month/year format)\n5. "code-author" - Show a code snippet, guess who wrote it based on commit history' : ''}

Rules:
- Questions should test real understanding, not trivia
- Language should match the codebase (Python devs get Python questions)
- Include realistic code-aware questions
- For function-age: use format like "March 2024" or "2 years ago" as answers
- For code-author: use realistic developer names based on commit data if available
- Difficulty: mix of easy/medium/hard
- Include codeSnippet field (first 5-10 lines of the file) for function-age and code-author questions

Return ONLY valid JSON array of questions with this format:
[{
  "id": "unique-id",
  "type": "guess-file|component-duel|dependency-path|function-age|code-author",
  "question": "The question text",
  "options": ["A", "B", "C", "D"],
  "answer": "The correct answer",
  "explanation": "Why this is correct",
  "difficulty": "easy|medium|hard",
  "codeSnippet": "optional first few lines of relevant code"
}]

No markdown, no code blocks, just pure JSON.`;

  if (config.provider === 'gemini') {
    return generateGeminiQuestions(prompt, config.apiKey);
  }
  return generateOpenAIQuestions(prompt, config.apiKey);
}

async function generateOpenAIQuestions(prompt: string, apiKey: string): Promise<GameQuestion[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '[]';
  return parseQuestions(content);
}

async function generateGeminiQuestions(prompt: string, apiKey: string): Promise<GameQuestion[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2500 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  return parseQuestions(content);
}

function parseQuestions(content: string): GameQuestion[] {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        const cleaned = content.replace(/```[\s\S]*?```/g, '').trim();
        try {
          return JSON.parse(cleaned);
        } catch {
          return [];
        }
      }
    }
    return [];
  }
}

export async function analyzeWithAI(
  files: FileInfo[],
  metrics: ComplexityMetrics,
  config: { apiKey: string; provider: 'openai' | 'gemini' }
): Promise<{ insights: string[]; cognitiveDebtSignals: string[] }> {
  const topFiles = metrics.largestFiles.slice(0, 15).map(f => ({
    name: f.name,
    path: f.path,
    lines: f.lines,
    ext: f.extension,
  }));

  const prompt = `Analyze this codebase for cognitive debt and generate insights.

Metrics:
- Total files: ${metrics.totalFiles}
- Total lines: ${metrics.totalLines}
- Languages: ${metrics.languageDistribution.map(l => `${l.language}(${l.percentage}%)`).join(', ')}

Top files by size:
${topFiles.map(f => `- ${f.path} (${f.lines} lines)`).join('\n')}

Provide JSON with:
{
  "insights": ["3-5 key insights about this codebase"],
  "cognitiveDebtSignals": ["3-5 specific areas of concern"]
}

Focus on: large files, complex modules, potential hotspots, architectural concerns.`;

  if (config.provider === 'gemini') {
    return analyzeGemini(prompt, config.apiKey);
  }
  return analyzeOpenAI(prompt, config.apiKey);
}

async function analyzeOpenAI(prompt: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 1500,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return parseAnalysis(content);
}

async function analyzeGemini(prompt: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: 1500 },
      }),
    }
  );

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return parseAnalysis(content);
}

function parseAnalysis(content: string): { insights: string[]; cognitiveDebtSignals: string[] } {
  try {
    const parsed = JSON.parse(content);
    return {
      insights: parsed.insights || [],
      cognitiveDebtSignals: parsed.cognitiveDebtSignals || [],
    };
  } catch {
    return { insights: [], cognitiveDebtSignals: [] };
  }
}

/**
 * Generate function-age questions using real GitHub commit data
 */
export async function generateFunctionAgeQuestions(
  owner: string,
  repo: string,
  files: FileInfo[],
  apiKey: string,
  token?: string
): Promise<GameQuestion[]> {
  // Pick top files with substantial content
  const codeFiles = files.filter(f => f.lines > 20 && f.content && f.content.length > 200);
  const sampleFiles = codeFiles.slice(0, 8);

  const questions: GameQuestion[] = [];

  for (const file of sampleFiles) {
    try {
      const commits = await fetchFileCommits(owner, repo, file.path, token);
      if (commits.length === 0) continue;

      const latestCommit = commits[0];
      const latestDate = new Date(latestCommit.date);

      // Generate answer options: correct date + 3 wrong dates
      const options = generateDateOptions(latestDate);

      // Pick a code snippet (first 8 lines)
      const snippet = file.content?.split('\n').slice(0, 8).join('\n') || `// ${file.path}`;

      questions.push({
        id: `fn-age-${file.path.replace(/[^a-z0-9]/gi, '-')}`,
        type: 'function-age',
        question: `When was this function in \`${file.name}\` last modified?`,
        options,
        answer: formatDate(latestDate),
        explanation: `Last modified by ${latestCommit.author} on ${formatDate(latestDate)}: "${latestCommit.message}"`,
        difficulty: file.lines > 200 ? 'medium' : 'easy',
        codeSnippet: snippet,
      });

      // Rate limit: max 1 request per second for GitHub API
      await new Promise(r => setTimeout(r, 1100));
    } catch {
      // Skip files that fail
    }
  }

  return questions;
}

async function fetchFileCommits(owner: string, repo: string, path: string, token?: string): Promise<Array<{ sha: string; message: string; author: string; date: string }>> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=5`,
    { headers }
  );

  if (!res.ok) return [];
  const data = await res.json();
  return data.map((c: { sha: string; commit: { message: string; author: { name: string; date: string } } }) => ({
    sha: c.sha.substring(0, 7),
    message: c.commit.message.split('\n')[0],
    author: c.commit.author.name,
    date: c.commit.author.date,
  }));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function generateDateOptions(correct: Date): string[] {
  const options = new Set<string>([formatDate(correct)]);
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const currentYear = new Date().getFullYear();

  while (options.size < 4) {
    const year = currentYear - Math.floor(Math.random() * 4);
    const month = months[Math.floor(Math.random() * 12)];
    const dateStr = `${month} ${year}`;
    if (dateStr !== formatDate(correct)) {
      options.add(dateStr);
    }
  }

  return Array.from(options).sort(() => Math.random() - 0.5);
}
