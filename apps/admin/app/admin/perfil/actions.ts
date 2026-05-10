'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

/* ============ UPDATE PERFIL (nombre + email) ============ */

const perfilSchema = z.object({
  nombre: z.string().trim().min(2, 'Mínimo 2 caracteres').max(80, 'Máximo 80 caracteres'),
  email: z.string().trim().toLowerCase().email('Correo inválido'),
});

export type UpdatePerfilState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'nombre' | 'email', string>>;
  /** Email pendiente de confirmación si lo cambió */
  emailChangePending?: string;
};

export async function updatePerfil(
  _prev: UpdatePerfilState,
  formData: FormData,
): Promise<UpdatePerfilState> {
  const parsed = perfilSchema.safeParse({
    nombre: formData.get('nombre'),
    email: formData.get('email'),
  });

  if (!parsed.success) {
    const fieldErrors: UpdatePerfilState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'nombre' || key === 'email') {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Tu sesión expiró.' };

  const datos = parsed.data;
  let emailChangePending: string | undefined;

  // 1) Si cambió el nombre, update en perfiles
  const { data: perfilActual } = await supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', user.id)
    .maybeSingle();

  if (perfilActual && perfilActual.nombre !== datos.nombre) {
    const { error: updateError } = await supabase
      .from('perfiles')
      .update({ nombre: datos.nombre })
      .eq('id', user.id);

    if (updateError) {
      return {
        ok: false,
        error: 'No se pudo actualizar el nombre. ' + updateError.message,
      };
    }
  }

  // 2) Si cambió el email, disparar flujo de confirmación de Supabase
  if (user.email !== datos.email) {
    const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3000';

    const { error: emailError } = await supabase.auth.updateUser(
      { email: datos.email },
      { emailRedirectTo: `${baseUrl}/auth/callback?next=/admin/perfil` },
    );

    if (emailError) {
      return {
        ok: false,
        error: 'No se pudo iniciar el cambio de email. ' + emailError.message,
      };
    }

    emailChangePending = datos.email;
  }

  revalidatePath('/admin/perfil');
  return { ok: true, emailChangePending };
}

/* ============ TRIGGER PASSWORD RESET (usuario actual) ============ */

export type TriggerResetState = {
  ok: boolean;
  error?: string;
  email?: string;
};

export async function triggerPasswordReset(
  _prev: TriggerResetState,
  _formData: FormData,
): Promise<TriggerResetState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return { ok: false, error: 'Tu sesión expiró.' };
  }

  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { ok: false, error: 'No se pudo enviar el email. ' + error.message };
  }

  return { ok: true, email: user.email };
}