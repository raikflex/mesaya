import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { MenuManager } from './menu-manager';
import { PlatoDelDiaManager, type PlatoDia, type DiaConPlato } from './plato-del-dia-manager';
import { MenusPregrabadosManager, type MenuPregrabado } from './menus-pregrabados-manager';
import { MenuPorDia } from './menu-por-dia';

export const metadata = { title: 'Menu - EnPura' };

export type Categoria = {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
};

export type Producto = {
  id: string;
  nombre: string;
  precio: number;
  categoria_id: string;
  descripcion: string | null;
  disponible: boolean;
  tiempo_preparacion_min: number | null;
  imagenes_paths: string[];
  canal_restaurante: boolean;
  canal_domicilios_diarios: boolean;
  canal_domicilios_programados: boolean;
};

type PlatoRaw = {
  fecha: string;
  producto_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
};

type MenuRaw = {
  id: string;
  nombre: string;
  canal: string;
  activo: boolean;
  menu_pregrabado_productos: { producto_id: string }[] | null;
};

// Ventana del plato del dia: hoy hasta el domingo de la proxima semana (hora
// Bogota), igual que la ventana del cliente. Las fechas pasadas se caen solas.
function fechasVentana(): string[] {
  const bogota = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  const dow = bogota.getDay();
  const offsetFinal = (dow === 0 ? 0 : 7 - dow) + 7;
  const fechas: string[] = [];
  for (let i = 0; i <= offsetFinal; i++) {
    const d = new Date(bogota);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    fechas.push(`${y}-${m}-${dd}`);
  }
  return fechas;
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();
  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');
  if (perfil.rol !== 'dueno') redirect('/login?error=acceso-denegado');
  const restauranteId = perfil.restaurante_id as string;
  const fechas = fechasVentana();
  const [
    { data: categorias },
    { data: productos },
    { data: restaurante },
    { data: platosRaw },
    { data: menusRaw },
    { data: asignRaw },
  ] = await Promise.all([
      supabase
        .from('categorias')
        .select('id, nombre, orden, activa')
        .eq('restaurante_id', restauranteId)
        .eq('activa', true)
        .order('orden', { ascending: true }),
      supabase
        .from('productos')
        .select(
          'id, nombre, precio, categoria_id, descripcion, disponible, tiempo_preparacion_min, imagenes_paths, canal_restaurante, canal_domicilios_diarios, canal_domicilios_programados',
        )
        .eq('restaurante_id', restauranteId)
        .order('nombre', { ascending: true }),
      supabase.from('restaurantes').select('nombre_publico').eq('id', restauranteId).single(),
      supabase
        .from('platos_del_dia')
        .select('fecha, producto_id, nombre, descripcion, precio, activo')
        .eq('restaurante_id', restauranteId)
        .gte('fecha', fechas[0])
        .lte('fecha', fechas[fechas.length - 1]),
      supabase
        .from('menus_pregrabados')
        .select('id, nombre, canal, activo, menu_pregrabado_productos(producto_id)')
        .eq('restaurante_id', restauranteId)
        .order('creado_en', { ascending: true }),
      supabase
        .from('menu_dia_asignacion')
        .select('canal, dia_semana, menu_id')
        .eq('restaurante_id', restauranteId),
    ]);
  const params = await searchParams;
  const tabActiva: 'categorias' | 'productos' =
    params.tab === 'categorias' ? 'categorias' : 'productos';
  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu negocio';

  const listaProductos = (productos ?? []) as Producto[];
  const platoPorFecha = new Map<string, PlatoDia>();
  for (const p of (platosRaw ?? []) as PlatoRaw[]) {
    platoPorFecha.set(p.fecha, {
      producto_id: p.producto_id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: p.precio,
      activo: p.activo,
    });
  }
  const diasPlato: DiaConPlato[] = fechas.map((f) => ({
    fecha: f,
    plato: platoPorFecha.get(f) ?? null,
  }));

  const menusPregrabados: MenuPregrabado[] = ((menusRaw ?? []) as MenuRaw[]).map((m) => ({
    id: m.id,
    nombre: m.nombre,
    canal: m.canal,
    activo: m.activo,
    productoIds: (m.menu_pregrabado_productos ?? []).map((x) => x.producto_id),
  }));

  const menusConCanal = menusPregrabados.map((m) => ({
    id: m.id,
    nombre: m.nombre,
    canal: m.canal,
  }));

  const asignacionesDia = (
    (asignRaw ?? []) as { canal: string; dia_semana: number; menu_id: string }[]
  ).map((a) => ({ canal: a.canal, dia_semana: a.dia_semana, menu_id: a.menu_id }));

  return (
    <PanelShell currentPage="menu" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 max-w-5xl mx-auto space-y-8">
        <header>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu{' '}
            <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
              menu
            </em>
            .
          </h1>
          <p
            className="mt-3 text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Edita precios, marca productos como sin stock cuando se acaben, o agrega novedades.
          </p>
        </header>

        <PlatoDelDiaManager
          productos={listaProductos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio }))}
          dias={diasPlato}
        />

        <MenusPregrabadosManager
          productos={listaProductos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio }))}
          menus={menusPregrabados}
        />

        <MenuPorDia menus={menusConCanal} asignaciones={asignacionesDia} />

        <MenuManager
          categorias={(categorias ?? []) as Categoria[]}
          productos={listaProductos}
          tabInicial={tabActiva}
        />
      </main>
    </PanelShell>
  );
}
