import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { MesasManager } from './mesas-manager';
import { MapaMesas, type MesaInfo, type SesionAbiertaResumen } from './mapa-mesas';

export const metadata = { title: 'Mesas · MesaYA' };
export const dynamic = 'force-dynamic';

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

  const restauranteId = perfil.restaurante_id as string;

  const [mesasResp, sesionesResp, restauranteResp] = await Promise.all([
    supabase
      .from('mesas')
      .select('id, numero, capacidad, activa, qr_token')
      .eq('restaurante_id', restauranteId)
      .order('numero', { ascending: true }),
    supabase
      .from('sesiones')
      .select('mesa_id, abierta_en, comandas(id, total, estado)')
      .eq('restaurante_id', restauranteId)
      .eq('estado', 'abierta'),
    supabase
      .from('restaurantes')
      .select('nombre_publico, color_marca')
      .eq('id', restauranteId)
      .single(),
  ]);

  const mesasOrdenadas: Mesa[] = ((mesasResp.data ?? []) as Mesa[])
    .slice()
    .sort((a, b) => {
      const na = parseInt(a.numero, 10);
      const nb = parseInt(b.numero, 10);
      if (Number.isNaN(na) || Number.isNaN(nb))
        return a.numero.localeCompare(b.numero);
      return na - nb;
    });

  // Datos para el mapa: solo necesita id, numero, capacidad
  const mesasInfo: MesaInfo[] = mesasOrdenadas.map((m) => ({
    id: m.id,
    numero: m.numero,
    capacidad: m.capacidad ?? 0,
  }));

  const sesionesAbiertas: SesionAbiertaResumen[] = ((sesionesResp.data ?? []) as Array<{
    mesa_id: string;
    abierta_en: string;
    comandas: { total: number; estado: string }[] | null;
  }>).map((s) => {
    const comandasNoCanceladas = (s.comandas ?? []).filter(
      (c) => c.estado !== 'cancelada',
    );
    return {
      mesaId: s.mesa_id,
      abiertaEn: s.abierta_en,
      totalAcumulado: comandasNoCanceladas.reduce(
        (acc, c) => acc + (c.total ?? 0),
        0,
      ),
      comandasCount: comandasNoCanceladas.length,
    };
  });

  const nombreNegocio = (restauranteResp.data?.nombre_publico as string) ?? 'Tu negocio';
  const colorMarca = (restauranteResp.data?.color_marca as string) ?? '#9a3f6b';

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
            Mira el estado en tiempo real de cada mesa, agrega más si tu
            restaurante crece, edita la capacidad o descarga otra vez los QRs.
          </p>
        </header>

        <MapaMesas
          mesas={mesasInfo}
          sesionesAbiertasIniciales={sesionesAbiertas}
          restauranteId={restauranteId}
          colorMarca={colorMarca}
          variante="admin"
        />

        <MesasManager mesas={mesasOrdenadas} />
      </main>
    </PanelShell>
  );
}
