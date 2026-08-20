-- ==========================================================================
-- Portal Fraga Bike Shop -- passo 6: organograma da empresa.
-- Isto e independente do sistema de login/colaboradores (profiles): e so
-- uma lista de pessoas, cargos, fotos e telefones para consulta, montada
-- pelo admin em Painel Admin -> Organograma.
-- Este script pode ser rodado mais de uma vez sem erro.
-- ==========================================================================

create table if not exists public.org_chart_people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  phone text,
  photo_url text,
  parent_id uuid references public.org_chart_people(id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.org_chart_people enable row level security;

drop policy if exists "organograma visivel para logados" on public.org_chart_people;
create policy "organograma visivel para logados"
  on public.org_chart_people for select to authenticated using (true);

drop policy if exists "admin gerencia organograma" on public.org_chart_people;
create policy "admin gerencia organograma"
  on public.org_chart_people for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));

-- Bucket publico para as fotos do organograma.
insert into storage.buckets (id, name, public)
values ('org-chart', 'org-chart', true)
on conflict (id) do nothing;

drop policy if exists "fotos do organograma visiveis para logados" on storage.objects;
create policy "fotos do organograma visiveis para logados"
  on storage.objects for select to authenticated using (bucket_id = 'org-chart');

drop policy if exists "admin gerencia fotos do organograma" on storage.objects;
create policy "admin gerencia fotos do organograma"
  on storage.objects for all to authenticated
  using (
    bucket_id = 'org-chart'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
  )
  with check (
    bucket_id = 'org-chart'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin')
  );
