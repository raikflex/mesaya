'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@mesaya/database/client';
import {
  borrarSesionCliente,
  leerSesionCliente,
  limpiarUltimaComandaId,
} from '../../../../lib/cliente-session';
import {
  actualizarCantidad,
  calcularTotal,
  guardarCarrito,
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
  logoUrl,
  grupos,
  totalProductos,
}: {
  qrToken: string;
  numeroMesa: string;
  nombreNegocio: string;
  colorMarca: string;
  logoUrl: string | null;
  grupos: Grupo[];
  totalProductos: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [nombre, setNombre] = useState<string | null>(null);
  // Si el cliente ya envio al menos una comanda en esta sesion, su id queda
  // guardado en sessionStorage. Lo usamos para mostrar un boton "Mi cuenta"
  // que lo lleva al resumen de pedidos enviados.
  const [ultimaComandaId, setUltimaComandaId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const seccionesRef = useRef<Record<string, HTMLElement | null>>({});
  const tabsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sesion = leerSesionCliente(qrToken);
    if (!sesion) {
      router.replace(`/m/${qrToken}`);
      return;
    }
    setNombre(sesion.nombre);
    setUltimaComandaId(sesion.ultimaComandaId ?? null);
    setCarrito(leerCarrito(qrToken));
    setCargando(false);

    // Si hay una ultimaComandaId guardada, verificar en BD que no fue
    // cancelada. Si lo fue, limpiamos del sessionStorage para que no
    // aparezca el banner "Tienes pedidos en curso" mintiendo.
    if (!sesion.ultimaComandaId) return;

    let cancelado = false;
    const supabase = createClient();
    supabase
      .from('comandas')
      .select('estado')
      .eq('id', sesion.ultimaComandaId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelado) return;
        if (!data || data.estado === 'cancelada') {
          limpiarUltimaComandaId(qrToken);
          setUltimaComandaId(null);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [qrToken, router]);

  useEffect(() => {
    const agregado = searchParams.get('agregado');
    if (!agregado) return;

    setToast(decodeURIComponent(agregado));
    setCarrito(leerCarrito(qrToken));

    const url = new URL(window.location.href);
    url.searchParams.delete('agregado');
    window.history.replaceState(null, '', url.toString());

    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [searchParams, qrToken]);

  useEffect(() => {
    if (!categoriaActiva && grupos.length > 0 && grupos[0]) {
      setCategoriaActiva(grupos[0].id);
    }
  }, [grupos, categoriaActiva]);

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

  useEffect(() => {
    if (!categoriaActiva || !tabsRef.current) return;
    const activa = tabsRef.current.querySelector<HTMLElement>(`[data-tab-id="${categoriaActiva}"]`);
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

  function irAlCarrito() {
    router.push(`/m/${qrToken}/menu/carrito`);
  }

  // Cambia la cantidad de un producto en el carrito desde los botones +/-.
  // Si el producto no estaba, lo agrega con sus datos (snapshot de precio/nombre).
  function cambiarCantidad(producto: Producto, nuevaCantidad: number) {
    const yaEsta = carrito.some((i) => i.productoId === producto.id);
    if (yaEsta) {
      const actualizado = actualizarCantidad(qrToken, producto.id, nuevaCantidad);
      setCarrito(actualizado);
      return;
    }
    // Producto nuevo: lo construimos y guardamos.
    if (nuevaCantidad <= 0) return;
    const conNuevo: ItemCarrito[] = [
      ...carrito,
      {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: Math.min(20, nuevaCantidad),
        notas: null,
        agregadoEn: Date.now(),
      },
    ];
    guardarCarrito(qrToken, conNuevo);
    setCarrito(conNuevo);
  }

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
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.92)',
        }}
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
            ) : null}
            <div className="min-w-0 flex-1">
              <p
                className="text-xs uppercase tracking-[0.14em]"
                style={{ color: 'var(--color-muted)' }}
              >
                Mesa {numeroMesa} - Hola, {nombre}
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

          {ultimaComandaId ? (
            <Link
              href={`/m/${qrToken}/menu/enviada/${ultimaComandaId}`}
              className="mt-2 flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--radius-md)] border"
              style={{
                borderColor: colorMarca,
                background: 'white',
              }}
            >
              <span className="flex items-center gap-2 min-w-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  style={{ color: colorMarca, flexShrink: 0 }}
                >
                  <path
                    d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-xs truncate" style={{ color: 'var(--color-ink)' }}>
                  Tienes pedidos en curso
                </span>
              </span>
              <span className="text-xs font-medium shrink-0" style={{ color: colorMarca }}>
                Ver mi cuenta
              </span>
            </Link>
          ) : null}
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
                  <p className="text-sm py-4 italic" style={{ color: 'var(--color-muted)' }}>
                    Pronto hay novedades aqui.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {g.productos.map((p) => {
                      const enCarrito = carrito.find((i) => i.productoId === p.id);
                      return (
                        <ItemProducto
                          key={p.id}
                          producto={p}
                          colorMarca={colorMarca}
                          cantidad={enCarrito?.cantidad ?? 0}
                          onCambiar={(nuevaCantidad) => cambiarCantidad(p, nuevaCantidad)}
                        />
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>

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
            <span className="text-sm font-medium">Ver mi pedido</span>
          </span>
          <span className="font-[family-name:var(--font-mono)] text-sm">
            ${totalCarrito.toLocaleString('es-CO')}
          </span>
        </button>
      ) : null}

      {carrito.length === 0 ? (
        <footer className="py-6 text-center mt-4">
          <p
            className="text-xs uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-muted)' }}
          >
            Servido con <span style={{ color: 'var(--color-ink)' }}>EnPura</span>
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
  cantidad,
  onCambiar,
}: {
  producto: Producto;
  colorMarca: string;
  cantidad: number;
  onCambiar: (nuevaCantidad: number) => void;
}) {
  const sinStock = !producto.disponible;

  return (
    <li
      className="rounded-[var(--radius-lg)] border bg-white"
      style={{
        borderColor: cantidad > 0 ? colorMarca : 'var(--color-border)',
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

        {sinStock ? null : cantidad === 0 ? (
          <button
            type="button"
            onClick={() => onCambiar(1)}
            aria-label={`Agregar ${producto.nombre}`}
            className="size-9 rounded-full grid place-items-center shrink-0 mt-0.5 transition-transform active:scale-90"
            style={{ background: colorMarca, color: 'white' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        ) : (
          <div
            className="flex items-center gap-1 shrink-0 mt-0.5 rounded-full"
            style={{ border: `1px solid ${colorMarca}` }}
          >
            <button
              type="button"
              onClick={() => onCambiar(cantidad - 1)}
              aria-label={`Quitar uno de ${producto.nombre}`}
              className="size-9 rounded-full grid place-items-center transition-transform active:scale-90"
              style={{ color: colorMarca }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <span
              className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums"
              style={{ color: 'var(--color-ink)' }}
            >
              {cantidad}
            </span>
            <button
              type="button"
              onClick={() => onCambiar(cantidad + 1)}
              disabled={cantidad >= 20}
              aria-label={`Agregar uno de ${producto.nombre}`}
              className="size-9 rounded-full grid place-items-center transition-transform active:scale-90 disabled:opacity-40"
              style={{ background: colorMarca, color: 'white' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>
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
        El menu se esta actualizando.
      </h2>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
        Llama al mesero para hacer tu pedido. Pronto el menu estara disponible aqui.
      </p>
    </div>
  );
}
