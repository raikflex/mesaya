'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

const configSchema = z.object({
  nombre_publico: z.string().trim().min(2, 'Minimo 2 caracteres').max(80, 'Maximo 80 caracteres'),
  color_marca: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color invalido (debe ser hex como #9a3f6b)'),
  // Coerce a boolean. FormData manda 'on' cuando el toggle esta activo,
  // o 'off' cuando esta desactivado.
  cocina_activa: z
    .union([z.literal('on'), z.literal('off'), z.null(), z.undefined()])
    .transform((v) => v === 'on'),
  acepta_domicilios: z
    .union([z.literal('on'), z.literal('off'), z.null(), z.undefined()])
    .transform((v) => v === 'on'),
  acepta_pickup: z
    .union([z.literal('on'), z.literal('off'), z.null(), z.undefined()])
    .transform((v) => v === 'on'),
  // Slug: minusculas, numeros y guiones. Vacio permitido (si no ofrece pedidos online).
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(40, 'Maximo 40 caracteres')
    .regex(/^[a-z0-9-]*$/, 'Solo letras sin acentos, numeros y guiones (ej: cafe-cumbre)')
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type GuardarConfigState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<
      'nombre_publico' | 'color_marca' | 'cocina_activa' | 'acepta_domicilios' | 'acepta_pickup' | 'slug',
      string
    >
  >;
};

export async function guardarConfig(
  _prev: GuardarConfigState,
  formData: FormData,
): Promise<GuardarConfigState> {
  const parsed = configSchema.safeParse({
    nombre_publico: formData.get('nombre_publico'),
    color_marca: formData.get('color_marca'),
    cocina_activa: formData.get('cocina_activa') ?? 'off',
    acepta_domicilios: formData.get('acepta_domicilios') ?? 'off',
    acepta_pickup: formData.get('acepta_pickup') ?? 'off',
    slug: formData.get('slug') ?? '',
  });

  if (!parsed.success) {
    const fieldErrors: GuardarConfigState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<GuardarConfigState['fieldErrors']>;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Tu sesion expiro.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id || perfil.rol !== 'dueno') {
    return { ok: false, error: 'No tienes permisos.' };
  }

  const restauranteId = perfil.restaurante_id as string;

  // Si activan cocina, validar que exista al menos una cuenta con rol cocina.
  if (parsed.data.cocina_activa) {
    const { count: cocineros } = await supabase
      .from('perfiles')
      .select('id', { count: 'exact', head: true })
      .eq('restaurante_id', restauranteId)
      .eq('rol', 'cocina');

    if (!cocineros || cocineros === 0) {
      return {
        ok: false,
        fieldErrors: {
          cocina_activa:
            'Necesitas crear una cuenta de cocina antes de activar la pantalla. Anda a Equipo y agrega una.',
        },
      };
    }
  }

  // Si ofrece pedidos online (domicilio o pickup), el slug es obligatorio.
  const ofrecePedidosOnline = parsed.data.acepta_domicilios || parsed.data.acepta_pickup;
  if (ofrecePedidosOnline && !parsed.data.slug) {
    return {
      ok: false,
      fieldErrors: {
        slug: 'Para recibir domicilios o pedidos para recoger, necesitas un enlace (ej: cafe-cumbre).',
      },
    };
  }

  // Si hay slug, validar que no este usado por OTRO restaurante.
  if (parsed.data.slug) {
    const { data: existente } = await supabase
      .from('restaurantes')
      .select('id')
      .eq('slug', parsed.data.slug)
      .neq('id', restauranteId)
      .maybeSingle();

    if (existente) {
      return {
        ok: false,
        fieldErrors: {
          slug: 'Ese enlace ya esta en uso por otro restaurante. Elegi otro.',
        },
      };
    }
  }

  const { error } = await supabase
    .from('restaurantes')
    .update({
      nombre_publico: parsed.data.nombre_publico,
      color_marca: parsed.data.color_marca,
      cocina_activa: parsed.data.cocina_activa,
      acepta_domicilios: parsed.data.acepta_domicilios,
      acepta_pickup: parsed.data.acepta_pickup,
      slug: parsed.data.slug,
    })
    .eq('id', restauranteId);

  if (error) {
    return { ok: false, error: 'No se pudo guardar. ' + error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/configuracion');
  return { ok: true };
}
