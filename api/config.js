/**
 * /api/config.js — Vercel Serverless Function
 *
 * Serve as credenciais do Supabase via variáveis de ambiente do servidor.
 * Nunca expostas no HTML ou no repositório Git.
 *
 * Variáveis obrigatórias no Vercel Dashboard:
 *   SUPABASE_URL      → https://xxxx.supabase.co
 *   SUPABASE_ANON_KEY → eyJ...
 *
 * Segurança aplicada:
 *   - Só responde a GET
 *   - CORS restrito à própria origem (sem acesso cross-domain)
 *   - Cache-Control: no-store (não fica em cache de CDN/browser)
 *   - Se as vars não estiverem configuradas, retorna 500 (falha segura)
 */
export default function handler(req, res) {
  // Só aceita GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  // Falha segura — se as vars não estiverem no Vercel, não expõe nada
  if (!url || !key) {
    console.error('[/api/config] SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas');
    return res.status(500).json({ error: 'Configuração do servidor incompleta' });
  }

  // Headers de segurança
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  return res.status(200).json({
    supabaseUrl: url,
    supabaseAnonKey: key,
  });
}

