-- Manual logs should be distinguishable from AI-assisted text/voice logs.
alter table public.daily_logs drop constraint daily_logs_source_check;
alter table public.daily_logs
  add constraint daily_logs_source_check
  check (source in ('voice', 'text', 'recipe', 'manual'));

-- Enforce the same basic input rules as the client for future inserts/updates.
-- NOT VALID preserves legacy records without silently changing their nutrition;
-- an edited legacy record must satisfy these checks before it can be saved.
alter table public.daily_logs
  add constraint daily_logs_name_not_blank
    check (name ~ '[^[:space:]]') not valid,
  add constraint daily_logs_macros_nonnegative
    check (calories >= 0 and protein_g >= 0 and carbs_g >= 0 and fat_g >= 0) not valid;

alter table public.user_settings
  add constraint user_settings_targets_valid
    check (daily_calories > 0 and daily_protein_g >= 0 and daily_carbs_g >= 0 and daily_fat_g >= 0) not valid;
