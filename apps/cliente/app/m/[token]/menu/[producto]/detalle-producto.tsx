'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { agregarItem } from '../../../../../lib/carrito';

export function DetalleProducto({
  qrToken,
  productoId,
  nombre,
  descripcion,
  precio,
  colorMarca,
  sinStock,
}: {
  qrToken: string;
  productoId: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  colorMarca: string;
  sinStock: boolean;
}) {
  const router = useRouter();
  const [cantidad, setCantidad] = useState(1);
  const [notas, setNotas] = useState('');
  const [pending, startTransition] = useTransition();

  const total = precio * cantidad;
  const limiteNotas = 200;
  const restantes = limiteNotas - notas.length;

  function incrementar() {
    setCantidad((c) => Math.min(20, c + 1));
  }
  function decrementar() {
    setCantidad((c) => Math.max(1, c - 1));
  }

  function agregar() {
    if (sinStock) return;
    agregarItem(qrToken, {
      productoId,
      nombre,
      precio,
      cantidad,
      notas: notas.trim() || null,
    });
    startTransition(() => {
      router.push(`/m/${qrToken}/menu?agregado=${encodeURIComponent(nombre)}`);
    });
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)' }}
    >
      {/* Header con botón volver */}
      <header
        className="sticky top-0 z-10 px-5 py-3 border-b backdrop-blur-sm"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.92)',
        }}
      >
        <Link
          href={`/m/${qrToken}/menu`}
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: 'var(--color-ink)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      </header>

      {/* Contenido */}
      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1]"
          style={{ color: 'var(--color-ink)' }}
        >
          {nombre}
        </h1>
        {descripcion ? (
          <p
            className="text-sm leading-relaxed mt-3"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {descripcion}
          </p>
        ) : null}
        <p
          className="font-[family-name:var(--font-mono)] text-2xl mt-4"
          style={{ color: 'var(--color-ink)' }}
        >
          ${precio.toLocaleString('es-CO')}
        </p>

        {sinStock ? (
          <div
            className="mt-8 rounded-[var(--radius-lg)] border p-5 text-center"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-paper-deep)',
            }}
          >
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--color-ink)' }}
            >
              Sin stock por hoy.
            </p>
            <p
              className="text-xs mt-1.5"
              style={{ color: 'var(--color-muted)' }}
            >
              Vuelve mañana o elige otra opción.
            </p>
            <Link
              href={`/m/${qrToken}/menu`}
              className="inline-flex items-center justify-center gap-2 mt-4 h-10 px-4 rounded-[var(--radius-md)] text-sm font-medium"
              style={{
                background: 'var(--color-ink)',
                color: 'var(--color-paper)',
              }}
            >
              Ver más opciones
            </Link>
          </div>
        ) : (
          <>
            {/* Cantidad */}
            <div className="mt-8">
              <p
                className="text-xs uppercase tracking-[0.14em] mb-2.5"
                style={{ color: 'var(--color-muted)' }}
              >
                Cantidad
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={decrementar}
                  disabled={cantidad <= 1}
                  aria-label="Disminuir cantidad"
                  className="size-11 grid place-items-center rounded-[var(--radius-md)] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-ink)',
                    background: 'white',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
                <div
                  className="w-16 h-11 grid place-items-center font-[family-name:var(--font-display)] text-2xl tabular-nums"
                  style={{ color: 'var(--color-ink)' }}
                  aria-live="polite"
                >
                  {cantidad}
                </div>
                <button
                  type="button"
                  onClick={incrementar}
                  disabled={cantidad >= 20}
                  aria-label="Aumentar cantidad"
                  className="size-11 grid place-items-center rounded-[var(--radius-md)] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-ink)',
                    background: 'white',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M12 5v14M5 12h14"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notas */}
            <div className="mt-8">
              <label
                htmlFor="notas"
                className="text-xs uppercase tracking-[0.14em] mb-2.5 block"
                style={{ color: 'var(--color-muted)' }}
              >
                ¿Algo que debamos saber? <span className="lowercase tracking-normal">(opcional)</span>
              </label>
              <textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value.slice(0, limiteNotas))}
                placeholder="Ej: sin cebolla, bien cocido, sin azúcar"
                rows={3}
                className="w-full px-3.5 py-3 rounded-[var(--radius-md)] border text-sm resize-none focus:outline-none focus:ring-1"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-ink)',
                  background: 'white',
                }}
              />
              <p
                className="text-[0.7rem] mt-1 text-right"
                style={{
                  color:
                    restantes < 20
                      ? 'var(--color-danger)'
                      : 'var(--color-muted)',
                }}
              >
                {notas.length} / {limiteNotas}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Footer fijo con botón Agregar */}
      {!sinStock ? (
        <div
          className="sticky bottom-0 left-0 right-0 px-5 py-4 border-t"
          style={{
            borderColor: 'var(--color-border)',
            background: 'rgba(250, 246, 241, 0.96)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <button
            type="button"
            onClick={agregar}
            disabled={pending}
            className="w-full h-12 rounded-[var(--radius-md)] text-base font-medium flex items-center justify-between px-5 transition-opacity disabled:opacity-60"
            style={{
              background: colorMarca,
              color: 'white',
            }}
          >
            <span>
              {pending ? 'Agregando…' : `Agregar ${cantidad > 1 ? `${cantidad} ` : ''}al pedido`}
            </span>
            <span className="font-[family-name:var(--font-mono)]">
              ${total.toLocaleString('es-CO')}
            </span>
          </button>
        </div>
      ) : null}
    </main>
  );
}
