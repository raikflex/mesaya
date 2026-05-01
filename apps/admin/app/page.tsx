import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signup');

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!perfil) {
    redirect('/admin/onboarding/paso-1');
  }

  redirect('/admin');
}
