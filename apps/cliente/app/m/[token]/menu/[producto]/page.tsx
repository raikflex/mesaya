import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string; producto: string }>;
}

/**
 * Placeholder del Bloque 2 — el detalle real con cantidad y notas se construye
 * en el Bloque 3.
 */
export default async function ProductoPage({ params }: PageProps) {
  const { token, producto } = await params;
  const supabase = await createClient();

  // Validar que el producto existe y pertenece al restaurante de esta mesa.
  const { data: mesa } = await supabase
    .from('mesas')
    .select('restaurante_id')
    .eq('qr_token', token)
    .maybeSingle();

  if (!mesa) notFound();

  const { data: prod } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, precio, disponible')
    .eq('id', producto)
    .eq('restaurante_id', mesa.restaurante_id as string)
    .maybeSingle();

  if (!prod) notFound();

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{ background: 'var(--color-paper)' }}
    >
      <div className="w-full max-w-sm">
        <p
          className="text-[0.7rem] uppercase tracking-[0.14em] mb-2"
          style={{ color: 'var(--color-muted)' }}
        >
          Detalle de producto
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] mb-3"
          style={{ color: 'var(--color-ink)' }}
        >
          {prod.nombre as string}
        </h1>
        {prod.descripcion ? (
          <p
            className="text-sm leading-relaxed mb-5"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {prod.descripcion as string}
          </p>
        ) : null}
        <p
          className="font-[family-name:var(--font-mono)] text-2xl mb-8"
          style={{ color: 'var(--color-ink)' }}
        >
          ${(prod.precio as number).toLocaleString('es-CO')}
        </p>
        <p
          className="text-xs italic mb-8"
          style={{ color: 'var(--color-muted)' }}
        >
          La pantalla con cantidad y notas se construye en el siguiente bloque.
        </p>
        <Link
          href={`/m/${token}/menu`}
          className="inline-flex items-center gap-2 h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium"
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al menú
        </Link>
      </div>
    </main>
  );
}
