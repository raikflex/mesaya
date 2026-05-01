import Link from 'next/link';

const PASOS = [
  { n: 1, titulo: 'Negocio', href: '/admin/onboarding/paso-1' },
  { n: 2, titulo: 'Meseros', href: '/admin/onboarding/paso-2' },
  { n: 3, titulo: 'Horario', href: '/admin/onboarding/paso-3' },
  { n: 4, titulo: 'Categorías', href: '/admin/onboarding/paso-4' },
  { n: 5, titulo: 'Productos', href: '/admin/onboarding/paso-5' },
  { n: 6, titulo: 'Mesas', href: '/admin/onboarding/paso-6' },
  { n: 7, titulo: 'QRs', href: '/admin/onboarding/paso-7' },
  { n: 8, titulo: 'Equipo', href: '/admin/onboarding/paso-8' },
] as const;

export default function OnboardingLayout({
  children,
  params: _params,
}: {
  children: React.ReactNode;
  params?: unknown;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Stepper />
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Header() {
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
      </Link>
      <span className="text-xs uppercase tracking-[0.12em]" style={{ color: 'var(--color-muted)' }}>
        Configuración inicial
      </span>
    </header>
  );
}

/**
 * Stepper. Marca el primer paso como activo (paso-1).
 *
 * v0.1 deliberadamente estática: no detecta el path. La lógica de “qué paso
 * desbloqueamos” vive en cada page.tsx. Cuando agreguemos navegación entre
 * pasos en S2.2 lo hacemos client-side leyendo usePathname().
 */
function Stepper() {
  return (
    <nav
      aria-label="Pasos de configuración"
      className="border-b px-6 sm:px-10 py-3 overflow-x-auto"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
    >
      <ol className="flex items-center gap-1.5 min-w-max text-xs sm:text-sm">
        {PASOS.map((p, i) => {
          const activo = i === 0;
          return (
            <li key={p.n} className="flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-2 py-1.5 px-2.5 rounded-full"
                style={{
                  background: activo ? 'var(--color-ink)' : 'transparent',
                  color: activo ? 'var(--color-paper)' : 'var(--color-muted)',
                }}
              >
                <span
                  className="inline-grid place-items-center size-5 rounded-full text-[0.7rem] font-medium"
                  style={{
                    background: activo
                      ? 'var(--color-paper)'
                      : 'var(--color-paper-deep)',
                    color: activo ? 'var(--color-ink)' : 'var(--color-muted)',
                  }}
                >
                  {p.n}
                </span>
                {p.titulo}
              </span>
              {i < PASOS.length - 1 ? (
                <span
                  aria-hidden
                  className="w-3 h-px"
                  style={{ background: 'var(--color-border-strong)' }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
