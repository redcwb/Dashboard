/**
 * /api/admin-create.js — Cria usuário no Supabase
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY (nunca exposta no browser).
 * Só aceita requisições com token de admin válido.
 *
 * Variável adicional necessária no Vercel:
 *   SUPABASE_SERVICE_ROLE_KEY → eyJ... (service_role key do Supabase)
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!serviceKey || !supabaseUrl) {
    return res.status(500).json({ error: 'Configuração do servidor incompleta' });
  }

  // Verificar token do admin chamador
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const callerToken = authHeader.replace('Bearer ', '');

  // Verificar se o chamador é admin via Supabase
  const meRes = await fetch(`${supabaseUrl}/rest/v1/rpc/get_my_role`, {
    method: 'POST',
    headers: {
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${callerToken}`,
      'Content-Type': 'application/json',
      'Content-Length': '0',
    },
    body: JSON.stringify({}),
  });

  const meText = await meRes.text();
  let role = null;
  try { role = JSON.parse(meText); } catch(e) { role = meText?.trim().replace(/"/g,''); }

  if (!meRes.ok) {
    console.error('[admin-create] get_my_role falhou:', meRes.status, meText);
    return res.status(401).json({ error: 'Token inválido', detail: meText });
  }

  if (role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado — apenas admins podem criar usuários', role });
  }

  // Extrair dados do novo usuário
  const { nome, email, senha, novoRole = 'user', callerUserId } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'nome, email e senha são obrigatórios' });
  }

  if (!['admin', 'user'].includes(novoRole)) {
    return res.status(400).json({ error: 'role inválido — use admin ou user' });
  }

  try {
    // 1. Criar usuário no Supabase Auth
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: senha,
        email_confirm: true, // já confirma o email automaticamente
        user_metadata: { nome },
      }),
    });

    const created = await createRes.json();

    if (!createRes.ok) {
      const msg = created?.msg || created?.message || 'Erro ao criar usuário';
      return res.status(400).json({ error: msg });
    }

    const newUserId = created.id;

    // 2. Inserir na tabela profiles
    const profileRes = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: newUserId,
        nome,
        email,
        role: novoRole,
        ativo: true,
        criado_por: callerUserId || null,
      }),
    });

    if (!profileRes.ok) {
      const profErr = await profileRes.json();
      console.error('[admin-create] Erro ao criar profile:', profErr);
      // Usuário foi criado no Auth mas profile falhou — logar mas não reverter
      return res.status(207).json({
        warning: 'Usuário criado mas perfil falhou — contate o suporte',
        userId: newUserId,
      });
    }

    const profile = await profileRes.json();

    return res.status(200).json({
      ok: true,
      userId: newUserId,
      profile: Array.isArray(profile) ? profile[0] : profile,
    });

  } catch (e) {
    console.error('[admin-create] Erro:', e);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
