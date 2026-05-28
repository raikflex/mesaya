'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  agregarItem,
  actualizarCantidad,
  leerCarrito,
  calcularTotal,
  totalUnidades,
  type ItemCarrito,
} from '../../../lib/carrito';

type Producto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  disponible: boolean;
};

type Grupo = {
  id: string;
  nombre: string;
  orden: number;
  productos: Producto[];
};

export function MenuExterno({
  slug,
  nombreNegocio,
  colorMarca,
  logoUrl,
  grupos,
  aceptaDomicilios,
  aceptaPickup,
}: {
  slug: string;
  nombreNegocio: string;
  colorMarca: string;
  logoUrl: string | null;
  grupos: Grupo[];
  aceptaDomicilios: boolean;
  aceptaPickup: boolean;
}) {
  const router = useRouter();
  // Usar slug directamente como carritoKey — la lib construye mesaya:carrito:{slug}
  const carritoKey = slug;

  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const seccionesRef = useRef<Record<string, HTMLElement | null>>({});
  const tabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setCarrito(leerCarrito(carritoKey));
  }, [carritoKey]);

  useEffect(() => {
    if (!categoriaActiva && grupos.length > 0 && grupos[0]) {
      setCategoriaActiva(grupos[0].id);
    }
  }, [grupos, categoriaActiva]);

  useEffect(() => {
    if (grupos.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visibles = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibles.length > 0 && visibles[0]) {
          const id = visibles[0].target.getAttribute('data-categoria-id');
          if (id) setCategoriaActiva(id);
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: [0, 0.1, 0.5, 1] },
    );
    Object.values(seccionesRef.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [grupos]);

  useEffect(() => {
    if (!categoriaActiva || !tabsRef.current) return;
    const activa = tabsRef.current.querySelector<HTMLElement>(`[data-tab-id="${categoriaActiva}"]`);
    if (activa) activa.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [categoriaActiva]);

  function scrollACategoria(id: string) {
    const el = seccionesRef.current[id];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: 'smooth' });
    setCategoriaActiva(id);
  }

  function onAgregar(producto: Producto) {
    const nuevo = agregarItem(carritoKey, {
      productoId: producto.id,
      nombre: producto.nombre,
      precio: producto.precio,
      cantidad: 1,
      notas: null,
    });
    setCarrito(nuevo);
    setToast(producto.nombre);
    setTimeout(() => setToast(null), 2800);
  }

  function onCambiarCantidad(productoId: string, cantidad: number) {
    const nuevo = actualizarCantidad(carritoKey, productoId, cantidad);
    setCarrito(nuevo);
  }

  const totalCarrito = calcularTotal(carrito);
  const unidadesCarrito = totalUnidades(carrito);
  const tipoBadges = [
    ...(aceptaDomicilios ? ['Domicilio'] : []),
    ...(aceptaPickup ? ['Para recoger'] : []),
  ];

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-paper)',
        paddingBottom: carrito.length > 0 ? '5.5rem' : '1rem',
      }}
    >
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{ borderColor: 'var(--color-border)', background: 'rgba(250, 246, 241, 0.92)' }}
      >
        <div className="px-5 py-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo de ${nombreNegocio}`}
                className="size-10 rounded-full object-contain shrink-0"
                style={{ background: 'white' }}
              />
            ) : (
              <div
                className="size-10 rounded-full grid place-items-center shrink-0 text-white text-sm font-medium"
                style={{ background: colorMarca }}
              >
                {nombreNegocio.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {tipoBadges.map((t) => (
                  <span
                    key={t}
                    className="text-[0.6rem] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
                    style={{ background: colorMarca, color: 'white' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <h1
                className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate mt-0.5"
                style={{ color: 'var(--color-ink)' }}
              >
                {nombreNegocio}
              </h1>
            </div>
          </div>
        </div>

        {grupos.length > 0 ? (
          <div
            ref={tabsRef}
            className="flex gap-1 px-5 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: 'thin' }}
          >
            {grupos.map((g) => (
              <button
                key={g.id}
                type="button"
                data-tab-id={g.id}
                onClick={() => scrollACategoria(g.id)}
                className="px-3.5 h-11 rounded-full text-xs whitespace-nowrap transition-all shrink-0"
                style={{
                  background: categoriaActiva === g.id ? 'var(--color-ink)' : 'transparent',
                  color: categoriaActiva === g.id ? 'var(--color-paper)' : 'var(--color-ink-soft)',
                  border:
                    categoriaActiva === g.id
                      ? '1px solid var(--color-ink)'
                      : '1px solid var(--color-border-strong)',
                }}
              >
                {g.nombre}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      {toast ? (
        <div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium"
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
            animation: 'fadeIn 0.2s ease-out',
          }}
          role="status"
          aria-live="polite"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <polyline
              points="5 12 10 17 19 8"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {toast} agregado
        </div>
      ) : null}

      <div className="flex-1 px-5 pt-4">
        {grupos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm italic" style={{ color: 'var(--color-muted)' }}>
              El menu se esta actualizando. Intenta mas tarde.
            </p>
          </div>
        ) : (
          <div className="space-y-8 pt-2">
            {grupos.map((g) => (
              <section
                key={g.id}
                ref={(el) => { seccionesRef.current[g.id] = el; }}
                data-categoria-id={g.id}
                className="scroll-mt-28"
              >
                <h2
                  className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {g.nombre}
                </h2>
                <ul className="space-y-2">
                  {g.productos.map((p) => {
                    const cantidad = carrito.find((i) => i.productoId === p.id)?.cantidad ?? 0;
                    return (
                      <ItemProducto
                        key={p.id}
                        producto={p}
                        colorMarca={colorMarca}
                        cantidad={cantidad}
                        onAgregar={() => onAgregar(p)}
                        onCambiarCantidad={(c) => onCambiarCantidad(p.id, c)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {carrito.length > 0 ? (
        <button
          type="button"
          onClick={() => router.push(`/d/${slug}/checkout`)}
          className="fixed bottom-4 left-4 right-4 z-30 h-14 rounded-full flex items-center justify-between px-5 max-w-md mx-auto"
          style={{ background: colorMarca, color: 'white' }}
        >
          <span className="flex items-center gap-2.5">
            <span
              className="size-7 rounded-full grid place-items-center text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              {unidadesCarrito}
            </span>
            <span className="text-sm font-medium">Ver pedido</span>
          </span>
          <span className="font-[family-name:var(--font-mono)] text-sm">
            ${totalCarrito.toLocaleString('es-CO')}
          </span>
        </button>
      ) : null}

      <footer className="py-6 text-center mt-4">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
          Servido con <span style={{ color: 'var(--color-ink)' }}>EnPura</span>
        </p>
      </footer>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </main>
  );
}

function ItemProducto({
  producto,
  colorMarca,
  cantidad,
  onAgregar,
  onCambiarCantidad,
}: {
  producto: Producto;
  colorMarca: string;
  cantidad: number;
  onAgregar: () => void;
  onCambiarCantidad: (n: number) => void;
}) {
  const sinStock = !producto.disponible;
  const enCarrito = cantidad > 0;

  return (
    <li
      className="rounded-[var(--radius-lg)] border bg-white"
      style={{
        borderColor: enCarrito ? colorMarca : 'var(--color-border)',
        borderWidth: enCarrito ? 1.5 : 1,
        opacity: sinStock ? 0.55 : 1,
      }}
    >
      <div className="px-4 py-3.5 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className="text-sm font-medium"
              style={{
                color: 'var(--color-ink)',
                textDecoration: sinStock ? 'line-through' : 'none',
              }}
            >
              {producto.nombre}
            </p>
            {sinStock ? (
              <span
                className="text-xs uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                style={{ background: 'var(--color-paper-deep)', color: 'var(--color-muted)' }}
              >
                Sin stock
              </span>
            ) : null}
          </div>
          {producto.descripcion ? (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
              {producto.descripcion}
            </p>
          ) : null}
          <p
            className="text-sm mt-2 font-[family-name:var(--font-mono)]"
            style={{ color: 'var(--color-ink)' }}
          >
            ${producto.precio.toLocaleString('es-CO')}
          </p>
        </div>

        {!sinStock ? (
          enCarrito ? (
            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
              <button
                type="button"
                onClick={() => onCambiarCantidad(cantidad - 1)}
                aria-label={`Quitar uno de ${producto.nombre}`}
                className="size-9 grid place-items-center rounded-full border"
                style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              <span
                className="w-7 text-center text-sm font-medium tabular-nums"
                style={{ color: 'var(--color-ink)' }}
              >
                {cantidad}
              </span>
              <button
                type="button"
                onClick={() => onCambiarCantidad(cantidad + 1)}
                disabled={cantidad >= 99}
                aria-label={`Agregar uno de ${producto.nombre}`}
                className="size-9 grid place-items-center rounded-full border disabled:opacity-40"
                style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onAgregar}
              aria-label={`Agregar ${producto.nombre}`}
              className="size-9 rounded-full grid place-items-center shrink-0 mt-0.5"
              style={{ background: colorMarca, color: 'white' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )
        ) : null}
      </div>
    </li>
  );
}
