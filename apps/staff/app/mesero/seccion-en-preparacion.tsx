'use client';

import { useState, useTransition } from 'react';
import { marcarComandaLista, marcarComandaPreparando } from './actions';

export type ComandaPreparacionMesero = {
  id: string;
  numeroDiario: number;
  estado: 'pendiente' | 'en_preparacion';
  total: number;
  creadaEn: string;
  clienteNombre: string;
  mesaNumero: string;
  items: { id: string; nombre: string; cantidad: number; nota: string | null }[];
};

/**
 * Sección visible solo cuando restaurantes.cocina_activa = false. El mesero
 * maneja el ciclo de vida de la comanda manualmente:
 *   - pendiente → en_preparacion (botón "Imprimí, ya prepara")
 *   - en_preparacion → lista (botón "Está lista para entregar")
 *
 * Después de "Lista", la comanda pasa a la sección de "Comandas listas" que
 * ya existe (con su flujo tomar → entregar).
 */
export function SeccionEnPreparacion({
  comandas,
  colorMarca,
}: {
  comandas: ComandaPreparacionMesero[];
  colorMarca: string;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <h2
          className="text-xs uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-muted)' }}
        >
          En preparación
        </h2>
        <span
          className="text-[0.65rem] uppercase tracking-[0.14em] px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--color-paper-deep)',
            color: 'var(--color-ink-soft)',
          }}
        >
          {comandas.length}
        </span>
      </header>

      {comandas.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border bg-white p-6 text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Sin comandas en preparación.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comandas.map((c) => (
            <CardPreparacion key={c.id} comanda={c} colorMarca={colorMarca} />
          ))}
        </div>
      )}
    </section>
  );
}

function CardPreparacion({
  comanda,
  colorMarca,
}: {
  comanda: ComandaPreparacionMesero;
  colorMarca: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function marcarPreparando() {
    setError(null);
    startTransition(async () => {
      const r = await marcarComandaPreparando({ comandaId: comanda.id });
      if (!r.ok) setError(r.error);
    });
  }

  function marcarLista() {
    setError(null);
    startTransition(async () => {
      const r = await marcarComandaLista({ comandaId: comanda.id });
      if (!r.ok) setError(r.error);
    });
  }

  const minutos = Math.max(
    0,
    Math.floor((Date.now() - new Date(comanda.creadaEn).getTime()) / 60000),
  );
  const tiempoFmt =
    minutos < 1 ? 'recién' : minutos < 60 ? `${minutos}m` : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;

  // Estados visuales:
  //   pendiente: ámbar (urgente — el chef todavía no sabe)
  //   en_preparacion: azul claro (tranquilo — está cocinando)
  const estilo =
    comanda.estado === 'pendiente'
      ? {
          background: '#fffbeb',
          border: '#fde68a',
          accent: '#b45309',
          headerBg: '#fef3c7',
        }
      : {
          background: 'white',
          border: 'var(--color-border)',
          accent: '#1e40af',
          headerBg: '#eff6ff',
        };

  return (
    <article
      className="rounded-[var(--radius-lg)] border overflow-hidden"
      style={{
        background: estilo.background,
        borderColor: estilo.border,
        borderWidth: comanda.estado === 'pendiente' ? 1.5 : 1,
      }}
    >
      <header
        className="px-4 py-3 flex items-center justify-between gap-3 border-b"
        style={{
          borderColor: estilo.border,
          background: estilo.headerBg,
        }}
      >
        <div className="min-w-0">
          <p
            className="font-[family-name:var(--font-display)] text-base tabular-nums"
            style={{ color: 'var(--color-ink)' }}
          >
            #{comanda.numeroDiario.toString().padStart(3, '0')} · Mesa {comanda.mesaNumero}
          </p>
          <p
            className="text-[0.7rem]"
            style={{ color: estilo.accent }}
          >
            {comanda.estado === 'pendiente' ? '⚠ Hay que imprimir' : 'Cocinando'} · {tiempoFmt}
          </p>
        </div>
        <span
          className="font-[family-name:var(--font-mono)] text-xs tabular-nums shrink-0"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ${comanda.total.toLocaleString('es-CO')}
        </span>
      </header>

      <ul className="px-4 py-3 space-y-1.5">
        {comanda.items.map((it) => (
          <li key={it.id}>
            <div className="flex items-baseline gap-2 text-sm">
              <span
                className="font-[family-name:var(--font-mono)] text-xs tabular-nums shrink-0 w-7"
                style={{ color: 'var(--color-muted)' }}
              >
                {it.cantidad}×
              </span>
              <span style={{ color: 'var(--color-ink)' }}>{it.nombre}</span>
            </div>
            {it.nota ? (
              <p
                className="text-[0.7rem] ml-9 italic mt-0.5"
                style={{ color: 'var(--color-muted)' }}
              >
                «{it.nota}»
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <p
        className="text-[0.7rem] px-4"
        style={{ color: 'var(--color-muted)' }}
      >
        Cliente: {comanda.clienteNombre}
      </p>

      {error ? (
        <p
          role="alert"
          className="px-4 pt-2 text-[0.7rem]"
          style={{ color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      ) : null}

      <footer
        className="px-4 py-3 border-t flex gap-2"
        style={{ borderColor: estilo.border }}
      >
        {comanda.estado === 'pendiente' ? (
          <>
            <button
              type="button"
              onClick={marcarPreparando}
              disabled={pending}
              className="flex-1 h-10 rounded-[var(--radius-md)] text-sm font-medium transition-opacity disabled:opacity-60"
              style={{ background: estilo.accent, color: 'white' }}
            >
              {pending ? 'Marcando…' : 'Imprimí, ya prepara'}
            </button>
            <button
              type="button"
              onClick={marcarLista}
              disabled={pending}
              className="h-10 px-3 rounded-[var(--radius-md)] text-xs border disabled:opacity-50"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink-soft)',
                background: 'white',
              }}
              title="Saltar directo a 'lista' si la comida ya está hecha"
            >
              Ya está lista
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={marcarLista}
            disabled={pending}
            className="flex-1 h-10 rounded-[var(--radius-md)] text-sm font-medium transition-opacity disabled:opacity-60"
            style={{ background: colorMarca, color: 'white' }}
          >
            {pending ? 'Marcando…' : 'Está lista para entregar'}
          </button>
        )}
      </footer>
    </article>
  );
}
