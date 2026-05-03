'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  borrarSesionCliente,
  leerSesionCliente,
} from '../../../../lib/cliente-session';
import {
  calcularTotal,
  leerCarrito,
  totalUnidades,
  type ItemCarrito,
} from '../../../../lib/carrito';

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

export function MenuCliente({
  qrToken,
  numeroMesa,
  nombreNegocio,
  colorMarca,
  grupos,
  totalProductos,
}: {
  qrToken: string;
  numeroMesa: string;
  nombreNegocio: string;
  colorMarca: string;
  grupos: Grupo[];
  totalProductos: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nombre, setNombre] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const seccionesRef = useRef<Record<string, HTMLElement | null>>({});
  const tabsRef = useRef<HTMLDivElement | null>(null);

  // Init: leer sesión y carrito.
  useEffect(() => {
    const sesion = leerSesionCliente(qrToken);
    if (!sesion) {
      router.replace(`/m/${qrToken}`);
      return;
    }
    setNombre(sesion.nombre);
    setCarrito(leerCarrito(qrToken));
    setCargando(false);
  }, [qrToken, router]);

  // Detectar query param ?agregado=... y mostrar toast.
  useEffect(() => {
    const agregado = searchParams.get('agregado');
    if (!agregado) return;

    setToast(decodeURIComponent(agregado));
    // Refrescar carrito desde sessionStorage.
    setCarrito(leerCarrito(qrToken));

    // Limpiar query param sin recargar.
    const url = new URL(window.location.href);
    url.searchParams.delete('agregado');
    window.history.replaceState(null, '', url.toString());

    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [searchParams, qrToken]);

  // Inicializar primera categoría como activa.
  useEffect(() => {
    if (!categoriaActiva && grupos.length > 0 && grupos[0]) {
      setCategoriaActiva(grupos[0].id);
    }
  }, [grupos, categoriaActiva]);

  // Scroll-spy.
  useEffect(() => {
    if (cargando || grupos.length === 0) return;
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
      {
        rootMargin: '-100px 0px -60% 0px',
        threshold: [0, 0.1, 0.5, 1],
      },
    );

    Object.values(seccionesRef.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [cargando, grupos]);

  // Auto-scroll de tabs.
  useEffect(() => {
    if (!categoriaActiva || !tabsRef.current) return;
    const activa = tabsRef.current.querySelector<HTMLElement>(
      `[data-tab-id="${categoriaActiva}"]`,
    );
    if (activa) {
      activa.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [categoriaActiva]);

  function cambiarNombre() {
    borrarSesionCliente(qrToken);
    router.replace(`/m/${qrToken}`);
  }

  function scrollACategoria(id: string) {
    const el = seccionesRef.current[id];
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: 'smooth' });
    setCategoriaActiva(id);
  }

  function abrirProducto(productoId: string) {
    router.push(`/m/${qrToken}/menu/${productoId}`);
  }

  function irAlCarrito() {
    router.push(`/m/${qrToken}/menu/carrito`);
  }

  if (cargando) {
    return (
      <main
        className="min-h-screen grid place-items-center"
        style={{ background: 'var(--color-paper)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Cargando…
        </p>
      </main>
    );
  }

  const totalCarrito = calcularTotal(carrito);
  const unidadesCarrito = totalUnidades(carrito);

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-paper)',
        paddingBottom: carrito.length > 0 ? '5.5rem' : '1rem',
      }}
    >
      {/* Header sticky */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.92)',
        }}
      >
        <div className="px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p
                className="text-[0.65rem] uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-muted)' }}
              >
                Mesa {numeroMesa} · Hola, {nombre}
              </p>
              <h1
                className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate"
                style={{ color: 'var(--color-ink)' }}
              >
                {nombreNegocio}
              </h1>
            </div>
            <button
              type="button"
              onClick={cambiarNombre}
              className="text-xs underline shrink-0"
              style={{ color: 'var(--color-muted)' }}
            >
              No soy yo
            </button>
          </div>
        </div>

        {grupos.length > 0 ? (
          <div
            ref={tabsRef}
            className="flex gap-1 px-5 pb-3 overflow-x-auto scrollbar-thin"
            style={{ scrollbarWidth: 'thin' }}
          >
            {grupos.map((g) => (
              <button
                key={g.id}
                type="button"
                data-tab-id={g.id}
                onClick={() => scrollACategoria(g.id)}
                className="px-3.5 h-8 rounded-full text-xs whitespace-nowrap transition-all shrink-0"
                style={{
                  background:
                    categoriaActiva === g.id ? 'var(--color-ink)' : 'transparent',
                  color:
                    categoriaActiva === g.id
                      ? 'var(--color-paper)'
                      : 'var(--color-ink-soft)',
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

      {/* Toast "Producto agregado" */}
      {toast ? (
        <div
          className="fixed top-24 left-1/2 -translate-x-1/2 z-30 px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium"
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

      {/* Contenido */}
      <div className="flex-1 px-5 pt-4">
        {totalProductos === 0 ? (
          <EstadoVacio colorMarca={colorMarca} />
        ) : (
          <div className="space-y-8 pt-2">
            {grupos.map((g) => (
              <section
                key={g.id}
                ref={(el) => {
                  seccionesRef.current[g.id] = el;
                }}
                data-categoria-id={g.id}
                className="scroll-mt-28"
              >
                <h2
                  className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {g.nombre}
                </h2>
                {g.productos.length === 0 ? (
                  <p
                    className="text-sm py-4 italic"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    Pronto hay novedades aquí.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {g.productos.map((p) => (
                      <ItemProducto
                        key={p.id}
                        producto={p}
                        colorMarca={colorMarca}
                        onAgregar={() => abrirProducto(p.id)}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

      {/* FAB carrito */}
      {carrito.length > 0 ? (
        <button
          type="button"
          onClick={irAlCarrito}
          className="fixed bottom-4 left-4 right-4 z-30 h-14 rounded-full shadow-xl flex items-center justify-between px-5 max-w-md mx-auto"
          style={{
            background: colorMarca,
            color: 'white',
          }}
        >
          <span className="flex items-center gap-2.5">
            <span
              className="size-7 rounded-full grid place-items-center text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              {unidadesCarrito}
            </span>
            <span className="text-sm font-medium">
              Ver mi pedido
            </span>
          </span>
          <span className="font-[family-name:var(--font-mono)] text-sm">
            ${totalCarrito.toLocaleString('es-CO')}
          </span>
        </button>
      ) : null}

      {/* Footer */}
      {carrito.length === 0 ? (
        <footer className="py-6 text-center mt-4">
          <p
            className="text-[0.7rem] uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-muted)' }}
          >
            Servido con <span style={{ color: 'var(--color-ink)' }}>MesaYA</span>
          </p>
        </footer>
      ) : null}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </main>
  );
}

function ItemProducto({
  producto,
  colorMarca,
  onAgregar,
}: {
  producto: Producto;
  colorMarca: string;
  onAgregar: () => void;
}) {
  const sinStock = !producto.disponible;

  return (
    <li
      className="rounded-[var(--radius-lg)] border bg-white"
      style={{
        borderColor: 'var(--color-border)',
        opacity: sinStock ? 0.55 : 1,
      }}
    >
      <button
        type="button"
        onClick={onAgregar}
        disabled={sinStock}
        aria-label={`Agregar ${producto.nombre}`}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 disabled:cursor-not-allowed"
      >
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
                className="text-[0.65rem] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded"
                style={{
                  background: 'var(--color-paper-deep)',
                  color: 'var(--color-muted)',
                }}
              >
                Sin stock
              </span>
            ) : null}
          </div>
          {producto.descripcion ? (
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: 'var(--color-ink-soft)' }}
            >
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
          <span
            className="size-9 rounded-full grid place-items-center shrink-0 mt-0.5 transition-transform"
            style={{
              background: colorMarca,
              color: 'white',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : null}
      </button>
    </li>
  );
}

function EstadoVacio({ colorMarca }: { colorMarca: string }) {
  return (
    <div className="px-6 py-16 text-center max-w-sm mx-auto">
      <div
        className="size-14 rounded-full grid place-items-center mx-auto mb-5"
        style={{ background: colorMarca, color: 'white' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <polyline
            points="14 2 14 8 20 8"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2
        className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
        style={{ color: 'var(--color-ink)' }}
      >
        El menú se está actualizando.
      </h2>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        Llama al mesero para hacer tu pedido. Pronto el menú estará disponible
        aquí.
      </p>
    </div>
  );
}
