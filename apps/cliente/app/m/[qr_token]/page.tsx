/**
 * Entry point del cliente: lee el qr_token y resuelve mesa + restaurante.
 *
 * En sesión 3 implementamos:
 *   1. Lookup público de mesa por qr_token (RLS permite SELECT sin auth)
 *   2. Validación de restaurante (estado=activo, dentro de horario)
 *   3. Pantalla "tu nombre" → auth anónima → upsert sesion + sesion_clientes
 *   4. Render del menú con color del restaurante aplicado a CSS vars
 *
 * Hoy esto es un placeholder que solo demuestra la ruta.
 */
export default async function ClienteEntradaPage({
  params,
}: {
  params: Promise<{ qr_token: string }>;
}) {
  const { qr_token } = await params;

  return (
    <main className="min-h-screen grid place-items-center p-6 text-center">
      <div className="max-w-sm space-y-4">
        <p
          className="text-xs uppercase tracking-[0.16em]"
          style={{ color: 'var(--color-muted)' }}
        >
          MesaYA · cliente
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Llegaste a la mesa
        </h1>
        <p className="text-xs font-[family-name:var(--font-mono)]" style={{ color: 'var(--color-muted)' }}>
          token: {qr_token}
        </p>
        <p className="text-sm pt-4" style={{ color: 'var(--color-muted)' }}>
          El flujo de pedido se construye en la sesión 3.
        </p>
      </div>
    </main>
  );
}
