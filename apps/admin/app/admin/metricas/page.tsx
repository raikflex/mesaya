import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';

export const dynamic = 'force-dynamic';

export default async function MetricasPage() {
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

  if (!perfil || perfil.rol !== 'dueno') redirect('/login');

  const restauranteId = perfil.restaurante_id as string;

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico, color_marca')
    .eq('id', restauranteId)
    .maybeSingle();

  const colorMarca = (restaurante?.color_marca as string) ?? '#9a3f6b';
  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu negocio';

  // ===== Cálculo del rango "hoy" en hora local del servidor =====
  // Usamos UTC para simplicidad. En producción habría que respetar el timezone
  // del restaurante (Bogotá UTC-5).
  const ahora = new Date();
  const inicioHoy = new Date(ahora);
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioHoyIso = inicioHoy.toISOString();
  const ahoraIso = ahora.toISOString();

  // ===== Queries =====

  const [
    pagosHoyResp,
    comandasHoyResp,
    sesionesActivasResp,
    ultimaSesionResp,
    pagosUltimosResp,
  ] = await Promise.all([
    // Pagos confirmados hoy
    supabase
      .from('pagos')
      .select('monto_total, propina, metodo, confirmado_en, sesion_id, sesiones!inner(restaurante_id)')
      .eq('estado', 'confirmado')
      .gte('confirmado_en', inicioHoyIso)
      .lte('confirmado_en', ahoraIso),
    // Comandas no canceladas hoy
    supabase
      .from('comandas')
      .select('id, total', { count: 'exact' })
      .eq('restaurante_id', restauranteId)
      .neq('estado', 'cancelada')
      .gte('creada_en', inicioHoyIso),
    // Sesiones abiertas ahora
    supabase
      .from('sesiones')
      .select('id, mesa_id, mesas(numero)', { count: 'exact' })
      .eq('restaurante_id', restauranteId)
      .eq('estado', 'abierta'),
    // Última sesión cerrada (para "última visita hace X")
    supabase
      .from('sesiones')
      .select('cerrada_en')
      .eq('restaurante_id', restauranteId)
      .eq('estado', 'cerrada')
      .order('cerrada_en', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Últimos 5 pagos (lista reciente)
    supabase
      .from('pagos')
      .select(
        `
        monto_total,
        propina,
        metodo,
        confirmado_en,
        sesion_id,
        sesiones!inner(restaurante_id, mesas(numero))
      `,
      )
      .eq('estado', 'confirmado')
      .order('confirmado_en', { ascending: false })
      .limit(5),
  ]);

  // Filtrar pagos por restaurante (porque la RLS hace JOIN, pero no garantiza
  // restaurante exacto sin filtrar manualmente).
  type PagoRow = {
    monto_total: number;
    propina: number;
    metodo: string;
    confirmado_en: string;
    sesiones:
      | { restaurante_id: string; mesas?: { numero: string } | { numero: string }[] | null }
      | { restaurante_id: string; mesas?: { numero: string } | { numero: string }[] | null }[]
      | null;
  };

  const pagosHoy = ((pagosHoyResp.data ?? []) as PagoRow[])
    .filter((p) => {
      const ses = Array.isArray(p.sesiones) ? p.sesiones[0] : p.sesiones;
      return ses?.restaurante_id === restauranteId;
    });

  const ventasHoy = pagosHoy.reduce((acc, p) => acc + (p.monto_total ?? 0), 0);
  const propinasHoy = pagosHoy.reduce((acc, p) => acc + (p.propina ?? 0), 0);
  const cantidadPagosHoy = pagosHoy.length;
  const ticketPromedio =
    cantidadPagosHoy > 0 ? Math.round(ventasHoy / cantidadPagosHoy) : 0;

  const comandasHoy = comandasHoyResp.count ?? 0;
  const sesionesActivasCount = sesionesActivasResp.count ?? 0;

  const sesionesActivas = ((sesionesActivasResp.data ?? []) as Array<{
    id: string;
    mesa_id: string;
    mesas: { numero: string } | { numero: string }[] | null;
  }>).map((s) => {
    const m = Array.isArray(s.mesas) ? s.mesas[0] : s.mesas;
    return { id: s.id, mesaNumero: m?.numero ?? '?' };
  });

  const ultimaSesionCerrada = ultimaSesionResp.data?.cerrada_en as string | undefined;
  const minutosDesdeUltima = ultimaSesionCerrada
    ? Math.floor((Date.now() - new Date(ultimaSesionCerrada).getTime()) / 60000)
    : null;

  const pagosRecientes = ((pagosUltimosResp.data ?? []) as PagoRow[])
    .filter((p) => {
      const ses = Array.isArray(p.sesiones) ? p.sesiones[0] : p.sesiones;
      return ses?.restaurante_id === restauranteId;
    })
    .map((p) => {
      const ses = Array.isArray(p.sesiones) ? p.sesiones[0] : p.sesiones;
      const mesa = ses?.mesas ? (Array.isArray(ses.mesas) ? ses.mesas[0] : ses.mesas) : null;
      return {
        monto: p.monto_total,
        propina: p.propina,
        metodo: p.metodo,
        confirmadoEn: p.confirmado_en,
        mesaNumero: mesa?.numero ?? '?',
      };
    });

  return (
    <PanelShell currentPage="metricas" nombreNegocio={nombreNegocio}>
      <main className="px-6 sm:px-10 py-10 max-w-5xl mx-auto">
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Métricas
        </h1>
        <p
          className="text-sm mb-8"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Lo que pasa en {nombreNegocio} hoy.
        </p>

        {/* Cards principales */}
        <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
          <CardMetrica
            label="Ventas hoy"
            valor={`$${ventasHoy.toLocaleString('es-CO')}`}
            detalle={
              cantidadPagosHoy > 0
                ? `${cantidadPagosHoy} pago${cantidadPagosHoy === 1 ? '' : 's'} confirmado${cantidadPagosHoy === 1 ? '' : 's'}`
                : 'Sin pagos aún'
            }
            destacado
            colorMarca={colorMarca}
          />
          <CardMetrica
            label="Pedidos hoy"
            valor={comandasHoy}
            detalle={
              comandasHoy === 0 ? 'Sin pedidos aún' : 'comandas no canceladas'
            }
          />
          <CardMetrica
            label="Mesas ocupadas"
            valor={sesionesActivasCount}
            detalle={
              sesionesActivasCount > 0
                ? `Mesas ${sesionesActivas
                    .map((s) => s.mesaNumero)
                    .slice(0, 3)
                    .join(', ')}${sesionesActivasCount > 3 ? '…' : ''}`
                : 'Ninguna abierta'
            }
          />
          <CardMetrica
            label="Última visita"
            valor={
              minutosDesdeUltima === null
                ? '—'
                : minutosDesdeUltima < 1
                  ? 'Recién'
                  : minutosDesdeUltima < 60
                    ? `${minutosDesdeUltima}m`
                    : minutosDesdeUltima < 1440
                      ? `${Math.floor(minutosDesdeUltima / 60)}h`
                      : `${Math.floor(minutosDesdeUltima / 1440)}d`
            }
            detalle={minutosDesdeUltima === null ? 'Sin visitas aún' : 'desde el último cierre'}
          />
        </section>

        {/* Stats secundarias */}
        {cantidadPagosHoy > 0 ? (
          <section
            className="rounded-[var(--radius-lg)] border bg-white p-5 mb-8"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2
              className="text-xs uppercase tracking-[0.14em] mb-3"
              style={{ color: 'var(--color-muted)' }}
            >
              Resumen del día
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[0.7rem]" style={{ color: 'var(--color-muted)' }}>
                  Ticket promedio
                </p>
                <p
                  className="font-[family-name:var(--font-display)] text-2xl mt-0.5"
                  style={{ color: 'var(--color-ink)' }}
                >
                  ${ticketPromedio.toLocaleString('es-CO')}
                </p>
              </div>
              <div>
                <p className="text-[0.7rem]" style={{ color: 'var(--color-muted)' }}>
                  Propinas
                </p>
                <p
                  className="font-[family-name:var(--font-display)] text-2xl mt-0.5"
                  style={{ color: 'var(--color-ink)' }}
                >
                  ${propinasHoy.toLocaleString('es-CO')}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-[0.7rem]" style={{ color: 'var(--color-muted)' }}>
                  Comandas por pago
                </p>
                <p
                  className="font-[family-name:var(--font-display)] text-2xl mt-0.5"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {cantidadPagosHoy > 0
                    ? (comandasHoy / cantidadPagosHoy).toFixed(1)
                    : '—'}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Pagos recientes */}
        {pagosRecientes.length > 0 ? (
          <section>
            <h2
              className="text-xs uppercase tracking-[0.14em] mb-3"
              style={{ color: 'var(--color-muted)' }}
            >
              Últimos pagos
            </h2>
            <div
              className="rounded-[var(--radius-lg)] border bg-white overflow-hidden"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {pagosRecientes.map((p, i) => {
                  const fecha = new Date(p.confirmadoEn);
                  const horaFmt = fecha.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  const fechaFmt = fecha.toLocaleDateString('es-CO', {
                    day: 'numeric',
                    month: 'short',
                  });
                  return (
                    <li
                      key={i}
                      className="px-5 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p
                          className="text-sm"
                          style={{ color: 'var(--color-ink)' }}
                        >
                          Mesa {p.mesaNumero}
                        </p>
                        <p
                          className="text-[0.7rem]"
                          style={{ color: 'var(--color-muted)' }}
                        >
                          {fechaFmt} · {horaFmt} · {etiquetaMetodo(p.metodo)}
                          {p.propina > 0
                            ? ` · propina $${p.propina.toLocaleString('es-CO')}`
                            : ''}
                        </p>
                      </div>
                      <span
                        className="font-[family-name:var(--font-mono)] text-sm shrink-0"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        ${p.monto.toLocaleString('es-CO')}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        ) : null}

        {/* Empty state si no hay nada */}
        {cantidadPagosHoy === 0 && comandasHoy === 0 && sesionesActivasCount === 0 ? (
          <section
            className="rounded-[var(--radius-lg)] border bg-white p-8 text-center"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2
              className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1"
              style={{ color: 'var(--color-ink)' }}
            >
              El día empieza con calma
            </h2>
            <p
              className="text-sm max-w-sm mx-auto"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Cuando lleguen los primeros clientes, aquí verás ventas, pedidos y
              mesas ocupadas en tiempo real.
            </p>
          </section>
        ) : null}
      </main>
    </PanelShell>
  );
}

function CardMetrica({
  label,
  valor,
  detalle,
  destacado,
  colorMarca,
}: {
  label: string;
  valor: string | number;
  detalle: string;
  destacado?: boolean;
  colorMarca?: string;
}) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border p-5"
      style={{
        borderColor: 'var(--color-border)',
        background: destacado ? colorMarca : 'white',
        color: destacado ? 'white' : undefined,
      }}
    >
      <p
        className="text-[0.7rem] uppercase tracking-[0.14em]"
        style={{
          color: destacado ? 'rgba(255,255,255,0.85)' : 'var(--color-muted)',
        }}
      >
        {label}
      </p>
      <p
        className="font-[family-name:var(--font-display)] text-3xl mt-1 tracking-[-0.02em]"
        style={{
          color: destacado ? 'white' : 'var(--color-ink)',
        }}
      >
        {valor}
      </p>
      <p
        className="text-[0.7rem] mt-1"
        style={{
          color: destacado ? 'rgba(255,255,255,0.75)' : 'var(--color-muted)',
        }}
      >
        {detalle}
      </p>
    </div>
  );
}

function etiquetaMetodo(m: string): string {
  switch (m) {
    case 'efectivo':
      return 'efectivo';
    case 'tarjeta':
      return 'tarjeta';
    case 'transferencia':
      return 'transferencia';
    case 'no_seguro':
      return 'sin definir';
    default:
      return m;
  }
}
