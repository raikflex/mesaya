'use server';

import { randomUUID } from 'node:crypto';
import { createServiceClient } from '@mesaya/database/service';
import { diasDomicilioDisponibles } from '../../../../../lib/domicilios-disponibilidad';
import type { HorarioDia } from '../../../../../lib/horarios';

type ItemInput = { productoId: string; cantidad: number };
type DiaInput = { fecha: string; horaEntrega: string; items: ItemInput[] };

export type CrearPedidoProgramadoResultado =
  | { ok: true; grupoId: string; totalDias: number; total: number }
  | { ok: false; error: string };

/**
 * Crea un pedido programado multi-dia desde la pagina publica.
 * Cada dia elegido se guarda como una fila propia en pedidos_programados,
 * y todas comparten grupo_id (vienen del mismo checkout).
 *
 * Seguridad (todo en el servidor con service client):
 *   - Revalida que el restaurante acepte domicilios programados.
 *   - Revalida el corte de cada dia (evita pedir para un dia ya cerrado).
 *   - Recalcula el total con los precios reales de la BD (no confia en el cliente).
 *   - Guarda snapshot de nombre y precio de cada item.
 */
export async function crearPedidoProgramado(input: {
  slug: string;
  nombreCliente: string;
  telefono: string;
  direccion: string;
  notaGeneral?: string;
  dias: DiaInput[];
}): Promise<CrearPedidoProgramadoResultado> {
  // 1) Validaciones basicas.
  if (!input.nombreCliente.trim() || input.nombreCliente.trim().length < 2)
    return { ok: false, error: 'Ingresa tu nombre.' };
  if (!input.telefono.trim() || input.telefono.replace(/\D/g, '').length < 8)
    return { ok: false, error: 'Ingresa un telefono valido.' };
  if (!input.direccion.trim()) return { ok: false, error: 'Ingresa la direccion de entrega.' };

  // Sanitizar dias e items (cantidad 1..20, ignorar vacios).
  const dias = input.dias
    .map((d) => ({
      fecha: d.fecha,
      horaEntrega: d.horaEntrega,
      items: d.items
        .filter((i) => i.productoId && i.cantidad > 0)
        .map((i) => ({
          productoId: i.productoId,
          cantidad: Math.min(20, Math.max(1, Math.floor(i.cantidad))),
        })),
    }))
    .filter((d) => d.items.length > 0);

  if (dias.length === 0) return { ok: false, error: 'Tu pedido esta vacio.' };

  for (const d of dias) {
    if (!/^\d{2}:\d{2}$/.test(d.horaEntrega))
      return { ok: false, error: 'Falta la hora de entrega de algun dia.' };
  }

  const admin = createServiceClient();

  // 2) Restaurante por slug.
  const { data: restaurante } = await admin
    .from('restaurantes')
    .select('id, estado, acepta_domicilios_programados')
    .eq('slug', input.slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado !== 'activo')
    return { ok: false, error: 'El restaurante no esta disponible en este momento.' };
  if (!(restaurante.acepta_domicilios_programados as boolean))
    return { ok: false, error: 'Este restaurante no esta recibiendo domicilios programados.' };

  const restauranteId = restaurante.id as string;

  // 3) Revalidar el corte de cada dia en el servidor.
  const { data: horariosDomRaw } = await admin
    .from('horarios_domicilios')
    .select('dia_semana, abierto, hora_apertura, hora_cierre')
    .eq('restaurante_id', restauranteId)
    .order('dia_semana', { ascending: true });
  const horariosDom: HorarioDia[] = (horariosDomRaw ?? []).map((h) => ({
    dia_semana: h.dia_semana as number,
    abierto: h.abierto as boolean,
    hora_apertura: (h.hora_apertura as string | null) ?? null,
    hora_cierre: (h.hora_cierre as string | null) ?? null,
  }));
  const fechasValidas = new Set(diasDomicilioDisponibles(horariosDom).map((d) => d.fecha));

  for (const d of dias) {
    if (!fechasValidas.has(d.fecha))
      return {
        ok: false,
        error: 'Uno de los dias que elegiste ya cerro su corte. Vuelve a armar tu pedido.',
      };
  }

  // 4) Validar items: productos del menu + platos del dia "nuevos" (platodia:<id>).
  const PREFIJO_PLATO = 'platodia:';
  const todosLosIds = Array.from(new Set(dias.flatMap((d) => d.items.map((i) => i.productoId))));
  const idsProducto = todosLosIds.filter((id) => !id.startsWith(PREFIJO_PLATO));
  const idsPlato = todosLosIds
    .filter((id) => id.startsWith(PREFIJO_PLATO))
    .map((id) => id.slice(PREFIJO_PLATO.length));

  const { data: productos, error: prodError } = await admin
    .from('productos')
    .select('id, nombre, precio, disponible')
    .in('id', idsProducto.length > 0 ? idsProducto : ['00000000-0000-0000-0000-000000000000'])
    .eq('restaurante_id', restauranteId);
  if (prodError) return { ok: false, error: 'No pudimos validar el pedido. Intenta de nuevo.' };

  const prodMap = new Map(
    (productos ?? []).map((p) => [
      p.id as string,
      {
        nombre: p.nombre as string,
        precio: p.precio as number,
        disponible: p.disponible as boolean,
      },
    ]),
  );

  const platoMap = new Map<string, { nombre: string; precio: number }>();
  if (idsPlato.length > 0) {
    const { data: platos } = await admin
      .from('platos_del_dia')
      .select('id, nombre, precio, activo')
      .in('id', idsPlato)
      .eq('restaurante_id', restauranteId);
    for (const p of platos ?? []) {
      if (p.activo)
        platoMap.set(p.id as string, { nombre: p.nombre as string, precio: p.precio as number });
    }
  }

  // Resuelve un item del carrito -> nombre/precio/producto_id, o null si no esta disponible.
  const resolverItem = (
    cartId: string,
  ): { nombre: string; precio: number; producto_id: string | null } | null => {
    if (cartId.startsWith(PREFIJO_PLATO)) {
      const pl = platoMap.get(cartId.slice(PREFIJO_PLATO.length));
      return pl ? { nombre: pl.nombre, precio: pl.precio, producto_id: null } : null;
    }
    const p = prodMap.get(cartId);
    return p && p.disponible ? { nombre: p.nombre, precio: p.precio, producto_id: cartId } : null;
  };

  const noDisponibles = new Set<string>();
  for (const d of dias)
    for (const i of d.items) {
      if (!resolverItem(i.productoId)) {
        const p = prodMap.get(i.productoId);
        noDisponibles.add(p?.nombre ?? 'Un producto');
      }
    }
  if (noDisponibles.size > 0)
    return {
      ok: false,
      error: `Algunos productos ya no estan disponibles: ${Array.from(noDisponibles).join(', ')}.`,
    };

  // 5) Crear un pedido por dia, todos con el mismo grupo_id.
  const grupoId = randomUUID();
  const nombre = input.nombreCliente.trim();
  const telefono = input.telefono.trim();
  const direccion = input.direccion.trim();
  const nota = input.notaGeneral?.trim() || null;

  let totalGlobal = 0;

  for (const d of dias) {
    const totalDia = d.items.reduce((acc, i) => {
      const r = resolverItem(i.productoId)!;
      return acc + r.precio * i.cantidad;
    }, 0);
    totalGlobal += totalDia;

    const { data: pedido, error: pedidoError } = await admin
      .from('pedidos_programados')
      .insert({
        restaurante_id: restauranteId,
        grupo_id: grupoId,
        nombre_cliente: nombre,
        telefono,
        direccion,
        fecha_entrega: d.fecha,
        hora_entrega: d.horaEntrega,
        total: totalDia,
        estado: 'pendiente',
        nota,
      })
      .select('id')
      .single();

    if (pedidoError || !pedido) {
      // Limpieza: borrar lo ya creado de este grupo (el cascade borra items).
      await admin.from('pedidos_programados').delete().eq('grupo_id', grupoId);
      return { ok: false, error: 'Error al crear el pedido. Intenta de nuevo.' };
    }

    const pedidoId = pedido.id as string;
    const itemsInsert = d.items.map((i) => {
      const r = resolverItem(i.productoId)!;
      return {
        pedido_id: pedidoId,
        producto_id: r.producto_id,
        nombre_snapshot: r.nombre,
        precio_snapshot: r.precio,
        cantidad: i.cantidad,
      };
    });
    const { error: itemsError } = await admin
      .from('pedidos_programados_items')
      .insert(itemsInsert);
    if (itemsError) {
      await admin.from('pedidos_programados').delete().eq('grupo_id', grupoId);
      return { ok: false, error: 'Error al guardar los productos. Intenta de nuevo.' };
    }
  }

  return { ok: true, grupoId, totalDias: dias.length, total: totalGlobal };
}
