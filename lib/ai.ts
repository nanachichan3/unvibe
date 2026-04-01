import type { GameQuestion, FileInfo, ComplexityMetrics } from './types';

export async function generateAIQuestions(
  files: FileInfo[],
  metrics: ComplexityMetrics,
  config: { apiKey: string; provider: 'openai' | 'gemini' }
): Promise<GameQuestion[]> {
  const sampleFiles = metrics.largestFiles.slice(0, 10);
  const summary = {
    totalFiles: metrics.totalFiles,
    totalLines: metrics.totalLines,
    languages: metrics.languageDistribution.slice(0, 5),
    topFiles: sampleFiles.map(f => ({ name: f.name, path: f.path, lines: f.lines, ext: f.extension })),
  };

  const prompt = `You are designing quiz questions for a game called "Unvibe" that helps software teams understand their codebase.

Given this codebase summary:
${JSON.stringify(summary, null, 2)}

Generate 10 quiz questions across these types:
1. "guess-file" - Identify a file from description
2. "component-duel" - Which component handles X functionality
3. "dependency-path" - Trace how components connect

Rules:
- Questions should test real understanding, not trivia
- Language should match the codebase (Python devs get Python questions)
- Include realistic code-aware questions
- Difficulty: mix of easy/medium/hard

Return ONLY valid JSON array of questions with this format:
[{
  "id": "unique-id",
  "type": "guess-file|component-duel|dependency-path",
  "question": "The question text",
  "options": ["A", "B", "C", "D"],
  "answer": "The correct answer",
  "explanation": "Why this is correct",
  "difficulty": "easy|medium|hard"
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
      max_tokens: 2000,
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  return parseQuestions(content);
}

function parseQuestions(content: string): GameQuestion[] {
  try {
    // Try direct JSON parse
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from markdown code blocks
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      try {
        return JSON.parse(match[1]);
      } catch {
        // Try cleaning the content
        const cleaned = content.replace(/[^[\],{}":0-9a-zA-Z.-]/g, '');
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
