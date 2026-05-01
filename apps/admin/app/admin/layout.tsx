import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

/**
 * Layout de toda la zona /admin. Garantiza que hay sesión activa.
 *
 * NO chequea perfil aquí porque el perfil se crea en paso-1 del onboarding
 * (junto con el restaurante, ya que perfiles.restaurante_id es NOT NULL).
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return <>{children}</>;
}
