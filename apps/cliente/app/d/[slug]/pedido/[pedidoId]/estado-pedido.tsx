'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@mesaya/database/client';
import { enviarReviewExterno } from './actions';
import { BannerInstalar } from '../../../../banner-instalar';

type EstadoEntrega = 'pendiente' | 'en_preparacion' | 'en_camino' | 'listo_pickup' | 'entregado';
type TipoPedido = 'domicilio' | 'pickup';

const ESTADOS_DOMICILIO: { estado: EstadoEntrega; label: string; descripcion: string }[] = [
  { estado: 'pendiente', label: 'Recibido', descripcion: 'El restaurante ya recibio tu pedido.' },
  { estado: 'en_preparacion', label: 'En preparacion', descripcion: 'La cocina esta preparando tu pedido.' },
  { estado: 'en_camino', label: 'En camino', descripcion: 'Tu pedido esta en camino.' },
  { estado: 'entregado', label: 'Entregado', descripcion: 'Pedido entregado. Buen provecho.' },
];

const ESTADOS_PICKUP: { estado: EstadoEntrega; label: string; descripcion: string }[] = [
  { estado: 'pendiente', label: 'Recibido', descripcion: 'El restaurante ya recibio tu pedido.' },
  { estado: 'en_preparacion', label: 'En preparacion', descripcion: 'La cocina esta preparando tu pedido.' },
  { estado: 'listo_pickup', label: 'Listo para recoger', descripcion: 'Tu pedido esta listo. Puedes pasar a recogerlo.' },
  { estado: 'entregado', label: 'Retirado', descripcion: 'Pedido retirado. Buen provecho.' },
];

function indiceEstado(estado: EstadoEntrega, tipo: TipoPedido): number {
  const lista = tipo === 'domicilio' ? ESTADOS_DOMICILIO : ESTADOS_PICKUP;
  return lista.findIndex((e) => e.estado === estado);
}

