import Link from 'next/link';
import { SignupForm } from './signup-form';

export const metadata = {
  title: 'Crear cuenta',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1fr_minmax(420px,520px)]">
      {/* Panel izquierdo: lado editorial. Aspira a sentirse menú de restaurante,
          no SaaS form en blanco. */}
      <aside
        className="hidden lg:flex flex-col justify-between p-12 xl:p-16 relative overflow-hidden"
        style={{
          background: 'var(--color-paper-deep)',
        }}
      >
        {/* Textura sutil con noise vía SVG inline para evitar dependencias. */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative">
          <Link href="/signup" className="inline-flex items-center gap-2 group">
            <Mark />
            <span
              className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]"
              style={{ color: 'var(--color-ink)' }}
            >
              MesaYA
            </span>
          </Link>
        </div>

        <div className="relative max-w-md">
          <p
            className="font-[family-name:var(--font-display)] text-[2.75rem] leading-[1.05] tracking-[-0.02em]"
            style={{ color: 'var(--color-ink)' }}
          >
            <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
              Tu mesero
            </em>
            <br />
            ya no es el<br />
            cuello de botella.
          </p>
          <p
            className="mt-6 text-[0.95rem] leading-relaxed max-w-sm"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            El cliente escanea, pide y paga desde su celular. Tú ves todo en tiempo real.
          </p>
        </div>

        <div className="relative flex items-center gap-6 text-sm" style={{ color: 'var(--color-muted)' }}>
          <span>15 días gratis</span>
          <span aria-hidden>·</span>
          <span>Sin tarjeta</span>
          <span aria-hidden>·</span>
          <span>Bogotá</span>
        </div>
      </aside>

      {/* Panel derecho: el form. */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Logo móvil */}
          <Link href="/signup" className="inline-flex items-center gap-2 mb-10 lg:hidden">
            <Mark />
            <span
              className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em]"
              style={{ color: 'var(--color-ink)' }}
            >
              MesaYA
            </span>
          </Link>

          <h1
            className="font-[family-name:var(--font-display)] text-[2rem] leading-[1.1] tracking-[-0.02em]"
            style={{ color: 'var(--color-ink)' }}
          >
            Crea tu cuenta
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>
            Empezamos los 15 días gratis. Sin tarjeta de crédito.
          </p>

          <div className="mt-8">
            <SignupForm />
          </div>

          <p className="mt-8 text-sm" style={{ color: 'var(--color-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/login"
              className="underline underline-offset-4 hover:text-[var(--color-ink)] transition-colors"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

/**
 * Logo provisional inline (un cuadrito con un puntito = "una mesa, un pedido").
 * Va a evolucionar; lo importante hoy es que no se sienta logo de Lorem Ipsum.
 */
function Mark() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="6"
        stroke="var(--color-ink)"
        strokeWidth="1.5"
      />
      <circle cx="22" cy="22" r="3" fill="var(--color-accent)" />
    </svg>
  );
}
