import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { ComandaEnviadaCliente, type ComandaConItems } from './enviada-cliente';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string; comanda: string }>;
}

export default async function ComandaEnviadaPage({ params }: PageProps) {
  const { token, comanda } = await params;
  const supabase = await createClient();

  const { data: mesa } = await supabase
    .from('mesas')
    .select(
      `
      restaurante_id,
      numero,
      restaurantes (nombre_publico, color_marca)
    `,
    )
    .eq('qr_token', token)
    .maybeSingle();

  if (!mesa) notFound();

  const restaurante = (Array.isArray(mesa.restaurantes)
    ? mesa.restaurantes[0]
    : mesa.restaurantes) as {
    nombre_publico: string;
    color_marca: string;
  } | null;

  if (!restaurante) notFound();

  const { data: comandaActual } = await supabase
    .from('comandas')
    .select('id, sesion_id, sesion_cliente_id')
    .eq('id', comanda)
    .eq('restaurante_id', mesa.restaurante_id as string)
    .maybeSingle();

  if (!comandaActual) notFound();

  const { data: sesionCliente } = await supabase
    .from('sesion_clientes')
    .select('nombre')
    .eq('id', comandaActual.sesion_cliente_id as string)
    .maybeSingle();

  const nombreCliente = (sesionCliente?.nombre as string) ?? '';

  const { data: comandasRaw } = await supabase
    .from('comandas')
    .select(
      'id, numero_diario, estado, total, creada_en, mesero_atendiendo_nombre',
    )
    .eq('sesion_id', comandaActual.sesion_id as string)
    .eq('sesion_cliente_id', comandaActual.sesion_cliente_id as string)
    .order('creada_en', { ascending: true });

  const comandas = (comandasRaw ?? []) as Pick<
    ComandaConItems,
    | 'id'
    | 'numero_diario'
    | 'estado'
    | 'total'
    | 'creada_en'
    | 'mesero_atendiendo_nombre'
  >[];

  if (comandas.length === 0) notFound();

  const comandaIds = comandas.map((c) => c.id);
  const { data: itemsRaw } = await supabase
    .from('comanda_items')
    .select('id, comanda_id, nombre_snapshot, precio_snapshot, cantidad, nota')
    .in('comanda_id', comandaIds)
    .order('id', { ascending: true });

  const itemsPorComanda = new Map<string, ComandaConItems['items']>();
  for (const c of comandas) {
    itemsPorComanda.set(c.id, []);
  }
  for (const it of itemsRaw ?? []) {
    const arr = itemsPorComanda.get(it.comanda_id as string);
    if (arr) {
      arr.push({
        id: it.id as string,
        nombre_snapshot: it.nombre_snapshot as string,
        precio_snapshot: it.precio_snapshot as number,
        cantidad: it.cantidad as number,
        nota: (it.nota as string) ?? null,
      });
    }
  }

  const comandasConItems: ComandaConItems[] = comandas.map((c) => ({
    ...c,
    items: itemsPorComanda.get(c.id) ?? [],
  }));

  return (
    <ComandaEnviadaCliente
      qrToken={token}
      sesionId={comandaActual.sesion_id as string}
      mesaNumero={mesa.numero as string}
      nombreNegocio={restaurante.nombre_publico}
      colorMarca={restaurante.color_marca}
      nombreCliente={nombreCliente}
      comandaActualId={comanda}
      comandasIniciales={comandasConItems}
    />
  );
}
