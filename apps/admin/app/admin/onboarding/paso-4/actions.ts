'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

const nombreSchema = z
  .string()
  .trim()
  .min(2, 'Mínimo 2 caracteres')
  .max(60, 'Máximo 60 caracteres');

async function getRestauranteId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, restauranteId: null as string | null };
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, restauranteId: perfil?.restaurante_id ?? null };
}

export type AddCategoriaState = {
  ok: boolean;
  error?: string;
  fieldError?: string;
};

export async function agregarCategoria(
  _prev: AddCategoriaState,
  formData: FormData,
): Promise<AddCategoriaState> {
  const parsed = nombreSchema.safeParse(formData.get('nombre'));
  if (!parsed.success) {
    return { ok: false, fieldError: parsed.error.issues[0]?.message ?? 'Nombre inválido' };
  }

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return { ok: false, error: 'Tu sesión expiró.' };

  const { data: maxOrden } = await supabase
    .from('categorias')
    .select('orden')
    .eq('restaurante_id', restauranteId)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();

  const siguienteOrden = (maxOrden?.orden ?? -1) + 1;

  const { error } = await supabase.from('categorias').insert({
    restaurante_id: restauranteId,
    nombre: parsed.data,
    orden: siguienteOrden,
    activa: true,
  });

  if (error) {
    return { ok: false, error: 'No pudimos agregar. Detalle: ' + error.message };
  }

  revalidatePath('/admin/onboarding/paso-4');
  return { ok: true };
}

export async function renombrarCategoria(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const parsed = nombreSchema.safeParse(formData.get('nombre'));
  if (!id || !parsed.success) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase
    .from('categorias')
    .update({ nombre: parsed.data })
    .eq('id', id)
    .eq('restaurante_id', restauranteId);

  revalidatePath('/admin/onboarding/paso-4');
}

export async function borrarCategoria(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  // Soft delete: activa=false. Mantiene histórico y FK de productos.
  await supabase
    .from('categorias')
    .update({ activa: false })
    .eq('id', id)
    .eq('restaurante_id', restauranteId);

  revalidatePath('/admin/onboarding/paso-4');
}

export async function reordenarCategoria(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const direccion = formData.get('direccion');
  if (!id || (direccion !== 'arriba' && direccion !== 'abajo')) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const { data: cats } = await supabase
    .from('categorias')
    .select('id, orden')
    .eq('restaurante_id', restauranteId)
    .eq('activa', true)
    .order('orden', { ascending: true });

  if (!cats) return;
  const idx = cats.findIndex((c) => c.id === id);
  if (idx === -1) return;

  const swapIdx = direccion === 'arriba' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= cats.length) return;

  const a = cats[idx]!;
  const b = cats[swapIdx]!;

  await Promise.all([
    supabase
      .from('categorias')
      .update({ orden: b.orden })
      .eq('id', a.id)
      .eq('restaurante_id', restauranteId),
    supabase
      .from('categorias')
      .update({ orden: a.orden })
      .eq('id', b.id)
      .eq('restaurante_id', restauranteId),
  ]);

  revalidatePath('/admin/onboarding/paso-4');
}

export async function avanzarAPaso5() {
  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) redirect('/login');

  const { count } = await supabase
    .from('categorias')
    .select('*', { count: 'exact', head: true })
    .eq('restaurante_id', restauranteId)
    .eq('activa', true);

  if (!count || count < 1) return;

  redirect('/admin/onboarding/paso-5');
}
