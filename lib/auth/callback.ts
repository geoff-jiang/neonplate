import type { SupabaseClient } from '@supabase/supabase-js';

export const AUTH_REDIRECT_URL = 'neonplate://auth/callback';

type Credentials = { access_token: string; refresh_token: string } | { code: string };

// Only consume auth links intended for this app. Keep support for previously sent root links.
export function parseAuthCallback(url: string): Credentials | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'neonplate:') return null;
  const path = `${parsed.hostname}${parsed.pathname}`.replace(/^\/+|\/+$/g, '');
  if (path !== '' && path !== 'auth/callback') return null;
  const params = new URLSearchParams(parsed.search);
  new URLSearchParams(parsed.hash.slice(1)).forEach((value, key) => params.set(key, value));
  if (params.has('error') || params.has('error_code')) {
    throw new Error('This sign-in link has expired or is invalid. Request a new link.');
  }
  const code = params.get('code');
  if (code) return { code };
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) return { access_token, refresh_token };
  if (access_token || refresh_token || path === 'auth/callback') {
    throw new Error('This sign-in link is incomplete. Request a new link.');
  }
  return null;
}

export function createAuthCallbackHandler(
  auth: Pick<SupabaseClient['auth'], 'setSession' | 'exchangeCodeForSession'>,
) {
  let lastUrl: string | null = null;
  let lastRequest: Promise<void> | null = null;
  let queue = Promise.resolve();
  return (url: string): Promise<void> => {
    if (url === lastUrl && lastRequest) return lastRequest;
    // Serialize distinct links; duplicate native URL events must not redeem a code twice.
    const request = queue
      .catch(() => {})
      .then(async () => {
        const credentials = parseAuthCallback(url);
        if (!credentials) return;
        const { error } =
          'code' in credentials
            ? await auth.exchangeCodeForSession(credentials.code)
            : await auth.setSession(credentials);
        if (error)
          throw new Error(
            'Could not sign in with this link. Check your connection or request a new link.',
          );
      });
    lastUrl = url;
    lastRequest = request;
    queue = request;
    void request.catch(() => {
      if (lastRequest === request) {
        lastUrl = null;
        lastRequest = null;
      }
    });
    return request;
  };
}
