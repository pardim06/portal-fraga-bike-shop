-- ==========================================================================
-- Portal Fraga Bike Shop -- passo 4: documentos de verdade, compartilhados
-- pela empresa toda (banco de dados + arquivos no Storage), no lugar dos
-- documentos de exemplo que ficavam so no navegador de cada pessoa.
-- Rode isto DEPOIS do 001_profiles.sql.
-- Este script pode ser rodado mais de uma vez sem erro.
-- ==========================================================================

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('POPs', 'Manuais', 'Políticas')),
  sector text not null,
  version text not null default 'v1.0',
  tone text not null default 'orange',
  restricted boolean not null default false,
  owner text not null,
  file_url text,
  file_name text,
  created_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.documents enable row level security;

-- Documentos nao restritos, todo mundo ve. Documentos restritos, so quem e
-- do mesmo setor (ou admin).
drop policy if exists "documentos visiveis conforme setor" on public.documents;
create policy "documentos visiveis conforme setor"
  on public.documents for select to authenticated
  using (
    not restricted
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and (p.access_level = 'admin' or p.sector = documents.sector)
    )
  );

drop policy if exists "admin gerencia documentos" on public.documents;
create policy "admin gerencia documentos"
  on public.documents for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));

-- Quem ja leu qual documento (marca "lido").
create table if not exists public.document_reads (
  user_id uuid references auth.users(id) on delete cascade,
  document_id uuid references public.documents(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, document_id)
);
alter table public.document_reads enable row level security;

drop policy if exists "usuario ve os proprios document_reads" on public.document_reads;
create policy "usuario ve os proprios document_reads"
  on public.document_reads for select to authenticated using (auth.uid() = user_id);

drop policy if exists "usuario marca os proprios document_reads" on public.document_reads;
create policy "usuario marca os proprios document_reads"
  on public.document_reads for insert to authenticated with check (auth.uid() = user_id);

-- Bucket publico para os arquivos dos documentos (o admin e quem sobe/troca).
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "arquivos de documentos visiveis para logados" on storage.objects;
create policy "arquivos de documentos visiveis para logados"
  on storage.objects for select to authenticated using (bucket_id = 'documents');

drop policy if exists "admin gerencia arquivos de documentos" on storage.objects;
create policy "admin gerencia arquivos de documentos"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
  )
  with check (
    bucket_id = 'documents'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
  );
