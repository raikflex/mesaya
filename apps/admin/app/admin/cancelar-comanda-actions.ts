'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

export type CancelarComandaResultado = { ok: true } | { ok: false; error: string };

/**
 * Cancela una comanda activa (pendiente, en_preparacion, lista).
 *
 * - Setea estado = 'cancelada' y cancelada_en = NOW()
 * - Las comanda_items asociadas se quedan en BD pero ya no cuentan en
 *   totales (queries del dashboard filtran .neq('estado','cancelada'))
 * - La sesion sigue abierta para no romper otras comandas
 * - Usa service client (RLS no permite UPDATE arbitrario al rol dueno)
 */
export async function cancelarComanda(formData: FormData): Promise<CancelarComandaResultado> {
  const comandaId = String(formData.get('comandaId') ?? '');
  if (!comandaId) return { ok: false, error: 'Falta el ID de la comanda.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id || perfil.rol !== 'dueno') {
    return { ok: false, error: 'Solo el dueno puede cancelar pedidos.' };
  }

  const admin = createServiceClient();

  // Verificar que la comanda pertenece al restaurante del dueno y no esta
  // ya cancelada o pagada.
  const { data: comanda } = await admin
    .from('comandas')
    .select('restaurante_id, estado')
    .eq('id', comandaId)
    .maybeSingle();

  if (!comanda || comanda.restaurante_id !== perfil.restaurante_id) {
    return { ok: false, error: 'Comanda no encontrada.' };
  }

  if (comanda.estado === 'cancelada') {
    return { ok: false, error: 'La comanda ya esta cancelada.' };
  }

  const { error } = await admin
    .from('comandas')
    .update({
      estado: 'cancelada',
      cancelada_en: new Date().toISOString(),
    })
    .eq('id', comandaId);

  if (error) {
    return { ok: false, error: 'No pudimos cancelar: ' + error.message };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/mesas');
  revalidatePath('/admin/metricas');

  return { ok: true };
}
