'use server';

import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

/**
 * Server actions para gestionar las suscripciones push de los usuarios staff.
 *
 * - guardarSuscripcionPush: crea o actualiza una suscripcion (upsert por endpoint).
 *   El rol y restaurante_id se derivan del perfil del usuario autenticado, no se
 *   pasan desde el cliente (mas seguro).
 *
 * - eliminarSuscripcionPush: borra una suscripcion por endpoint, solo si pertenece
 *   al usuario autenticado.
 */

export type ResultadoSuscripcion = { ok: true } | { ok: false; error: string };

export async function guardarSuscripcionPush(input: {
  endpoint: string;
  p256dh: string;
  authKey: string;
  deviceLabel?: string | null;
}): Promise<ResultadoSuscripcion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) {
    return { ok: false, error: 'Perfil sin restaurante.' };
  }

  const rol = perfil.rol as string;
  if (!['mesero', 'cocina', 'dueno'].includes(rol)) {
    return { ok: false, error: 'Rol no autorizado para push.' };
  }

  const admin = createServiceClient();

  // Upsert por endpoint: si ya existe, actualizar keys + timestamps.
  // Si no existe, insertar nuevo. Reactiva las marcadas como invalidas.
  const { error } = await admin.from('push_subscriptions').upsert(
    {
      usuario_id: user.id,
      restaurante_id: perfil.restaurante_id as string,
      rol,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth_key: input.authKey,
      device_label: input.deviceLabel ?? null,
      usada_en: new Date().toISOString(),
      invalida_en: null,
    },
    { onConflict: 'endpoint' },
  );

  if (error) {
    return { ok: false, error: 'No se pudo guardar: ' + error.message };
  }

  return { ok: true };
}

export async function eliminarSuscripcionPush(input: {
  endpoint: string;
}): Promise<ResultadoSuscripcion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const admin = createServiceClient();

  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', input.endpoint)
    .eq('usuario_id', user.id);

  if (error) {
    return { ok: false, error: 'No se pudo eliminar: ' + error.message };
  }

  return { ok: true };
}
