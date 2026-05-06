'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

export type ReviewFila = {
  id: string;
  estrellas: number;
  comentario: string | null;
  creadaEn: string;
  mesaNumero: string;
  totalFacturado: number;
};

type FiltroEstrella = 'todas' | 1 | 2 | 3 | 4 | 5;
type FiltroFecha = 'todo' | 'hoy' | 'semana' | 'mes';

export function ReviewsManager({
  reviews,
  colorMarca,
  nombreNegocio,
}: {
  reviews: ReviewFila[];
  colorMarca: string;
  nombreNegocio: string;
}) {
  const [filtroEstrella, setFiltroEstrella] = useState<FiltroEstrella>('todas');
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha>('todo');

  // Resumen total (NO afectado por filtros — es la métrica global).
  const resumen = useMemo(() => {
    if (reviews.length === 0) {
      return {
        total: 0,
        promedio: 0,
        distribucion: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
          1 | 2 | 3 | 4 | 5,
          number
        >,
      };
    }
    const distribucion: Record<1 | 2 | 3 | 4 | 5, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    let suma = 0;
    for (const r of reviews) {
      const k = r.estrellas as 1 | 2 | 3 | 4 | 5;
      distribucion[k] += 1;
      suma += r.estrellas;
    }
    return {
      total: reviews.length,
      promedio: suma / reviews.length,
      distribucion,
    };
  }, [reviews]);

  // Lista filtrada por los controles del usuario.
  const filtradas = useMemo(() => {
    const ahora = Date.now();
    const limites: Record<FiltroFecha, number> = {
      todo: 0,
      hoy: ahora - 24 * 60 * 60 * 1000,
      semana: ahora - 7 * 24 * 60 * 60 * 1000,
      mes: ahora - 30 * 24 * 60 * 60 * 1000,
    };
    const limite = limites[filtroFecha];

    return reviews.filter((r) => {
      if (filtroEstrella !== 'todas' && r.estrellas !== filtroEstrella) return false;
      if (limite > 0 && new Date(r.creadaEn).getTime() < limite) return false;
      return true;
    });
  }, [reviews, filtroEstrella, filtroFecha]);

  return (
    <main
      className="min-h-screen"
      style={{ background: 'var(--color-paper)' }}
    >
      <div className="max-w-4xl mx-auto px-5 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-xs mb-4"
          style={{ color: 'var(--color-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al panel
        </Link>

        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Reseñas
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-ink-soft)' }}>
          Lo que opinan tus clientes después de visitar {nombreNegocio}.
        </p>

        {/* Resumen global */}
        <CardResumen resumen={resumen} colorMarca={colorMarca} />

        {/* Filtros + Lista */}
        {reviews.length > 0 ? (
          <>
            <Filtros
              filtroEstrella={filtroEstrella}
              setFiltroEstrella={setFiltroEstrella}
              filtroFecha={filtroFecha}
              setFiltroFecha={setFiltroFecha}
              colorMarca={colorMarca}
            />
            <ListaReviews reviews={filtradas} colorMarca={colorMarca} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </main>
  );
}

function CardResumen({
  resumen,
  colorMarca,
}: {
  resumen: {
    total: number;
    promedio: number;
    distribucion: Record<1 | 2 | 3 | 4 | 5, number>;
  };
  colorMarca: string;
}) {
  if (resumen.total === 0) {
    return (
      <section
        className="rounded-[var(--radius-lg)] border bg-white p-6 mb-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p
          className="text-sm text-center"
          style={{ color: 'var(--color-muted)' }}
        >
          Aún no hay reseñas. Cuando los clientes terminen su visita podrán
          dejar su opinión, y aparecerán aquí.
        </p>
      </section>
    );
  }

  const promedioFmt = resumen.promedio.toFixed(1);
  const max = Math.max(...Object.values(resumen.distribucion), 1);

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white p-6 mb-6"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8 items-center">
        {/* Big number */}
        <div className="text-center md:text-left md:border-r md:pr-8" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center justify-center md:justify-start gap-1 mb-1">
            <svg width="28" height="28" viewBox="0 0 24 24" fill={colorMarca} style={{ color: colorMarca }}>
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="font-[family-name:var(--font-display)] text-5xl tracking-[-0.02em]"
              style={{ color: 'var(--color-ink)' }}
            >
              {promedioFmt}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            promedio · {resumen.total}{' '}
            {resumen.total === 1 ? 'reseña' : 'reseñas'}
          </p>
        </div>

        {/* Distribución */}
        <div className="space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const cant = resumen.distribucion[n];
            const pct = (cant / max) * 100;
            return (
              <div key={n} className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 w-6 shrink-0">
                  <span style={{ color: 'var(--color-ink-soft)' }}>{n}</span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill={colorMarca}
                    style={{ color: colorMarca }}
                  >
                    <polygon
                      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                    />
                  </svg>
                </div>
                <div
                  className="flex-1 h-2 rounded-full overflow-hidden"
                  style={{ background: 'var(--color-paper-deep)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: colorMarca,
                      opacity: cant === 0 ? 0 : 1,
                    }}
                  />
                </div>
                <span
                  className="font-[family-name:var(--font-mono)] tabular-nums w-8 text-right"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  {cant}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Filtros({
  filtroEstrella,
  setFiltroEstrella,
  filtroFecha,
  setFiltroFecha,
  colorMarca,
}: {
  filtroEstrella: FiltroEstrella;
  setFiltroEstrella: (v: FiltroEstrella) => void;
  filtroFecha: FiltroFecha;
  setFiltroFecha: (v: FiltroFecha) => void;
  colorMarca: string;
}) {
  return (
    <section className="mb-5 space-y-3">
      <FiltroGrupo
        label="Estrellas"
        opciones={[
          { value: 'todas', label: 'Todas' },
          { value: 5, label: '5★' },
          { value: 4, label: '4★' },
          { value: 3, label: '3★' },
          { value: 2, label: '2★' },
          { value: 1, label: '1★' },
        ]}
        valor={filtroEstrella}
        onChange={(v) => setFiltroEstrella(v as FiltroEstrella)}
        colorMarca={colorMarca}
      />
      <FiltroGrupo
        label="Fecha"
        opciones={[
          { value: 'todo', label: 'Todo' },
          { value: 'hoy', label: 'Hoy' },
          { value: 'semana', label: 'Esta semana' },
          { value: 'mes', label: 'Este mes' },
        ]}
        valor={filtroFecha}
        onChange={(v) => setFiltroFecha(v as FiltroFecha)}
        colorMarca={colorMarca}
      />
    </section>
  );
}

function FiltroGrupo<T extends string | number>({
  label,
  opciones,
  valor,
  onChange,
  colorMarca,
}: {
  label: string;
  opciones: { value: T; label: string }[];
  valor: T;
  onChange: (v: T) => void;
  colorMarca: string;
}) {
  return (
    <div>
      <p
        className="text-[0.65rem] uppercase tracking-[0.14em] mb-2"
        style={{ color: 'var(--color-muted)' }}
      >
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {opciones.map((op) => {
          const activa = op.value === valor;
          return (
            <button
              key={String(op.value)}
              type="button"
              onClick={() => onChange(op.value)}
              className="text-xs px-3 py-1.5 rounded-full border transition-colors"
              style={{
                borderColor: activa ? colorMarca : 'var(--color-border-strong)',
                background: activa ? colorMarca : 'white',
                color: activa ? 'white' : 'var(--color-ink-soft)',
                fontWeight: activa ? 500 : 400,
              }}
            >
              {op.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ListaReviews({
  reviews,
  colorMarca,
}: {
  reviews: ReviewFila[];
  colorMarca: string;
}) {
  if (reviews.length === 0) {
    return (
      <section
        className="rounded-[var(--radius-lg)] border bg-white p-8 text-center"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          No hay reseñas que coincidan con los filtros.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {reviews.map((r) => (
        <ReviewCard key={r.id} review={r} colorMarca={colorMarca} />
      ))}
    </section>
  );
}

function ReviewCard({
  review,
  colorMarca,
}: {
  review: ReviewFila;
  colorMarca: string;
}) {
  const fecha = new Date(review.creadaEn);
  const fechaFmt = fecha.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const horaFmt = fecha.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <article
      className="rounded-[var(--radius-lg)] border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <header className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <svg
              key={n}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={review.estrellas >= n ? colorMarca : 'none'}
              style={{
                color: review.estrellas >= n ? colorMarca : 'var(--color-border-strong)',
              }}
            >
              <polygon
                points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ))}
        </div>
        <p
          className="text-[0.7rem] text-right"
          style={{ color: 'var(--color-muted)' }}
        >
          {fechaFmt} · {horaFmt}
        </p>
      </header>

      <div
        className="flex items-center gap-3 text-xs mb-3"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        <span>Mesa {review.mesaNumero}</span>
        <span style={{ color: 'var(--color-border-strong)' }}>·</span>
        <span className="font-[family-name:var(--font-mono)]">
          ${review.totalFacturado.toLocaleString('es-CO')}
        </span>
      </div>

      {review.comentario ? (
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-ink)' }}
        >
          {review.comentario}
        </p>
      ) : (
        <p
          className="text-xs italic"
          style={{ color: 'var(--color-muted)' }}
        >
          Sin comentario
        </p>
      )}
    </article>
  );
}

function EmptyState() {
  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white p-12 text-center"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        className="mx-auto mb-4"
        style={{ color: 'var(--color-border-strong)' }}
      >
        <polygon
          points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <h2
        className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1"
        style={{ color: 'var(--color-ink)' }}
      >
        Aún no hay reseñas
      </h2>
      <p
        className="text-sm max-w-xs mx-auto"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        Cuando los clientes terminen su visita y dejen su opinión,
        aparecerá aquí.
      </p>
    </section>
  );
}
