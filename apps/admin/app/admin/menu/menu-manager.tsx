'use client';

import { useActionState, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button, Field, Input, cn } from '@mesaya/ui';
import {
  agregarCategoria,
  renombrarCategoria,
  eliminarCategoria,
  agregarProducto,
  actualizarProducto,
  toggleDisponible,
  eliminarProducto,
  subirFotoProducto,
  eliminarFotoProducto,
  hacerFotoPrincipal,
  type CategoriaState,
  type ProductoState,
} from './actions';
import type { Categoria, Producto } from './page';

const initialCategoria: CategoriaState = { ok: false };
const initialProducto: ProductoState = { ok: false };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

/** Construye la URL publica de una foto a partir de su path en el bucket. */
function urlFoto(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/productos-fotos/${path}`;
}

/**
 * Comprime y redimensiona una imagen EN EL NAVEGADOR antes de subirla.
 * Reduce el lado mayor a maxLado px y exporta a WebP. Una foto de celular
 * de varios MB queda tipicamente en ~50-80KB, asi llega liviana al comensal.
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

/** Input de precio con formato colombiano. Visible: "$32.000". Hidden: "32000". */
function PrecioInput({ resetSignal }: { resetSignal: number }) {
  const [valorVisible, setValorVisible] = useState('');

  useEffect(() => {
    setValorVisible('');
  }, [resetSignal]);

  function formatear(num: string): string {
    const limpio = num.replace(/\D/g, '');
    if (!limpio) return '';
    return parseInt(limpio, 10).toLocaleString('es-CO');
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setValorVisible(formatear(e.target.value));
  }

  const valorNumerico = valorVisible.replace(/\D/g, '');

  return (
    <>
      <Input
        id="prod-precio"
        type="text"
        inputMode="numeric"
        placeholder="$8.000"
        value={valorVisible ? `$${valorVisible}` : ''}
        onChange={handleChange}
        autoComplete="off"
      />
      <input type="hidden" name="precio" value={valorNumerico} />
    </>
  );
}

export function MenuManager({
  categorias,
  productos,
  tabInicial,
}: {
  categorias: Categoria[];
  productos: Producto[];
  tabInicial: 'categorias' | 'productos';
}) {
  const [tab, setTab] = useState<'categorias' | 'productos'>(tabInicial);

  return (
    <div className="space-y-6">
      <Tabs
        activa={tab}
        onChange={setTab}
        totalCategorias={categorias.length}
        totalProductos={productos.length}
      />

      {tab === 'categorias' ? (
        <TabCategorias categorias={categorias} />
      ) : (
        <TabProductos categorias={categorias} productos={productos} />
      )}
    </div>
  );
}

function Tabs({
  activa,
  onChange,
  totalCategorias,
  totalProductos,
}: {
  activa: 'categorias' | 'productos';
  onChange: (t: 'categorias' | 'productos') => void;
  totalCategorias: number;
  totalProductos: number;
}) {
  return (
    <div
      className="inline-flex p-1 rounded-[var(--radius-lg)] border"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
    >
      <TabButton activa={activa === 'productos'} onClick={() => onChange('productos')}>
        Productos - {totalProductos}
      </TabButton>
      <TabButton activa={activa === 'categorias'} onClick={() => onChange('categorias')}>
        Categorias - {totalCategorias}
      </TabButton>
    </div>
  );
}

function TabButton({
  activa,
  onClick,
  children,
}: {
  activa: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 h-9 rounded-[var(--radius-md)] text-sm transition-colors',
        activa
          ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
          : 'text-[var(--color-ink-soft)] hover:bg-[var(--color-paper-deep)]',
      )}
    >
      {children}
    </button>
  );
}

/* ============ TAB CATEGORIAS ============ */

function TabCategorias({ categorias }: { categorias: Categoria[] }) {
  const [state, formAction, pending] = useActionState(agregarCategoria, initialCategoria);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);

  return (
    <div className="space-y-6">
      <form
        ref={formRef}
        action={formAction}
        className="rounded-[var(--radius-lg)] border p-5 flex items-end gap-3"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
      >
        <div className="flex-1">
          <Field id="cat-nombre" label="Nueva categoria" error={state.fieldErrors?.nombre}>
            <Input
              id="cat-nombre"
              name="nombre"
              type="text"
              placeholder="Ej: Postres"
              required
              maxLength={60}
            />
          </Field>
        </div>
        <Button type="submit" loading={pending}>
          Agregar
        </Button>
      </form>

      {categorias.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Aun no tienes categorias. Agrega la primera arriba.
          </p>
        </div>
      ) : (
        <ul
          className="rounded-[var(--radius-lg)] border divide-y"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-paper)',
          }}
        >
          {categorias.map((c) => (
            <ItemCategoria key={c.id} categoria={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ItemCategoria({ categoria }: { categoria: Categoria }) {
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(categoria.nombre);

  function guardar() {
    if (nombre.trim().length < 2) return;
    const fd = new FormData();
    fd.append('id', categoria.id);
    fd.append('nombre', nombre);
    void renombrarCategoria(fd);
    setEditando(false);
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        {editando ? (
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') guardar();
              if (e.key === 'Escape') {
                setNombre(categoria.nombre);
                setEditando(false);
              }
            }}
            onBlur={guardar}
            autoFocus
            className="w-full text-sm font-medium px-2 py-1 rounded border focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-sm font-medium hover:underline transition-colors"
            style={{ color: 'var(--color-ink)' }}
          >
            {categoria.nombre}
          </button>
        )}
      </div>
      <form action={eliminarCategoria}>
        <input type="hidden" name="id" value={categoria.id} />
        <button
          type="submit"
          aria-label={`Eliminar ${categoria.nombre}`}
          className={cn(
            'size-8 grid place-items-center rounded-[var(--radius-md)] transition-colors',
            'text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-paper-deep)]',
          )}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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

/* ============ TAB PRODUCTOS ============ */

function TabProductos({
  categorias,
  productos,
}: {
  categorias: Categoria[];
  productos: Producto[];
}) {
  const grupos: { categoria: Categoria; productos: Producto[] }[] = categorias.map((cat) => ({
    categoria: cat,
    productos: productos.filter((p) => p.categoria_id === cat.id),
  }));

  const huerfanos = productos.filter((p) => !categorias.some((c) => c.id === p.categoria_id));

  if (categorias.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--color-border-strong)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Necesitas crear al menos una categoria antes de agregar productos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FormularioAgregarProducto categorias={categorias} />

      {grupos.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Aun no tienes productos.
        </p>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <SeccionCategoria
              key={g.categoria.id}
              categoria={g.categoria}
              productos={g.productos}
              categorias={categorias}
            />
          ))}
          {huerfanos.length > 0 ? (
            <div>
              <h3
                className="text-xs uppercase tracking-[0.14em] mb-2 px-1"
                style={{ color: 'var(--color-danger)' }}
              >
                Sin categoria - {huerfanos.length}
              </h3>
              <ul
                className="rounded-[var(--radius-lg)] border divide-y"
                style={{
                  borderColor: 'var(--color-border)',
                  background: 'var(--color-paper)',
                }}
              >
                {huerfanos.map((p) => (
                  <ItemProducto key={p.id} producto={p} categorias={categorias} />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function FormularioAgregarProducto({ categorias }: { categorias: Categoria[] }) {
  const [state, formAction, pending] = useActionState(agregarProducto, initialProducto);
  const formRef = useRef<HTMLFormElement>(null);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
      setResetSignal((n) => n + 1);
    }
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[var(--radius-lg)] border p-5 space-y-4"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
    >
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
        Agregar producto
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field id="prod-nombre" label="Nombre" error={state.fieldErrors?.nombre}>
          <Input
            id="prod-nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Cappuccino"
            required
            maxLength={80}
          />
        </Field>
        <Field id="prod-precio" label="Precio (COP)" error={state.fieldErrors?.precio}>
          <PrecioInput resetSignal={resetSignal} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="prod-categoria"
            className="block text-sm font-medium mb-1.5"
            style={{ color: 'var(--color-ink)' }}
          >
            Categoria
          </label>
          <select
            id="prod-categoria"
            name="categoria_id"
            required
            defaultValue=""
            className="w-full h-10 px-3 rounded-[var(--radius-md)] border text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            style={{
              borderColor: 'var(--color-border-strong)',
              background: 'var(--color-paper)',
              color: 'var(--color-ink)',
            }}
          >
            <option value="" disabled>
              Elige...
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoria_id ? (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
              {state.fieldErrors.categoria_id}
            </p>
          ) : null}
        </div>
        <Field
          id="prod-tiempo"
          label="Tiempo preparacion (min, opcional)"
          error={state.fieldErrors?.tiempo_preparacion_min}
        >
          <Input
            id="prod-tiempo"
            name="tiempo_preparacion_min"
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            step={1}
            placeholder="Vacio = usa el global"
            autoComplete="off"
          />
        </Field>
      </div>
      <Field
        id="prod-descripcion"
        label="Descripcion (opcional)"
        error={state.fieldErrors?.descripcion}
      >
        <Input
          id="prod-descripcion"
          name="descripcion"
          type="text"
          placeholder="Ej: Doble shot de espresso con leche vaporizada."
          maxLength={200}
        />
      </Field>
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
          En que menus aparece?
        </label>
        <div className="flex flex-wrap gap-2">
          <CanalCheckbox name="canal_restaurante" label="Restaurante (mesa)" />
          <CanalCheckbox name="canal_domicilios_diarios" label="Domicilios diarios" />
          <CanalCheckbox name="canal_domicilios_programados" label="Domicilios programados" />
        </div>
      </div>
      {state.error ? (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {state.error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-3 flex-wrap">
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

function CanalCheckbox({ name, label }: { name: string; label: string }) {
  return (
    <label
      className="inline-flex items-center gap-2 px-3 h-9 rounded-[var(--radius-md)] border cursor-pointer text-sm select-none [&:has(input:checked)]:border-[var(--color-ink)]"
      style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink-soft)' }}
    >
      <input
        type="checkbox"
        name={name}
        defaultChecked
        className="size-4 accent-[var(--color-ink)]"
      />
      {label}
    </label>
  );
}

function SeccionCategoria({
  categoria,
  productos,
  categorias,
}: {
  categoria: Categoria;
  productos: Producto[];
  categorias: Categoria[];
}) {
  return (
    <section>
      <h3
        className="text-xs uppercase tracking-[0.14em] mb-2 px-1"
        style={{ color: 'var(--color-muted)' }}
      >
        {categoria.nombre} - {productos.length}
      </h3>
      {productos.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border border-dashed p-4 text-xs text-center"
          style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-muted)' }}
        >
          Sin productos en esta categoria.
        </div>
      ) : (
        <ul
          className="rounded-[var(--radius-lg)] border divide-y"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
        >
          {productos.map((p) => (
            <ItemProducto key={p.id} producto={p} categorias={categorias} />
          ))}
        </ul>
      )}
    </section>
  );
}

/* ============ FOTOS DE UN PRODUCTO ============ */

function FotosProducto({ producto }: { producto: Producto }) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir.');
    } finally {
      setSubiendo(false);
    }
  }

  function quitar(path: string) {
    const fd = new FormData();
    fd.append('id', producto.id);
    fd.append('path', path);
    void eliminarFotoProducto(fd);
  }

  function hacerPrincipal(path: string) {
    const fd = new FormData();
    fd.append('id', producto.id);
    fd.append('path', path);
    void hacerFotoPrincipal(fd);
  }

  const sinFotos = fotos.length === 0;

  return (
    <div className="pt-2">
      <p
        className="text-[11px] uppercase tracking-[0.12em] mb-2"
        style={{ color: 'var(--color-muted)' }}
      >
        Fotos del plato - opcional, max. 2
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

function CanalesProducto({ producto }: { producto: Producto }) {
  function toggle(campo: string, actual: boolean) {
    const fd = new FormData();
    fd.append('id', producto.id);
    fd.append('campo', campo);
    fd.append('valor', (!actual).toString());
    void actualizarProducto(fd);
  }

  const chips = [
    { campo: 'canal_restaurante', label: 'Mesa', on: producto.canal_restaurante },
    {
      campo: 'canal_domicilios_diarios',
      label: 'Domi. diario',
      on: producto.canal_domicilios_diarios,
    },
    {
      campo: 'canal_domicilios_programados',
      label: 'Domi. programado',
      on: producto.canal_domicilios_programados,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
      <span
        className="text-[11px] uppercase tracking-[0.1em]"
        style={{ color: 'var(--color-muted)' }}
      >
        Menus:
      </span>
      {chips.map((c) => (
        <button
          key={c.campo}
          type="button"
          onClick={() => toggle(c.campo, c.on)}
          className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
          style={
            c.on
              ? {
                  background: 'var(--color-ink)',
                  color: 'var(--color-paper)',
                  borderColor: 'var(--color-ink)',
                }
              : {
                  background: 'transparent',
                  color: 'var(--color-muted)',
                  borderColor: 'var(--color-border-strong)',
                }
          }
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

function ItemProducto({ producto, categorias }: { producto: Producto; categorias: Categoria[] }) {
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombre, setNombre] = useState(producto.nombre);
  const [editandoPrecio, setEditandoPrecio] = useState(false);
  const [precio, setPrecio] = useState(producto.precio.toString());
  const [editandoTiempo, setEditandoTiempo] = useState(false);
  const [tiempo, setTiempo] = useState(
    producto.tiempo_preparacion_min !== null ? producto.tiempo_preparacion_min.toString() : '',
  );

  function guardarCampo(campo: 'nombre' | 'precio' | 'tiempo_preparacion_min', valor: string) {
    const fd = new FormData();
    fd.append('id', producto.id);
    fd.append('campo', campo);
    fd.append('valor', valor);
    void actualizarProducto(fd);
  }

  function cambiarCategoria(e: React.ChangeEvent<HTMLSelectElement>) {
    const fd = new FormData();
    fd.append('id', producto.id);
    fd.append('campo', 'categoria_id');
    fd.append('valor', e.target.value);
    void actualizarProducto(fd);
  }

  function commitTiempo() {
    const raw = tiempo.trim();
    if (raw === '') {
      guardarCampo('tiempo_preparacion_min', '');
    } else {
      const n = parseInt(raw, 10);
      if (Number.isNaN(n) || n < 1 || n > 240) {
        setTiempo(
          producto.tiempo_preparacion_min !== null
            ? producto.tiempo_preparacion_min.toString()
            : '',
        );
        setEditandoTiempo(false);
        return;
      }
      guardarCampo('tiempo_preparacion_min', raw);
    }
    setEditandoTiempo(false);
  }

  return (
    <li className={cn('flex items-start gap-3 px-4 py-3', !producto.disponible && 'opacity-60')}>
      <div className="flex-1 min-w-0 space-y-1">
        {editandoNombre ? (
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => {
              if (nombre.trim().length >= 2) guardarCampo('nombre', nombre);
              else setNombre(producto.nombre);
              setEditandoNombre(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setNombre(producto.nombre);
                setEditandoNombre(false);
              }
            }}
            autoFocus
            className="w-full text-sm font-medium px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditandoNombre(true)}
            className="text-sm font-medium hover:underline text-left"
            style={{ color: 'var(--color-ink)' }}
          >
            {producto.nombre}
          </button>
        )}

        {producto.descripcion ? (
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {producto.descripcion}
          </p>
        ) : null}

        <div className="flex items-center gap-3 pt-0.5 flex-wrap">
          {editandoPrecio ? (
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              onBlur={() => {
                const num = parseInt(precio, 10);
                if (!Number.isNaN(num) && num >= 0) guardarCampo('precio', precio);
                else setPrecio(producto.precio.toString());
                setEditandoPrecio(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setPrecio(producto.precio.toString());
                  setEditandoPrecio(false);
                }
              }}
              autoFocus
              className="w-24 text-xs px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditandoPrecio(true)}
              className="text-xs hover:underline font-[family-name:var(--font-mono)]"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              ${producto.precio.toLocaleString('es-CO')}
            </button>
          )}

          {editandoTiempo ? (
            <input
              type="number"
              value={tiempo}
              onChange={(e) => setTiempo(e.target.value)}
              onBlur={commitTiempo}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setTiempo(
                    producto.tiempo_preparacion_min !== null
                      ? producto.tiempo_preparacion_min.toString()
                      : '',
                  );
                  setEditandoTiempo(false);
                }
              }}
              placeholder="vacio = global"
              autoFocus
              className="w-28 text-xs px-2 py-0.5 rounded border focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditandoTiempo(true)}
              className="text-xs hover:underline"
              style={{
                color:
                  producto.tiempo_preparacion_min !== null
                    ? 'var(--color-ink-soft)'
                    : 'var(--color-muted)',
              }}
              title="Tiempo de preparacion (opcional)"
            >
              {producto.tiempo_preparacion_min !== null
                ? `${producto.tiempo_preparacion_min} min`
                : '- min'}
            </button>
          )}

          <select
            value={producto.categoria_id}
            onChange={cambiarCategoria}
            className="text-xs px-2 py-0.5 rounded border bg-transparent focus:outline-none focus:ring-1 focus:ring-[var(--color-ink)]"
            style={{
              borderColor: 'var(--color-border)',
              color: 'var(--color-ink-soft)',
            }}
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <CanalesProducto producto={producto} />

        <FotosProducto producto={producto} />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <form action={toggleDisponible}>
          <input type="hidden" name="id" value={producto.id} />
          <input type="hidden" name="disponible" value={producto.disponible ? 'false' : 'true'} />
          <button
            type="submit"
            className={cn(
              'text-xs px-3 h-8 rounded-[var(--radius-md)] border transition-colors',
              'hover:bg-[var(--color-paper-deep)]',
            )}
            style={{
              borderColor: 'var(--color-border-strong)',
              color: producto.disponible ? 'var(--color-ink-soft)' : 'var(--color-danger)',
            }}
          >
            {producto.disponible ? 'Disponible' : 'Sin stock'}
          </button>
        </form>

        <form action={eliminarProducto}>
          <input type="hidden" name="id" value={producto.id} />
          <button
            type="submit"
            aria-label={`Eliminar ${producto.nombre}`}
            className={cn(
              'size-8 grid place-items-center rounded-[var(--radius-md)] transition-colors',
              'text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-paper-deep)]',
            )}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
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
      </div>
    </li>
  );
}
