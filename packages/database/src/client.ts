import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = (globalThis as any).process?.env?.['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = (globalThis as any).process?.env?.['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!url || !anonKey) {
    throw new Error('Faltan variables de entorno de Supabase.');
  }
  return createBrowserClient(url, anonKey);
}
