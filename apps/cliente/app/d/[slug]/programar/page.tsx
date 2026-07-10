import { notFound, redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { ProgramarCliente } from './programar-cliente';
import { diasDomicilioDisponibles } from '../../../../lib/domicilios-disponibilidad';
import type { HorarioDia } from '../../../../lib/horarios';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProgramarPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, nombre_publico, color_marca, logo_url, estado, acepta_domicilios_programados')
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado === 'inactivo') {
    notFound();
  }

  // Si el restaurante no tiene domicilios programados activos, no hay nada que
  // hacer aqui: lo devolvemos a la entrada (que decidira a donde llevarlo).
  if (!((restaurante.acepta_domicilios_programados as boolean) ?? false)) {
    redirect(`/d/${slug}`);
  }

  const restauranteId = restaurante.id as string;

  const [{ data: horariosDomRaw }, { data: platosRaw }] = await Promise.all([
    supabase
      .from('horarios_domicilios')
      .select('dia_semana, abierto, hora_apertura, hora_cierre')
      .eq('restaurante_id', restauranteId)
      .order('dia_semana', { ascending: true }),
    supabase
      .from('platos_del_dia')
      .select('fecha, nombre, precio, activo')
      .eq('restaurante_id', restauranteId)
      .eq('activo', true),
  ]);

  const horariosDom: HorarioDia[] = (horariosDomRaw ?? []).map((h) => ({
    dia_semana: h.dia_semana as number,
    abierto: h.abierto as boolean,
    hora_apertura: (h.hora_apertura as string | null) ?? null,
    hora_cierre: (h.hora_cierre as string | null) ?? null,
  }));

  const dias = diasDomicilioDisponibles(horariosDom);

  // Plato del dia por FECHA (solo activos).
  const platosPorFecha: Record<string, { nombre: string; precio: number }> = {};
  for (const p of platosRaw ?? []) {
    platosPorFecha[p.fecha as string] = {
      nombre: p.nombre as string,
      precio: p.precio as number,
    };
  }
  const hayPlatos = (platosRaw ?? []).length > 0;

  return (
    <ProgramarCliente
      slug={slug}
      nombreNegocio={restaurante.nombre_publico as string}
      colorMarca={restaurante.color_marca as string}
      logoUrl={(restaurante.logo_url as string | null) ?? null}
      dias={dias}
      platosPorFecha={platosPorFecha}
      usaPlatoDelDia={hayPlatos}
    />
  );
}
