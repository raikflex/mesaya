'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

export type EmpezarAOperarState = {
  ok: boolean;
  error?: string;
};

/**
 * Activa el restaurante por primera vez.
 *
 * Cambia estado='archivado' → 'activo'.
 * Setea primer_activacion_en = now() (queda fijo, nunca se reescribe).
 * Setea trial_termina_en = now() + 15 days.
 *
 * Se invoca desde el panel cuando el dueño hace click en "Empezar a operar".
 */
export async function empezarAOperar(
  _prev: EmpezarAOperarState,
  _formData: FormData,
): Promise<EmpezarAOperarState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) {
    return { ok: false, error: 'No tienes un restaurante asociado.' };
  }
  if (perfil.rol !== 'dueno') {
    return { ok: false, error: 'Solo el dueño puede activar el restaurante.' };
  }

  // Validar el estado actual: solo desde 'archivado' se puede activar por primera vez.
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('estado, primer_activacion_en')
    .eq('id', perfil.restaurante_id as string)
    .single();

  if (!restaurante) {
    return { ok: false, error: 'No encontramos tu restaurante.' };
  }

  if (restaurante.estado === 'activo') {
    // Ya está activo, no hacemos nada — solo refrescamos.
    revalidatePath('/admin');
    return { ok: true };
  }

  if (restaurante.estado === 'suspendido') {
    return {
      ok: false,
      error:
        'Tu restaurante está suspendido. Para reactivar, comunícate con soporte (próximamente: pago en línea).',
    };
  }

  // Validar mínimos antes de activar (defensa en profundidad — el wizard ya garantiza esto).
  const checks = await Promise.all([
    supabase
      .from('categorias')
      .select('*', { count: 'exact', head: true })
      .eq('restaurante_id', perfil.restaurante_id as string)
      .eq('activa', true),
    supabase
      .from('productos')
      .select('*', { count: 'exact', head: true })
      .eq('restaurante_id', perfil.restaurante_id as string),
    supabase
      .from('mesas')
      .select('*', { count: 'exact', head: true })
      .eq('restaurante_id', perfil.restaurante_id as string),
    supabase
      .from('perfiles')
      .select('*', { count: 'exact', head: true })
      .eq('restaurante_id', perfil.restaurante_id as string)
      .eq('rol', 'cocina'),
  ]);

  const [categorias, productos, mesas, cocinas] = checks.map((r) => r.count ?? 0);

  const faltantes: string[] = [];
  if ((categorias ?? 0) < 1) faltantes.push('una categoría');
  if ((productos ?? 0) < 1) faltantes.push('un producto');
  if ((mesas ?? 0) < 1) faltantes.push('una mesa');
  if ((cocinas ?? 0) < 1) faltantes.push('una cuenta de cocina');

  if (faltantes.length > 0) {
    return {
      ok: false,
      error: `Te falta crear ${faltantes.join(', ')} antes de empezar.`,
    };
  }

  // Activar.
  const ahora = new Date();
  const trialFin = new Date(ahora);
  trialFin.setDate(trialFin.getDate() + 15);

  // primer_activacion_en solo se setea si era NULL (no sobrescribir reactivaciones futuras).
  const updatePayload: Record<string, unknown> = {
    estado: 'activo' as const,
    trial_termina_en: trialFin.toISOString(),
  };
  if (restaurante.primer_activacion_en === null) {
    updatePayload.primer_activacion_en = ahora.toISOString();
  }

  const { error } = await supabase
    .from('restaurantes')
    .update(updatePayload)
    .eq('id', perfil.restaurante_id as string);

  if (error) {
    return { ok: false, error: 'No pudimos activar. Detalle: ' + error.message };
  }

  revalidatePath('/admin');
  redirect('/admin?bienvenida=activo');
}
