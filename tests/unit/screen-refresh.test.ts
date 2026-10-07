import { createElement, type ComponentType } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Today from '../../app/(app)/today';
import Inventory from '../../app/(app)/inventory';
import type { DailyLog, InventoryItem } from '../../lib/supabase/queries';

const mocks = vi.hoisted(() => ({
  isTablet: false,
  dailyLogs: vi.fn(),
  inventory: vi.fn(),
  reload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('expo-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('react-native', () => ({
  View: 'View',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'progress',
  Alert: { alert: vi.fn() },
}));
vi.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
vi.mock('../../hooks/use-breakpoint', () => ({
  useBreakpoint: () => ({ isTablet: mocks.isTablet }),
}));
vi.mock('../../hooks/use-daily-logs', () => ({ useDailyLogs: mocks.dailyLogs }));
vi.mock('../../hooks/use-inventory', () => ({ useInventory: mocks.inventory }));
vi.mock('../../hooks/use-settings', () => ({
  useSettings: () => ({ settings: {}, loading: false, error: null, reload: vi.fn() }),
}));
vi.mock('../../components/ui/text', () => ({ Text: 'span' }));
vi.mock('../../components/ui/button', () => ({ Button: 'button' }));
vi.mock('../../components/ui/card', () => ({ Card: 'Card' }));
vi.mock('../../components/ui/ConfirmDialog', () => ({ ConfirmDialog: 'dialog' }));
vi.mock('../../components/today/TodayHeader', () => ({ TodayHeader: 'TodayHeader' }));
vi.mock('../../components/today/TodayMacros', () => ({ TodayMacros: 'TodayMacros' }));
vi.mock('../../components/today/TodayActions', () => ({ TodayActions: 'TodayActions' }));
vi.mock('../../components/inventory/InventoryHeader', () => ({
  InventoryHeader: 'InventoryHeader',
}));
vi.mock('../../components/inventory/AddItemForm', () => ({ AddItemForm: 'AddItemForm' }));

// Keep the screen, lists, rows, and their dialog state real. Only native primitives,
// backend hooks, and unrelated header/form components are replaced for Node rendering.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const renderers: ReactTestRenderer[] = [];
const log: DailyLog = {
  id: 'meal',
  user_id: 'user',
  recipe_id: null,
  name: 'Lunch',
  calories: 500,
  protein_g: 30,
  carbs_g: 50,
  fat_g: 20,
  source: 'text',
  raw_input: null,
  logged_at: '2026-09-18T12:00:00Z',
};
const ingredient: InventoryItem = {
  id: 'ingredient',
  user_id: 'user',
  name: 'Rice',
  category: 'staple',
  created_at: '2026-09-18T12:00:00Z',
};
const cases = [
  {
    name: 'Today',
    Screen: Today,
    hook: mocks.dailyLogs,
    dataKey: 'logs',
    loaded: [log],
    action: 'Delete',
    empty: 'No meals logged yet today.',
  },
  {
    name: 'Inventory',
    Screen: Inventory,
    hook: mocks.inventory,
    dataKey: 'items',
    loaded: [ingredient],
    action: 'Remove',
    empty: 'Your pantry is empty.',
  },
];
async function renderScreen(Screen: ComponentType) {
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(createElement(Screen));
  });
  renderers.push(renderer);
  return {
    root: renderer.root,
    async rerender() {
      await act(async () => {
        renderer.update(createElement(Screen));
      });
    },
    text() {
      return renderer.root
        .findAll((node) => node.type === 'span')
        .flatMap((node) => node.children)
        .join(' ');
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.remove.mockResolvedValue(undefined);
  mocks.reload.mockResolvedValue(undefined);
});
afterEach(async () => {
  await act(async () => {
    renderers.splice(0).forEach((renderer) => renderer.unmount());
  });
});

for (const isTablet of [false, true]) {
  describe(`${isTablet ? 'tablet' : 'phone'} screen refresh`, () => {
    for (const scenario of cases) {
      it(`${scenario.name} preserves an open deletion dialog while refreshing and after a refresh failure`, async () => {
        mocks.isTablet = isTablet;
        const state = {
          [scenario.dataKey]: scenario.loaded,
          loading: false,
          error: null as Error | null,
          reload: mocks.reload,
          remove: mocks.remove,
          add: vi.fn(),
        };
        scenario.hook.mockImplementation(() => state);
        const screen = await renderScreen(scenario.Screen);
        const removeButton = screen.root.find(
          (node) => node.type === 'button' && node.props.children === scenario.action,
        );
        await act(async () => {
          removeButton.props.onPress();
        });
        const dialog = () => screen.root.find((node) => node.type === 'dialog');
        expect(dialog().props.visible).toBe(true);

        state.loading = true;
        await screen.rerender();
        expect(dialog().props.visible).toBe(true);
        expect(screen.root.findAll((node) => node.type === 'progress')).toHaveLength(1);

        state.loading = false;
        state.error = new Error('Connection lost. Please retry.');
        await screen.rerender();
        expect(dialog().props.visible).toBe(true);
        expect(screen.text()).toContain('Connection lost. Please retry.');
        const retry = screen.root.find(
          (node) => node.type === 'button' && node.props.children === 'Retry',
        );
        await act(async () => {
          retry.props.onPress();
        });
        expect(mocks.reload).toHaveBeenCalledOnce();

        state.error = null;
        await screen.rerender();
        expect(dialog().props.visible).toBe(true);
        await act(async () => {
          await dialog().props.onConfirm();
        });
        expect(mocks.remove).toHaveBeenCalledExactlyOnceWith(scenario.loaded[0].id);
        expect(dialog().props.visible).toBe(false);
      });

      it(`${scenario.name} only shows an empty state after a successful initial load`, async () => {
        mocks.isTablet = isTablet;
        const state = {
          [scenario.dataKey]: [],
          loading: true,
          error: null as Error | null,
          reload: mocks.reload,
          remove: mocks.remove,
          add: vi.fn(),
        };
        scenario.hook.mockImplementation(() => state);
        const screen = await renderScreen(scenario.Screen);
        expect(screen.text()).not.toContain(scenario.empty);
        expect(screen.root.findAll((node) => node.type === 'progress')).toHaveLength(1);

        state.loading = false;
        state.error = new Error('Initial load failed');
        await screen.rerender();
        expect(screen.text()).not.toContain(scenario.empty);
        expect(screen.text()).toContain('Initial load failed');

        state.error = null;
        await screen.rerender();
        expect(screen.text()).toContain(scenario.empty);
      });
    }
  });
}
