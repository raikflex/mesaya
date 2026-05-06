'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

async function validarStaffMesero(): Promise<
  | { ok: true; perfilId: string; perfilNombre: string; restauranteId: string; rol: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No tienes sesión activa.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) return { ok: false, error: 'No encontramos tu perfil.' };

  const rol = String(perfil.rol).toLowerCase().trim();
  if (rol !== 'mesero' && rol !== 'dueno' && rol !== 'dueño') {
    return { ok: false, error: 'No tienes permisos de mesero.' };
  }

  return {
    ok: true,
    perfilId: perfil.id as string,
    perfilNombre: (perfil.nombre as string) ?? 'Mesero',
    restauranteId: perfil.restaurante_id as string,
    rol,
  };
}

export type TomarResultado =
  | { ok: true }
  | { ok: false; error: string };

// =========================================================================
// Llamados (campana / otro)
// =========================================================================

export async function tomarLlamado(input: {
  llamadoId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: llamado } = await supabase
    .from('llamados_mesero')
    .select('id, restaurante_id, estado, mesero_atendiendo_id')
    .eq('id', input.llamadoId)
    .maybeSingle();

  if (!llamado) return { ok: false, error: 'No encontramos ese llamado.' };
  if (llamado.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Ese llamado no es de tu restaurante.' };
  }
  if (llamado.estado !== 'pendiente') {
    return { ok: false, error: 'El llamado ya fue atendido.' };
  }

  const { data: actualizado, error } = await supabase
    .from('llamados_mesero')
    .update({
      mesero_atendiendo_id: validacion.perfilId,
      mesero_atendiendo_nombre: validacion.perfilNombre,
    })
    .eq('id', input.llamadoId)
    .is('mesero_atendiendo_id', null)
    .select('id')
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'No pudimos tomar el llamado. ' + error.message };
  }
  if (!actualizado) {
    return {
      ok: false,
      error: 'Otro mesero ya tomó este llamado. Refresca para ver.',
    };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

export async function liberarLlamado(input: {
  llamadoId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: llamado } = await supabase
    .from('llamados_mesero')
    .select('id, restaurante_id')
    .eq('id', input.llamadoId)
    .maybeSingle();

  if (!llamado) return { ok: false, error: 'No encontramos ese llamado.' };
  if (llamado.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Ese llamado no es de tu restaurante.' };
  }

  const { error } = await supabase
    .from('llamados_mesero')
    .update({
      mesero_atendiendo_id: null,
      mesero_atendiendo_nombre: null,
    })
    .eq('id', input.llamadoId);

  if (error) {
    return { ok: false, error: 'No pudimos liberar el llamado.' };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

export async function atenderLlamado(input: {
  llamadoId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: llamado } = await supabase
    .from('llamados_mesero')
    .select('id, restaurante_id, estado')
    .eq('id', input.llamadoId)
    .maybeSingle();

  if (!llamado) return { ok: false, error: 'No encontramos ese llamado.' };
  if (llamado.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Ese llamado no es de tu restaurante.' };
  }
  if (llamado.estado !== 'pendiente') {
    return { ok: false, error: 'El llamado ya fue atendido.' };
  }

  const { error } = await supabase
    .from('llamados_mesero')
    .update({
      estado: 'atendido',
      atendido_por_id: validacion.perfilId,
      atendido_en: new Date().toISOString(),
    })
    .eq('id', input.llamadoId);

  if (error) {
    return { ok: false, error: 'No pudimos cerrar el llamado.' };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

// =========================================================================
// Comandas listas
// =========================================================================

export async function tomarComanda(input: {
  comandaId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, restaurante_id, estado, mesero_atendiendo_id')
    .eq('id', input.comandaId)
    .maybeSingle();

  if (!comanda) return { ok: false, error: 'No encontramos esa comanda.' };
  if (comanda.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa comanda no es de tu restaurante.' };
  }
  if (comanda.estado !== 'lista') {
    return { ok: false, error: 'La comanda no está lista para entregar.' };
  }

  const { data: actualizado, error } = await supabase
    .from('comandas')
    .update({
      mesero_atendiendo_id: validacion.perfilId,
      mesero_atendiendo_nombre: validacion.perfilNombre,
    })
    .eq('id', input.comandaId)
    .is('mesero_atendiendo_id', null)
    .select('id')
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'No pudimos tomar la comanda. ' + error.message };
  }
  if (!actualizado) {
    return { ok: false, error: 'Otro mesero ya tomó esta comanda.' };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

export async function liberarComanda(input: {
  comandaId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, restaurante_id')
    .eq('id', input.comandaId)
    .maybeSingle();

  if (!comanda) return { ok: false, error: 'No encontramos esa comanda.' };
  if (comanda.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa comanda no es de tu restaurante.' };
  }

  const { error } = await supabase
    .from('comandas')
    .update({
      mesero_atendiendo_id: null,
      mesero_atendiendo_nombre: null,
    })
    .eq('id', input.comandaId);

  if (error) {
    return { ok: false, error: 'No pudimos liberar la comanda.' };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

export async function entregarComanda(input: {
  comandaId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, restaurante_id, estado, mesero_atendiendo_id')
    .eq('id', input.comandaId)
    .maybeSingle();

  if (!comanda) return { ok: false, error: 'No encontramos esa comanda.' };
  if (comanda.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa comanda no es de tu restaurante.' };
  }
  if (comanda.estado !== 'lista') {
    return { ok: false, error: 'La comanda no está lista todavía.' };
  }
  if (comanda.mesero_atendiendo_id !== validacion.perfilId) {
    return {
      ok: false,
      error: 'Tienes que tomar la comanda primero antes de entregarla.',
    };
  }

  const { error } = await supabase
    .from('comandas')
    .update({ estado: 'entregada' })
    .eq('id', input.comandaId);

  if (error) {
    return { ok: false, error: 'No pudimos marcar como entregada.' };
  }

  revalidatePath('/mesero');
  revalidatePath('/cocina');
  return { ok: true };
}

// =========================================================================
// Pagos
// =========================================================================

export async function tomarPago(input: {
  llamadoId: string;
}): Promise<TomarResultado> {
  return tomarLlamado(input);
}

export async function liberarPago(input: {
  llamadoId: string;
}): Promise<TomarResultado> {
  return liberarLlamado(input);
}

export type ConfirmarPagoResultado =
  | { ok: true }
  | { ok: false; error: string };

export type FormaPagoBackend =
  | 'efectivo'
  | 'tarjeta'
  | 'transferencia'
  | 'no_seguro';

export async function confirmarPago(input: {
  llamadoId: string;
  metodoConfirmado: FormaPagoBackend;
  conPropina: boolean;
}): Promise<ConfirmarPagoResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  // Leer también doc_tipo, doc_numero, doc_nombre del llamado (datos de
  // facturación que el cliente pasó al pedir cuenta) para denormalizar a `pagos`.
  const { data: llamado } = await supabase
    .from('llamados_mesero')
    .select(
      'id, restaurante_id, sesion_id, estado, mesero_atendiendo_id, doc_tipo, doc_numero, doc_nombre',
    )
    .eq('id', input.llamadoId)
    .maybeSingle();

  if (!llamado) return { ok: false, error: 'No encontramos ese llamado.' };
  if (llamado.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Ese llamado no es de tu restaurante.' };
  }
  if (llamado.estado !== 'pendiente') {
    return { ok: false, error: 'Ese llamado ya fue atendido.' };
  }
  if (llamado.mesero_atendiendo_id !== validacion.perfilId) {
    return {
      ok: false,
      error: 'Tienes que tomar el pago primero antes de cobrar.',
    };
  }

  const sesionId = llamado.sesion_id as string;

  const { data: comandasSesion } = await supabase
    .from('comandas')
    .select('id, total, estado')
    .eq('sesion_id', sesionId)
    .neq('estado', 'cancelada');

  const subtotal = (comandasSesion ?? []).reduce(
    (acc, c) => acc + (c.total as number),
    0,
  );
  const propina = input.conPropina ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + propina;

  const { error: errorPago } = await supabase.from('pagos').insert({
    sesion_id: sesionId,
    monto_subtotal: subtotal,
    propina,
    monto_total: total,
    metodo: input.metodoConfirmado,
    estado: 'confirmado',
    confirmado_por_id: validacion.perfilId,
    confirmado_en: new Date().toISOString(),
    // Denormalizar datos de facturación si el cliente los pidió
    doc_tipo: llamado.doc_tipo as string | null,
    doc_numero: llamado.doc_numero as string | null,
    doc_nombre: llamado.doc_nombre as string | null,
  });

  if (errorPago) {
    return {
      ok: false,
      error: 'No pudimos registrar el pago. ' + errorPago.message,
    };
  }

  const { error: errorLlamado } = await supabase
    .from('llamados_mesero')
    .update({
      estado: 'atendido',
      atendido_por_id: validacion.perfilId,
      atendido_en: new Date().toISOString(),
    })
    .eq('id', input.llamadoId);

  if (errorLlamado) {
    return {
      ok: false,
      error:
        'Pago registrado pero no pudimos cerrar el llamado. ' +
        errorLlamado.message,
    };
  }

  const idsListas = (comandasSesion ?? [])
    .filter(
      (c) =>
        c.estado === 'lista' ||
        c.estado === 'pendiente' ||
        c.estado === 'en_preparacion',
    )
    .map((c) => c.id);

  if (idsListas.length > 0) {
    await supabase
      .from('comandas')
      .update({ estado: 'entregada' })
      .in('id', idsListas);
  }

  const { error: errorSesion } = await supabase
    .from('sesiones')
    .update({
      estado: 'cerrada',
      cerrada_en: new Date().toISOString(),
      total_facturado: total,
    })
    .eq('id', sesionId);

  if (errorSesion) {
    return {
      ok: false,
      error: 'Pago registrado pero no pudimos cerrar la mesa.',
    };
  }

  revalidatePath('/mesero');
  revalidatePath('/cocina');
  return { ok: true };
}
