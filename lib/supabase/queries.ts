// lib/supabase/queries.ts
import { supabase } from './client';
import type { Database } from './types';

export type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
export type InventoryInsert = Database['public']['Tables']['inventory_items']['Insert'];

export const inventoryQueries = {
  async listAll(userId: string): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async add(userId: string, name: string, category: string | null): Promise<InventoryItem> {
    const insert: InventoryInsert = {
      user_id: userId,
      name: name.trim(),
      category,
    };
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(insert)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) throw error;
  },
};
