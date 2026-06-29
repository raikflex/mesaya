import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { ConfiguracionForm } from './configuracion-form';
export const metadata = { title: 'Configuracion - EnPura' };
export const dynamic = 'force-dynamic';
export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol, nombre')
    .eq('id', user.id)
    .maybeSingle();
  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');
  if (perfil.rol !== 'dueno') redirect('/login?error=acceso-denegado');
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select(
      'nombre_publico, color_marca, modo_cocina, acepta_domicilios, acepta_pickup, acepta_domicilios_programados, slug',
    )
    .eq('id', perfil.restaurante_id as string)
    .single();
  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu negocio';
  const color = (restaurante?.color_marca as string) ?? '#9a3f6b';
  const modoCocina =
    (restaurante?.modo_cocina as 'con_pantalla' | 'sin_pantalla' | 'impresion') ?? 'sin_pantalla';
  const aceptaDomicilios = (restaurante?.acepta_domicilios as boolean) ?? false;
  const aceptaPickup = (restaurante?.acepta_pickup as boolean) ?? false;
  const aceptaDomiciliosProgramados =
    (restaurante?.acepta_domicilios_programados as boolean) ?? false;
  const slug = (restaurante?.slug as string | null) ?? '';
  return (
    <PanelShell currentPage="configuracion" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 max-w-3xl mx-auto space-y-8">
        <header>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Configuracion
          </h1>
          <p
            className="mt-3 text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Ajusta el nombre, los colores y la operacion de tu restaurante.
          </p>
        </header>
        <ConfiguracionForm
          nombreInicial={nombreNegocio}
          colorInicial={color}
          modoCocinaInicial={modoCocina}
          aceptaDomiciliosInicial={aceptaDomicilios}
          aceptaPickupInicial={aceptaPickup}
          aceptaDomiciliosProgramadosInicial={aceptaDomiciliosProgramados}
          slugInicial={slug}
        />
      </main>
    </PanelShell>
  );
}
