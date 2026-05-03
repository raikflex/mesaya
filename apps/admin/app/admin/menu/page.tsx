import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { Button } from '@mesaya/ui';
import { logout } from '../../actions/auth';
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

  return (
    <main className="min-h-screen">
      <Header nombreNegocio={(restaurante?.nombre_publico as string) ?? ''} />

      <div className="px-6 sm:px-10 py-10 max-w-5xl mx-auto space-y-8">
        <Breadcrumb />

        <header>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu{' '}
            <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
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
      </div>
    </main>
  );
}

function Breadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-muted)' }}>
      <Link
        href="/admin"
        className="uppercase tracking-[0.14em] hover:text-[var(--color-ink)] transition-colors"
      >
        Panel
      </Link>
      <span aria-hidden>·</span>
      <span className="uppercase tracking-[0.14em]" style={{ color: 'var(--color-ink)' }}>
        Menú
      </span>
    </nav>
  );
}

function Header({ nombreNegocio }: { nombreNegocio: string }) {
  return (
    <header
      className="border-b px-6 sm:px-10 py-4 flex items-center justify-between"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <Link href="/admin" className="inline-flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden>
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            rx="6"
            stroke="var(--color-ink)"
            strokeWidth="1.5"
          />
          <circle cx="22" cy="22" r="3" fill="var(--color-accent)" />
        </svg>
        <span
          className="font-[family-name:var(--font-display)] text-xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          MesaYA
        </span>
        <span
          className="hidden sm:inline text-sm ml-2 truncate max-w-[200px]"
          style={{ color: 'var(--color-muted)' }}
        >
          / {nombreNegocio}
        </span>
      </Link>
      <form action={logout}>
        <Button type="submit" variant="ghost" size="sm">
          Cerrar sesión
        </Button>
      </form>
    </header>
  );
}
