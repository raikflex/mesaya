import { notFound, redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { MenuExterno } from './menu-externo';
import { SelectorModo } from './selector-modo';
import { EstadoRestauranteScreen } from '../../m/[token]/estado-restaurante';
import { estaAbiertoAhora, type HorarioDia, type ExcepcionDia } from '../../../lib/horarios';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ modo?: string }>;
}

export default async function RestaurantePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { modo } = await searchParams;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select(
      'id, nombre_publico, color_marca, logo_url, estado, acepta_domicilios, acepta_pickup, acepta_domicilios_programados',
    )
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado === 'inactivo') {
    notFound();
  }

  const restauranteId = restaurante.id as string;
  const nombreNegocio = restaurante.nombre_publico as string;
  const colorMarca = restaurante.color_marca as string;
  const logoUrl = (restaurante.logo_url as string | null) ?? null;

  // Hay dos caminos posibles:
  //   inmediato  = domicilio normal o para recoger (el menu de hoy)
  //   programado = el planificador de domicilios programados
  const inmediato =
    ((restaurante.acepta_domicilios as boolean) ?? false) ||
    ((restaurante.acepta_pickup as boolean) ?? false);
  const programado = (restaurante.acepta_domicilios_programados as boolean) ?? false;

  // Ningun modo: no recibe pedidos en linea.
  if (!inmediato && !programado) {
    return (
      <EstadoRestauranteScreen
        tipo="cerrado"
        nombreNegocio={nombreNegocio}
        colorMarca={colorMarca}
        proximaApertura="Este negocio no esta recibiendo pedidos en linea por ahora."
      />
    );
  }

  // Solo programado: directo al planificador (no pasa por el menu de hoy).
  if (programado && !inmediato) {
    redirect(`/d/${slug}/programar`);
  }

  // Ambos modos: mostrar el selector, salvo que el cliente ya eligio "pedir
  // ahora" (?modo=ahora), en cuyo caso cae al menu inmediato de abajo.
  if (inmediato && programado && modo !== 'ahora') {
    return (
      <SelectorModo
        slug={slug}
        nombreNegocio={nombreNegocio}
        colorMarca={colorMarca}
        logoUrl={logoUrl}
      />
    );
  }

  // ------------------------------------------------------------------
  // A partir de aqui: MENU INMEDIATO (igual que antes del selector).
  // Aplica solo cuando hay modo inmediato (solo-inmediato, o ambos con
  // ?modo=ahora). El horario que valida es el del LOCAL.
  // ------------------------------------------------------------------

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
        nombreNegocio={nombreNegocio}
        colorMarca={colorMarca}
        proximaApertura={estadoApertura.proximoTexto}
      />
    );
  }

  // Menu pregrabado activo para este canal (si hay, reemplaza el menu normal).
  const { data: menuActivo } = await supabase
    .from('menus_pregrabados')
    .select('id')
    .eq('restaurante_id', restauranteId)
    .eq('canal', 'domicilios_diarios')
    .eq('activo', true)
    .maybeSingle();

  let idsMenu: string[] | null = null;
  if (menuActivo) {
    const { data: mp } = await supabase
      .from('menu_pregrabado_productos')
      .select('producto_id')
      .eq('menu_id', menuActivo.id as string);
    idsMenu = (mp ?? []).map((x) => x.producto_id as string);
  }

  let productosQuery = supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, disponible, categoria_id, imagenes_paths')
    .eq('restaurante_id', restauranteId);
  if (idsMenu !== null) {
    // Menu activo: solo sus productos (sin filtrar por canal, el menu los reemplaza).
    productosQuery = productosQuery.in(
      'id',
      idsMenu.length > 0 ? idsMenu : ['00000000-0000-0000-0000-000000000000'],
    );
  } else {
    productosQuery = productosQuery.eq('canal_domicilios_diarios', true);
  }

  const [{ data: categorias }, { data: productos }] = await Promise.all([
    supabase
      .from('categorias')
      .select('id, nombre, orden')
      .eq('restaurante_id', restauranteId)
      .eq('activa', true)
      .order('orden', { ascending: true }),
    productosQuery.order('nombre', { ascending: true }),
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
      nombreNegocio={nombreNegocio}
      colorMarca={colorMarca}
      logoUrl={logoUrl}
      grupos={grupos}
      aceptaDomicilios={(restaurante.acepta_domicilios as boolean) ?? false}
      aceptaPickup={(restaurante.acepta_pickup as boolean) ?? false}
    />
  );
}
