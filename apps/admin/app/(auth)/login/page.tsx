import Link from 'next/link';

export const metadata = { title: 'Iniciar sesión' };

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Inicio de sesión
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Esta pantalla se construye en la próxima sesión.
          <br />
          Por ahora sigue la creación de cuenta.
        </p>
        <Link
          href="/signup"
          className="inline-block underline underline-offset-4"
          style={{ color: 'var(--color-ink)' }}
        >
          Ir a crear cuenta
        </Link>
      </div>
    </main>
  );
}
