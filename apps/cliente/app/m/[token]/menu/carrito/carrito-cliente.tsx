'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  actualizarCantidad,
  calcularTotal,
  eliminarItem,
  leerCarrito,
  totalUnidades,
  type ItemCarrito,
} from '../../../../../lib/carrito';
import { leerSesionCliente } from '../../../../../lib/cliente-session';

const PORCENTAJE_PROPINA = 0.1;

export function CarritoCliente({
  qrToken,
  numeroMesa,
  nombreNegocio,
  colorMarca,
}: {
  qrToken: string;
  numeroMesa: string;
  nombreNegocio: string;
  colorMarca: string;
}) {
  const router = useRouter();
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [nombre, setNombre] = useState<string | null>(null);
  const [conPropina, setConPropina] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const sesion = leerSesionCliente(qrToken);
    if (!sesion) {
      router.replace(`/m/${qrToken}`);
      return;
    }
    setNombre(sesion.nombre);
    setItems(leerCarrito(qrToken));
    setCargando(false);
  }, [qrToken, router]);

  function cambiarCantidad(productoId: string, nuevaCantidad: number) {
    const actualizado = actualizarCantidad(qrToken, productoId, nuevaCantidad);
    setItems(actualizado);
  }

  function quitar(productoId: string) {
    const actualizado = eliminarItem(qrToken, productoId);
    setItems(actualizado);
  }

  function enviarACocina() {
    setEnviando(true);
    // TODO: Bloque 5 — server action real.
    setTimeout(() => {
      alert(
        'El envío a cocina se construye en el siguiente bloque. Por ahora el carrito sigue intacto.',
      );
      setEnviando(false);
    }, 600);
  }

  if (cargando) {
    return (
      <main
        className="min-h-screen grid place-items-center"
        style={{ background: 'var(--color-paper)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Cargando…
        </p>
      </main>
    );
  }

  const subtotal = calcularTotal(items);
  const propina = conPropina ? Math.round(subtotal * PORCENTAJE_PROPINA) : 0;
  const total = subtotal + propina;
  const unidades = totalUnidades(items);

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-paper)',
        paddingBottom: items.length > 0 ? '6rem' : '1rem',
      }}
    >
      {/* Header */}
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

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        {/* Encabezado */}
        <div className="mb-6">
          <p
            className="text-[0.65rem] uppercase tracking-[0.14em] mb-1"
            style={{ color: 'var(--color-muted)' }}
          >
            Mesa {numeroMesa} · {nombre}
          </p>
          <h1
            className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu pedido
          </h1>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            {nombreNegocio}
          </p>
        </div>

        {items.length === 0 ? (
          <EstadoVacio qrToken={qrToken} colorMarca={colorMarca} />
        ) : (
          <>
            {/* Items */}
            <ul
              className="rounded-[var(--radius-lg)] border bg-white divide-y mb-5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {items.map((item) => (
                <ItemFila
                  key={item.productoId}
                  item={item}
                  onCambiarCantidad={(c) => cambiarCantidad(item.productoId, c)}
                  onEliminar={() => quitar(item.productoId)}
                />
              ))}
            </ul>

            {/* Resumen */}
            <section
              className="rounded-[var(--radius-lg)] border bg-white p-5 mb-5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <h2
                className="text-xs uppercase tracking-[0.14em] mb-3"
                style={{ color: 'var(--color-muted)' }}
              >
                Resumen
              </h2>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-ink-soft)' }}>
                    Subtotal · {unidades} producto{unidades === 1 ? '' : 's'}
                  </span>
                  <span
                    className="font-[family-name:var(--font-mono)]"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    ${subtotal.toLocaleString('es-CO')}
                  </span>
                </div>

                {/* Toggle propina */}
                <label
                  className="flex items-center justify-between gap-3 py-2 cursor-pointer select-none"
                  htmlFor="toggle-propina"
                >
                  <div className="flex-1 min-w-0">
                    <span
                      className="text-sm block"
                      style={{ color: 'var(--color-ink-soft)' }}
                    >
                      Propina sugerida (10%)
                    </span>
                    <span
                      className="text-[0.7rem]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      Voluntaria. Decides tú.
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {conPropina ? (
                      <span
                        className="text-sm font-[family-name:var(--font-mono)]"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        ${propina.toLocaleString('es-CO')}
                      </span>
                    ) : null}
                    <button
                      id="toggle-propina"
                      type="button"
                      role="switch"
                      aria-checked={conPropina}
                      onClick={() => setConPropina((v) => !v)}
                      className="relative h-6 w-11 rounded-full transition-colors"
                      style={{
                        background: conPropina
                          ? colorMarca
                          : 'var(--color-paper-deep)',
                        border: `1px solid ${
                          conPropina ? colorMarca : 'var(--color-border-strong)'
                        }`,
                      }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform"
                        style={{
                          transform: conPropina
                            ? 'translateX(20px)'
                            : 'translateX(0)',
                        }}
                      />
                    </button>
                  </div>
                </label>

                <div
                  className="border-t pt-3 mt-2 flex items-center justify-between"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <span
                    className="text-base font-medium"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    Total
                  </span>
                  <span
                    className="font-[family-name:var(--font-display)] text-2xl"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    ${total.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            </section>

            {/* Aviso pago en mesa */}
            <p
              className="text-[0.7rem] text-center px-2 leading-relaxed"
              style={{ color: 'var(--color-muted)' }}
            >
              El pago se realiza directamente con el mesero al terminar.
              Cuando confirmes, tu pedido se envía a la cocina.
            </p>
          </>
        )}
      </div>

      {/* Footer fijo con enviar */}
      {items.length > 0 ? (
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
            onClick={enviarACocina}
            disabled={enviando}
            className="w-full max-w-md mx-auto h-12 rounded-[var(--radius-md)] text-base font-medium flex items-center justify-between px-5 transition-opacity disabled:opacity-60"
            style={{
              background: colorMarca,
              color: 'white',
            }}
          >
            <span>{enviando ? 'Enviando…' : 'Enviar a cocina'}</span>
            <span className="font-[family-name:var(--font-mono)]">
              ${total.toLocaleString('es-CO')}
            </span>
          </button>
        </div>
      ) : null}
    </main>
  );
}

