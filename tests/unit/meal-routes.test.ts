import { createElement, type ComponentType } from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LogMeal from '../../app/modals/log-meal';
import EditMeal from '../../app/modals/edit-meal';
import { MealItem } from '../../components/today/MealItem';
import { AIError } from '../../lib/ai/client';
import type { DailyLog } from '../../lib/supabase/queries';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  add: vi.fn(),
  extract: vi.fn(),
  getById: vi.fn(),
  update: vi.fn(),
  alert: vi.fn(),
  id: 'meal-id' as string | string[] | undefined,
  user: { id: 'alice' } as { id: string } | null,
}));
vi.mock('react-native', () => ({
  View: 'div',
  ScrollView: 'section',
  ActivityIndicator: 'progress',
  Pressable: 'button',
  Alert: { alert: mocks.alert },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('expo-router', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
  useLocalSearchParams: () => ({ id: mocks.id }),
}));
vi.mock('../../hooks/use-daily-logs', () => ({ useDailyLogs: () => ({ add: mocks.add }) }));
vi.mock('../../hooks/use-auth', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('../../lib/supabase/queries', () => ({
  dailyLogQueries: { getById: mocks.getById, update: mocks.update },
}));
vi.mock('../../lib/ai/calls/extract-meal', () => ({ extractMeal: mocks.extract }));
vi.mock('../../lib/ai/client', () => ({
  AIError: class AIError extends Error {
    constructor(
      message: string,
      public kind: string,
    ) {
      super(message);
    }
  },
}));
vi.mock('../../components/ui/text', () => ({ Text: 'span' }));
vi.mock('../../components/ui/input', () => ({ Input: 'input' }));
vi.mock('../../components/ui/button', () => ({ Button: 'button' }));
vi.mock('../../components/ui/card', () => ({ Card: 'article' }));
vi.mock('../../components/logging/VoiceRecorder', () => ({ VoiceRecorder: 'aside' }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const renderers: ReactTestRenderer[] = [];
const existing: DailyLog = {
  id: 'meal-id',
  user_id: 'alice',
  name: 'Old lunch',
  calories: 500,
  protein_g: 30,
  carbs_g: 40,
  fat_g: 10,
  logged_at: '2026-09-01T19:00:00Z',
  source: 'voice',
  raw_input: 'original transcript',
  recipe_id: 'recipe-id',
};
const extraction = {
  name: 'Soup',
  calories: 200,
  protein_g: 10,
  carbs_g: 20,
  fat_g: 5,
  confidence: 'medium',
  notes: 'One bowl assumed.',
};
function text(node: ReactTestInstance): string {
  return node.children.map((child) => (typeof child === 'string' ? child : text(child))).join('');
}
async function renderScreen(Screen: ComponentType) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Screen));
  });
  renderers.push(renderer);
  return {
    get root() {
      return renderer.root;
    },
    inputs() {
      return renderer.root.findAll((node) => node.type === 'input');
    },
    button(label: string) {
      return renderer.root.find((node) => node.type === 'button' && text(node) === label);
    },
    async press(label: string) {
      await act(async () => {
        await this.button(label).props.onPress();
      });
    },
    async fill(values: string[]) {
      await act(async () => {
        values.forEach((value, index) => this.inputs()[index].props.onChangeText(value));
      });
    },
    async rerender() {
      await act(async () => {
        renderer.update(createElement(Screen));
      });
    },
    async unmount() {
      await act(async () => {
        renderer.unmount();
      });
    },
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.id = 'meal-id';
  mocks.user = { id: 'alice' };
  mocks.add.mockResolvedValue({ id: 'saved' });
  mocks.extract.mockResolvedValue(extraction);
  mocks.getById.mockResolvedValue(existing);
  mocks.update.mockResolvedValue(existing);
});
afterEach(async () => {
  await act(async () => {
    renderers.splice(0).forEach((renderer) => renderer.unmount());
  });
});

