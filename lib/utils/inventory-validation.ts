import { CATEGORY_ORDER, type Category } from './inventory-grouping';

export function normalizeInventoryName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new Error('Enter an ingredient name.');
  return normalized;
}

export function validateInventoryCategory(category: string | null): Category | null {
  if (category === null) return null;
  if (!(CATEGORY_ORDER as readonly string[]).includes(category)) {
    throw new Error('Choose protein, produce, staple, or other.');
  }
  return category as Category;
}

export function inventoryWriteError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    return new Error(
      'That ingredient already exists. Find it in your inventory and turn In stock on to restock it.',
    );
  }
  return new Error(error.message);
}
