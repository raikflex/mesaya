import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { MenuPlaceholder } from './menu-placeholder';

/**
 * Pantalla del menú para el cliente.
 * Esta es la versión placeholder del Bloque 1: confirma que el nombre se guardó
 * y muestra "Menú próximamente". El menú real se construye en el Bloque 2.
 */

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function MenuPage({ params }: PageProps) {
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

  if (!mesa) {
    notFound();
  }

  const restaurante = (Array.isArray(mesa.restaurantes) ? mesa.restaurantes[0] : mesa.restaurantes) as {
    nombre_publico: string;
    color_marca: string;
    estado: string;
  } | null;

  if (!restaurante || restaurante.estado !== 'activo' || !mesa.activa) {
    // Si el estado cambió mientras el cliente estaba en el menú, lo mandamos a la raíz.
    notFound();
  }

  return (
    <MenuPlaceholder
      qrToken={token}
      numeroMesa={mesa.numero as string}
      nombreNegocio={restaurante.nombre_publico}
      colorMarca={restaurante.color_marca}
    />
  );
}
