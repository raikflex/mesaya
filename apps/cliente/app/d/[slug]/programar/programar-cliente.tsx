'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DiaDomicilioDisponible } from '../../../../lib/domicilios-disponibilidad';

/** "2026-06-30" -> "30 jun" */
function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mi = parseInt(m ?? '1', 10) - 1;
  return `${parseInt(d ?? '1', 10)} ${meses[mi] ?? ''}`;
}

export function ProgramarCliente({
  slug,
  nombreNegocio,
  colorMarca,
  logoUrl,
  dias,
  platosPorFecha,
}: {
  slug: string;
  nombreNegocio: string;
  colorMarca: string;
  logoUrl: string | null;
  dias: DiaDomicilioDisponible[];
  platosPorFecha?: Record<string, { nombre: string; precio: number }>;
}) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  function toggle(fecha: string) {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(fecha)) next.delete(fecha);
      else next.add(fecha);
      return next;
    });
  }

  function continuar() {
    if (seleccion.size === 0) return;
    // Orden cronologico de las fechas elegidas.
    const fechas = [...seleccion].sort();
    router.push(`/d/${slug}/programar/menu?dias=${fechas.join(',')}`);
  }

  const totalSeleccion = seleccion.size;

  const renderDia = (dia: DiaDomicilioDisponible) => {
    const activo = seleccion.has(dia.fecha);
    const platoDia = platosPorFecha?.[dia.fecha];
    return (
      <li key={dia.fecha}>
        <button
          type="button"
          onClick={() => toggle(dia.fecha)}
          aria-pressed={activo}
          className="w-full text-left rounded-[var(--radius-lg)] border bg-white p-4 transition-colors"
          style={{
            borderColor: activo || platoDia ? colorMarca : 'var(--color-border)',
            borderWidth: activo ? 2 : platoDia ? 1.5 : 1,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="size-6 rounded-full border-2 grid place-items-center shrink-0"
              style={{
                borderColor: activo ? colorMarca : 'var(--color-border-strong)',
                background: activo ? colorMarca : 'transparent',
              }}
            >
              {activo ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <polyline
                    points="5 12 10 17 19 8"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p
                  className={platoDia ? 'text-lg font-bold' : 'text-base font-medium'}
                  style={{ color: platoDia ? colorMarca : 'var(--color-ink)' }}
                >
                  {dia.nombre}
                </p>
                <span
                  className="text-sm font-[family-name:var(--font-mono)]"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {fechaCorta(dia.fecha)}
                </span>
                {dia.esHoy ? (
                  <span
                    className="text-[0.6rem] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                    style={{ background: colorMarca, color: 'white' }}
                  >
                    Hoy
                  </span>
                ) : null}
              </div>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                Pide hasta las {dia.corte}
              </p>
              {!dia.platoVigente ? (
                <div
                  className="mt-2 pl-3 border-l-[3px]"
                  style={{ borderColor: 'var(--color-border-strong)' }}
                >
                  <p
                    className="text-[0.6rem] uppercase tracking-[0.14em] font-bold"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Plato del dia
                  </p>
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                    Por definirse
                  </p>
                </div>
              ) : platoDia ? (
                <div className="mt-2 pl-3 border-l-[3px]" style={{ borderColor: colorMarca }}>
                  <p
                    className="text-[0.6rem] uppercase tracking-[0.14em] font-bold"
                    style={{ color: colorMarca }}
                  >
                    Plato del dia
                  </p>
                  <p
                    className="text-base font-bold leading-snug"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    {platoDia.nombre}{' '}
                    <span
                      className="font-[family-name:var(--font-mono)]"
                      style={{ color: colorMarca }}
                    >
                      ${platoDia.precio.toLocaleString('es-CO')}
                    </span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </button>
      </li>
    );
  };

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-paper)',
        paddingBottom: totalSeleccion > 0 ? '5.5rem' : '1rem',
      }}
    >
      <header className="px-5 py-4 flex items-center gap-3">
        <Link
          href={`/d/${slug}`}
          aria-label="Volver"
          className="size-9 grid place-items-center rounded-full shrink-0"
          style={{ color: 'var(--color-ink)', background: 'var(--color-paper-deep)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`Logo de ${nombreNegocio}`}
            className="size-9 rounded-full object-contain shrink-0"
            style={{ background: 'white' }}
          />
        ) : null}
        <h1
          className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate"
          style={{ color: 'var(--color-ink)' }}
        >
          {nombreNegocio}
        </h1>
      </header>

      <div className="flex-1 px-5 pt-3 max-w-md w-full mx-auto">
        <h2
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.05] mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          Programa tu pedido
        </h2>
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          Elige para que dias quieres tu domicilio. Puedes pedir para esta semana y la proxima. Cada
          dia se cierra a su hora de corte.
        </p>

        {dias.length === 0 ? (
          <div
            className="rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
            style={{ borderColor: 'var(--color-border-strong)' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              No hay dias disponibles para programar en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {(['esta', 'proxima'] as const).map((sem) => {
              const grupo = dias.filter((d) => d.semana === sem);
              if (grupo.length === 0) return null;
              return (
                <div key={sem}>
                  <h3
                    className="text-xs font-medium uppercase tracking-[0.12em] mb-2.5"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    {sem === 'esta' ? 'Esta semana' : 'Proxima semana'}
                  </h3>
                  <ul className="space-y-2.5">{grupo.map(renderDia)}</ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalSeleccion > 0 ? (
        <button
          type="button"
          onClick={continuar}
          className="fixed bottom-4 left-4 right-4 z-30 h-14 rounded-full flex items-center justify-between px-5 max-w-md mx-auto"
          style={{ background: colorMarca, color: 'white' }}
        >
          <span className="flex items-center gap-2.5">
            <span
              className="size-7 rounded-full grid place-items-center text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              {totalSeleccion}
            </span>
            <span className="text-sm font-medium">
              {totalSeleccion === 1 ? '1 dia elegido' : `${totalSeleccion} dias elegidos`}
            </span>
          </span>
          <span className="text-sm font-medium">Continuar</span>
        </button>
      ) : null}
    </main>
  );
}
