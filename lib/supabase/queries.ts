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
    const { data, error } = await supabase.from('inventory_items').insert(insert).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single();
    if (error) throw error;
  },
};

export type DailyLog = Database['public']['Tables']['daily_logs']['Row'];
export type DailyLogInsert = Database['public']['Tables']['daily_logs']['Insert'];

export const dailyLogQueries = {
  async listForDay(userId: string, startISO: string, endISO: string): Promise<DailyLog[]> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', startISO)
      .lte('logged_at', endISO)
      .order('logged_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  async listAll(userId: string, limit = 100): Promise<DailyLog[]> {
    const { data, error } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },

  async insert(log: DailyLogInsert): Promise<DailyLog> {
    const { data, error } = await supabase.from('daily_logs').insert(log).select().single();
    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    patch: Partial<Omit<DailyLogInsert, 'user_id' | 'id'>>,
    userId: string,
  ): Promise<DailyLog> {
    const { data, error } = await supabase
      .from('daily_logs')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async remove(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_logs')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
      .single();
    if (error) throw error;
  },
};

export type UserSettings = Pick<
  Database['public']['Tables']['user_settings']['Row'],
  'daily_calories' | 'daily_protein_g' | 'daily_carbs_g' | 'daily_fat_g'
>;

export const settingsQueries = {
  async get(userId: string): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('daily_calories, daily_protein_g, daily_carbs_g, daily_fat_g')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    return data;
  },

  async save(userId: string, updates: UserSettings): Promise<void> {
    const { error } = await supabase
      .from('user_settings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select('user_id')
      .single();
    if (error) throw error;
  },
};
