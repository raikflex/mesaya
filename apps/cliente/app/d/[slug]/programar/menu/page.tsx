import { notFound, redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { MenuProgramarCliente, type DiaMenu, type GrupoMenu } from './menu-programar-cliente';
import { diasDomicilioDisponibles } from '../../../../../lib/domicilios-disponibilidad';
import type { HorarioDia } from '../../../../../lib/horarios';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dias?: string }>;
}

export default async function MenuProgramarPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { dias: diasParam } = await searchParams;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, nombre_publico, color_marca, logo_url, estado, acepta_domicilios_programados')
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado === 'inactivo') {
    notFound();
  }

  if (!((restaurante.acepta_domicilios_programados as boolean) ?? false)) {
    redirect(`/d/${slug}`);
  }

  const restauranteId = restaurante.id as string;

  // Recalcular los dias disponibles AHORA (defensa: un dia pudo cerrarse
  // mientras el cliente elegia). Solo dejamos pasar los que siguen abiertos.
  const { data: horariosDomRaw } = await supabase
    .from('horarios_domicilios')
    .select('dia_semana, abierto, hora_apertura, hora_cierre')
    .eq('restaurante_id', restauranteId)
    .order('dia_semana', { ascending: true });

  const horariosDom: HorarioDia[] = (horariosDomRaw ?? []).map((h) => ({
    dia_semana: h.dia_semana as number,
    abierto: h.abierto as boolean,
    hora_apertura: (h.hora_apertura as string | null) ?? null,
    hora_cierre: (h.hora_cierre as string | null) ?? null,
  }));

  const disponibles = diasDomicilioDisponibles(horariosDom);
  const fechasPedidas = new Set((diasParam ?? '').split(',').filter(Boolean));

  // Interseccion: los dias pedidos que TODAVIA estan disponibles, en orden.
  const diasSeleccionados: DiaMenu[] = disponibles
    .filter((d) => fechasPedidas.has(d.fecha))
    .map((d) => ({ fecha: d.fecha, nombre: d.nombre, corte: d.corte, esHoy: d.esHoy }));

  // Si no quedo ningun dia valido, de vuelta a elegir dias.
  if (diasSeleccionados.length === 0) {
    redirect(`/d/${slug}/programar`);
  }

  // Categorias activas + productos (igual que el menu inmediato).
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

  const grupos: GrupoMenu[] = (categorias ?? []).map((c) => ({
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
    <MenuProgramarCliente
      slug={slug}
      nombreNegocio={restaurante.nombre_publico as string}
      colorMarca={restaurante.color_marca as string}
      logoUrl={(restaurante.logo_url as string | null) ?? null}
      dias={diasSeleccionados}
      grupos={grupos}
    />
  );
}
