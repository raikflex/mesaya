'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  leerCarrito,
  guardarCarrito,
  vaciarCarrito,
  type ItemCarrito,
} from '../../../../lib/carrito';
import { crearPedidoExterno } from './actions';

type TipoPedido = 'domicilio' | 'pickup';

export function CheckoutExterno({
  slug,
  nombreNegocio,
  colorMarca,
  aceptaDomicilios,
  aceptaPickup,
}: {
  slug: string;
  nombreNegocio: string;
  colorMarca: string;
  aceptaDomicilios: boolean;
  aceptaPickup: boolean;
}) {
  const router = useRouter();
  const carritoKey = slug;

  const tipoDefault: TipoPedido = aceptaDomicilios ? 'domicilio' : 'pickup';

  // Todos los hooks antes de cualquier return condicional.
  const [tipo, setTipo] = useState<TipoPedido>(tipoDefault);
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [hora, setHora] = useState('');
  const [notasGenerales, setNotasGenerales] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Items: vacio en SSR para evitar hydration mismatch, se llena en useEffect.
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    setItems(leerCarrito(carritoKey));
    setCargando(false);
  }, [carritoKey]);

  function onCambiarNotas(productoId: string, notas: string) {
    const nuevo = items.map((i) =>
      i.productoId === productoId ? { ...i, notas: notas || null } : i,
    );
    guardarCarrito(carritoKey, nuevo);
    setItems(nuevo);
  }

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const r = await crearPedidoExterno({
        slug,
        tipo,
        nombreCliente: nombre,
        telefono,
        direccion: tipo === 'domicilio' ? direccion : undefined,
        horaPedido: tipo === 'pickup' ? hora : undefined,
        notasEntrega: notasGenerales || undefined,
        items: items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
          notas: i.notas,
        })),
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      vaciarCarrito(carritoKey);
      router.push(`/d/${slug}/pedido/${r.pedidoId}`);
    });
  }

  // Returns condicionales despues de todos los hooks.
  if (cargando) {
    return (
      <main
        className="min-h-screen grid place-items-center"
        style={{ background: 'var(--color-paper)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Cargando...
        </p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main
        className="min-h-screen grid place-items-center"
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="text-center px-6">
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            Tu carrito esta vacio.
          </p>
          <button
            type="button"
            onClick={() => router.push(`/d/${slug}`)}
            className="h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium"
            style={{ background: colorMarca, color: 'white' }}
          >
            Volver al menu
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)', paddingBottom: '6rem' }}
    >
      <header
        className="sticky top-0 z-10 px-5 py-3 border-b backdrop-blur-sm"
        style={{ borderColor: 'var(--color-border)', background: 'rgba(250, 246, 241, 0.92)' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: 'var(--color-ink)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al menu
        </button>
      </header>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full space-y-5">
        <div>
          <p
            className="text-xs uppercase tracking-[0.14em] mb-1"
            style={{ color: 'var(--color-muted)' }}
          >
            {nombreNegocio}
          </p>
          <h1
            className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu pedido
          </h1>
        </div>

        {/* Tipo de pedido */}
        {aceptaDomicilios && aceptaPickup ? (
          <div>
            <p
              className="text-xs uppercase tracking-[0.14em] mb-2"
              style={{ color: 'var(--color-muted)' }}
            >
              Tipo de pedido
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(['domicilio', 'pickup'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className="h-11 rounded-[var(--radius-md)] border text-sm transition-colors"
                  style={{
                    borderColor: tipo === t ? colorMarca : 'var(--color-border-strong)',
                    borderWidth: tipo === t ? 1.5 : 1,
                    background: tipo === t ? 'var(--color-paper)' : 'white',
                    color: tipo === t ? colorMarca : 'var(--color-ink)',
                  }}
                >
                  {t === 'domicilio' ? 'Domicilio' : 'Para recoger'}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Lista de productos con notas por item */}
        <div>
          <p
            className="text-xs uppercase tracking-[0.14em] mb-2"
            style={{ color: 'var(--color-muted)' }}
          >
            Productos
          </p>
          <ul
            className="rounded-[var(--radius-lg)] border bg-white divide-y"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {items.map((item) => (
              <li key={item.productoId} className="px-4 py-3.5">
                <div className="flex items-baseline justify-between gap-3 mb-2">
                  <p className="text-sm font-medium flex-1 min-w-0" style={{ color: 'var(--color-ink)' }}>
                    <span className="mr-1.5" style={{ color: colorMarca }}>
                      {item.cantidad}×
                    </span>
                    {item.nombre}
                  </p>
                  <span
                    className="font-[family-name:var(--font-mono)] text-sm shrink-0"
                    style={{ color: 'var(--color-ink-soft)' }}
                  >
                    ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                  </span>
                </div>
                <input
                  type="text"
                  value={item.notas ?? ''}
                  onChange={(e) => onCambiarNotas(item.productoId, e.target.value)}
                  placeholder="Notas: sin cebolla, bien cocido, gaseosa fria..."
                  maxLength={120}
                  className="w-full h-9 px-3 rounded-[var(--radius-md)] border text-xs"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-ink)',
                    background: 'var(--color-paper)',
                  }}
                />
              </li>
            ))}
            <li
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--color-paper)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Total
              </span>
              <span
                className="font-[family-name:var(--font-display)] text-xl"
                style={{ color: 'var(--color-ink)' }}
              >
                ${total.toLocaleString('es-CO')}
              </span>
            </li>
          </ul>
        </div>

        {/* Datos del cliente */}
        <div className="space-y-3">
          <p
            className="text-xs uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-muted)' }}
          >
            Tus datos
          </p>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            maxLength={60}
            className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-sm"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
            }}
          />
          <input
            type="tel"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Telefono de contacto"
            maxLength={15}
            className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-sm"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
            }}
          />
        </div>

        {/* Datos de entrega segun tipo */}
        {tipo === 'domicilio' ? (
          <div className="space-y-3">
            <p
              className="text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Entrega
            </p>
            <textarea
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Direccion de entrega (barrio, calle, numero, referencias)"
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-sm resize-none"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <p
              className="text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Recogida
            </p>
            <input
              type="text"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              placeholder="Hora estimada de recogida (ej: 1:30 pm)"
              maxLength={30}
              className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-sm"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />
          </div>
        )}

        {/* Notas generales */}
        <div>
          <p
            className="text-xs uppercase tracking-[0.14em] mb-2"
            style={{ color: 'var(--color-muted)' }}
          >
            Notas del pedido (opcional)
          </p>
          <textarea
            value={notasGenerales}
            onChange={(e) => setNotasGenerales(e.target.value)}
            placeholder="Instrucciones especiales de entrega, alergias generales, etc."
            rows={2}
            maxLength={300}
            className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-sm resize-none"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
            }}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-4 border-t"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.96)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className="w-full max-w-md mx-auto h-12 rounded-[var(--radius-md)] text-base font-medium flex items-center justify-between px-5 disabled:opacity-50"
          style={{ background: colorMarca, color: 'white' }}
        >
          <span>{pending ? 'Enviando...' : 'Confirmar pedido'}</span>
          <span className="font-[family-name:var(--font-mono)]">
            ${total.toLocaleString('es-CO')}
          </span>
        </button>
      </div>
    </main>
  );
}