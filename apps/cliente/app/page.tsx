import { createClient } from '@mesaya/database/server';
import { DirectorioRestaurantes, type RestaurantePublico } from './directorio';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'EnPura · Pide en tus restaurantes favoritos',
  description: 'Encuentra restaurantes y pide a domicilio o para recoger.',
};

export default async function ClienteHome() {
  const supabase = await createClient();

  // Solo restaurantes activos que aceptan pedidos online (domicilio o pickup)
  // y tienen slug. Los archivados o a medio configurar no aparecen.
  const { data: restaurantesRaw } = await supabase
    .from('restaurantes')
    .select(
      'nombre_publico, slug, logo_url, color_marca, descripcion_publica, ciudad, acepta_domicilios, acepta_pickup',
    )
    .eq('estado', 'activo')
    .not('slug', 'is', null)
    .order('nombre_publico', { ascending: true });

  const restaurantes: RestaurantePublico[] = ((restaurantesRaw ?? []) as {
    nombre_publico: string;
    slug: string;
    logo_url: string | null;
    color_marca: string | null;
    descripcion_publica: string | null;
    ciudad: string | null;
    acepta_domicilios: boolean;
    acepta_pickup: boolean;
  }[])
    .filter((r) => r.acepta_domicilios || r.acepta_pickup)
    .map((r) => ({
      nombre: r.nombre_publico,
      slug: r.slug,
      logoUrl: r.logo_url,
      colorMarca: r.color_marca ?? '#9a3f6b',
      descripcion: r.descripcion_publica,
      ciudad: r.ciudad,
      aceptaDomicilios: r.acepta_domicilios,
      aceptaPickup: r.acepta_pickup,
    }));

  return <DirectorioRestaurantes restaurantes={restaurantes} />;
}
