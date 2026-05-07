'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@mesaya/database/client';

export type MesaInfo = {
  id: string;
  numero: string;
  capacidad: number;
};

export type SesionAbiertaResumen = {
  mesaId: string;
  abiertaEn: string;
  totalAcumulado: number;
  comandasCount: number;
};

/**
 * Mapa visual de mesas con su estado en tiempo real.
 *   - Libre: sin sesión abierta
 *   - Ocupada: con sesión abierta (muestra tiempo + total)
 *   - Reservada: tiene reserva activa (preparado para feature #5)
 *
 * Se usa en 2 lugares:
 *   - /admin/mesas (vista del dueño, cards grandes con QR)
 *   - /mesero (vista compacta para que el mesero vea qué mesas tiene libres)
 */
export function MapaMesas({
  mesas,
  sesionesAbiertasIniciales,
  restauranteId,
  colorMarca,
  variante = 'admin',
}: {
  mesas: MesaInfo[];
  sesionesAbiertasIniciales: SesionAbiertaResumen[];
  restauranteId: string;
  colorMarca: string;
  variante?: 'admin' | 'mesero';
}) {
  const [sesionesAbiertas, setSesionesAbiertas] = useState<SesionAbiertaResumen[]>(
    sesionesAbiertasIniciales,
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    setSesionesAbiertas(sesionesAbiertasIniciales);
  }, [sesionesAbiertasIniciales]);

  // Re-render cada 30s para refrescar tiempo transcurrido.
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  // Realtime: refetch sesiones cuando cambian.
  useEffect(() => {
    const supabase = createClient();
    const canalNombre = `mapa-mesas-${Date.now()}-${Math.random().toString(36).slice(2)}`;
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

      async function refetch() {
        const { data } = await supabase
          .from('sesiones')
          .select('mesa_id, abierta_en, comandas(id, total, estado)')
          .eq('restaurante_id', restauranteId)
          .eq('estado', 'abierta');

        const lista: SesionAbiertaResumen[] = ((data ?? []) as Array<{
          mesa_id: string;
          abierta_en: string;
          comandas: { total: number; estado: string }[] | null;
        }>).map((s) => {
          const comandasNoCanceladas = (s.comandas ?? []).filter(
            (c) => c.estado !== 'cancelada',
          );
          return {
            mesaId: s.mesa_id,
            abiertaEn: s.abierta_en,
            totalAcumulado: comandasNoCanceladas.reduce(
              (acc, c) => acc + (c.total ?? 0),
              0,
            ),
            comandasCount: comandasNoCanceladas.length,
          };
        });

        if (!cancelado) setSesionesAbiertas(lista);
      }

      const canal = supabase
        .channel(canalNombre)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'sesiones' },
          (payload) => {
            const fila = (payload.new ?? payload.old) as { restaurante_id?: string } | null;
            if (fila?.restaurante_id === restauranteId) refetch();
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comandas' },
          (payload) => {
            const fila = payload.new as { restaurante_id?: string } | null;
            if (fila?.restaurante_id === restauranteId) refetch();
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

  const sesionPorMesa = new Map<string, SesionAbiertaResumen>();
  for (const s of sesionesAbiertas) sesionPorMesa.set(s.mesaId, s);

  const ocupadas = mesas.filter((m) => sesionPorMesa.has(m.id)).length;
  const libres = mesas.length - ocupadas;
  const capacidadTotal = mesas.reduce((acc, m) => acc + (m.capacidad ?? 0), 0);
  const capacidadOcupada = mesas
    .filter((m) => sesionPorMesa.has(m.id))
    .reduce((acc, m) => acc + (m.capacidad ?? 0), 0);

  if (mesas.length === 0) {
    return null;
  }

  const tamañoCard = variante === 'mesero' ? 'compacto' : 'normal';

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-3">
          <h2
            className="text-xs uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-muted)' }}
          >
            Mesas · {libres} libres · {ocupadas} ocupadas
          </h2>
        </div>
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

      {capacidadTotal > 0 ? (
        <p
          className="text-[0.7rem] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Capacidad ocupada: {capacidadOcupada} / {capacidadTotal} personas
        </p>
      ) : null}

      <ul
        className={
          tamañoCard === 'compacto'
            ? 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2'
            : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3'
        }
      >
        {mesas.map((m) => {
          const sesion = sesionPorMesa.get(m.id);
          const ocupada = !!sesion;
          return (
            <CardMesa
              key={m.id}
              mesa={m}
              sesion={sesion}
              ocupada={ocupada}
              colorMarca={colorMarca}
              compacta={tamañoCard === 'compacto'}
            />
          );
        })}
      </ul>
    </section>
  );
}

function CardMesa({
  mesa,
  sesion,
  ocupada,
  colorMarca,
  compacta,
}: {
  mesa: MesaInfo;
  sesion: SesionAbiertaResumen | undefined;
  ocupada: boolean;
  colorMarca: string;
  compacta: boolean;
}) {
  const minutos = sesion
    ? Math.max(
        0,
        Math.floor((Date.now() - new Date(sesion.abiertaEn).getTime()) / 60000),
      )
    : 0;
  const tiempoFmt =
    minutos < 1
      ? 'recién'
      : minutos < 60
        ? `${minutos}m`
        : `${Math.floor(minutos / 60)}h ${minutos % 60}m`;

  // Colores: libre = paper claro, ocupada = ámbar suave
  const estilo = ocupada
    ? {
        background: '#fef3c7',
        border: '#fde68a',
        labelColor: '#92400e',
        valueColor: '#78350f',
      }
    : {
        background: '#f0fdf4',
        border: '#bbf7d0',
        labelColor: '#166534',
        valueColor: '#14532d',
      };

  if (compacta) {
    // Vista para mesero: card chica, número grande, badge mini
    return (
      <li
        className="rounded-[var(--radius-md)] border p-2.5 text-center"
        style={{
          background: estilo.background,
          borderColor: estilo.border,
        }}
      >
        <p
          className="font-[family-name:var(--font-display)] text-2xl tabular-nums leading-tight"
          style={{ color: estilo.valueColor }}
        >
          {mesa.numero}
        </p>
        <p
          className="text-[0.6rem] uppercase tracking-[0.1em] mt-0.5"
          style={{ color: estilo.labelColor }}
        >
          {ocupada ? `${tiempoFmt}` : `${mesa.capacidad}p libre`}
        </p>
      </li>
    );
  }

  // Vista admin: card más grande con detalle
  return (
    <li
      className="rounded-[var(--radius-lg)] border p-4"
      style={{
        background: estilo.background,
        borderColor: estilo.border,
        borderWidth: 1.5,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="font-[family-name:var(--font-display)] text-3xl tabular-nums leading-none"
          style={{ color: estilo.valueColor }}
        >
          {mesa.numero}
        </span>
        <span
          className="text-[0.65rem] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'white', color: estilo.labelColor }}
        >
          {ocupada ? 'Ocupada' : 'Libre'}
        </span>
      </div>
      <p
        className="text-[0.7rem]"
        style={{ color: estilo.labelColor }}
      >
        {mesa.capacidad} {mesa.capacidad === 1 ? 'persona' : 'personas'}
      </p>
      {ocupada && sesion ? (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: estilo.border }}>
          <p
            className="text-[0.65rem] uppercase tracking-[0.1em]"
            style={{ color: estilo.labelColor }}
          >
            Hace {tiempoFmt} · {sesion.comandasCount}{' '}
            {sesion.comandasCount === 1 ? 'pedido' : 'pedidos'}
          </p>
          <p
            className="font-[family-name:var(--font-mono)] text-sm mt-0.5 tabular-nums"
            style={{ color: estilo.valueColor }}
          >
            ${sesion.totalAcumulado.toLocaleString('es-CO')}
          </p>
        </div>
      ) : null}
    </li>
  );
}
