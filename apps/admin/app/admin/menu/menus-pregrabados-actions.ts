'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
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

const crearSchema = z.object({
  nombre: z.string().trim().min(2, 'Minimo 2 caracteres').max(60, 'Maximo 60'),
  canal: z.enum(['restaurante', 'domicilios_diarios', 'domicilios_programados'], {
    message: 'Canal invalido',
  }),
});

export type MenuPregrabadoState = {
  ok: boolean;
  error?: string;
  fieldErrors?: { nombre?: string; canal?: string };
};

/** Crea un menu pregrabado (nombre + canal), inactivo por defecto. */
export async function crearMenuPregrabado(
  _prev: MenuPregrabadoState,
  formData: FormData,
): Promise<MenuPregrabadoState> {
  const parsed = crearSchema.safeParse({
    nombre: formData.get('nombre'),
    canal: formData.get('canal'),
  });
  if (!parsed.success) {
    const fieldErrors: MenuPregrabadoState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<MenuPregrabadoState['fieldErrors']>;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return { ok: false, error: 'Tu sesion expiro.' };

  const admin = createServiceClient();
  const { error } = await admin.from('menus_pregrabados').insert({
    restaurante_id: restauranteId,
    nombre: parsed.data.nombre,
    canal: parsed.data.canal,
    activo: false,
  });

  if (error) return { ok: false, error: 'No se pudo crear: ' + error.message };
  revalidatePath('/admin/menu');
  return { ok: true };
}

export async function renombrarMenuPregrabado(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const nombre = String(formData.get('nombre') ?? '').trim();
  if (!id || nombre.length < 2 || nombre.length > 60) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();
  await admin
    .from('menus_pregrabados')
    .update({ nombre, actualizado_en: new Date().toISOString() })
    .eq('id', id)
    .eq('restaurante_id', restauranteId);

  revalidatePath('/admin/menu');
}

export async function eliminarMenuPregrabado(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();
  // El cascade borra tambien las filas de menu_pregrabado_productos.
  await admin.from('menus_pregrabados').delete().eq('id', id).eq('restaurante_id', restauranteId);

  revalidatePath('/admin/menu');
}

/** Activa o desactiva un menu. Al activar, desactiva los otros del mismo canal. */
export async function toggleMenuActivo(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const activar = String(formData.get('activar') ?? '') === 'true';
  if (!id) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();
  const { data: menu } = await admin
    .from('menus_pregrabados')
    .select('canal')
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .maybeSingle();
  if (!menu) return;

  const ahora = new Date().toISOString();

  if (activar) {
    // Desactivar los otros del mismo canal primero (solo uno activo por canal).
    await admin
      .from('menus_pregrabados')
      .update({ activo: false, actualizado_en: ahora })
      .eq('restaurante_id', restauranteId)
      .eq('canal', menu.canal as string);
    await admin
      .from('menus_pregrabados')
      .update({ activo: true, actualizado_en: ahora })
      .eq('id', id)
      .eq('restaurante_id', restauranteId);
  } else {
    await admin
      .from('menus_pregrabados')
      .update({ activo: false, actualizado_en: ahora })
      .eq('id', id)
      .eq('restaurante_id', restauranteId);
  }

  revalidatePath('/admin/menu');
}

export async function agregarProductoAMenu(formData: FormData) {
  const menuId = String(formData.get('menu_id') ?? '');
  const productoId = String(formData.get('producto_id') ?? '');
  if (!menuId || !productoId) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();
  // Verificar que el menu y el producto son de este restaurante.
  const { data: menu } = await admin
    .from('menus_pregrabados')
    .select('id')
    .eq('id', menuId)
    .eq('restaurante_id', restauranteId)
    .maybeSingle();
  if (!menu) return;

  const { data: prod } = await admin
    .from('productos')
    .select('id')
    .eq('id', productoId)
    .eq('restaurante_id', restauranteId)
    .maybeSingle();
  if (!prod) return;

  await admin
    .from('menu_pregrabado_productos')
    .upsert({ menu_id: menuId, producto_id: productoId, orden: 0 }, { onConflict: 'menu_id,producto_id' });

  revalidatePath('/admin/menu');
}

export async function quitarProductoDeMenu(formData: FormData) {
  const menuId = String(formData.get('menu_id') ?? '');
  const productoId = String(formData.get('producto_id') ?? '');
  if (!menuId || !productoId) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();
  const { data: menu } = await admin
    .from('menus_pregrabados')
    .select('id')
    .eq('id', menuId)
    .eq('restaurante_id', restauranteId)
    .maybeSingle();
  if (!menu) return;

  await admin
    .from('menu_pregrabado_productos')
    .delete()
    .eq('menu_id', menuId)
    .eq('producto_id', productoId);

  revalidatePath('/admin/menu');
}
