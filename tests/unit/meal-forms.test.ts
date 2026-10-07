import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VerificationScreen } from '../../components/logging/VerificationScreen';
import { SettingsForm } from '../../components/settings/SettingsForm';
import Settings from '../../app/(app)/settings';
const mocks = vi.hoisted(() => ({
  save: vi.fn(),
  getKey: vi.fn(),
  setKey: vi.fn(),
  alert: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('react-native', () => ({
  View: 'div',
  ScrollView: 'section',
  Alert: { alert: mocks.alert },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'main' }));
vi.mock('../../components/ui/text', () => ({ Text: 'span' }));
vi.mock('../../components/ui/input', () => ({ Input: 'input' }));
vi.mock('../../components/ui/button', () => ({ Button: 'button' }));
vi.mock('../../components/ui/card', () => ({ Card: 'article' }));
vi.mock('../../components/ui/load-status', () => ({ LoadStatus: () => null }));
vi.mock('../../lib/auth/secure-storage', () => ({
  getOpenRouterKey: mocks.getKey,
  setOpenRouterKey: mocks.setKey,
}));
vi.mock('../../hooks/use-auth', () => ({ useAuth: () => ({ signOut: mocks.signOut }) }));
const targets = { daily_calories: 2000, daily_protein_g: 150, daily_carbs_g: 200, daily_fat_g: 65 };
vi.mock('../../hooks/use-settings', () => ({
  useSettings: () => ({
    settings: targets,
    save: mocks.save,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const extraction = {
  name: 'Lunch',
  calories: 400,
  protein_g: 30,
  carbs_g: 40,
  fat_g: 12,
  confidence: 'high' as const,
  notes: 'Assumes one bowl.',
};
const renderers: ReactTestRenderer[] = [];
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
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getKey.mockResolvedValue('stored-test-key');
  mocks.save.mockResolvedValue(undefined);
  mocks.setKey.mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(async () => {
    renderers.splice(0).forEach((renderer) => renderer.unmount());
  });
});

describe('meal verification form', () => {
  it('keeps empty numeric input editable and prevents saving until corrected', async () => {
    const confirm = vi.fn();
    const renderer = await render(
      createElement(VerificationScreen, { extraction, onConfirm: confirm, onCancel: vi.fn() }),
    );
    await act(async () => renderer.root.findAllByType('input')[1].props.onChangeText(''));
    expect(renderer.root.findAllByType('input')[1].props.value).toBe('');
    await act(async () => button(renderer, 'Save').props.onPress());
    expect(confirm).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain('Enter calories');
    await act(async () => renderer.root.findAllByType('input')[1].props.onChangeText('350'));
    await act(async () => button(renderer, 'Save').props.onPress());
    expect(confirm).toHaveBeenCalledWith({
      name: 'Lunch',
      calories: 350,
      protein_g: 30,
      carbs_g: 40,
      fat_g: 12,
    });
  });
  it('replaces edited draft values when a new extraction arrives, including identical estimates', async () => {
    const confirm = vi.fn();
    const cancel = vi.fn();
    const renderer = await render(
      createElement(VerificationScreen, { extraction, onConfirm: confirm, onCancel: cancel }),
    );
    await act(async () => renderer.root.findAllByType('input')[1].props.onChangeText('999'));
    await act(async () =>
      renderer.update(
        createElement(VerificationScreen, {
          extraction: { ...extraction },
          onConfirm: confirm,
          onCancel: cancel,
        }),
      ),
    );
    expect(renderer.root.findAllByType('input')[1].props.value).toBe('400');
    await act(async () => button(renderer, 'Save').props.onPress());
    expect(confirm.mock.calls[0][0].calories).toBe(400);
  });
  it('labels AI estimates and assumptions, while manual/edit modes omit fabricated confidence', async () => {
    const props = { extraction, onConfirm: vi.fn(), onCancel: vi.fn() };
    const renderer = await render(createElement(VerificationScreen, props));
    expect(JSON.stringify(renderer.toJSON())).toContain('AI nutrition is an estimate');
    expect(JSON.stringify(renderer.toJSON())).toContain('Assumes one bowl');
    for (const mode of ['manual', 'edit'] as const) {
      await act(async () => renderer.update(createElement(VerificationScreen, { ...props, mode })));
      expect(JSON.stringify(renderer.toJSON())).not.toContain('AI confidence');
    }
  });
});

describe('settings form validation', () => {
  it('preserves a blank target and validates before saving settings or an API key', async () => {
    const renderer = await render(createElement(Settings));
    await act(async () =>
      renderer.root.findByType(SettingsForm).props.onUpdateField('daily_calories', ''),
    );
    expect(renderer.root.findByType(SettingsForm).props.draft.daily_calories).toBe('');
    await act(async () => renderer.root.findByType(SettingsForm).props.onSave());
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.setKey).not.toHaveBeenCalled();
    expect(renderer.root.findByType(SettingsForm).props.validationError).toContain(
      'daily calories',
    );
  });
  it('saves validated integers and accepts zero macro targets', async () => {
    const renderer = await render(createElement(Settings));
    await act(async () => {
      renderer.root.findByType(SettingsForm).props.onUpdateField('daily_calories', '2500');
      renderer.root.findByType(SettingsForm).props.onUpdateField('daily_fat_g', '0');
    });
    await act(async () => renderer.root.findByType(SettingsForm).props.onSave());
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({
      ...targets,
      daily_calories: 2500,
      daily_fat_g: 0,
    });
  });
});
