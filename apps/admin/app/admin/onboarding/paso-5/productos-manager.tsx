'use client';

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, cn } from '@mesaya/ui';
import { agregarProducto, avanzarAPaso6, borrarProducto, type AddProductoState } from './actions';
import {
  subirFotoProducto,
  eliminarFotoProducto,
  hacerFotoPrincipal,
} from '../../menu/actions';

type Producto = {
  id: string;
  nombre: string;
  precio: number;
  descripcion: string | null;
  categoria_id: string;
  disponible: boolean;
  orden: number;
  imagenes_paths: string[];
};

type Categoria = {
  id: string;
  nombre: string;
};

const initialAdd: AddProductoState = { ok: false };

const MIN_PARA_AVANZAR = 1; // S2.2 deja en 1; S2.3 sube a 5 cuando esté reorder + edicion.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/** Construye la URL publica de una foto a partir de su path en el bucket. */
function urlFoto(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/productos-fotos/${path}`;
}

/**
 * Comprime y redimensiona una imagen EN EL NAVEGADOR antes de subirla.
 * Reduce el lado mayor a maxLado px y exporta a WebP (~50-80KB tipico).
 */
async function comprimirImagen(file: File, maxLado = 800, calidad = 0.75): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * escala));
  const h = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  if (typeof bitmap.close === 'function') bitmap.close();
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo comprimir la imagen.'))),
      'image/webp',
      calidad,
    );
  });
}

export function ProductosManager({
  productos,
  categorias,
}: {
  productos: Producto[];
  categorias: Categoria[];
}) {
  const total = productos.length;
  const puedeAvanzar = total >= MIN_PARA_AVANZAR;
  const categoriasMap = new Map(categorias.map((c) => [c.id, c.nombre]));

  return (
    <div className="space-y-8">
      <FormularioAgregar categorias={categorias} />

      <Lista productos={productos} categoriasMap={categoriasMap} />

      <div className="pt-2 flex items-center justify-between gap-4 flex-wrap border-t border-[var(--color-border)] mt-2">
        <p className="text-xs pt-4" style={{ color: 'var(--color-muted)' }}>
          {total === 0
            ? 'Agrega al menos un producto para continuar.'
            : `${total} producto${total === 1 ? '' : 's'}. Te quedan 3 pasos.`}
        </p>
        <form action={avanzarAPaso6} className="pt-4">
          <Button type="submit" size="lg" disabled={!puedeAvanzar}>
            Siguiente · Mesas
            <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}

function FormularioAgregar({ categorias }: { categorias: Categoria[] }) {
  const [state, formAction, pending] = useActionState(agregarProducto, initialAdd);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
      const input = formRef.current.querySelector<HTMLInputElement>('input[name="nombre"]');
      input?.focus();
    }
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[var(--radius-lg)] border p-5 space-y-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
    >
      <div className="grid sm:grid-cols-[1fr_140px] gap-4">
        <Field id="nombre" label="Nombre del producto" error={state.fieldErrors?.nombre}>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            required
            autoFocus
            placeholder="Ej: Bandeja paisa"
            maxLength={80}
          />
        </Field>

        <Field id="precio" label="Precio (COP)" error={state.fieldErrors?.precio}>
          <Input
            id="precio"
            name="precio"
            type="text"
            inputMode="numeric"
            required
            placeholder="32000"
            maxLength={7}
          />
        </Field>
      </div>

      <Field id="categoria_id" label="Categoría" error={state.fieldErrors?.categoria_id}>
        <select
          id="categoria_id"
          name="categoria_id"
          required
          defaultValue=""
          className={cn(
            'w-full h-11 rounded-[var(--radius-md)] border px-3 text-sm',
            'bg-[var(--color-paper)] text-[var(--color-ink)]',
            'border-[var(--color-border-strong)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-ink)]',
            'focus:border-[var(--color-ink)]',
          )}
        >
          <option value="" disabled>
            Selecciona una categoría
          </option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </Field>

      <Field
        id="descripcion"
        label="Descripción"
        hint="Opcional. Una línea, máximo 200 caracteres."
        error={state.fieldErrors?.descripcion}
      >
        <Input
          id="descripcion"
          name="descripcion"
          type="text"
          placeholder="Ej: Frijoles, arroz, carne, chicharrón, huevo, plátano y aguacate"
          maxLength={200}
        />
      </Field>

      {state.error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
          style={{
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            background: 'var(--color-accent-soft)',
          }}
        >
          {state.error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--color-muted)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
            <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
            <path
              d="m4 17 4.5-4.5 3 3L16 11l4 4.5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Despues de crear el plato podras agregarle fotos.
        </p>
        <Button type="submit" loading={pending}>
          Agregar producto
        </Button>
      </div>
    </form>
  );
}

function Lista({
  productos,
  categoriasMap,
}: {
  productos: Producto[];
  categoriasMap: Map<string, string>;
}) {
  if (productos.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--color-border-strong)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Aún no has agregado productos. Llena el formulario de arriba.
        </p>
      </div>
    );
  }

  // Agrupar por categoría
  const porCategoria = new Map<string, Producto[]>();
  for (const p of productos) {
    const arr = porCategoria.get(p.categoria_id) ?? [];
    arr.push(p);
    porCategoria.set(p.categoria_id, arr);
  }

  return (
    <div className="space-y-6">
      {Array.from(porCategoria.entries()).map(([catId, prods]) => (
        <section key={catId}>
          <h3
            className="text-xs uppercase tracking-[0.14em] mb-2 px-1"
            style={{ color: 'var(--color-muted)' }}
          >
            {categoriasMap.get(catId) ?? 'Sin categoría'}
          </h3>
          <ul
            className="rounded-[var(--radius-lg)] border divide-y"
            style={{
              borderColor: 'var(--color-border)',
              background: 'var(--color-paper)',
            }}
          >
            {prods.map((p) => (
              <ItemProducto key={p.id} producto={p} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ============ FOTOS DE UN PRODUCTO ============ */

function FotosProducto({ producto }: { producto: Producto }) {
  const router = useRouter();
  const fotos = producto.imagenes_paths ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSeleccion(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar el mismo archivo
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Solo imagenes.');
      return;
    }
    setError(null);
    setSubiendo(true);
    try {
      const blob = await comprimirImagen(file);
      const fd = new FormData();
      fd.append('id', producto.id);
      fd.append('foto', blob, 'foto.webp');
      const res = await subirFotoProducto(fd);
      if (!res.ok) setError(res.error ?? 'No se pudo subir.');
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir.');
    } finally {
      setSubiendo(false);
    }
  }

  async function quitar(path: string) {
    const fd = new FormData();
    fd.append('id', producto.id);
    fd.append('path', path);
    await eliminarFotoProducto(fd);
    router.refresh();
  }

  async function hacerPrincipal(path: string) {
    const fd = new FormData();
    fd.append('id', producto.id);
    fd.append('path', path);
    await hacerFotoPrincipal(fd);
    router.refresh();
  }

  const sinFotos = fotos.length === 0;

  return (
    <div className="pt-2">
      <p
        className="text-[11px] uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--color-muted)' }}
      >
        Fotos del plato — opcional, max. 2
      </p>

      <div className="flex items-center gap-3 flex-wrap">
        {fotos.map((path, i) => (
          <div key={path} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urlFoto(path)}
              alt={`Foto de ${producto.nombre}`}
              loading="lazy"
              className="size-14 rounded-[var(--radius-md)] object-cover border"
              style={{ borderColor: 'var(--color-border-strong)' }}
            />
            {i === 0 ? (
              <span
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] leading-none px-1.5 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
              >
                Principal
              </span>
            ) : (
              <button
                type="button"
                onClick={() => hacerPrincipal(path)}
                title="Hacer principal"
                aria-label="Hacer foto principal"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] leading-none px-1.5 py-0.5 rounded-full border whitespace-nowrap transition-colors hover:bg-[var(--color-paper-deep)]"
                style={{
                  background: 'var(--color-paper)',
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-ink-soft)',
                }}
              >
                Hacer principal
              </button>
            )}
            <button
              type="button"
              onClick={() => quitar(path)}
              aria-label="Quitar foto"
              className="absolute -top-1.5 -right-1.5 size-5 grid place-items-center rounded-full"
              style={{ background: 'var(--color-danger)', color: 'white' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        ))}

        {fotos.length < 2 ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onSeleccion}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className={cn(
                'inline-flex items-center gap-2 h-14 rounded-[var(--radius-md)] border border-dashed text-sm font-medium transition-colors',
                'hover:bg-[var(--color-paper-deep)] disabled:opacity-50',
                sinFotos ? 'px-4' : 'px-3',
              )}
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-soft)' }}
            >
              {subiendo ? (
                <span style={{ color: 'var(--color-muted)' }}>Subiendo...</span>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
                    <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                    <path
                      d="m4 17 4.5-4.5 3 3L16 11l4 4.5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path d="M19 3v4M21 5h-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                  </svg>
                  {sinFotos ? 'Agregar foto del plato' : 'Agregar otra'}
                </>
              )}
            </button>
          </>
        ) : null}

        {error ? (
          <span className="text-[11px]" style={{ color: 'var(--color-danger)' }}>
            {error}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ItemProducto({ producto }: { producto: Producto }) {
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-base font-medium truncate" style={{ color: 'var(--color-ink)' }}>
            {producto.nombre}
          </p>
          <p
            className="text-sm shrink-0 font-[family-name:var(--font-mono)]"
            style={{ color: 'var(--color-ink)' }}
          >
            ${formatPrecio(producto.precio)}
          </p>
        </div>
        {producto.descripcion ? (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {producto.descripcion}
          </p>
        ) : null}

        <FotosProducto producto={producto} />
      </div>

      <form action={borrarProducto} className="shrink-0">
        <input type="hidden" name="id" value={producto.id} />
        <button
          type="submit"
          aria-label={`Borrar ${producto.nombre}`}
          className={cn(
            'size-9 grid place-items-center rounded-[var(--radius-md)] transition-colors',
            'text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-paper-deep)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </li>
  );
}

function formatPrecio(n: number): string {
  return n.toLocaleString('es-CO');
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
