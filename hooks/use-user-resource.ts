import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isMutationPending, runMutation, subscribeToMutations } from '../lib/utils/data-refresh';

function asError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === 'object' && error && 'message' in error) {
    return new Error(String(error.message));
  }
  return new Error('Unable to reach your data. Check your connection and try again.');
}

// Keep load and initial stable in callers. view identifies a bounded query (e.g. one day),
// while resource groups its mutations so other screens refresh after a successful write.
export function useUserResource<T>(
  userId: string | undefined,
  resource: string,
  view: string,
  load: (userId: string) => Promise<T>,
  initial: T,
) {
  const key = userId ? `${userId}:${resource}` : null;
  const scope = `${key}:${view}`;
  const generation = useRef(0);
  const lifecycle = useRef<object>({});
  const mountedScope = useRef<string | null>(null);
  const [state, setState] = useState({
    scope,
    data: initial,
    loading: !!userId,
    error: null as Error | null,
  });
  const [saving, setSaving] = useState(false);
  const [mutationError, setMutationError] = useState<{ scope: string; error: Error } | null>(null);

  const reload = useCallback(async () => {
    if (!userId || !key || mountedScope.current !== scope || isMutationPending(key)) return;
    const request = ++generation.current;
    setMutationError(null);
    setState((previous) => ({
      scope,
      data: previous.scope === scope ? previous.data : initial,
      loading: true,
      error: null,
    }));
    try {
      const data = await load(userId);
      if (generation.current === request && mountedScope.current === scope) {
        setState({ scope, data, loading: false, error: null });
      }
    } catch (error) {
      if (generation.current === request && mountedScope.current === scope) {
        setState((previous) => ({ ...previous, loading: false, error: asError(error) }));
      }
    }
  }, [initial, key, load, scope, userId]);

  useEffect(() => {
    mountedScope.current = scope;
    lifecycle.current = {};
    setState({ scope, data: initial, loading: !!userId, error: null });
    setMutationError(null);
    setSaving(key ? isMutationPending(key) : false);
    const unsubscribe = key
      ? subscribeToMutations(key, () => {
          // A read started before a write must never overwrite the later saved state.
          generation.current++;
          const pending = isMutationPending(key);
          setSaving(pending);
          if (!pending) void reload();
        })
      : undefined;
    void reload();
    const foreground = AppState.addEventListener('change', (status) => {
      if (status === 'active') void reload();
    });
    return () => {
      mountedScope.current = null;
      lifecycle.current = {};
      unsubscribe?.();
      foreground.remove();
    };
  }, [initial, key, reload, scope, userId]);

  const mutate = useCallback(
    async <R>(action: (id: string) => Promise<R>): Promise<R> => {
      if (!userId || !key || mountedScope.current !== scope) throw new Error('Not signed in');
      setMutationError(null);
      const activeLifecycle = lifecycle.current;
      try {
        return await runMutation(key, () => action(userId));
      } catch (error) {
        if (mountedScope.current === scope && lifecycle.current === activeLifecycle)
          setMutationError({ scope, error: asError(error) });
        throw asError(error);
      }
    },
    [key, scope, userId],
  );

  const current = state.scope === scope;
  return {
    data: current && userId ? state.data : initial,
    loading: current ? state.loading : !!userId,
    error: mutationError?.scope === scope ? mutationError.error : current ? state.error : null,
    saving: !!userId && current && saving,
    reload,
    mutate,
  };
}
