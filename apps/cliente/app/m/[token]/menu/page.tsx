import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { EstadoRestauranteScreen } from '../estado-restaurante';
import { MenuCliente } from './menu-cliente';
import { estaAbiertoAhora, type HorarioDia, type ExcepcionDia } from '../../../../lib/horarios';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

type CategoriaConProductos = {
  id: string;
  nombre: string;
  orden: number;
  productos: {
    id: string;
    nombre: string;
    descripcion: string | null;
    precio: number;
    disponible: boolean;
    imagenes_paths: string[];
  }[];
};

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
      restaurante_id,
      restaurantes (
        id,
        nombre_publico,
        color_marca,
        estado,
        logo_url
      )
    `,
    )
    .eq('qr_token', token)
    .is('borrada_en', null)
    .maybeSingle();

  if (!mesa) {
    notFound();
  }

  const restaurante = (
    Array.isArray(mesa.restaurantes) ? mesa.restaurantes[0] : mesa.restaurantes
  ) as {
    id: string;
    nombre_publico: string;
    color_marca: string;
    estado: string;
    logo_url: string | null;
  } | null;

  if (!restaurante) {
    notFound();
  }

  if (restaurante.estado === 'pausado') {
    return (
      <EstadoRestauranteScreen
        tipo="pausado"
        nombreNegocio={restaurante.nombre_publico}
        colorMarca={restaurante.color_marca}
      />
    );
  }

  if (restaurante.estado !== 'activo' || !mesa.activa) {
    notFound();
  }

  const restauranteId = restaurante.id;

  // Defense in depth: chequear horario aqui con excepciones
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
        nombreNegocio={restaurante.nombre_publico}
        colorMarca={restaurante.color_marca}
        proximaApertura={estadoApertura.proximoTexto}
      />
    );
  }

  // Menu pregrabado activo para este canal (si hay, reemplaza el menu normal).
  const { data: menuActivo } = await supabase
    .from('menus_pregrabados')
    .select('id')
    .eq('restaurante_id', restauranteId)
    .eq('canal', 'restaurante')
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
    productosQuery = productosQuery.eq('canal_restaurante', true);
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

  const grupos: CategoriaConProductos[] = (categorias ?? []).map((c) => ({
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

  const totalProductos = grupos.reduce((acc, g) => acc + g.productos.length, 0);

  return (
    <MenuCliente
      qrToken={token}
      numeroMesa={mesa.numero as string}
      nombreNegocio={restaurante.nombre_publico}
      colorMarca={restaurante.color_marca}
      logoUrl={restaurante.logo_url}
      grupos={grupos}
      totalProductos={totalProductos}
    />
  );
}
