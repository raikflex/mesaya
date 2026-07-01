'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';

const ESTADOS_VALIDOS = ['pendiente', 'confirmado', 'entregado', 'cancelado'] as const;
type EstadoPedido = (typeof ESTADOS_VALIDOS)[number];

export type CambiarEstadoResultado = { ok: true } | { ok: false; error: string };

/**
 * Cambia el estado de un pedido programado. Usa el cliente autenticado de la
 * duena: las RLS (pp_update_propio) ya garantizan que solo puede tocar los
 * pedidos de su restaurante. Ademas re-verificamos el restaurante por defensa.
 */
export async function cambiarEstadoPedidoProgramado(
  pedidoId: string,
  nuevoEstado: EstadoPedido,
): Promise<CambiarEstadoResultado> {
  if (!ESTADOS_VALIDOS.includes(nuevoEstado)) {
    return { ok: false, error: 'Estado invalido.' };
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

  const { error } = await supabase
    .from('pedidos_programados')
    .update({ estado: nuevoEstado, actualizado_en: new Date().toISOString() })
    .eq('id', pedidoId)
    .eq('restaurante_id', perfil.restaurante_id as string);

  if (error) {
    return { ok: false, error: 'No se pudo actualizar: ' + error.message };
  }

  revalidatePath('/admin/domicilios-programados');
  return { ok: true };
}
