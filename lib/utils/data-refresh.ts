// A mutation invalidates every mounted reader for that user's resource.
// No data is cached here; screens retain their own bounded query results.
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();
const pending = new Set<string>();

export function isMutationPending(key: string): boolean {
  return pending.has(key);
}

export function subscribeToMutations(key: string, listener: Listener): () => void {
  const subscribers = listeners.get(key) ?? new Set<Listener>();
  subscribers.add(listener);
  listeners.set(key, subscribers);
  return () => {
    subscribers.delete(listener);
    if (!subscribers.size) listeners.delete(key);
  };
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export async function runMutation<T>(key: string, action: () => Promise<T>): Promise<T> {
  if (pending.has(key)) throw new Error('Please wait for the current change to finish.');
  pending.add(key);
  notify(key);
  try {
    return await action();
  } finally {
    pending.delete(key);
    notify(key);
  }
}
