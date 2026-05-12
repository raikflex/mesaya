'use server';

import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

/**
 * Cierra la sesion de una mesa cuando un cliente abandona despues de que
 * su(s) comanda(s) fueron canceladas.
 *
 * Solo cierra la sesion si NO hay otras comandas activas (no canceladas) en
 * la misma sesion. Esto protege el caso de varios clientes en la misma mesa:
 * si otro cliente tiene comandas pendientes, la sesion sigue abierta.
 *
 * Devuelve true si efectivamente cerro la sesion, false si no hizo nada
 * (no encontro la mesa, no habia sesion abierta, o habia comandas activas).
 */
export async function cerrarSesionAbandonada(
  qrToken: string,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();

  // Buscar la mesa por qr_token
  const { data: mesa } = await supabase
    .from('mesas')
    .select('id')
    .eq('qr_token', qrToken)
    .is('borrada_en', null)
    .maybeSingle();

  if (!mesa) return { ok: false };

  // Buscar la sesion abierta de esa mesa
  const { data: sesion } = await supabase
    .from('sesiones')
    .select('id')
    .eq('mesa_id', mesa.id as string)
    .eq('estado', 'abierta')
    .maybeSingle();

  if (!sesion) return { ok: false };
  const sesionId = sesion.id as string;

  // Contar comandas activas (no canceladas) en la sesion
  const { count } = await supabase
    .from('comandas')
    .select('id', { count: 'exact', head: true })
    .eq('sesion_id', sesionId)
    .neq('estado', 'cancelada');

  if ((count ?? 0) > 0) {
    // Hay otros clientes con comandas activas: no cerrar.
    return { ok: false };
  }

  // Cerrar la sesion (RLS bloquea UPDATE desde anonimo, usamos service)
  const admin = createServiceClient();
  const { error } = await admin
    .from('sesiones')
    .update({
      estado: 'cerrada',
      cerrada_en: new Date().toISOString(),
    })
    .eq('id', sesionId)
    .eq('estado', 'abierta'); // race condition safe

  if (error) {
    return { ok: false };
  }

  return { ok: true };
}
