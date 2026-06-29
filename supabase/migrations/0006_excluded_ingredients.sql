-- Voeg excluded_ingredients toe aan user_settings voor het "lust ik niet" lijstje.
alter table public.user_settings
  add column if not exists excluded_ingredients text[] not null default '{}';
