import { useCallback } from 'react';
import { dailyLogQueries, DailyLog, DailyLogInsert } from '../lib/supabase/queries';
import { useAuth } from './use-auth';
import { endOfLocalDay } from '../lib/utils/day-boundary';
import { useLocalDay } from './use-local-day';
import { useUserResource } from './use-user-resource';

const EMPTY_LOGS: DailyLog[] = [];

export function useDailyLogs(day?: Date) {
  const { user } = useAuth();
  const dayStart = useLocalDay(day);
  const load = useCallback(
    (userId: string) =>
      dailyLogQueries.listForDay(
        userId,
        new Date(dayStart).toISOString(),
        endOfLocalDay(new Date(dayStart)).toISOString(),
      ),
    [dayStart],
  );
  const {
    data: logs,
    mutate,
    ...state
  } = useUserResource(user?.id, 'logs', String(dayStart), load, EMPTY_LOGS);
  const add = useCallback(
    (insert: Omit<DailyLogInsert, 'user_id'>) =>
      mutate((userId) => dailyLogQueries.insert({ ...insert, user_id: userId })),
    [mutate],
  );
  const update = useCallback(
    (id: string, patch: Partial<Omit<DailyLogInsert, 'user_id' | 'id'>>) =>
      mutate((userId) => dailyLogQueries.update(id, patch, userId)),
    [mutate],
  );
  const remove = useCallback(
    (id: string) => mutate((userId) => dailyLogQueries.remove(id, userId)),
    [mutate],
  );
  return { logs, ...state, add, update, remove };
}
