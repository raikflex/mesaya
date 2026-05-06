'use server';

import { createClient } from '@mesaya/database/server';

export type EnviarReviewResultado =
  | { ok: true }
  | { ok: false; error: string };

export async function enviarReview(input: {
  sesionId: string;
  estrellas: number;
  comentario: string | null;
}): Promise<EnviarReviewResultado> {
  if (input.estrellas < 1 || input.estrellas > 5) {
    return { ok: false, error: 'Las estrellas deben ser entre 1 y 5.' };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'No tienes sesión activa.' };
  }

  // Verificar que el cliente es miembro de esta sesión.
  const { data: membresia } = await supabase
    .from('sesion_clientes')
    .select('id')
    .eq('sesion_id', input.sesionId)
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!membresia) {
    return {
      ok: false,
      error: 'No formaste parte de esta sesión, no puedes dejar reseña.',
    };
  }

  // Validar que no haya ya una review de esta sesión por este cliente.
  // (La RLS también lo protege, pero es mejor avisar antes.)
  const { error } = await supabase.from('reviews').insert({
    sesion_id: input.sesionId,
    estrellas: input.estrellas,
    comentario: input.comentario && input.comentario.trim().length > 0
      ? input.comentario.trim().slice(0, 500)
      : null,
  });

  if (error) {
    if (error.code === '23505') {
      // unique violation
      return { ok: false, error: 'Ya dejaste una reseña para esta visita.' };
    }
    return { ok: false, error: 'No pudimos guardar tu reseña. ' + error.message };
  }

  return { ok: true };
}
