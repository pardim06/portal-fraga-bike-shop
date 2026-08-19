// Portal Fraga Bike Shop — Edge Function: cria, edita e exclui colaboradores.
// Roda no servidor do Supabase (nunca no navegador), entao pode usar a
// service_role key com seguranca. So aceita a chamada se quem estiver
// pedindo for um administrador logado.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const action = body.action || 'create';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401);

    // Client that acts AS the caller, just to find out who they are.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ error: 'Não autenticado.' }, 401);

    // Privileged client — service_role key, only ever used here, server-side.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: callerProfile } = await adminClient
      .from('profiles').select('access_level').eq('id', caller.id).single();

    if (!callerProfile || callerProfile.access_level !== 'admin') {
      return json({ error: 'Apenas administradores podem gerenciar colaboradores.' }, 403);
    }

    if (action === 'create') {
      const { name, email, password, sector, role, access_level } = body;
      if (!name || !email || !password) {
        return json({ error: 'Nome, e-mail e senha são obrigatórios.' }, 400);
      }
      if (String(password).length < 6) {
        return json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400);
      }

      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // ferramenta interna: pula a confirmacao por e-mail
      });
      if (createError) return json({ error: createError.message }, 400);

      // O gatilho do banco ja criou um perfil basico; agora preenchemos os
      // dados reais informados no formulario.
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          name,
          sector: sector || 'Comercial',
          role: role || 'Colaborador',
          access_level: access_level === 'admin' ? 'admin' : 'colaborador',
        })
        .eq('id', created.user.id);

      if (profileError) return json({ error: profileError.message }, 400);

      return json({ ok: true, id: created.user.id });
    }

    if (action === 'update') {
      const { userId, name, email, password, sector, role, access_level } = body;
      if (!userId) return json({ error: 'Colaborador não informado.' }, 400);
      if (password && String(password).length < 6) {
        return json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, 400);
      }

      // E-mail e/ou senha mudam no cadastro de autenticacao.
      if (email || password) {
        const authUpdate: Record<string, string> = {};
        if (email) authUpdate.email = email;
        if (password) authUpdate.password = password;
        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, authUpdate);
        if (authError) return json({ error: authError.message }, 400);
      }

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          name,
          email: email || undefined,
          sector: sector || 'Comercial',
          role: role || 'Colaborador',
          access_level: access_level === 'admin' ? 'admin' : 'colaborador',
        })
        .eq('id', userId);

      if (profileError) return json({ error: profileError.message }, 400);

      return json({ ok: true, id: userId });
    }

    if (action === 'delete') {
      const { userId } = body;
      if (!userId) return json({ error: 'Colaborador não informado.' }, 400);
      if (userId === caller.id) {
        return json({ error: 'Você não pode excluir o seu próprio usuário.' }, 400);
      }

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
      if (deleteError) return json({ error: deleteError.message }, 400);

      return json({ ok: true });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
