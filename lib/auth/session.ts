import type { Session, SupabaseClient } from '@supabase/supabase-js';

export type AuthState = { session: Session | null; loading: boolean; error: string | null };

// Subscribe first: a delayed storage read must never overwrite a newer sign-in/out event.
export function observeSession(
  auth: Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'>,
  update: (state: AuthState) => void,
) {
  let active = true;
  let receivedEvent = false;
  const {
    data: { subscription },
  } = auth.onAuthStateChange((_event, session) => {
    receivedEvent = true;
    if (active) update({ session, loading: false, error: null });
  });
  void auth
    .getSession()
    .then(({ data, error }) => {
      if (active && !receivedEvent) {
        update({ session: data.session, loading: false, error: error?.message ?? null });
      }
    })
    .catch(() => {
      if (active && !receivedEvent) {
        update({
          session: null,
          loading: false,
          error: 'Could not restore your session. Please sign in again.',
        });
      }
    });
  return () => {
    active = false;
    subscription.unsubscribe();
  };
}
