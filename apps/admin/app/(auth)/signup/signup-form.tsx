'use client';

import { useActionState } from 'react';
import { Button, Field, Input } from '@mesaya/ui';
import { signupOwner, type SignupState } from '../../actions/auth';

const initialState: SignupState = { ok: false };

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupOwner, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <Field id="nombre" label="Tu nombre" error={state.fieldErrors?.nombre}>
        <Input
          id="nombre"
          name="nombre"
          type="text"
          autoComplete="name"
          autoFocus
          required
          placeholder="Camila Restrepo"
        />
      </Field>

      <Field
        id="email"
        label="Correo"
        hint="Lo usarás para entrar al panel cada vez."
        error={state.fieldErrors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="tu@restaurante.com"
        />
      </Field>

      <Field
        id="password"
        label="Contraseña"
        hint="Mínimo 8 caracteres."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </Field>

      {state.error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
          style={{
            borderColor: state.ok ? 'var(--color-success)' : 'var(--color-danger)',
            color: state.ok ? 'var(--color-success)' : 'var(--color-danger)',
            background: state.ok ? '#f1f5ee' : 'var(--color-accent-soft)',
          }}
        >
          {state.error}
        </div>
      ) : null}

      <Button type="submit" size="lg" loading={pending} className="w-full mt-2">
        {pending ? 'Creando cuenta…' : 'Crear cuenta y empezar'}
      </Button>

      <p className="text-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
        Al continuar aceptas los términos del servicio y la política de privacidad de MesaYA.
      </p>
    </form>
  );
}
