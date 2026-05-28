import { createClient } from '@mesaya/database/server';
import { obtenerPerfilStaff } from '../../lib/auth-server';
import { TableroCocina, type ComandaCocina } from './tablero-cocina';
import { CocinaInactiva } from './cocina-inactiva';

export const dynamic = 'force-dynamic';

export default async function CocinaPage() {
  const perfil = await obtenerPerfilStaff('cocina');
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('cocina_activa, nombre_publico, color_marca')
    .eq('id', perfil.restauranteId)
    .maybeSingle();

  const cocinaActiva = (restaurante?.cocina_activa as boolean) ?? false;

  if (!cocinaActiva) {
    return (
      <CocinaInactiva
        nombreNegocio={(restaurante?.nombre_publico as string) ?? perfil.restauranteNombre}
        colorMarca={(restaurante?.color_marca as string) ?? perfil.restauranteColor}
        nombreCocinero={perfil.nombre}
      />
    );
  }

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const { data: comandasRaw } = await supabase
    .from('comandas')
    .select(
      `
      id, numero_diario, estado, total, creada_en, sesion_id, origen,
      sesion_clientes (nombre),
      sesiones (mesas (numero)),
      pedidos_externos (tipo, nombre_cliente, telefono, direccion, hora_pickup, notas_entrega)
    `,
    )
    .eq('restaurante_id', perfil.restauranteId)
    .in('estado', ['pendiente', 'en_preparacion', 'lista'])
    .gte('creada_en', inicioDia.toISOString())
    .order('creada_en', { ascending: true });

  const comandasArr = (comandasRaw ?? []) as {
    id: string;
    numero_diario: number;
    estado: string;
    total: number;
    creada_en: string;
    sesion_id: string;
    origen: string;
    sesion_clientes: { nombre: string } | { nombre: string }[] | null;
    sesiones:
      | { mesas: { numero: string } | { numero: string }[] | null }
      | { mesas: { numero: string } | { numero: string }[] | null }[]
      | null;
    pedidos_externos:
      | { tipo: string; nombre_cliente: string; telefono: string; direccion: string | null; hora_pickup: string | null; notas_entrega: string | null }
      | { tipo: string; nombre_cliente: string; telefono: string; direccion: string | null; hora_pickup: string | null; notas_entrega: string | null }[]
      | null;
  }[];

  let comandas: ComandaCocina[] = [];
  if (comandasArr.length > 0) {
    const comandaIds = comandasArr.map((c) => c.id);
    const { data: itemsRaw } = await supabase
      .from('comanda_items')
      .select('id, comanda_id, nombre_snapshot, cantidad, nota')
      .in('comanda_id', comandaIds)
      .order('id', { ascending: true });

    const itemsPorComanda = new Map<string, ComandaCocina['items']>();
    for (const c of comandasArr) itemsPorComanda.set(c.id, []);
    for (const it of itemsRaw ?? []) {
      const arr = itemsPorComanda.get(it.comanda_id as string);
      if (arr) {
        arr.push({
          id: it.id as string,
          nombre: it.nombre_snapshot as string,
          cantidad: it.cantidad as number,
          nota: (it.nota as string) ?? null,
        });
      }
    }

    comandas = comandasArr.map((c) => {
      const sc = Array.isArray(c.sesion_clientes) ? c.sesion_clientes[0] : c.sesion_clientes;
      const sesion = Array.isArray(c.sesiones) ? c.sesiones[0] : c.sesiones;
      const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;
      const pedidoRaw = Array.isArray(c.pedidos_externos) ? c.pedidos_externos[0] : c.pedidos_externos;
      const pedido = pedidoRaw as {
        tipo: string; nombre_cliente: string; telefono: string;
        direccion: string | null; hora_pickup: string | null; notas_entrega: string | null;
      } | null;

      return {
        id: c.id,
        numeroDiario: c.numero_diario,
        estado: c.estado as 'pendiente' | 'en_preparacion' | 'lista',
        total: c.total,
        creadaEn: c.creada_en,
        clienteNombre: (sc as { nombre: string } | null)?.nombre ?? 'Cliente',
        mesaNumero: (mesa as { numero: string } | null)?.numero ?? '?',
        origen: c.origen ?? 'cliente',
        entrega: pedido ? {
          tipo: pedido.tipo as 'domicilio' | 'pickup',
          nombreCliente: pedido.nombre_cliente,
          telefono: pedido.telefono,
          direccion: pedido.direccion,
          horaPedido: pedido.hora_pickup,
          notasEntrega: pedido.notas_entrega,
        } : null,
        items: itemsPorComanda.get(c.id) ?? [],
      };
    });
  }

  return (
    <TableroCocina
      perfilNombre={perfil.nombre}
      restauranteNombre={perfil.restauranteNombre}
      colorMarca={perfil.restauranteColor}
      comandasIniciales={comandas}
      restauranteId={perfil.restauranteId}
    />
  );
}
