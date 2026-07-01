import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { DomiciliosProgramadosCliente, type PedidoProg } from './domicilios-programados-cliente';

export const metadata = { title: 'Domicilios programados - EnPura' };
export const dynamic = 'force-dynamic';

/** Fecha de hoy en hora Colombia como "YYYY-MM-DD". */
function hoyBogota(): string {
  const b = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const y = b.getFullYear();
  const m = (b.getMonth() + 1).toString().padStart(2, '0');
  const d = b.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type RawItem = { nombre_snapshot: string; precio_snapshot: number; cantidad: number };
type RawPedido = {
  id: string;
  grupo_id: string | null;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  fecha_entrega: string;
  hora_entrega: string;
  total: number;
  estado: string;
  nota: string | null;
  pedidos_programados_items: RawItem[] | null;
};

export default async function DomiciliosProgramadosPage() {
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

  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');
  if (perfil.rol !== 'dueno') redirect('/admin');

  const restauranteId = perfil.restaurante_id as string;

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico, acepta_domicilios_programados')
    .eq('id', restauranteId)
    .maybeSingle();

  // Si la modalidad esta apagada, no hay tablero: a configuracion.
  if (!((restaurante?.acepta_domicilios_programados as boolean) ?? false)) {
    redirect('/admin/configuracion');
  }

  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu restaurante';
  const hoy = hoyBogota();

  // Pedidos de hoy en adelante (vista "Proximos"). El historial se carga
  // bajo demanda desde el cliente.
  const { data: pedidosRaw } = await supabase
    .from('pedidos_programados')
    .select(
      'id, grupo_id, nombre_cliente, telefono, direccion, fecha_entrega, hora_entrega, total, estado, nota, pedidos_programados_items(nombre_snapshot, precio_snapshot, cantidad)',
    )
    .eq('restaurante_id', restauranteId)
    .gte('fecha_entrega', hoy)
    .order('fecha_entrega', { ascending: true })
    .order('hora_entrega', { ascending: true });

  const pedidos: PedidoProg[] = ((pedidosRaw ?? []) as unknown as RawPedido[]).map((p) => ({
    id: p.id,
    grupoId: p.grupo_id ?? null,
    nombreCliente: p.nombre_cliente,
    telefono: p.telefono,
    direccion: p.direccion,
    fechaEntrega: p.fecha_entrega,
    horaEntrega: p.hora_entrega,
    total: p.total,
    estado: p.estado,
    nota: p.nota ?? null,
    items: (p.pedidos_programados_items ?? []).map((i) => ({
      nombre: i.nombre_snapshot,
      precio: i.precio_snapshot,
      cantidad: i.cantidad,
    })),
  }));

  return (
    <PanelShell currentPage="domicilios-programados" nombreNegocio={nombreNegocio}>
      <DomiciliosProgramadosCliente pedidos={pedidos} hoy={hoy} restauranteId={restauranteId} />
    </PanelShell>
  );
}
