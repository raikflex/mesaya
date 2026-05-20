'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

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

/* ============ CATEGORIAS ============ */

const categoriaNombreSchema = z.object({
  nombre: z.string().trim().min(2, 'Minimo 2 caracteres').max(60, 'Maximo 60'),
});

export type CategoriaState = {
  ok: boolean;
  error?: string;
  fieldErrors?: { nombre?: string };
};

export async function agregarCategoria(
  _prev: CategoriaState,
  formData: FormData,
): Promise<CategoriaState> {
  const parsed = categoriaNombreSchema.safeParse({ nombre: formData.get('nombre') });
  if (!parsed.success) {
    return { ok: false, fieldErrors: { nombre: parsed.error.issues[0]?.message } };
  }

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return { ok: false, error: 'Tu sesion expiro.' };

  const { data: existentes } = await supabase
    .from('categorias')
    .select('orden')
    .eq('restaurante_id', restauranteId)
    .order('orden', { ascending: false })
    .limit(1);

  const siguienteOrden = (existentes?.[0]?.orden ?? 0) + 1;

  const { error } = await supabase.from('categorias').insert({
    restaurante_id: restauranteId,
    nombre: parsed.data.nombre,
    orden: siguienteOrden,
    activa: true,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/menu');
  return { ok: true };
}

export async function renombrarCategoria(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!id || nombre.length < 2 || nombre.length > 60) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase
    .from('categorias')
    .update({ nombre })
    .eq('id', id)
    .eq('restaurante_id', restauranteId);

  revalidatePath('/admin/menu');
}

export async function eliminarCategoria(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase
    .from('categorias')
    .update({ activa: false })
    .eq('id', id)
    .eq('restaurante_id', restauranteId);

  revalidatePath('/admin/menu');
}

/* ============ PRODUCTOS ============ */

// Tiempo opcional. Si llega vacio, queda como null (usa fallback global del restaurante).
// Si llega valor, validar entre 1 y 240.
const tiempoSchema = z
  .union([z.literal(''), z.coerce.number().int().min(1).max(240)])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

const productoSchema = z.object({
  nombre: z.string().trim().min(2, 'Minimo 2 caracteres').max(80, 'Maximo 80'),
  precio: z.coerce.number().int('Solo enteros').min(0, 'Minimo 0'),
  categoria_id: z.string().uuid('Categoria invalida'),
  descripcion: z.string().trim().max(200, 'Maximo 200').optional().or(z.literal('')),
  tiempo_preparacion_min: tiempoSchema,
});

export type ProductoState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<
    Record<'nombre' | 'precio' | 'categoria_id' | 'descripcion' | 'tiempo_preparacion_min', string>
  >;
};

export async function agregarProducto(
  _prev: ProductoState,
  formData: FormData,
): Promise<ProductoState> {
  const parsed = productoSchema.safeParse({
    nombre: formData.get('nombre'),
    precio: formData.get('precio'),
    categoria_id: formData.get('categoria_id'),
    descripcion: formData.get('descripcion'),
    tiempo_preparacion_min: formData.get('tiempo_preparacion_min'),
  });

  if (!parsed.success) {
    const fieldErrors: ProductoState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProductoState['fieldErrors']>;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return { ok: false, error: 'Tu sesion expiro.' };

  const { error } = await supabase.from('productos').insert({
    restaurante_id: restauranteId,
    categoria_id: parsed.data.categoria_id,
    nombre: parsed.data.nombre,
    precio: parsed.data.precio,
    descripcion: parsed.data.descripcion || null,
    tiempo_preparacion_min: parsed.data.tiempo_preparacion_min,
    disponible: true,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath('/admin/menu');
  return { ok: true };
}

export async function actualizarProducto(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const campo = String(formData.get('campo') ?? '');
  const valor = formData.get('valor');
  if (!id || !campo) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const update: Record<string, unknown> = {};
  if (campo === 'nombre') {
    const nombre = String(valor ?? '').trim();
    if (nombre.length < 2 || nombre.length > 80) return;
    update.nombre = nombre;
  } else if (campo === 'precio') {
    const precio = parseInt(String(valor ?? ''), 10);
    if (Number.isNaN(precio) || precio < 0) return;
    update.precio = precio;
  } else if (campo === 'categoria_id') {
    const categoria_id = String(valor ?? '');
    if (!categoria_id) return;
    update.categoria_id = categoria_id;
  } else if (campo === 'tiempo_preparacion_min') {
    const raw = String(valor ?? '').trim();
    if (raw === '') {
      update.tiempo_preparacion_min = null;
    } else {
      const t = parseInt(raw, 10);
      if (Number.isNaN(t) || t < 1 || t > 240) return;
      update.tiempo_preparacion_min = t;
    }
  } else {
    return;
  }

  await supabase.from('productos').update(update).eq('id', id).eq('restaurante_id', restauranteId);

  revalidatePath('/admin/menu');
}

export async function toggleDisponible(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const disponibleRaw = String(formData.get('disponible') ?? '');
  const disponible = disponibleRaw === 'true';
  if (!id) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase
    .from('productos')
    .update({ disponible })
    .eq('id', id)
    .eq('restaurante_id', restauranteId);

  revalidatePath('/admin/menu');
}

export async function eliminarProducto(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase.from('productos').delete().eq('id', id).eq('restaurante_id', restauranteId);

  revalidatePath('/admin/menu');
}
