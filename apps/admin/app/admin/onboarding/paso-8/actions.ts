'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
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
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();
  return { supabase, restauranteId: perfil?.restaurante_id ?? null };
}

/* ============ CREAR CUENTA EQUIPO ============ */

const cuentaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Mínimo 2 caracteres')
    .max(80, 'Máximo 80 caracteres'),
  email: z.string().trim().toLowerCase().email('Correo inválido'),
  rol: z.enum(['mesero', 'cocina'], { message: 'Rol inválido' }),
});

export type CrearCuentaState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Partial<Record<'nombre' | 'email' | 'rol', string>>;
  /** Cuando ok: las credenciales generadas para mostrarle al dueño. */
  credenciales?: {
    nombre: string;
    email: string;
    password: string;
    rol: 'mesero' | 'cocina';
  };
};

/**
 * Genera un password temporal legible para que el dueño lo comparta con su equipo.
 * 10 caracteres: 4 letras minúsculas + 4 dígitos + 2 letras minúsculas.
 * Sin caracteres ambiguos (l, 1, 0, o).
 */
function generarPassword(): string {
  const letras = 'abcdefghijkmnpqrstuvwxyz';
  const digitos = '23456789';
  let p = '';
  for (let i = 0; i < 4; i++) p += letras[Math.floor(Math.random() * letras.length)];
  for (let i = 0; i < 4; i++) p += digitos[Math.floor(Math.random() * digitos.length)];
  for (let i = 0; i < 2; i++) p += letras[Math.floor(Math.random() * letras.length)];
  return p;
}

export async function crearCuentaEquipo(
  _prev: CrearCuentaState,
  formData: FormData,
): Promise<CrearCuentaState> {
  const parsed = cuentaSchema.safeParse({
    nombre: formData.get('nombre'),
    email: formData.get('email'),
    rol: formData.get('rol'),
  });

  if (!parsed.success) {
    const fieldErrors: CrearCuentaState['fieldErrors'] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<CrearCuentaState['fieldErrors']>;
      if (key) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return { ok: false, error: 'Tu sesión expiró.' };

  const datos = parsed.data;
  const password = generarPassword();
  const admin = createServiceClient();

  // Crear el usuario en Supabase Auth con email confirmado (sin verificación por correo).
  const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
    email: datos.email,
    password,
    email_confirm: true,
    user_metadata: { nombre: datos.nombre, rol_intencion: datos.rol },
  });

  if (createUserError || !createdUser.user) {
    const msg = createUserError?.message ?? 'Error desconocido';
    if (msg.toLowerCase().includes('already')) {
      return {
        ok: false,
        fieldErrors: { email: 'Ya existe una cuenta con ese correo.' },
      };
    }
    return { ok: false, error: 'No se pudo crear la cuenta. Detalle: ' + msg };
  }

  // Crear el perfil con el rol y el restaurante.
  const { error: perfilError } = await admin.from('perfiles').insert({
    id: createdUser.user.id,
    restaurante_id: restauranteId,
    rol: datos.rol,
    nombre: datos.nombre,
    activo: true,
  });

  if (perfilError) {
    // Rollback: borrar el usuario auth si el perfil falló.
    await admin.auth.admin.deleteUser(createdUser.user.id);
    return {
      ok: false,
      error: 'No se pudo crear el perfil. Detalle: ' + perfilError.message,
    };
  }

  revalidatePath('/admin/onboarding/paso-8');

  return {
    ok: true,
    credenciales: {
      nombre: datos.nombre,
      email: datos.email,
      password,
      rol: datos.rol,
    },
  };
}

/* ============ ELIMINAR CUENTA EQUIPO ============ */

export async function eliminarCuentaEquipo(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  if (!id) return;

  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) return;

  const admin = createServiceClient();

  // Verificar que el perfil sea de este restaurante (defensa en profundidad).
  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, rol')
    .eq('id', id)
    .eq('restaurante_id', restauranteId)
    .maybeSingle();

  if (!perfil) return;

  // No permitir eliminar al dueño.
  if (perfil.rol === 'dueno') return;

  // Borrar el usuario auth — el perfil se borra en cascade vía FK.
  await admin.auth.admin.deleteUser(id);

  revalidatePath('/admin/onboarding/paso-8');
}

/* ============ CERRAR ONBOARDING ============ */

/**
 * No activa el restaurante. El dueño explora /admin con el restaurante en
 * estado='archivado'. Cuando esté listo, hace checkpoint "Empezar trial"
 * desde el panel (a construir en S3).
 */
export async function cerrarOnboarding() {
  const { restauranteId } = await getRestauranteId();
  if (!restauranteId) redirect('/login');

  redirect('/admin');
}
