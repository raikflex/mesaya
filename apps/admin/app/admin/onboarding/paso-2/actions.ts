'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

const schema = z.object({
  usa_meseros: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export type Paso2State = {
  ok: boolean;
  error?: string;
};

export async function guardarUsaMeseros(
  _prev: Paso2State,
  formData: FormData,
): Promise<Paso2State> {
  const parsed = schema.safeParse({
    usa_meseros: formData.get('usa_meseros'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Selecciona una opción.' };
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
    return { ok: false, error: 'Falta completar el paso 1 del onboarding.' };
  }

  const { error } = await supabase
    .from('restaurantes')
    .update({ usa_meseros: parsed.data.usa_meseros })
    .eq('id', perfil.restaurante_id);

  if (error) {
    return { ok: false, error: 'No pudimos guardar. Detalle: ' + error.message };
  }

  redirect('/admin/onboarding/paso-3');
}
