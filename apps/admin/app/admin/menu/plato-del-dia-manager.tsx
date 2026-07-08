'use client';

import { useState, useTransition } from 'react';
import {
  guardarPlatoDelDia,
  eliminarPlatoDelDia,
  togglePlatoDelDia,
} from './plato-del-dia-actions';

export type ProductoOpcion = { id: string; nombre: string; precio: number };
export type PlatoDia = {
  dia_semana: number;
  producto_id: string | null;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
};

// Orden de lunes a domingo. Indices: 0=domingo ... 6=sabado.
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];
const NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];

export function PlatoDelDiaManager({
  productos,
  platosIniciales,
}: {
  productos: ProductoOpcion[];
  platosIniciales: PlatoDia[];
}) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<number | null>(null);

  const porDia = new Map<number, PlatoDia>();
  for (const p of platosIniciales) porDia.set(p.dia_semana, p);

  const configurados = platosIniciales.length;
  const activos = platosIniciales.filter((p) => p.activo).length;

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
            Plato del dia
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {configurados === 0
              ? 'Resalta un plato distinto cada dia. Toca para configurar.'
              : `${activos} ${activos === 1 ? 'dia activo' : 'dias activos'} de ${configurados} configurado${configurados === 1 ? '' : 's'}.`}
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
        <div className="px-5 pb-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {ORDEN_DIAS.map((dia) => (
              <FilaDia
                key={dia}
                dia={dia}
                plato={porDia.get(dia) ?? null}
                productos={productos}
                editando={editando === dia}
                onAbrirEditor={() => setEditando(dia)}
                onCerrarEditor={() => setEditando(null)}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function FilaDia({
  dia,
  plato,
  productos,
  editando,
  onAbrirEditor,
  onCerrarEditor,
}: {
  dia: number;
  plato: PlatoDia | null;
  productos: ProductoOpcion[];
  editando: boolean;
  onAbrirEditor: () => void;
  onCerrarEditor: () => void;
}) {
  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {NOMBRES[dia]}
          </p>
          {plato ? (
            <p
              className="text-xs mt-0.5 truncate"
              style={{ color: plato.activo ? 'var(--color-ink-soft)' : 'var(--color-muted)' }}
            >
              {plato.nombre} &middot; ${plato.precio.toLocaleString('es-CO')}
              {plato.producto_id ? ' \u00b7 del menu' : ' \u00b7 nuevo'}
              {!plato.activo ? ' \u00b7 (oculto)' : ''}
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
              Sin plato del dia
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {plato ? (
            <>
              <form action={togglePlatoDelDia}>
                <input type="hidden" name="dia_semana" value={dia} />
                <input type="hidden" name="activo" value={(!plato.activo).toString()} />
                <button
                  type="submit"
                  aria-label={plato.activo ? 'Ocultar' : 'Mostrar'}
                  className="relative w-9 h-5 rounded-full transition-colors block"
                  style={{
                    background: plato.activo ? 'var(--color-ink)' : 'var(--color-border-strong)',
                  }}
                >
                  <span
                    className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                    style={{ transform: plato.activo ? 'translateX(1rem)' : 'translateX(0)' }}
                  />
                </button>
              </form>
              <button
                type="button"
                onClick={onAbrirEditor}
                className="text-xs px-2.5 py-1.5 rounded-[var(--radius-md)] border"
                style={{ color: 'var(--color-ink)', borderColor: 'var(--color-border)' }}
              >
                Editar
              </button>
              <form action={eliminarPlatoDelDia}>
                <input type="hidden" name="dia_semana" value={dia} />
                <button
                  type="submit"
                  aria-label="Quitar"
                  onClick={(e) => {
                    if (!window.confirm(`Quitar el plato del dia del ${NOMBRES[dia]}?`)) {
                      e.preventDefault();
                    }
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
            </>
          ) : (
            <button
              type="button"
              onClick={onAbrirEditor}
              className="text-xs px-3 py-1.5 rounded-[var(--radius-md)] font-medium"
              style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
            >
              Agregar
            </button>
          )}
        </div>
      </div>

      {editando ? (
        <EditorDia
          dia={dia}
          plato={plato}
          productos={productos}
          onListo={onCerrarEditor}
          onCancelar={onCerrarEditor}
        />
      ) : null}
    </li>
  );
}

function EditorDia({
  dia,
  plato,
  productos,
  onListo,
  onCancelar,
}: {
  dia: number;
  plato: PlatoDia | null;
  productos: ProductoOpcion[];
  onListo: () => void;
  onCancelar: () => void;
}) {
  const [modo, setModo] = useState<'menu' | 'nuevo'>(
    plato && plato.producto_id ? 'menu' : plato ? 'nuevo' : 'menu',
  );
  const [productoId, setProductoId] = useState<string>(plato?.producto_id ?? '');
  const [nombre, setNombre] = useState(plato?.nombre ?? '');
  const [precio, setPrecio] = useState<string>(plato ? String(plato.precio) : '');
  const [descripcion, setDescripcion] = useState(plato?.descripcion ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function elegirProducto(id: string) {
    setProductoId(id);
    const prod = productos.find((p) => p.id === id);
    if (prod) {
      setNombre(prod.nombre);
      setPrecio(String(prod.precio));
    }
  }

  function guardar() {
    setError(null);
    const fd = new FormData();
    fd.set('dia_semana', String(dia));
    fd.set('producto_id', modo === 'menu' ? productoId : '');
    fd.set('nombre', nombre.trim());
    fd.set('precio', precio.trim());
    if (descripcion.trim()) fd.set('descripcion', descripcion.trim());

    startTransition(async () => {
      const res = await guardarPlatoDelDia(fd);
      if (!res.ok) {
        const primerCampo = res.fieldErrors ? Object.values(res.fieldErrors)[0] : undefined;
        setError(res.error ?? primerCampo ?? 'No se pudo guardar.');
      } else {
        onListo();
      }
    });
  }

  const puedeGuardar =
    (modo === 'menu' ? productoId !== '' : true) &&
    nombre.trim().length >= 2 &&
    precio.trim() !== '' &&
    Number(precio) >= 0;

  const inputStyle = {
    borderColor: 'var(--color-border-strong)',
    color: 'var(--color-ink)',
    background: 'white',
  };

  return (
    <div
      className="mt-3 rounded-[var(--radius-md)] border p-4 space-y-3"
      style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-paper)' }}
    >
      <div className="flex gap-2">
        <BotonModo activo={modo === 'menu'} onClick={() => setModo('menu')} label="Del menu" />
        <BotonModo activo={modo === 'nuevo'} onClick={() => setModo('nuevo')} label="Nuevo" />
      </div>

      {modo === 'menu' ? (
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            Elige un plato de tu menu
          </label>
          <select
            value={productoId}
            onChange={(e) => elegirProducto(e.target.value)}
            className="w-full h-10 px-3 rounded-[var(--radius-md)] border text-sm"
            style={inputStyle}
          >
            <option value="">Selecciona...</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} - ${p.precio.toLocaleString('es-CO')}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            Nombre
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={80}
            placeholder="Ej: Bandeja paisa"
            className="w-full h-10 px-3 rounded-[var(--radius-md)] border text-sm"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
            Precio
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            min={0}
            placeholder="15000"
            className="w-full h-10 px-3 rounded-[var(--radius-md)] border text-sm"
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs mb-1" style={{ color: 'var(--color-muted)' }}>
          Descripcion (opcional)
        </label>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          maxLength={200}
          placeholder="Ej: Con arroz, frijol, huevo y aguacate"
          className="w-full h-10 px-3 rounded-[var(--radius-md)] border text-sm"
          style={inputStyle}
        />
      </div>

      {error ? (
        <p className="text-xs" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !puedeGuardar}
          className="h-9 px-4 rounded-[var(--radius-md)] text-sm font-medium disabled:opacity-50"
          style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="h-9 px-4 rounded-[var(--radius-md)] text-sm border"
          style={{ color: 'var(--color-ink)', borderColor: 'var(--color-border)' }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function BotonModo({
  activo,
  onClick,
  label,
}: {
  activo: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 h-9 rounded-[var(--radius-md)] text-sm font-medium border transition-colors"
      style={
        activo
          ? {
              background: 'var(--color-ink)',
              color: 'var(--color-paper)',
              borderColor: 'var(--color-ink)',
            }
          : {
              background: 'transparent',
              color: 'var(--color-ink-soft)',
              borderColor: 'var(--color-border)',
            }
      }
    >
      {label}
    </button>
  );
}
