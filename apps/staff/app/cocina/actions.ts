'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

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
  pendiente: ['en_preparacion', 'lista', 'cancelada'],
  en_preparacion: ['lista', 'cancelada'],
  lista: [],
  entregada: [],
  cancelada: [],
};

const ROLES_COCINA = new Set([
  'cocina',
  'cocinero',
  'chef',
  'dueno',
  'dueño',
  'admin',
]);

async function validarStaffCocina(): Promise<
  | { ok: true; perfilId: string; restauranteId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No tienes sesión activa.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) return { ok: false, error: 'No encontramos tu perfil.' };

  const rol = String(perfil.rol).toLowerCase().trim();
  if (!ROLES_COCINA.has(rol)) {
    return { ok: false, error: 'No tienes permiso para cambiar estados.' };
  }

  return {
    ok: true,
    perfilId: perfil.id as string,
    restauranteId: perfil.restaurante_id as string,
  };
}

export async function cambiarEstadoComanda(input: {
  comandaId: string;
  nuevoEstado: EstadoComanda;
}): Promise<CambiarEstadoResultado> {
  const validacion = await validarStaffCocina();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, estado, restaurante_id')
    .eq('id', input.comandaId)
    .maybeSingle();
  if (!comanda) {
    return { ok: false, error: 'No encontramos esa comanda.' };
  }
  if (comanda.restaurante_id !== validacion.restauranteId) {
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

  const { error: errorUpdate, data: updateData } = await supabase
    .from('comandas')
    .update({ estado: input.nuevoEstado })
    .eq('id', input.comandaId)
    .select('id');

  if (errorUpdate) {
    return {
      ok: false,
      error: 'No pudimos actualizar la comanda. ' + errorUpdate.message,
    };
  }

  if (!updateData || updateData.length === 0) {
    return {
      ok: false,
      error: 'El cambio no se aplicó. Posible problema de permisos.',
    };
  }

  revalidatePath('/cocina');
  return { ok: true };
}

/**
 * Cancela una comanda con un motivo visible al cliente. Se usa cuando la
 * cocina no puede preparar el pedido (sin ingredientes, error, etc).
 * El cliente lo ve en realtime en su pantalla de pedido.
 */
export async function cancelarComanda(input: {
  comandaId: string;
  motivo: string;
}): Promise<CambiarEstadoResultado> {
  const motivo = input.motivo.trim();
  if (motivo.length < 3) {
    return { ok: false, error: 'Escribe un motivo claro (mínimo 3 caracteres).' };
  }
  if (motivo.length > 200) {
    return { ok: false, error: 'El motivo es demasiado largo (máximo 200).' };
  }

  const validacion = await validarStaffCocina();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, estado, restaurante_id')
    .eq('id', input.comandaId)
    .maybeSingle();
  if (!comanda) return { ok: false, error: 'No encontramos esa comanda.' };
  if (comanda.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esta comanda no es de tu restaurante.' };
  }

  const estadoActual = comanda.estado as EstadoComanda;
  if (estadoActual === 'entregada' || estadoActual === 'cancelada') {
    return {
      ok: false,
      error: `No puedes cancelar una comanda ${estadoActual}.`,
    };
  }

  const { error: errorUpdate, data: updateData } = await supabase
    .from('comandas')
    .update({
      estado: 'cancelada',
      motivo_cancelacion: motivo,
    })
    .eq('id', input.comandaId)
    .select('id');

  if (errorUpdate) {
    return {
      ok: false,
      error: 'No pudimos cancelar la comanda. ' + errorUpdate.message,
    };
  }
  if (!updateData || updateData.length === 0) {
    return {
      ok: false,
      error: 'El cambio no se aplicó. Posible problema de permisos.',
    };
  }

  revalidatePath('/cocina');
  return { ok: true };
}
