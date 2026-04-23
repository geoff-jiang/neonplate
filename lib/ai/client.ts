// lib/ai/client.ts
import { AI_CONFIG } from './config';
import { getOpenRouterKey } from '../auth/secure-storage';

export class AIError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | 'no_key'
      | 'network'
      | 'timeout'
      | 'http_4xx'
      | 'http_5xx'
      | 'invalid_json',
    public readonly raw?: string,
  ) {
    super(message);
    this.name = 'AIError';
  }
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatParams = {
  messages: ChatMessage[];
  temperature: number;
  responseFormat?: { type: 'json_object' };
};

async function postWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function chat(params: ChatParams): Promise<string> {
  const key = await getOpenRouterKey();
  if (!key) throw new AIError('No OpenRouter API key set', 'no_key');

  let response: Response;
  try {
    response = await postWithTimeout(
      `${AI_CONFIG.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://neonplate.local',
          'X-Title': 'NeonPlate',
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: params.messages,
          temperature: params.temperature,
          response_format: params.responseFormat,
        }),
      },
      AI_CONFIG.timeoutMs,
    );
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new AIError('Request timed out', 'timeout');
    }
    throw new AIError('Network error', 'network');
  }

  if (response.status >= 500) {
    throw new AIError(`OpenRouter returned ${response.status}`, 'http_5xx');
  }
  if (!response.ok) {
    const text = await response.text();
    throw new AIError(`OpenRouter returned ${response.status}: ${text}`, 'http_4xx', text);
  }

  const json = await response.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new AIError('OpenRouter returned no content', 'invalid_json', JSON.stringify(json));
  }
  return content;
}

/** Parse JSON with one retry via correction prompt if the first attempt fails. */
export async function chatJson<T>(
  params: ChatParams,
  parse: (raw: string) => T,
): Promise<T> {
  let raw = await chat({ ...params, responseFormat: { type: 'json_object' } });
  try {
    return parse(raw);
  } catch (e) {
    // One correction retry
    const correctionMessages: ChatMessage[] = [
      ...params.messages,
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content: `Your last response could not be parsed. Error: ${String(e)}. Respond with valid JSON only, matching the requested schema exactly.`,
      },
    ];
    raw = await chat({
      ...params,
      messages: correctionMessages,
      responseFormat: { type: 'json_object' },
    });
    try {
      return parse(raw);
    } catch (e2) {
      throw new AIError('AI returned invalid JSON twice', 'invalid_json', raw);
    }
  }
}
