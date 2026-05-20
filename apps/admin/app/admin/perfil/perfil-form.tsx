'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@mesaya/ui';
import {
  updatePerfil,
  triggerPasswordReset,
  type UpdatePerfilState,
  type TriggerResetState,
} from './actions';

const initialUpdate: UpdatePerfilState = { ok: false };
const initialReset: TriggerResetState = { ok: false };

const ROL_LABELS: Record<string, string> = {
  dueno: 'Dueño',
  mesero: 'Mesero',
  cocina: 'Cocina',
};

export function PerfilForm({
  initialNombre,
  initialEmail,
  rol,
}: {
  initialNombre: string;
  initialEmail: string;
  rol: 'dueno' | 'mesero' | 'cocina';
}) {
  const [perfilState, perfilAction, perfilPending] = useActionState(updatePerfil, initialUpdate);
  const [resetState, resetAction, resetPending] = useActionState(
    triggerPasswordReset,
    initialReset,
  );

  return (
    <div className="space-y-6">
      {/* === Card 1: Datos personales === */}
      <form
        action={perfilAction}
        className="rounded-[var(--radius-lg)] border bg-white p-6 space-y-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-ink)' }}>
            Datos personales
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Tu rol es{' '}
            <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
              {ROL_LABELS[rol] ?? rol}
            </span>
            .
          </p>
        </div>

        <Field id="nombre" label="Nombre" error={perfilState.fieldErrors?.nombre}>
          <Input
            id="nombre"
            name="nombre"
            type="text"
            required
            defaultValue={initialNombre}
            maxLength={80}
          />
        </Field>

        <Field
          id="email"
          label="Correo"
          hint="Si lo cambiás, te mandamos un email al nuevo correo para confirmar el cambio."
          error={perfilState.fieldErrors?.email}
        >
          <Input id="email" name="email" type="email" required defaultValue={initialEmail} />
        </Field>

        {perfilState.error ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
            style={{
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
              background: 'var(--color-accent-soft)',
            }}
          >
            {perfilState.error}
          </div>
        ) : null}

        {perfilState.ok ? (
          <div
            role="status"
            className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm leading-relaxed"
            style={{
              borderColor: '#bbf7d0',
              color: '#166534',
              background: '#dcfce7',
            }}
          >
            ✓ Cambios guardados.
            {perfilState.emailChangePending ? (
              <>
                {' '}
                Te mandamos un email a{' '}
                <span className="font-medium">{perfilState.emailChangePending}</span> para confirmar
                el nuevo correo.
              </>
            ) : null}
          </div>
        ) : null}

        <div className="flex justify-end pt-1">
          <Button type="submit" loading={perfilPending}>
            Guardar cambios
          </Button>
        </div>
      </form>

      {/* === Card 2: Seguridad === */}
      <form
        action={resetAction}
        className="rounded-[var(--radius-lg)] border bg-white p-6 space-y-5"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div>
          <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--color-ink)' }}>
            Seguridad
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Te enviamos un email al correo actual con un enlace para elegir una nueva contraseña.
          </p>
        </div>

        {resetState.ok ? (
          <div
            role="status"
            className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm leading-relaxed"
            style={{
              borderColor: '#bbf7d0',
              color: '#166534',
              background: '#dcfce7',
            }}
          >
            ✓ Te mandamos un email a <span className="font-medium">{resetState.email}</span>. Revisá
            tu bandeja para continuar.
          </div>
        ) : null}

        {resetState.error ? (
          <div
            role="alert"
            className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
            style={{
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
              background: 'var(--color-accent-soft)',
            }}
          >
            {resetState.error}
          </div>
        ) : null}

        <div>
          <Button type="submit" variant="ghost" loading={resetPending}>
            {resetPending ? 'Enviando…' : 'Cambiar contraseña'}
          </Button>
        </div>
      </form>
    </div>
  );
}
