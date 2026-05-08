// =============================================================================
// API KEEP-ALIVE - Prevents Supabase free tier from sleeping (1 week inactivity)
// =============================================================================
// GET /api/keep-alive — Called daily by Vercel cron

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase env vars' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('app_config').select('key').limit(1);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
}
