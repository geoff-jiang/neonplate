// lib/ai/config.ts
export const AI_CONFIG = {
  // Default model — cheap, fast, reliable JSON output
  model: 'anthropic/claude-3.5-haiku',

  // Temperatures per call type
  tempExtraction: 0.3,
  tempSuggestion: 0.7,

  // Behavior
  maxRetries: 1,
  timeoutMs: 15000,

  // OpenRouter endpoint
  baseUrl: 'https://openrouter.ai/api/v1',
} as const;
