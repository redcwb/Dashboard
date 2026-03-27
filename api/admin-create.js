export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ version: 'v10' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey     = process.env.SUPABASE_ANON_KEY;

  if (!serviceKey || !supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Vars ausentes' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }
  const callerToken = authHeader.replace('Bearer ', '');

  // Parse body manualmente se necessário
  let body = req.body;
  if (!body || typeof body === 'string') {
    try {
      body = JSON.parse(body || '{}');
    } catch(e) {
      body = {};
    }
  }

  // Identificar usuário pelo token
  let callerId = null;
  try {
    const userRes = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: { 'apikey': anonKey, 'Authorization': 'Bearer ' + callerToken }
    });
    const userData = await userRes.json();
    callerId = userData?.id;
    if (!callerId) return res.status(401).json({ error: 'Usuario nao identificado', v: 'v10' });
  } catch(e) {
    return res.status(500).json({ error: 'Erro auth: ' + e.message, v: 'v10' });
  }

  // Verificar role via get_role_bypass com SERVICE_ROLE
  let role = null;
  try {
    const rpcRes = await fetch(supabaseUrl + '/rest/v1/rpc/get_role_bypass', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid: callerId }),
    });
    const rpcText = await rpcRes.text();
    try { role = JSON.parse(rpcText); } catch(e) { role = rpcText.trim().replace(/"/g,''); }
    if (role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado', role, callerId, rpcStatus: rpcRes.status, v: 'v10' });
    }
  } catch(e) {
    return res.status(500).json({ error: 'Erro rpc: ' + e.message, v: 'v10' });
  }

  const { nome, email, senha, novoRole = 'user' } = body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'nome email senha obrigatorios', nome, email, temSenha: !!senha, body: JSON.stringify(body), v: 'v10' });
  }

  try {
    const createRes = await fetch(supabaseUrl + '/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password: senha, email_confirm: true, user_metadata: { nome } }),
    });

    const created = await createRes.json();
    if (!createRes.ok) {
      return res.status(400).json({ error: created.msg || created.message || 'Erro ao criar usuario', v: 'v10' });
    }

    const insRes = await fetch(supabaseUrl + '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ user_id: created.id, nome, email, role: novoRole, ativo: true, criado_por: callerId }),
    });

    if (!insRes.ok) {
      const e = await insRes.text();
      return res.status(207).json({ warning: 'Usuario criado mas perfil falhou', userId: created.id, detail: e, v: 'v10' });
    }

    const profile = await insRes.json();
    return res.status(200).json({ ok: true, userId: created.id, profile: Array.isArray(profile) ? profile[0] : profile, v: 'v10' });

  } catch(e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message, v: 'v10' });
  }
}
