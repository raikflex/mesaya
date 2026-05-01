import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

export const metadata = { title: 'Panel' };

export default async function AdminHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signup');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .single();

  if (!perfil?.restaurante_id) {
    redirect('/admin/onboarding/paso-1');
  }

  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="text-center max-w-md space-y-4">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Panel
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          El dashboard se construye en la sesión 4. Por ahora ya tienes restaurante creado.
        </p>
      </div>
    </main>
  );
}
