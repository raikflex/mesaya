'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '@mesaya/database/client';
import { cambiarEstadoComanda, cerrarSesion } from './actions';

export type ItemComanda = {
  id: string;
  nombre: string;
  cantidad: number;
  nota: string | null;
};

export type ComandaCocina = {
  id: string;
  numeroDiario: number;
  estado: 'pendiente' | 'en_preparacion' | 'lista';
  total: number;
  creadaEn: string;
  clienteNombre: string;
  mesaNumero: string;
  items: ItemComanda[];
};

export function TableroCocina({
  perfilNombre,
  restauranteNombre,
  colorMarca,
  comandasIniciales,
  restauranteId,
}: {
  perfilNombre: string;
  restauranteNombre: string;
  colorMarca: string;
  comandasIniciales: ComandaCocina[];
  restauranteId: string;
}) {
  const [comandas, setComandas] = useState<ComandaCocina[]>(comandasIniciales);
  const idsRef = useRef<Set<string>>(new Set(comandasIniciales.map((c) => c.id)));

  useEffect(() => {
    setComandas(comandasIniciales);
    idsRef.current = new Set(comandasIniciales.map((c) => c.id));
  }, [comandasIniciales]);

  /**
   * Realtime con Supabase.
   *
   * Lecciones aprendidas en S6 Bloque 4 sobre por qué el WebSocket conectaba
   * (101 Switching Protocols) pero no llegaban eventos:
   *
   * 1. El cliente browser NO propaga el JWT al canal de realtime
   *    automáticamente. Hay que llamar `realtime.setAuth(token)` con el
   *    access_token de la sesión actual ANTES de subscribe.
   *
   * 2. Filtros server-side como `restaurante_id=eq.X` requieren que la
   *    config de la tabla en Supabase tenga "Realtime: enabled" + un anexo.
   *    Es más confiable filtrar client-side. Las RLS ya nos protegen igual.
   */
  useEffect(() => {
    const supabase = createClient();
    let canalActual: ReturnType<typeof supabase.channel> | null = null;

    async function setupRealtime() {
      // 1) Pasar el JWT del user al canal de realtime.
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }

      // 2) Crear canal SIN filtro server-side. Filtramos client-side.
      const canal = supabase
        .channel(`cocina-realtime`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comandas' },
          async (payload) => {
            console.log('[realtime] comandas event:', payload.eventType, payload);

            if (payload.eventType === 'INSERT') {
              const nueva = payload.new as { id: string; estado: string; restaurante_id: string };
              if (nueva.restaurante_id !== restauranteId) return;
              if (idsRef.current.has(nueva.id)) return;
              if (!['pendiente', 'en_preparacion', 'lista'].includes(nueva.estado)) return;

              const enriquecida = await traerComandaCompleta(nueva.id);
              if (enriquecida) {
                idsRef.current.add(enriquecida.id);
                setComandas((cs) => [...cs, enriquecida]);
              }
            } else if (payload.eventType === 'UPDATE') {
              const actualizada = payload.new as {
                id: string;
                estado: string;
                total: number;
                restaurante_id: string;
              };
              if (actualizada.restaurante_id !== restauranteId) return;

              if (
                actualizada.estado === 'entregada' ||
                actualizada.estado === 'cancelada'
              ) {
                idsRef.current.delete(actualizada.id);
                setComandas((cs) => cs.filter((c) => c.id !== actualizada.id));
              } else {
                setComandas((cs) =>
                  cs.map((c) =>
                    c.id === actualizada.id
                      ? {
                          ...c,
                          estado: actualizada.estado as ComandaCocina['estado'],
                          total: actualizada.total,
                        }
                      : c,
                  ),
                );
              }
            } else if (payload.eventType === 'DELETE') {
              const eliminada = payload.old as { id: string };
              idsRef.current.delete(eliminada.id);
              setComandas((cs) => cs.filter((c) => c.id !== eliminada.id));
            }
          },
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comanda_items' },
          async (payload) => {
            const comandaId =
              payload.eventType === 'DELETE'
                ? (payload.old as { comanda_id: string }).comanda_id
                : (payload.new as { comanda_id: string }).comanda_id;

            if (!idsRef.current.has(comandaId)) return;

            const items = await traerItemsDeComanda(comandaId);
            setComandas((cs) =>
              cs.map((c) => (c.id === comandaId ? { ...c, items } : c)),
            );
          },
        )
        .subscribe((status) => {
          console.log('[realtime] subscription status:', status);
        });

      canalActual = canal;
    }

    setupRealtime();

    return () => {
      if (canalActual) {
        supabase.removeChannel(canalActual);
      }
    };
  }, [restauranteId]);

  function moverComanda(comandaId: string, nuevoEstado: 'en_preparacion' | 'lista') {
    setComandas((cs) =>
      cs.map((c) => (c.id === comandaId ? { ...c, estado: nuevoEstado } : c)),
    );
  }

  const pendientes = comandas
    .filter((c) => c.estado === 'pendiente')
    .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn));
  const enPreparacion = comandas
    .filter((c) => c.estado === 'en_preparacion')
    .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn));
  const listas = comandas
    .filter((c) => c.estado === 'lista')
    .sort((a, b) => a.creadaEn.localeCompare(b.creadaEn));

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)' }}
    >
      <Header
        perfilNombre={perfilNombre}
        restauranteNombre={restauranteNombre}
        colorMarca={colorMarca}
        totalComandas={comandas.length}
      />

      <div className="flex-1 px-5 lg:px-8 py-6 max-w-[1400px] mx-auto w-full">
        {comandas.length === 0 ? (
          <EstadoVacio colorMarca={colorMarca} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Seccion
              titulo="En cola"
              descripcion="Esperando que las tomes"
              comandas={pendientes}
              colorMarca={colorMarca}
              tono="pending"
              onMover={moverComanda}
            />
            <Seccion
              titulo="Preparando"
              descripcion="En cocina ahora mismo"
              comandas={enPreparacion}
              colorMarca={colorMarca}
              tono="progress"
              onMover={moverComanda}
            />
            <Seccion
              titulo="Listas"
              descripcion="Esperando al mesero"
              comandas={listas}
              colorMarca={colorMarca}
              tono="done"
              onMover={moverComanda}
            />
          </div>
        )}
      </div>
    </main>
  );
}

