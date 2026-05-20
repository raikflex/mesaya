'use client';

import { cerrarSesion } from '../mesero/actions';

/**
 * Pantalla mostrada cuando el dueño desactivó la pantalla de cocina en
 * /admin/configuracion. El mesero está manejando los estados de las comandas
 * manualmente (imprime/anota y se la pasa al chef físicamente).
 */
export function CocinaInactiva({
  nombreNegocio,
  colorMarca,
  nombreCocinero,
}: {
  nombreNegocio: string;
  colorMarca: string;
  nombreCocinero: string;
}) {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{ background: 'var(--color-paper)' }}
    >
      <div className="w-full max-w-md">
        <p
          className="text-[0.65rem] uppercase tracking-[0.16em] mb-2"
          style={{ color: 'var(--color-muted)' }}
        >
          {nombreNegocio} · {nombreCocinero}
        </p>
        <div
          className="size-16 rounded-full mx-auto mb-5 grid place-items-center"
          style={{ background: '#fef3c7', color: '#92400e' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 9v4M12 17h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4a2 2 0 0 0-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1] mb-3"
          style={{ color: 'var(--color-ink)' }}
        >
          La pantalla de cocina está desactivada.
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-ink-soft)' }}>
          El dueño configuró que los meseros manejen los pedidos manualmente. Te van a entregar las
          comandas impresas o anotadas físicamente.
        </p>

        <div
          className="rounded-[var(--radius-md)] border p-4 text-left mb-6"
          style={{
            borderColor: 'var(--color-border)',
            background: 'white',
          }}
        >
          <p
            className="text-[0.7rem] uppercase tracking-[0.14em] mb-2"
            style={{ color: 'var(--color-muted)' }}
          >
            ¿Esto es un error?
          </p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
            Si crees que la cocina debería estar activa, pídele al dueño que entre a{' '}
            <strong>Configuración</strong> en su panel y active la opción{' '}
            <em>"Pantalla de cocina activa"</em>.
          </p>
        </div>

        <form action={cerrarSesion}>
          <button type="submit" className="text-sm underline" style={{ color: colorMarca }}>
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
