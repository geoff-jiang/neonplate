import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({})) }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));
vi.mock('react-native-url-polyfill/auto', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: {} }));

beforeEach(() => {
  vi.resetModules();
  createClient.mockClear();
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
  vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('Supabase client configuration', () => {
  it('accepts a legacy key when the optional publishable-key template field is empty', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'test-legacy-key');
    await import('../../lib/supabase/client');
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-legacy-key',
      expect.any(Object),
    );
  });

  it('prefers the publishable key when both are configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-publishable-key');
    vi.stubEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', 'test-legacy-key');
    await import('../../lib/supabase/client');
    expect(createClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-publishable-key',
      expect.any(Object),
    );
  });

  it('reports missing configuration before creating a client', async () => {
    await expect(import('../../lib/supabase/client')).rejects.toThrow(
      /EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.*EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
    expect(createClient).not.toHaveBeenCalled();
  });
});
