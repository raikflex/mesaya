import Link from 'next/link';

export function SelectorModo({
  slug,
  nombreNegocio,
  colorMarca,
  logoUrl,
}: {
  slug: string;
  nombreNegocio: string;
  colorMarca: string;
  logoUrl: string | null;
}) {
  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)' }}
    >
      <header className="px-5 py-4 flex items-center gap-3">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo de ${nombreNegocio}`}
            className="size-10 rounded-full object-contain shrink-0"
            style={{ background: 'white' }}
          />
        ) : (
          <div
            className="size-10 rounded-full grid place-items-center shrink-0 text-white text-sm font-medium"
            style={{ background: colorMarca }}
          >
            {nombreNegocio.charAt(0).toUpperCase()}
          </div>
        )}
        <h1
          className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate"
          style={{ color: 'var(--color-ink)' }}
        >
          {nombreNegocio}
        </h1>
      </header>

      <div className="flex-1 px-5 pt-6 max-w-md w-full mx-auto">
        <h2
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.05] mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          Como quieres pedir?
        </h2>
        <p className="text-sm leading-relaxed mb-7" style={{ color: 'var(--color-ink-soft)' }}>
          Este negocio tiene dos formas de pedir. Elige la que prefieras.
        </p>

        <div className="space-y-3">
          {/* Pedir ahora (inmediato) */}
          <Link
            href={`/d/${slug}?modo=ahora`}
            className="block rounded-[var(--radius-lg)] border bg-white p-5 transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-4">
              <span
                className="size-11 rounded-[var(--radius-md)] grid place-items-center shrink-0"
                style={{ background: colorMarca, color: 'white' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>
                  Pedir ahora
                </p>
                <p
                  className="text-sm mt-1 leading-relaxed"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  A domicilio o para recoger, lo antes posible. Pides y te llega hoy.
                </p>
              </div>
              <Chevron />
            </div>
          </Link>

          {/* Programar para la semana */}
          <Link
            href={`/d/${slug}/programar`}
            className="block rounded-[var(--radius-lg)] border bg-white p-5 transition-colors"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="flex items-start gap-4">
              <span
                className="size-11 rounded-[var(--radius-md)] grid place-items-center shrink-0"
                style={{ background: colorMarca, color: 'white' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M3 9h18M8 2v4M16 2v4"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>
                  Programar para la semana
                </p>
                <p
                  className="text-sm mt-1 leading-relaxed"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  Elige para que dias quieres tu pedido, con fecha y hora de entrega. Dejas todo
                  listo de una vez.
                </p>
              </div>
              <Chevron />
            </div>
          </Link>
        </div>
      </div>

      <footer className="py-6 text-center mt-4">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
          Servido con <span style={{ color: 'var(--color-ink)' }}>EnPura</span>
        </p>
      </footer>
    </main>
  );
}

function Chevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 mt-0.5"
      style={{ color: 'var(--color-muted)' }}
    >
      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