async function traerComandaCompleta(comandaId: string): Promise<ComandaCocina | null> {
  const supabase = createClient();
  const { data: comanda } = await supabase
    .from('comandas')
    .select(
      `
      id, numero_diario, estado, total, creada_en,
      sesion_clientes (nombre),
      sesiones (mesas (numero))
    `,
    )
    .eq('id', comandaId)
    .maybeSingle();

  if (!comanda) return null;

  const sc = Array.isArray(comanda.sesion_clientes)
    ? comanda.sesion_clientes[0]
    : comanda.sesion_clientes;
  const sesion = Array.isArray(comanda.sesiones) ? comanda.sesiones[0] : comanda.sesiones;
  const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;

  const items = await traerItemsDeComanda(comandaId);

  return {
    id: comanda.id as string,
    numeroDiario: comanda.numero_diario as number,
    estado: comanda.estado as ComandaCocina['estado'],
    total: comanda.total as number,
    creadaEn: comanda.creada_en as string,
    clienteNombre: (sc as { nombre: string } | null)?.nombre ?? 'Cliente',
    mesaNumero: (mesa as { numero: string } | null)?.numero ?? '?',
    items,
  };
}

async function traerItemsDeComanda(comandaId: string): Promise<ItemComanda[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('comanda_items')
    .select('id, nombre_snapshot, cantidad, nota')
    .eq('comanda_id', comandaId)
    .order('id', { ascending: true });

  return (data ?? []).map((it) => ({
    id: it.id as string,
    nombre: it.nombre_snapshot as string,
    cantidad: it.cantidad as number,
    nota: (it.nota as string) ?? null,
  }));
}

