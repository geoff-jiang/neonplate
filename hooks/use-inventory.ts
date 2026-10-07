import { useCallback, useMemo } from 'react';
import { inventoryQueries, InventoryItem } from '../lib/supabase/queries';
import { useAuth } from './use-auth';
import { useUserResource } from './use-user-resource';

import { getAvailableIngredientNames } from '../lib/utils/inventory-grouping';

const EMPTY_ITEMS: InventoryItem[] = [];

export function useInventory() {
  const { user } = useAuth();
  const {
    data: items,
    mutate,
    ...state
  } = useUserResource(user?.id, 'inventory', '', inventoryQueries.listAll, EMPTY_ITEMS);
  const add = useCallback(
    (name: string, category: string | null) =>
      mutate((userId) => inventoryQueries.add(userId, name, category)),
    [mutate],
  );
  const remove = useCallback(
    (id: string) => mutate((userId) => inventoryQueries.remove(id, userId)),
    [mutate],
  );
  const update = useCallback(
    (id: string, patch: { name: string; category: string | null }) =>
      mutate((userId) => inventoryQueries.update(id, patch, userId)),
    [mutate],
  );
  const setStock = useCallback(
    (id: string, inStock: boolean) =>
      mutate((userId) => inventoryQueries.setStock(id, inStock, userId)),
    [mutate],
  );
  const availableNames = useMemo(() => getAvailableIngredientNames(items), [items]);
  return { items, availableNames, ...state, add, update, setStock, remove };
}
