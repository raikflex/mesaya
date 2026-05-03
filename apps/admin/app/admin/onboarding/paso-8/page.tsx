import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { EquipoManager } from './equipo-manager';

export const metadata = { title: 'Paso 8 · Equipo' };

type MiembroEquipo = {
  id: string;
  nombre: string;
  rol: 'mesero' | 'cocina';
};

export default async function Paso8Page() {
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

  const { data: equipo } = await supabase
    .from('perfiles')
    .select('id, nombre, rol')
    .eq('restaurante_id', perfil.restaurante_id as string)
    .neq('rol', 'dueno')
    .order('rol', { ascending: true });

  const miembros: MiembroEquipo[] = (equipo ?? []).map((p) => ({
    id: p.id as string,
    nombre: p.nombre as string,
    rol: p.rol as 'mesero' | 'cocina',
  }));

  return (
    <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-3xl mx-auto">
      <header className="mb-10">
        <p
          className="text-xs uppercase tracking-[0.16em] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Paso 8 de 8
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          Tu{' '}
          <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
            equipo
          </em>
          .
        </h1>
        <p
          className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Crea cuentas para los meseros y la cocina. Cada uno entrará desde su celular o
          tablet con el correo y la contraseña que le entregues.
        </p>
      </header>

      <EquipoManager miembros={miembros} />
    </main>
  );
}
