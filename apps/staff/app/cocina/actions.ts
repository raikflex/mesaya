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
 * Después de 'lista' la comanda queda esperando al mesero.
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
  pendiente: ['en_preparacion', 'lista', 'cancelada'],
  en_preparacion: ['lista', 'cancelada'],
  lista: [],
  entregada: [],
  cancelada: [],
};

// Roles válidos para cambiar estados de comanda. Tolerante a variantes que
// puede haber introducido el wizard en distintas versiones.
const ROLES_COCINA = new Set([
  'cocina',
  'cocinero',
  'chef',
  'dueno',
  'dueño',
  'admin',
]);

export async function cambiarEstadoComanda(input: {
  comandaId: string;
  nuevoEstado: EstadoComanda;
}): Promise<CambiarEstadoResultado> {
  console.log('[cocina action] cambiarEstadoComanda input:', input);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  console.log('[cocina action] auth user:', user?.id, user?.email);

  if (!user) {
    return { ok: false, error: 'No tienes sesión activa.' };
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from('perfiles')
    .select('rol, restaurante_id, activo')
    .eq('id', user.id)
    .maybeSingle();

  console.log('[cocina action] perfil:', perfil, 'error:', errorPerfil);

  if (!perfil) {
    return { ok: false, error: 'No encontramos tu perfil.' };
  }

  const rol = String(perfil.rol).toLowerCase().trim();
  console.log('[cocina action] rol normalizado:', JSON.stringify(rol), 'es valido:', ROLES_COCINA.has(rol));

  if (!ROLES_COCINA.has(rol)) {
    return {
      ok: false,
      error: `Rol "${perfil.rol}" no autorizado. Roles válidos: ${[...ROLES_COCINA].join(', ')}`,
    };
  }

  const { data: comanda, error: errorComanda } = await supabase
    .from('comandas')
    .select('id, estado, restaurante_id')
    .eq('id', input.comandaId)
    .maybeSingle();

  console.log('[cocina action] comanda:', comanda, 'error:', errorComanda);

  if (!comanda) {
    return { ok: false, error: 'No encontramos esa comanda.' };
  }
  if (comanda.restaurante_id !== perfil.restaurante_id) {
    return { ok: false, error: 'Esta comanda no es de tu restaurante.' };
  }

  const estadoActual = comanda.estado as EstadoComanda;
  const transicionesPermitidas = TRANSICIONES_VALIDAS[estadoActual] ?? [];

  console.log('[cocina action] transición:', estadoActual, '→', input.nuevoEstado, 'permitida:', transicionesPermitidas.includes(input.nuevoEstado));

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
    .select('id, estado');

  console.log('[cocina action] UPDATE result:', updateData, 'error:', errorUpdate);

  if (errorUpdate) {
    return {
      ok: false,
      error: 'No pudimos actualizar la comanda. ' + errorUpdate.message,
    };
  }

  if (!updateData || updateData.length === 0) {
    console.log('[cocina action] UPDATE no afectó filas. RLS bloqueando?');
    return {
      ok: false,
      error: 'El cambio no se aplicó. Posible problema de permisos (RLS).',
    };
  }

  console.log('[cocina action] ✓ UPDATE exitoso');
  revalidatePath('/cocina');
  return { ok: true };
}
