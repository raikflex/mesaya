import { notFound, redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { CheckoutProgramarCliente, type DiaCheckout } from './checkout-programar-cliente';
import { diasDomicilioDisponibles } from '../../../../../lib/domicilios-disponibilidad';
import type { HorarioDia } from '../../../../../lib/horarios';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dias?: string }>;
}

export default async function CheckoutProgramarPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { dias: diasParam } = await searchParams;
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('id, nombre_publico, color_marca, logo_url, estado, acepta_domicilios_programados')
    .eq('slug', slug)
    .maybeSingle();

  if (!restaurante || restaurante.estado === 'inactivo') {
    notFound();
  }

  if (!((restaurante.acepta_domicilios_programados as boolean) ?? false)) {
    redirect(`/d/${slug}`);
  }

  const restauranteId = restaurante.id as string;

  const { data: horariosDomRaw } = await supabase
    .from('horarios_domicilios')
    .select('dia_semana, abierto, hora_apertura, hora_cierre')
    .eq('restaurante_id', restauranteId)
    .order('dia_semana', { ascending: true });

  const horariosDom: HorarioDia[] = (horariosDomRaw ?? []).map((h) => ({
    dia_semana: h.dia_semana as number,
    abierto: h.abierto as boolean,
    hora_apertura: (h.hora_apertura as string | null) ?? null,
    hora_cierre: (h.hora_cierre as string | null) ?? null,
  }));

  const disponibles = diasDomicilioDisponibles(horariosDom);
  const fechasPedidas = new Set((diasParam ?? '').split(',').filter(Boolean));

  const dias: DiaCheckout[] = disponibles
    .filter((d) => fechasPedidas.has(d.fecha))
    .map((d) => ({ fecha: d.fecha, nombre: d.nombre, corte: d.corte, esHoy: d.esHoy }));

  if (dias.length === 0) {
    redirect(`/d/${slug}/programar`);
  }

  return (
    <CheckoutProgramarCliente
      slug={slug}
      nombreNegocio={restaurante.nombre_publico as string}
      colorMarca={restaurante.color_marca as string}
      logoUrl={(restaurante.logo_url as string | null) ?? null}
      dias={dias}
    />
  );
}
