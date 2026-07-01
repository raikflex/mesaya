'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@mesaya/database/client';
import { cambiarEstadoPedidoProgramado } from './actions';

export type PedidoProg = {
  id: string;
  grupoId: string | null;
  nombreCliente: string;
  telefono: string;
  direccion: string;
  fechaEntrega: string; // YYYY-MM-DD
  horaEntrega: string; // HH:MM(:SS)
  total: number;
  estado: string;
  nota: string | null;
  items: { nombre: string; precio: number; cantidad: number }[];
};

type RawItem = { nombre_snapshot: string; precio_snapshot: number; cantidad: number };
type RawPedido = {
  id: string;
  grupo_id: string | null;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  fecha_entrega: string;
  hora_entrega: string;
  total: number;
  estado: string;
  nota: string | null;
  pedidos_programados_items: RawItem[] | null;
};

type Filtro = { modo: 'proximos' | 'historial' | 'dia'; fecha: string | null };

const SELECT_PEDIDOS =
  'id, grupo_id, nombre_cliente, telefono, direccion, fecha_entrega, hora_entrega, total, estado, nota, pedidos_programados_items(nombre_snapshot, precio_snapshot, cantidad)';

function mapearPedidos(rows: RawPedido[]): PedidoProg[] {
  return rows.map((p) => ({
    id: p.id,
    grupoId: p.grupo_id ?? null,
    nombreCliente: p.nombre_cliente,
    telefono: p.telefono,
    direccion: p.direccion,
    fechaEntrega: p.fecha_entrega,
    horaEntrega: p.hora_entrega,
    total: p.total,
    estado: p.estado,
    nota: p.nota ?? null,
    items: (p.pedidos_programados_items ?? []).map((i) => ({
      nombre: i.nombre_snapshot,
      precio: i.precio_snapshot,
      cantidad: i.cantidad,
    })),
  }));
}

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const ESTADOS: Record<string, { label: string; bg: string; color: string }> = {
  pendiente: { label: 'Pendiente', bg: '#fef3c7', color: '#92400e' },
  confirmado: { label: 'Confirmado', bg: '#dbeafe', color: '#1e40af' },
  entregado: { label: 'Entregado', bg: '#dcfce7', color: '#166534' },
  cancelado: { label: 'Cancelado', bg: 'var(--color-paper-deep)', color: 'var(--color-muted)' },
};

/** Suma un dia a una fecha "YYYY-MM-DD". */
function sumarDia(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + 1);
  const yy = dt.getFullYear();
  const mm = (dt.getMonth() + 1).toString().padStart(2, '0');
  const dd = dt.getDate().toString().padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Etiqueta amable para una fecha, relativa a hoy. */
function etiquetaFecha(fecha: string, hoy: string): string {
  if (fecha === hoy) return 'Hoy';
  if (fecha === sumarDia(hoy)) return 'Manana';
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  return `${DIAS[dt.getDay()]} ${d} ${MESES[(m ?? 1) - 1]}`;
}

