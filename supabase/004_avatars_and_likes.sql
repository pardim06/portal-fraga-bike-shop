-- ==========================================================================
-- Portal Fraga Bike Shop -- passo 3: foto de perfil + curtidas em comunicados
-- IMPORTANTE: rode o 003_content_tables.sql ANTES deste (cria a tabela
-- "announcements" que as curtidas referenciam). Se ja rodou o 003, pule pra
-- este aqui direto.
-- Este script pode ser rodado mais de uma vez sem erro, mesmo que parte
-- dele ja tenha sido aplicada antes.
-- ==========================================================================

-- ── Foto de perfil ─────────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;

-- Bucket publico de avatares (a foto fica visivel pra quem tem o link,
-- como no LinkedIn; so o dono ou um admin pode enviar/trocar a foto).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "qualquer um envia a propria foto ou admin envia qualquer uma" on storage.objects;
create policy "qualquer um envia a propria foto ou admin envia qualquer uma"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
    )
  );

drop policy if exists "qualquer um troca a propria foto ou admin troca qualquer uma" on storage.objects;
create policy "qualquer um troca a propria foto ou admin troca qualquer uma"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
    )
  )
  with check (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
    )
  );

-- Necessario para o upload em modo "substituir" (upsert): o Storage precisa
-- conseguir checar se o arquivo ja existe antes de decidir inserir ou trocar.
drop policy if exists "avatares sao visiveis para logados" on storage.objects;
create policy "avatares sao visiveis para logados"
  on storage.objects for select to authenticated
  using (bucket_id = 'avatars');

drop policy if exists "qualquer um apaga a propria foto ou admin apaga qualquer uma" on storage.objects;
create policy "qualquer um apaga a propria foto ou admin apaga qualquer uma"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
    )
  );

-- ── Curtidas em comunicados ────────────────────────────────────────────
create table if not exists public.announcement_likes (
  user_id uuid references auth.users(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
alter table public.announcement_likes enable row level security;

drop policy if exists "curtidas visiveis para logados" on public.announcement_likes;
create policy "curtidas visiveis para logados"
  on public.announcement_likes for select to authenticated using (true);

drop policy if exists "usuario curte por conta propria" on public.announcement_likes;
create policy "usuario curte por conta propria"
  on public.announcement_likes for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "usuario descurte por conta propria" on public.announcement_likes;
create policy "usuario descurte por conta propria"
  on public.announcement_likes for delete to authenticated using (auth.uid() = user_id);
