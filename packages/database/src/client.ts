import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Cliente de Supabase para Client Components.
 * Lee/escribe cookies del navegador automáticamente.
 *
 * Uso:
 *   'use client';
 *   import { createClient } from '@mesaya/database/client';
 *   const supabase = createClient();
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
