import { redirect } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { BusinessInfoForm } from './business-info-form';
export const metadata = { title: 'Paso 1 · Datos del negocio' };
export default async function Paso1Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/signup');
  const { data: perfil } = await supabase
    .from('perfiles')
    .select('restaurante_id, nombre')
    .eq('id', user.id)
    .maybeSingle();
  const initial = perfil?.restaurante_id
    ? (
        await supabase
          .from('restaurantes')
          .select('nombre_publico, nit, direccion, color_marca, modo_cocina')
          .eq('id', perfil.restaurante_id)
          .single()
      ).data
    : null;
  return (
    <main className="px-6 sm:px-10 py-10 sm:py-14 max-w-3xl mx-auto">
      <header className="mb-10">
        <p
          className="text-xs uppercase tracking-[0.16em] mb-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Paso 1 de 8
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl tracking-[-0.025em] leading-[1.05]"
          style={{ color: 'var(--color-ink)' }}
        >
          Cuentanos del{' '}
          <em className="not-italic" style={{ fontStyle: 'italic', fontWeight: 400 }}>
            negocio
          </em>
          .
        </h1>
        <p
          className="mt-4 text-[0.95rem] leading-relaxed max-w-xl"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Esto es lo que vera tu cliente cuando escanee el QR de la mesa. Lo puedes cambiar despues.
        </p>
      </header>
      <BusinessInfoForm
        initial={
          initial ?? {
            nombre_publico: '',
            nit: null,
            direccion: null,
            color_marca: '#c0432e',
            modo_cocina: 'sin_pantalla',
          }
        }
        nombreDueno={perfil?.nombre ?? null}
      />
    </main>
  );
}