export function EstadoPedido({
  pedidoId,
  numeroDiario,
  nombreNegocio,
  colorMarca,
  tipo,
  estadoInicial,
  nombreCliente,
  direccion,
  horaPedido,
}: {
  pedidoId: string;
  numeroDiario: number;
  nombreNegocio: string;
  colorMarca: string;
  tipo: TipoPedido;
  estadoInicial: EstadoEntrega;
  nombreCliente: string;
  direccion: string | null;
  horaPedido: string | null;
}) {
  const [estado, setEstado] = useState<EstadoEntrega>(estadoInicial);
  const estados = tipo === 'domicilio' ? ESTADOS_DOMICILIO : ESTADOS_PICKUP;
  const idx = indiceEstado(estado, tipo);
  const estadoActual = estados[idx];

  // Realtime: escuchar cambios en pedidos_externos.
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`pedido-${pedidoId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pedidos_externos', filter: `id=eq.${pedidoId}` },
        (payload) => {
          const nuevo = (payload.new as { estado_entrega?: string }).estado_entrega;
          if (nuevo) setEstado(nuevo as EstadoEntrega);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [pedidoId]);

  const completado = estado === 'entregado';

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--color-paper)' }}>
      <div className="flex-1 px-5 py-10 max-w-md mx-auto w-full">
        {/* Hero */}
        <div
          className="rounded-[var(--radius-lg)] p-6 mb-6 text-center"
          style={{ background: colorMarca, color: 'white' }}
        >
          <div
            className="size-14 rounded-full mx-auto mb-4 grid place-items-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            {completado ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <polyline points="5 12 10 17 19 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75"/>
                <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <p className="text-xs uppercase tracking-[0.14em] opacity-80">
            Pedido #{numeroDiario.toString().padStart(3, '0')}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] mt-1">
            {estadoActual?.label ?? 'En proceso'}
          </h1>
          <p className="text-sm mt-1 opacity-90">{nombreNegocio}</p>
        </div>

        {/* Descripcion estado actual */}
        <div
          className="rounded-[var(--radius-lg)] border bg-white p-4 mb-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
            {estadoActual?.descripcion}
          </p>
          {!completado ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="size-2 rounded-full animate-pulse" style={{ background: colorMarca }} />
              <span className="text-xs" style={{ color: 'var(--color-muted)' }}>Actualizando en tiempo real</span>
            </div>
          ) : null}
        </div>

        {/* Barra de progreso */}
        <div className="mb-5">
          <div className="flex items-center gap-0">
            {estados.map((e, i) => {
              const activo = i <= idx;
              const esCurrent = i === idx;
              return (
                <div key={e.estado} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className="size-3 rounded-full transition-all"
                      style={{ background: activo ? colorMarca : 'var(--color-border-strong)' }}
                    />
                    <p
                      className="text-[0.6rem] uppercase tracking-[0.08em] mt-1 text-center"
                      style={{ color: esCurrent ? colorMarca : activo ? 'var(--color-ink-soft)' : 'var(--color-muted)' }}
                    >
                      {e.label}
                    </p>
                  </div>
                  {i < estados.length - 1 ? (
                    <div
                      className="h-0.5 flex-1 mb-5 transition-all"
                      style={{ background: i < idx ? colorMarca : 'var(--color-border-strong)' }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Datos del pedido */}
        <div
          className="rounded-[var(--radius-lg)] border bg-white p-4 space-y-2"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-baseline justify-between text-sm">
            <span style={{ color: 'var(--color-muted)' }}>Cliente</span>
            <span style={{ color: 'var(--color-ink)' }}>{nombreCliente}</span>
          </div>
          {tipo === 'domicilio' && direccion ? (
            <div className="flex items-baseline justify-between text-sm gap-4">
              <span className="shrink-0" style={{ color: 'var(--color-muted)' }}>Direccion</span>
              <span className="text-right" style={{ color: 'var(--color-ink)' }}>{direccion}</span>
            </div>
          ) : null}
          {tipo === 'pickup' && horaPedido ? (
            <div className="flex items-baseline justify-between text-sm">
              <span style={{ color: 'var(--color-muted)' }}>Hora de recogida</span>
              <span style={{ color: 'var(--color-ink)' }}>{horaPedido}</span>
            </div>
          ) : null}
        </div>

        {/* Calificacion: aparece cuando el pedido esta entregado */}
        {completado ? (
          <div className="mt-5">
            <Calificacion pedidoId={pedidoId} nombreNegocio={nombreNegocio} colorMarca={colorMarca} />
          </div>
        ) : null}

        {/* Banner para instalar la app (se auto-oculta si ya esta instalada) */}
        <div className="mt-5">
          <BannerInstalar colorMarca={colorMarca} />
        </div>
      </div>

      <footer className="py-6 text-center">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
          Servido con <span style={{ color: 'var(--color-ink)' }}>EnPura</span>
        </p>
      </footer>
    </main>
  );
}

type EstadoReview = 'pendiente' | 'enviado' | 'saltado';

function Calificacion({
  pedidoId,
  nombreNegocio,
  colorMarca,
}: {
  pedidoId: string;
  nombreNegocio: string;
  colorMarca: string;
}) {
  const [estrellas, setEstrellas] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comentario, setComentario] = useState('');
  const [estado, setEstado] = useState<EstadoReview>('pendiente');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    if (estrellas === 0) {
      setError('Elige cuantas estrellas darle a tu pedido.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await enviarReviewExterno({
        pedidoId,
        estrellas,
        comentario: comentario.trim() || null,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEstado('enviado');
    });
  }

  if (estado === 'enviado') {
    return (
      <section
        className="rounded-[var(--radius-lg)] border bg-white p-6 text-center"
        style={{ borderColor: '#bbf7d0', borderWidth: 1.5 }}
      >
        <div
          className="size-12 rounded-full mx-auto mb-3 grid place-items-center"
          style={{ background: '#dcfce7', color: '#166534' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline points="5 12 10 17 19 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1" style={{ color: 'var(--color-ink)' }}>
          Gracias por tu resena
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
          Tu opinion llego a {nombreNegocio}.
        </p>
      </section>
    );
  }

  if (estado === 'saltado') {
    return (
      <section
        className="rounded-[var(--radius-lg)] border bg-white p-6 text-center"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
          Gracias por tu pedido. Ya puedes cerrar esta pagina.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white p-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <h2 className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1" style={{ color: 'var(--color-ink)' }}>
        Como estuvo todo?
      </h2>
      <p className="text-xs mb-4" style={{ color: 'var(--color-ink-soft)' }}>
        Tu opinion ayuda a {nombreNegocio} a mejorar.
      </p>

      <div className="flex items-center justify-center gap-2 mb-5">
        {[1, 2, 3, 4, 5].map((n) => {
          const activa = (hover || estrellas) >= n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setEstrellas(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className="size-10 grid place-items-center transition-transform active:scale-95"
              aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill={activa ? colorMarca : 'none'}
                style={{ color: activa ? colorMarca : 'var(--color-border-strong)' }}
              >
                <polygon
                  points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>

      <label
        htmlFor="comentario-ext"
        className="text-xs uppercase tracking-[0.14em] mb-2 block"
        style={{ color: 'var(--color-muted)' }}
      >
        Comentario <span className="lowercase tracking-normal">(opcional)</span>
      </label>
      <textarea
        id="comentario-ext"
        value={comentario}
        onChange={(e) => setComentario(e.target.value.slice(0, 500))}
        placeholder="Que te gusto? Que mejorarias?"
        rows={3}
        className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border text-sm resize-none focus:outline-none focus:ring-1"
        style={{
          borderColor: 'var(--color-border-strong)',
          color: 'var(--color-ink)',
          background: 'var(--color-paper)',
        }}
      />
      <p className="text-xs mt-1 text-right" style={{ color: 'var(--color-muted)' }}>
        {comentario.length} / 500
      </p>

      {error ? (
        <p role="alert" className="mt-3 text-xs text-center" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={enviar}
        disabled={pending || estrellas === 0}
        className="w-full mt-4 h-12 rounded-[var(--radius-md)] text-base font-medium transition-opacity disabled:opacity-50"
        style={{ background: colorMarca, color: 'white' }}
      >
        {pending ? 'Enviando...' : 'Enviar resena'}
      </button>

      <p className="text-xs text-center mt-3" style={{ color: 'var(--color-muted)' }}>
        <button
          type="button"
          onClick={() => setEstado('saltado')}
          disabled={pending}
          className="underline disabled:opacity-50"
          style={{ color: 'var(--color-muted)' }}
        >
          Saltar
        </button>
      </p>
    </section>
  );
}
