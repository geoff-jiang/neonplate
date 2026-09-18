import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerificationScreen } from '../../components/logging/VerificationScreen';
import LogMeal from '../../app/modals/log-meal';

const mocks = vi.hoisted(() => ({ alert: vi.fn(), back: vi.fn(), add: vi.fn(), extract: vi.fn() }));
vi.mock('react-native', () => ({
  View: 'View',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  Pressable: 'Pressable',
  Alert: { alert: mocks.alert },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('expo-router', () => ({ useRouter: () => ({ back: mocks.back }) }));
vi.mock('../../components/ui/text', () => ({ Text: 'Text' }));
vi.mock('../../components/ui/input', () => ({ Input: 'input' }));
vi.mock('../../components/ui/button', () => ({ Button: 'button' }));
vi.mock('../../components/ui/card', () => ({ Card: 'Card' }));
vi.mock('../../components/logging/VoiceRecorder', () => ({ VoiceRecorder: 'VoiceRecorder' }));
vi.mock('../../hooks/use-daily-logs', () => ({ useDailyLogs: () => ({ add: mocks.add }) }));
vi.mock('../../lib/ai/calls/extract-meal', () => ({ extractMeal: mocks.extract }));
vi.mock('../../lib/ai/client', () => ({ AIError: class extends Error {} }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const extraction = {
  name: 'Lunch',
  calories: 400,
  protein_g: 30,
  carbs_g: 40,
  fat_g: 12,
  confidence: 'high' as const,
  notes: '',
};
const renderers: ReactTestRenderer[] = [];
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
async function render(element: ReturnType<typeof createElement>) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(element);
  });
  renderers.push(renderer);
  return renderer;
}
function button(renderer: ReactTestRenderer, label: string) {
  return renderer.root.findAll(
    (node) => node.type === 'button' && node.props.children === label,
  )[0];
}
beforeEach(() => vi.clearAllMocks());
afterEach(async () => {
  await act(async () => {
    renderers.splice(0).forEach((renderer) => renderer.unmount());
  });
});

describe('verification submission guard', () => {
  it('saves once and locks cancel, reparse and every input until the write settles', async () => {
    const pending = deferred<void>();
    const confirm = vi.fn(() => pending.promise);
    const cancel = vi.fn();
    const reparse = vi.fn();
    const renderer = await render(
      createElement(VerificationScreen, {
        extraction,
        onConfirm: confirm,
        onCancel: cancel,
        onReparse: reparse,
      }),
    );
    const save = button(renderer, 'Save').props.onPress;
    const cancelPress = button(renderer, 'Cancel').props.onPress;
    const reparsePress = button(renderer, 'Re-parse').props.onPress;
    let request!: Promise<void>;
    await act(async () => {
      request = save();
      void save();
      cancelPress();
      void reparsePress();
    });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(cancel).not.toHaveBeenCalled();
    expect(reparse).not.toHaveBeenCalled();
    expect(button(renderer, 'Cancel').props.disabled).toBe(true);
    expect(button(renderer, 'Re-parse').props.disabled).toBe(true);
    expect(
      renderer.root
        .findAll((node) => node.type === 'input')
        .every((node) => node.props.editable === false),
    ).toBe(true);
    await act(async () => {
      pending.resolve();
      await request;
    });
    expect(button(renderer, 'Save').props.disabled).toBe(false);
  });
  it('does not save or cancel while re-parsing is pending', async () => {
    const pending = deferred<void>();
    const confirm = vi.fn();
    const cancel = vi.fn();
    const renderer = await render(
      createElement(VerificationScreen, {
        extraction,
        onConfirm: confirm,
        onCancel: cancel,
        onReparse: () => pending.promise,
      }),
    );
    const save = button(renderer, 'Save').props.onPress;
    const cancelPress = button(renderer, 'Cancel').props.onPress;
    let request!: Promise<void>;
    await act(async () => {
      request = button(renderer, 'Re-parse').props.onPress();
      void save();
      cancelPress();
    });
    expect(confirm).not.toHaveBeenCalled();
    expect(cancel).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve();
      await request;
    });
  });
  it('does not show a stale save error after unmount', async () => {
    const pending = deferred<void>();
    const renderer = await render(
      createElement(VerificationScreen, {
        extraction,
        onConfirm: () => pending.promise,
        onCancel: vi.fn(),
      }),
    );
    let request!: Promise<void>;
    await act(async () => {
      request = button(renderer, 'Save').props.onPress();
    });
    await act(async () => renderer.unmount());
    await act(async () => {
      pending.reject(new Error('write failed'));
      await request;
    });
    expect(mocks.alert).not.toHaveBeenCalled();
  });
});

describe('log modal async lifecycle', () => {
  async function parse(renderer: ReactTestRenderer) {
    await act(async () => {
      renderer.root.findAll((node) => node.type === 'input')[0].props.onChangeText('Lunch');
    });
    await act(async () => {
      await button(renderer, 'Parse').props.onPress();
    });
  }
  it('does not navigate from a stale modal when its pending write finishes', async () => {
    const pending = deferred<void>();
    mocks.extract.mockResolvedValue(extraction);
    mocks.add.mockReturnValue(pending.promise);
    const renderer = await render(createElement(LogMeal));
    await parse(renderer);
    const confirm = renderer.root.findByType(VerificationScreen).props.onConfirm;
    let request!: Promise<void>;
    await act(async () => {
      request = confirm(extraction);
      void confirm(extraction);
    });
    expect(mocks.add).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
    await act(async () => {
      pending.resolve();
      await request;
    });
    expect(mocks.back).not.toHaveBeenCalled();
  });
  it('ignores parse results after dismissal and blocks repeated parse taps', async () => {
    const pending = deferred<typeof extraction>();
    mocks.extract.mockReturnValue(pending.promise);
    const renderer = await render(createElement(LogMeal));
    await act(async () => {
      renderer.root.findAll((node) => node.type === 'input')[0].props.onChangeText('Lunch');
    });
    const press = button(renderer, 'Parse').props.onPress;
    let request!: Promise<void>;
    await act(async () => {
      request = press();
      void press();
    });
    expect(mocks.extract).toHaveBeenCalledTimes(1);
    await act(async () => {
      button(renderer, 'Cancel').props.onPress();
    });
    await act(async () => {
      pending.resolve(extraction);
      await request;
    });
    expect(renderer.root.findAllByType(VerificationScreen)).toHaveLength(0);
    expect(mocks.back).toHaveBeenCalledTimes(1);
  });
  it('ignores parse errors after the modal is dismissed', async () => {
    const pending = deferred<typeof extraction>();
    mocks.extract.mockReturnValue(pending.promise);
    const renderer = await render(createElement(LogMeal));
    await act(async () => {
      renderer.root.findAll((node) => node.type === 'input')[0].props.onChangeText('Lunch');
    });
    let request!: Promise<void>;
    await act(async () => {
      request = button(renderer, 'Parse').props.onPress();
    });
    await act(async () => {
      button(renderer, 'Cancel').props.onPress();
    });
    expect(mocks.back).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.reject(new Error('network failed'));
      await request;
    });
    expect(mocks.alert).not.toHaveBeenCalled();
  });
});
