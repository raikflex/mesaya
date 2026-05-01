import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

/**
 * Helper para usar dentro del middleware.ts de cada app Next.
 *
 * Refresca el token de Supabase en cada request y deja las cookies
 * actualizadas en la respuesta. Sin esto, el SSR ve sesiones expiradas.
 *
 * Uso:
 *   // app/middleware.ts
 *   import { updateSession } from '@mesaya/database/middleware';
 *   export async function middleware(request: NextRequest) {
 *     return updateSession(request);
 *   }
 *   export const config = { matcher: ['/((?!_next/static|_next/image|favicon).*)'] };
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Llama getUser() para forzar refresh del token si está cerca de expirar.
  // El resultado lo descartamos aquí (la página se encargará de leerlo).
  await supabase.auth.getUser();

  return supabaseResponse;
}
