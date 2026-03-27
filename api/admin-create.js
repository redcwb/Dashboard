/**
 * /api/admin-create.js — Cria usuário no Supabase
 * CommonJS para compatibilidade com Vercel
 */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey     = process.env.SUPABASE_ANON_KEY;

  if (!serviceKey || !supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Configuracao do servidor incompleta' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }
  const callerToken = authHeader.replace('Bearer ', '');

  // Verificar se o chamador eh admin
  try {
    const meRes = await fetch(supabaseUrl + '/rest/v1/rpc/get_my_role', {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + callerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const meText = await meRes.text();
    let role = null;
    try { role = JSON.parse(meText); } catch(e) { role = meText.trim().replace(/"/g, ''); }

    if (!meRes.ok || role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado', role: role, status: meRes.status });
    }
  } catch(e) {
    return res.status(500).json({ error: 'Erro ao verificar permissao: ' + e.message });
  }

  const body = req.body || {};
  const nome = body.nome;
  const email = body.email;
  const senha = body.senha;
  const novoRole = body.novoRole || 'user';
  const callerUserId = body.callerUserId;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'nome, email e senha sao obrigatorios' });
  }
  if (novoRole !== 'admin' && novoRole !== 'user') {
    return res.status(400).json({ error: 'role invalido' });
  }

  try {
    const createRes = await fetch(supabaseUrl + '/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: senha,
        email_confirm: true,
        user_metadata: { nome: nome },
      }),
    });

    const created = await createRes.json();
    if (!createRes.ok) {
      return res.status(400).json({ error: created.msg || created.message || 'Erro ao criar usuario' });
    }

    const newUserId = created.id;

    const profileRes = await fetch(supabaseUrl + '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: newUserId,
        nome: nome,
        email: email,
        role: novoRole,
        ativo: true,
        criado_por: callerUserId || null,
      }),
    });

    if (!profileRes.ok) {
      const profErr = await profileRes.text();
      return res.status(207).json({ warning: 'Usuario criado mas perfil falhou', userId: newUserId, detail: profErr });
    }

    const profile = await profileRes.json();
    return res.status(200).json({
      ok: true,
      userId: newUserId,
      profile: Array.isArray(profile) ? profile[0] : profile,
    });

  } catch(e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
};
