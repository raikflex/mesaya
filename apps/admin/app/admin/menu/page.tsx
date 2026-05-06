import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { MenuManager } from './menu-manager';

export const metadata = { title: 'Menú · MesaYA' };

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
};

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

  const [{ data: categorias }, { data: productos }, { data: restaurante }] =
    await Promise.all([
      supabase
        .from('categorias')
        .select('id, nombre, orden, activa')
        .eq('restaurante_id', restauranteId)
        .eq('activa', true)
        .order('orden', { ascending: true }),
      supabase
        .from('productos')
        .select('id, nombre, precio, categoria_id, descripcion, disponible')
        .eq('restaurante_id', restauranteId)
        .order('nombre', { ascending: true }),
      supabase
        .from('restaurantes')
        .select('nombre_publico')
        .eq('id', restauranteId)
        .single(),
    ]);

  const params = await searchParams;
  const tabActiva: 'categorias' | 'productos' =
    params.tab === 'categorias' ? 'categorias' : 'productos';

  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu negocio';

  return (
    <PanelShell currentPage="menu" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 max-w-5xl mx-auto space-y-8">
        <header>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu{' '}
            <em
              className="not-italic"
              style={{ fontStyle: 'italic', fontWeight: 400 }}
            >
              menú
            </em>
            .
          </h1>
          <p
            className="mt-3 text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Edita precios, marca productos como sin stock cuando se acaben, o
            agrega novedades.
          </p>
        </header>

        <MenuManager
          categorias={(categorias ?? []) as Categoria[]}
          productos={(productos ?? []) as Producto[]}
          tabInicial={tabActiva}
        />
      </main>
    </PanelShell>
  );
}