function Header({
  perfilNombre,
  restauranteNombre,
  colorMarca,
  totalComandas,
}: {
  perfilNombre: string;
  restauranteNombre: string;
  colorMarca: string;
  totalComandas: number;
}) {
  return (
    <header
      className="sticky top-0 z-20 px-5 lg:px-8 py-3 border-b backdrop-blur-sm"
      style={{
        borderColor: 'var(--color-border)',
        background: 'rgba(250, 246, 241, 0.92)',
      }}
    >
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className="size-10 rounded-full grid place-items-center shrink-0"
            style={{ background: colorMarca, color: 'white' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M6 7h12M6 12h12M6 17h12"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p
              className="text-[0.65rem] uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Cocina · {perfilNombre}
            </p>
            <h1
              className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate"
              style={{ color: 'var(--color-ink)' }}
            >
              {restauranteNombre}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: 'var(--color-paper-deep)' }}
          >
            <span
              className="size-2 rounded-full animate-pulse"
              style={{ background: colorMarca }}
            />
            <span
              className="text-xs"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              {totalComandas} activa{totalComandas === 1 ? '' : 's'}
            </span>
          </div>

          <form action={cerrarSesion}>
            <button
              type="submit"
              className="text-xs underline shrink-0"
              style={{ color: 'var(--color-muted)' }}
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}

function Seccion({
  titulo,
  descripcion,
  comandas,
  colorMarca,
  tono,
  onMover,
}: {
  titulo: string;
  descripcion: string;
  comandas: ComandaCocina[];
  colorMarca: string;
  tono: 'pending' | 'progress' | 'done';
  onMover: (id: string, nuevoEstado: 'en_preparacion' | 'lista') => void;
}) {
  const colores: Record<typeof tono, { bg: string; fg: string; border: string }> = {
    pending: {
      bg: 'var(--color-paper-deep)',
      fg: 'var(--color-ink-soft)',
      border: 'var(--color-border)',
    },
    progress: { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' },
    done: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
  };
  const c = colores[tono];

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h2
            className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em]"
            style={{ color: 'var(--color-ink)' }}
          >
            {titulo}
          </h2>
          <p
            className="text-[0.7rem] mt-0.5"
            style={{ color: 'var(--color-muted)' }}
          >
            {descripcion}
          </p>
        </div>
        <span
          className="text-xs uppercase tracking-[0.1em] px-2.5 py-1 rounded-full font-medium shrink-0"
          style={{ background: c.bg, color: c.fg }}
        >
          {comandas.length}
        </span>
      </div>

      {comandas.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border-2 border-dashed py-10 px-4 text-center"
          style={{ borderColor: c.border }}
        >
          <p className="text-xs italic" style={{ color: 'var(--color-muted)' }}>
            Sin comandas en esta etapa.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {comandas.map((comanda) => (
            <li key={comanda.id}>
              <CardComanda
                comanda={comanda}
                colorMarca={colorMarca}
                tono={tono}
                onMover={onMover}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CardComanda({
  comanda,
  colorMarca,
  tono,
  onMover,
}: {
  comanda: ComandaCocina;
  colorMarca: string;
  tono: 'pending' | 'progress' | 'done';
  onMover: (id: string, nuevoEstado: 'en_preparacion' | 'lista') => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function avanzar() {
    setError(null);
    const nuevoEstado: 'en_preparacion' | 'lista' =
      tono === 'pending' ? 'en_preparacion' : 'lista';

    onMover(comanda.id, nuevoEstado);

    startTransition(async () => {
      const resultado = await cambiarEstadoComanda({
        comandaId: comanda.id,
        nuevoEstado,
      });
      if (!resultado.ok) {
        setError(resultado.error);
      }
    });
  }

  return (
    <article
      className="rounded-[var(--radius-lg)] border bg-white overflow-hidden transition-shadow"
      style={{
        borderColor:
          tono === 'progress'
            ? '#fde68a'
            : tono === 'done'
              ? '#bbf7d0'
              : 'var(--color-border)',
        borderWidth: tono === 'pending' ? 1 : 1.5,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <header
        className="px-4 py-3 flex items-center justify-between gap-3 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="font-[family-name:var(--font-display)] text-base tabular-nums"
            style={{ color: 'var(--color-ink)' }}
          >
            #{comanda.numeroDiario.toString().padStart(3, '0')}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--color-paper-deep)',
              color: 'var(--color-ink-soft)',
            }}
          >
            Mesa {comanda.mesaNumero}
          </span>
        </div>
        <TiempoTranscurrido creadaEn={comanda.creadaEn} />
      </header>

      <div className="px-4 py-3">
        <p
          className="text-[0.7rem] uppercase tracking-[0.1em] mb-2"
          style={{ color: 'var(--color-muted)' }}
        >
          {comanda.clienteNombre}
        </p>

        <ul className="space-y-2">
          {comanda.items.map((item) => (
            <li key={item.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span
                  className="font-[family-name:var(--font-display)] text-base tabular-nums shrink-0"
                  style={{ color: colorMarca }}
                >
                  {item.cantidad}×
                </span>
                <span
                  className="font-medium leading-snug"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {item.nombre}
                </span>
              </div>
              {item.nota ? (
                <p
                  className="text-xs mt-1 ml-7 italic leading-relaxed"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  «{item.nota}»
                </p>
              ) : null}
            </li>
          ))}
        </ul>

        {error ? (
          <p
            role="alert"
            className="mt-3 text-[0.7rem] text-center"
            style={{ color: 'var(--color-danger)' }}
          >
            {error}
          </p>
        ) : null}
      </div>

      <footer
        className="px-4 py-2.5 border-t flex items-center justify-between gap-3"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-paper)',
        }}
      >
        <span
          className="text-[0.7rem]"
          style={{ color: 'var(--color-muted)' }}
        >
          Total ${comanda.total.toLocaleString('es-CO')}
        </span>
        {tono === 'done' ? (
          <span
            className="text-xs italic"
            style={{ color: 'var(--color-muted)' }}
          >
            Esperando al mesero
          </span>
        ) : (
          <button
            type="button"
            onClick={avanzar}
            disabled={pending}
            className="text-xs font-medium transition-opacity disabled:opacity-40"
            style={{ color: colorMarca }}
          >
            {pending
              ? 'Actualizando…'
              : tono === 'pending'
                ? 'Empezar a preparar →'
                : 'Marcar como lista →'}
          </button>
        )}
      </footer>
    </article>
  );
}

function TiempoTranscurrido({ creadaEn }: { creadaEn: string }) {
  const [texto, setTexto] = useState<string>(() => formatearTiempo(creadaEn));

  useEffect(() => {
    const interval = setInterval(() => {
      setTexto(formatearTiempo(creadaEn));
    }, 30_000);
    return () => clearInterval(interval);
  }, [creadaEn]);

  return (
    <span
      className="text-[0.7rem] tabular-nums"
      style={{ color: 'var(--color-muted)' }}
    >
      {texto}
    </span>
  );
}

function formatearTiempo(creadaEn: string): string {
  const ahora = Date.now();
  const desde = new Date(creadaEn).getTime();
  const minutos = Math.floor((ahora - desde) / 60_000);

  if (minutos < 1) return 'recién';
  if (minutos === 1) return 'hace 1 min';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas === 1) return 'hace 1 h';
  return `hace ${horas} h`;
}

function EstadoVacio({ colorMarca }: { colorMarca: string }) {
  return (
    <div className="text-center py-20 max-w-md mx-auto">
      <div
        className="size-16 rounded-full grid place-items-center mx-auto mb-6"
        style={{ background: colorMarca, color: 'white' }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M3 12h4l3-9 4 18 3-9h4"
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
        Todo en orden.
      </h2>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        No hay comandas activas en este momento. Cuando un cliente envíe un
        pedido, aparecerá aquí automáticamente.
      </p>
    </div>
  );
}
