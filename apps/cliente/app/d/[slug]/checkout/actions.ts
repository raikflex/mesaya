'use server';

import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@mesaya/database/service';

type ItemPedido = {
  productoId: string;
  cantidad: number;
  notas: string | null;
};

export type CrearPedidoExternoResultado =
  | { ok: true; pedidoId: string; numeroDiario: number }
  | { ok: false; error: string };

/**
 * Crea un pedido externo (domicilio o pickup) desde la pagina publica del
 * restaurante. No requiere autenticacion del cliente.
 *
 * Flujo:
 *   1. Validar restaurante por slug (activo, acepta el tipo de pedido).
 *   2. Buscar o crear la mesa virtual _domicilio del restaurante.
 *   3. Validar productos.
 *   4. Crear sesion nueva (cada domicilio = su propia sesion).
 *   5. Crear sesion_cliente con auth_user_id = null.
 *   6. Crear comanda con origen = tipo ('domicilio' | 'pickup').
 *   7. Crear comanda_items.
 *   8. Crear pedido_externo con los datos de entrega.
 */
export async function crearPedidoExterno(input: {
  slug: string;
  tipo: 'domicilio' | 'pickup';
  nombreCliente: string;
  telefono: string;
  direccion?: string;
  horaPedido?: string;
  notasEntrega?: string;
  items: ItemPedido[];
}): Promise<CrearPedidoExternoResultado> {
  if (!input.items.length) return { ok: false, error: 'El pedido esta vacio.' };

  if (!input.nombreCliente.trim() || input.nombreCliente.trim().length < 2)
    return { ok: false, error: 'Ingresa tu nombre.' };

  if (!input.telefono.trim() || input.telefono.replace(/\D/g, '').length < 7)
    return { ok: false, error: 'Ingresa un telefono valido.' };

  if (input.tipo === 'domicilio' && !input.direccion?.trim())
    return { ok: false, error: 'Ingresa la direccion de entrega.' };

  const admin = createServiceClient();

  // 1) Buscar restaurante por slug.
  const { data: restaurante } = await admin
    .from('restaurantes')
    .select('id, estado, acepta_domicilios, acepta_pickup, tiempo_estimado_preparacion_min')
    .eq('slug', input.slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado !== 'activo')
    return { ok: false, error: 'El restaurante no esta disponible en este momento.' };

  if (input.tipo === 'domicilio' && !restaurante.acepta_domicilios)
    return { ok: false, error: 'Este restaurante no acepta domicilios.' };

  if (input.tipo === 'pickup' && !restaurante.acepta_pickup)
    return { ok: false, error: 'Este restaurante no acepta pedidos para recoger.' };

  const restauranteId = restaurante.id as string;

  // 2) Buscar o crear la mesa virtual de domicilios.
  // Cada restaurante tiene exactamente una mesa _domicilio que agrupa
  // todos los pedidos externos. Cada pedido crea su propia sesion sobre ella.
  let mesaDomicilioId: string;

  const { data: mesaExistente } = await admin
    .from('mesas')
    .select('id')
    .eq('restaurante_id', restauranteId)
    .eq('numero', '_domicilio')
    .is('borrada_en', null)
    .maybeSingle();

  if (mesaExistente) {
    mesaDomicilioId = mesaExistente.id as string;
  } else {
    const { data: mesaNueva, error: mesaError } = await admin
      .from('mesas')
      .insert({ restaurante_id: restauranteId, numero: '_domicilio', capacidad: 1, activa: true })
      .select('id')
      .single();
    if (mesaError || !mesaNueva)
      return { ok: false, error: 'Error interno al crear el pedido. Intenta de nuevo.' };
    mesaDomicilioId = mesaNueva.id as string;
  }

  // 3) Validar productos.
  const productosIds = input.items.map((i) => i.productoId);
  const { data: productos, error: productosError } = await admin
    .from('productos')
    .select('id, nombre, precio, disponible, tiempo_preparacion_min')
    .in('id', productosIds)
    .eq('restaurante_id', restauranteId);

  if (productosError)
    return { ok: false, error: 'No pudimos validar el pedido. Intenta de nuevo.' };

  const productosMap = new Map(
    (productos ?? []).map((p) => [
      p.id as string,
      {
        nombre: p.nombre as string,
        precio: p.precio as number,
        disponible: p.disponible as boolean,
        tiempoMin: (p.tiempo_preparacion_min as number | null) ?? null,
      },
    ]),
  );

  const noDisponibles = input.items
    .filter((i) => !(productosMap.get(i.productoId)?.disponible ?? false))
    .map((i) => productosMap.get(i.productoId)?.nombre ?? 'Producto');

  if (noDisponibles.length > 0)
    return {
      ok: false,
      error:
        noDisponibles.length === 1
          ? `"${noDisponibles[0]}" ya no esta disponible.`
          : `Algunos productos no estan disponibles: ${noDisponibles.join(', ')}.`,
    };

  // 4) Crear sesion nueva para este pedido externo.
  const { data: sesion, error: sesionError } = await admin
    .from('sesiones')
    .insert({ restaurante_id: restauranteId, mesa_id: mesaDomicilioId, estado: 'abierta' })
    .select('id')
    .single();

  if (sesionError || !sesion)
    return { ok: false, error: 'Error al abrir el pedido. Intenta de nuevo.' };
  const sesionId = sesion.id as string;

  // 5) Crear sesion_cliente (sin auth_user_id — cliente anonimo sin QR).
  const { data: sesionCliente, error: scError } = await admin
    .from('sesion_clientes')
    .insert({ sesion_id: sesionId, auth_user_id: null, nombre: input.nombreCliente.trim() })
    .select('id')
    .single();

  if (scError || !sesionCliente)
    return { ok: false, error: 'Error al registrar el cliente. Intenta de nuevo.' };
  const sesionClienteId = sesionCliente.id as string;

  // 6) Calcular total y tiempo estimado.
  const total = input.items.reduce((acc, item) => {
    const p = productosMap.get(item.productoId)!;
    return acc + p.precio * item.cantidad;
  }, 0);

  const tiempoGlobal = restaurante.tiempo_estimado_preparacion_min as number | null;
  const tiempos = input.items
    .map((i) => productosMap.get(i.productoId)!.tiempoMin ?? tiempoGlobal ?? null)
    .filter((t): t is number => t !== null);
  const tiempoEstimadoMin = tiempos.length > 0 ? Math.max(...tiempos) : null;

  // 7) Crear comanda con origen = tipo del pedido.
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
      origen: input.tipo,
    })
    .select('id, numero_diario')
    .single();

  if (comandaError || !comanda)
    return { ok: false, error: 'Error al crear el pedido. Intenta de nuevo.' };
  const comandaId = comanda.id as string;
  const numeroDiario = comanda.numero_diario as number;

  // 8) Crear comanda_items con snapshot.
  const itemsParaInsertar = input.items.map((item) => {
    const p = productosMap.get(item.productoId)!;
    return {
      comanda_id: comandaId,
      producto_id: item.productoId,
      nombre_snapshot: p.nombre,
      precio_snapshot: p.precio,
      cantidad: item.cantidad,
      nota: item.notas,
    };
  });

  const { error: itemsError } = await admin.from('comanda_items').insert(itemsParaInsertar);
  if (itemsError) {
    await admin.from('comandas').delete().eq('id', comandaId);
    return { ok: false, error: 'Error al guardar los productos. Intenta de nuevo.' };
  }

  // 9) Crear pedido_externo con los datos de entrega.
  const { data: pedidoExterno, error: pedidoError } = await admin
    .from('pedidos_externos')
    .insert({
      comanda_id: comandaId,
      restaurante_id: restauranteId,
      tipo: input.tipo,
      nombre_cliente: input.nombreCliente.trim(),
      telefono: input.telefono.trim(),
      direccion: input.tipo === 'domicilio' ? (input.direccion?.trim() ?? null) : null,
      notas_entrega: input.notasEntrega?.trim() || null,
      hora_pickup: input.tipo === 'pickup' ? (input.horaPedido?.trim() ?? null) : null,
      estado_entrega: 'pendiente',
    })
    .select('id')
    .single();

  if (pedidoError || !pedidoExterno) {
    await admin.from('comandas').delete().eq('id', comandaId);
    return { ok: false, error: 'Error al registrar el pedido. Intenta de nuevo.' };
  }

  revalidatePath(`/d/${input.slug}`);
  return { ok: true, pedidoId: pedidoExterno.id as string, numeroDiario };
}
