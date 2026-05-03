import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string; comanda: string }>;
}

export default async function ComandaEnviadaPage({ params }: PageProps) {
  const { token, comanda } = await params;
  const supabase = await createClient();

  // Validar mesa.
  const { data: mesa } = await supabase
    .from('mesas')
    .select(
      `
      restaurante_id,
      numero,
      restaurantes (nombre_publico, color_marca)
    `,
    )
    .eq('qr_token', token)
    .maybeSingle();

  if (!mesa) notFound();

  const restaurante = (Array.isArray(mesa.restaurantes)
    ? mesa.restaurantes[0]
    : mesa.restaurantes) as {
    nombre_publico: string;
    color_marca: string;
  } | null;

  if (!restaurante) notFound();

  // Validar comanda + traer items.
  const { data: comandaData } = await supabase
    .from('comandas')
    .select(
      `
      id,
      numero_diario,
      estado,
      total,
      creada_en,
      sesion_clientes (nombre)
    `,
    )
    .eq('id', comanda)
    .eq('restaurante_id', mesa.restaurante_id as string)
    .maybeSingle();

  if (!comandaData) notFound();

  const sesionCliente = (Array.isArray(comandaData.sesion_clientes)
    ? comandaData.sesion_clientes[0]
    : comandaData.sesion_clientes) as { nombre: string } | null;

  const { data: items } = await supabase
    .from('comanda_items')
    .select('id, nombre_snapshot, precio_snapshot, cantidad, nota')
    .eq('comanda_id', comanda)
    .order('id', { ascending: true });

  const colorMarca = restaurante.color_marca;
  const numeroDiario = comandaData.numero_diario as number;
  const total = comandaData.total as number;
  const nombreCliente = sesionCliente?.nombre ?? '';

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)' }}
    >
      <div className="flex-1 px-5 py-12 max-w-md mx-auto w-full">
        {/* Icono check */}
        <div
          className="size-20 rounded-full grid place-items-center mx-auto mb-6"
          style={{ background: colorMarca, color: 'white' }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline
              points="5 12 10 17 19 8"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="text-center mb-8">
          <p
            className="text-[0.7rem] uppercase tracking-[0.16em] mb-2"
            style={{ color: 'var(--color-muted)' }}
          >
            Pedido #{numeroDiario.toString().padStart(3, '0')}
          </p>
          <h1
            className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1] mb-3"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu pedido está en{' '}
            <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
              cocina
            </em>
            .
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {nombreCliente}, mesa {mesa.numero as string} ·{' '}
            {restaurante.nombre_publico}
          </p>
        </div>

        {/* Resumen del pedido */}
        <section
          className="rounded-[var(--radius-lg)] border bg-white mb-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="px-5 py-3 border-b"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2
              className="text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Tu pedido
            </h2>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {(items ?? []).map((item) => {
              const subtotal = (item.precio_snapshot as number) * (item.cantidad as number);
              return (
                <li key={item.id as string} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        <span style={{ color: 'var(--color-muted)' }}>
                          {item.cantidad as number}×
                        </span>{' '}
                        {item.nombre_snapshot as string}
                      </p>
                      {item.nota ? (
                        <p
                          className="text-xs mt-1 italic"
                          style={{ color: 'var(--color-ink-soft)' }}
                        >
                          {item.nota as string}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="font-[family-name:var(--font-mono)] text-sm shrink-0"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      ${subtotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div
            className="px-5 py-3 border-t flex items-center justify-between"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--color-ink)' }}
            >
              Total
            </span>
            <span
              className="font-[family-name:var(--font-display)] text-xl"
              style={{ color: 'var(--color-ink)' }}
            >
              ${total.toLocaleString('es-CO')}
            </span>
          </div>
        </section>

        {/* Aviso */}
        <p
          className="text-[0.7rem] text-center mb-8 leading-relaxed"
          style={{ color: 'var(--color-muted)' }}
        >
          La cocina ya recibió tu pedido. Lo prepararán en orden de llegada y
          el mesero te lo entregará en cuanto esté listo.
        </p>

        {/* Botones */}
        <div className="space-y-2">
          <Link
            href={`/m/${token}/menu`}
            className="w-full h-12 grid place-items-center rounded-[var(--radius-md)] text-sm font-medium"
            style={{
              background: colorMarca,
              color: 'white',
            }}
          >
            Agregar más al pedido
          </Link>
          <button
            type="button"
            disabled
            className="w-full h-12 rounded-[var(--radius-md)] text-sm font-medium border opacity-50 cursor-not-allowed"
            style={{
              background: 'white',
              color: 'var(--color-ink)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
            Llamar al mesero (próximamente)
          </button>
          <button
            type="button"
            disabled
            className="w-full h-12 rounded-[var(--radius-md)] text-sm font-medium border opacity-50 cursor-not-allowed"
            style={{
              background: 'white',
              color: 'var(--color-ink)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
            Pedir la cuenta (próximamente)
          </button>
        </div>
      </div>

      <footer className="py-6 text-center">
        <p
          className="text-[0.7rem] uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-muted)' }}
        >
          Servido con <span style={{ color: 'var(--color-ink)' }}>MesaYA</span>
        </p>
      </footer>
    </main>
  );
}
