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
 * Helper: valida que el user logueado es mesero (o dueño) y devuelve su perfil.
 */
async function validarStaffMesero(): Promise<
  | { ok: true; perfilId: string; restauranteId: string; rol: string }
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

  const rol = perfil.rol as string;
  if (rol !== 'mesero' && rol !== 'dueno') {
    return { ok: false, error: 'No tienes permisos de mesero.' };
  }

  return {
    ok: true,
    perfilId: perfil.id as string,
    restauranteId: perfil.restaurante_id as string,
    rol,
  };
}

/**
 * Tomar un item con lock optimista. Solo afecta filas que NO tengan
 * mesero_atendiendo_id (es decir, nadie las ha tomado todavía). Si el UPDATE
 * no devuelve fila, alguien más ganó la carrera.
 */
export type TomarResultado =
  | { ok: true }
  | { ok: false; error: string };

export async function tomarLlamado(input: {
  llamadoId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  // Verificar que el llamado pertenece a mi restaurante.
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

  // Lock optimista: solo actualizar si nadie lo ha tomado.
  const { data: actualizado, error } = await supabase
    .from('llamados_mesero')
    .update({ mesero_atendiendo_id: validacion.perfilId })
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
    .update({ mesero_atendiendo_id: null })
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

/**
 * Tomar / liberar comandas listas para entregar.
 */
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
    .update({ mesero_atendiendo_id: validacion.perfilId })
    .eq('id', input.comandaId)
    .is('mesero_atendiendo_id', null)
    .select('id')
    .maybeSingle();

  if (error) {
    return { ok: false, error: 'No pudimos tomar la comanda. ' + error.message };
  }
  if (!actualizado) {
    return {
      ok: false,
      error: 'Otro mesero ya tomó esta comanda.',
    };
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
    .update({ mesero_atendiendo_id: null })
    .eq('id', input.comandaId);

  if (error) {
    return { ok: false, error: 'No pudimos liberar la comanda.' };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

/**
 * Marca la comanda como entregada. La card desaparece del tablero del mesero
 * y de la columna "Listas" de cocina (vía realtime).
 *
 * Solo el mesero que la tomó puede marcarla como entregada.
 */
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

/**
 * Tomar / liberar pago. Funciona sobre el llamado_mesero motivo='pago'.
 */
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

/**
 * Confirma el pago: registra en tabla `pagos`, marca el llamado como atendido,
 * marca la sesión como cerrada, y todas las comandas pendientes/listas como
 * entregadas (caso edge: si quedó algo en cocina cuando el cliente pidió cuenta).
 *
 * Operación crítica: si algo falla a mitad, las consecuencias son malas (mesa
 * cerrada con comandas vivas, etc). Lo hago secuencial con validaciones.
 *
 * TODO post-MVP: hacer esto en una transacción real de Postgres con
 * supabase.rpc() y una función SECURITY DEFINER.
 */
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

  // 1) Validar el llamado.
  const { data: llamado } = await supabase
    .from('llamados_mesero')
    .select('id, restaurante_id, sesion_id, estado, mesero_atendiendo_id')
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

  // 2) Calcular subtotal y propina sumando comandas activas (no canceladas).
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

  // 3) Insertar pago.
  const { error: errorPago } = await supabase.from('pagos').insert({
    sesion_id: sesionId,
    monto_subtotal: subtotal,
    propina,
    monto_total: total,
    metodo: input.metodoConfirmado,
    estado: 'confirmado',
    confirmado_por_id: validacion.perfilId,
    confirmado_en: new Date().toISOString(),
  });

  if (errorPago) {
    return {
      ok: false,
      error: 'No pudimos registrar el pago. ' + errorPago.message,
    };
  }

  // 4) Marcar el llamado como atendido.
  const { error: errorLlamado } = await supabase
    .from('llamados_mesero')
    .update({
      estado: 'atendido',
      atendido_por_id: validacion.perfilId,
      atendido_en: new Date().toISOString(),
    })
    .eq('id', input.llamadoId);

  if (errorLlamado) {
    // El pago ya quedó registrado, esto es un estado parcial. Reportamos.
    return {
      ok: false,
      error:
        'Pago registrado pero no pudimos cerrar el llamado. ' +
        errorLlamado.message,
    };
  }

  // 5) Marcar comandas listas como entregadas (caso edge: se cobra antes de
  //    que el mesero las haya marcado entregadas una por una).
  const idsListas = (comandasSesion ?? [])
    .filter((c) => c.estado === 'lista' || c.estado === 'pendiente' || c.estado === 'en_preparacion')
    .map((c) => c.id);

  if (idsListas.length > 0) {
    await supabase
      .from('comandas')
      .update({ estado: 'entregada' })
      .in('id', idsListas);
  }

  // 6) Cerrar la sesión.
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
