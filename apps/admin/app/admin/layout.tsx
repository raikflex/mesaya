import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

/**
 * Layout de toda la zona /admin. Garantiza:
 *   1. Hay sesión activa (usuario logueado)
 *   2. El usuario tiene perfil con rol=dueno
 *
 * Decisión: NO redirigimos aquí si falta restaurante_id (eso lo hace cada
 * sub-ruta), porque el onboarding mismo vive en /admin/onboarding y no
 * podríamos entrar.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, rol, restaurante_id, nombre_completo')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) {
    // Cuenta auth sin perfil. Estado raro — sacamos al signup donde el
    // server action lo crea de forma idempotente.
    redirect('/signup');
  }

  if (perfil.rol !== 'dueno') {
    // Mesero o cocina logueados aquí: van a la app de staff.
    redirect(process.env.NEXT_PUBLIC_STAFF_URL ?? '/');
  }

  return <>{children}</>;
}
