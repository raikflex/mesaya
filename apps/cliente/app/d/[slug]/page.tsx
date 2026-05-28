import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { MenuExterno } from './menu-externo';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function RestaurantePage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, nombre_publico, color_marca, logo_url, estado, acepta_domicilios, acepta_pickup')
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado === 'inactivo') {
    notFound();
  }

  const restauranteId = restaurante.id as string;

  // Categorias activas + productos.
  const [{ data: categorias }, { data: productos }] = await Promise.all([
    supabase
      .from('categorias')
      .select('id, nombre, orden')
      .eq('restaurante_id', restauranteId)
      .eq('activa', true)
      .order('orden', { ascending: true }),
    supabase
      .from('productos')
      .select('id, nombre, descripcion, precio, disponible, categoria_id')
      .eq('restaurante_id', restauranteId)
      .order('nombre', { ascending: true }),
  ]);

  const grupos = (categorias ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    orden: c.orden as number,
    productos: (
      (productos ?? []) as {
        id: string;
        nombre: string;
        descripcion: string | null;
        precio: number;
        disponible: boolean;
        categoria_id: string;
      }[]
    )
      .filter((p) => p.categoria_id === c.id)
      .map(({ id, nombre, descripcion, precio, disponible }) => ({
        id,
        nombre,
        descripcion,
        precio,
        disponible,
      })),
  }));

  return (
    <MenuExterno
      slug={slug}
      nombreNegocio={restaurante.nombre_publico as string}
      colorMarca={restaurante.color_marca as string}
      logoUrl={(restaurante.logo_url as string | null) ?? null}
      grupos={grupos}
      aceptaDomicilios={(restaurante.acepta_domicilios as boolean) ?? false}
      aceptaPickup={(restaurante.acepta_pickup as boolean) ?? false}
    />
  );
}
