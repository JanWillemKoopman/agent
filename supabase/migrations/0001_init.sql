-- Recepten-PWA: basis-schema (fase 1).
-- Twee tabellen + Row Level Security gekoppeld aan de ingelogde gebruiker.

-- =========================================================================
-- user_settings
-- =========================================================================
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  selected_stores text[] not null default '{}',
  min_price_pp numeric not null default 0,
  max_price_pp numeric not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings_select_own"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "user_settings_insert_own"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "user_settings_update_own"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "user_settings_delete_own"
  on public.user_settings for delete
  using (auth.uid() = user_id);

-- =========================================================================
-- saved_recipes
-- =========================================================================
create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  recipe_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists saved_recipes_user_id_idx
  on public.saved_recipes (user_id, created_at desc);

alter table public.saved_recipes enable row level security;

create policy "saved_recipes_select_own"
  on public.saved_recipes for select
  using (auth.uid() = user_id);

create policy "saved_recipes_insert_own"
  on public.saved_recipes for insert
  with check (auth.uid() = user_id);

create policy "saved_recipes_delete_own"
  on public.saved_recipes for delete
  using (auth.uid() = user_id);
