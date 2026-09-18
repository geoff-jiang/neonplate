import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { observeSession, type AuthState } from '@/lib/auth/session';
import { createAuthCallbackHandler, parseAuthCallback } from '@/lib/auth/callback';

type AuthContextValue = AuthState & {
  user: NonNullable<AuthState['session']>['user'] | null;
  processingLink: boolean;
  clearError: () => void;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ session: null, loading: true, error: null });
  const [initialLinkChecked, setInitialLinkChecked] = useState(false);
  const [pendingLinks, setPendingLinks] = useState(0);
  const [linkError, setLinkError] = useState<string | null>(null);
  const signingOut = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let active = true;
    const stopObserving = observeSession(supabase.auth, setAuth);
    const consumeLink = createAuthCallbackHandler(supabase.auth);
    async function handleLink(url: string | null) {
      if (!url || !active) return;
      try {
        if (!parseAuthCallback(url)) return;
      } catch (error) {
        setLinkError(error instanceof Error ? error.message : 'Invalid sign-in link.');
        return;
      }
      setPendingLinks((count) => count + 1);
      setLinkError(null);
      try {
        await consumeLink(url);
      } catch (error) {
        if (active)
          setLinkError(error instanceof Error ? error.message : 'Could not sign in. Try again.');
      } finally {
        if (active) setPendingLinks((count) => count - 1);
      }
    }
    const linking = Linking.addEventListener('url', ({ url }) => {
      void handleLink(url);
    });
    void Linking.getInitialURL()
      .then(handleLink)
      .catch(() => {
        if (active) setLinkError('Could not open the sign-in link. Try opening it again.');
      })
      .finally(() => {
        if (active) setInitialLinkChecked(true);
      });

    function refreshForState(state: string) {
      if (Platform.OS === 'web') return;
      const request =
        state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh();
      void request.catch(() => {
        if (active) setLinkError('Session refresh failed. Check your connection and try again.');
      });
    }
    refreshForState(AppState.currentState);
    const appState = AppState.addEventListener('change', refreshForState);
    return () => {
      active = false;
      stopObserving();
      linking.remove();
      appState.remove();
      if (Platform.OS !== 'web') void supabase.auth.stopAutoRefresh().catch(() => {});
    };
  }, []);

  const clearError = useCallback(() => {
    setLinkError(null);
    setAuth((value) => ({ ...value, error: null }));
  }, []);
  const signOut = useCallback(() => {
    if (signingOut.current) return signingOut.current;
    signingOut.current = supabase.auth
      .signOut({ scope: 'local' })
      .then(({ error }) => {
        if (error) throw error;
        clearError();
      })
      .finally(() => {
        signingOut.current = null;
      });
    return signingOut.current;
  }, [clearError]);
  const value = useMemo(
    () => ({
      ...auth,
      loading: auth.loading || !initialLinkChecked,
      user: auth.session?.user ?? null,
      processingLink: pendingLinks > 0,
      error: linkError ?? auth.error,
      clearError,
      signOut,
    }),
    [auth, initialLinkChecked, pendingLinks, linkError, clearError, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
