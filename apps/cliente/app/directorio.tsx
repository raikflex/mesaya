'use client';

import { useState } from 'react';
import Link from 'next/link';

export type RestaurantePublico = {
  nombre: string;
  slug: string;
  logoUrl: string | null;
  colorMarca: string;
  descripcion: string | null;
  ciudad: string | null;
  aceptaDomicilios: boolean;
  aceptaPickup: boolean;
};

export function DirectorioRestaurantes({
  restaurantes,
}: {
  restaurantes: RestaurantePublico[];
}) {
  const [busqueda, setBusqueda] = useState('');

  const q = busqueda.trim().toLowerCase();
  const filtrados = q
    ? restaurantes.filter(
        (r) =>
          r.nombre.toLowerCase().includes(q) ||
          (r.ciudad?.toLowerCase().includes(q) ?? false),
      )
    : restaurantes;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--color-paper)' }}>
      {/* Header */}
      <header className="px-5 pt-10 pb-6 max-w-2xl mx-auto w-full">
        <p
          className="text-xs uppercase tracking-[0.16em] mb-2"
          style={{ color: 'var(--color-muted)' }}
        >
          EnPura
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          Pide en tus{' '}
          <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
            restaurantes
          </em>{' '}
          favoritos.
        </h1>
        <p className="mt-3 text-[0.95rem] leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
          Encuentra un restaurante y pide a domicilio o para recoger.
        </p>

        {/* Barra de busqueda */}
        <div className="relative mt-6">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--color-muted)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
              <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Busca por nombre o ciudad..."
            className="w-full h-12 pl-11 pr-4 rounded-[var(--radius-md)] border text-sm focus:outline-none focus:ring-1"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'white',
            }}
          />
        </div>
      </header>

      {/* Lista */}
      <div className="flex-1 px-5 pb-10 max-w-2xl mx-auto w-full">
        {filtrados.length === 0 ? (
          <div
            className="rounded-[var(--radius-lg)] border border-dashed p-10 text-center"
            style={{ borderColor: 'var(--color-border-strong)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              {restaurantes.length === 0
                ? 'Aun no hay restaurantes disponibles.'
                : `No encontramos restaurantes para "${busqueda}".`}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtrados.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/d/${r.slug}`}
                  className="flex items-center gap-4 rounded-[var(--radius-lg)] border bg-white p-4 transition-shadow hover:shadow-md"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {/* Logo o inicial */}
                  {r.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.logoUrl}
                      alt={r.nombre}
                      className="size-14 rounded-[var(--radius-md)] object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="size-14 rounded-[var(--radius-md)] grid place-items-center shrink-0 font-[family-name:var(--font-display)] text-2xl"
                      style={{ background: r.colorMarca, color: 'white' }}
                    >
                      {r.nombre.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-[family-name:var(--font-display)] text-lg tracking-[-0.01em] truncate"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      {r.nombre}
                    </p>
                    {r.ciudad ? (
                      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                        {r.ciudad}
                      </p>
                    ) : null}
                    {r.descripcion ? (
                      <p
                        className="text-xs mt-1 line-clamp-1"
                        style={{ color: 'var(--color-ink-soft)' }}
                      >
                        {r.descripcion}
                      </p>
                    ) : null}
                    <div className="flex items-center gap-1.5 mt-2">
                      {r.aceptaDomicilios ? (
                        <span
                          className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#dbeafe', color: '#1e40af' }}
                        >
                          Domicilio
                        </span>
                      ) : null}
                      {r.aceptaPickup ? (
                        <span
                          className="text-[0.65rem] px-2 py-0.5 rounded-full font-medium"
                          style={{ background: '#dcfce7', color: '#166534' }}
                        >
                          Para recoger
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <span className="shrink-0" style={{ color: 'var(--color-muted)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <footer className="py-6 text-center">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
          Servido con <span style={{ color: 'var(--color-ink)' }}>EnPura</span>
        </p>
      </footer>
    </main>
  );
}
