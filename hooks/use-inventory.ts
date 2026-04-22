// hooks/use-inventory.ts
import { useState, useEffect, useCallback } from 'react';
import { inventoryQueries, InventoryItem } from '../lib/supabase/queries';
import { useAuth } from './use-auth';

export function useInventory() {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await inventoryQueries.listAll(user.id);
      setItems(data);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = useCallback(
    async (name: string, category: string | null) => {
      if (!user) return;
      const temp: InventoryItem = {
        id: `temp-${Date.now()}`,
        user_id: user.id,
        name: name.trim(),
        category,
        created_at: new Date().toISOString(),
      };
      setItems((prev) => [...prev, temp].sort((a, b) => a.name.localeCompare(b.name)));
      try {
        const saved = await inventoryQueries.add(user.id, name, category);
        setItems((prev) =>
          prev
            .map((i) => (i.id === temp.id ? saved : i))
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (e) {
        setItems((prev) => prev.filter((i) => i.id !== temp.id));
        throw e;
      }
    },
    [user],
  );

  const remove = useCallback(async (id: string) => {
    const snapshot = items;
    setItems((prev) => prev.filter((i) => i.id !== id));
    try {
      await inventoryQueries.remove(id);
    } catch (e) {
      setItems(snapshot);
      throw e;
    }
  }, [items]);

  return { items, loading, error, add, remove, reload };
}
