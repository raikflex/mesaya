'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Cambia el estado de una comanda. Solo la cocina (o el dueño) del restaurante
 * dueño de la comanda puede hacerlo.
 *
 * Transiciones válidas:
 *   pendiente → en_preparacion
 *   en_preparacion → lista
 *
 * Después de 'lista' la comanda queda esperando al mesero (S7). En esta sesión
 * el cocinero NO puede marcarlas como 'entregada'.
 */
export type EstadoComanda =
  | 'pendiente'
  | 'en_preparacion'
  | 'lista'
  | 'entregada'
  | 'cancelada';

export type CambiarEstadoResultado =
  | { ok: true }
  | { ok: false; error: string };

const TRANSICIONES_VALIDAS: Record<EstadoComanda, EstadoComanda[]> = {
  pendiente: ['en_preparacion', 'cancelada'],
  en_preparacion: ['lista', 'cancelada'],
  lista: [], // En S6 cocina no avanza desde 'lista'. Mesero lo hace en S7.
  entregada: [],
  cancelada: [],
};

export async function cambiarEstadoComanda(input: {
  comandaId: string;
  nuevoEstado: EstadoComanda;
}): Promise<CambiarEstadoResultado> {
  const supabase = await createClient();

  // Validar que el user es staff (cocina o dueño) del restaurante de esta comanda.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No tienes sesión activa.' };
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) {
    return { ok: false, error: 'No encontramos tu perfil.' };
  }

  const rol = perfil.rol as string;
  if (rol !== 'cocina' && rol !== 'dueno') {
    return { ok: false, error: 'No tienes permiso para cambiar estados.' };
  }

  // Cargar la comanda para validar transición y restaurante.
  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, estado, restaurante_id')
    .eq('id', input.comandaId)
    .maybeSingle();

  if (!comanda) {
    return { ok: false, error: 'No encontramos esa comanda.' };
  }

  if (comanda.restaurante_id !== perfil.restaurante_id) {
    return { ok: false, error: 'Esta comanda no es de tu restaurante.' };
  }

  const estadoActual = comanda.estado as EstadoComanda;
  const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] ?? [];

  if (!transicionesPermitidas.includes(input.nuevoEstado)) {
    return {
      ok: false,
      error: `No se puede pasar de "${estadoActual}" a "${input.nuevoEstado}".`,
    };
  }

  const { error } = await supabase
    .from('comandas')
    .update({ estado: input.nuevoEstado })
    .eq('id', input.comandaId);

  if (error) {
    return {
      ok: false,
      error: 'No pudimos actualizar la comanda. ' + error.message,
    };
  }

  revalidatePath('/cocina');
  return { ok: true };
}
