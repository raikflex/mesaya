import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Solo el dueño puede entrar a /admin. Meseros y cocina van a sus apps respectivas.
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  // Si tiene perfil pero no es dueño, no puede entrar a /admin.
  // (En S3 los redirigimos a su app: staff.mesaya.co o cocina.mesaya.co).
  if (perfil && perfil.rol !== 'dueno') {
    redirect('/login?error=acceso-denegado');
  }

  // Si no tiene perfil, está en mitad del onboarding (eso lo maneja /admin/onboarding).
  return <>{children}</>;
}
