-- supabase/migrations/20260422045544_init.sql

-- user_settings: one row per user with macro targets
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_calories int not null default 2000,
  daily_protein_g int not null default 150,
  daily_carbs_g int not null default 200,
  daily_fat_g int not null default 65,
  updated_at timestamptz not null default now()
);

-- inventory_items: boolean presence of ingredients
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz not null default now()
);
create unique index inventory_items_user_name_unique
  on public.inventory_items (user_id, lower(name));
create index inventory_items_user_id_idx on public.inventory_items (user_id);

-- recipes: grows organically from AI suggestions the user cooks
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  ingredients jsonb not null default '[]'::jsonb,
  instructions text not null default '',
  prep_time_minutes int not null default 0,
  difficulty text not null default 'easy',
  meal_type text not null,
  estimated_calories int not null default 0,
  estimated_protein_g int not null default 0,
  estimated_carbs_g int not null default 0,
  estimated_fat_g int not null default 0,
  times_cooked int not null default 0,
  last_cooked_at timestamptz,
  created_at timestamptz not null default now()
);
create index recipes_user_id_idx on public.recipes (user_id);

-- daily_logs: one row per logged meal
create table public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null,
  calories int not null default 0,
  protein_g int not null default 0,
  carbs_g int not null default 0,
  fat_g int not null default 0,
  logged_at timestamptz not null default now(),
  source text not null check (source in ('voice', 'text', 'recipe')),
  raw_input text
);
create index daily_logs_user_logged_at_idx on public.daily_logs (user_id, logged_at desc);

-- Auto-create user_settings row on new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();