describe('manual and AI logging routes', () => {
  it('logs manually without calling AI, preserving entered nutrition and marking the source', async () => {
    const screen = await renderScreen(LogMeal);
    await screen.fill(['Rice and beans']);
    await screen.press('Enter manually');
    expect(text(screen.root)).not.toContain('Confidence:');
    expect(screen.inputs()[0].props.value).toBe('Rice and beans');
    await screen.fill(['Rice and beans', '450', '21', '65', '10']);
    await screen.press('Save');
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(mocks.add).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        name: 'Rice and beans',
        calories: 450,
        protein_g: 21,
        carbs_g: 65,
        fat_g: 10,
        source: 'manual',
        raw_input: 'Rice and beans',
        recipe_id: null,
      }),
    );
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('rejects decimal nutrition without discarding the editable manual draft', async () => {
    const screen = await renderScreen(LogMeal);
    await screen.press('Enter manually');
    await screen.fill(['Lunch', '450', '20.5', '65', '10']);
    await screen.press('Save');
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.extract).not.toHaveBeenCalled();
    expect(text(screen.root)).toContain('Protein must be a whole number');
    expect(screen.inputs()[2].props.value).toBe('20.5');
  });

  it('offers manual entry after AI failure and preserves the original description on cancel', async () => {
    mocks.extract.mockRejectedValue(new AIError('Add an API key or enter manually.', 'no_key'));
    const screen = await renderScreen(LogMeal);
    await screen.fill(['My lunch']);
    await screen.press('Parse');
    expect(text(screen.root)).toContain('Add an API key or enter manually.');
    expect(screen.inputs()[0].props.value).toBe('My lunch');
    await screen.press('Enter manually');
    await screen.press('Cancel');
    expect(screen.inputs()[0].props.value).toBe('My lunch');
    expect(mocks.add).not.toHaveBeenCalled();
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it('preserves a failed manual save draft and allows retry without duplicate submissions', async () => {
    const screen = await renderScreen(LogMeal);
    await screen.press('Enter manually');
    await screen.fill(['Lunch', '500', '30', '40', '10']);
    const write = deferred<unknown>();
    mocks.add.mockReturnValueOnce(write.promise);
    const save = screen.button('Save').props.onPress;
    let pending!: Promise<void>;
    await act(async () => {
      pending = save();
      void save();
    });
    expect(mocks.add).toHaveBeenCalledOnce();
    await act(async () => {
      write.reject(new Error('Offline'));
      await pending;
    });
    expect(mocks.back).not.toHaveBeenCalled();
    expect(screen.inputs().map((node) => node.props.value)).toEqual([
      'Lunch',
      '500',
      '30',
      '40',
      '10',
    ]);
    expect(mocks.alert).toHaveBeenCalledWith('Save failed', expect.stringContaining('Offline'));
    await screen.press('Save');
    expect(mocks.add).toHaveBeenCalledTimes(2);
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('uses replacement estimates after re-parsing and never saves before confirmation', async () => {
    const screen = await renderScreen(LogMeal);
    await screen.fill(['Soup']);
    await screen.press('Parse');
    expect(mocks.add).not.toHaveBeenCalled();
    mocks.extract.mockResolvedValue({ ...extraction, name: 'Two bowls', calories: 400 });
    await act(async () => {
      screen.inputs()[5].props.onChangeText('Two bowls');
    });
    await screen.press('Re-parse');
    expect(screen.inputs()[0].props.value).toBe('Two bowls');
    expect(screen.inputs()[1].props.value).toBe('400');
    await screen.press('Save');
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Two bowls',
        calories: 400,
        source: 'text',
        raw_input: 'Soup',
      }),
    );
  });

  it('keeps a voice transcript when canceling verification and saves the voice source', async () => {
    const screen = await renderScreen(LogMeal);
    await screen.press('Voice');
    const recorder = () => screen.root.find((node) => node.type === 'aside');
    await act(async () => {
      recorder().props.onTranscriptChange('Voice soup');
    });
    await act(async () => {
      await recorder().props.onParse('Voice soup');
    });
    await screen.press('Cancel');
    expect(recorder().props.initialTranscript).toBe('Voice soup');
    await act(async () => {
      await recorder().props.onParse('Voice soup');
    });
    await screen.press('Save');
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'voice', raw_input: 'Voice soup' }),
    );
  });

  it('ignores parse or save completion after leaving the route', async () => {
    const parse = deferred<unknown>();
    mocks.extract.mockReturnValueOnce(parse.promise);
    const first = await renderScreen(LogMeal);
    await first.fill(['Lunch']);
    let parsing!: Promise<void>;
    await act(async () => {
      parsing = first.button('Parse').props.onPress();
    });
    await first.unmount();
    await act(async () => {
      parse.resolve(extraction);
      await parsing;
    });
    expect(mocks.back).not.toHaveBeenCalled();
    expect(mocks.add).not.toHaveBeenCalled();

    const write = deferred<unknown>();
    mocks.add.mockReturnValueOnce(write.promise);
    const second = await renderScreen(LogMeal);
    await second.press('Enter manually');
    await second.fill(['Lunch', '500', '30', '40', '10']);
    let saving!: Promise<void>;
    await act(async () => {
      saving = second.button('Save').props.onPress();
    });
    await second.unmount();
    await act(async () => {
      write.resolve({ id: 'saved' });
      await saving;
    });
    expect(mocks.back).not.toHaveBeenCalled();
  });
  it('preserves a voice description after AI failure and opens manual entry with it', async () => {
    mocks.extract.mockRejectedValueOnce(new AIError('Network unavailable.', 'network'));
    const screen = await renderScreen(LogMeal);
    await screen.press('Voice');
    const recorder = () => screen.root.find((node) => node.type === 'aside');
    await act(async () => {
      recorder().props.onTranscriptChange('Voice lunch');
      await recorder().props.onParse('Voice lunch');
    });
    expect(recorder().props.initialTranscript).toBe('Voice lunch');
    expect(text(screen.root)).toContain('Network unavailable.');
    await screen.press('Enter manually');
    expect(screen.inputs()[0].props.value).toBe('Voice lunch');
    await screen.fill(['Voice lunch', '500', '30', '40', '10']);
    await screen.press('Save');
    expect(mocks.add).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'manual', raw_input: 'Voice lunch' }),
    );
  });
});

