'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

export type RolStaff = 'dueno' | 'mesero' | 'domiciliario' | 'cocina' | 'lavaplatos';

const ROLES_VALIDOS: RolStaff[] = ['dueno', 'mesero', 'domiciliario', 'cocina', 'lavaplatos'];

// Verifica que quien llama es dueno y que el perfil objetivo es de su mismo
// restaurante. Devuelve el restauranteId si todo ok.
async function validarDuenoSobrePerfil(
  perfilId: string,
): Promise<{ ok: true; restauranteId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No tienes sesion activa.' };

  const { data: yo } = await supabase
    .from('perfiles')
    .select('rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();
  if (!yo) return { ok: false, error: 'No encontramos tu perfil.' };
  if (String(yo.rol).toLowerCase().trim() !== 'dueno') {
    return { ok: false, error: 'Solo el dueno puede cambiar roles.' };
  }

  const admin = createServiceClient();
  const { data: objetivo } = await admin
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', perfilId)
    .maybeSingle();
  if (!objetivo || objetivo.restaurante_id !== yo.restaurante_id) {
    return { ok: false, error: 'Ese miembro no es de tu restaurante.' };
  }

  return { ok: true, restauranteId: yo.restaurante_id as string };
}

// Agrega un rol a un miembro del staff.
export async function agregarRol(input: {
  perfilId: string;
  rol: RolStaff;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!ROLES_VALIDOS.includes(input.rol)) {
    return { ok: false, error: 'Rol invalido.' };
  }
  const guard = await validarDuenoSobrePerfil(input.perfilId);
  if (!guard.ok) return guard;

  const admin = createServiceClient();
  const { error } = await admin
    .from('perfil_roles')
    .insert({ perfil_id: input.perfilId, rol: input.rol });

  // Si ya existe (PK duplicada), lo tratamos como exito silencioso.
  if (error && !error.message.includes('duplicate')) {
    return { ok: false, error: 'No pudimos agregar el rol. Intenta de nuevo.' };
  }

  revalidatePath('/admin/equipo');
  return { ok: true };
}

// Quita un rol a un miembro. No deja a nadie sin ningun rol.
export async function quitarRol(input: {
  perfilId: string;
  rol: RolStaff;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const guard = await validarDuenoSobrePerfil(input.perfilId);
  if (!guard.ok) return guard;

  const admin = createServiceClient();

  // No permitir quitar el ultimo rol (dejaria al miembro sin acceso a nada).
  const { data: rolesActuales } = await admin
    .from('perfil_roles')
    .select('rol')
    .eq('perfil_id', input.perfilId);
  if ((rolesActuales ?? []).length <= 1) {
    return { ok: false, error: 'No puedes quitar el ultimo rol. Asigna otro primero.' };
  }

  const { error } = await admin
    .from('perfil_roles')
    .delete()
    .eq('perfil_id', input.perfilId)
    .eq('rol', input.rol);
  if (error) {
    return { ok: false, error: 'No pudimos quitar el rol. Intenta de nuevo.' };
  }

  revalidatePath('/admin/equipo');
  return { ok: true };
}