function ItemFila({
  item,
  onCambiarCantidad,
  onEliminar,
}: {
  item: ItemCarrito;
  onCambiarCantidad: (n: number) => void;
  onEliminar: () => void;
}) {
  const subtotal = item.precio * item.cantidad;

  return (
    <li className="px-4 py-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-ink)' }}
          >
            {item.nombre}
          </p>
          {item.notas ? (
            <p
              className="text-xs mt-1 italic leading-relaxed"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              {item.notas}
            </p>
          ) : null}
          <p
            className="text-xs mt-1.5 font-[family-name:var(--font-mono)]"
            style={{ color: 'var(--color-muted)' }}
          >
            ${item.precio.toLocaleString('es-CO')} c/u
          </p>
        </div>
        <button
          type="button"
          onClick={onEliminar}
          aria-label={`Eliminar ${item.nombre}`}
          className="size-8 grid place-items-center rounded-[var(--radius-md)] transition-colors shrink-0 -mr-1.5"
          style={{ color: 'var(--color-muted)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex items-center justify-between gap-3">
        {/* Selector cantidad */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onCambiarCantidad(item.cantidad - 1)}
            aria-label="Disminuir cantidad"
            className="size-8 grid place-items-center rounded-[var(--radius-md)] border transition-colors"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <span
            className="w-9 text-center text-sm font-medium tabular-nums"
            style={{ color: 'var(--color-ink)' }}
            aria-live="polite"
          >
            {item.cantidad}
          </span>
          <button
            type="button"
            onClick={() => onCambiarCantidad(item.cantidad + 1)}
            disabled={item.cantidad >= 99}
            aria-label="Aumentar cantidad"
            className="size-8 grid place-items-center rounded-[var(--radius-md)] border transition-colors disabled:opacity-40"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <span
          className="font-[family-name:var(--font-mono)] text-sm"
          style={{ color: 'var(--color-ink)' }}
        >
          ${subtotal.toLocaleString('es-CO')}
        </span>
      </div>
    </li>
  );
}

function EstadoVacio({
  qrToken,
  colorMarca,
}: {
  qrToken: string;
  colorMarca: string;
}) {
  return (
    <div className="text-center py-12">
      <div
        className="size-14 rounded-full grid place-items-center mx-auto mb-5"
        style={{ background: colorMarca, color: 'white' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 6h18M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6M10 11v6M14 11v6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2
        className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
        style={{ color: 'var(--color-ink)' }}
      >
        Tu pedido está vacío.
      </h2>
      <p
        className="text-sm leading-relaxed mb-6 max-w-xs mx-auto"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        Vuelve al menú y agrega lo que quieras pedir. Tus selecciones aparecen
        aquí.
      </p>
      <Link
        href={`/m/${qrToken}/menu`}
        className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium"
        style={{
          background: 'var(--color-ink)',
          color: 'var(--color-paper)',
        }}
      >
        Volver al menú
      </Link>
    </div>
  );
}
