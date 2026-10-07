// lib/ai/config.ts
export const AI_CONFIG = {
  // 3.5 Haiku is no longer listed; Haiku 4.5 supports response_format (verified 2026-10-06).
  model: 'anthropic/claude-haiku-4.5',

  // Temperatures per call type
  tempExtraction: 0.3,
  tempSuggestion: 0.7,

  // Behavior
  maxAttempts: 2,
  retryDelayMs: 500,
  timeoutMs: 15000,

  // OpenRouter endpoint
  baseUrl: 'https://openrouter.ai/api/v1',
} as const;
