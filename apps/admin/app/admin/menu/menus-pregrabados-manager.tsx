'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import {
  crearMenuPregrabado,
  renombrarMenuPregrabado,
  eliminarMenuPregrabado,
  toggleMenuActivo,
  agregarProductoAMenu,
  quitarProductoDeMenu,
  type MenuPregrabadoState,
} from './menus-pregrabados-actions';

export type ProductoOpcion = { id: string; nombre: string; precio: number };
export type MenuPregrabado = {
  id: string;
  nombre: string;
  canal: string;
  activo: boolean;
  productoIds: string[];
};

const initialCrear: MenuPregrabadoState = { ok: false };

const CANAL_LABEL: Record<string, string> = {
  restaurante: 'Restaurante (mesa)',
  domicilios_diarios: 'Domicilios diarios',
  domicilios_programados: 'Domicilios programados',
};

const estiloInput = {
  borderColor: 'var(--color-border-strong)',
  color: 'var(--color-ink)',
  background: 'white',
};

export function MenusPregrabadosManager({
  productos,
  menus,
}: {
  productos: ProductoOpcion[];
  menus: MenuPregrabado[];
}) {
  const [abierto, setAbierto] = useState(false);
  const activos = menus.filter((m) => m.activo).length;

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <h2
            className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em]"
            style={{ color: 'var(--color-ink)' }}
          >
            Menus pregrabados
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {menus.length === 0
              ? 'Crea menus alternativos y activalos para reemplazar el de un canal.'
              : `${menus.length} ${menus.length === 1 ? 'menu' : 'menus'}, ${activos} activo${activos === 1 ? '' : 's'}.`}
          </p>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{
            color: 'var(--color-muted)',
            transform: abierto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {abierto ? (
        <div
          className="px-5 pb-5 border-t space-y-5 pt-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <CrearMenu />
          {menus.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Aun no tienes menus pregrabados.
            </p>
          ) : (
            <div className="space-y-3">
              {menus.map((m) => (
                <MenuCard key={m.id} menu={m} productos={productos} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

function CrearMenu() {
  const [state, formAction, pending] = useActionState(crearMenuPregrabado, initialCrear);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && formRef.current) formRef.current.reset();
  }, [state.ok]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[var(--radius-md)] border p-4 space-y-3"
      style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
    >
      <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
        Crear menu
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            Nombre
          </label>
          <input
            name="nombre"
            type="text"
            required
            maxLength={60}
            placeholder="Ej: Solo postres"
            className="w-full h-10 px-3 rounded-[var(--radius-md)] border text-sm"
            style={estiloInput}
          />
          {state.fieldErrors?.nombre ? (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
              {state.fieldErrors.nombre}
            </p>
          ) : null}
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            Para que menu
          </label>
          <select
            name="canal"
            required
            defaultValue=""
            className="w-full h-10 px-3 rounded-[var(--radius-md)] border text-sm"
            style={estiloInput}
          >
            <option value="" disabled>
              Elige...
            </option>
            <option value="restaurante">Restaurante (mesa)</option>
            <option value="domicilios_diarios">Domicilios diarios</option>
            <option value="domicilios_programados">Domicilios programados</option>
          </select>
        </div>
      </div>
      {state.error ? (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {state.error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="h-9 px-4 rounded-[var(--radius-md)] text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
        >
          {pending ? 'Creando...' : 'Crear menu'}
        </button>
      </div>
    </form>
  );
}

function MenuCard({ menu, productos }: { menu: MenuPregrabado; productos: ProductoOpcion[] }) {
  const [expandido, setExpandido] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nombre, setNombre] = useState(menu.nombre);

  const enMenu = productos.filter((p) => menu.productoIds.includes(p.id));
  const disponibles = productos.filter((p) => !menu.productoIds.includes(p.id));

  function guardarNombre() {
    if (nombre.trim().length < 2) {
      setNombre(menu.nombre);
      setEditandoNombre(false);
      return;
    }
    const fd = new FormData();
    fd.append('id', menu.id);
    fd.append('nombre', nombre.trim());
    void renombrarMenuPregrabado(fd);
    setEditandoNombre(false);
  }

  return (
    <div
      className="rounded-[var(--radius-md)] border"
      style={{
        borderColor: menu.activo ? 'var(--color-ink)' : 'var(--color-border)',
        background: 'var(--color-paper)',
      }}
    >
      <div className="flex items-center justify-between gap-3 p-3.5">
        <div className="min-w-0 flex-1">
          {editandoNombre ? (
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={guardarNombre}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setNombre(menu.nombre);
                  setEditandoNombre(false);
                }
              }}
              autoFocus
              maxLength={60}
              className="w-full text-sm font-medium px-2 py-0.5 rounded border"
              style={estiloInput}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditandoNombre(true)}
              className="text-sm font-medium hover:underline text-left"
              style={{ color: 'var(--color-ink)' }}
            >
              {menu.nombre}
            </button>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-[11px] px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--color-paper-deep)', color: 'var(--color-ink-soft)' }}
            >
              {CANAL_LABEL[menu.canal] ?? menu.canal}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--color-muted)' }}>
              {enMenu.length} {enMenu.length === 1 ? 'producto' : 'productos'}
            </span>
            {menu.activo && menu.canal !== 'domicilios_programados' ? (
              <span className="text-[11px] font-semibold" style={{ color: 'var(--color-ink)' }}>
                Activo
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {menu.canal === 'domicilios_programados' ? (
            <span
              className="text-[11px] px-2 py-1 rounded-full"
              style={{ background: 'var(--color-paper-deep)', color: 'var(--color-muted)' }}
              title="Los menus de domicilios programados se asignan por dia en la tabla de la semana"
            >
              Por dia
            </span>
          ) : (
            <form action={toggleMenuActivo}>
              <input type="hidden" name="id" value={menu.id} />
              <input type="hidden" name="activar" value={(!menu.activo).toString()} />
              <button
                type="submit"
                aria-label={menu.activo ? 'Desactivar' : 'Activar'}
                className="relative w-9 h-5 rounded-full block"
                style={{ background: menu.activo ? 'var(--color-ink)' : 'var(--color-border-strong)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                  style={{ transform: menu.activo ? 'translateX(1rem)' : 'translateX(0)' }}
                />
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] border"
            style={{ color: 'var(--color-ink)', borderColor: 'var(--color-border)' }}
          >
            {expandido ? 'Cerrar' : 'Productos'}
          </button>
          <form action={eliminarMenuPregrabado}>
            <input type="hidden" name="id" value={menu.id} />
            <button
              type="submit"
              aria-label="Eliminar menu"
              onClick={(e) => {
                if (!window.confirm(`Eliminar el menu "${menu.nombre}"?`)) e.preventDefault();
              }}
              className="p-1.5 rounded-[var(--radius-md)] block"
              style={{ color: 'var(--color-muted)' }}
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
        </div>
      </div>

      {expandido ? (
        <div className="px-3.5 pb-3.5 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          {enMenu.length === 0 ? (
            <p className="text-xs mb-3" style={{ color: 'var(--color-muted)' }}>
              Este menu no tiene productos todavia. Agrega abajo.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 mb-3">
              {enMenu.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
                  style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)' }}
                >
                  {p.nombre}
                  <QuitarProducto menuId={menu.id} productoId={p.id} />
                </span>
              ))}
            </div>
          )}
          <AgregarProducto menuId={menu.id} disponibles={disponibles} />
        </div>
      ) : null}
    </div>
  );
}

function QuitarProducto({ menuId, productoId }: { menuId: string; productoId: string }) {
  return (
    <form action={quitarProductoDeMenu} style={{ display: 'inline' }}>
      <input type="hidden" name="menu_id" value={menuId} />
      <input type="hidden" name="producto_id" value={productoId} />
      <button
        type="submit"
        aria-label="Quitar del menu"
        className="grid place-items-center"
        style={{ color: 'var(--color-muted)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </form>
  );
}

function AgregarProducto({
  menuId,
  disponibles,
}: {
  menuId: string;
  disponibles: ProductoOpcion[];
}) {
  const [pending, startTransition] = useTransition();

  if (disponibles.length === 0) {
    return (
      <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
        Todos tus productos ya estan en este menu.
      </p>
    );
  }

  function onSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const productoId = e.target.value;
    e.target.value = '';
    if (!productoId) return;
    const fd = new FormData();
    fd.append('menu_id', menuId);
    fd.append('producto_id', productoId);
    startTransition(() => agregarProductoAMenu(fd));
  }

  return (
    <select
      defaultValue=""
      onChange={onSelect}
      disabled={pending}
      className="w-full h-9 px-3 rounded-[var(--radius-md)] border text-sm disabled:opacity-50"
      style={estiloInput}
    >
      <option value="">+ Agregar producto...</option>
      {disponibles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.nombre} - ${p.precio.toLocaleString('es-CO')}
        </option>
      ))}
    </select>
  );
}
