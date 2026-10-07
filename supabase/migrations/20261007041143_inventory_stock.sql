-- Keep ingredients when they run out so the owner can restore them later.
-- PostgreSQL applies this default to existing rows without changing their names,
-- IDs, categories, ownership or creation timestamps.
alter table public.inventory_items
  add column in_stock boolean not null default true;

-- Preserve the existing per-user lower(name) unique index. Legacy names may
-- differ only by surrounding/repeated whitespace; do not silently merge or
-- delete these records. New names are normalized by the query layer.
