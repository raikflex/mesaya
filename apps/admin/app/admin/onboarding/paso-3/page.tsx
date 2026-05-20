import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { Paso3Form } from './paso-3-form';

export const metadata = { title: 'Paso 3 - Horario' };

// Mapping dia_semana (0-6) -> slug
// 0=Dom, 1=Lun, ..., 6=Sab — convencion JS Date.getDay
const DIA_A_SLUG: Record<number, string> = {
  0: 'dom',
  1: 'lun',
  2: 'mar',
  3: 'mie',
  4: 'jue',
  5: 'vie',
  6: 'sab',
};

const DIAS_DEFAULT = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];

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

  // Leer filas de horarios_atencion para reconstruir el shape del form
  const { data: horarios } = await supabase
    .from('horarios_atencion')
    .select('dia_semana, abierto, hora_apertura, hora_cierre')
    .eq('restaurante_id', perfil.restaurante_id)
    .order('dia_semana');

  // Reconstruir defaults para el form
  let horarioApertura = '08:00';
  let horarioCierre = '22:00';
  let diasOperacion: string[] = DIAS_DEFAULT;

  if (horarios && horarios.length > 0) {
    const abiertos = horarios.filter((h) => h.abierto);

    // dias_operacion = slugs de los dias abiertos
    diasOperacion =
      abiertos.length > 0
        ? abiertos.map((h) => DIA_A_SLUG[h.dia_semana as number] ?? 'lun')
        : DIAS_DEFAULT;

    // horarios = tomar del primer dia abierto (el form solo soporta un horario comun)
    // Si el dueno edito horarios diferentes por dia en /admin/horarios, esa info
    // se preserva en la tabla aunque el form muestre solo el primero.
    const primerAbierto = abiertos[0];
    if (primerAbierto?.hora_apertura) {
      horarioApertura = (primerAbierto.hora_apertura as string).slice(0, 5);
    }
    if (primerAbierto?.hora_cierre) {
      horarioCierre = (primerAbierto.hora_cierre as string).slice(0, 5);
    }
  }

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
          Cuando un cliente escanee fuera de tu horario, vera una pantalla amable de "estamos
          cerrados" con tu proximo turno.
        </p>
      </header>

      <Paso3Form
        initial={{
          horario_apertura: horarioApertura,
          horario_cierre: horarioCierre,
          dias_operacion: diasOperacion,
        }}
      />
    </main>
  );
}
