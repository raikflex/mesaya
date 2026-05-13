import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { BrandingForm } from './branding-form';

export const metadata = { title: 'Branding' };

export default async function BrandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');
  if (perfil.rol !== 'dueno') redirect('/admin');

  const restauranteId = perfil.restaurante_id as string;

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico, logo_url, color_marca')
    .eq('id', restauranteId)
    .maybeSingle();

  const nombreNegocio =
    (restaurante?.nombre_publico as string) ?? 'Tu restaurante';
  const logoUrl = (restaurante?.logo_url as string | null) ?? null;
  const colorMarca = (restaurante?.color_marca as string) ?? '#9a3f6b';

  return (
    <PanelShell currentPage="branding" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-2xl mx-auto">
        <header className="mb-10">
          <p
            className="text-xs uppercase tracking-[0.16em] mb-3"
            style={{ color: 'var(--color-muted)' }}
          >
            Configuracion
          </p>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu{' '}
            <em
              className="not-italic"
              style={{ fontStyle: 'italic', fontWeight: 400 }}
            >
              imagen
            </em>
            .
          </h1>
          <p
            className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Personaliza como te ven tus clientes cuando escanean el QR.
          </p>
        </header>

        <BrandingForm
          logoInicial={logoUrl}
          nombreNegocio={nombreNegocio}
          colorMarca={colorMarca}
        />
      </main>
    </PanelShell>
  );
}
