import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from '../../hooks/use-speech-recognition';
const mocks = vi.hoisted(() => ({
  nativeEnds: new Set<() => void>(),
  handlers: {} as Record<string, (event: any) => void>,
  listeners: new Set<(state: string) => void>(),
  permission: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
}));
vi.mock('react-native', () => ({
  AppState: {
    addEventListener: (_: string, listener: (state: string) => void) => {
      mocks.listeners.add(listener);
      return { remove: () => mocks.listeners.delete(listener) };
    },
  },
}));
vi.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    addListener: (_: string, listener: () => void) => {
      mocks.nativeEnds.add(listener);
      return { remove: () => mocks.nativeEnds.delete(listener) };
    },
    requestPermissionsAsync: mocks.permission,
    start: mocks.start,
    stop: mocks.stop,
    abort: mocks.abort,
  },
  useSpeechRecognitionEvent: (name: string, handler: (event: any) => void) => {
    mocks.handlers[name] = handler;
  },
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let renderer: ReactTestRenderer | undefined;
async function render(initial = 'Edited lunch') {
  let current!: ReturnType<typeof useSpeechRecognition>;
  function Probe() {
    current = useSpeechRecognition(initial);
    return null;
  }
  await act(async () => {
    renderer = create(createElement(Probe));
  });
  return {
    get current() {
      return current;
    },
  };
}
async function emit(name: string, event = {}) {
  await act(async () => {
    if (name === 'end') [...mocks.nativeEnds].forEach((listener) => listener());
    mocks.handlers[name](event);
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers = {};
  mocks.permission.mockResolvedValue({ granted: true });
});
afterEach(async () => {
  await act(async () => {
    renderer?.unmount();
  });
  renderer = undefined;
  await emit('end');
  expect(mocks.nativeEnds.size).toBe(0);
  expect(mocks.listeners.size).toBe(0);
});
describe('speech lifecycle', () => {
  it('preserves edited text across permission denial and retry', async () => {
    const hook = await render();
    mocks.permission.mockResolvedValueOnce({ granted: false });
    await act(async () => {
      await hook.current.start();
    });
    expect(hook.current.state).toBe('error');
    expect(hook.current.transcript).toBe('Edited lunch');
    expect(mocks.start).not.toHaveBeenCalled();
    await act(async () => {
      hook.current.setTranscript('Corrected lunch');
      await hook.current.start();
    });
    await emit('start');
    await emit('result', { results: [{ transcript: 'and rice' }], isFinal: false });
    await emit('result', { results: [{ transcript: 'and brown rice' }], isFinal: true });
    expect(hook.current.transcript).toBe('Corrected lunch and brown rice');
    await act(async () => {
      hook.current.stop();
    });
    await emit('end');
    expect(hook.current.state).toBe('idle');
  });
  it('cancels pending permission requests without starting after resolution', async () => {
    let resolve!: (value: { granted: boolean }) => void;
    mocks.permission.mockReturnValue(
      new Promise((res) => {
        resolve = res;
      }),
    );
    const hook = await render();
    let pending!: Promise<void>;
    await act(async () => {
      pending = hook.current.start();
    });
    await act(async () => {
      hook.current.stop();
      resolve({ granted: true });
      await pending;
    });
    expect(mocks.start).not.toHaveBeenCalled();
    expect(hook.current.state).toBe('idle');
  });
  it('drains canceled native events before allowing another recording', async () => {
    const hook = await render();
    await act(async () => {
      await hook.current.start();
    });
    await emit('start');
    await act(async () => {
      hook.current.reset();
      await hook.current.start();
    });
    expect(mocks.abort).toHaveBeenCalledTimes(1);
    expect(mocks.start).toHaveBeenCalledTimes(1);
    await emit('result', { results: [{ transcript: 'stale' }], isFinal: true });
    expect(hook.current.transcript).toBe('');
    await emit('end');
    await act(async () => {
      await hook.current.start();
    });
    expect(mocks.start).toHaveBeenCalledTimes(2);
  });
  it('preserves transcript on background cancellation and removes listener on unmount', async () => {
    const hook = await render();
    await act(async () => {
      await hook.current.start();
    });
    await emit('start');
    await emit('result', { results: [{ transcript: 'with beans' }], isFinal: false });
    await act(async () => {
      mocks.listeners.forEach((listener) => listener('background'));
    });
    await emit('result', { results: [{ transcript: 'late result' }], isFinal: true });
    expect(hook.current.transcript).toBe('Edited lunch with beans');
    expect(mocks.abort).toHaveBeenCalledTimes(1);
    await emit('end');
    await act(async () => {
      await hook.current.start();
    });
    await act(async () => {
      renderer?.unmount();
    });
    renderer = undefined;
    expect(mocks.abort).toHaveBeenCalledTimes(2);
    expect(mocks.listeners.size).toBe(0);
  });
  it('blocks a remounted recorder until the prior native end drains', async () => {
    const first = await render('First');
    await act(async () => {
      await first.current.start();
    });
    await emit('start');
    await act(async () => {
      renderer?.unmount();
    });
    renderer = undefined;
    const second = await render('Second');
    await act(async () => {
      await second.current.start();
    });
    expect(mocks.start).toHaveBeenCalledTimes(1);
    expect(second.current.error).toContain('previous recording');
    await emit('result', { results: [{ transcript: 'old session' }], isFinal: true });
    expect(second.current.transcript).toBe('Second');
    await emit('end');
    await act(async () => {
      await second.current.start();
    });
    await emit('start');
    await emit('result', { results: [{ transcript: 'new session' }], isFinal: true });
    expect(mocks.start).toHaveBeenCalledTimes(2);
    expect(second.current.state).toBe('listening');
    expect(second.current.transcript).toBe('Second new session');
  });

  it('keeps results disabled after native errors and uses a safe message', async () => {
    const hook = await render();
    await act(async () => {
      await hook.current.start();
    });
    await emit('error', { error: 'network', message: 'private provider detail' });
    await emit('result', { results: [{ transcript: 'late' }], isFinal: true });
    await emit('end');
    expect(hook.current.state).toBe('error');
    expect(hook.current.error).toContain('Check your connection');
    expect(hook.current.error).not.toContain('private');
    expect(hook.current.transcript).toBe('Edited lunch');
  });
});
