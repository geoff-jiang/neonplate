import { useCallback } from 'react';
import { inventoryQueries, InventoryItem } from '../lib/supabase/queries';
import { useAuth } from './use-auth';
import { useUserResource } from './use-user-resource';

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
  return { items, ...state, add, remove };
}
