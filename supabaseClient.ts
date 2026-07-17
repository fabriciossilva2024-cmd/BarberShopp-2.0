import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] URL ou ANON_KEY não configurados. Verifique o arquivo .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseKey);