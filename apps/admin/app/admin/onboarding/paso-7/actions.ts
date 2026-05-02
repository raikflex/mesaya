'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

export async function avanzarAPaso8() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil?.restaurante_id) redirect('/admin/onboarding/paso-1');

  // Validar que tenga al menos 1 mesa antes de avanzar.
  const { count } = await supabase
    .from('mesas')
    .select('*', { count: 'exact', head: true })
    .eq('restaurante_id', perfil.restaurante_id as string);

  if (!count || count < 1) return;

  redirect('/admin/onboarding/paso-8');
}
