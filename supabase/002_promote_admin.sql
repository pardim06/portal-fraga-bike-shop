-- ==========================================================================
-- Portal Fraga Bike Shop — promove um usuario para administrador
-- So rode isto DEPOIS do 001_profiles.sql. Troque o e-mail abaixo pelo
-- e-mail cadastrado em Authentication > Users.
--
-- Usa INSERT ... ON CONFLICT porque o usuario foi criado ANTES do gatilho
-- que gera o perfil automaticamente existir — entao ainda nao tem perfil.
-- Isso funciona tanto se o perfil ja existir quanto se nao existir.
-- ==========================================================================

insert into public.profiles (id, name, email, role, sector, access_level)
select id, 'Administrador', email, 'Administrador do Portal', 'Administrativo', 'admin'
from auth.users
where email = 'moises@gmail.com'
on conflict (id) do update
set access_level = 'admin',
    name = 'Administrador',
    role = 'Administrador do Portal';
