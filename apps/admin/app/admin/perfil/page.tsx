import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { PerfilForm } from './perfil-form';

export const metadata = { title: 'Mi perfil' };

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) redirect('/admin/onboarding/paso-1');

  // Nombre del negocio para mostrar en el sidebar
  let nombreNegocio = 'Tu restaurante';
  if (perfil.restaurante_id) {
    const { data: restaurante } = await supabase
      .from('restaurantes')
      .select('nombre_publico')
      .eq('id', perfil.restaurante_id as string)
      .maybeSingle();
    if (restaurante?.nombre_publico) {
      nombreNegocio = restaurante.nombre_publico as string;
    }
  }

  return (
    <PanelShell currentPage="perfil" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-2xl mx-auto">
        <header className="mb-10">
          <p
            className="text-xs uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--color-muted)' }}
          >
            Mi cuenta
          </p>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Mi{' '}
            <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
              perfil
            </em>
            .
          </h1>
          <p
            className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Actualizá tu nombre, correo o contraseña.
          </p>
        </header>

        <PerfilForm
          initialNombre={(perfil.nombre as string) ?? ''}
          initialEmail={user.email ?? ''}
          rol={perfil.rol as 'dueno' | 'mesero' | 'cocina'}
        />
      </main>
    </PanelShell>
  );
}