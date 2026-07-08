'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

async function getRestauranteId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, restauranteId: null as string | null };
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();
  if (perfil?.rol !== 'dueno') return { supabase, restauranteId: null };
  return { supabase, restauranteId: perfil?.restaurante_id ?? null };
}

const CANALES = ['restaurante', 'domicilios_diarios', 'domicilios_programados'];

/**
 * Asigna un menu pregrabado a un dia de un canal.
 * dia_semana: 0..6 (dom..sab) o -1 ("Por defecto").
 * Si menu_id llega vacio, quita la asignacion de ese dia (menu normal).
 */
export async function asignarMenuDia(formData: FormData) {
  const canal = String(formData.get('canal') ?? '');
  const dia = parseInt(String(formData.get('dia_semana') ?? ''), 10);
  const menuId = String(formData.get('menu_id') ?? '');
  if (!CANALES.includes(canal)) return;
  if (Number.isNaN(dia) || dia < -1 || dia > 6) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();

  if (!menuId) {
    // "Menu normal": quitar la asignacion de ese dia/canal.
    await admin
      .from('menu_dia_asignacion')
      .delete()
      .eq('restaurante_id', restauranteId)
      .eq('canal', canal)
      .eq('dia_semana', dia);
    revalidatePath('/admin/menu');
    return;
  }

  // El menu debe ser de este restaurante y del mismo canal.
  const { data: menu } = await admin
    .from('menus_pregrabados')
    .select('id, canal')
    .eq('id', menuId)
    .eq('restaurante_id', restauranteId)
    .maybeSingle();
  if (!menu || menu.canal !== canal) return;

  await admin.from('menu_dia_asignacion').upsert(
    {
      restaurante_id: restauranteId,
      canal,
      dia_semana: dia,
      menu_id: menuId,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: 'restaurante_id,canal,dia_semana' },
  );

  revalidatePath('/admin/menu');
}
