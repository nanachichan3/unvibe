// Gemini API client with token counting and session tracking

export interface AIConfig {
  apiKey: string;
  model: string;  // default: 'gemini-2.0-flash'
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AIGenerator {
  generate(prompt: string, options?: object): Promise<AIResponse>;
}

// Session-wide token tracking
let sessionTokens = 0;

export function getSessionTokens(): number {
  return sessionTokens;
}

export function resetSessionTokens(): void {
  sessionTokens = 0;
}

/**
 * Count tokens for a given prompt using Gemini's countTokens endpoint.
 */
async function countTokens(prompt: string, config: AIConfig): Promise<number> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:countTokens?key=${config.apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      // Fallback: rough estimate
      return Math.ceil(prompt.length / 4);
    }

    const data = await response.json();
    return data.totalTokens ?? Math.ceil(prompt.length / 4);
  } catch {
    return Math.ceil(prompt.length / 4);
  }
}

/**
 * Create an AI generator with token counting and session tracking.
 */
export function createAIGenerator(config: AIConfig): AIGenerator {
  const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

  return {
    async generate(prompt: string, options?: object): Promise<AIResponse> {
      // Count input tokens
      const inputTokens = await countTokens(prompt, config);

      // Make the request
      const response = await fetch(modelUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
            ...options,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${err}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Estimate output tokens (rough)
      const outputTokens = Math.ceil(text.length / 4);

      // Track session tokens
      sessionTokens += inputTokens + outputTokens;

      return { text, inputTokens, outputTokens };
    },
  };
}

/**
 * Parse JSON from a string that may have markdown code blocks.
 */
export function parseJSON<T>(content: string): T | null {
  // Try direct parse first
  try {
    return JSON.parse(content) as T;
  } catch {
    // Try extracting from markdown code blocks
  }

  const patterns = [
    /```(?:json)?\s*([\s\S]*?)```/,
    /```\s*([\s\S]*?)```/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      try {
        return JSON.parse(match[1]!.trim()) as T;
      } catch {
        // Try without trailing commas
        try {
          const cleaned = match[1]!.trim().replace(/,(\s*[}\]])/g, '$1');
          return JSON.parse(cleaned) as T;
        } catch {
          // Continue
        }
      }
    }
  }

  // Try extracting the first { or [ to the last matching }]
  const firstBrace = content.indexOf('{');
  const firstBracket = content.indexOf('[');
  const start = firstBrace >= 0 && (firstBracket < 0 || firstBrace < firstBracket) ? firstBrace : firstBracket;

  if (start >= 0) {
    let depth = 0;
    let end = -1;
    const startChar = content[start];
    const endChar = startChar === '{' ? '}' : ']';

    for (let i = start; i < content.length; i++) {
      const ch = content[i]!;
      if (content[i - 1] !== '\\') {
        if (ch === startChar) depth++;
        else if (ch === endChar) {
          depth--;
          if (depth === 0) {
            end = i + 1;
            break;
          }
        }
      }
    }

    if (end > start) {
      try {
        return JSON.parse(content.slice(start, end)) as T;
      } catch {
        // Fall through to return null
      }
    }
  }

  return null;
}
