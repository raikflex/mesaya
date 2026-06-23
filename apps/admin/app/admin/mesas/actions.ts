'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

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

/* ============ AGREGAR MESAS (bulk) ============ */

const agregarSchema = z.object({
  cantidad: z.coerce
    .number()
    .int('Debe ser un numero entero')
    .min(1, 'Minimo 1 mesa')
    .max(50, 'Maximo 50 mesas a la vez'),
});

export type AgregarMesasState = {
  ok: boolean;
  error?: string;
  fieldErrors?: { cantidad?: string };
};

export async function agregarMesas(
  _prev: AgregarMesasState,
  formData: FormData,
): Promise<AgregarMesasState> {
  const parsed = agregarSchema.safeParse({ cantidad: formData.get('cantidad') });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: { cantidad: parsed.error.issues[0]?.message },
    };
  }

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return { ok: false, error: 'Tu sesion expiro.' };

  // Calcular el siguiente numero mirando SOLO las mesas activas (no borradas).
  // Asi, si el dueno borra todas las mesas y crea nuevas, la numeracion
  // reinicia desde 1. Es seguro reusar numeros porque las comandas y sesiones
  // se ligan por mesa_id (id unico de cada mesa), no por el numero visible:
  // la "Mesa 1" vieja y la nueva son registros distintos con ids distintos,
  // asi que el historico no se mezcla.
  const { data: existentes } = await supabase
    .from('mesas')
    .select('numero')
    .eq('restaurante_id', restauranteId)
    .is('borrada_en', null);

  const numerosExistentes = (existentes ?? [])
    .map((m) => parseInt(m.numero as string, 10))
    .filter((n) => !Number.isNaN(n));

  const ultimoNumero = numerosExistentes.length > 0 ? Math.max(...numerosExistentes) : 0;

  const filas = Array.from({ length: parsed.data.cantidad }, (_, i) => ({
    restaurante_id: restauranteId,
    numero: String(ultimoNumero + i + 1),
    capacidad: 4,
    activa: true,
  }));

  const { error } = await supabase.from('mesas').insert(filas);
  if (error) {
    return { ok: false, error: 'No pudimos agregar las mesas. ' + error.message };
  }

  revalidatePath('/admin/mesas');
  return { ok: true };
}

/* ============ ACTUALIZAR CAPACIDAD ============ */

export async function actualizarCapacidad(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const capacidad = parseInt(String(formData.get('capacidad') ?? ''), 10);
  if (!id || Number.isNaN(capacidad) || capacidad < 1 || capacidad > 30) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase
    .from('mesas')
    .update({ capacidad })
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .is('borrada_en', null);

  revalidatePath('/admin/mesas');
}

/* ============ ACTUALIZAR NUMERO ============ */

/**
 * Permite al dueno cambiar el numero (o etiqueta) de una mesa.
 * Acepta numeros ("1", "2") o nombres ("Terraza", "Barra 3").
 * No permite repetir el numero de otra mesa activa del mismo restaurante.
 */
export async function actualizarNumero(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const numero = String(formData.get('numero') ?? '').trim();
  if (!id || numero.length === 0 || numero.length > 20) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  // Verificar que no exista otra mesa activa con el mismo numero.
  const { data: repetida } = await supabase
    .from('mesas')
    .select('id')
    .eq('restaurante_id', restauranteId)
    .eq('numero', numero)
    .is('borrada_en', null)
    .neq('id', id)
    .maybeSingle();

  if (repetida) {
    // Ya hay otra mesa con ese numero: no hacemos el cambio.
    return;
  }

  await supabase
    .from('mesas')
    .update({ numero })
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .is('borrada_en', null);

  revalidatePath('/admin/mesas');
}

/* ============ TOGGLE ACTIVA ============ */

export async function toggleActiva(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  const activarRaw = String(formData.get('activar') ?? '');
  const activar = activarRaw === 'true';
  if (!id) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase
    .from('mesas')
    .update({ activa: activar })
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .is('borrada_en', null);

  revalidatePath('/admin/mesas');
}

/* ============ ELIMINAR (soft delete con borrada_en) ============ */

/**
 * Hard-delete-equivalente desde el punto de vista del dueno: la mesa
 * desaparece del panel, de los QRs y de cualquier query que filtre
 * por `borrada_en IS NULL`. En la BD se conserva con timestamp
 * `borrada_en` para preservar el historico de comandas, sesiones y
 * resenas asociadas (necesario para reportes y metricas).
 *
 * Tambien seteamos activa=false para defensa en profundidad: cualquier
 * query vieja que solo mire `activa` tambien filtra esta mesa.
 *
 * La numeracion de mesas NUEVAS se calcula mirando solo las activas
 * (ver agregarMesas), asi que despues de borrar, los numeros se pueden
 * reusar sin mezclar el historico (las comandas se ligan por mesa_id).
 */
export async function eliminarMesa(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { supabase, restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  await supabase
    .from('mesas')
    .update({ borrada_en: new Date().toISOString(), activa: false })
    .eq('id', id)
    .eq('restaurante_id', restauranteId);

  revalidatePath('/admin/mesas');
}

/* ============ ATAJO: DESCARGAR PDF ============ */

export async function descargarPDF() {
  redirect('/api/qrs-pdf');
}
