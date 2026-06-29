'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

export type HorarioDomicilioInput = {
  dia_semana: number;
  abierto: boolean;
  hora_apertura: string | null;
  hora_cierre: string | null;
};

const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
function nombreDia(n: number): string {
  return NOMBRES_DIA[n] ?? `Dia ${n}`;
}

export type ActualizarHorariosDomiciliosResultado = { ok: true } | { ok: false; error: string };

/**
 * Guarda los 7 dias del horario de DOMICILIOS del restaurante del dueno.
 * La hora_cierre de cada dia es la hora de corte (hasta cuando se puede
 * programar un domicilio para ese dia).
 *
 * Usa service client para el upsert porque las RLS de horarios_domicilios
 * solo permiten lectura publica (igual que horarios_atencion).
 */
export async function actualizarHorariosDomicilios(
  horarios: HorarioDomicilioInput[],
): Promise<ActualizarHorariosDomiciliosResultado> {
  if (!Array.isArray(horarios) || horarios.length !== 7) {
    return { ok: false, error: 'Se esperan exactamente 7 dias.' };
  }

  const diasVistos = new Set<number>();
  for (const h of horarios) {
    if (typeof h.dia_semana !== 'number' || h.dia_semana < 0 || h.dia_semana > 6) {
      return { ok: false, error: `dia_semana invalido: ${h.dia_semana}` };
    }
    if (diasVistos.has(h.dia_semana)) {
      return { ok: false, error: `dia_semana duplicado: ${h.dia_semana}` };
    }
    diasVistos.add(h.dia_semana);

    if (h.abierto) {
      if (!h.hora_apertura || !h.hora_cierre) {
        return {
          ok: false,
          error: `${nombreDia(h.dia_semana)}: necesita hora de inicio y hora de corte.`,
        };
      }
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(h.hora_apertura)) {
        return { ok: false, error: `${nombreDia(h.dia_semana)}: hora de inicio invalida.` };
      }
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(h.hora_cierre)) {
        return { ok: false, error: `${nombreDia(h.dia_semana)}: hora de corte invalida.` };
      }
      if (h.hora_apertura === h.hora_cierre) {
        return {
          ok: false,
          error: `${nombreDia(h.dia_semana)}: inicio y corte no pueden ser iguales.`,
        };
      }
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado.' };

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id || perfil.rol !== 'dueno') {
    return { ok: false, error: 'Solo el dueno puede editar horarios.' };
  }

  const admin = createServiceClient();
  const filas = horarios.map((h) => ({
    restaurante_id: perfil.restaurante_id as string,
    dia_semana: h.dia_semana,
    abierto: h.abierto,
    hora_apertura: h.abierto ? h.hora_apertura : null,
    hora_cierre: h.abierto ? h.hora_cierre : null,
  }));

  const { error } = await admin
    .from('horarios_domicilios')
    .upsert(filas, { onConflict: 'restaurante_id,dia_semana' });

  if (error) {
    return { ok: false, error: 'No pudimos guardar el cambio: ' + error.message };
  }

  revalidatePath('/admin/horarios');
  revalidatePath('/admin');
  return { ok: true };
}
