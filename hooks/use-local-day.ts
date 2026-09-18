import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { startOfLocalDay } from '../lib/utils/day-boundary';

// A primitive local-midnight timestamp is stable across renders, unlike new Date().
export function useLocalDay(day?: Date): number {
  const [today, setToday] = useState(() => startOfLocalDay(new Date()).getTime());
  const explicitDay = day === undefined ? undefined : startOfLocalDay(day).getTime();

  useEffect(() => {
    if (explicitDay !== undefined) return;
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      const now = new Date();
      setToday(startOfLocalDay(now).getTime());
      const next = startOfLocalDay(now);
      next.setDate(next.getDate() + 1);
      timer = setTimeout(update, Math.max(1, next.getTime() - now.getTime()));
    };
    update();
    const foreground = AppState.addEventListener('change', (status) => {
      if (status === 'active') update();
    });
    return () => {
      clearTimeout(timer);
      foreground.remove();
    };
  }, [explicitDay]);

  return explicitDay ?? today;
}
