import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inventoryQueries } from '../../lib/supabase/queries';
import {
  normalizeInventoryName,
  validateInventoryCategory,
} from '../../lib/utils/inventory-validation';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  result: { data: null as unknown, error: null as unknown },
  chain: {} as Record<string, ReturnType<typeof vi.fn>>,
}));
vi.mock('../../lib/supabase/client', () => ({ supabase: { from: mocks.from } }));
beforeEach(() => {
  mocks.result = { data: { id: 'row' }, error: null };
  mocks.chain = {};
  for (const method of ['insert', 'update', 'delete', 'eq', 'select', 'order']) {
    mocks.chain[method] = vi.fn(() => mocks.chain);
  }
  mocks.chain.single = vi.fn(async () => mocks.result);
  mocks.from.mockReset().mockReturnValue(mocks.chain);
});

describe('inventory queries and validation', () => {
  it('normalizes pasted ingredient whitespace, retains casing, and rejects blank names', () => {
    expect(normalizeInventoryName('  Green \n onions\t')).toBe('Green onions');
    expect(() => normalizeInventoryName(' \t\n ')).toThrow('ingredient name');
    expect(validateInventoryCategory(null)).toBeNull();
    expect(() => validateInventoryCategory('unknown')).toThrow('Choose');
  });
  it('validates before sending an insert and defaults stock in the database', async () => {
    await inventoryQueries.add('alice', ' Green  onions ', 'produce');
    expect(mocks.chain.insert).toHaveBeenCalledWith({
      user_id: 'alice',
      name: 'Green onions',
      category: 'produce',
    });
    await expect(inventoryQueries.add('alice', ' ', 'other')).rejects.toThrow('ingredient name');
    expect(mocks.chain.insert).toHaveBeenCalledTimes(1);
  });
  it('scopes edits to both owner and row without replacing stock status', async () => {
    await inventoryQueries.update('row', { name: ' Red  onion ', category: 'produce' }, 'alice');
    expect(mocks.chain.update).toHaveBeenCalledWith({ name: 'Red onion', category: 'produce' });
    expect(mocks.chain.eq.mock.calls).toEqual([
      ['id', 'row'],
      ['user_id', 'alice'],
    ]);
    expect(mocks.chain.single).toHaveBeenCalledOnce();
  });
  it('toggles only stock status and reports an invisible/missing row as a failure', async () => {
    mocks.result.error = { code: 'PGRST116', message: 'No rows returned' };
    await expect(inventoryQueries.setStock('row', false, 'alice')).rejects.toMatchObject({
      code: 'PGRST116',
    });
    expect(mocks.chain.update).toHaveBeenCalledWith({ in_stock: false });
    expect(mocks.chain.eq.mock.calls).toEqual([
      ['id', 'row'],
      ['user_id', 'alice'],
    ]);
  });
  it('provides restock guidance for duplicate creates and renames but preserves other errors', async () => {
    mocks.result.error = { code: '23505', message: 'duplicate key' };
    await expect(inventoryQueries.add('alice', 'Eggs', 'protein')).rejects.toThrow('restock');
    await expect(
      inventoryQueries.update('row', { name: 'Eggs', category: 'protein' }, 'alice'),
    ).rejects.toThrow('already exists');
    mocks.result.error = { code: 'PGRST116', message: 'No rows returned' };
    await expect(
      inventoryQueries.update('row', { name: 'Eggs', category: 'protein' }, 'alice'),
    ).rejects.toThrow('No rows returned');
  });
});
