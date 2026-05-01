'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@mesaya/database/server';
import { createServiceClient } from '@mesaya/database/service';

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .max(72, 'Máximo 72 caracteres'),
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

  // 1. Crear cuenta. Como el cliente usa anon auth, los dueños SIEMPRE entran
  //    por aquí (signUp normal con email/password).
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { nombre_completo: parsed.data.nombre, rol_intencion: 'dueno' },
    },
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data.user) {
    return { ok: false, error: 'No se pudo crear la cuenta. Intenta de nuevo.' };
  }

  // 2. Crear perfil con rol=dueno y restaurante_id=null.
  //    Usamos el service client a propósito:
  //    - Si tu proyecto Supabase tiene "Confirm email" activado, signUp NO
  //      devuelve sesión, así que el cliente auth-bound vería auth.uid()=null
  //      y el INSERT con RLS fallaría.
  //    - Si tienes un trigger on_auth_user_created que ya crea el perfil,
  //      este upsert es idempotente y no hace daño.
  //    Mantener este path único cubre ambos casos sin ramificar.
  const admin = createServiceClient();
  const { error: perfilError } = await admin.from('perfiles').upsert(
    {
      id: data.user.id,
      rol: 'dueno',
      nombre_completo: parsed.data.nombre,
      restaurante_id: null,
    },
    { onConflict: 'id' },
  );

  if (perfilError) {
    return {
      ok: false,
      error:
        'Tu cuenta se creó pero no pudimos guardar el perfil. ' +
        'Escríbenos a soporte. Detalle: ' +
        perfilError.message,
    };
  }

  // 3. Si Supabase tiene confirmación de correo activada, data.session será null
  //    y el usuario tendrá que confirmar antes de seguir. Para MVP en demo es
  //    cómodo dejarla apagada. Manejamos ambos casos:
  if (!data.session) {
    return {
      ok: true,
      error:
        'Cuenta creada. Te enviamos un correo para confirmar antes de continuar.',
    };
  }

  redirect('/admin/onboarding/paso-1');
}
