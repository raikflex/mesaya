'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@mesaya/ui';
import { loginOwner, type LoginState } from '../../actions/auth';

const initialState: LoginState = { ok: false };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginOwner, initialState);

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

      <Field id="password" label="Contraseña" error={state.fieldErrors?.password}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
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
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
