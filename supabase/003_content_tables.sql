-- ==========================================================================
-- Portal Fraga Bike Shop -- passo 2: comunicados, equipe/aniversariantes e
-- onboarding, agora no banco (valendo pra empresa toda, nao so um navegador).
-- Rode isto DEPOIS do 001_profiles.sql.
-- Este script pode ser rodado mais de uma vez sem erro, mesmo que parte
-- dele ja tenha sido aplicada antes.
-- ==========================================================================

-- ── Comunicados ────────────────────────────────────────────────────────
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  tag text not null check (tag in ('geral', 'importante', 'urgente')),
  title text not null,
  author text not null,
  body text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;

drop policy if exists "comunicados visiveis para logados" on public.announcements;
create policy "comunicados visiveis para logados"
  on public.announcements for select to authenticated using (true);

drop policy if exists "admin gerencia comunicados" on public.announcements;
create policy "admin gerencia comunicados"
  on public.announcements for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));

-- Quem leu qual comunicado (marca "lido")
create table if not exists public.announcement_reads (
  user_id uuid references auth.users(id) on delete cascade,
  announcement_id uuid references public.announcements(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, announcement_id)
);
alter table public.announcement_reads enable row level security;

drop policy if exists "usuario ve os proprios reads" on public.announcement_reads;
create policy "usuario ve os proprios reads"
  on public.announcement_reads for select to authenticated using (auth.uid() = user_id);

drop policy if exists "usuario marca os proprios reads" on public.announcement_reads;
create policy "usuario marca os proprios reads"
  on public.announcement_reads for insert to authenticated with check (auth.uid() = user_id);

-- ── Equipe / aniversariantes ──────────────────────────────────────────
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  sector text not null,
  day int not null check (day between 1 and 31),
  month int not null check (month between 1 and 12),
  birth_year int,
  created_at timestamptz not null default now()
);
alter table public.employees enable row level security;

drop policy if exists "equipe visivel para logados" on public.employees;
create policy "equipe visivel para logados"
  on public.employees for select to authenticated using (true);

drop policy if exists "admin gerencia equipe" on public.employees;
create policy "admin gerencia equipe"
  on public.employees for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));

-- ── Onboarding: etapas (definicao) e progresso (por usuario) ─────────
create table if not exists public.onboarding_steps (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  sector text not null default 'Todos',
  created_at timestamptz not null default now()
);
alter table public.onboarding_steps enable row level security;

drop policy if exists "etapas visiveis para logados" on public.onboarding_steps;
create policy "etapas visiveis para logados"
  on public.onboarding_steps for select to authenticated using (true);

drop policy if exists "admin gerencia etapas" on public.onboarding_steps;
create policy "admin gerencia etapas"
  on public.onboarding_steps for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));

create table if not exists public.onboarding_progress (
  user_id uuid references auth.users(id) on delete cascade,
  step_id uuid references public.onboarding_steps(id) on delete cascade,
  done boolean not null default true,
  completed_at timestamptz not null default now(),
  primary key (user_id, step_id)
);
alter table public.onboarding_progress enable row level security;

drop policy if exists "usuario ve o proprio progresso" on public.onboarding_progress;
create policy "usuario ve o proprio progresso"
  on public.onboarding_progress for select to authenticated using (auth.uid() = user_id);

drop policy if exists "usuario gerencia o proprio progresso" on public.onboarding_progress;
create policy "usuario gerencia o proprio progresso"
  on public.onboarding_progress for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Dados iniciais (os mesmos que ja existiam no protótipo) ───────────
-- So insere os dados de exemplo se as tabelas ainda estiverem vazias,
-- para nao duplicar caso este script seja rodado mais de uma vez.
insert into public.announcements (tag, title, author, body, created_at)
select * from (values
  ('urgente', 'Atualização do procedimento de atendimento', 'RH', 'A partir de hoje, todo atendimento presencial deve seguir o novo roteiro de boas-vindas descrito no POP de Atendimento ao Cliente (v2.1). Times de loja devem revisar o documento ainda esta semana.', now()),
  ('importante', 'Novo horário de funcionamento da loja', 'Comercial', 'A partir da próxima segunda-feira, a loja física passa a funcionar das 9h às 19h, de segunda a sábado. Ajustem as escalas com seus times.', now() - interval '1 day'),
  ('geral', 'Resultados do trimestre e agradecimento à equipe', 'Direção', 'Fechamos o trimestre com crescimento de 18% nas vendas e recorde de satisfação dos clientes. Obrigado a todos pelo empenho: o resultado é de cada um de vocês.', now() - interval '5 days'),
  ('importante', 'Nova política de trocas e devoluções', 'E-commerce', 'O prazo de troca para produtos comprados online passa de 7 para 30 dias corridos. A política atualizada já está disponível na Central de Documentos.', now() - interval '7 days'),
  ('geral', 'Campanha interna: Setembro Amarelo na Fraga', 'RH', 'Em setembro teremos rodas de conversa e conteúdos sobre saúde mental toda quarta-feira. Fiquem de olho nos comunicados para a agenda completa.', now() - interval '12 days')
) as seed(tag, title, author, body, created_at)
where not exists (select 1 from public.announcements);

insert into public.employees (name, role, sector, day, month)
select * from (values
  ('Bruno Ferreira', 'Vendedor', 'Loja Fraga Geral', 18, 8),
  ('Larissa Nunes', 'Analista', 'Administrativo', 22, 8),
  ('Diego Souza', 'Analista', 'E-commerce', 27, 8),
  ('Renata Alves', 'Coordenadora', 'Oficina', 5, 8)
) as seed(name, role, sector, day, month)
where not exists (select 1 from public.employees);

insert into public.onboarding_steps (label, sector)
select * from (values
  ('Conheça nossa história', 'Todos'),
  ('Conheça nossos valores', 'Todos'),
  ('Leia o código de conduta', 'Todos'),
  ('Conheça os procedimentos', 'Todos'),
  ('Finalize seu treinamento', 'Todos')
) as seed(label, sector)
where not exists (select 1 from public.onboarding_steps);
