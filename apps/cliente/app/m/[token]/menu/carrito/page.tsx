import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { CarritoCliente } from './carrito-cliente';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function CarritoPage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: mesa } = await supabase
    .from('mesas')
    .select(
      `
      id,
      numero,
      activa,
      restaurantes (
        nombre_publico,
        color_marca,
        estado
      )
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
    estado: string;
  } | null;

  if (!restaurante || restaurante.estado !== 'activo' || !mesa.activa) {
    notFound();
  }

  return (
    <CarritoCliente
      qrToken={token}
      numeroMesa={mesa.numero as string}
      nombreNegocio={restaurante.nombre_publico}
      colorMarca={restaurante.color_marca}
    />
  );
}
