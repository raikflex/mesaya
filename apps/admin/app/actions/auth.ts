'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';

/* ============ SIGNUP ============ */

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(72, 'Máximo 72 caracteres'),
  nombre: z.string().trim().min(2, 'Escribe tu nombre').max(80),
});

export type SignupState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'email' | 'password' | 'nombre', string>>;
};

export async function signupOwner(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    nombre: formData.get('nombre'),
  });

  if (!parsed.success) {
    const fieldErrors: SignupState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (key === 'email' || key === 'password' || key === 'nombre') {
        fieldErrors[key] = issue.message;
      }
    }
    return { ok: false, fieldErrors };
  }

  const supabase = await createClient();
  const datos = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email: datos.email,
    password: datos.password,
    options: {
      data: { nombre: datos.nombre, rol_intencion: 'dueno' },
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

export async function loginOwner(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
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
