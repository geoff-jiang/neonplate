-- supabase/migrations/20260422050034_rls_policies.sql

-- Enable RLS on all tables
alter table public.user_settings enable row level security;
alter table public.inventory_items enable row level security;
alter table public.recipes enable row level security;
alter table public.daily_logs enable row level security;

-- user_settings policies
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- inventory_items policies
create policy "Users can view own inventory"
  on public.inventory_items for select
  using (auth.uid() = user_id);

create policy "Users can insert own inventory"
  on public.inventory_items for insert
  with check (auth.uid() = user_id);

create policy "Users can update own inventory"
  on public.inventory_items for update
  using (auth.uid() = user_id);

create policy "Users can delete own inventory"
  on public.inventory_items for delete
  using (auth.uid() = user_id);

-- recipes policies
create policy "Users can view own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- daily_logs policies
create policy "Users can view own logs"
  on public.daily_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.daily_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.daily_logs for update
  using (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.daily_logs for delete
  using (auth.uid() = user_id);