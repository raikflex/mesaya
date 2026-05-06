import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { GraciasCliente } from './gracias-cliente';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sesion?: string }>;
}

export default async function GraciasPage({ params, searchParams }: PageProps) {
  const { token } = await params;
  const { sesion: sesionId } = await searchParams;

  if (!sesionId) notFound();

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

  // Validar que la sesión existe y pertenece a esta mesa.
  const { data: sesion } = await supabase
    .from('sesiones')
    .select('id, total_facturado')
    .eq('id', sesionId)
    .eq('restaurante_id', mesa.restaurante_id as string)
    .maybeSingle();

  if (!sesion) notFound();

  // Traer el último pago confirmado para esta sesión (debería existir uno).
  const { data: pagoData } = await supabase
    .from('pagos')
    .select('monto_total, propina, metodo')
    .eq('sesion_id', sesionId)
    .eq('estado', 'confirmado')
    .order('confirmado_en', { ascending: false })
    .limit(1)
    .maybeSingle();

  const totalPagado =
    (pagoData?.monto_total as number) ??
    (sesion.total_facturado as number) ??
    0;

  return (
    <GraciasCliente
      qrToken={token}
      sesionId={sesionId}
      mesaNumero={mesa.numero as string}
      nombreNegocio={restaurante.nombre_publico}
      colorMarca={restaurante.color_marca}
      totalPagado={totalPagado}
    />
  );
}
