export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey     = process.env.SUPABASE_ANON_KEY;

  if (!serviceKey || !supabaseUrl || !anonKey) {
    return res.status(500).json({ error: 'Vars ausentes', hasService: !!serviceKey, hasUrl: !!supabaseUrl, hasAnon: !!anonKey });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nao fornecido' });
  }
  const callerToken = authHeader.replace('Bearer ', '');

  // Verificar role via tabela profiles diretamente (mais confiável que RPC)
  const profileCheck = await fetch(
    supabaseUrl + '/rest/v1/profiles?select=role&user_id=eq.' + req.body?.callerUserId + '&limit=1',
    {
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + callerToken,
      }
    }
  );

  const profileData = await profileCheck.json();
  const role = Array.isArray(profileData) && profileData.length > 0 ? profileData[0].role : null;

  if (!profileCheck.ok || role !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado', role, profileStatus: profileCheck.status, profileData });
  }

  const body = req.body || {};
  const { nome, email, senha, novoRole = 'user', callerUserId } = body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'nome, email e senha sao obrigatorios' });
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
      return res.status(400).json({ error: created.msg || created.message || 'Erro ao criar usuario' });
    }

    const profileRes = await fetch(supabaseUrl + '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ user_id: created.id, nome, email, role: novoRole, ativo: true, criado_por: callerUserId || null }),
    });

    if (!profileRes.ok) {
      const e = await profileRes.text();
      return res.status(207).json({ warning: 'Usuario criado mas perfil falhou', userId: created.id, detail: e });
    }

    const profile = await profileRes.json();
    return res.status(200).json({ ok: true, userId: created.id, profile: Array.isArray(profile) ? profile[0] : profile });

  } catch(e) {
    return res.status(500).json({ error: 'Erro interno: ' + e.message });
  }
}
