import { describe, expect, it, vi } from 'vitest';
import type { AuthChangeEvent, Session, SupabaseClient } from '@supabase/supabase-js';
import {
  AUTH_REDIRECT_URL,
  createAuthCallbackHandler,
  parseAuthCallback,
} from '../../lib/auth/callback';
import { observeSession } from '../../lib/auth/session';

const tokens = { access_token: 'test-access', refresh_token: 'test-refresh' };
const tokenUrl = `${AUTH_REDIRECT_URL}#access_token=test-access&refresh_token=test-refresh`;
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const session = { user: { id: 'test-user' } } as Session;

describe('auth callbacks', () => {
  it('accepts current and legacy token links, including query and fragment parameters', () => {
    expect(parseAuthCallback(tokenUrl)).toEqual(tokens);
    expect(
      parseAuthCallback('neonplate://#access_token=test-access&refresh_token=test-refresh'),
    ).toEqual(tokens);
    expect(
      parseAuthCallback(`${AUTH_REDIRECT_URL}?access_token=test-access#refresh_token=test-refresh`),
    ).toEqual(tokens);
    expect(parseAuthCallback(`${AUTH_REDIRECT_URL}?code=test-code`)).toEqual({ code: 'test-code' });
  });
  it('ignores unrelated links and plain app launches', () => {
    for (const url of [
      'invalid',
      'https://example.com/auth/callback?code=test',
      'neonplate://today?code=test',
      'neonplate://',
    ]) {
      expect(parseAuthCallback(url)).toBeNull();
    }
  });
  it('rejects expired and incomplete callbacks without reflecting tokens or server descriptions', () => {
    expect(() =>
      parseAuthCallback(`${AUTH_REDIRECT_URL}#error=access_denied&error_description=sensitive`),
    ).toThrow('expired or is invalid');
    expect(() => parseAuthCallback(`${AUTH_REDIRECT_URL}#access_token=test-access`)).toThrow(
      'incomplete',
    );
    expect(() => parseAuthCallback(AUTH_REDIRECT_URL)).toThrow('incomplete');
  });
  function client() {
    const setSession = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ data: { session }, error: null });
    const handle = createAuthCallbackHandler({ setSession, exchangeCodeForSession });
    return { handle, setSession, exchangeCodeForSession };
  }
  it('creates the session once for duplicate cold/warm link deliveries', async () => {
    const { handle, setSession } = client();
    await Promise.all([handle(tokenUrl), handle(tokenUrl)]);
    await handle(tokenUrl);
    expect(setSession).toHaveBeenCalledExactlyOnceWith(tokens);
  });
  it('exchanges PKCE codes and serializes different sign-in callbacks', async () => {
    const { handle, exchangeCodeForSession } = client();
    const first = deferred<unknown>();
    exchangeCodeForSession.mockReturnValueOnce(first.promise);
    const a = handle(`${AUTH_REDIRECT_URL}?code=first`);
    const b = handle(`${AUTH_REDIRECT_URL}?code=second`);
    await vi.waitFor(() => expect(exchangeCodeForSession).toHaveBeenCalledTimes(1));
    first.resolve({ data: { session }, error: null });
    await Promise.all([a, b]);
    expect(exchangeCodeForSession.mock.calls).toEqual([['first'], ['second']]);
  });
  it('allows retry after failure and does not block the next link', async () => {
    const { handle, setSession } = client();
    setSession.mockResolvedValueOnce({ error: { message: 'network failed' } });
    await expect(handle(tokenUrl)).rejects.toThrow('Check your connection');
    await handle(tokenUrl);
    expect(setSession).toHaveBeenCalledTimes(2);
  });
});

describe('session restoration', () => {
  function setup() {
    const stored = deferred<Awaited<ReturnType<SupabaseClient['auth']['getSession']>>>();
    let event!: (event: AuthChangeEvent, session: Session | null) => void;
    const unsubscribe = vi.fn();
    const onAuthStateChange = vi.fn(
      (callback: (event: AuthChangeEvent, session: Session | null) => void) => {
        event = callback;
        return { data: { subscription: { id: 'test-subscription', callback, unsubscribe } } };
      },
    );
    const update = vi.fn();
    const stop = observeSession(
      {
        getSession: () => stored.promise,
        onAuthStateChange: onAuthStateChange as SupabaseClient['auth']['onAuthStateChange'],
      },
      update,
    );
    return { stored, event, update, stop, unsubscribe };
  }
  it('restores a session and ends loading', async () => {
    const { stored, update } = setup();
    stored.resolve({ data: { session }, error: null });
    await vi.waitFor(() =>
      expect(update).toHaveBeenLastCalledWith({ session, loading: false, error: null }),
    );
  });
  it('does not restore stale session data after sign-out', async () => {
    const { stored, event, update } = setup();
    event('SIGNED_OUT', null);
    stored.resolve({ data: { session }, error: null });
    await stored.promise;
    expect(update).toHaveBeenCalledExactlyOnceWith({ session: null, loading: false, error: null });
  });
  it('does not overwrite a sign-in with a delayed empty storage result', async () => {
    const { stored, event, update } = setup();
    event('SIGNED_IN', session);
    stored.resolve({ data: { session: null }, error: null });
    await stored.promise;
    expect(update).toHaveBeenCalledExactlyOnceWith({ session, loading: false, error: null });
  });
  it('reports storage failures without remaining stuck loading', async () => {
    const { stored, update } = setup();
    stored.reject(new Error('storage failure'));
    await vi.waitFor(() =>
      expect(update).toHaveBeenCalledWith({
        session: null,
        loading: false,
        error: expect.stringContaining('Could not restore'),
      }),
    );
  });
  it('unsubscribes and ignores events/results after unmount', async () => {
    const { stored, event, update, stop, unsubscribe } = setup();
    stop();
    event('SIGNED_IN', session);
    stored.resolve({ data: { session }, error: null });
    await stored.promise;
    expect(update).not.toHaveBeenCalled();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
