'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@mesaya/ui';
import { requestPasswordReset, type ForgotState } from '../../actions/auth';

const initialState: ForgotState = { ok: false };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.ok) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-md)] border px-4 py-4 text-sm leading-relaxed"
        style={{
          borderColor: '#bbf7d0',
          color: '#166534',
          background: '#dcfce7',
        }}
      >
        ✓ Listo. Si esa cuenta existe, te mandamos un email con instrucciones. Revisá tu bandeja
        (y la carpeta de spam por las dudas).
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <Field id="email" label="Correo" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          placeholder="tu@restaurante.com"
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
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </Button>
    </form>
  );
}