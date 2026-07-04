'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

async function getRestauranteId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, restauranteId: null as string | null };
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();
  if (perfil?.rol !== 'dueno') return { supabase, restauranteId: null };
  return { supabase, restauranteId: perfil?.restaurante_id ?? null };
}

const platoSchema = z.object({
  dia_semana: z.coerce.number().int().min(0).max(6),
  producto_id: z.preprocess(
    (v) => (typeof v === 'string' && v.length > 0 ? v : null),
    z.string().uuid('Producto invalido').nullable(),
  ),
  nombre: z.string().trim().min(2, 'Minimo 2 caracteres').max(80, 'Maximo 80'),
  precio: z.coerce.number().int('Solo enteros').min(0, 'Minimo 0'),
  descripcion: z.preprocess(
    (v) => (typeof v === 'string' && v.trim().length > 0 ? v.trim() : null),
    z.string().max(200, 'Maximo 200').nullable(),
  ),
});

export type PlatoDelDiaState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'nombre' | 'precio' | 'descripcion', string>>;
};

/** Crea o actualiza el plato del dia de un dia de la semana (upsert por dia). */
export async function guardarPlatoDelDia(formData: FormData): Promise<PlatoDelDiaState> {
  const parsed = platoSchema.safeParse({
    dia_semana: formData.get('dia_semana'),
    producto_id: formData.get('producto_id'),
    nombre: formData.get('nombre'),
    precio: formData.get('precio'),
    descripcion: formData.get('descripcion'),
  });

  if (!parsed.success) {
    const fieldErrors: PlatoDelDiaState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<PlatoDelDiaState['fieldErrors']>;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return { ok: false, error: 'Tu sesion expiro.' };

  // Si es un plato basado en un producto, validar que sea de este restaurante.
  if (parsed.data.producto_id) {
    const { data: prod } = await supabase
      .from('productos')
      .select('id')
      .eq('id', parsed.data.producto_id)
      .eq('restaurante_id', restauranteId)
      .maybeSingle();
    if (!prod) return { ok: false, error: 'Ese producto no es de tu menu.' };
  }

  const admin = createServiceClient();
  const { error } = await admin.from('platos_del_dia').upsert(
    {
      restaurante_id: restauranteId,
      dia_semana: parsed.data.dia_semana,
      producto_id: parsed.data.producto_id,
      nombre: parsed.data.nombre,
      descripcion: parsed.data.descripcion,
      precio: parsed.data.precio,
      activo: true,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'restaurante_id,dia_semana' },
  );

  if (error) return { ok: false, error: 'No se pudo guardar: ' + error.message };

  revalidatePath('/admin/menu');
  return { ok: true };
}

/** Muestra u oculta el plato del dia de un dia sin borrarlo. */
export async function togglePlatoDelDia(formData: FormData) {
  const dia = Number(formData.get('dia_semana'));
  const activo = String(formData.get('activo') ?? '') === 'true';
  if (Number.isNaN(dia) || dia < 0 || dia > 6) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();
  await admin
    .from('platos_del_dia')
    .update({ activo, actualizado_en: new Date().toISOString() })
    .eq('restaurante_id', restauranteId)
    .eq('dia_semana', dia);

  revalidatePath('/admin/menu');
}

/** Elimina por completo el plato del dia de un dia. */
export async function eliminarPlatoDelDia(formData: FormData) {
  const dia = Number(formData.get('dia_semana'));
  if (Number.isNaN(dia) || dia < 0 || dia > 6) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();
  await admin
    .from('platos_del_dia')
    .delete()
    .eq('restaurante_id', restauranteId)
    .eq('dia_semana', dia);

  revalidatePath('/admin/menu');
}