describe('existing meal editing', () => {
  it('loads by signed-in owner and updates only nutrition/name, preserving historical metadata', async () => {
    const screen = await renderScreen(EditMeal);
    expect(mocks.getById).toHaveBeenCalledExactlyOnceWith('alice', 'meal-id');
    expect(text(screen.root)).toContain('Editing keeps this date.');
    expect(text(screen.root)).not.toContain('Confidence:');
    await screen.fill(['Corrected lunch', '600', '40', '55', '12']);
    await screen.press('Save');
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith(
      'meal-id',
      {
        name: 'Corrected lunch',
        calories: 600,
        protein_g: 40,
        carbs_g: 55,
        fat_g: 12,
      },
      'alice',
    );
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it('keeps edits after failed save and cancels without writing again', async () => {
    mocks.update.mockRejectedValueOnce(new Error('Offline'));
    const screen = await renderScreen(EditMeal);
    await screen.fill(['Unsaved edit', '600', '40', '55', '12']);
    await screen.press('Save');
    expect(screen.inputs().map((node) => node.props.value)).toEqual([
      'Unsaved edit',
      '600',
      '40',
      '55',
      '12',
    ]);
    expect(mocks.back).not.toHaveBeenCalled();
    await screen.press('Cancel');
    expect(mocks.update).toHaveBeenCalledOnce();
    expect(mocks.back).toHaveBeenCalledOnce();
  });

  it.each([undefined, ['meal-id', 'other']])(
    'rejects missing or ambiguous route id %s',
    async (id) => {
      mocks.id = id;
      const screen = await renderScreen(EditMeal);
      expect(mocks.getById).not.toHaveBeenCalled();
      expect(screen.inputs()).toHaveLength(0);
      expect(text(screen.root)).toContain('No meal was selected.');
    },
  );

  it('does not query or expose an edit form without a signed-in owner', async () => {
    mocks.user = null;
    const screen = await renderScreen(EditMeal);
    expect(mocks.getById).not.toHaveBeenCalled();
    expect(screen.inputs()).toHaveLength(0);
    expect(text(screen.root)).toContain('Sign in to edit a meal.');
  });

  it('does not expose an edit form for missing/foreign meals and allows read retries', async () => {
    mocks.getById.mockResolvedValueOnce(null);
    const screen = await renderScreen(EditMeal);
    expect(screen.inputs()).toHaveLength(0);
    expect(text(screen.root)).toContain('This meal was not found.');
    await screen.press('Retry');
    expect(screen.inputs()[0].props.value).toBe('Old lunch');
  });

  it('reports a failed read and retries without revealing an edit form', async () => {
    mocks.getById.mockRejectedValueOnce(new Error('Connection unavailable'));
    const screen = await renderScreen(EditMeal);
    expect(screen.inputs()).toHaveLength(0);
    expect(text(screen.root)).toContain('Connection unavailable');
    await screen.press('Retry');
    expect(screen.inputs()[0].props.value).toBe('Old lunch');
    expect(mocks.getById).toHaveBeenCalledTimes(2);
  });

  it('prevents duplicate edits and ignores save completion after changing owner', async () => {
    const write = deferred<unknown>();
    mocks.update.mockReturnValueOnce(write.promise);
    const screen = await renderScreen(EditMeal);
    const save = screen.button('Save').props.onPress;
    let pending!: Promise<void>;
    await act(async () => {
      pending = save();
      void save();
    });
    expect(mocks.update).toHaveBeenCalledOnce();
    mocks.user = { id: 'bob' };
    mocks.getById.mockResolvedValueOnce(null);
    await screen.rerender();
    await act(async () => {
      write.resolve(existing);
      await pending;
    });
    expect(mocks.back).not.toHaveBeenCalled();
    expect(screen.inputs()).toHaveLength(0);
  });

  it('does not navigate when a save finishes after unmount', async () => {
    const write = deferred<unknown>();
    mocks.update.mockReturnValueOnce(write.promise);
    const screen = await renderScreen(EditMeal);
    let pending!: Promise<void>;
    await act(async () => {
      pending = screen.button('Save').props.onPress();
    });
    await screen.unmount();
    await act(async () => {
      write.resolve(existing);
      await pending;
    });
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it('discards a previous owner read when the signed-in owner changes', async () => {
    const old = deferred<DailyLog>();
    mocks.getById.mockReturnValueOnce(old.promise);
    const screen = await renderScreen(EditMeal);
    mocks.user = { id: 'bob' };
    mocks.getById.mockResolvedValueOnce(null);
    await screen.rerender();
    await act(async () => {
      old.resolve(existing);
    });
    expect(screen.inputs()).toHaveLength(0);
    expect(mocks.getById).toHaveBeenLastCalledWith('bob', 'meal-id');
  });

  it('opens the reusable edit route from a meal row', async () => {
    const Row = () => createElement(MealItem, { ...existing, onDelete: vi.fn() });
    const screen = await renderScreen(Row);
    await screen.press('Edit');
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith({
      pathname: '/modals/edit-meal',
      params: { id: 'meal-id' },
    });
  });
});
