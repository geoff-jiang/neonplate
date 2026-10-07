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
    public readonly status?: number,
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

function httpError(status: number): AIError {
  if (status === 408 || status === 504)
    return new AIError(
      'The AI request timed out. Try again or enter your meal manually.',
      'timeout',
      status,
    );
  if (status >= 500)
    return new AIError(
      'OpenRouter or its model provider is unavailable. Try again shortly or enter your meal manually.',
      'http_5xx',
      status,
    );
  const message =
    status === 401
      ? 'Your OpenRouter API key was rejected. Update it in Settings or enter your meal manually.'
      : status === 402
        ? 'Your OpenRouter account needs credits. Check your balance or enter your meal manually.'
        : status === 403
          ? 'OpenRouter blocked this request. Check account or model access, rephrase your meal, or enter it manually.'
          : status === 429
            ? 'OpenRouter is receiving too many requests. Wait a moment before retrying, or enter your meal manually.'
            : 'OpenRouter could not accept this request. Try rephrasing your meal or enter it manually.';
  return new AIError(message, 'http_4xx', status);
}

function invalidOutput(): AIError {
  return new AIError(
    'The AI response could not be read. Try rephrasing your meal or enter it manually.',
    'invalid_json',
  );
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

// One HTTP attempt, with a deadline covering headers AND body consumption.
async function requestOnce(params: ChatParams, key: string): Promise<string> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new AIError('The AI request timed out. Try again or enter your meal manually.', 'timeout'),
      );
      controller.abort();
    }, AI_CONFIG.timeoutMs);
  });
  try {
    return await Promise.race([
      timeout,
      (async () => {
        const response = await fetch(`${AI_CONFIG.baseUrl}/chat/completions`, {
          method: 'POST',
          signal: controller.signal,
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
        });
        if (!response.ok) throw httpError(response.status);
        const body = await response.text();
        let json: Record<string, unknown> | null;
        try {
          json = record(JSON.parse(body));
        } catch {
          throw invalidOutput();
        }
        const choice = Array.isArray(json?.choices) ? record(json.choices[0]) : null;
        // A provider may fail after committing HTTP 200, even alongside partial content.
        const error = record(json?.error) ?? record(choice?.error);
        if (error || choice?.finish_reason === 'error') {
          const code = Number(error?.code);
          throw httpError(Number.isInteger(code) && code >= 400 && code <= 599 ? code : 502);
        }
        const content = record(choice?.message)?.content;
        if (typeof content !== 'string' || !content.trim()) throw invalidOutput();
        return content;
      })(),
    ]);
  } catch (error) {
    if (error instanceof AIError) throw error;
    if (controller.signal.aborted)
      throw new AIError(
        'The AI request timed out. Try again or enter your meal manually.',
        'timeout',
      );
    throw new AIError(
      'Could not reach OpenRouter. Check your connection or enter your meal manually.',
      'network',
    );
  } finally {
    clearTimeout(timer);
    // Also release a body that was rejected based on its HTTP status.
    controller.abort();
  }
}

async function request<T>(params: ChatParams, parse: (raw: string) => T): Promise<T> {
  let key: string | null;
  try {
    key = (await getOpenRouterKey())?.trim() ?? null;
  } catch {
    throw new AIError(
      'Could not read your saved API key. Open Settings to try again, or enter your meal manually.',
      'no_key',
    );
  }
  if (!key)
    throw new AIError(
      'Add your OpenRouter API key in Settings, or enter your meal manually.',
      'no_key',
    );

  let messages = params.messages;
  // Transport retries and JSON correction share one budget, never nested retries.
  for (let attempt = 0; attempt < AI_CONFIG.maxAttempts; attempt++) {
    try {
      const raw = await requestOnce({ ...params, messages }, key);
      try {
        return parse(raw);
      } catch {
        messages = [
          ...params.messages,
          { role: 'assistant', content: raw },
          {
            role: 'user',
            content:
              'Your previous response did not match the requested JSON schema. Return valid JSON only, with all required fields and valid values.',
          },
        ];
        throw invalidOutput();
      }
    } catch (error) {
      const retryable =
        error instanceof AIError &&
        (error.kind === 'network' ||
          error.kind === 'timeout' ||
          error.kind === 'http_5xx' ||
          error.kind === 'invalid_json');
      if (!retryable || attempt + 1 === AI_CONFIG.maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, AI_CONFIG.retryDelayMs));
    }
  }
  throw invalidOutput();
}

export function chat(params: ChatParams): Promise<string> {
  return request(params, (raw) => raw);
}

/** At most two HTTP attempts total, including schema correction and transient retries. */
export function chatJson<T>(params: ChatParams, parse: (raw: string) => T): Promise<T> {
  return request({ ...params, responseFormat: { type: 'json_object' } }, parse);
}
