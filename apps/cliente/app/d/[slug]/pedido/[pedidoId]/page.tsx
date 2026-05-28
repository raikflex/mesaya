import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { EstadoPedido } from './estado-pedido';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string; pedidoId: string }>;
}

export default async function PedidoPage({ params }: PageProps) {
  const { slug, pedidoId } = await params;
  const supabase = await createClient();

  const { data: pedido } = await supabase
    .from('pedidos_externos')
    .select(`
      id, tipo, estado_entrega, nombre_cliente, direccion, hora_pickup,
      comandas (numero_diario),
      restaurantes (nombre_publico, color_marca)
    `)
    .eq('id', pedidoId)
    .maybeSingle();

  if (!pedido) notFound();

  const comanda = Array.isArray(pedido.comandas) ? pedido.comandas[0] : pedido.comandas;
  const restaurante = Array.isArray(pedido.restaurantes) ? pedido.restaurantes[0] : pedido.restaurantes;

  return (
    <EstadoPedido
      pedidoId={pedidoId}
      numeroDiario={(comanda as { numero_diario: number } | null)?.numero_diario ?? 0}
      nombreNegocio={(restaurante as { nombre_publico: string } | null)?.nombre_publico ?? ''}
      colorMarca={(restaurante as { color_marca: string } | null)?.color_marca ?? '#000'}
      tipo={pedido.tipo as 'domicilio' | 'pickup'}
      estadoInicial={pedido.estado_entrega as 'pendiente'}
      nombreCliente={pedido.nombre_cliente as string}
      direccion={(pedido.direccion as string | null) ?? null}
      horaPedido={(pedido.hora_pickup as string | null) ?? null}
    />
  );
}
