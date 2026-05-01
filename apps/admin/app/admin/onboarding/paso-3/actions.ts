'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

const DIAS_VALIDOS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;

const horaSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Hora inválida')
  .transform((v) => `${v}:00`);

const schema = z
  .object({
    horario_apertura: horaSchema,
    horario_cierre: horaSchema,
    dias_operacion: z.array(z.enum(DIAS_VALIDOS)).min(1, 'Elige al menos un día'),
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

export async function guardarHorario(
  _prev: Paso3State,
  formData: FormData,
): Promise<Paso3State> {
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
      if (
        key === 'horario_apertura' ||
        key === 'horario_cierre' ||
        key === 'dias_operacion'
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) {
    return { ok: false, error: 'Falta completar el paso 1.' };
  }

  const datos = parsed.data;

  const { error } = await supabase
    .from('restaurantes')
    .update({
      horario_apertura: datos.horario_apertura,
      horario_cierre: datos.horario_cierre,
      dias_operacion: datos.dias_operacion,
    })
    .eq('id', perfil.restaurante_id);

  if (error) {
    return { ok: false, error: 'No pudimos guardar. Detalle: ' + error.message };
  }

  redirect('/admin/onboarding/paso-4');
}
