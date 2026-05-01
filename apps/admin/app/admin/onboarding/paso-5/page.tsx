export const metadata = { title: 'Paso 5 · Productos' };

export default function Paso5Page() {
  return (
    <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-3xl mx-auto">
      <p
        className="text-xs uppercase tracking-[0.16em] mb-3"
        style={{ color: 'var(--color-muted)' }}
      >
        Paso 5 de 8
      </p>
      <h1
        className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
        style={{ color: 'var(--color-ink)' }}
      >
        Tus{' '}
        <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
          productos
        </em>
        .
      </h1>
      <p className="mt-4 text-sm" style={{ color: 'var(--color-muted)' }}>
        Construyéndose en la sesión 2.3. Por ahora confirmaste que paso-4 guardó.
      </p>
    </main>
  );
}
