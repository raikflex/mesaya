import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

/**
 * Entry point. Decide a dónde mandar al usuario:
 *   - Sin sesión → /signup
 *   - Con sesión, sin perfil → /signup (no debería pasar pero por seguridad)
 *   - Con sesión y perfil sin restaurante asignado → onboarding paso 1
 *   - Con sesión y restaurante completo → /admin
 */
export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil || !perfil.restaurante_id) {
    redirect('/admin/onboarding/paso-1');
  }

  redirect('/admin');
}
