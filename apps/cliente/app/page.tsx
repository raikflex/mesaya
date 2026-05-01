export default function ClienteHome() {
  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Escanea el QR de tu mesa
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Para entrar a esta app, busca el código QR que está sobre tu mesa.
        </p>
      </div>
    </main>
  );
}
