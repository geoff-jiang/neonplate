import { createElement, StrictMode } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InventoryRow } from '../../components/inventory/InventoryRow';
import { AddItemForm } from '../../components/inventory/AddItemForm';
const mocks = vi.hoisted(() => ({ alert: vi.fn() }));
vi.mock('react-native', () => ({
  View: 'div',
  Switch: 'switch',
  Modal: 'modal',
  Pressable: 'press',
  Alert: { alert: mocks.alert },
}));
vi.mock('../../components/ui/text', () => ({ Text: 'span' }));
vi.mock('../../components/ui/input', () => ({ Input: 'input' }));
vi.mock('../../components/ui/button', () => ({ Button: 'button' }));
vi.mock('../../components/ui/ConfirmDialog', () => ({ ConfirmDialog: 'dialog' }));
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const item = {
  id: 'rice',
  user_id: 'user',
  name: 'Rice',
  category: 'staple',
  in_stock: true,
  created_at: '2026-10-06',
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
  return renderer.root.find((node) => node.type === 'button' && node.props.children === label);
}
beforeEach(() => vi.clearAllMocks());
afterEach(async () => {
  await act(async () => renderers.splice(0).forEach((r) => r.unmount()));
});
it('keeps stock unchanged on failure, prevents duplicate requests, and allows retry', async () => {
  let reject!: (error: Error) => void;
  const setStock = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((_, fail) => {
          reject = fail;
        }),
    )
    .mockResolvedValue(undefined);
  const renderer = await render(
    createElement(InventoryRow, { item, onRemove: vi.fn(), onEdit: vi.fn(), onSetStock: setStock }),
  );
  await act(async () => {
    renderer.root.findByType('switch').props.onValueChange(false);
    renderer.root.findByType('switch').props.onValueChange(false);
  });
  expect(setStock).toHaveBeenCalledExactlyOnceWith('rice', false);
  expect(renderer.root.findByType('switch').props.disabled).toBe(true);
  await act(async () => reject(new Error('Connection lost')));
  expect(renderer.root.findByType('switch').props.value).toBe(true);
  expect(mocks.alert).toHaveBeenCalledWith('Stock change failed', 'Connection lost');
  await act(async () => renderer.root.findByType('switch').props.onValueChange(false));
  expect(setStock).toHaveBeenCalledTimes(2);
  await act(async () =>
    renderer.update(
      createElement(InventoryRow, {
        item: { ...item, in_stock: false },
        onRemove: vi.fn(),
        onEdit: vi.fn(),
        onSetStock: setStock,
      }),
    ),
  );
  expect(renderer.root.findByType('switch').props.value).toBe(false);
  expect(JSON.stringify(renderer.toJSON())).toContain('Out of stock');
});
it('separates edit from permanent deletion and keeps failed delete confirmation open', async () => {
  const edit = vi.fn();
  const remove = vi
    .fn()
    .mockRejectedValueOnce(new Error('Delete unavailable'))
    .mockResolvedValue(undefined);
  const renderer = await render(
    createElement(InventoryRow, { item, onRemove: remove, onEdit: edit, onSetStock: vi.fn() }),
  );
  await act(async () => button(renderer, 'Edit').props.onPress());
  expect(edit).toHaveBeenCalledWith(item);
  expect(remove).not.toHaveBeenCalled();
  await act(async () => button(renderer, 'Delete').props.onPress());
  expect(renderer.root.findByType('dialog').props.message).toContain('out of stock instead');
  await act(async () => renderer.root.findByType('dialog').props.onConfirm());
  expect(renderer.root.findByType('dialog').props.visible).toBe(true);
  expect(mocks.alert).toHaveBeenCalledWith('Delete failed', 'Delete unavailable');
  await act(async () => renderer.root.findByType('dialog').props.onConfirm());
  expect(renderer.root.findByType('dialog').props.visible).toBe(false);
});
it('keeps edited name/category after duplicate failure and retries the same draft', async () => {
  const update = vi
    .fn()
    .mockRejectedValueOnce(new Error('An ingredient with this name already exists.'))
    .mockResolvedValue(undefined);
  const close = vi.fn();
  const add = vi.fn();
  const renderer = await render(
    createElement(AddItemForm, {
      visible: true,
      item,
      onClose: close,
      onAdd: add,
      onUpdate: update,
    }),
  );
  expect(renderer.root.findByType('input').props.value).toBe('Rice');
  await act(async () => {
    renderer.root.findByType('input').props.onChangeText('Wild rice');
    renderer.root.findAll((node) => node.props.accessibilityRole === 'radio')[1].props.onPress();
  });
  await act(async () => button(renderer, 'Save').props.onPress());
  expect(close).not.toHaveBeenCalled();
  expect(renderer.root.findByType('input').props.value).toBe('Wild rice');
  expect(JSON.stringify(renderer.toJSON())).toContain('already exists');
  await act(async () => button(renderer, 'Save').props.onPress());
  expect(update).toHaveBeenLastCalledWith('rice', { name: 'Wild rice', category: 'produce' });
  expect(close).toHaveBeenCalledOnce();
  expect(add).not.toHaveBeenCalled();
});
it('blocks duplicate form submissions and cancel while pending; late completion cannot close a new screen', async () => {
  let resolve!: () => void;
  const add = vi.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done;
      }),
  );
  const close = vi.fn();
  const renderer = await render(
    createElement(AddItemForm, { visible: true, onClose: close, onAdd: add, onUpdate: vi.fn() }),
  );
  await act(async () => renderer.root.findByType('input').props.onChangeText('Eggs'));
  await act(async () => {
    button(renderer, 'Add').props.onPress();
    button(renderer, 'Add').props.onPress();
    button(renderer, 'Cancel').props.onPress();
  });
  expect(add).toHaveBeenCalledOnce();
  expect(close).not.toHaveBeenCalled();
  await act(async () => renderer.unmount());
  await act(async () => resolve());
  expect(close).not.toHaveBeenCalled();
});
it('preserves the Other category when editing a legacy uncategorized ingredient', async () => {
  const update = vi.fn().mockResolvedValue(undefined);
  const renderer = await render(
    createElement(AddItemForm, {
      visible: true,
      item: { ...item, category: null },
      onClose: vi.fn(),
      onAdd: vi.fn(),
      onUpdate: update,
    }),
  );
  await act(async () => button(renderer, 'Save').props.onPress());
  expect(update).toHaveBeenCalledWith('rice', { name: 'Rice', category: 'other' });
});

it('completes a save after StrictMode repeats effect setup and cleanup', async () => {
  const close = vi.fn();
  const renderer = await render(
    createElement(
      StrictMode,
      null,
      createElement(AddItemForm, {
        visible: true,
        onClose: close,
        onAdd: vi.fn().mockResolvedValue(undefined),
        onUpdate: vi.fn(),
      }),
    ),
  );
  await act(async () => renderer.root.findByType('input').props.onChangeText('Eggs'));
  await act(async () => button(renderer, 'Add').props.onPress());
  expect(close).toHaveBeenCalledOnce();
});
