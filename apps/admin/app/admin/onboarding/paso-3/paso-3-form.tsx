'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input, cn } from '@mesaya/ui';
import { guardarHorario, type Paso3State } from './actions';

const DIAS = [
  { slug: 'lun', label: 'Lun', largo: 'Lunes' },
  { slug: 'mar', label: 'Mar', largo: 'Martes' },
  { slug: 'mie', label: 'Mié', largo: 'Miércoles' },
  { slug: 'jue', label: 'Jue', largo: 'Jueves' },
  { slug: 'vie', label: 'Vie', largo: 'Viernes' },
  { slug: 'sab', label: 'Sáb', largo: 'Sábado' },
  { slug: 'dom', label: 'Dom', largo: 'Domingo' },
] as const;

type DiaSlug = (typeof DIAS)[number]['slug'];

interface Initial {
  horario_apertura: string;
  horario_cierre: string;
  dias_operacion: string[];
}

const initialState: Paso3State = { ok: false };

export function Paso3Form({ initial }: { initial: Initial }) {
  const [state, formAction, pending] = useActionState(guardarHorario, initialState);
  const [diasSeleccionados, setDiasSeleccionados] = useState<Set<string>>(
    new Set(initial.dias_operacion),
  );

  function toggleDia(slug: DiaSlug) {
    setDiasSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function aplicarPreset(preset: 'todos' | 'l-v' | 'l-s') {
    if (preset === 'todos') {
      setDiasSeleccionados(new Set(DIAS.map((d) => d.slug)));
    } else if (preset === 'l-v') {
      setDiasSeleccionados(new Set(['lun', 'mar', 'mie', 'jue', 'vie']));
    } else if (preset === 'l-s') {
      setDiasSeleccionados(new Set(['lun', 'mar', 'mie', 'jue', 'vie', 'sab']));
    }
  }

  return (
    <form action={formAction} className="space-y-8">
      {Array.from(diasSeleccionados).map((slug) => (
        <input key={slug} type="hidden" name="dias_operacion" value={slug} />
      ))}

      <div className="grid sm:grid-cols-2 gap-5 max-w-md">
        <Field
          id="horario_apertura"
          label="Abre a las"
          error={state.fieldErrors?.horario_apertura}
        >
          <Input
            id="horario_apertura"
            name="horario_apertura"
            type="time"
            required
            defaultValue={initial.horario_apertura}
          />
        </Field>

        <Field
          id="horario_cierre"
          label="Cierra a las"
          error={state.fieldErrors?.horario_cierre}
        >
          <Input
            id="horario_cierre"
            name="horario_cierre"
            type="time"
            required
            defaultValue={initial.horario_cierre}
          />
        </Field>
      </div>

      <div>
        <label
          className="block text-sm font-medium tracking-[-0.005em] mb-1.5"
          style={{ color: 'var(--color-ink)' }}
        >
          Días que abres
        </label>
        <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--color-muted)' }}>
          Selecciona los días en que el restaurante recibe pedidos.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          <PresetBtn onClick={() => aplicarPreset('l-v')}>Lun a Vie</PresetBtn>
          <PresetBtn onClick={() => aplicarPreset('l-s')}>Lun a Sáb</PresetBtn>
          <PresetBtn onClick={() => aplicarPreset('todos')}>Todos</PresetBtn>
        </div>

        <div className="flex flex-wrap gap-2">
          {DIAS.map((dia) => {
            const activo = diasSeleccionados.has(dia.slug);
            return (
              <button
                key={dia.slug}
                type="button"
                onClick={() => toggleDia(dia.slug)}
                aria-pressed={activo}
                aria-label={dia.largo}
                className={cn(
                  'h-11 px-4 rounded-[var(--radius-md)] border text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
                  'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]',
                  activo
                    ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
                    : 'bg-transparent text-[var(--color-ink)] border-[var(--color-border-strong)] hover:bg-[var(--color-paper-deep)]',
                )}
              >
                {dia.label}
              </button>
            );
          })}
        </div>

        {state.fieldErrors?.dias_operacion ? (
          <p
            className="text-xs leading-relaxed mt-2"
            style={{ color: 'var(--color-danger)' }}
          >
            {state.fieldErrors.dias_operacion}
          </p>
        ) : null}
      </div>

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
          Te quedan 5 pasos.
        </p>
        <Button type="submit" size="lg" loading={pending}>
          {pending ? 'Guardando…' : 'Siguiente · Categorías'}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

function PresetBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-8 px-3 rounded-full text-xs font-medium border transition-colors bg-transparent text-[var(--color-ink-soft)] border-[var(--color-border)] hover:bg-[var(--color-paper-deep)] hover:border-[var(--color-border-strong)]"
    >
      {children}
    </button>
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
