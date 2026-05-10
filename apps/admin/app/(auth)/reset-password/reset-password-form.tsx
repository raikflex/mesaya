'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@mesaya/ui';
import { updatePassword, type UpdatePasswordState } from '../../actions/auth';

const initialState: UpdatePasswordState = { ok: false };

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <Field
        id="password"
        label="Nueva contraseña"
        hint="Mínimo 8 caracteres."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={8}
          maxLength={72}
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

      <Button type="submit" size="lg" loading={pending} className="w-full mt-2">
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </Button>
    </form>
  );
}