'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

/* ============ SIGNUP ============ */
const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo invÃ¡lido'),
  password: z.string().min(8, 'MÃ­nimo 8 caracteres').max(72, 'MÃ¡ximo 72 caracteres'),
  nombre: z.string().trim().min(2, 'Escribe tu nombre').max(80),
  acepta_datos: z.literal('on', {
    errorMap: () => ({ message: 'Debes autorizar el tratamiento de datos para continuar.' }),
  }),
});

export type SignupState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'email' | 'password' | 'nombre' | 'acepta_datos', string>>;
};

export async function signupOwner(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    nombre: formData.get('nombre'),
    acepta_datos: formData.get('acepta_datos'),
  });

  if (!parsed.success) {
    const fieldErrors: SignupState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'password' || key === 'nombre' || key === 'acepta_datos') {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const datos = parsed.data;

  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signUp({
    email: datos.email,
    password: datos.password,
    options: {
      data: { nombre: datos.nombre, rol_intencion: 'dueno' },
      emailRedirectTo: `${baseUrl}/auth/callback?next=/admin/onboarding/paso-1`,
    },
  });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: 'No se pudo crear la cuenta. Intenta de nuevo.' };

  if (!data.session) {
    return {
      ok: true,
      error: 'Cuenta creada. Te enviamos un correo para confirmar antes de continuar.',
    };
  }

  redirect('/admin/onboarding/paso-1');
}

/* ============ LOGIN ============ */
const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});

export type LoginState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'email' | 'password', string>>;
};

export async function loginOwner(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: LoginState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'password') {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const datos = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({
    email: datos.email,
    password: datos.password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('invalid')) {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
    return { ok: false, error: error.message };
  }

  redirect('/');
}

/* ============ LOGOUT ============ */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/* ============ FORGOT PASSWORD (envío de email con link de reset) ============ */
const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
});

export type ForgotState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'email', string>>;
};

export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = forgotSchema.safeParse({
    email: formData.get('email'),
  });

  if (!parsed.success) {
    const fieldErrors: ForgotState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === 'email') {
        fieldErrors.email = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const baseUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/auth/callback?next=/reset-password`,
  });

  // Siempre devolvemos ok para evitar enumeración de emails
  if (error) {
    console.error('resetPasswordForEmail error:', error.message);
  }

  return { ok: true };
}

/* ============ UPDATE PASSWORD (set new password una vez logueado) ============ */
const updatePasswordSchema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
});

export type UpdatePasswordState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'password', string>>;
};

export async function updatePassword(
  _prev: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
  });

  if (!parsed.success) {
    const fieldErrors: UpdatePasswordState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === 'password') {
        fieldErrors.password = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ok: false, error: error.message };
  }

  redirect('/admin');
}
