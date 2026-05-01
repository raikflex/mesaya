export default function StaffHome() {
  return (
    <main className="min-h-screen grid place-items-center p-8">
      <div className="text-center max-w-md space-y-4">
        <p
          className="text-xs uppercase tracking-[0.16em]"
          style={{ color: 'var(--color-muted)' }}
        >
          MesaYA · Staff
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Mesero y cocina
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Esta app se construye en las sesiones 3 y 4.
        </p>
      </div>
    </main>
  );
}
