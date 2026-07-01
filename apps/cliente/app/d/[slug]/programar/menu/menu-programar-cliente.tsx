'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  agregarItem,
  actualizarCantidad,
  leerCarrito,
  calcularTotal,
  totalUnidades,
  type ItemCarrito,
} from '../../../../../lib/carrito';

export type DiaMenu = {
  fecha: string; // YYYY-MM-DD
  nombre: string; // "Lunes"
  corte: string; // "9:00 am"
  esHoy: boolean;
};

type ProductoMenu = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  disponible: boolean;
  imagenes_paths: string[];
};

export type GrupoMenu = {
  id: string;
  nombre: string;
  orden: number;
  productos: ProductoMenu[];
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANCHO_DER = 112;

/** Clave de carrito por dia: cada dia tiene su propio carrito. */
function claveDia(slug: string, fecha: string): string {
  return `${slug}::prog::${fecha}`;
}

/** "2026-06-30" -> "30 jun" */
function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mi = parseInt(m ?? '1', 10) - 1;
  return `${parseInt(d ?? '1', 10)} ${meses[mi] ?? ''}`;
}

/** Construye la URL publica de una foto a partir de su path en el bucket. */
function urlFoto(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/productos-fotos/${path}`;
}

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

function luminanciaRel(r: number, g: number, b: number): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (a[0] as number) + 0.7152 * (a[1] as number) + 0.0722 * (a[2] as number);
}

function colorPrecioLegible(colorMarca: string): string {
  const rgb = hexARgb(colorMarca);
  if (!rgb) return 'var(--color-ink)';
  const L = luminanciaRel(rgb[0], rgb[1], rgb[2]);
  const contraste = (1 + 0.05) / (L + 0.05);
  return contraste >= 3 ? colorMarca : 'var(--color-ink)';
}

export function MenuProgramarCliente({
  slug,
  nombreNegocio,
  colorMarca,
  logoUrl,
  dias,
  grupos,
}: {
  slug: string;
  nombreNegocio: string;
  colorMarca: string;
  logoUrl: string | null;
  dias: DiaMenu[];
  grupos: GrupoMenu[];
}) {
  const router = useRouter();
  const [diaActivo, setDiaActivo] = useState<string>(dias[0]?.fecha ?? '');
  const [carritos, setCarritos] = useState<Record<string, ItemCarrito[]>>({});
  const [cargando, setCargando] = useState(true);
  const [fotosModal, setFotosModal] = useState<ProductoMenu | null>(null);

  // Cargar el carrito de cada dia al montar.
  useEffect(() => {
    const inicial: Record<string, ItemCarrito[]> = {};
    for (const d of dias) inicial[d.fecha] = leerCarrito(claveDia(slug, d.fecha));
    setCarritos(inicial);
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carritoDia = carritos[diaActivo] ?? [];
  const precioColor = colorPrecioLegible(colorMarca);
  const diaActivoInfo = dias.find((d) => d.fecha === diaActivo);

  function cambiarCantidad(producto: ProductoMenu, nuevaCantidad: number) {
    const key = claveDia(slug, diaActivo);
    const yaEsta = carritoDia.some((i) => i.productoId === producto.id);
    let nuevo: ItemCarrito[];
    if (!yaEsta && nuevaCantidad > 0) {
      nuevo = agregarItem(key, {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        notas: null,
      });
    } else {
      nuevo = actualizarCantidad(key, producto.id, nuevaCantidad);
    }
    setCarritos((prev) => ({ ...prev, [diaActivo]: nuevo }));
  }

  // Totales sumando todos los dias.
  const totalGlobal = dias.reduce((acc, d) => acc + calcularTotal(carritos[d.fecha] ?? []), 0);
  const unidadesGlobal = dias.reduce((acc, d) => acc + totalUnidades(carritos[d.fecha] ?? []), 0);

  function continuar() {
    if (unidadesGlobal === 0) return;
    // Pasamos todos los dias elegidos; el checkout re-valida el corte y muestra
    // solo los que tienen productos.
    const fechas = dias.map((d) => d.fecha).join(',');
    router.push(`/d/${slug}/programar/checkout?dias=${fechas}`);
  }

  if (cargando) {
    return (
      <main className="min-h-screen grid place-items-center" style={{ background: 'var(--color-paper)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Cargando...
        </p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-paper)',
        paddingBottom: unidadesGlobal > 0 ? '5.5rem' : '1rem',
      }}
    >
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-sm"
        style={{ borderColor: 'var(--color-border)', background: 'rgba(250, 246, 241, 0.92)' }}
      >
        <div className="px-5 py-3 flex items-center gap-3">
          <Link
            href={`/d/${slug}/programar`}
            aria-label="Volver a elegir dias"
            className="size-9 grid place-items-center rounded-full shrink-0"
            style={{ color: 'var(--color-ink)', background: 'var(--color-paper-deep)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
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
          <h1
            className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate"
            style={{ color: 'var(--color-ink)' }}
          >
            {nombreNegocio}
          </h1>
        </div>

        {/* Pestanas de dia */}
        <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
          {dias.map((d) => {
            const activo = d.fecha === diaActivo;
            const unidades = totalUnidades(carritos[d.fecha] ?? []);
            return (
              <button
                key={d.fecha}
                type="button"
                onClick={() => setDiaActivo(d.fecha)}
                className="px-3.5 h-11 rounded-full text-xs whitespace-nowrap transition-all shrink-0 flex items-center gap-2"
                style={{
                  background: activo ? 'var(--color-ink)' : 'transparent',
                  color: activo ? 'var(--color-paper)' : 'var(--color-ink-soft)',
                  border: activo ? '1px solid var(--color-ink)' : '1px solid var(--color-border-strong)',
                }}
              >
                <span>
                  {d.nombre} {fechaCorta(d.fecha)}
                </span>
                {unidades > 0 ? (
                  <span
                    className="size-5 rounded-full grid place-items-center text-[0.65rem] font-medium tabular-nums"
                    style={{
                      background: activo ? 'rgba(255,255,255,0.25)' : colorMarca,
                      color: 'white',
                    }}
                  >
                    {unidades}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 px-5 pt-4">
        {/* Contexto del dia activo */}
        <div className="flex items-center gap-2 mb-4">
          <p className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
            Armando el pedido del{' '}
            <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
              {diaActivoInfo?.nombre} {diaActivoInfo ? fechaCorta(diaActivoInfo.fecha) : ''}
            </span>
          </p>
          {diaActivoInfo?.esHoy ? (
            <span
              className="text-[0.6rem] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
              style={{ background: colorMarca, color: 'white' }}
            >
              Hoy
            </span>
          ) : null}
        </div>

        {grupos.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm italic" style={{ color: 'var(--color-muted)' }}>
              El menu se esta actualizando. Intenta mas tarde.
            </p>
          </div>
        ) : (
          <div className="space-y-8 pt-1">
            {grupos.map((g) => (
              <section key={g.id}>
                <h2
                  className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {g.nombre}
                </h2>
                <ul className="space-y-2">
                  {g.productos.map((p) => {
                    const cantidad = carritoDia.find((i) => i.productoId === p.id)?.cantidad ?? 0;
                    return (
                      <ItemProducto
                        key={p.id}
                        producto={p}
                        colorMarca={colorMarca}
                        precioColor={precioColor}
                        cantidad={cantidad}
                        onCambiar={(c) => cambiarCantidad(p, c)}
                        onVerFotos={() => setFotosModal(p)}
                      />
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      {unidadesGlobal > 0 ? (
        <button
          type="button"
          onClick={continuar}
          className="fixed bottom-4 left-4 right-4 z-30 h-14 rounded-full flex items-center justify-between px-5 max-w-md mx-auto"
          style={{ background: colorMarca, color: 'white' }}
        >
          <span className="flex items-center gap-2.5">
            <span
              className="size-7 rounded-full grid place-items-center text-xs font-medium"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              {unidadesGlobal}
            </span>
            <span className="text-sm font-medium">Continuar</span>
          </span>
          <span className="font-[family-name:var(--font-mono)] text-sm">
            ${totalGlobal.toLocaleString('es-CO')}
          </span>
        </button>
      ) : null}

      {fotosModal ? <LightboxFotos producto={fotosModal} onCerrar={() => setFotosModal(null)} /> : null}
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
  producto: ProductoMenu;
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
      className="flex items-center justify-center rounded-full"
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
  producto: ProductoMenu;
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

        <div className="shrink-0 flex flex-col items-end gap-2" style={{ width: ANCHO_DER }}>
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

function LightboxFotos({ producto, onCerrar }: { producto: ProductoMenu; onCerrar: () => void }) {
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
