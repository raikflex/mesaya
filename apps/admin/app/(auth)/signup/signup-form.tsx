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
        hint="Lo usaras para entrar al panel cada vez."
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
        label="Contrasena"
        hint="Minimo 8 caracteres."
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

      {/* Checkbox de autorizacion de datos (Habeas Data, Ley 1581). Obligatorio. */}
      <div className="pt-1">
        <label htmlFor="acepta_datos" className="flex items-start gap-2.5 cursor-pointer select-none">
          <input
            id="acepta_datos"
            name="acepta_datos"
            type="checkbox"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-[var(--color-border-strong)] cursor-pointer"
            style={{ accentColor: 'var(--color-ink)' }}
          />
          <span className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
            Autorizo el tratamiento de mis datos personales de acuerdo con la{' '}
            <a
              href="https://enpura.co/politica-datos"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'var(--color-ink)' }}
            >
              Politica de Tratamiento de Datos
            </a>{' '}
            de EnPura, conforme a la Ley 1581 de 2012.
          </span>
        </label>
        {state.fieldErrors?.acepta_datos ? (
          <p role="alert" className="text-xs leading-relaxed mt-1.5" style={{ color: 'var(--color-danger)' }}>
            {state.fieldErrors.acepta_datos}
          </p>
        ) : null}
      </div>

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
        {pending ? 'Creando cuenta...' : 'Crear cuenta y empezar'}
      </Button>
    </form>
  );
}
