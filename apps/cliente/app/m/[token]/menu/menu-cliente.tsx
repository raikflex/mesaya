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
  imagenes_paths: string[];
};

type Grupo = {
  id: string;
  nombre: string;
  orden: number;
  productos: Producto[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

// Ancho fijo de la columna derecha (foto + control). Asi todo queda alineado,
// tenga el producto foto o no.
const ANCHO_DER = 112;

/** Construye la URL publica de una foto a partir de su path en el bucket. */
function urlFoto(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/productos-fotos/${path}`;
}

/** Convierte un hex (#rgb o #rrggbb) a [r,g,b]. Null si no es valido. */
function hexARgb(hex: string): [number, number, number] | null {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminancia relativa (WCAG) de un color. */
function luminanciaRel(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (a[0] as number) + 0.7152 * (a[1] as number) + 0.0722 * (a[2] as number);
}

/**
 * Devuelve el color de marca si contrasta bien sobre fondo blanco (la tarjeta),
 * o cae a tinta oscura si la marca es muy clara. Asi el precio siempre es legible.
 */
function colorPrecioLegible(colorMarca: string): string {
  const rgb = hexARgb(colorMarca);
  if (!rgb) return 'var(--color-ink)';
  const L = luminanciaRel(rgb[0], rgb[1], rgb[2]);
  const contraste = (1 + 0.05) / (L + 0.05); // blanco tiene luminancia 1
  return contraste >= 3 ? colorMarca : 'var(--color-ink)';
}

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
  const [fotosModal, setFotosModal] = useState<Producto | null>(null);
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

  // Cambiar la cantidad de un producto en el carrito. Si el producto es nuevo
  // (no estaba en el carrito), lo construye con sus datos antes de guardar.
  function cambiarCantidad(producto: Producto, nuevaCantidad: number) {
    const actualizado = actualizarCantidad(qrToken, producto.id, nuevaCantidad);
    if (nuevaCantidad > 0 && !actualizado.find((i) => i.productoId === producto.id)) {
      const conNuevo: ItemCarrito[] = [
        ...actualizado,
        {
          productoId: producto.id,
          nombre: producto.nombre,
          precio: producto.precio,
          cantidad: nuevaCantidad,
          notas: null,
          agregadoEn: Date.now(),
        },
      ];
      guardarCarrito(qrToken, conNuevo);
      setCarrito(conNuevo);
    } else {
      setCarrito(actualizado);
    }
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
  const precioColor = colorPrecioLegible(colorMarca);

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
                          precioColor={precioColor}
                          cantidad={enCarrito?.cantidad ?? 0}
                          onCambiar={(nuevaCantidad) => cambiarCantidad(p, nuevaCantidad)}
                          onVerFotos={() => setFotosModal(p)}
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

      {fotosModal ? (
        <LightboxFotos producto={fotosModal} onCerrar={() => setFotosModal(null)} />
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

/**
 * Control de cantidad. Colapsado (cantidad 0) es un boton "+" circular alineado
 * a la derecha; expandido es una pildora del ancho de la columna con - / n / +.
 */
function ControlCantidad({
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
  if (cantidad === 0) {
    return (
      <button
        type="button"
        onClick={() => onCambiar(1)}
        aria-label={`Agregar ${producto.nombre}`}
        className="size-9 rounded-full grid place-items-center"
        style={{ background: colorMarca, color: 'white' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full
      "
      style={{ width: '100%', border: `1px solid ${colorMarca}` }}
    >
      <button
        type="button"
        onClick={() => onCambiar(cantidad - 1)}
        aria-label={`Quitar uno de ${producto.nombre}`}
        className="size-9 rounded-full grid place-items-center"
        style={{ color: colorMarca, transition: 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <span
        className="flex-1 text-center text-sm font-medium tabular-nums"
        style={{ color: 'var(--color-ink)' }}
      >
        {cantidad}
      </span>
      <button
        type="button"
        onClick={() => onCambiar(cantidad + 1)}
        disabled={cantidad >= 20}
        aria-label={`Agregar uno de ${producto.nombre}`}
        className="size-9 rounded-full grid place-items-center disabled:opacity-40"
        style={{ background: colorMarca, color: 'white', transition: 'none' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function ItemProducto({
  producto,
  colorMarca,
  precioColor,
  cantidad,
  onCambiar,
  onVerFotos,
}: {
  producto: Producto;
  colorMarca: string;
  precioColor: string;
  cantidad: number;
  onCambiar: (nuevaCantidad: number) => void;
  onVerFotos: () => void;
}) {
  const sinStock = !producto.disponible;
  const fotos = producto.imagenes_paths ?? [];
  const tieneFoto = fotos.length > 0;

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
              className="text-lg font-medium leading-tight"
              style={{
                color: 'var(--color-ink)',
                textDecoration: sinStock ? 'line-through' : 'none',
              }}
            >
              {producto.nombre}
            </p>
            {sinStock ? (
              <span
                className="text-xs uppercase tracking-[0.1em] px-1.5 py-0.5 rounded shrink-0"
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
            className="text-xl mt-2 font-semibold font-[family-name:var(--font-mono)]"
            style={{ color: precioColor }}
          >
            ${producto.precio.toLocaleString('es-CO')}
          </p>
        </div>

        {/* Columna derecha de ancho fijo: foto (si hay) arriba, control debajo.
            Alineada a la derecha para que todo quede parejo entre productos. */}
        <div
          className="shrink-0 flex flex-col items-end gap-2"
          style={{ width: ANCHO_DER }}
        >
          {tieneFoto ? (
            <button
              type="button"
              onClick={onVerFotos}
              aria-label={`Ver foto de ${producto.nombre}`}
              className="relative rounded-[var(--radius-md)] overflow-hidden"
              style={{ width: ANCHO_DER, height: ANCHO_DER }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlFoto(fotos[0] as string)}
                alt={producto.nombre}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <span
                className="absolute bottom-1 right-1 size-5 grid place-items-center rounded-full"
                style={{ background: 'rgba(0,0,0,0.55)', color: 'white' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </button>
          ) : null}

          {!sinStock ? (
            <ControlCantidad
              producto={producto}
              colorMarca={colorMarca}
              cantidad={cantidad}
              onCambiar={onCambiar}
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

function LightboxFotos({ producto, onCerrar }: { producto: Producto; onCerrar: () => void }) {
  const fotos = producto.imagenes_paths ?? [];
  const total = fotos.length;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCerrar();
    }
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onCerrar]);

  if (total === 0) return null;
  const seguro = Math.max(0, Math.min(idx, total - 1));

  return (
    <div
      onClick={onCerrar}
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '1.25rem',
      }}
    >
      <button
        type="button"
        onClick={onCerrar}
        aria-label="Cerrar"
        style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          width: 40,
          height: 40,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.15)',
          color: 'white',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '1rem' }}
      >
        <div style={{ position: 'relative' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={urlFoto(fotos[seguro] as string)}
            alt={producto.nombre}
            style={{
              width: '100%',
              maxHeight: '60vh',
              objectFit: 'contain',
              borderRadius: 14,
              background: 'rgba(255,255,255,0.04)',
            }}
          />
          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setIdx((seguro - 1 + total) % total)}
                aria-label="Anterior"
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '999px',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setIdx((seguro + 1) % total)}
                aria-label="Siguiente"
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 36,
                  height: 36,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '999px',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <div
                style={{
                  position: 'absolute',
                  bottom: 10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 6,
                }}
              >
                {fotos.map((p, i) => (
                  <span
                    key={p}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '999px',
                      background: i === seguro ? 'white' : 'rgba(255,255,255,0.4)',
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div style={{ color: 'white' }}>
          <p style={{ fontSize: '1.05rem', fontWeight: 600 }}>{producto.nombre}</p>
          {producto.descripcion ? (
            <p
              style={{
                fontSize: '0.85rem',
                marginTop: 4,
                color: 'rgba(255,255,255,0.75)',
                lineHeight: 1.5,
              }}
            >
              {producto.descripcion}
            </p>
          ) : null}
          <p style={{ fontSize: '0.95rem', marginTop: 8, fontFamily: 'var(--font-mono)' }}>
            ${producto.precio.toLocaleString('es-CO')}
          </p>
        </div>
      </div>
    </div>
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
