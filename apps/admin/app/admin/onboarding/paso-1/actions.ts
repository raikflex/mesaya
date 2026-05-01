'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

/**
 * Validación de NIT colombiano simplificada para v1: solo dígitos,
 * 9–10 dígitos, sin guion ni dígito de verificación. Validación rigurosa
 * (algoritmo del DV) la dejamos para una sesión posterior.
 */
const nitSchema = z
  .string()
  .trim()
  .regex(/^\d{9,10}$/, 'NIT debe tener 9 o 10 dígitos, sin guion')
  .or(z.literal(''))
  .transform((v) => (v === '' ? null : v));

const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Color inválido')
  .default('#c0432e');

const businessSchema = z.object({
  nombre_publico: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres'),
  nit: nitSchema,
  direccion: z
    .string()
    .trim()
    .max(160, 'Máximo 160 caracteres')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
  color_marca: colorSchema,
});

export type Paso1State = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof businessSchema>, string>>;
};

export async function guardarDatosNegocio(
  _prev: Paso1State,
  formData: FormData,
): Promise<Paso1State> {
  const parsed = businessSchema.safeParse({
    nombre_publico: formData.get('nombre_publico'),
    nit: formData.get('nit') ?? '',
    direccion: formData.get('direccion') ?? '',
    color_marca: formData.get('color_marca') ?? '#c0432e',
  });

  if (!parsed.success) {
    const fieldErrors: Paso1State['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof businessSchema>;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a iniciar.' };

  // Si el dueño ya creó el restaurante (p.ej. recargó), reusa el id.
  const { data: perfilExistente } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  let restauranteId = perfilExistente?.restaurante_id ?? null;

  if (restauranteId) {
    // Update del existente (idempotente si vuelve a este paso).
    const { error: updateError } = await supabase
      .from('restaurantes')
      .update({
        nombre_publico: parsed.data.nombre_publico,
        nit: parsed.data.nit,
        direccion: parsed.data.direccion,
        color_marca: parsed.data.color_marca,
      })
      .eq('id', restauranteId);

    if (updateError) {
      return {
        ok: false,
        error: 'No pudimos guardar los cambios. Detalle: ' + updateError.message,
      };
    }
  } else {
    // Crear el restaurante. estado='archivado' (no 'activo') hasta que termine
    // el wizard según las reglas de activación de la sección 9.
    const { data: nuevo, error: insertError } = await supabase
      .from('restaurantes')
      .insert({
        nombre_publico: parsed.data.nombre_publico,
        nit: parsed.data.nit,
        direccion: parsed.data.direccion,
        color_marca: parsed.data.color_marca,
        estado: 'archivado',
        timezone: 'America/Bogota',
        usa_meseros: true, // default; se ajusta en paso 2
        dias_operacion: [],
      })
      .select('id')
      .single();

    if (insertError || !nuevo) {
      return {
        ok: false,
        error:
          'No pudimos crear el restaurante. ' +
          'Verifica que las migraciones estén aplicadas. ' +
          (insertError ? 'Detalle: ' + insertError.message : ''),
      };
    }

    restauranteId = nuevo.id;

    // Vincular al perfil del dueño.
    const { error: linkError } = await supabase
      .from('perfiles')
      .update({ restaurante_id: restauranteId })
      .eq('id', user.id);

    if (linkError) {
      return {
        ok: false,
        error:
          'Restaurante creado pero no se vinculó a tu perfil. ' +
          'Recarga la página o contacta soporte. Detalle: ' +
          linkError.message,
      };
    }
  }

  redirect('/admin/onboarding/paso-2');
}
