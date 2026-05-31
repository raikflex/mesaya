import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { EquipoManager, type Miembro, type RolStaff } from './equipo-manager';

export const metadata = { title: 'Equipo · EnPura' };
export const dynamic = 'force-dynamic';

export default async function EquipoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');
  if (perfil.rol !== 'dueno') redirect('/login?error=acceso-denegado');

  const restauranteId = perfil.restaurante_id as string;

  const [{ data: restaurante }, { data: miembrosRaw }] = await Promise.all([
    supabase.from('restaurantes').select('nombre_publico').eq('id', restauranteId).single(),
    supabase
      .from('perfiles')
      .select('id, nombre, rol')
      .eq('restaurante_id', restauranteId)
      .neq('rol', 'dueno')
      .order('nombre', { ascending: true }),
  ]);

  // Traer los roles multi de cada miembro desde perfil_roles.
  const idsStaff = ((miembrosRaw ?? []) as { id: string }[]).map((m) => m.id);
  const { data: rolesRaw } = idsStaff.length
    ? await supabase.from('perfil_roles').select('perfil_id, rol').in('perfil_id', idsStaff)
    : { data: [] };
  const rolesPorPerfil = new Map<string, RolStaff[]>();
  for (const r of (rolesRaw ?? []) as { perfil_id: string; rol: RolStaff }[]) {
    const arr = rolesPorPerfil.get(r.perfil_id) ?? [];
    arr.push(r.rol);
    rolesPorPerfil.set(r.perfil_id, arr);
  }

  const miembros: Miembro[] = ((miembrosRaw ?? []) as { id: string; nombre: string; rol: string }[])
    .filter((m) => m.rol === 'cocina' || m.rol === 'mesero' || m.rol === 'domiciliario' || m.rol === 'lavaplatos')
    .map((m) => ({
      id: m.id,
      nombre: m.nombre,
      rol: (m.rol === 'cocina' ? 'cocina' : 'mesero') as 'mesero' | 'cocina',
      roles: rolesPorPerfil.get(m.id) ?? [],
    }));

  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu negocio';

  return (
    <PanelShell currentPage="equipo" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 max-w-3xl mx-auto space-y-8">
        <header>
          <h1
            className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu{' '}
            <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
              equipo
            </em>
            .
          </h1>
          <p
            className="mt-3 text-[0.95rem] leading-relaxed max-w-xl"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Agrega cocineros y meseros cuando entren a trabajar, o quita cuentas cuando alguien deje
            el equipo. Cada cuenta tiene acceso a la app de cocina o mesero según su rol.
          </p>
        </header>

        <EquipoManager miembros={miembros} />
      </main>
    </PanelShell>
  );
}
