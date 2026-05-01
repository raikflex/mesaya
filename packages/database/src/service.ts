import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Cliente con SERVICE ROLE. Bypassea RLS.
 *
 * ⚠️  USAR ÚNICAMENTE EN:
 *   - Edge Functions de Supabase
 *   - Server Actions / Route Handlers que hagan tareas admin (jobs, suspensión
 *     por trial vencido, generación de QRs, etc.)
 *
 * NUNCA en Client Components, NUNCA expuesto al navegador.
 *
 * Si ves este import en un archivo con 'use client', es un bug crítico.
 */
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY no está definido. ' +
        'Este cliente solo funciona en runtime de servidor.',
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
