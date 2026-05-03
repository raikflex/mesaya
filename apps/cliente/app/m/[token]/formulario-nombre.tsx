'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  capitalizarNombre,
  guardarSesionCliente,
  leerSesionCliente,
} from '../../../lib/cliente-session';

export function FormularioNombre({
  qrToken,
  numeroMesa,
  colorMarca,
}: {
  qrToken: string;
  numeroMesa: string;
  colorMarca: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Si ya tenía sesión iniciada en este token, redirigir directo al menú.
  useEffect(() => {
    const sesion = leerSesionCliente(qrToken);
    if (sesion) {
      router.replace(`/m/${qrToken}/menu`);
    }
  }, [qrToken, router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const limpio = nombre.trim();
    if (limpio.length < 2) {
      setError('Necesitamos al menos 2 letras para identificarte.');
      return;
    }
    if (limpio.length > 50) {
      setError('El nombre es muy largo. Máximo 50 caracteres.');
      return;
    }

    const capitalizado = capitalizarNombre(limpio);
    guardarSesionCliente(qrToken, capitalizado);

    startTransition(() => {
      router.push(`/m/${qrToken}/menu`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border bg-white px-6 py-7"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="size-14 rounded-full grid place-items-center mx-auto mb-5"
        style={{ background: colorMarca, color: 'white' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h2
        className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-2 text-center"
        style={{ color: 'var(--color-ink)' }}
      >
        ¿Cómo te llamas?
      </h2>
      <p
        className="text-sm leading-relaxed text-center mb-6"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        Lo necesitamos para identificar tu pedido y para tu factura.
      </p>

      <label htmlFor="nombre" className="sr-only">
        Tu nombre
      </label>
      <input
        id="nombre"
        type="text"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          if (error) setError(null);
        }}
        placeholder="Ej: Andrea"
        required
        minLength={2}
        maxLength={50}
        autoFocus
        autoComplete="given-name"
        className="w-full h-12 px-4 rounded-[var(--radius-md)] border text-center text-lg focus:outline-none focus:ring-2"
        style={{
          borderColor: error ? 'var(--color-danger)' : 'var(--color-border-strong)',
          color: 'var(--color-ink)',
          background: 'var(--color-paper)',
        }}
      />

      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs text-center"
          style={{ color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || nombre.trim().length < 2}
        className="w-full mt-5 h-12 rounded-[var(--radius-md)] text-base font-medium transition-opacity disabled:opacity-50"
        style={{
          background: 'var(--color-ink)',
          color: 'var(--color-paper)',
        }}
      >
        {pending ? 'Un momento…' : `Ver menú · Mesa ${numeroMesa}`}
      </button>

      <p
        className="text-[0.7rem] mt-4 text-center"
        style={{ color: 'var(--color-muted)' }}
      >
        Tu nombre solo lo verá el restaurante.
      </p>
    </form>
  );
}
