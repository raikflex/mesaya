'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@mesaya/database/client';

export type SesionActiva = {
  id: string;
  mesaNumero: string;
  totalAcumulado: number;
  iniciadaEn: string;
  comandasCount: number;
};

export function SesionesLive({
  sesionesIniciales,
  restauranteId,
  colorMarca,
}: {
  sesionesIniciales: SesionActiva[];
  restauranteId: string;
  colorMarca: string;
}) {
  const [sesiones, setSesiones] = useState<SesionActiva[]>(sesionesIniciales);
  const [tick, setTick] = useState(0);

  // Refrescar timers cada 30s para que "hace 5min" se actualice.
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  /**
   * Realtime: cuando una sesión nueva se abre o una existente se cierra,
   * actualizar la lista. También cuando llega una comanda nueva, refetch
   * el total para esa sesión.
   */
  useEffect(() => {
    const supabase = createClient();
    const canalNombre = `admin-sesiones-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

      async function refetchSesiones() {
        const { data } = await supabase
          .from('sesiones')
          .select(
            `
            id,
            iniciada_en,
            mesa_id,
            mesas (numero),
            comandas (id, total, estado)
          `,
          )
          .eq('restaurante_id', restauranteId)
          .eq('estado', 'abierta');

        const lista: SesionActiva[] = ((data ?? []) as Array<{
          id: string;
          iniciada_en: string;
          mesa_id: string;
          mesas: { numero: string } | { numero: string }[] | null;
          comandas: { total: number; estado: string }[] | null;
        }>).map((s) => {
          const mesa = Array.isArray(s.mesas) ? s.mesas[0] : s.mesas;
          const comandasNoCanceladas = (s.comandas ?? []).filter(
            (c) => c.estado !== 'cancelada',
          );
          const total = comandasNoCanceladas.reduce(
            (acc, c) => acc + (c.total ?? 0),
            0,
          );
          return {
            id: s.id,
            mesaNumero: mesa?.numero ?? '?',
            totalAcumulado: total,
            iniciadaEn: s.iniciada_en,
            comandasCount: comandasNoCanceladas.length,
          };
        });

        if (!cancelado) setSesiones(lista);
      }

      const canal = supabase
        .channel(canalNombre)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sesiones' },
          (payload) => {
            const fila = payload.new as { restaurante_id?: string } | null;
            const filaVieja = payload.old as { restaurante_id?: string } | null;
            if (
              fila?.restaurante_id === restauranteId ||
              filaVieja?.restaurante_id === restauranteId
            ) {
              refetchSesiones();
            }
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comandas' },
          (payload) => {
            const fila = payload.new as { restaurante_id?: string } | null;
            if (fila?.restaurante_id === restauranteId) {
              refetchSesiones();
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

  if (sesiones.length === 0) {
    return (
      <section
        className="rounded-[var(--radius-lg)] border bg-white p-5 mb-8"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2
          className="text-xs uppercase tracking-[0.14em] mb-2"
          style={{ color: 'var(--color-muted)' }}
        >
          Mesas en vivo
        </h2>
        <p
          className="text-sm"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          No hay mesas abiertas en este momento.
        </p>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-xs uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-muted)' }}
        >
          Mesas en vivo
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

      <div
        className="rounded-[var(--radius-lg)] border bg-white overflow-hidden"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {sesiones.map((s) => {
            const minutos = Math.max(
              0,
              Math.floor((Date.now() - new Date(s.iniciadaEn).getTime()) / 60000),
            );
            const tiempoFmt =
              minutos < 1
                ? 'recién'
                : minutos < 60
                  ? `hace ${minutos}m`
                  : `hace ${Math.floor(minutos / 60)}h ${minutos % 60}m`;

            // 'tick' fuerza re-render cada 30s para actualizar "hace X min"
            void tick;

            return (
              <li
                key={s.id}
                className="px-5 py-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="size-9 rounded-full grid place-items-center shrink-0"
                    style={{ background: colorMarca, color: 'white' }}
                  >
                    <span className="text-sm font-medium">
                      {s.mesaNumero}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p
                      className="text-sm"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      Mesa {s.mesaNumero}
                    </p>
                    <p
                      className="text-[0.7rem]"
                      style={{ color: 'var(--color-muted)' }}
                    >
                      {s.comandasCount}{' '}
                      {s.comandasCount === 1 ? 'pedido' : 'pedidos'} ·{' '}
                      {tiempoFmt}
                    </p>
                  </div>
                </div>
                <span
                  className="font-[family-name:var(--font-mono)] text-sm shrink-0"
                  style={{ color: 'var(--color-ink)' }}
                >
                  ${s.totalAcumulado.toLocaleString('es-CO')}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
