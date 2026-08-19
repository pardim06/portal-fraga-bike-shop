-- ==========================================================================
-- Portal Fraga Bike Shop — passo 1: tabela de perfis (usuarios) + permissoes
-- Rode isto no SQL Editor do Supabase (icone ">_" na barra lateral).
-- ==========================================================================

-- Uma linha por usuario autenticado, com setor e nivel de acesso.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'Colaborador',
  sector text not null default 'Comercial',
  access_level text not null default 'colaborador' check (access_level in ('colaborador', 'admin')),
  since date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Qualquer pessoa logada pode ver os perfis (necessario para aniversariantes,
-- lista de equipe e o painel de seguranca do admin).
create policy "profiles sao visiveis para usuarios logados"
  on public.profiles for select
  to authenticated
  using (true);

-- Cada pessoa pode atualizar o proprio perfil (nome, cargo etc.).
create policy "usuario pode editar o proprio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Somente administradores podem mudar o access_level de qualquer pessoa
-- (inclusive a propria linha de outra pessoa).
create policy "admin pode editar qualquer perfil"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.access_level = 'admin'
    )
  );

-- Cria automaticamente um perfil (como "colaborador") toda vez que alguem
-- se cadastra pela autenticacao do Supabase.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
