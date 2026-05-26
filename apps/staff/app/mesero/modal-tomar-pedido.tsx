'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  crearComandaMesero,
  obtenerResumenSesion,
  confirmarPagoMesero,
  type FormaPagoBackend,
  type ResumenSesionMesa,
} from './actions';

// Tipos del menu. Se exportan para que page.tsx y tablero-mesero.tsx
// los reusen.
export type ProductoMenu = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  disponible: boolean;
};

export type CategoriaMenu = {
  id: string;
  nombre: string;
  orden: number;
  productos: ProductoMenu[];
};

type ComandaResumen = Extract<ResumenSesionMesa, { ok: true }>['comandas'][number];

/**
 * Modal POS para que el mesero tome el pedido en su dispositivo.
 *
 * - Al abrir, carga el resumen de la sesion de la mesa (obtenerResumenSesion):
 *   si la mesa ya tiene pedidos, los muestra arriba ("Ya pedido").
 * - El mesero arma un pedido nuevo con los controles +/- y lo envia.
 * - Boton "Cobrar mesa": abre el panel de cobro (confirmarPagoMesero), que
 *   cierra la mesa sin necesidad de que el cliente pida la cuenta.
 */
export function ModalTomarPedido({
  mesa,
  grupos,
  colorMarca,
  onCerrar,
}: {
  mesa: { id: string; numero: string };
  grupos: CategoriaMenu[];
  colorMarca: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Map<string, number>>(new Map());
  const [nombreCliente, setNombreCliente] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Resumen de lo ya pedido en la mesa (Pieza A).
  const [resumen, setResumen] = useState<{
    cargando: boolean;
    sesionId: string | null;
    comandas: ComandaResumen[];
    totalAcumulado: number;
  }>({ cargando: true, sesionId: null, comandas: [], totalAcumulado: 0 });

  // Panel de cobro abierto/cerrado (Pieza B).
  const [cobrando, setCobrando] = useState(false);

  // Al montar, traer el resumen de la sesion de la mesa.
  useEffect(() => {
    let cancelado = false;
    obtenerResumenSesion({ mesaId: mesa.id }).then((r) => {
      if (cancelado) return;
      if (r.ok) {
        setResumen({
          cargando: false,
          sesionId: r.sesionId,
          comandas: r.comandas,
          totalAcumulado: r.totalAcumulado,
        });
      } else {
        setResumen({ cargando: false, sesionId: null, comandas: [], totalAcumulado: 0 });
      }
    });
    return () => {
      cancelado = true;
    };
  }, [mesa.id]);

  const productosMap = useMemo(() => {
    const m = new Map<string, ProductoMenu>();
    for (const g of grupos) {
      for (const p of g.productos) m.set(p.id, p);
    }
    return m;
  }, [grupos]);

  function cambiarCantidad(productoId: string, delta: number) {
    setCarrito((prev) => {
      const next = new Map(prev);
      const actual = next.get(productoId) ?? 0;
      const nuevo = Math.max(0, Math.min(99, actual + delta));
      if (nuevo === 0) next.delete(productoId);
      else next.set(productoId, nuevo);
      return next;
    });
  }

  const totalItems = useMemo(() => {
    let n = 0;
    for (const cant of carrito.values()) n += cant;
    return n;
  }, [carrito]);

  const totalMonto = useMemo(() => {
    let t = 0;
    for (const [pid, cant] of carrito.entries()) {
      const prod = productosMap.get(pid);
      if (prod) t += prod.precio * cant;
    }
    return t;
  }, [carrito, productosMap]);

  function enviar() {
    setError(null);
    const items = Array.from(carrito.entries()).map(([productoId, cantidad]) => ({
      productoId,
      cantidad,
      notas: null,
    }));
    if (items.length === 0) {
      setError('Agrega al menos un producto.');
      return;
    }
    startTransition(async () => {
      const r = await crearComandaMesero({
        mesaId: mesa.id,
        items,
        nombreCliente: nombreCliente.trim() || undefined,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.refresh();
      onCerrar();
    });
  }

  const hayProductos = grupos.some((g) => g.productos.some((p) => p.disponible));
  const mesaOcupada = resumen.comandas.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
      style={{ background: 'rgba(26, 24, 20, 0.6)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-lg)] bg-white overflow-hidden flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header
          className="px-5 py-4 border-b shrink-0"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
            Tomar pedido
          </p>
          <h2
            className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] mt-1"
            style={{ color: 'var(--color-ink)' }}
          >
            Mesa {mesa.numero}
          </h2>
        </header>

        {/* Body scrolleable */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Pieza A: lo ya pedido en la mesa */}
          {resumen.cargando ? (
            <p className="text-xs italic" style={{ color: 'var(--color-muted)' }}>
              Cargando lo pedido en la mesa…
            </p>
          ) : mesaOcupada ? (
            <div
              className="rounded-[var(--radius-md)] border"
              style={{ borderColor: '#fde68a', background: '#fefce8' }}
            >
              <div
                className="px-4 py-2.5 border-b flex items-center justify-between"
                style={{ borderColor: '#fde68a' }}
              >
                <p
                  className="text-[0.7rem] uppercase tracking-[0.14em]"
                  style={{ color: '#92400e' }}
                >
                  Ya pedido en esta mesa
                </p>
                <p
                  className="font-[family-name:var(--font-mono)] text-sm tabular-nums"
                  style={{ color: '#78350f' }}
                >
                  ${resumen.totalAcumulado.toLocaleString('es-CO')}
                </p>
              </div>
              <ul className="divide-y" style={{ borderColor: '#fde68a' }}>
                {resumen.comandas.map((c, idxC) => (
                  <li key={`${c.numeroDiario}-${idxC}`} className="px-4 py-2.5">
                    <p
                      className="font-[family-name:var(--font-display)] text-xs tabular-nums mb-1"
                      style={{ color: '#92400e' }}
                    >
                      Comanda #{c.numeroDiario.toString().padStart(3, '0')}
                      {idxC > 0 ? ' (adicion)' : ''}
                    </p>
                    <ul className="space-y-0.5">
                      {c.items.map((it, idxI) => (
                        <li key={idxI} className="text-sm flex items-baseline gap-2">
                          <span
                            className="font-[family-name:var(--font-mono)] text-xs tabular-nums shrink-0"
                            style={{ color: '#92400e' }}
                          >
                            {it.cantidad}×
                          </span>
                          <span className="flex-1" style={{ color: 'var(--color-ink)' }}>
                            {it.nombre}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Nombre opcional del cliente */}
          <div>
            <label
              htmlFor="nombre-cliente-mesero"
              className="text-xs uppercase tracking-[0.14em] block mb-1.5"
              style={{ color: 'var(--color-muted)' }}
            >
              Nombre del cliente (opcional)
            </label>
            <input
              id="nombre-cliente-mesero"
              type="text"
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              placeholder={`Mesa ${mesa.numero}`}
              maxLength={50}
              className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-sm"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />
          </div>

          {/* Menu por categorias */}
          {grupos.map((g) => {
            const disponibles = g.productos.filter((p) => p.disponible);
            if (disponibles.length === 0) return null;
            return (
              <div key={g.id}>
                <h3
                  className="text-xs uppercase tracking-[0.14em] mb-2"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {g.nombre}
                </h3>
                <ul className="space-y-1.5">
                  {disponibles.map((p) => {
                    const cant = carrito.get(p.id) ?? 0;
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-[var(--radius-md)] border px-3 py-2"
                        style={{
                          borderColor: cant > 0 ? colorMarca : 'var(--color-border)',
                          background: cant > 0 ? 'var(--color-paper)' : 'white',
                        }}
                      >
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm font-medium truncate"
                            style={{ color: 'var(--color-ink)' }}
                          >
                            {p.nombre}
                          </p>
                          <p
                            className="text-xs font-[family-name:var(--font-mono)]"
                            style={{ color: 'var(--color-muted)' }}
                          >
                            ${p.precio.toLocaleString('es-CO')}
                          </p>
                        </div>
                        {cant === 0 ? (
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(p.id, 1)}
                            className="h-9 px-4 rounded-[var(--radius-md)] text-sm font-medium shrink-0"
                            style={{ background: colorMarca, color: 'white' }}
                          >
                            Agregar
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(p.id, -1)}
                              aria-label={`Quitar uno de ${p.nombre}`}
                              className="size-9 grid place-items-center rounded-[var(--radius-md)] border"
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
                              className="w-7 text-center text-sm font-medium tabular-nums"
                              style={{ color: 'var(--color-ink)' }}
                            >
                              {cant}
                            </span>
                            <button
                              type="button"
                              onClick={() => cambiarCantidad(p.id, 1)}
                              aria-label={`Agregar uno de ${p.nombre}`}
                              className="size-9 grid place-items-center rounded-[var(--radius-md)] border"
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
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {!hayProductos ? (
            <p className="text-sm text-center italic py-8" style={{ color: 'var(--color-muted)' }}>
              No hay productos disponibles en el menu.
            </p>
          ) : null}
        </div>

        {/* Footer */}
        <footer
          className="px-5 py-4 border-t shrink-0"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
        >
          {error ? (
            <p
              role="alert"
              className="text-xs text-center mb-3"
              style={{ color: 'var(--color-danger)' }}
            >
              {error}
            </p>
          ) : null}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
              {totalItems} {totalItems === 1 ? 'producto' : 'productos'} nuevo
              {totalItems === 1 ? '' : 's'}
            </span>
            <span
              className="font-[family-name:var(--font-display)] text-xl"
              style={{ color: 'var(--color-ink)' }}
            >
              ${totalMonto.toLocaleString('es-CO')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCerrar}
              disabled={pending}
              className="h-11 px-4 rounded-[var(--radius-md)] text-sm border disabled:opacity-50 shrink-0"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'white',
              }}
            >
              Cerrar
            </button>
            {/* Pieza B: cobrar mesa. Solo si la mesa ya tiene pedidos. */}
            {mesaOcupada && resumen.sesionId ? (
              <button
                type="button"
                onClick={() => setCobrando(true)}
                disabled={pending}
                className="h-11 px-4 rounded-[var(--radius-md)] text-sm font-medium border disabled:opacity-50 shrink-0"
                style={{ borderColor: colorMarca, color: colorMarca, background: 'white' }}
              >
                Cobrar mesa
              </button>
            ) : null}
            <button
              type="button"
              onClick={enviar}
              disabled={pending || totalItems === 0}
              className="flex-1 h-11 rounded-[var(--radius-md)] text-sm font-medium disabled:opacity-50"
              style={{ background: colorMarca, color: 'white' }}
            >
              {pending ? 'Enviando…' : 'Enviar a cocina'}
            </button>
          </div>
        </footer>
      </div>

      {/* Panel de cobro (Pieza B) */}
      {cobrando && resumen.sesionId ? (
        <PanelCobroMesero
          sesionId={resumen.sesionId}
          mesaNumero={mesa.numero}
          subtotal={resumen.totalAcumulado}
          colorMarca={colorMarca}
          onCerrar={() => setCobrando(false)}
          onCobrado={() => {
            router.refresh();
            onCerrar();
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * Sub-modal de cobro. Lo abre el mesero desde el modal de pedido.
 * Llama confirmarPagoMesero (cierra la mesa por sesionId, sin llamado).
 */
function PanelCobroMesero({
  sesionId,
  mesaNumero,
  subtotal,
  colorMarca,
  onCerrar,
  onCobrado,
}: {
  sesionId: string;
  mesaNumero: string;
  subtotal: number;
  colorMarca: string;
  onCerrar: () => void;
  onCobrado: () => void;
}) {
  const [conPropina, setConPropina] = useState(true);
  const [metodo, setMetodo] = useState<FormaPagoBackend>('efectivo');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const propina = conPropina ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + propina;

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const r = await confirmarPagoMesero({
        sesionId,
        metodoConfirmado: metodo,
        conPropina,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      onCobrado();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center px-4 py-8"
      style={{ background: 'rgba(26, 24, 20, 0.6)' }}
      onClick={onCerrar}
    >
      <div
        className="w-full max-w-md rounded-[var(--radius-lg)] bg-white overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <p
            className="text-[0.65rem] uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-muted)' }}
          >
            Cobrar Mesa {mesaNumero}
          </p>
          <h2
            className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] mt-1"
            style={{ color: 'var(--color-ink)' }}
          >
            Confirmar pago
          </h2>
        </header>

        <div className="px-5 py-4 space-y-4">
          <div
            className="rounded-[var(--radius-md)] border p-4"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
          >
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--color-ink-soft)' }}>Subtotal</span>
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{ color: 'var(--color-ink)' }}
              >
                ${subtotal.toLocaleString('es-CO')}
              </span>
            </div>
            <label className="flex items-center justify-between gap-3 py-2 cursor-pointer select-none">
              <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                Propina (10%)
              </span>
              <div className="flex items-center gap-2">
                {conPropina ? (
                  <span
                    className="text-sm font-[family-name:var(--font-mono)]"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    ${propina.toLocaleString('es-CO')}
                  </span>
                ) : null}
                <button
                  type="button"
                  role="switch"
                  aria-checked={conPropina}
                  onClick={() => setConPropina((v) => !v)}
                  className="relative h-6 w-11 rounded-full transition-colors"
                  style={{
                    background: conPropina ? colorMarca : 'var(--color-paper-deep)',
                    border: `1px solid ${conPropina ? colorMarca : 'var(--color-border-strong)'}`,
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: conPropina ? 'translateX(20px)' : 'translateX(0)' }}
                  />
                </button>
              </div>
            </label>
            <div
              className="border-t pt-3 mt-2 flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>
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

          <div>
            <p
              className="text-xs uppercase tracking-[0.14em] mb-2"
              style={{ color: 'var(--color-muted)' }}
            >
              Metodo de pago
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { v: 'efectivo', l: 'Efectivo' },
                  { v: 'tarjeta', l: 'Tarjeta' },
                  { v: 'transferencia', l: 'Transferencia' },
                  { v: 'no_seguro', l: 'Otro' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setMetodo(opt.v)}
                  className="h-10 rounded-[var(--radius-md)] border text-sm transition-colors"
                  style={{
                    borderColor: metodo === opt.v ? colorMarca : 'var(--color-border-strong)',
                    borderWidth: metodo === opt.v ? 1.5 : 1,
                    background: metodo === opt.v ? 'var(--color-paper)' : 'white',
                    color: metodo === opt.v ? colorMarca : 'var(--color-ink)',
                  }}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <p role="alert" className="text-xs text-center" style={{ color: 'var(--color-danger)' }}>
              {error}
            </p>
          ) : null}

          <p className="text-[0.7rem] text-center px-2" style={{ color: 'var(--color-muted)' }}>
            Al confirmar, la mesa se cierra y todas las comandas pendientes se marcan como
            entregadas.
          </p>
        </div>

        <footer
          className="px-5 py-4 border-t flex items-center gap-3"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
        >
          <button
            type="button"
            onClick={onCerrar}
            disabled={pending}
            className="flex-1 h-11 rounded-[var(--radius-md)] text-sm border"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'white',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={pending}
            className="flex-1 h-11 rounded-[var(--radius-md)] text-sm font-medium disabled:opacity-50"
            style={{ background: colorMarca, color: 'white' }}
          >
            {pending ? 'Cobrando…' : 'Confirmar y cerrar'}
          </button>
        </footer>
      </div>
    </div>
  );
}
