import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import type { Tables } from '@mesaya/database/types';
import { CategoriasManager } from './categorias-manager';

export const metadata = { title: 'Paso 4 · Categorías' };

type CategoriaItem = Pick<Tables<'categorias'>, 'id' | 'nombre' | 'orden' | 'activa'>;

export default async function Paso4Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');

  const { data: categorias } = await supabase
    .from('categorias')
    .select('id, nombre, orden, activa')
    .eq('restaurante_id', perfil.restaurante_id)
    .eq('activa', true)
    .order('orden', { ascending: true });

  return (
    <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-3xl mx-auto">
      <header className="mb-10">
        <p
          className="text-xs uppercase tracking-[0.16em] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Paso 4 de 8
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          Tus{' '}
          <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
            categorías
          </em>
          .
        </h1>
        <p
          className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Las grandes secciones de tu menú: <em>Entradas, Platos fuertes, Postres, Bebidas…</em>{' '}
          Mantenlas cortas. El cliente las ve como pestañas en su menú.
        </p>
      </header>

      <CategoriasManager categorias={(categorias ?? []) as CategoriaItem[]} />
    </main>
  );
}
