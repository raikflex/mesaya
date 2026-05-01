'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

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
  nombre_publico: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
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

  const datos = parsed.data;

  const { data: perfilExistente } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (perfilExistente?.restaurante_id) {
    const { error: updateError } = await supabase
      .from('restaurantes')
      .update({
        nombre_publico: datos.nombre_publico,
        nit: datos.nit,
        direccion: datos.direccion,
        color_marca: datos.color_marca,
      })
      .eq('id', perfilExistente.restaurante_id);

    if (updateError) {
      return {
        ok: false,
        error: 'No pudimos guardar los cambios. Detalle: ' + updateError.message,
      };
    }
    redirect('/admin/onboarding/paso-2');
  }

  const admin = createServiceClient();

  const { data: nuevoRest, error: insertRestError } = await admin
    .from('restaurantes')
    .insert({
      dueno_user_id: user.id,
      nombre_publico: datos.nombre_publico,
      nit: datos.nit,
      direccion: datos.direccion,
      color_marca: datos.color_marca,
      estado: 'archivado',
    })
    .select('id')
    .single();

  if (insertRestError || !nuevoRest) {
    return {
      ok: false,
      error:
        'No pudimos crear el restaurante. Verifica que las migraciones estén aplicadas. ' +
        (insertRestError ? 'Detalle: ' + insertRestError.message : ''),
    };
  }

  const meta = user.user_metadata as { nombre?: string } | undefined;
  const nombreUsuario = meta?.nombre ?? user.email?.split('@')[0] ?? 'Dueño';

  const { error: insertPerfilError } = await admin.from('perfiles').insert({
    id: user.id,
    restaurante_id: nuevoRest.id,
    rol: 'dueno',
    nombre: nombreUsuario,
    activo: true,
  });

  if (insertPerfilError) {
    return {
      ok: false,
      error:
        'Restaurante creado pero no se pudo crear tu perfil. Detalle: ' +
        insertPerfilError.message,
    };
  }

  redirect('/admin/onboarding/paso-2');
}
