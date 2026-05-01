'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, cn } from '@mesaya/ui';
import { guardarDatosNegocio, type Paso1State } from './actions';

interface InitialValues {
  nombre_publico: string;
  nit: string | null;
  direccion: string | null;
  color_marca: string;
}

const initialState: Paso1State = { ok: false };

const PALETTE = [
  { hex: '#c0432e', nombre: 'Terracota' },
  { hex: '#1a1814', nombre: 'Tinta' },
  { hex: '#2f5d3a', nombre: 'Bosque' },
  { hex: '#264653', nombre: 'Petróleo' },
  { hex: '#9a3f6b', nombre: 'Buganvilia' },
  { hex: '#b07a2e', nombre: 'Mostaza' },
  { hex: '#3a4a8c', nombre: 'Añil' },
  { hex: '#5a3a8a', nombre: 'Berenjena' },
] as const;

export function BusinessInfoForm({
  initial,
  nombreDueno,
}: {
  initial: InitialValues;
  nombreDueno: string | null;
}) {
  const [state, formAction, pending] = useActionState(guardarDatosNegocio, initialState);
  const [nombre, setNombre] = useState(initial.nombre_publico);
  const [color, setColor] = useState(initial.color_marca);

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Field
          id="nombre_publico"
          label="Nombre del restaurante"
          hint="Como aparece en la fachada. Lo verán los clientes."
          error={state.fieldErrors?.nombre_publico}
        >
          <Input
            id="nombre_publico"
            name="nombre_publico"
            type="text"
            required
            autoFocus
            placeholder="Ej: Café Cumbre"
            defaultValue={initial.nombre_publico}
            onChange={(e) => setNombre(e.target.value)}
            maxLength={80}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field
            id="nit"
            label="NIT"
            hint="Sin guion ni dígito de verificación."
            error={state.fieldErrors?.nit}
          >
            <Input
              id="nit"
              name="nit"
              type="text"
              inputMode="numeric"
              placeholder="900123456"
              defaultValue={initial.nit ?? ''}
              maxLength={10}
            />
          </Field>

          <Field
            id="direccion"
            label="Dirección"
            hint="Opcional por ahora."
            error={state.fieldErrors?.direccion}
          >
            <Input
              id="direccion"
              name="direccion"
              type="text"
              placeholder="Calle 70 # 10-23, Bogotá"
              defaultValue={initial.direccion ?? ''}
              maxLength={160}
            />
          </Field>
        </div>

        <ColorMarcaPicker
          value={color}
          onChange={setColor}
          error={state.fieldErrors?.color_marca}
        />

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

        <div className="pt-2 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            Te quedan 7 pasos. Tarda 5 minutos.
          </p>
          <Button type="submit" size="lg" loading={pending}>
            {pending ? 'Guardando…' : 'Siguiente · Meseros'}
            <ArrowRight />
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-6 self-start">
        <ClientPreview nombre={nombre || 'Tu restaurante'} color={color} dueno={nombreDueno} />
      </aside>
    </form>
  );
}

function ColorMarcaPicker({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (hex: string) => void;
  error?: string;
}) {
  const [customMode, setCustomMode] = useState(
    !PALETTE.some((p) => p.hex.toLowerCase() === value.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <label
        className="block text-sm font-medium tracking-[-0.005em]"
        style={{ color: 'var(--color-ink)' }}
      >
        Color de marca
      </label>
      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        Es el acento que verá el cliente: el botón de pedir, los detalles. Mira el preview.
      </p>

      <input type="hidden" name="color_marca" value={value} />

      <div className="flex flex-wrap gap-2 pt-1">
        {PALETTE.map((p) => {
          const seleccionado = !customMode && p.hex.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={p.hex}
              type="button"
              aria-label={p.nombre}
              aria-pressed={seleccionado}
              onClick={() => {
                onChange(p.hex);
                setCustomMode(false);
              }}
              className={cn(
                'group relative size-9 rounded-full transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
                'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]',
                seleccionado ? 'scale-110' : 'hover:scale-105',
              )}
              style={{
                background: p.hex,
                boxShadow: seleccionado
                  ? `0 0 0 2px var(--color-paper), 0 0 0 4px ${p.hex}`
                  : 'inset 0 0 0 1px rgb(0 0 0 / 0.08)',
              }}
            >
              {seleccionado ? (
                <svg
                  viewBox="0 0 24 24"
                  className="absolute inset-0 m-auto size-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  aria-hidden
                >
                  <polyline points="5 12 10 17 19 8" />
                </svg>
              ) : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setCustomMode(true)}
          aria-pressed={customMode}
          className={cn(
            'h-9 px-3 rounded-full text-xs font-medium transition-colors',
            'border',
            customMode
              ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
              : 'bg-transparent text-[var(--color-ink)] border-[var(--color-border-strong)] hover:bg-[var(--color-paper-deep)]',
          )}
        >
          Otro
        </button>
      </div>

      {customMode ? (
        <div className="flex items-center gap-2 pt-2">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="size-9 rounded cursor-pointer border-0 p-0 bg-transparent"
            aria-label="Selector de color"
          />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="font-[family-name:var(--font-mono)] text-sm uppercase max-w-[140px]"
            placeholder="#c0432e"
            maxLength={7}
          />
        </div>
      ) : null}

      {error ? (
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-danger)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ClientPreview({
  nombre,
  color,
  dueno,
}: {
  nombre: string;
  color: string;
  dueno: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
          Vista del cliente
        </p>
        <span
          className="text-[0.65rem] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--color-paper-deep)', color: 'var(--color-muted)' }}
        >
          Live
        </span>
      </div>

      <div
        className="rounded-[28px] border p-2 shadow-[var(--shadow-md)]"
        style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-paper)' }}
      >
        <div
          className="rounded-[20px] aspect-[9/16] overflow-hidden flex flex-col"
          style={{ background: '#fff' }}
        >
          <div className="px-5 pt-7 pb-4 border-b" style={{ borderColor: '#0001' }}>
            <p className="text-[0.65rem] uppercase tracking-[0.14em] text-stone-500">Mesa 4</p>
            <h2
              className="font-[family-name:var(--font-display)] text-[1.6rem] tracking-[-0.02em] leading-[1.05] mt-0.5 text-stone-900"
              style={{ wordBreak: 'break-word' }}
            >
              {nombre}
            </h2>
          </div>

          <div className="px-5 py-4 flex-1 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-stone-700">Bandeja paisa</span>
              <span className="text-sm font-medium text-stone-900">$32k</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-stone-700">Ajiaco bogotano</span>
              <span className="text-sm font-medium text-stone-900">$28k</span>
            </div>
            <div className="flex items-baseline justify-between opacity-60">
              <span className="text-sm text-stone-700">Empanada</span>
              <span className="text-sm font-medium text-stone-900">$4k</span>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div
              className="h-12 rounded-xl text-white text-sm font-medium grid place-items-center transition-colors"
              style={{ background: color }}
            >
              Pedir · 1 ítem
            </div>
            <p className="mt-3 text-[0.65rem] text-center text-stone-500">
              {dueno ? `Atiende ${dueno}` : 'MesaYA'}
            </p>
          </div>
        </div>
      </div>
    </div>
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
