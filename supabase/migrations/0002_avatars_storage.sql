-- Publieke bucket voor profielfoto's
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Gebruikers kunnen eigen avatar uploaden"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Gebruikers kunnen eigen avatar overschrijven"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Gebruikers kunnen eigen avatar verwijderen"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Iedereen kan avatars bekijken"
  on storage.objects for select to public
  using (bucket_id = 'avatars');
