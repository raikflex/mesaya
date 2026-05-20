'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@mesaya/database/client';
import { borrarSesionCliente } from '../../../../../../lib/cliente-session';
import { cerrarSesionAbandonada } from '../../../cerrar-sesion-actions';

export type ComandaConItems = {
  id: string;
  numero_diario: number;
  estado: string;
  total: number;
  creada_en: string;
  mesero_atendiendo_nombre: string | null;
  motivo_cancelacion: string | null;
  tiempo_estimado_min: number | null;
  items: {
    id: string;
    nombre_snapshot: string;
    precio_snapshot: number;
    cantidad: number;
    nota: string | null;
  }[];
};

type EstadoTono = 'pending' | 'progress' | 'done';

const ETIQUETAS_ESTADO: Record<string, { label: string; tono: EstadoTono }> = {
  pendiente: { label: 'En cola', tono: 'pending' },
  en_preparacion: { label: 'Preparando', tono: 'progress' },
  lista: { label: 'Lista', tono: 'progress' },
  entregada: { label: 'Entregada', tono: 'done' },
  cancelada: { label: 'Cancelada', tono: 'done' },
};

export function ComandaEnviadaCliente({
  qrToken,
  sesionId,
  mesaNumero,
  nombreNegocio,
  colorMarca,
  nombreCliente,
  comandaActualId,
  comandasIniciales,
}: {
  qrToken: string;
  sesionId: string;
  mesaNumero: string;
  nombreNegocio: string;
  colorMarca: string;
  nombreCliente: string;
  comandaActualId: string;
  comandasIniciales: ComandaConItems[];
}) {
  const router = useRouter();
  const [comandas, setComandas] = useState<ComandaConItems[]>(comandasIniciales);
  const idsRef = useRef<Set<string>>(new Set(comandasIniciales.map((c) => c.id)));
  const [modalCancelacion, setModalCancelacion] = useState<{
    motivo: string;
  } | null>(null);

  useEffect(() => {
    setComandas(comandasIniciales);
    idsRef.current = new Set(comandasIniciales.map((c) => c.id));
  }, [comandasIniciales]);

  useEffect(() => {
    const supabase = createClient();
    const canalNombre = `cliente-comanda-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let canalActual: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    async function setup() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelado) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      if (cancelado) return;

      const canal = supabase
        .channel(canalNombre)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'comandas' },
          (payload) => {
            const fila = payload.new as {
              id: string;
              sesion_id: string;
              estado: string;
              mesero_atendiendo_nombre: string | null;
              motivo_cancelacion: string | null;
            };
            if (fila.sesion_id !== sesionId) return;
            if (!idsRef.current.has(fila.id)) return;

            setComandas((cs) => {
              const actualizadas = cs.map((c) =>
                c.id === fila.id
                  ? {
                      ...c,
                      estado: fila.estado,
                      mesero_atendiendo_nombre: fila.mesero_atendiendo_nombre,
                      motivo_cancelacion: fila.motivo_cancelacion,
                    }
                  : c,
              );

              if (fila.id === comandaActualId && fila.estado === 'cancelada') {
                const tieneOtrasActivas = actualizadas.some(
                  (c) => c.id !== fila.id && c.estado !== 'cancelada',
                );
                if (!tieneOtrasActivas) {
                  setModalCancelacion({
                    motivo: fila.motivo_cancelacion ?? 'La cocina cancelo tu pedido.',
                  });
                }
              }

              return actualizadas;
            });
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pagos' },
          (payload) => {
            const fila = payload.new as {
              sesion_id: string;
              estado: string;
            };
            if (fila.sesion_id !== sesionId) return;
            if (fila.estado === 'confirmado') {
              router.push(`/m/${qrToken}/gracias?sesion=${sesionId}`);
            }
          },
        );

      if (cancelado) {
        supabase.removeChannel(canal);
        return;
      }

      canalActual = canal;
      canal.subscribe();
    }

    setup();

    return () => {
      cancelado = true;
      if (canalActual) {
        supabase.removeChannel(canalActual);
        canalActual = null;
      }
    };
  }, [qrToken, sesionId, comandaActualId, router]);

  const totalAcumulado = comandas
    .filter((c) => c.estado !== 'cancelada')
    .reduce((acc, c) => acc + c.total, 0);
  const cantidadActivas = comandas.filter((c) => c.estado !== 'cancelada').length;
  const todasEntregadas =
    cantidadActivas > 0 &&
    comandas.filter((c) => c.estado !== 'cancelada').every((c) => c.estado === 'entregada');
  const ultimaComanda =
    comandas.find((c) => c.id === comandaActualId) ?? comandas[comandas.length - 1]!;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--color-paper)' }}>
      <div className="flex-1 px-5 py-8 max-w-md mx-auto w-full">
        <section
          className="rounded-[var(--radius-lg)] p-6 mb-6 text-center"
          style={{ background: colorMarca, color: 'white' }}
        >
          <div
            className="size-16 rounded-full grid place-items-center mx-auto mb-4"
            style={{ background: 'rgba(255,255,255,0.22)' }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden>
              <polyline
                points="5 12 10 17 19 8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.02em] mb-2">
            Listo, {nombreCliente}!
          </h1>
          <p className="text-lg opacity-95 leading-snug font-medium">Tu pedido esta en la cocina</p>
          {ultimaComanda.tiempo_estimado_min !== null ? (
            <div
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.22)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                <path
                  d="M12 7v5l3 2"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-sm font-semibold">
                Listo en ~{ultimaComanda.tiempo_estimado_min} minutos
              </span>
            </div>
          ) : null}
          <p className="text-base opacity-80 mt-3 font-medium">
            Pedido #{ultimaComanda.numero_diario.toString().padStart(3, '0')}
          </p>
        </section>

        <p
          className="text-base text-center mb-6 font-medium"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Mesa {mesaNumero} - {nombreNegocio}
        </p>

        <h2
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.015em] mb-4"
          style={{ color: 'var(--color-ink)' }}
        >
          Tu cuenta hasta ahora
        </h2>

        <div className="space-y-3 mb-5">
          {comandas.map((c) => (
            <ComandaCard
              key={c.id}
              comanda={c}
              esLaUltima={c.id === comandaActualId}
              colorMarca={colorMarca}
            />
          ))}
        </div>

        <section
          className="rounded-[var(--radius-lg)] border bg-white px-5 py-5 mb-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-base uppercase tracking-[0.12em] font-semibold"
                style={{ color: 'var(--color-muted)' }}
              >
                Total acumulado
              </p>
              <p className="text-base mt-1 font-medium" style={{ color: 'var(--color-ink-soft)' }}>
                {cantidadActivas} pedido{cantidadActivas === 1 ? '' : 's'}
                {comandas.length > cantidadActivas
                  ? ` - ${comandas.length - cantidadActivas} cancelado${comandas.length - cantidadActivas === 1 ? '' : 's'}`
                  : ''}
              </p>
            </div>
            <span
              className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.02em]"
              style={{ color: 'var(--color-ink)' }}
            >
              ${totalAcumulado.toLocaleString('es-CO')}
            </span>
          </div>
        </section>

        <div className="space-y-2 mb-6">
          <Link
            href={`/m/${qrToken}/menu`}
            className="w-full h-14 grid place-items-center rounded-[var(--radius-md)] text-lg font-semibold"
            style={{ background: colorMarca, color: 'white' }}
          >
            Agregar mas al pedido
          </Link>
          {todasEntregadas ? (
            <Link
              href={`/m/${qrToken}/pedir-cuenta`}
              className="w-full h-14 grid place-items-center rounded-[var(--radius-md)] text-lg font-semibold border"
              style={{
                background: 'white',
                color: 'var(--color-ink)',
                borderColor: 'var(--color-border-strong)',
              }}
            >
              Pedir la cuenta
            </Link>
          ) : (
            <div
              className="w-full rounded-[var(--radius-md)] border-2 border-dashed px-4 py-4 text-center"
              style={{ borderColor: 'var(--color-border)' }}
              aria-disabled="true"
            >
              <p
                className="text-base uppercase tracking-[0.1em] font-semibold"
                style={{ color: 'var(--color-muted)' }}
              >
                Pedir la cuenta
              </p>
              <p
                className="text-base mt-1 leading-relaxed"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                Disponible cuando recibas tu pedido
              </p>
            </div>
          )}
        </div>

        <div
          className="rounded-[var(--radius-md)] border bg-white px-4 py-4 flex items-center justify-between gap-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
              Necesitas algo?
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
              Cubiertos, mas servilletas, una consulta...
            </p>
          </div>
          <Link
            href={`/m/${qrToken}/llamar-mesero`}
            className="h-11 px-4 grid place-items-center rounded-[var(--radius-md)] text-base font-semibold shrink-0 border"
            style={{
              background: 'white',
              color: colorMarca,
              borderColor: colorMarca,
            }}
          >
            Avisar al mesero
          </Link>
        </div>
      </div>

      <footer className="py-6 text-center">
        <p
          className="text-sm uppercase tracking-[0.14em] font-medium"
          style={{ color: 'var(--color-muted)' }}
        >
          Servido con <span style={{ color: 'var(--color-ink)' }}>MesaYA</span>
        </p>
      </footer>

      {modalCancelacion ? (
        <ModalPedidoCancelado
          motivo={modalCancelacion.motivo}
          qrToken={qrToken}
          colorMarca={colorMarca}
          nombreNegocio={nombreNegocio}
        />
      ) : null}
    </main>
  );
}

function ComandaCard({
  comanda,
  esLaUltima,
  colorMarca,
}: {
  comanda: ComandaConItems;
  esLaUltima: boolean;
  colorMarca: string;
}) {
  const etiqueta = ETIQUETAS_ESTADO[comanda.estado] ?? {
    label: comanda.estado,
    tono: 'pending' as EstadoTono,
  };
  const estaCancelada = comanda.estado === 'cancelada';

  const hora = new Date(comanda.creada_en).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const mensajeMesero =
    comanda.estado === 'lista' && comanda.mesero_atendiendo_nombre
      ? `${comanda.mesero_atendiendo_nombre} la trae a tu mesa`
      : comanda.estado === 'entregada' && comanda.mesero_atendiendo_nombre
        ? `Entregada por ${comanda.mesero_atendiendo_nombre}`
        : null;

  const mensajeCancelacion =
    comanda.estado === 'cancelada' && comanda.motivo_cancelacion
      ? comanda.motivo_cancelacion
      : null;

  return (
    <article
      className="rounded-[var(--radius-lg)] border bg-white overflow-hidden"
      style={{
        borderColor: esLaUltima ? colorMarca : 'var(--color-border)',
        borderWidth: esLaUltima ? 1.5 : 1,
        opacity: estaCancelada ? 0.75 : 1,
      }}
    >
      <header
        className="px-4 py-3 flex items-center justify-between gap-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <p
            className="font-[family-name:var(--font-display)] text-xl"
            style={{ color: 'var(--color-ink)' }}
          >
            #{comanda.numero_diario.toString().padStart(3, '0')}
          </p>
          <span className="text-base font-medium" style={{ color: 'var(--color-muted)' }}>
            {hora}
          </span>
        </div>
        <EstadoPill etiqueta={etiqueta} />
      </header>

      {mensajeMesero ? (
        <div
          className="px-4 py-3 border-b"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-paper)',
          }}
        >
          <p className="text-base font-semibold" style={{ color: colorMarca }}>
            {mensajeMesero}
          </p>
        </div>
      ) : null}

      {mensajeCancelacion ? (
        <div
          className="px-4 py-3 border-b"
          style={{
            borderColor: '#fecaca',
            background: '#fef2f2',
          }}
        >
          <p
            className="text-sm uppercase tracking-[0.12em] mb-1 font-semibold"
            style={{ color: '#b91c1c' }}
          >
            Cancelada por la cocina
          </p>
          <p className="text-base" style={{ color: '#7f1d1d' }}>
            {mensajeCancelacion}
          </p>
        </div>
      ) : null}

      <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {comanda.items.map((item) => {
          const subtotal = item.precio_snapshot * item.cantidad;
          return (
            <li key={item.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-lg"
                    style={{
                      color: 'var(--color-ink)',
                      textDecoration: estaCancelada ? 'line-through' : 'none',
                    }}
                  >
                    <span className="font-semibold" style={{ color: 'var(--color-muted)' }}>
                      {item.cantidad}x
                    </span>{' '}
                    {item.nombre_snapshot}
                  </p>
                  {item.nota ? (
                    <p className="text-base mt-1 italic" style={{ color: 'var(--color-ink-soft)' }}>
                      {item.nota}
                    </p>
                  ) : null}
                </div>
                <span
                  className="font-[family-name:var(--font-mono)] text-base font-medium shrink-0"
                  style={{
                    color: 'var(--color-ink-soft)',
                    textDecoration: estaCancelada ? 'line-through' : 'none',
                  }}
                >
                  ${subtotal.toLocaleString('es-CO')}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <footer
        className="px-4 py-3 flex items-center justify-between border-t"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-paper)',
        }}
      >
        <span
          className="text-base uppercase tracking-[0.1em] font-semibold"
          style={{ color: 'var(--color-muted)' }}
        >
          Subtotal
        </span>
        {estaCancelada ? (
          <span className="flex items-center gap-2">
            <span
              className="text-sm uppercase tracking-[0.1em] px-2 py-0.5 rounded font-semibold"
              style={{ background: '#fee2e2', color: '#b91c1c' }}
            >
              No se cobra
            </span>
            <span
              className="font-[family-name:var(--font-mono)] text-lg"
              style={{
                color: 'var(--color-muted)',
                textDecoration: 'line-through',
              }}
            >
              ${comanda.total.toLocaleString('es-CO')}
            </span>
          </span>
        ) : (
          <span
            className="font-[family-name:var(--font-mono)] text-lg font-semibold"
            style={{ color: 'var(--color-ink)' }}
          >
            ${comanda.total.toLocaleString('es-CO')}
          </span>
        )}
      </footer>
    </article>
  );
}

function EstadoPill({ etiqueta }: { etiqueta: { label: string; tono: EstadoTono } }) {
  const estilos: Record<EstadoTono, { bg: string; fg: string }> = {
    pending: { bg: 'var(--color-paper-deep)', fg: 'var(--color-ink-soft)' },
    progress: { bg: '#fef3c7', fg: '#92400e' },
    done: { bg: '#dcfce7', fg: '#166534' },
  };
  const s = estilos[etiqueta.tono];

  return (
    <span
      className="text-sm uppercase tracking-[0.08em] px-3 py-1 rounded-full font-semibold shrink-0"
      style={{ background: s.bg, color: s.fg }}
    >
      {etiqueta.label}
    </span>
  );
}

function ModalPedidoCancelado({
  motivo,
  qrToken,
  colorMarca,
  nombreNegocio,
}: {
  motivo: string;
  qrToken: string;
  colorMarca: string;
  nombreNegocio: string;
}) {
  const router = useRouter();

  async function handleSalir() {
    await cerrarSesionAbandonada(qrToken);
    borrarSesionCliente(qrToken);
    router.push(`/m/${qrToken}`);
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-white p-6 text-center">
        <div
          className="size-14 rounded-full mx-auto mb-4 grid place-items-center"
          style={{ background: '#fef2f2', color: '#b91c1c' }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.015em] mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          Tu pedido fue cancelado
        </h2>
        <div
          className="rounded-[var(--radius-md)] border px-3 py-2.5 mb-5 text-left"
          style={{ borderColor: '#fecaca', background: '#fef2f2' }}
        >
          <p
            className="text-sm uppercase tracking-[0.12em] mb-1 font-semibold"
            style={{ color: '#b91c1c' }}
          >
            Motivo de la cocina
          </p>
          <p className="text-base" style={{ color: '#7f1d1d' }}>
            {motivo}
          </p>
        </div>
        <p className="text-base leading-relaxed mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          No se cobro nada. Puedes volver al menu y pedir otra cosa, o salir.
        </p>
        <div className="space-y-2">
          <Link
            href={`/m/${qrToken}/menu`}
            className="w-full h-12 grid place-items-center rounded-[var(--radius-md)] text-lg font-semibold"
            style={{ background: colorMarca, color: 'white' }}
          >
            Pedir otra cosa
          </Link>
          <button
            type="button"
            onClick={handleSalir}
            className="w-full h-12 grid place-items-center rounded-[var(--radius-md)] text-lg font-semibold border"
            style={{
              background: 'white',
              color: 'var(--color-ink)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
            Salir
          </button>
        </div>
        <p className="text-sm mt-4 font-medium" style={{ color: 'var(--color-muted)' }}>
          {nombreNegocio} agradece tu paciencia.
        </p>
      </div>
    </div>
  );
}
