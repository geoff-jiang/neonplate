// hooks/use-daily-logs.ts
import { useState, useEffect, useCallback } from 'react';
import { dailyLogQueries, DailyLog, DailyLogInsert } from '../lib/supabase/queries';
import { useAuth } from './use-auth';
import { startOfLocalDay, endOfLocalDay } from '../lib/utils/day-boundary';

export function useDailyLogs(day: Date = new Date()) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dailyLogQueries.listForDay(
        user.id,
        startOfLocalDay(day).toISOString(),
        endOfLocalDay(day).toISOString(),
      );
      setLogs(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [user, day]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (insert: Omit<DailyLogInsert, 'user_id'>): Promise<DailyLog> => {
      if (!user) throw new Error('Not signed in');
      const payload: DailyLogInsert = { ...insert, user_id: user.id };
      const temp: DailyLog = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        recipe_id: payload.recipe_id ?? null,
        name: payload.name,
        calories: payload.calories ?? 0,
        protein_g: payload.protein_g ?? 0,
        carbs_g: payload.carbs_g ?? 0,
        fat_g: payload.fat_g ?? 0,
        logged_at: payload.logged_at ?? new Date().toISOString(),
        source: payload.source,
        raw_input: payload.raw_input ?? null,
      };
      setLogs((prev) => [temp, ...prev]);
      try {
        const saved = await dailyLogQueries.insert(payload);
        setLogs((prev) => prev.map((l) => (l.id === temp.id ? saved : l)));
        return saved;
      } catch (e) {
        setLogs((prev) => prev.filter((l) => l.id !== temp.id));
        throw e;
      }
    },
    [user],
  );

  const update = useCallback(async (id: string, patch: Partial<DailyLogInsert>) => {
    const snapshot = logs;
    setLogs((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } as DailyLog : l)),
    );
    try {
      await dailyLogQueries.update(id, patch);
    } catch (e) {
      setLogs(snapshot);
      throw e;
    }
  }, [logs]);

  const remove = useCallback(async (id: string) => {
    const snapshot = logs;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    try {
      await dailyLogQueries.remove(id);
    } catch (e) {
      setLogs(snapshot);
      throw e;
    }
  }, [logs]);

  return { logs, loading, error, add, update, remove, reload };
}
