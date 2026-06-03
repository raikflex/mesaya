'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

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
  if (!user) return { ok: false, error: 'No tienes sesion activa.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('id, nombre, rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) return { ok: false, error: 'No encontramos tu perfil.' };

  const rol = String(perfil.rol).toLowerCase().trim();
  if (rol !== 'mesero' && rol !== 'dueno' && rol !== 'dueno') {
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

export type TomarResultado = { ok: true } | { ok: false; error: string };

// =========================================================================
// Llamados (campana / otro)
// =========================================================================

export async function tomarLlamado(input: { llamadoId: string }): Promise<TomarResultado> {
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
      error: 'Otro mesero ya tomo este llamado. Refresca para ver.',
    };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

export async function liberarLlamado(input: { llamadoId: string }): Promise<TomarResultado> {
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

export async function atenderLlamado(input: { llamadoId: string }): Promise<TomarResultado> {
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

export async function tomarComanda(input: { comandaId: string }): Promise<TomarResultado> {
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
    return { ok: false, error: 'La comanda no esta lista todavia.' };
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
    return { ok: false, error: 'Otro mesero ya tomo esta comanda.' };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

export async function liberarComanda(input: { comandaId: string }): Promise<TomarResultado> {
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

export async function entregarComanda(input: { comandaId: string }): Promise<TomarResultado> {
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
    return { ok: false, error: 'La comanda no esta lista todavia.' };
  }
  // Sin requerir "tomar" primero: marcamos entregada y registramos quien la entrego.
  const { error } = await supabase
    .from('comandas')
    .update({ estado: 'entregada', mesero_atendiendo_id: validacion.perfilId })
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

export async function tomarPago(input: { llamadoId: string }): Promise<TomarResultado> {
  return tomarLlamado(input);
}

export async function liberarPago(input: { llamadoId: string }): Promise<TomarResultado> {
  return liberarLlamado(input);
}

export type ConfirmarPagoResultado = { ok: true } | { ok: false; error: string };

export type FormaPagoBackend = 'efectivo' | 'tarjeta' | 'transferencia' | 'no_seguro';

export async function confirmarPago(input: {
  llamadoId: string;
  metodoConfirmado: FormaPagoBackend;
  propinaMonto: number;
}): Promise<ConfirmarPagoResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  // Leer tambien doc_tipo, doc_numero, doc_nombre del llamado (datos de
  // facturacion que el cliente paso al pedir cuenta) para denormalizar a `pagos`.
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
  // Sin requerir "tomar" primero: cualquier mesero puede cobrar directo.

  const sesionId = llamado.sesion_id as string;

  const { data: comandasSesion } = await supabase
    .from('comandas')
    .select('id, total, estado')
    .eq('sesion_id', sesionId)
    .neq('estado', 'cancelada');

  const subtotal = (comandasSesion ?? []).reduce((acc, c) => acc + (c.total as number), 0);
  const propina = Math.max(0, Math.min(Math.round(input.propinaMonto || 0), subtotal * 2));
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
    // Denormalizar datos de facturacion si el cliente los pidio
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
      error: 'Pago registrado pero no pudimos cerrar el llamado. ' + errorLlamado.message,
    };
  }

  const idsListas = (comandasSesion ?? [])
    .filter(
      (c) => c.estado === 'lista' || c.estado === 'pendiente' || c.estado === 'en_preparacion',
    )
    .map((c) => c.id);

  if (idsListas.length > 0) {
    await supabase.from('comandas').update({ estado: 'entregada' }).in('id', idsListas);
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

export async function marcarComandaPreparando(input: {
  comandaId: string;
}): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, restaurante_id, estado')
    .eq('id', input.comandaId)
    .maybeSingle();

  if (!comanda) return { ok: false, error: 'No encontramos esa comanda.' };
  if (comanda.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa comanda no es de tu restaurante.' };
  }
  if (comanda.estado !== 'pendiente') {
    return {
      ok: false,
      error: 'Solo podes marcar como en preparacion las comandas pendientes.',
    };
  }

  const { error } = await supabase
    .from('comandas')
    .update({ estado: 'en_preparacion' })
    .eq('id', input.comandaId);

  if (error) {
    return { ok: false, error: 'No pudimos actualizar. ' + error.message };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

/**
 * Mesero marca que la comanda ya esta lista para entregar (la recogio de la
 * cocina). Cambia estado: en_preparacion -> lista.
 */
export async function marcarComandaLista(input: { comandaId: string }): Promise<TomarResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const supabase = await createClient();

  const { data: comanda } = await supabase
    .from('comandas')
    .select('id, restaurante_id, estado')
    .eq('id', input.comandaId)
    .maybeSingle();

  if (!comanda) return { ok: false, error: 'No encontramos esa comanda.' };
  if (comanda.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa comanda no es de tu restaurante.' };
  }
  if (comanda.estado !== 'en_preparacion' && comanda.estado !== 'pendiente') {
    return {
      ok: false,
      error: 'Solo podes marcar como lista una comanda en preparacion.',
    };
  }

  const { error } = await supabase
    .from('comandas')
    .update({ estado: 'lista' })
    .eq('id', input.comandaId);

  if (error) {
    return { ok: false, error: 'No pudimos actualizar. ' + error.message };
  }

  revalidatePath('/mesero');
  return { ok: true };
}

type ItemComandaMesero = {
  productoId: string;
  cantidad: number;
  notas: string | null;
};

export type CrearComandaMeseroResultado =
  | { ok: true; comandaId: string; numeroDiario: number }
  | { ok: false; error: string; productosAfectados?: string[] };

export async function crearComandaMesero(input: {
  mesaId: string;
  items: ItemComandaMesero[];
  nombreCliente?: string;
}): Promise<CrearComandaMeseroResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  if (!input.items || input.items.length === 0) {
    return { ok: false, error: 'El pedido esta vacio.' };
  }

  const admin = createServiceClient();

  const { data: mesa } = await admin
    .from('mesas')
    .select(
      'id, numero, restaurante_id, activa, restaurantes(estado, tiempo_estimado_preparacion_min)',
    )
    .eq('id', input.mesaId)
    .is('borrada_en', null)
    .maybeSingle();

  if (!mesa || !mesa.activa) {
    return { ok: false, error: 'Esa mesa no esta disponible.' };
  }
  if (mesa.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa mesa no es de tu restaurante.' };
  }

  const restaurante = (
    Array.isArray(mesa.restaurantes) ? mesa.restaurantes[0] : mesa.restaurantes
  ) as { estado: string; tiempo_estimado_preparacion_min: number | null } | null;

  if (!restaurante || restaurante.estado !== 'activo') {
    return { ok: false, error: 'El restaurante no esta atendiendo en este momento.' };
  }

  const restauranteId = validacion.restauranteId;
  const mesaId = mesa.id as string;
  const numeroMesa = mesa.numero as string;

  const productosIds = input.items.map((i) => i.productoId);
  const { data: productos, error: productosError } = await admin
    .from('productos')
    .select('id, nombre, precio, disponible, tiempo_preparacion_min')
    .in('id', productosIds)
    .eq('restaurante_id', restauranteId);

  if (productosError) {
    return { ok: false, error: 'No pudimos validar el pedido. Intenta de nuevo.' };
  }

  const productosMap = new Map(
    (productos ?? []).map((p) => [
      p.id as string,
      {
        nombre: p.nombre as string,
        precio: p.precio as number,
        disponible: p.disponible as boolean,
        tiempoPreparacionMin: (p.tiempo_preparacion_min as number | null) ?? null,
      },
    ]),
  );

  const noDisponibles: string[] = [];
  for (const item of input.items) {
    const prod = productosMap.get(item.productoId);
    if (!prod) {
      noDisponibles.push(item.productoId);
      continue;
    }
    if (!prod.disponible) {
      noDisponibles.push(prod.nombre);
    }
  }

  if (noDisponibles.length > 0) {
    return {
      ok: false,
      error:
        noDisponibles.length === 1
          ? `"${noDisponibles[0]}" ya no esta disponible.`
          : `Algunos productos ya no estan disponibles: ${noDisponibles.join(', ')}.`,
      productosAfectados: noDisponibles,
    };
  }

  let sesionId: string;
  const { data: sesionExistente } = await admin
    .from('sesiones')
    .select('id')
    .eq('mesa_id', mesaId)
    .eq('estado', 'abierta')
    .maybeSingle();

  if (sesionExistente) {
    sesionId = sesionExistente.id as string;
  } else {
    const { data: sesionNueva, error: sesionError } = await admin
      .from('sesiones')
      .insert({
        restaurante_id: restauranteId,
        mesa_id: mesaId,
        estado: 'abierta',
      })
      .select('id')
      .single();

    if (sesionError || !sesionNueva) {
      return { ok: false, error: 'No pudimos abrir la mesa. ' + (sesionError?.message ?? '') };
    }
    sesionId = sesionNueva.id as string;
  }

  const nombreFinal =
    input.nombreCliente && input.nombreCliente.trim().length >= 2
      ? input.nombreCliente.trim()
      : `Mesa ${numeroMesa}`;

  const { data: sesionCliente, error: clienteError } = await admin
    .from('sesion_clientes')
    .insert({
      sesion_id: sesionId,
      auth_user_id: null,
      nombre: nombreFinal,
    })
    .select('id')
    .single();

  if (clienteError || !sesionCliente) {
    return {
      ok: false,
      error: 'No pudimos registrar el pedido en la mesa. ' + (clienteError?.message ?? ''),
    };
  }
  const sesionClienteId = sesionCliente.id as string;

  const total = input.items.reduce((acc, item) => {
    const prod = productosMap.get(item.productoId)!;
    return acc + prod.precio * item.cantidad;
  }, 0);

  const tiempoGlobalRestaurante = restaurante.tiempo_estimado_preparacion_min;
  const tiemposEfectivos = input.items
    .map((item) => {
      const prod = productosMap.get(item.productoId)!;
      return prod.tiempoPreparacionMin ?? tiempoGlobalRestaurante ?? null;
    })
    .filter((t): t is number => t !== null);
  const tiempoEstimadoMin = tiemposEfectivos.length > 0 ? Math.max(...tiemposEfectivos) : null;

  const { data: comanda, error: comandaError } = await admin
    .from('comandas')
    .insert({
      restaurante_id: restauranteId,
      sesion_id: sesionId,
      sesion_cliente_id: sesionClienteId,
      numero_diario: 0,
      estado: 'pendiente',
      total,
      tiempo_estimado_min: tiempoEstimadoMin,
      origen: 'mesero',
    })
    .select('id, numero_diario')
    .single();

  if (comandaError || !comanda) {
    return { ok: false, error: 'No pudimos crear la comanda. ' + (comandaError?.message ?? '') };
  }

  const comandaId = comanda.id as string;
  const numeroDiario = comanda.numero_diario as number;

  const itemsParaInsertar = input.items.map((item) => {
    const prod = productosMap.get(item.productoId)!;
    return {
      comanda_id: comandaId,
      producto_id: item.productoId,
      nombre_snapshot: prod.nombre,
      precio_snapshot: prod.precio,
      cantidad: item.cantidad,
      nota: item.notas,
    };
  });

  const { error: itemsError } = await admin.from('comanda_items').insert(itemsParaInsertar);

  if (itemsError) {
    await admin.from('comandas').delete().eq('id', comandaId);
    return { ok: false, error: 'No pudimos guardar los productos. ' + itemsError.message };
  }

  revalidatePath('/mesero');
  revalidatePath('/cocina');
  return { ok: true, comandaId, numeroDiario };
}

// =========================================================================
// Cobro iniciado por el mesero (sin que el cliente pida la cuenta)
// =========================================================================

export type ResumenSesionMesa =
  | {
      ok: true;
      sesionId: string | null;
      comandas: {
        numeroDiario: number;
        total: number;
        estado: string;
        items: { nombre: string; cantidad: number; precio: number; nota: string | null }[];
      }[];
      totalAcumulado: number;
    }
  | { ok: false; error: string };

/**
 * Devuelve el resumen de la sesion abierta de una mesa: todas sus comandas
 * no canceladas con sus items. Lo usa el modal de tomar pedido para mostrar
 * "lo ya pedido" cuando la mesa esta ocupada.
 *
 * Si la mesa no tiene sesion abierta, devuelve ok:true con sesionId null y
 * comandas vacias (mesa libre, primer pedido).
 */
export async function obtenerResumenSesion(input: { mesaId: string }): Promise<ResumenSesionMesa> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const admin = createServiceClient();

  const { data: mesa } = await admin
    .from('mesas')
    .select('id, restaurante_id')
    .eq('id', input.mesaId)
    .maybeSingle();

  if (!mesa) return { ok: false, error: 'No encontramos esa mesa.' };
  if (mesa.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa mesa no es de tu restaurante.' };
  }

  const { data: sesion } = await admin
    .from('sesiones')
    .select('id')
    .eq('mesa_id', input.mesaId)
    .eq('estado', 'abierta')
    .maybeSingle();

  if (!sesion) {
    return { ok: true, sesionId: null, comandas: [], totalAcumulado: 0 };
  }

  const sesionId = sesion.id as string;

  const { data: comandasRaw } = await admin
    .from('comandas')
    .select('id, numero_diario, total, estado, creada_en')
    .eq('sesion_id', sesionId)
    .neq('estado', 'cancelada')
    .order('creada_en', { ascending: true });

  const comandasArr = (comandasRaw ?? []) as {
    id: string;
    numero_diario: number;
    total: number;
    estado: string;
    creada_en: string;
  }[];

  const idsComandas = comandasArr.map((c) => c.id);
  const itemsRaw =
    idsComandas.length > 0
      ? ((
          await admin
            .from('comanda_items')
            .select('comanda_id, nombre_snapshot, cantidad, precio_snapshot, nota')
            .in('comanda_id', idsComandas)
            .order('id', { ascending: true })
        ).data ?? [])
      : [];

  const itemsPorComanda = new Map<
    string,
    { nombre: string; cantidad: number; precio: number; nota: string | null }[]
  >();
  for (const c of comandasArr) itemsPorComanda.set(c.id, []);
  for (const it of itemsRaw) {
    const arr = itemsPorComanda.get(it.comanda_id as string);
    if (arr) {
      arr.push({
        nombre: it.nombre_snapshot as string,
        cantidad: it.cantidad as number,
        precio: it.precio_snapshot as number,
        nota: (it.nota as string | null) ?? null,
      });
    }
  }

  const comandas = comandasArr.map((c) => ({
    numeroDiario: c.numero_diario,
    total: c.total,
    estado: c.estado,
    items: itemsPorComanda.get(c.id) ?? [],
  }));

  const totalAcumulado = comandasArr.reduce((acc, c) => acc + (c.total ?? 0), 0);

  return { ok: true, sesionId, comandas, totalAcumulado };
}

/**
 * El mesero cobra una mesa directamente, sin que el cliente haya pedido la
 * cuenta. Variante de confirmarPago que trabaja por sesionId (no hay llamado
 * que cerrar).
 *
 * Hace lo mismo que confirmarPago menos el paso del llamado:
 *  - inserta el registro en `pagos`
 *  - marca las comandas activas como entregadas
 *  - cierra la sesion
 */
export async function confirmarPagoMesero(input: {
  sesionId: string;
  metodoConfirmado: FormaPagoBackend;
  propinaMonto: number;
}): Promise<ConfirmarPagoResultado> {
  const validacion = await validarStaffMesero();
  if (!validacion.ok) return validacion;

  const admin = createServiceClient();

  const { data: sesion } = await admin
    .from('sesiones')
    .select('id, restaurante_id, estado')
    .eq('id', input.sesionId)
    .maybeSingle();

  if (!sesion) return { ok: false, error: 'No encontramos esa mesa abierta.' };
  if (sesion.restaurante_id !== validacion.restauranteId) {
    return { ok: false, error: 'Esa mesa no es de tu restaurante.' };
  }
  if (sesion.estado !== 'abierta') {
    return { ok: false, error: 'Esa mesa ya fue cerrada.' };
  }

  const sesionId = sesion.id as string;

  const { data: comandasSesion } = await admin
    .from('comandas')
    .select('id, total, estado')
    .eq('sesion_id', sesionId)
    .neq('estado', 'cancelada');

  if (!comandasSesion || comandasSesion.length === 0) {
    return { ok: false, error: 'Esta mesa no tiene pedidos para cobrar.' };
  }

  const subtotal = comandasSesion.reduce((acc, c) => acc + (c.total as number), 0);
  // La propina la define el mesero en el modal (monto ya calculado).
  // Sanitizamos: no negativa, redondeada, y con un techo razonable.
  const propina = Math.max(0, Math.min(Math.round(input.propinaMonto || 0), subtotal * 2));
  const total = subtotal + propina;

  const { error: errorPago } = await admin.from('pagos').insert({
    sesion_id: sesionId,
    monto_subtotal: subtotal,
    propina,
    monto_total: total,
    metodo: input.metodoConfirmado,
    estado: 'confirmado',
    confirmado_por_id: validacion.perfilId,
    confirmado_en: new Date().toISOString(),
    // El mesero cobra sin que el cliente haya pedido factura: sin datos doc.
    doc_tipo: null,
    doc_numero: null,
    doc_nombre: null,
  });

  if (errorPago) {
    return { ok: false, error: 'No pudimos registrar el pago. ' + errorPago.message };
  }

  const idsActivas = comandasSesion
    .filter(
      (c) => c.estado === 'lista' || c.estado === 'pendiente' || c.estado === 'en_preparacion',
    )
    .map((c) => c.id);

  if (idsActivas.length > 0) {
    await admin.from('comandas').update({ estado: 'entregada' }).in('id', idsActivas);
  }

  const { error: errorSesion } = await admin
    .from('sesiones')
    .update({
      estado: 'cerrada',
      cerrada_en: new Date().toISOString(),
      total_facturado: total,
    })
    .eq('id', sesionId);

  if (errorSesion) {
    return { ok: false, error: 'Pago registrado pero no pudimos cerrar la mesa.' };
  }

  revalidatePath('/mesero');
  revalidatePath('/cocina');
  return { ok: true };
}

export async function marcarEstadoEntrega(input: {
  pedidoExternoId: string;
  nuevoEstado: 'en_camino' | 'listo_pickup';
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await validarStaffMesero();
  if (!guard.ok) return { ok: false, error: guard.error };
  const admin = createServiceClient();
  const { data: pedido } = await admin
    .from('pedidos_externos')
    .select('id, restaurante_id, estado_entrega')
    .eq('id', input.pedidoExternoId)
    .maybeSingle();
  if (!pedido || pedido.restaurante_id !== guard.restauranteId) {
    return { ok: false, error: 'No encontramos el pedido.' };
  }
  if (pedido.estado_entrega === 'entregado') {
    return { ok: false, error: 'Este pedido ya fue entregado.' };
  }
  const { error } = await admin
    .from('pedidos_externos')
    .update({ estado_entrega: input.nuevoEstado })
    .eq('id', input.pedidoExternoId);
  if (error) {
    return { ok: false, error: 'No pudimos actualizar el estado. Intenta de nuevo.' };
  }
  revalidatePath('/mesero');
  return { ok: true };
}