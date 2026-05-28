import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { CheckoutExterno } from './checkout-externo';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function CheckoutPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico, color_marca, acepta_domicilios, acepta_pickup, estado')
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado !== 'activo') notFound();

  return (
    <CheckoutExterno
      slug={slug}
      nombreNegocio={restaurante.nombre_publico as string}
      colorMarca={restaurante.color_marca as string}
      aceptaDomicilios={(restaurante.acepta_domicilios as boolean) ?? false}
      aceptaPickup={(restaurante.acepta_pickup as boolean) ?? false}
    />
  );
}
