import { useDailyLogs } from '../../hooks/use-daily-logs';
import { useSettings } from '../../hooks/use-settings';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  user: { id: 'alice' } as { id: string } | null,
  listeners: new Set<(status: string) => void>(),
  listLogs: vi.fn(),
  insertLog: vi.fn(),
  updateLog: vi.fn(),
  removeLog: vi.fn(),
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
}));
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_event: string, callback: (status: string) => void) => {
      mocks.listeners.add(callback);
      return { remove: () => mocks.listeners.delete(callback) };
    },
  },
}));
vi.mock('../../hooks/use-auth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../../lib/supabase/queries', () => ({
  dailyLogQueries: {
    listForDay: mocks.listLogs,
    insert: mocks.insertLog,
    update: mocks.updateLog,
    remove: mocks.removeLog,
  },
  settingsQueries: { get: mocks.getSettings, save: mocks.saveSettings },
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const renderers: ReactTestRenderer[] = [];
async function renderHook<T>(hook: () => T) {
  let value: T;
  function Probe() {
    value = hook();
    return null;
  }
  let renderer: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Probe));
  });
  renderers.push(renderer!);
  return {
    get current() {
      return value!;
    },
    async rerender() {
      await act(async () => {
        renderer.update(createElement(Probe));
      });
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const meal = { name: 'Lunch', source: 'text' };
const targets = { daily_calories: 2200, daily_protein_g: 160, daily_carbs_g: 240, daily_fat_g: 70 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'alice' };
  mocks.listLogs.mockResolvedValue([]);
  mocks.getSettings.mockResolvedValue(targets);
  mocks.saveSettings.mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(async () => {
    renderers.splice(0).forEach((renderer) => renderer.unmount());
  });
  vi.useRealTimers();
  expect(mocks.listeners.size).toBe(0);
});

