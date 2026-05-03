'use server';

import { createServiceClient } from '@mesaya/database/service';

/**
 * Enviar comanda a la cocina.
 *
 * Flujo:
 *   1. Validar mesa/restaurante activo y mesa activa.
 *   2. Validar productos del carrito.
 *   3. Buscar/crear sesión "abierta" para la mesa.
 *   4. Validar que authUserId existe en auth.users (lo creó el cliente con signInAnonymously).
 *   5. Crear sesion_cliente.
 *   6. Crear comanda (numero_diario lo asigna el trigger BEFORE INSERT).
 *   7. Crear comanda_items con snapshot.
 */

type ItemEntrada = {
  productoId: string;
  cantidad: number;
  notas: string | null;
};

export type EnviarComandaResultado =
  | { ok: true; comandaId: string; numeroDiario: number }
  | { ok: false; error: string; productosAfectados?: string[] };

export async function enviarComanda(input: {
  qrToken: string;
  authUserId: string;
  nombreCliente: string;
  items: ItemEntrada[];
}): Promise<EnviarComandaResultado> {
  if (!input.items || input.items.length === 0) {
    return { ok: false, error: 'Tu pedido está vacío.' };
  }

  if (!input.nombreCliente || input.nombreCliente.trim().length < 2) {
    return { ok: false, error: 'Necesitamos tu nombre antes de enviar el pedido.' };
  }

  if (!input.authUserId) {
    return {
      ok: false,
      error: 'No pudimos identificar tu sesión. Recarga la página e intenta de nuevo.',
    };
  }

  const admin = createServiceClient();

  // 1) Validar mesa + restaurante.
  const { data: mesa } = await admin
    .from('mesas')
    .select('id, restaurante_id, activa, restaurantes(estado)')
    .eq('qr_token', input.qrToken)
    .maybeSingle();

  if (!mesa || !mesa.activa) {
    return { ok: false, error: 'Esta mesa ya no está disponible.' };
  }

  const restaurante = (Array.isArray(mesa.restaurantes)
    ? mesa.restaurantes[0]
    : mesa.restaurantes) as { estado: string } | null;

  if (!restaurante || restaurante.estado !== 'activo') {
    return { ok: false, error: 'El restaurante no está atendiendo en este momento.' };
  }

  const restauranteId = mesa.restaurante_id as string;
  const mesaId = mesa.id as string;

  // 2) Validar productos.
  const productosIds = input.items.map((i) => i.productoId);
  const { data: productos, error: productosError } = await admin
    .from('productos')
    .select('id, nombre, precio, disponible')
    .in('id', productosIds)
    .eq('restaurante_id', restauranteId);

  if (productosError) {
    return { ok: false, error: 'No pudimos validar tu pedido. Intenta de nuevo.' };
  }

  const productosMap = new Map(
    (productos ?? []).map((p) => [
      p.id as string,
      {
        nombre: p.nombre as string,
        precio: p.precio as number,
        disponible: p.disponible as boolean,
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
          ? `Lo sentimos, "${noDisponibles[0]}" ya no está disponible. Quítalo del pedido y vuelve a enviar.`
          : `Algunos productos ya no están disponibles: ${noDisponibles.join(', ')}.`,
      productosAfectados: noDisponibles,
    };
  }

  // 3) Buscar sesión abierta o crear nueva.
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
      return {
        ok: false,
        error: 'No pudimos abrir tu mesa. ' + (sesionError?.message ?? ''),
      };
    }
    sesionId = sesionNueva.id as string;
  }

  // 4) Crear sesion_cliente con auth_user_id real (el cliente hizo signInAnonymously).
  // Si ya existe un sesion_cliente con este authUserId en esta sesión, lo reutilizamos
  // (el cliente hizo otro pedido en la misma mesa).
  const { data: sesionClienteExistente } = await admin
    .from('sesion_clientes')
    .select('id')
    .eq('sesion_id', sesionId)
    .eq('auth_user_id', input.authUserId)
    .maybeSingle();

  let sesionClienteId: string;
  if (sesionClienteExistente) {
    sesionClienteId = sesionClienteExistente.id as string;
  } else {
    const { data: sesionClienteNuevo, error: clienteError } = await admin
      .from('sesion_clientes')
      .insert({
        sesion_id: sesionId,
        auth_user_id: input.authUserId,
        nombre: input.nombreCliente.trim(),
      })
      .select('id')
      .single();

    if (clienteError || !sesionClienteNuevo) {
      return {
        ok: false,
        error:
          'No pudimos registrarte en la mesa. ' + (clienteError?.message ?? ''),
      };
    }
    sesionClienteId = sesionClienteNuevo.id as string;
  }

  // 5) Calcular total. numero_diario lo asigna el trigger.
  const total = input.items.reduce((acc, item) => {
    const prod = productosMap.get(item.productoId)!;
    return acc + prod.precio * item.cantidad;
  }, 0);

  // 6) Crear comanda.
  const { data: comanda, error: comandaError } = await admin
    .from('comandas')
    .insert({
      restaurante_id: restauranteId,
      sesion_id: sesionId,
      sesion_cliente_id: sesionClienteId,
      numero_diario: 0, // placeholder - trigger asigna el real
      estado: 'pendiente',
      total,
    })
    .select('id, numero_diario')
    .single();

  if (comandaError || !comanda) {
    return {
      ok: false,
      error: 'No pudimos crear tu pedido. ' + (comandaError?.message ?? ''),
    };
  }

  const comandaId = comanda.id as string;
  const numeroDiario = comanda.numero_diario as number;

  // 7) Crear comanda_items con snapshot.
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

  const { error: itemsError } = await admin
    .from('comanda_items')
    .insert(itemsParaInsertar);

  if (itemsError) {
    await admin.from('comandas').delete().eq('id', comandaId);
    return {
      ok: false,
      error:
        'No pudimos guardar los productos del pedido. ' + itemsError.message,
    };
  }

  return { ok: true, comandaId, numeroDiario };
}
