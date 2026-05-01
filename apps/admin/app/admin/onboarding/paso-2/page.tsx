import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { Paso2Form } from './paso-2-form';

export const metadata = { title: 'Paso 2 · ¿Usas meseros?' };

export default async function Paso2Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) {
    redirect('/admin/onboarding/paso-1');
  }

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('usa_meseros')
    .eq('id', perfil.restaurante_id)
    .single();

  return (
    <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-3xl mx-auto">
      <header className="mb-10">
        <p
          className="text-xs uppercase tracking-[0.16em] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Paso 2 de 8
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          ¿Usas{' '}
          <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
            meseros
          </em>
          ?
        </h1>
        <p
          className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Esto cambia cómo MesaYA atiende los pedidos. Lo puedes cambiar después si la
          operación de tu restaurante evoluciona.
        </p>
      </header>

      <Paso2Form initial={restaurante?.usa_meseros ?? true} />
    </main>
  );
}
