import { notFound, redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import {
  MenuProgramarCliente,
  type DiaMenu,
  type GrupoMenu,
  type PlatoDelDiaCliente,
} from './menu-programar-cliente';
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
  const seleccionadosDisp = disponibles.filter((d) => fechasPedidas.has(d.fecha));
  const diasSeleccionados: DiaMenu[] = seleccionadosDisp.map((d) => ({
    fecha: d.fecha,
    nombre: d.nombre,
    corte: d.corte,
    esHoy: d.esHoy,
  }));

  // Si no quedo ningun dia valido, de vuelta a elegir dias.
  if (diasSeleccionados.length === 0) {
    redirect(`/d/${slug}/programar`);
  }

  // Categorias + TODOS los productos (para resolver menu por dia) + platos +
  // asignaciones de menu por dia (canal domicilios programados).
  const [{ data: categorias }, { data: productos }, { data: platosRaw }, { data: asignRaw }] =
    await Promise.all([
      supabase
        .from('categorias')
        .select('id, nombre, orden')
        .eq('restaurante_id', restauranteId)
        .eq('activa', true)
        .order('orden', { ascending: true }),
      supabase
        .from('productos')
        .select(
          'id, nombre, descripcion, precio, disponible, categoria_id, imagenes_paths, canal_domicilios_programados',
        )
        .eq('restaurante_id', restauranteId)
        .order('nombre', { ascending: true }),
      supabase
        .from('platos_del_dia')
        .select('id, dia_semana, producto_id, nombre, descripcion, precio, imagen_path, activo')
        .eq('restaurante_id', restauranteId)
        .eq('activo', true),
      supabase
        .from('menu_dia_asignacion')
        .select('dia_semana, menu_id')
        .eq('restaurante_id', restauranteId)
        .eq('canal', 'domicilios_programados'),
    ]);

  // Asignaciones dia -> menu_id (incluye -1 = Por defecto).
  const asignaciones = (asignRaw ?? []) as { dia_semana: number; menu_id: string }[];
  const asignMap = new Map<number, string>();
  for (const a of asignaciones) asignMap.set(a.dia_semana, a.menu_id);

  // Productos de los menus usados por las asignaciones.
  const menuIdsUsados = [...new Set(asignaciones.map((a) => a.menu_id))];
  const menuProductos = new Map<string, Set<string>>();
  if (menuIdsUsados.length > 0) {
    const { data: mpRaw } = await supabase
      .from('menu_pregrabado_productos')
      .select('menu_id, producto_id')
      .in('menu_id', menuIdsUsados);
    for (const r of (mpRaw ?? []) as { menu_id: string; producto_id: string }[]) {
      if (!menuProductos.has(r.menu_id)) menuProductos.set(r.menu_id, new Set());
      menuProductos.get(r.menu_id)!.add(r.producto_id);
    }
  }

  type ProdRow = {
    id: string;
    nombre: string;
    descripcion: string | null;
    precio: number;
    disponible: boolean;
    categoria_id: string;
    imagenes_paths: string[] | null;
    canal_domicilios_programados: boolean;
  };
  const todosProductos = (productos ?? []) as ProdRow[];

  // Resuelve el menu de un dia: menu del dia -> Por defecto -> menu normal.
  function gruposParaDia(diaSemana: number): GrupoMenu[] {
    const menuId = asignMap.get(diaSemana) ?? asignMap.get(-1) ?? null;
    const lista = menuId
      ? todosProductos.filter((p) => menuProductos.get(menuId)?.has(p.id))
      : todosProductos.filter((p) => p.canal_domicilios_programados);
    return (categorias ?? []).map((c) => ({
      id: c.id as string,
      nombre: c.nombre as string,
      orden: c.orden as number,
      productos: lista
        .filter((p) => p.categoria_id === (c.id as string))
        .map(({ id, nombre, descripcion, precio, disponible, imagenes_paths }) => ({
          id,
          nombre,
          descripcion,
          precio,
          disponible,
          imagenes_paths: imagenes_paths ?? [],
        })),
    }));
  }

  const gruposPorFecha: Record<string, GrupoMenu[]> = {};
  for (const d of seleccionadosDisp) {
    gruposPorFecha[d.fecha] = gruposParaDia(d.diaSemana);
  }

  // Plato del dia por dia de la semana (activos), mapeado a cada fecha elegida.
  const platoPorDiaSemana = new Map<number, PlatoDelDiaCliente>();
  for (const p of platosRaw ?? []) {
    platoPorDiaSemana.set(p.dia_semana as number, {
      id: p.id as string,
      producto_id: (p.producto_id as string | null) ?? null,
      nombre: p.nombre as string,
      descripcion: (p.descripcion as string | null) ?? null,
      precio: p.precio as number,
      imagen_path: (p.imagen_path as string | null) ?? null,
    });
  }
  const platosPorFecha: Record<string, PlatoDelDiaCliente> = {};
  for (const d of seleccionadosDisp) {
    const plato = platoPorDiaSemana.get(d.diaSemana);
    if (plato) platosPorFecha[d.fecha] = plato;
  }

  return (
    <MenuProgramarCliente
      slug={slug}
      nombreNegocio={restaurante.nombre_publico as string}
      colorMarca={restaurante.color_marca as string}
      logoUrl={(restaurante.logo_url as string | null) ?? null}
      dias={diasSeleccionados}
      gruposPorFecha={gruposPorFecha}
      platosPorFecha={platosPorFecha}
    />
  );
}
