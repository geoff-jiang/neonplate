-- Do not depend on project-level default grants for Data API access.
grant usage on schema public to authenticated;
grant select, insert, update on public.user_settings to authenticated;
revoke delete on public.user_settings from authenticated;
grant select, insert, update, delete
  on public.inventory_items, public.recipes, public.daily_logs to authenticated;
revoke all on public.user_settings, public.inventory_items, public.recipes, public.daily_logs
  from anon;

-- The original single-column foreign key allowed linking another user's recipe.
-- Preserve historical nutrition data while detaching any such invalid links.
update public.daily_logs as log
set recipe_id = null
from public.recipes as recipe
where log.recipe_id = recipe.id and log.user_id <> recipe.user_id;

alter table public.recipes
  add constraint recipes_user_id_id_key unique (user_id, id);

alter table public.daily_logs drop constraint daily_logs_recipe_id_fkey;
alter table public.daily_logs
  add constraint daily_logs_user_id_recipe_id_fkey
  foreign key (user_id, recipe_id) references public.recipes (user_id, id)
  on delete set null (recipe_id);

-- Recipe deletion clears only the association, never ownership or nutrition.
create index daily_logs_recipe_id_idx on public.daily_logs (recipe_id)
  where recipe_id is not null;

-- A trigger invokes this function internally; clients never need to call it.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
