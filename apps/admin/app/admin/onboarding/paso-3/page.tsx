import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { Paso3Form } from './paso-3-form';

export const metadata = { title: 'Paso 3 · Horario' };

export default async function Paso3Page() {
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

  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('horario_apertura, horario_cierre, dias_operacion')
    .eq('id', perfil.restaurante_id)
    .single();

  return (
    <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-3xl mx-auto">
      <header className="mb-10">
        <p
          className="text-xs uppercase tracking-[0.16em] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Paso 3 de 8
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          Tu{' '}
          <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
            horario
          </em>
          .
        </h1>
        <p
          className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Cuando un cliente escanee fuera de tu horario, verá una pantalla amable de "estamos
          cerrados" con tu próximo turno.
        </p>
      </header>

      <Paso3Form
        initial={{
          horario_apertura: (restaurante?.horario_apertura ?? '08:00:00').slice(0, 5),
          horario_cierre: (restaurante?.horario_cierre ?? '22:00:00').slice(0, 5),
          dias_operacion: restaurante?.dias_operacion ?? [
            'lun',
            'mar',
            'mie',
            'jue',
            'vie',
            'sab',
            'dom',
          ],
        }}
      />
    </main>
  );
}
