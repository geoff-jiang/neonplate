import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, chatJson } from '../../lib/ai/client';
import { AI_CONFIG } from '../../lib/ai/config';

const mocks = vi.hoisted(() => ({ key: vi.fn(), fetch: vi.fn() }));
vi.mock('../../lib/auth/secure-storage', () => ({ getOpenRouterKey: mocks.key }));
const params = { messages: [{ role: 'user' as const, content: 'Lunch' }], temperature: 0.3 };
const response = (content: string) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }));
const parse = (raw: string) => {
  const value = JSON.parse(raw) as { calories?: number };
  if (typeof value.calories !== 'number') throw new Error('Invalid calories');
  return value;
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.key.mockResolvedValue(' test-key ');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function finish<T>(promise: Promise<T>) {
  // Attach a rejection handler before advancing deadlines.
  const result = promise.then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await vi.runAllTimersAsync();
  return result;
}
describe('OpenRouter request budget and errors', () => {
  it('never makes a request without a usable key', async () => {
    mocks.key.mockResolvedValue(' ');
    expect(await finish(chat(params))).toMatchObject({ error: { kind: 'no_key' } });
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('retries a transient network failure once', async () => {
    mocks.fetch
      .mockRejectedValueOnce(new Error('secret network detail'))
      .mockResolvedValueOnce(response('ok'));
    expect(await finish(chat(params))).toEqual({ value: 'ok' });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('corrects malformed model JSON with one remaining attempt', async () => {
    mocks.fetch
      .mockResolvedValueOnce(response('bad json'))
      .mockResolvedValueOnce(response('{"calories":300}'));
    expect(await finish(chatJson(params, parse))).toEqual({ value: { calories: 300 } });
    const body = JSON.parse(mocks.fetch.mock.calls[1][1].body);
    expect(body.messages[1]).toEqual({ role: 'assistant', content: 'bad json' });
    expect(body.messages[2].content).toContain('JSON schema');
    expect(body.response_format).toEqual({ type: 'json_object' });
  });
  it.each(['network-first', 'json-first'])(
    'shares two attempts between transport and correction: %s',
    async (order) => {
      if (order === 'network-first')
        mocks.fetch
          .mockRejectedValueOnce(new Error('offline'))
          .mockResolvedValueOnce(response('{}'));
      else
        mocks.fetch
          .mockResolvedValueOnce(response('{}'))
          .mockRejectedValueOnce(new Error('offline'));
      expect(await finish(chatJson(params, parse))).toHaveProperty('error');
      expect(mocks.fetch).toHaveBeenCalledTimes(2);
    },
  );
  it.each([401, 402, 403, 429])(
    'does not retry account/request status %s or expose provider body',
    async (status) => {
      mocks.fetch.mockResolvedValue(new Response('private provider detail', { status }));
      const result = await finish(chat(params));
      expect(result).toMatchObject({ error: { kind: 'http_4xx', status } });
      expect(String('error' in result && result.error)).not.toContain('private');
      expect(mocks.fetch).toHaveBeenCalledTimes(1);
    },
  );
  it('treats HTTP 200 provider failures as failed attempts, even with partial content', async () => {
    mocks.fetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: { content: 'partial' },
                finish_reason: 'error',
                error: { code: 503, message: 'private' },
              },
            ],
          }),
        ),
      )
      .mockResolvedValueOnce(response('complete'));
    expect(await finish(chat(params))).toEqual({ value: 'complete' });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
  it('bounds stalled body consumption and aborts both requests', async () => {
    const signals: AbortSignal[] = [];
    mocks.fetch.mockImplementation((_url: string, options: RequestInit) => {
      signals.push(options.signal as AbortSignal);
      return Promise.resolve({ ok: true, text: () => new Promise(() => {}) });
    });
    expect(await finish(chat(params))).toMatchObject({ error: { kind: 'timeout' } });
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    expect(AI_CONFIG.maxAttempts).toBe(2);
  });
  it('rejects invalid response envelopes within the same budget', async () => {
    mocks.fetch.mockImplementation(() => Promise.resolve(new Response('{"choices":[]}')));
    expect(await finish(chat(params))).toMatchObject({ error: { kind: 'invalid_json' } });
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
  });
});
