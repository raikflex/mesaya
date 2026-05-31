'use server';

import { createServiceClient } from '@mesaya/database/service';

export async function enviarReviewExterno(input: {
  pedidoId: string;
  estrellas: number;
  comentario: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.estrellas < 1 || input.estrellas > 5) {
    return { ok: false, error: 'Las estrellas deben ser entre 1 y 5.' };
  }
  const admin = createServiceClient();
  const { data: pedido } = await admin
    .from('pedidos_externos')
    .select('id, estado_entrega, comanda_id')
    .eq('id', input.pedidoId)
    .maybeSingle();
  if (!pedido) {
    return { ok: false, error: 'No encontramos el pedido.' };
  }
  if (pedido.estado_entrega !== 'entregado') {
    return { ok: false, error: 'Solo puedes calificar un pedido entregado.' };
  }
  const { data: comanda } = await admin
    .from('comandas')
    .select('sesion_id')
    .eq('id', pedido.comanda_id)
    .maybeSingle();
  if (!comanda?.sesion_id) {
    return { ok: false, error: 'No pudimos asociar tu resena al pedido.' };
  }
  const { error } = await admin.from('reviews').insert({
    sesion_id: comanda.sesion_id,
    estrellas: input.estrellas,
    comentario:
      input.comentario && input.comentario.trim().length > 0
        ? input.comentario.trim().slice(0, 500)
        : null,
  });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Ya dejaste una resena para este pedido.' };
    }
    return { ok: false, error: 'No pudimos guardar tu resena. Intenta de nuevo.' };
  }
  return { ok: true };
}
