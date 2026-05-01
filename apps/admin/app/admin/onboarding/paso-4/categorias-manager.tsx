'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button, Field, Input, cn } from '@mesaya/ui';
import {
  agregarCategoria,
  avanzarAPaso5,
  borrarCategoria,
  renombrarCategoria,
  reordenarCategoria,
  type AddCategoriaState,
} from './actions';

type Categoria = {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
};

const initialAdd: AddCategoriaState = { ok: false };

export function CategoriasManager({ categorias }: { categorias: Categoria[] }) {
  const total = categorias.length;
  const puedeAvanzar = total >= 1;

  return (
    <div className="space-y-8">
      <FormularioAgregar />

      <Lista categorias={categorias} />

      <div className="pt-2 flex items-center justify-between gap-4 flex-wrap border-t border-[var(--color-border)] mt-2">
        <p className="text-xs pt-4" style={{ color: 'var(--color-muted)' }}>
          {total === 0
            ? 'Agrega al menos una categoría para continuar.'
            : `${total} categoría${total === 1 ? '' : 's'}. Te quedan 4 pasos.`}
        </p>
        <form action={avanzarAPaso5} className="pt-4">
          <Button type="submit" size="lg" disabled={!puedeAvanzar}>
            Siguiente · Productos
            <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}

function FormularioAgregar() {
  const [state, formAction, pending] = useActionState(agregarCategoria, initialAdd);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
      const input = formRef.current.querySelector<HTMLInputElement>('input[name="nombre"]');
      input?.focus();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex items-end gap-3 max-w-md">
      <Field id="nombre" label="Nueva categoría" error={state.fieldError} className="flex-1">
        <Input
          id="nombre"
          name="nombre"
          type="text"
          required
          autoFocus
          placeholder="Ej: Entradas"
          maxLength={60}
        />
      </Field>
      <Button type="submit" loading={pending} className="shrink-0">
        Agregar
      </Button>
    </form>
  );
}

function Lista({ categorias }: { categorias: Categoria[] }) {
  if (categorias.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--color-border-strong)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Aún no has creado categorías. Agrega la primera arriba.
        </p>
      </div>
    );
  }

  return (
    <ul
      className="rounded-[var(--radius-lg)] border divide-y"
      style={{
        borderColor: 'var(--color-border)',
        background: 'var(--color-paper)',
      }}
    >
      {categorias.map((cat, i) => (
        <ItemCategoria
          key={cat.id}
          categoria={cat}
          esPrimera={i === 0}
          esUltima={i === categorias.length - 1}
        />
      ))}
    </ul>
  );
}

function ItemCategoria({
  categoria,
  esPrimera,
  esUltima,
}: {
  categoria: Categoria;
  esPrimera: boolean;
  esUltima: boolean;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex flex-col gap-0.5 shrink-0">
        <ReorderBtn id={categoria.id} direccion="arriba" disabled={esPrimera} />
        <ReorderBtn id={categoria.id} direccion="abajo" disabled={esUltima} />
      </div>

      <div className="flex-1 min-w-0">
        {editando ? (
          <form
            action={async (formData) => {
              await renombrarCategoria(formData);
              setEditando(false);
            }}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="id" value={categoria.id} />
            <Input
              name="nombre"
              defaultValue={categoria.nombre}
              autoFocus
              maxLength={60}
              required
              className="h-9"
            />
            <Button type="submit" size="sm">
              Guardar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditando(false)}
            >
              Cancelar
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-left text-base hover:underline underline-offset-4 truncate"
            style={{ color: 'var(--color-ink)' }}
          >
            {categoria.nombre}
          </button>
        )}
      </div>

      {!editando ? (
        <form action={borrarCategoria} className="shrink-0">
          <input type="hidden" name="id" value={categoria.id} />
          <button
            type="submit"
            aria-label={`Borrar ${categoria.nombre}`}
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
      ) : null}
    </li>
  );
}

function ReorderBtn({
  id,
  direccion,
  disabled,
}: {
  id: string;
  direccion: 'arriba' | 'abajo';
  disabled: boolean;
}) {
  return (
    <form action={reordenarCategoria}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direccion" value={direccion} />
      <button
        type="submit"
        disabled={disabled}
        aria-label={direccion === 'arriba' ? 'Mover arriba' : 'Mover abajo'}
        className={cn(
          'size-5 grid place-items-center rounded transition-colors',
          'text-[var(--color-muted)]',
          !disabled && 'hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-deep)]',
          disabled && 'opacity-30 cursor-not-allowed',
        )}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
          {direccion === 'arriba' ? (
            <polyline
              points="6 15 12 9 18 15"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : (
            <polyline
              points="6 9 12 15 18 9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </button>
    </form>
  );
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
