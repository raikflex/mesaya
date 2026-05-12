'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { cancelarComanda } from './cancelar-comanda-actions';

export type PedidoLargo = {
  id: string;
  numeroDiario: number;
  total: number;
  creadaEn: string;
  estado: string;
  mesaNumero: string;
};

/**
 * Lista de comandas activas con mas de 2h de antiguedad. Solo se renderea si
 * hay alguna. El dueno puede cancelar cada una con un modal de confirmacion.
 */
export function PedidosLargos({
  pedidos,
  colorMarca,
}: {
  pedidos: PedidoLargo[];
  colorMarca: string;
}) {
  if (pedidos.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xs uppercase tracking-[0.14em] flex items-center gap-2"
          style={{ color: '#92400e' }}
        >
          <span className="size-2 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
          Pendientes hace rato
        </h2>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
        </span>
      </div>

      <ul
        className="rounded-[var(--radius-lg)] border-2 divide-y"
        style={{
          borderColor: '#f59e0b',
          background: '#fffbeb',
        }}
      >
        {pedidos.map((p) => (
          <ItemPedido key={p.id} pedido={p} colorMarca={colorMarca} />
        ))}
      </ul>

      <p
        className="text-xs mt-2 px-1"
        style={{ color: 'var(--color-muted)' }}
      >
        Pedidos creados hace mas de 2 horas que siguen activos. Verifica si
        siguen vigentes o cancelalos para liberar el ingreso del dia.
      </p>
    </section>
  );
}

function ItemPedido({
  pedido,
  colorMarca: _colorMarca,
}: {
  pedido: PedidoLargo;
  colorMarca: string;
}) {
  const [confirmando, setConfirmando] = useState(false);

  const antiguedad = formatearAntiguedad(pedido.creadaEn);
  const estadoLabel = etiquetaEstado(pedido.estado);

  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div
        className="size-11 rounded-[var(--radius-md)] grid place-items-center shrink-0 font-[family-name:var(--font-display)] text-base"
        style={{ background: '#92400e', color: 'white' }}
      >
        #{pedido.numeroDiario}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          Mesa {pedido.mesaNumero}{' '}
          <span style={{ color: 'var(--color-muted)' }}>
            - ${pedido.total.toLocaleString('es-CO')}
          </span>
        </p>
        <p className="text-xs mt-0.5" style={{ color: '#92400e' }}>
          {estadoLabel} - hace {antiguedad}
        </p>
      </div>

      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="h-8 px-3 rounded-[var(--radius-md)] text-xs font-medium text-white shrink-0 transition-colors hover:opacity-90"
        style={{ background: '#dc2626' }}
      >
        Cancelar
      </button>

      {confirmando ? (
        <ModalConfirmarCancelacion
          pedido={pedido}
          onCancelar={() => setConfirmando(false)}
        />
      ) : null}
    </li>
  );
}

function ModalConfirmarCancelacion({
  pedido,
  onCancelar,
}: {
  pedido: PedidoLargo;
  onCancelar: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const resultado = await cancelarComanda(formData);
    setPending(false);
    if (!resultado.ok) {
      setError(resultado.error);
    } else {
      onCancelar();
    }
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
      onClick={onCancelar}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          background: 'white',
          borderRadius: '14px',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Cancelar pedido #{pedido.numeroDiario}?
        </h3>
        <p
          className="text-sm mt-3 leading-relaxed"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Mesa {pedido.mesaNumero} - ${pedido.total.toLocaleString('es-CO')}.
          El pedido se marca como cancelado, no se cobra y no cuenta en tus
          metricas del dia. La cocina/staff sabran que ya no deben prepararlo.
        </p>

        {error ? (
          <p className="text-xs mt-3 px-3 py-2 rounded" style={{ background: '#fee2e2', color: '#991b1b' }}>
            {error}
          </p>
        ) : null}

        <div className="flex gap-2 mt-6 justify-end">
          <button
            type="button"
            onClick={onCancelar}
            disabled={pending}
            className="h-10 px-4 rounded-[var(--radius-md)] text-sm border transition-colors disabled:opacity-60"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'white',
            }}
          >
            Volver
          </button>
          <form action={handleSubmit}>
            <input type="hidden" name="comandaId" value={pedido.id} />
            <button
              type="submit"
              disabled={pending}
              className="h-10 px-4 rounded-[var(--radius-md)] text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-60"
              style={{ background: '#dc2626' }}
            >
              {pending ? 'Cancelando...' : 'Si, cancelar pedido'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function formatearAntiguedad(creadaEn: string): string {
  const ms = Date.now() - new Date(creadaEn).getTime();
  const totalMinutos = Math.floor(ms / (60 * 1000));
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  if (horas >= 24) {
    const dias = Math.floor(horas / 24);
    const horasRestantes = horas % 24;
    return horasRestantes > 0 ? `${dias}d ${horasRestantes}h` : `${dias}d`;
  }
  if (horas >= 1) {
    return minutos > 0 ? `${horas}h ${minutos}m` : `${horas}h`;
  }
  return `${minutos}m`;
}

function etiquetaEstado(estado: string): string {
  switch (estado) {
    case 'pendiente':
      return 'Pendiente';
    case 'en_preparacion':
      return 'En preparacion';
    case 'lista':
      return 'Lista para entregar';
    default:
      return estado;
  }
}
