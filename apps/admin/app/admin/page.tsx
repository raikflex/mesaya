import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { Button } from '@mesaya/ui';
import { logout } from '../actions/auth';

export const metadata = { title: 'Panel' };

export default async function AdminHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, nombre')
    .eq('id', user.id)
    .single();

  if (!perfil?.restaurante_id) {
    redirect('/admin/onboarding/paso-1');
  }

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico, estado')
    .eq('id', perfil.restaurante_id)
    .single();

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <p
              className="text-xs uppercase tracking-[0.16em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Panel
            </p>
            <h1
              className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.02em] mt-1"
              style={{ color: 'var(--color-ink)' }}
            >
              {restaurante?.nombre_publico ?? 'Tu restaurante'}
            </h1>
          </div>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Cerrar sesión
            </Button>
          </form>
        </header>

        <div
          className="rounded-[var(--radius-lg)] border p-6 max-w-md"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-paper)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            Hola, <strong>{perfil.nombre}</strong>. Tu restaurante está en estado{' '}
            <span
              className="inline-block px-2 py-0.5 rounded text-xs uppercase tracking-wide"
              style={{
                background: 'var(--color-paper-deep)',
                color: 'var(--color-ink)',
              }}
            >
              {restaurante?.estado}
            </span>
            .
          </p>
          <p className="text-sm mt-3" style={{ color: 'var(--color-muted)' }}>
            El dashboard completo se construye en la sesión 4. Por ahora ya tienes
            restaurante creado y onboarding completo.
          </p>
        </div>
      </div>
    </main>
  );
}
