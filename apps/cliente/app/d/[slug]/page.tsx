import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { MenuExterno } from './menu-externo';
import { EstadoRestauranteScreen } from '../../m/[token]/estado-restaurante';
import { estaAbiertoAhora, type HorarioDia, type ExcepcionDia } from '../../../lib/horarios';

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

  // Validar horario: si esta cerrado, no permitir pedir (igual que en mesa).
  const hoy = new Date().toISOString().slice(0, 10);
  const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [{ data: horariosRaw }, { data: excepcionesRaw }] = await Promise.all([
    supabase
      .from('horarios_atencion')
      .select('dia_semana, abierto, hora_apertura, hora_cierre')
      .eq('restaurante_id', restauranteId)
      .order('dia_semana', { ascending: true }),
    supabase
      .from('excepciones_horario')
      .select('fecha, abierto, hora_apertura, hora_cierre, nota')
      .eq('restaurante_id', restauranteId)
      .gte('fecha', hoy)
      .lte('fecha', en30Dias)
      .order('fecha', { ascending: true }),
  ]);
  const horarios: HorarioDia[] = (horariosRaw ?? []).map((h) => ({
    dia_semana: h.dia_semana as number,
    abierto: h.abierto as boolean,
    hora_apertura: (h.hora_apertura as string | null) ?? null,
    hora_cierre: (h.hora_cierre as string | null) ?? null,
  }));
  const excepciones: ExcepcionDia[] = (excepcionesRaw ?? []).map((e) => ({
    fecha: e.fecha as string,
    abierto: e.abierto as boolean,
    hora_apertura: (e.hora_apertura as string | null) ?? null,
    hora_cierre: (e.hora_cierre as string | null) ?? null,
    nota: (e.nota as string | null) ?? null,
  }));
  const estadoApertura = estaAbiertoAhora(horarios, excepciones);
  if (!estadoApertura.abierto) {
    return (
      <EstadoRestauranteScreen
        tipo="cerrado"
        nombreNegocio={restaurante.nombre_publico as string}
        colorMarca={restaurante.color_marca as string}
        proximaApertura={estadoApertura.proximoTexto}
      />
    );
  }

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
      .select('id, nombre, descripcion, precio, disponible, categoria_id, imagenes_paths')
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
        imagenes_paths: string[] | null;
      }[]
    )
      .filter((p) => p.categoria_id === c.id)
      .map(({ id, nombre, descripcion, precio, disponible, imagenes_paths }) => ({
        id,
        nombre,
        descripcion,
        precio,
        disponible,
        imagenes_paths: imagenes_paths ?? [],
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
