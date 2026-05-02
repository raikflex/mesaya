import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { Button } from '@mesaya/ui';
import { avanzarAPaso8 } from './actions';

export const metadata = { title: 'Paso 7 · QRs' };

export default async function Paso7Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');

  const [{ data: restaurante }, { data: mesas }] = await Promise.all([
    supabase
      .from('restaurantes')
      .select('nombre_publico')
      .eq('id', perfil.restaurante_id as string)
      .single(),
    supabase
      .from('mesas')
      .select('id, numero, qr_token')
      .eq('restaurante_id', perfil.restaurante_id as string)
      .order('numero', { ascending: true }),
  ]);

  const totalMesas = mesas?.length ?? 0;

  if (totalMesas === 0) {
    redirect('/admin/onboarding/paso-6');
  }

  // Calcular páginas para mostrar al usuario (4 mesas por página).
  const paginas = Math.ceil(totalMesas / 4);

  return (
    <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-3xl mx-auto">
      <header className="mb-10">
        <p
          className="text-xs uppercase tracking-[0.16em] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Paso 7 de 8
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          Tus{' '}
          <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
            QRs
          </em>
          .
        </h1>
        <p
          className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Cada mesa tiene su QR único. Descarga el PDF, imprímelo en hojas A4, recorta
          cada cuadro y ponlo en su mesa. Mientras llegan los laminados que pediste por
          el servicio de impresión.
        </p>
      </header>

      <div className="space-y-6">
        <div
          className="rounded-[var(--radius-lg)] border p-6 sm:p-8"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
        >
          <div className="flex items-start gap-5">
            <div
              className="size-14 rounded-[var(--radius-md)] grid place-items-center shrink-0"
              style={{ background: 'var(--color-paper-deep)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  stroke="var(--color-ink)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <polyline
                  points="14 2 14 8 20 8"
                  stroke="var(--color-ink)"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 13h6M9 17h6M9 9h2"
                  stroke="var(--color-ink)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2
                className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em]"
                style={{ color: 'var(--color-ink)' }}
              >
                PDF temporal con tus QRs
              </h2>
              <p
                className="mt-1.5 text-sm leading-relaxed"
                style={{ color: 'var(--color-ink-soft)' }}
              >
                {totalMesas} mesa{totalMesas === 1 ? '' : 's'} · {paginas} página
                {paginas === 1 ? '' : 's'} A4 · 4 QRs por página
              </p>
              <a
                href="/api/qrs-pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-5 h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium transition-colors"
                style={{
                  background: 'var(--color-ink)',
                  color: 'var(--color-paper)',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Descargar PDF
              </a>
            </div>
          </div>
        </div>

        <div
          className="rounded-[var(--radius-lg)] border border-dashed p-5"
          style={{ borderColor: 'var(--color-border-strong)' }}
        >
          <p
            className="text-xs uppercase tracking-[0.14em] mb-2"
            style={{ color: 'var(--color-muted)' }}
          >
            Para probar desde tu celular
          </p>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Asegúrate de que tu celular esté en la misma red WiFi que esta computadora.
            Descarga el PDF, ábrelo en pantalla, y escanea con la cámara. Te debe llevar
            a la pantalla del cliente para hacer un pedido.
          </p>
        </div>

        <PreviewMesas mesas={(mesas ?? []).slice(0, 8)} restauranteNombre={restaurante?.nombre_publico as string ?? ''} totalMesas={totalMesas} />

        <div className="pt-4 flex items-center justify-between gap-4 flex-wrap border-t border-[var(--color-border)]">
          <p className="text-xs pt-4" style={{ color: 'var(--color-muted)' }}>
            Te queda 1 paso.
          </p>
          <form action={avanzarAPaso8} className="pt-4">
            <Button type="submit" size="lg">
              Siguiente · Equipo
              <ArrowRight />
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

function PreviewMesas({
  mesas,
  restauranteNombre,
  totalMesas,
}: {
  mesas: { id: string; numero: string; qr_token: string }[];
  restauranteNombre: string;
  totalMesas: number;
}) {
  const baseUrl =
    (globalThis as any).process?.env?.['NEXT_PUBLIC_APP_URL_CLIENTE'] ??
    'http://localhost:3002';

  return (
    <div>
      <p
        className="text-xs uppercase tracking-[0.14em] mb-3"
        style={{ color: 'var(--color-muted)' }}
      >
        URLs de cada mesa
      </p>
      <ul
        className="rounded-[var(--radius-lg)] border divide-y text-sm"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
      >
        {mesas.map((m) => (
          <li key={m.id} className="px-4 py-2.5 flex items-center gap-3">
            <span
              className="font-[family-name:var(--font-mono)] text-xs shrink-0 w-12"
              style={{ color: 'var(--color-muted)' }}
            >
              Mesa {m.numero}
            </span>
            <code
              className="text-xs truncate flex-1 font-[family-name:var(--font-mono)]"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              {baseUrl}/m/{m.qr_token}
            </code>
          </li>
        ))}
        {totalMesas > 8 ? (
          <li
            className="px-4 py-2.5 text-xs"
            style={{ color: 'var(--color-muted)' }}
          >
            … y {totalMesas - 8} más en el PDF
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
