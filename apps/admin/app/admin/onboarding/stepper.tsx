'use client';

import { usePathname } from 'next/navigation';
import { cn } from '@mesaya/ui';

const PASOS = [
  { n: 1, titulo: 'Negocio', slug: 'paso-1' },
  { n: 2, titulo: 'Meseros', slug: 'paso-2' },
  { n: 3, titulo: 'Horario', slug: 'paso-3' },
  { n: 4, titulo: 'Categorías', slug: 'paso-4' },
  { n: 5, titulo: 'Productos', slug: 'paso-5' },
  { n: 6, titulo: 'Mesas', slug: 'paso-6' },
  { n: 7, titulo: 'QRs', slug: 'paso-7' },
  { n: 8, titulo: 'Equipo', slug: 'paso-8' },
] as const;

export function Stepper() {
  const pathname = usePathname();
  const currentSlug = PASOS.find((p) => pathname.endsWith(p.slug))?.slug ?? 'paso-1';
  const currentN = PASOS.find((p) => p.slug === currentSlug)?.n ?? 1;

  return (
    <nav
      aria-label="Pasos de configuración"
      className="border-b px-6 sm:px-10 py-3 overflow-x-auto"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
    >
      <ol className="flex items-center gap-1.5 min-w-max text-xs sm:text-sm">
        {PASOS.map((p, i) => {
          const activo = p.n === currentN;
          const completado = p.n < currentN;
          return (
            <li key={p.n} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex items-center gap-2 py-1.5 px-2.5 rounded-full transition-colors',
                  activo && 'bg-[var(--color-ink)] text-[var(--color-paper)]',
                  completado && 'text-[var(--color-ink-soft)]',
                  !activo && !completado && 'text-[var(--color-muted)]',
                )}
              >
                <span
                  className={cn(
                    'inline-grid place-items-center size-5 rounded-full text-[0.7rem] font-medium',
                    activo && 'bg-[var(--color-paper)] text-[var(--color-ink)]',
                    completado && 'bg-[var(--color-ink)] text-[var(--color-paper)]',
                    !activo &&
                      !completado &&
                      'bg-[var(--color-paper-deep)] text-[var(--color-muted)]',
                  )}
                  aria-hidden={completado}
                >
                  {completado ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="size-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline
                        points="5 12 10 17 19 8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    p.n
                  )}
                </span>
                {p.titulo}
              </span>
              {i < PASOS.length - 1 ? (
                <span
                  aria-hidden
                  className="w-3 h-px"
                  style={{
                    background: completado
                      ? 'var(--color-ink-soft)'
                      : 'var(--color-border-strong)',
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
