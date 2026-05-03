import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { DetalleProducto } from './detalle-producto';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string; producto: string }>;
}

export default async function ProductoPage({ params }: PageProps) {
  const { token, producto } = await params;
  const supabase = await createClient();

  // Validar mesa + restaurante activo + mesa activa.
  const { data: mesa } = await supabase
    .from('mesas')
    .select(
      `
      restaurante_id,
      activa,
      restaurantes (estado, color_marca)
    `,
    )
    .eq('qr_token', token)
    .maybeSingle();

  if (!mesa) notFound();

  const restaurante = (Array.isArray(mesa.restaurantes)
    ? mesa.restaurantes[0]
    : mesa.restaurantes) as { estado: string; color_marca: string } | null;

  if (!restaurante || restaurante.estado !== 'activo' || !mesa.activa) {
    notFound();
  }

  // Validar producto existe + pertenece al restaurante + disponible.
  const { data: prod } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, disponible')
    .eq('id', producto)
    .eq('restaurante_id', mesa.restaurante_id as string)
    .maybeSingle();

  if (!prod) notFound();

  if (!prod.disponible) {
    // Producto sin stock: no debería poder llegar acá (el "+" estaba deshabilitado),
    // pero si llega por URL directa, le mostramos el detalle pero sin "Agregar".
    return (
      <DetalleProducto
        qrToken={token}
        productoId={prod.id as string}
        nombre={prod.nombre as string}
        descripcion={prod.descripcion as string | null}
        precio={prod.precio as number}
        colorMarca={restaurante.color_marca}
        sinStock={true}
      />
    );
  }

  return (
    <DetalleProducto
      qrToken={token}
      productoId={prod.id as string}
      nombre={prod.nombre as string}
      descripcion={prod.descripcion as string | null}
      precio={prod.precio as number}
      colorMarca={restaurante.color_marca}
      sinStock={false}
    />
  );
}
