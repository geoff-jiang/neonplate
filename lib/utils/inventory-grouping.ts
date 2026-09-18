// lib/utils/inventory-grouping.ts
import type { InventoryItem } from '../supabase/queries';

export const CATEGORY_ORDER = ['protein', 'produce', 'staple', 'other'] as const;
export type Category = (typeof CATEGORY_ORDER)[number];

export type InventoryGroup = {
  category: Category;
  items: InventoryItem[];
};

export function groupByCategory(items: InventoryItem[]): InventoryGroup[] {
  const buckets = new Map<Category, InventoryItem[]>();
  for (const cat of CATEGORY_ORDER) buckets.set(cat, []);

  for (const item of items) {
    const cat: Category =
      item.category && (CATEGORY_ORDER as readonly string[]).includes(item.category)
        ? (item.category as Category)
        : 'other';
    buckets.get(cat)!.push(item);
  }

  const result: InventoryGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const items = buckets.get(cat)!;
    if (items.length === 0) continue;
    items.sort((a, b) => a.name.localeCompare(b.name));
    result.push({ category: cat, items });
  }
  return result;
}
