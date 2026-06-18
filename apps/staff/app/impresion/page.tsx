import { createClient } from '@mesaya/database/server';
import { obtenerPerfilStaff } from '../../lib/auth-server';
import { EstacionImpresion } from './estacion-impresion';

export const dynamic = 'force-dynamic';

export default async function ImpresionPage() {
  // La estacion de impresion la usa la cuenta de cocina (es quien esta
  // junto a la impresora). Reutilizamos el mismo gate de rol que la cocina.
  const perfil = await obtenerPerfilStaff('cocina');
  const supabase = await createClient();

  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('nombre_publico')
    .eq('id', perfil.restauranteId)
    .maybeSingle();

  return (
    <EstacionImpresion
      restauranteNombre={(restaurante?.nombre_publico as string) ?? perfil.restauranteNombre}
      restauranteId={perfil.restauranteId}
    />
  );
}
