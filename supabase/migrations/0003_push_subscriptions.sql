create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

-- Gebruikers kunnen alleen hun eigen subscriptions zien en beheren.
create policy "Eigen subscriptions inzien"
  on push_subscriptions for select to authenticated
  using (user_id = auth.uid());

create policy "Eigen subscription aanmaken"
  on push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());

create policy "Eigen subscription verwijderen"
  on push_subscriptions for delete to authenticated
  using (user_id = auth.uid());
