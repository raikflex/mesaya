'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@mesaya/database/client';

export type ComandaActiva = {
  id: string;
  numeroDiario: number;
  estado: 'pendiente' | 'en_preparacion' | 'lista';
  total: number;
  creadaEn: string;
  meseroAtendiendoNombre: string | null;
  mesaNumero: string;
  clienteNombre: string;
};

const ETIQUETAS_ESTADO: Record<
  ComandaActiva['estado'],
  { label: string; bg: string; fg: string }
> = {
  pendiente: { label: 'En cola', bg: 'var(--color-paper-deep)', fg: 'var(--color-ink-soft)' },
  en_preparacion: { label: 'Preparando', bg: '#fef3c7', fg: '#92400e' },
  lista: { label: 'Lista', bg: '#dcfce7', fg: '#166534' },
};

/**
 * Lista de comandas activas en cocina (pendientes/preparando/listas) con
 * realtime. Útil para que el dueño vea de un vistazo cuántos pedidos están
 * en proceso, sin tener que abrir la app de cocina.
 */
export function ComandasActivasLive({
  comandasIniciales,
  restauranteId,
  colorMarca,
}: {
  comandasIniciales: ComandaActiva[];
  restauranteId: string;
  colorMarca: string;
}) {
  const [comandas, setComandas] = useState<ComandaActiva[]>(comandasIniciales);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const canalNombre = `admin-comandas-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

      async function refetchComandas() {
        const { data } = await supabase
          .from('comandas')
          .select(
            `
            id,
            numero_diario,
            estado,
            total,
            creada_en,
            mesero_atendiendo_nombre,
            sesiones!inner(mesa_id, mesas(numero)),
            sesion_clientes(nombre)
          `,
          )
          .eq('restaurante_id', restauranteId)
          .in('estado', ['pendiente', 'en_preparacion', 'lista'])
          .order('creada_en', { ascending: true });

        const lista: ComandaActiva[] = ((data ?? []) as Array<{
          id: string;
          numero_diario: number;
          estado: string;
          total: number;
          creada_en: string;
          mesero_atendiendo_nombre: string | null;
          sesiones:
            | { mesa_id: string; mesas: { numero: string } | { numero: string }[] | null }
            | { mesa_id: string; mesas: { numero: string } | { numero: string }[] | null }[]
            | null;
          sesion_clientes: { nombre: string } | { nombre: string }[] | null;
        }>).map((c) => {
          const ses = Array.isArray(c.sesiones) ? c.sesiones[0] : c.sesiones;
          const mesa = ses?.mesas
            ? Array.isArray(ses.mesas)
              ? ses.mesas[0]
              : ses.mesas
            : null;
          const sc = Array.isArray(c.sesion_clientes)
            ? c.sesion_clientes[0]
            : c.sesion_clientes;
          return {
            id: c.id,
            numeroDiario: c.numero_diario,
            estado: c.estado as ComandaActiva['estado'],
            total: c.total,
            creadaEn: c.creada_en,
            meseroAtendiendoNombre: c.mesero_atendiendo_nombre,
            mesaNumero: mesa?.numero ?? '?',
            clienteNombre: sc?.nombre ?? 'Cliente',
          };
        });

        if (!cancelado) setComandas(lista);
      }

      const canal = supabase
        .channel(canalNombre)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comandas' },
          (payload) => {
            const fila = payload.new as { restaurante_id?: string } | null;
            const filaVieja = payload.old as { restaurante_id?: string } | null;
            if (
              fila?.restaurante_id === restauranteId ||
              filaVieja?.restaurante_id === restauranteId
            ) {
              refetchComandas();
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
  }, [restauranteId]);

  if (comandas.length === 0) {
    return (
      <section
        className="rounded-[var(--radius-lg)] border bg-white p-5 mb-8"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2
          className="text-xs uppercase tracking-[0.14em] mb-2"
          style={{ color: 'var(--color-muted)' }}
        >
          Comandas en cocina
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
          La cocina está al día. No hay pedidos en proceso ahora.
        </p>
      </section>
    );
  }

  // Resumen por estado
  const conteo = {
    pendiente: comandas.filter((c) => c.estado === 'pendiente').length,
    en_preparacion: comandas.filter((c) => c.estado === 'en_preparacion').length,
    lista: comandas.filter((c) => c.estado === 'lista').length,
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xs uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-muted)' }}
        >
          Comandas en cocina · {comandas.length}
        </h2>
        <div className="flex items-center gap-1.5">
          <span
            className="size-1.5 rounded-full animate-pulse"
            style={{ background: '#22c55e' }}
          />
          <span
            className="text-[0.65rem] uppercase tracking-[0.14em]"
            style={{ color: '#22c55e' }}
          >
            En vivo
          </span>
        </div>
      </div>

      {/* Mini resumen por estado */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <ResumenEstado label="En cola" valor={conteo.pendiente} estado="pendiente" />
        <ResumenEstado label="Preparando" valor={conteo.en_preparacion} estado="en_preparacion" />
        <ResumenEstado label="Listas" valor={conteo.lista} estado="lista" />
      </div>

      <div
        className="rounded-[var(--radius-lg)] border bg-white overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {comandas.map((c) => {
            const minutos = Math.max(
              0,
              Math.floor((Date.now() - new Date(c.creadaEn).getTime()) / 60000),
            );
            const tiempoFmt =
              minutos < 1
                ? 'recién'
                : minutos < 60
                  ? `hace ${minutos}m`
                  : `hace ${Math.floor(minutos / 60)}h ${minutos % 60}m`;
            const etiqueta = ETIQUETAS_ESTADO[c.estado];

            void tick;

            return (
              <li
                key={c.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="font-[family-name:var(--font-display)] text-sm tabular-nums shrink-0"
                    style={{ color: colorMarca }}
                  >
                    #{c.numeroDiario.toString().padStart(3, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      Mesa {c.mesaNumero} · {c.clienteNombre}
                    </p>
                    <p
                      className="text-[0.7rem]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {tiempoFmt}
                      {c.meseroAtendiendoNombre
                        ? ` · ${c.meseroAtendiendoNombre} la lleva`
                        : ''}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[0.65rem] uppercase tracking-[0.1em] px-2 py-1 rounded-full font-medium shrink-0"
                  style={{ background: etiqueta.bg, color: etiqueta.fg }}
                >
                  {etiqueta.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function ResumenEstado({
  label,
  valor,
  estado,
}: {
  label: string;
  valor: number;
  estado: ComandaActiva['estado'];
}) {
  const c = ETIQUETAS_ESTADO[estado];
  return (
    <div
      className="rounded-[var(--radius-md)] border bg-white px-3 py-2"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <p
        className="text-[0.6rem] uppercase tracking-[0.1em]"
        style={{ color: c.fg }}
      >
        {label}
      </p>
      <p
        className="font-[family-name:var(--font-display)] text-2xl mt-0.5 tabular-nums"
        style={{ color: 'var(--color-ink)' }}
      >
        {valor}
      </p>
    </div>
  );
}
