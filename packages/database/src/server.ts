import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * IMPORTANTE: usa las cookies del request actual. Por eso es async.
 * No reuses la instancia entre requests.
 *
 * Uso en RSC:
 *   import { createClient } from '@mesaya/database/server';
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Si esto se llama desde un Server Component (no Action), Next
            // bloquea la mutación de cookies. El middleware ya las refresca,
            // así que ignorar aquí es seguro.
          }
        },
      },
    },
  );
}
