export default function NotFound() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{ background: 'var(--color-paper)' }}
    >
      <div className="w-full max-w-sm">
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1]"
          style={{ color: 'var(--color-ink)' }}
        >
          MesaYA
        </h1>
        <div
          className="rounded-[var(--radius-lg)] border bg-white px-6 py-8 mt-10"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <h2
            className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
            style={{ color: 'var(--color-ink)' }}
          >
            Código no reconocido.
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Este QR no corresponde a ninguna mesa activa. Verifica que estés
            escaneando el código correcto, o pide al mesero uno nuevo.
          </p>
        </div>
        <p
          className="mt-12 text-[0.7rem] uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-muted)' }}
        >
          Servido con <span style={{ color: 'var(--color-ink)' }}>MesaYA</span>
        </p>
      </div>
    </main>
  );
}
