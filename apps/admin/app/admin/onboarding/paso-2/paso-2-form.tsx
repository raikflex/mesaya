'use client';

import { useActionState, useState } from 'react';
import { Button, cn } from '@mesaya/ui';
import { guardarUsaMeseros, type Paso2State } from './actions';

const initialState: Paso2State = { ok: false };

export function Paso2Form({ initial }: { initial: boolean }) {
  const [state, formAction, pending] = useActionState(guardarUsaMeseros, initialState);
  const [seleccion, setSeleccion] = useState<boolean>(initial);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="usa_meseros" value={String(seleccion)} />

      <div className="grid sm:grid-cols-2 gap-4">
        <OpcionCard
          activa={seleccion === true}
          onClick={() => setSeleccion(true)}
          titulo="Sí, tengo meseros"
          descripcion="Restaurante casual o de mantel. Los meseros tienen mesas asignadas, reciben llamados y entregan los platos."
          ejemplos="Bandejas, parrilla, italiano, ramen…"
          icon={<IconMesero />}
        />
        <OpcionCard
          activa={seleccion === false}
          onClick={() => setSeleccion(false)}
          titulo="No, sin meseros"
          descripcion="Café, panadería o autoservicio. Los pedidos van directo a cocina o caja, sin asignación de mesas."
          ejemplos="Café de especialidad, brunch, juguería…"
          icon={<IconCafe />}
        />
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
          Te quedan 6 pasos.
        </p>
        <Button type="submit" size="lg" loading={pending}>
          {pending ? 'Guardando…' : 'Siguiente · Horario'}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

function OpcionCard({
  activa,
  onClick,
  titulo,
  descripcion,
  ejemplos,
  icon,
}: {
  activa: boolean;
  onClick: () => void;
  titulo: string;
  descripcion: string;
  ejemplos: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        'group text-left p-5 rounded-[var(--radius-lg)] border transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]',
        activa
          ? 'border-[var(--color-ink)] bg-[var(--color-paper)] shadow-[var(--shadow-md)]'
          : 'border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong)] hover:bg-[var(--color-paper-deep)]',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div
          className={cn(
            'size-10 rounded-[var(--radius-md)] grid place-items-center',
            activa
              ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
              : 'bg-[var(--color-paper-deep)] text-[var(--color-ink-soft)]',
          )}
        >
          {icon}
        </div>
        <span
          aria-hidden
          className={cn(
            'size-5 rounded-full border-2 transition-colors',
            activa
              ? 'border-[var(--color-ink)] bg-[var(--color-ink)]'
              : 'border-[var(--color-border-strong)]',
          )}
        >
          {activa ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-paper)" strokeWidth="3">
              <polyline
                points="5 12 10 17 19 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </span>
      </div>
      <h3
        className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em]"
        style={{ color: 'var(--color-ink)' }}
      >
        {titulo}
      </h3>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
        {descripcion}
      </p>
      <p className="mt-3 text-xs" style={{ color: 'var(--color-muted)' }}>
        {ejemplos}
      </p>
    </button>
  );
}

function IconMesero() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="1.75" />
      <path
        d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9 12l-2 3M15 12l2 3"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCafe() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 9h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <path
        d="M16 11h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M8 3c0 1 1 1.5 1 2.5S8 7 8 8M11 3c0 1 1 1.5 1 2.5S11 7 11 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
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