/** "14:30:00" o "14:30" -> "2:30 pm" */
function formatearHora(hora: string): string {
  const [hStr, mStr] = hora.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function DomiciliosProgramadosCliente({
  pedidos: pedidosIniciales,
  hoy,
  restauranteId,
}: {
  pedidos: PedidoProg[];
  hoy: string;
  restauranteId: string;
}) {
  const [pedidos, setPedidos] = useState<PedidoProg[]>(pedidosIniciales);
  const [actualizando, setActualizando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>({ modo: 'proximos', fecha: null });
  const [cargandoLista, setCargandoLista] = useState(false);

  const filtroRef = useRef(filtro);
  filtroRef.current = filtro;

  async function consultar(f: Filtro): Promise<PedidoProg[]> {
    const supabase = createClient();
    let query = supabase
      .from('pedidos_programados')
      .select(SELECT_PEDIDOS)
      .eq('restaurante_id', restauranteId);
    if (f.modo === 'proximos') query = query.gte('fecha_entrega', hoy);
    else if (f.modo === 'historial') query = query.lt('fecha_entrega', hoy);
    else if (f.modo === 'dia' && f.fecha) query = query.eq('fecha_entrega', f.fecha);
    const asc = f.modo !== 'historial';
    const { data } = await query
      .order('fecha_entrega', { ascending: asc })
      .order('hora_entrega', { ascending: true });
    return mapearPedidos((data ?? []) as unknown as RawPedido[]);
  }

  function recargar() {
    setCargandoLista(true);
    consultar(filtroRef.current)
      .then((res) => {
        setPedidos(res);
        setCargandoLista(false);
      })
      .catch(() => setCargandoLista(false));
  }

  // Cambio de filtro. La vista inicial "Proximos" ya viene del servidor.
  const primeraVez = useRef(true);
  useEffect(() => {
    if (primeraVez.current) {
      primeraVez.current = false;
      if (filtro.modo === 'proximos') return;
    }
    recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  // Realtime: cuando cambian los pedidos del restaurante, recargamos la vista
  // actual con una consulta protegida por RLS (no usamos el payload del evento).
  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel(`pp-${restauranteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos_programados',
          filter: `restaurante_id=eq.${restauranteId}`,
        },
        () => recargar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restauranteId]);

  const grupos = useMemo(() => {
    const map = new Map<string, PedidoProg[]>();
    for (const p of pedidos) {
      if (!map.has(p.fechaEntrega)) map.set(p.fechaEntrega, []);
      map.get(p.fechaEntrega)!.push(p);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [pedidos]);

  async function cambiar(pedidoId: string, nuevoEstado: PedidoProg['estado']) {
    setError(null);
    setActualizando(pedidoId);
    const antes = pedidos;
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, estado: nuevoEstado } : p)),
    );
    const r = await cambiarEstadoPedidoProgramado(
      pedidoId,
      nuevoEstado as 'pendiente' | 'confirmado' | 'entregado' | 'cancelado',
    );
    setActualizando(null);
    if (!r.ok) {
      setPedidos(antes);
      setError(r.error);
    }
  }

  function confirmarCancelar(pedidoId: string, nombre: string) {
    if (window.confirm(`Cancelar el pedido de ${nombre}? Esta accion no se puede deshacer.`)) {
      cambiar(pedidoId, 'cancelado');
    }
  }

  const totalActivos = pedidos.filter((p) => p.estado !== 'cancelado').length;

  const subtitulo =
    filtro.modo === 'historial'
      ? 'Pedidos de dias pasados.'
      : filtro.modo === 'dia' && filtro.fecha
        ? `Pedidos del ${etiquetaFecha(filtro.fecha, hoy)}.`
        : totalActivos > 0
          ? `${totalActivos} ${totalActivos === 1 ? 'pedido activo' : 'pedidos activos'} de hoy en adelante.`
          : 'Los pedidos que programen tus clientes apareceran aqui, agrupados por dia.';

  return (
    <main className="px-6 sm:px-10 py-10 max-w-4xl mx-auto">
      <header className="mb-8">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          Domicilios programados
        </h1>
        <p className="mt-3 text-[0.95rem]" style={{ color: 'var(--color-ink-soft)' }}>
          {subtitulo}
        </p>
      </header>

      {/* Filtro de vista */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div
          className="inline-flex rounded-[var(--radius-md)] border overflow-hidden"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          {(
            [
              ['proximos', 'Proximos'],
              ['historial', 'Historial'],
            ] as const
          ).map(([modo, label]) => {
            const activo = filtro.modo === modo;
            return (
              <button
                key={modo}
                type="button"
                onClick={() => setFiltro({ modo, fecha: null })}
                className="h-9 px-4 text-sm transition-colors"
                style={{
                  background: activo ? 'var(--color-ink)' : 'transparent',
                  color: activo ? 'var(--color-paper)' : 'var(--color-ink-soft)',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            o un dia:
          </span>
          <input
            type="date"
            value={filtro.modo === 'dia' ? filtro.fecha ?? '' : ''}
            onChange={(e) =>
              e.target.value
                ? setFiltro({ modo: 'dia', fecha: e.target.value })
                : setFiltro({ modo: 'proximos', fecha: null })
            }
            className="h-9 px-3 rounded-[var(--radius-md)] border text-sm"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'white',
            }}
          />
        </div>

        {cargandoLista ? (
          <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Cargando...
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          role="alert"
          className="mb-6 rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
          style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)', background: '#fef2f2' }}
        >
          {error}
        </div>
      ) : null}

      {grupos.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border border-dashed p-12 text-center"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            {filtro.modo === 'historial'
              ? 'No hay pedidos en el historial.'
              : filtro.modo === 'dia'
                ? 'No hay pedidos para ese dia.'
                : 'Todavia no hay domicilios programados proximos.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grupos.map(([fecha, lista]) => (
            <section key={fecha}>
              <div className="flex items-baseline gap-3 mb-3">
                <h2
                  className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em]"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {etiquetaFecha(fecha, hoy)}
                </h2>
                <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
                  {lista.length} {lista.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>

              <div className="space-y-3">
                {lista.map((p) => (
                  <PedidoCard
                    key={p.id}
                    pedido={p}
                    actualizando={actualizando === p.id}
                    onCambiar={cambiar}
                    onCancelar={confirmarCancelar}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function PedidoCard({
  pedido,
  actualizando,
  onCambiar,
  onCancelar,
}: {
  pedido: PedidoProg;
  actualizando: boolean;
  onCambiar: (id: string, estado: PedidoProg['estado']) => void;
  onCancelar: (id: string, nombre: string) => void;
}) {
  const est = ESTADOS[pedido.estado] ?? ESTADOS.pendiente!;
  const cancelado = pedido.estado === 'cancelado';
  const digitos = pedido.telefono.replace(/\D/g, '');
  const telHref = `tel:${pedido.telefono.replace(/\s/g, '')}`;
  const waHref = `https://wa.me/${digitos}`;

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-white p-4 sm:p-5"
      style={{ borderColor: 'var(--color-border)', opacity: cancelado ? 0.6 : 1 }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="font-[family-name:var(--font-display)] text-xl"
              style={{ color: 'var(--color-ink)' }}
            >
              {formatearHora(pedido.horaEntrega)}
            </span>
            <span className="text-base font-medium truncate" style={{ color: 'var(--color-ink)' }}>
              {pedido.nombreCliente}
            </span>
          </div>
        </div>
        <span
          className="text-[0.65rem] uppercase tracking-[0.08em] px-2 py-1 rounded-full font-medium shrink-0"
          style={{ background: est.bg, color: est.color }}
        >
          {est.label}
        </span>
      </div>

      <div className="flex items-start gap-2 mb-3" style={{ color: 'var(--color-ink-soft)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden className="mt-0.5 shrink-0">
          <path
            d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"
            stroke="currentColor"
            strokeWidth="1.6"
          />
          <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <p className="text-sm leading-relaxed">{pedido.direccion}</p>
      </div>

      <ul className="mb-3 space-y-1">
        {pedido.items.map((item, idx) => (
          <li key={idx} className="flex items-baseline justify-between gap-3 text-sm">
            <span style={{ color: 'var(--color-ink)' }}>
              <span className="mr-1.5" style={{ color: 'var(--color-muted)' }}>
                {item.cantidad}x
              </span>
              {item.nombre}
            </span>
            <span className="font-[family-name:var(--font-mono)] shrink-0" style={{ color: 'var(--color-ink-soft)' }}>
              ${(item.precio * item.cantidad).toLocaleString('es-CO')}
            </span>
          </li>
        ))}
      </ul>

      {pedido.nota ? (
        <p
          className="text-xs mb-3 rounded-[var(--radius-md)] px-3 py-2 leading-relaxed"
          style={{ background: 'var(--color-paper)', color: 'var(--color-ink-soft)' }}
        >
          Nota: {pedido.nota}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-xs" style={{ color: 'var(--color-muted)' }}>
          Total
        </span>
        <span className="font-[family-name:var(--font-display)] text-lg" style={{ color: 'var(--color-ink)' }}>
          ${pedido.total.toLocaleString('es-CO')}
        </span>
      </div>

      {/* Contacto */}
      <div className="flex gap-2 mt-3">
        <a
          href={telHref}
          className="flex-1 h-10 rounded-[var(--radius-md)] border flex items-center justify-center gap-2 text-sm"
          style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Llamar
        </a>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 h-10 rounded-[var(--radius-md)] flex items-center justify-center gap-2 text-sm font-medium"
          style={{ background: '#25d366', color: 'white' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.9.9-2.8-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8-.2-.1-.4-.1-.5.1l-.7.9c-.1.2-.3.2-.5.1a6.5 6.5 0 0 1-3.2-2.8c-.1-.2 0-.4.1-.5l.4-.5.2-.4v-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4H7c-.2 0-.4.1-.6.3a3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1.1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.4-.4z" />
          </svg>
          WhatsApp
        </a>
      </div>

      {/* Acciones de estado */}
      {pedido.estado === 'pendiente' || pedido.estado === 'confirmado' ? (
        <div className="flex gap-2 mt-2">
          {pedido.estado === 'pendiente' ? (
            <button
              type="button"
              onClick={() => onCambiar(pedido.id, 'confirmado')}
              disabled={actualizando}
              className="flex-1 h-10 rounded-[var(--radius-md)] text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
            >
              {actualizando ? '...' : 'Confirmar'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCambiar(pedido.id, 'entregado')}
              disabled={actualizando}
              className="flex-1 h-10 rounded-[var(--radius-md)] text-sm font-medium disabled:opacity-50"
              style={{ background: '#166534', color: 'white' }}
            >
              {actualizando ? '...' : 'Marcar entregado'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onCancelar(pedido.id, pedido.nombreCliente)}
            disabled={actualizando}
            className="h-10 px-4 rounded-[var(--radius-md)] border text-sm disabled:opacity-50"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-danger)' }}
          >
            Cancelar
          </button>
        </div>
      ) : null}
    </div>
  );
}
