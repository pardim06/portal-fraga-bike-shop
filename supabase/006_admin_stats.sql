-- ==========================================================================
-- Portal Fraga Bike Shop -- passo 5: permite que administradores vejam os
-- registros de leitura/progresso de todo mundo, para a pagina de Gestao
-- mostrar numeros reais (hoje cada pessoa so ve os proprios registros).
-- Rode isto DEPOIS do 001_profiles.sql e do 003_content_tables.sql.
-- Este script pode ser rodado mais de uma vez sem erro.
-- ==========================================================================

drop policy if exists "admin ve todos os document_reads" on public.document_reads;
create policy "admin ve todos os document_reads"
  on public.document_reads for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));

drop policy if exists "admin ve todos os announcement_reads" on public.announcement_reads;
create policy "admin ve todos os announcement_reads"
  on public.announcement_reads for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));

drop policy if exists "admin ve todo o onboarding_progress" on public.onboarding_progress;
create policy "admin ve todo o onboarding_progress"
  on public.onboarding_progress for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.access_level = 'admin'));
