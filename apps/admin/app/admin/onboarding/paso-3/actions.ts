'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

const DIAS_VALIDOS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;

// Mapping slug <-> dia_semana (0=Dom, 1=Lun, ..., 6=Sab — convencion JS Date.getDay)
const SLUG_A_DIA: Record<(typeof DIAS_VALIDOS)[number], number> = {
  dom: 0,
  lun: 1,
  mar: 2,
  mie: 3,
  jue: 4,
  vie: 5,
  sab: 6,
};

const horaSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Hora invalida')
  .transform((v) => `${v}:00`);

const schema = z
  .object({
    horario_apertura: horaSchema,
    horario_cierre: horaSchema,
    dias_operacion: z.array(z.enum(DIAS_VALIDOS)).min(1, 'Elige al menos un dia'),
  })
  .refine((data) => data.horario_apertura !== data.horario_cierre, {
    message: 'La hora de apertura y cierre no pueden ser iguales',
    path: ['horario_cierre'],
  });

export type Paso3State = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'horario_apertura' | 'horario_cierre' | 'dias_operacion', string>>;
};

export async function guardarHorario(_prev: Paso3State, formData: FormData): Promise<Paso3State> {
  const dias = formData.getAll('dias_operacion').map(String);

  const parsed = schema.safeParse({
    horario_apertura: formData.get('horario_apertura'),
    horario_cierre: formData.get('horario_cierre'),
    dias_operacion: dias,
  });

  if (!parsed.success) {
    const fieldErrors: Paso3State['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'horario_apertura' || key === 'horario_cierre' || key === 'dias_operacion') {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  // Verificar dueno via tabla perfiles (cliente normal)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Tu sesion expiro. Vuelve a iniciar.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id || perfil.rol !== 'dueno') {
    return { ok: false, error: 'Solo el dueno puede guardar el horario.' };
  }

  const datos = parsed.data;
  const restauranteId = perfil.restaurante_id as string;

  // Set de dias seleccionados (en numero) para lookup O(1)
  const diasSeleccionados = new Set(datos.dias_operacion.map((slug) => SLUG_A_DIA[slug]));

  // Construir 7 filas (una por dia de la semana)
  // - dias seleccionados: abierto=true con las horas del form
  // - dias no seleccionados: abierto=false con horas null (cumple el CHECK constraint)
  const filas = [0, 1, 2, 3, 4, 5, 6].map((dia) => {
    const abierto = diasSeleccionados.has(dia);
    return {
      restaurante_id: restauranteId,
      dia_semana: dia,
      abierto,
      hora_apertura: abierto ? datos.horario_apertura : null,
      hora_cierre: abierto ? datos.horario_cierre : null,
    };
  });

  // UPSERT con service client (bypass RLS — no hay policies de INSERT/UPDATE)
  const admin = createServiceClient();
  const { error } = await admin
    .from('horarios_atencion')
    .upsert(filas, { onConflict: 'restaurante_id,dia_semana' });

  if (error) {
    return { ok: false, error: 'No pudimos guardar. Detalle: ' + error.message };
  }

  redirect('/admin/onboarding/paso-4');
}
