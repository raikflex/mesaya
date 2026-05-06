import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { MesasManager } from './mesas-manager';

export const metadata = { title: 'Mesas · MesaYA' };

type Mesa = {
  id: string;
  numero: string;
  capacidad: number;
  activa: boolean;
  qr_token: string;
};

export default async function MesasPage() {
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

  const { data: mesas } = await supabase
    .from('mesas')
    .select('id, numero, capacidad, activa, qr_token')
    .eq('restaurante_id', perfil.restaurante_id as string)
    .order('numero', { ascending: true });

  // Ordenar numéricamente porque numero es text en DB.
  const mesasOrdenadas: Mesa[] = ((mesas ?? []) as Mesa[]).slice().sort((a, b) => {
    const na = parseInt(a.numero, 10);
    const nb = parseInt(b.numero, 10);
    if (Number.isNaN(na) || Number.isNaN(nb))
      return a.numero.localeCompare(b.numero);
    return na - nb;
  });

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico')
    .eq('id', perfil.restaurante_id as string)
    .single();

  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu negocio';

  return (
    <PanelShell currentPage="mesas" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 max-w-5xl mx-auto space-y-8">
        <header>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tus{' '}
            <em
              className="not-italic"
              style={{ fontStyle: 'italic', fontWeight: 400 }}
            >
              mesas
            </em>
            .
          </h1>
          <p
            className="mt-3 text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Agrega más mesas si tu restaurante crece, edita la capacidad, o
            descarga otra vez los QRs si los pierdes.
          </p>
        </header>

        <MesasManager mesas={mesasOrdenadas} />
      </main>
    </PanelShell>
  );
}
