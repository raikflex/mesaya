import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const url = (globalThis as any).process?.env?.['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceKey = (globalThis as any).process?.env?.['SUPABASE_SERVICE_ROLE_KEY'];
  if (!url || !serviceKey) {
    throw new Error('Faltan variables de entorno de Supabase para service client.');
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
