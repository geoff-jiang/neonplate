// tests/unit/inventory-grouping.test.ts
import { describe, it, expect } from 'vitest';
import {
  groupByCategory,
  CATEGORY_ORDER,
  getAvailableIngredientNames,
} from '../../lib/utils/inventory-grouping';
import type { InventoryItem } from '../../lib/supabase/queries';

function item(name: string, category: string | null, inStock = true): InventoryItem {
  return {
    id: name,
    user_id: 'u',
    name,
    category,
    in_stock: inStock,
    created_at: new Date().toISOString(),
  };
}

describe('groupByCategory', () => {
  it('returns groups in canonical order', () => {
    const items = [
      item('Eggs', 'protein'),
      item('Spinach', 'produce'),
      item('Salt', 'staple'),
      item('Weird Thing', null),
    ];
    const groups = groupByCategory(items);
    expect(groups.map((g) => g.category)).toEqual(['protein', 'produce', 'staple', 'other']);
  });

  it('puts null-category items in other', () => {
    const items = [item('X', null)];
    const groups = groupByCategory(items);
    expect(groups[0].category).toBe('other');
    expect(groups[0].items).toHaveLength(1);
  });

  it('omits categories with zero items', () => {
    const items = [item('Eggs', 'protein')];
    const groups = groupByCategory(items);
    expect(groups).toHaveLength(1);
    expect(groups[0].category).toBe('protein');
  });

  it('sorts items alphabetically within a category', () => {
    const items = [item('Zucchini', 'produce'), item('Apple', 'produce')];
    const groups = groupByCategory(items);
    expect(groups[0].items.map((i) => i.name)).toEqual(['Apple', 'Zucchini']);
  });

  it('keeps out-of-stock items but sorts available items before them without mutating the input', () => {
    const items = [
      item('Apple', 'produce', false),
      item('Zucchini', 'produce'),
      item('Broccoli', 'produce'),
    ];
    expect(groupByCategory(items)[0].items.map((i) => i.name)).toEqual([
      'Broccoli',
      'Zucchini',
      'Apple',
    ]);
    expect(items.map((i) => i.name)).toEqual(['Apple', 'Zucchini', 'Broccoli']);
    expect(getAvailableIngredientNames(items)).toEqual(['Zucchini', 'Broccoli']);
  });

  it('exposes CATEGORY_ORDER constant', () => {
    expect(CATEGORY_ORDER).toEqual(['protein', 'produce', 'staple', 'other']);
  });
});
