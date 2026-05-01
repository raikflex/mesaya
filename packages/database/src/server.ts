import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  const url = (globalThis as any).process?.env?.['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = (globalThis as any).process?.env?.['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!url || !anonKey) {
    throw new Error('Faltan variables de entorno de Supabase.');
  }
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    },
  });
}
