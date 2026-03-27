// admin-user.js — Vercel Serverless Function (Node.js 24, ES Module)
// Gerencia usuários: criar, listar, atualizar, deletar
// Rota via rewrite: /api/admin-create → /api/admin-user.js

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ============================================================
// Helper: Parse body (compatível com Vercel Fluid Compute)
// ============================================================
function parseBody(req) {
  return new Promise((resolve) => {
    // Vercel já parseou como objeto
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return resolve(req.body);
    }
    // Vercel parseou como string
    if (typeof req.body === 'string' && req.body.length > 0) {
      try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
    }
    // Leitura manual do stream
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

// ============================================================
// Helper: Extrair e validar token JWT do admin logado
// Retorna { uid, email } ou envia erro e retorna null
// ============================================================
async function authenticateAdmin(req, res) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return null;
  }

  // Verificar token no Supabase Auth
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SERVICE_KEY,
    },
  });

  if (!userRes.ok) {
    const errText = await userRes.text();
    res.status(401).json({ error: 'Token inválido', detail: errText.substring(0, 200) });
    return null;
  }

  const userData = await userRes.json();
  const uid = userData.id;

  // Verificar role via RPC
  const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_role_bypass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ uid }),
  });

  if (!roleRes.ok) {
    res.status(500).json({ error: 'Erro ao verificar permissão' });
    return null;
  }

  // Normalizar resposta da RPC (pode vir como "admin", ["admin"], etc.)
  const roleText = await roleRes.text();
  let role = roleText;
  try {
    const parsed = JSON.parse(roleText);
    if (typeof parsed === 'string') role = parsed;
    else if (Array.isArray(parsed) && parsed.length > 0) role = parsed[0];
  } catch {
    role = roleText.replace(/"/g, '').trim();
  }

  if (role !== 'admin') {
    res.status(403).json({ error: 'Acesso restrito a administradores', roleReceived: role });
    return null;
  }

  return { uid, email: userData.email };
}

// ============================================================
// POST: Criar novo usuário
// Body: { email, password, role, nome?, unidades_permitidas? }
// ============================================================
async function createUser(req, res) {
  const admin = await authenticateAdmin(req, res);
  if (!admin) return; // resposta já enviada

  const body = await parseBody(req);
  const { email, password, role, nome, unidades_permitidas } = body;

  // Validações
  if (!email || !password) {
    return res.status(400).json({ error: 'email e password são obrigatórios' });
  }

  const allowedRoles = ['admin', 'gestor', 'viewer'];
  const userRole = allowedRoles.includes(role) ? role : 'viewer';

  // 1. Criar usuário no Supabase Auth
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome: nome || email.split('@')[0], role: userRole },
    }),
  });

  const createData = await createRes.json();

  if (!createRes.ok) {
    return res.status(createRes.status).json({
      error: 'Erro ao criar usuário no Auth',
      detail: createData.msg || createData.message || JSON.stringify(createData),
    });
  }

  const newUid = createData.id;

  // 2. Inserir na tabela profiles
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      id: newUid,
      email,
      role: userRole,
      nome: nome || email.split('@')[0],
      unidades_permitidas: unidades_permitidas || [],
      ativo: true,
    }),
  });

  const profileData = await profileRes.json();

  if (!profileRes.ok) {
    // Usuário criado no Auth mas falhou no profile — retorna aviso
    return res.status(207).json({
      warning: 'Usuário criado no Auth, mas falhou ao inserir profile',
      userId: newUid,
      profileError: profileData,
    });
  }

  return res.status(201).json({
    success: true,
    user: {
      id: newUid,
      email,
      role: userRole,
      nome: nome || email.split('@')[0],
    },
  });
}

// ============================================================
// GET: Listar usuários (da tabela profiles)
// ============================================================
async function listUsers(req, res) {
  const admin = await authenticateAdmin(req, res);
  if (!admin) return;

  const profilesRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?select=id,email,role,nome,ativo,unidades_permitidas,created_at&order=created_at.desc`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    }
  );

  if (!profilesRes.ok) {
    const errText = await profilesRes.text();
    return res.status(500).json({ error: 'Erro ao listar usuários', detail: errText.substring(0, 200) });
  }

  const profiles = await profilesRes.json();
  return res.status(200).json({ users: profiles, total: profiles.length });
}

// ============================================================
// PATCH: Atualizar role ou dados de um usuário
// Body: { userId, role?, nome?, ativo?, unidades_permitidas? }
// ============================================================
async function updateUser(req, res) {
  const admin = await authenticateAdmin(req, res);
  if (!admin) return;

  const body = await parseBody(req);
  const { userId, role, nome, ativo, unidades_permitidas } = body;

  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório' });
  }

  // Montar objeto de update apenas com campos enviados
  const updates = {};
  if (role !== undefined) {
    const allowedRoles = ['admin', 'gestor', 'viewer'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: `Role inválida. Permitidas: ${allowedRoles.join(', ')}` });
    }
    updates.role = role;
  }
  if (nome !== undefined) updates.nome = nome;
  if (ativo !== undefined) updates.ativo = ativo;
  if (unidades_permitidas !== undefined) updates.unidades_permitidas = unidades_permitidas;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  }

  const updateRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(updates),
    }
  );

  const updateData = await updateRes.json();

  if (!updateRes.ok) {
    return res.status(updateRes.status).json({ error: 'Erro ao atualizar', detail: updateData });
  }

  // Se atualizou role, sincronizar no user_metadata do Auth
  if (role !== undefined) {
    await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ user_metadata: { role } }),
    });
  }

  return res.status(200).json({ success: true, updated: updateData[0] || updates });
}

// ============================================================
// DELETE: Desativar usuário (soft delete — marca ativo=false)
// Query param: ?userId=xxx
// ============================================================
async function deleteUser(req, res) {
  const admin = await authenticateAdmin(req, res);
  if (!admin) return;

  const url = new URL(req.url, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    return res.status(400).json({ error: 'userId é obrigatório (query param)' });
  }

  // Soft delete: marca ativo = false
  const delRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({ ativo: false }),
    }
  );

  if (!delRes.ok) {
    const errText = await delRes.text();
    return res.status(500).json({ error: 'Erro ao desativar', detail: errText.substring(0, 200) });
  }

  return res.status(200).json({ success: true, message: 'Usuário desativado' });
}

// ============================================================
// Handler principal
// ============================================================
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    switch (req.method) {
      case 'GET':
        return await listUsers(req, res);
      case 'POST':
        return await createUser(req, res);
      case 'PATCH':
        return await updateUser(req, res);
      case 'DELETE':
        return await deleteUser(req, res);
      default:
        return res.status(405).json({ error: 'Método não permitido' });
    }
  } catch (err) {
    console.error('admin-user error:', err);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: err.message,
    });
  }
}
