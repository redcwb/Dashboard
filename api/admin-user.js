const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      return resolve(req.body);
    }
    if (typeof req.body === 'string' && req.body.length > 0) {
      try { return resolve(JSON.parse(req.body)); } catch { return resolve({}); }
    }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ version: 'v6-debug', file: 'admin-user.js' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', v: 'v6-debug' });
  }

  const debug = { steps: [], v: 'v6-debug' };

  try {
    // === STEP 1: Parse body ===
    const body = await parseBody(req);
    debug.steps.push({
      step: 'parse_body',
      hasBody: Object.keys(body).length > 0,
      keys: Object.keys(body),
      rawBodyType: typeof req.body,
    });

    // === STEP 2: Extrair token ===
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '');
    debug.steps.push({
      step: 'extract_token',
      hasAuthHeader: !!authHeader,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
    });

    if (!token) {
      return res.status(401).json({ error: 'No token', debug });
    }

    // === STEP 3: Verificar usuário via Supabase Auth ===
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SERVICE_KEY,
      },
    });
    const userText = await userRes.text();
    debug.steps.push({
      step: 'verify_user',
      status: userRes.status,
      responsePreview: userText.substring(0, 300),
    });

    if (!userRes.ok) {
      return res.status(401).json({
        error: 'Token validation failed',
        supabaseError: userText.substring(0, 200),
        debug,
      });
    }

    const userData = JSON.parse(userText);
    const uid = userData.id;
    debug.steps.push({ step: 'user_id', uid });

    // === STEP 4: Verificar role via RPC ===
    const roleRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_role_bypass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ uid }),
    });
    const roleText = await roleRes.text();
    debug.steps.push({
      step: 'check_role',
      status: roleRes.status,
      rawResponse: roleText.substring(0, 300),
      rawType: typeof roleText,
    });

    // ATENÇÃO: aqui pode estar o problema!
    // A RPC pode retornar "admin" (com aspas), admin, ["admin"], etc.
    let role = roleText;
    try {
      const parsed = JSON.parse(roleText);
      // Se retornou string direta
      if (typeof parsed === 'string') role = parsed;
      // Se retornou array
      else if (Array.isArray(parsed) && parsed.length > 0) role = parsed[0];
      // Se retornou objeto
      else if (typeof parsed === 'object' && parsed !== null) role = JSON.stringify(parsed);
    } catch {
      role = roleText.replace(/"/g, '').trim();
    }

    debug.steps.push({
      step: 'parsed_role',
      role,
      isAdmin: role === 'admin',
    });

    if (role !== 'admin') {
      return res.status(403).json({
        error: 'Not admin',
        roleReceived: role,
        debug,
      });
    }

    // === STEP 5: Se chegou aqui, está autenticado como admin ===
    // Retorna o debug por enquanto, sem criar usuário
    return res.status(200).json({
      success: true,
      message: 'Auth OK - admin confirmed',
      bodyReceived: body,
      debug,
    });

  } catch (err) {
    debug.steps.push({
      step: 'exception',
      message: err.message,
      stack: err.stack?.substring(0, 300),
    });
    return res.status(500).json({ error: 'Internal error', debug });
  }
}