describe('daily data lifecycle', () => {
  it('does not re-fetch for default dates, new equivalent Date objects, or refreshed user objects', async () => {
    const today = await renderHook(() => useDailyLogs());
    const selected = await renderHook(() => useDailyLogs(new Date(2026, 8, 17)));
    expect(mocks.listLogs).toHaveBeenCalledTimes(2);
    mocks.user = { id: 'alice' };
    await today.rerender();
    await selected.rerender();
    expect(mocks.listLogs).toHaveBeenCalledTimes(2);
  });

  it('refreshes all mounted readers after a modal saves and rejects a simultaneous second submit', async () => {
    const today = await renderHook(() => useDailyLogs());
    const modal = await renderHook(() => useDailyLogs());
    const write = deferred<{ id: string }>();
    mocks.insertLog.mockReturnValue(write.promise);
    let result!: Promise<unknown>;
    await act(async () => {
      result = modal.current.add(meal);
    });
    expect(today.current.saving).toBe(true);
    await act(async () => {
      await expect(modal.current.add(meal)).rejects.toThrow('Please wait');
    });
    expect(mocks.insertLog).toHaveBeenCalledTimes(1);
    mocks.listLogs.mockResolvedValue([{ id: 'saved' }]);
    await act(async () => {
      write.resolve({ id: 'saved' });
      await result;
    });
    expect(today.current.logs).toEqual([{ id: 'saved' }]);
    expect(modal.current.logs).toEqual([{ id: 'saved' }]);
    expect(today.current.saving).toBe(false);
    expect(modal.current.error).toBeNull();
  });

  it('ignores an old read arriving after a newer mutation refresh', async () => {
    const old = deferred<unknown[]>();
    mocks.listLogs.mockReturnValueOnce(old.promise);
    const hook = await renderHook(() => useDailyLogs());
    mocks.insertLog.mockResolvedValue({ id: 'new' });
    mocks.listLogs.mockResolvedValue([{ id: 'new' }]);
    await act(async () => {
      await hook.current.add(meal);
    });
    await act(async () => {
      old.resolve([{ id: 'stale' }]);
    });
    expect(hook.current.logs).toEqual([{ id: 'new' }]);
  });

  it('keeps failed writes visible and existing data intact; retry clears the error', async () => {
    mocks.listLogs.mockResolvedValue([{ id: 'kept' }]);
    const hook = await renderHook(() => useDailyLogs());
    mocks.removeLog.mockRejectedValue({ message: 'Connection lost' });
    await act(async () => {
      await expect(hook.current.remove('kept')).rejects.toThrow('Connection lost');
    });
    expect(hook.current.logs).toEqual([{ id: 'kept' }]);
    expect(hook.current.error?.message).toBe('Connection lost');
    await act(async () => {
      await hook.current.reload();
    });
    expect(hook.current.error).toBeNull();
  });

  it('clears data on sign-out and ignores prior-user reads and writes after switching accounts', async () => {
    const oldRead = deferred<unknown[]>();
    const oldWrite = deferred<unknown>();
    mocks.listLogs.mockReturnValueOnce(oldRead.promise);
    mocks.insertLog.mockReturnValueOnce(oldWrite.promise);
    const hook = await renderHook(() => useDailyLogs());
    let writeResult!: Promise<unknown>;
    await act(async () => {
      writeResult = hook.current.add(meal).catch(() => undefined);
    });
    mocks.user = null;
    await hook.rerender();
    expect(hook.current.logs).toEqual([]);
    expect(hook.current.loading).toBe(false);
    mocks.user = { id: 'bob' };
    mocks.listLogs.mockResolvedValue([{ id: 'bob-only' }]);
    await hook.rerender();
    await act(async () => {
      oldRead.resolve([{ id: 'alice-only' }]);
      oldWrite.reject(new Error('Alice failed'));
      await writeResult;
    });
    expect(hook.current.logs).toEqual([{ id: 'bob-only' }]);
    expect(hook.current.error).toBeNull();
    expect(hook.current.saving).toBe(false);
  });

  it('does not attach a previous session write failure after signing back into the same account', async () => {
    const oldWrite = deferred<unknown>();
    mocks.insertLog.mockReturnValueOnce(oldWrite.promise);
    const hook = await renderHook(() => useDailyLogs());
    let writeResult!: Promise<unknown>;
    await act(async () => {
      writeResult = hook.current.add(meal).catch(() => undefined);
    });
    mocks.user = null;
    await hook.rerender();
    await act(async () => {
      await expect(hook.current.add(meal)).rejects.toThrow('Not signed in');
    });
    mocks.user = { id: 'alice' };
    await hook.rerender();
    await act(async () => {
      oldWrite.reject(new Error('Previous session failed'));
      await writeResult;
    });
    expect(hook.current.error).toBeNull();
    expect(hook.current.loading).toBe(false);
    expect(hook.current.saving).toBe(false);
  });

  it('refreshes at local midnight and after resuming on a later day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 17, 23, 59, 59));
    const hook = await renderHook(() => useDailyLogs());
    expect(mocks.listLogs.mock.lastCall?.[1]).toBe(new Date(2026, 8, 17).toISOString());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(mocks.listLogs.mock.lastCall?.[1]).toBe(new Date(2026, 8, 18).toISOString());
    vi.setSystemTime(new Date(2026, 8, 20, 10));
    await act(async () => {
      mocks.listeners.forEach((listener) => listener('active'));
    });
    expect(mocks.listLogs.mock.lastCall?.[1]).toBe(new Date(2026, 8, 20).toISOString());
    expect(hook.current.loading).toBe(false);
  });

  it('ignores older manual reloads that finish after a newer reload', async () => {
    const hook = await renderHook(() => useDailyLogs());
    const old = deferred<unknown[]>();
    mocks.listLogs.mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ id: 'current' }]);
    let oldReload!: Promise<void>;
    await act(async () => {
      oldReload = hook.current.reload();
    });
    await act(async () => {
      await hook.current.reload();
    });
    await act(async () => {
      old.resolve([{ id: 'stale' }]);
      await oldReload;
    });
    expect(hook.current.logs).toEqual([{ id: 'current' }]);
  });
});

describe('settings lifecycle', () => {
  it('updates another screen after saving targets and clears them on sign-out', async () => {
    const today = await renderHook(() => useSettings());
    const settings = await renderHook(() => useSettings());
    const updated = { ...targets, daily_calories: 2500 };
    mocks.getSettings.mockResolvedValue(updated);
    await act(async () => {
      await settings.current.save(updated);
    });
    expect(today.current.settings).toEqual(updated);
    mocks.user = null;
    await today.rerender();
    expect(today.current.settings.daily_calories).toBe(2000);
    expect(today.current.loading).toBe(false);
  });

  it('exposes read failures instead of silently passing off defaults as saved targets', async () => {
    mocks.getSettings.mockRejectedValue({ message: 'Targets unavailable' });
    const hook = await renderHook(() => useSettings());
    expect(hook.current.error?.message).toBe('Targets unavailable');
    expect(hook.current.loading).toBe(false);
    mocks.getSettings.mockResolvedValue(targets);
    await act(async () => {
      await hook.current.reload();
    });
    expect(hook.current.settings).toEqual(targets);
    expect(hook.current.error).toBeNull();
  });
});
