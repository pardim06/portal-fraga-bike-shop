-- ==========================================================================
-- Portal Fraga Bike Shop -- passo 7: treinamentos do onboarding com video,
-- foto ou documento anexado, por etapa/setor.
-- Rode isto DEPOIS do 003_content_tables.sql.
-- Este script pode ser rodado mais de uma vez sem erro.
-- ==========================================================================

alter table public.onboarding_steps add column if not exists description text;
alter table public.onboarding_steps add column if not exists media_url text;
alter table public.onboarding_steps add column if not exists media_name text;
alter table public.onboarding_steps add column if not exists media_type text check (media_type in ('video', 'image', 'document'));

-- Bucket publico para os arquivos de treinamento (video/foto/documento).
insert into storage.buckets (id, name, public)
values ('training-media', 'training-media', true)
on conflict (id) do nothing;

drop policy if exists "midia de treinamento visivel para logados" on storage.objects;
create policy "midia de treinamento visivel para logados"
  on storage.objects for select to authenticated using (bucket_id = 'training-media');

drop policy if exists "admin gerencia midia de treinamento" on storage.objects;
create policy "admin gerencia midia de treinamento"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'training-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
  )
  with check (
    bucket_id = 'training-media'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
  );
