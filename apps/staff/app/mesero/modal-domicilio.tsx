'use client';

import { useState, useTransition } from 'react';
import { marcarEstadoEntrega } from './actions';
import { PanelCobroMesero } from './modal-tomar-pedido';
import type { InfoEntregaMesero } from './tablero-mesero';

type ItemSimple = { id: string; nombre: string; cantidad: number; nota: string | null };

export function ModalDomicilio({
  pedidoExternoId,
  sesionId,
  entrega,
  items,
  numeroDiario,
  total,
  colorMarca,
  estadoEntregaActual,
  onCerrar,
}: {
  pedidoExternoId: string;
  sesionId: string;
  entrega: NonNullable<InfoEntregaMesero>;
  items: ItemSimple[];
  numeroDiario: number;
  total: number;
  colorMarca: string;
  estadoEntregaActual: string;
  onCerrar: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [estado, setEstado] = useState(estadoEntregaActual);
  const [cobrando, setCobrando] = useState(false);

  const esDomicilio = entrega.tipo === 'domicilio';
  const yaEnCamino = estado === 'en_camino';
  const yaListoPickup = estado === 'listo_pickup';
  const yaEntregado = estado === 'entregado';

  // URL de Google Maps. Si el cliente pego un link de Maps (http...), lo
  // abrimos directo. Si escribio una direccion normal, armamos la busqueda.
  const dir = entrega.direccion?.trim() ?? '';
  const esLink = /^https?:\/\//i.test(dir);
  const mapsUrl = dir
    ? esLink
      ? dir
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`
    : null;

  const telUrl = `tel:${entrega.telefono.replace(/\s/g, '')}`;

  function marcar() {
    setError(null);
    const nuevoEstado = esDomicilio ? 'en_camino' : 'listo_pickup';
    startTransition(async () => {
      const r = await marcarEstadoEntrega({ pedidoExternoId, nuevoEstado });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEstado(nuevoEstado);
    });
  }

  // Si esta en modo cobro, mostramos el panel de cobro (reusa el del mesero).
  if (cobrando) {
    return (
      <PanelCobroMesero
        sesionId={sesionId}
        mesaNumero={`Domicilio #${numeroDiario.toString().padStart(3, '0')}`}
        subtotal={total}
        colorMarca={colorMarca}
        onCerrar={() => setCobrando(false)}
        onCobrado={onCerrar}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
      style={{ background: 'rgba(26, 24, 20, 0.6)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-white overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="px-5 py-4 border-b flex items-start justify-between gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium inline-block mb-2"
              style={{
                background: esDomicilio ? '#dbeafe' : '#dcfce7',
                color: esDomicilio ? '#1e40af' : '#166534',
              }}
            >
              {esDomicilio ? 'Domicilio' : 'Para recoger'}
            </span>
            <h2
              className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]"
              style={{ color: 'var(--color-ink)' }}
            >
              Pedido #{numeroDiario.toString().padStart(3, '0')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="size-9 grid place-items-center rounded-full shrink-0"
            style={{ background: 'var(--color-paper-deep)', color: 'var(--color-ink-soft)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--color-muted)' }}>
              Cliente
            </p>
            <p className="font-[family-name:var(--font-display)] text-xl" style={{ color: 'var(--color-ink)' }}>
              {entrega.nombreCliente}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--color-muted)' }}>
                Telefono
              </p>
              <p className="font-[family-name:var(--font-mono)] text-lg" style={{ color: 'var(--color-ink)' }}>
                {entrega.telefono}
              </p>
            </div>
            <a
              href={telUrl}
              className="flex items-center gap-2 h-11 px-4 rounded-[var(--radius-md)] text-sm font-medium shrink-0"
              style={{ background: colorMarca, color: 'white' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Llamar
            </a>
          </div>

          {esDomicilio && entrega.direccion ? (
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--color-muted)' }}>
                Direccion de entrega
              </p>
              <p className="text-base mb-2" style={{ color: 'var(--color-ink)' }}>
                {entrega.direccion}
              </p>
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-12 rounded-[var(--radius-md)] text-sm font-medium border w-full"
                  style={{ borderColor: colorMarca, color: colorMarca, background: 'white' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                  Ver en Google Maps
                </a>
              ) : null}
            </div>
          ) : null}

          {!esDomicilio && entrega.horaPedido ? (
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--color-muted)' }}>
                Hora de recogida
              </p>
              <p className="font-[family-name:var(--font-display)] text-xl" style={{ color: 'var(--color-ink)' }}>
                {entrega.horaPedido}
              </p>
            </div>
          ) : null}

          {entrega.notasEntrega ? (
            <div
              className="rounded-[var(--radius-md)] border px-3 py-2.5"
              style={{ borderColor: '#fde68a', background: '#fefce8' }}
            >
              <p className="text-[0.65rem] uppercase tracking-[0.12em] mb-1" style={{ color: '#92400e' }}>
                Notas del cliente
              </p>
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {entrega.notasEntrega}
              </p>
            </div>
          ) : null}

          <div>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-muted)' }}>
              Pedido
            </p>
            <ul className="rounded-[var(--radius-md)] border divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {items.map((item) => (
                <li key={item.id} className="px-3 py-2.5">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-[family-name:var(--font-display)] text-base tabular-nums shrink-0"
                      style={{ color: colorMarca }}
                    >
                      {item.cantidad}×
                    </span>
                    <span className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      {item.nombre}
                    </span>
                  </div>
                  {item.nota ? (
                    <p className="text-xs mt-0.5 ml-7 italic" style={{ color: 'var(--color-ink-soft)' }}>
                      «{item.nota}»
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          ) : null}
        </div>

        {/* Footer: estado de entrega + cobro */}
        <footer
          className="px-5 py-4 border-t space-y-2"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
        >
          {/* Boton de estado: en camino / listo para recoger */}
          {!yaEntregado && !((esDomicilio && yaEnCamino) || (!esDomicilio && yaListoPickup)) ? (
            <button
              type="button"
              onClick={marcar}
              disabled={pending}
              className="w-full h-11 rounded-[var(--radius-md)] text-sm font-medium border disabled:opacity-50"
              style={{ borderColor: colorMarca, color: colorMarca, background: 'white' }}
            >
              {pending ? 'Actualizando...' : esDomicilio ? 'Marcar en camino' : 'Marcar listo para recoger'}
            </button>
          ) : null}

          {/* Estado en camino / listo (informativo) */}
          {(esDomicilio && yaEnCamino) || (!esDomicilio && yaListoPickup) ? (
            <div
              className="h-10 rounded-[var(--radius-md)] grid place-items-center text-sm font-medium"
              style={{ background: '#dbeafe', color: '#1e40af' }}
            >
              {esDomicilio ? 'En camino' : 'Listo para recoger'}
            </div>
          ) : null}

          {/* Boton principal: entregar y cobrar */}
          <button
            type="button"
            onClick={() => setCobrando(true)}
            className="w-full h-12 rounded-[var(--radius-md)] text-base font-medium"
            style={{ background: colorMarca, color: 'white' }}
          >
            Entregar y cobrar · ${total.toLocaleString('es-CO')}
          </button>
        </footer>
      </div>
    </div>
  );
}
