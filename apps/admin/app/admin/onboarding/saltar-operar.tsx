'use client';

import { cerrarOnboarding } from './paso-8/actions';

/**
 * Boton visible en todos los pasos del onboarding. Llama a cerrarOnboarding,
 * que activa la cuenta (estado 'activo' + trial de 15 dias + slug) y redirige
 * al panel. Con esto el dueno puede saltar la configuracion desde cualquier
 * paso y todo queda usable de inmediato (dueno y cliente).
 */
export function SaltarOperar() {
  return (
    <form action={cerrarOnboarding}>
      <button
        type="submit"
        onClick={(e) => {
          const ok = window.confirm(
            'Vas a empezar a operar ahora: tu restaurante queda activo para tus clientes y tu prueba de 15 dias comienza. Puedes seguir configurando todo desde el panel. Continuar?',
          );
          if (!ok) e.preventDefault();
        }}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm rounded-full border px-3.5 py-1.5 transition-colors hover:bg-[var(--color-paper-deep)]"
        style={{ color: 'var(--color-ink-soft)', borderColor: 'var(--color-border-strong)' }}
      >
        Saltar y empezar a operar
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </form>
  );
}
