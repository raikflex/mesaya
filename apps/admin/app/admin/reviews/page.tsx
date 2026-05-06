import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { PanelShell } from '../../_components/panel-shell';
import { ReviewsManager, type ReviewFila } from './reviews-manager';

export const dynamic = 'force-dynamic';

export default async function ReviewsPage() {
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

  if (!perfil) redirect('/login');

  const rol = String(perfil.rol).toLowerCase().trim();
  if (rol !== 'dueno' && rol !== 'dueño' && rol !== 'admin') {
    redirect('/admin');
  }

  const restauranteId = perfil.restaurante_id as string;

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico, color_marca')
    .eq('id', restauranteId)
    .maybeSingle();

  const colorMarca = (restaurante?.color_marca as string) ?? '#9a3f6b';
  const nombreNegocio = (restaurante?.nombre_publico as string) ?? 'Tu negocio';

  const { data: reviewsRaw } = await supabase
    .from('reviews')
    .select(
      `
      id,
      estrellas,
      comentario,
      creada_en,
      sesion_id,
      sesiones!inner (
        id,
        total_facturado,
        cerrada_en,
        restaurante_id,
        mesas (numero)
      )
    `,
    )
    .order('creada_en', { ascending: false });

  const reviews: ReviewFila[] = ((reviewsRaw ?? []) as unknown as Array<{
    id: string;
    estrellas: number;
    comentario: string | null;
    creada_en: string;
    sesion_id: string;
    sesiones: {
      total_facturado: number | null;
      cerrada_en: string | null;
      restaurante_id: string;
      mesas: { numero: string } | { numero: string }[] | null;
    } | Array<{
      total_facturado: number | null;
      cerrada_en: string | null;
      restaurante_id: string;
      mesas: { numero: string } | { numero: string }[] | null;
    }>;
  }>)
    .map((r) => {
      const sesion = Array.isArray(r.sesiones) ? r.sesiones[0] : r.sesiones;
      if (!sesion || sesion.restaurante_id !== restauranteId) return null;
      const mesa = Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas;
      return {
        id: r.id,
        estrellas: r.estrellas,
        comentario: r.comentario,
        creadaEn: r.creada_en,
        mesaNumero: mesa?.numero ?? '?',
        totalFacturado: sesion.total_facturado ?? 0,
      };
    })
    .filter((r): r is ReviewFila => r !== null);

  return (
    <PanelShell currentPage="reviews" nombreNegocio={nombreNegocio}>
      <ReviewsManager
        reviews={reviews}
        colorMarca={colorMarca}
        nombreNegocio={nombreNegocio}
      />
    </PanelShell>
  );
}
