import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { HojaImpresion, type PedidoImpresion } from './hoja-impresion';

export const metadata = { title: 'Hoja de preparacion - EnPura' };
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ dia?: string }>;
}

type RawItem = { nombre_snapshot: string; precio_snapshot: number; cantidad: number };
type RawPedido = {
  id: string;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  hora_entrega: string;
  total: number;
  estado: string;
  nota: string | null;
  pedidos_programados_items: RawItem[] | null;
};

export default async function ImprimirPage({ searchParams }: PageProps) {
  const { dia } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id || perfil.rol !== 'dueno') redirect('/admin');
  if (!dia || !/^\d{4}-\d{2}-\d{2}$/.test(dia)) redirect('/admin/domicilios-programados');

  const restauranteId = perfil.restaurante_id as string;

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico')
    .eq('id', restauranteId)
    .maybeSingle();

  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Restaurante';

  const { data: pedidosRaw } = await supabase
    .from('pedidos_programados')
    .select(
      'id, nombre_cliente, telefono, direccion, hora_entrega, total, estado, nota, pedidos_programados_items(nombre_snapshot, precio_snapshot, cantidad)',
    )
    .eq('restaurante_id', restauranteId)
    .eq('fecha_entrega', dia)
    .order('hora_entrega', { ascending: true });

  // Para la hoja de cocina no se preparan los cancelados.
  const pedidos: PedidoImpresion[] = ((pedidosRaw ?? []) as unknown as RawPedido[])
    .filter((p) => p.estado !== 'cancelado')
    .map((p) => ({
      id: p.id,
      nombreCliente: p.nombre_cliente,
      telefono: p.telefono,
      direccion: p.direccion,
      horaEntrega: p.hora_entrega,
      total: p.total,
      nota: p.nota ?? null,
      items: (p.pedidos_programados_items ?? []).map((i) => ({
        nombre: i.nombre_snapshot,
        precio: i.precio_snapshot,
        cantidad: i.cantidad,
      })),
    }));

  return <HojaImpresion nombreNegocio={nombreNegocio} dia={dia} pedidos={pedidos} />;
}
