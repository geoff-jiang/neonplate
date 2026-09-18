// tests/unit/prompts.test.ts
import { describe, it, expect } from 'vitest';
import { buildMealExtractionPrompt } from '../../lib/ai/prompts';

describe('buildMealExtractionPrompt', () => {
  it('includes the raw user input', () => {
    const result = buildMealExtractionPrompt('grilled chicken with rice');
    const userMsg = result.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('grilled chicken with rice');
  });

  it('has a system message requiring JSON', () => {
    const result = buildMealExtractionPrompt('x');
    const sys = result.find((m) => m.role === 'system');
    expect(sys).toBeDefined();
    expect(sys!.content.toLowerCase()).toContain('json');
  });

  it('mentions confidence levels in the system prompt', () => {
    const result = buildMealExtractionPrompt('x');
    const sys = result.find((m) => m.role === 'system');
    expect(sys!.content).toContain('confidence');
    expect(sys!.content).toMatch(/low|medium|high/);
  });

  it('instructs integer rounding', () => {
    const result = buildMealExtractionPrompt('x');
    const sys = result.find((m) => m.role === 'system');
    expect(sys!.content.toLowerCase()).toMatch(/integer|round/);
  });
});
