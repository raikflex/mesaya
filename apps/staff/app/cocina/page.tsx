import { createClient } from '@mesaya/database/server';
import { obtenerPerfilStaff } from '../../lib/auth-server';
import { TableroCocina, type ComandaCocina } from './tablero-cocina';
import { CocinaInactiva } from './cocina-inactiva';

export const dynamic = 'force-dynamic';

/**
 * Tablero de cocina.
 * - Carga las comandas del día con estados activos (pendiente, en_preparacion, lista).
 * - Las que están en estado 'entregada' o 'cancelada' no se muestran (ya cerraron su ciclo).
 * - El client component se encarga del realtime y del cambio de estados.
 *
 * NUEVO en S10: si el restaurante tiene `cocina_activa = false`, esta pantalla
 * muestra un mensaje explicando que el dueño desactivó la pantalla de cocina.
 * El cocinero no debe ver pedidos que el mesero está manejando manualmente.
 */
export default async function CocinaPage() {
  const perfil = await obtenerPerfilStaff('cocina');
  const supabase = await createClient();

  // Verificar si la pantalla de cocina está activa
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('cocina_activa, nombre_publico, color_marca')
    .eq('id', perfil.restauranteId)
    .maybeSingle();

  const cocinaActiva = (restaurante?.cocina_activa as boolean) ?? false;

  if (!cocinaActiva) {
    return (
      <CocinaInactiva
        nombreNegocio={(restaurante?.nombre_publico as string) ?? perfil.restauranteNombre}
        colorMarca={(restaurante?.color_marca as string) ?? perfil.restauranteColor}
        nombreCocinero={perfil.nombre}
      />
    );
  }

  // Filtrar comandas del día actual del restaurante.
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  const { data: comandasRaw } = await supabase
    .from('comandas')
    .select(
      `
      id,
      numero_diario,
      estado,
      total,
      creada_en,
      sesion_id,
      sesion_clientes (nombre),
      sesiones (
        mesas (numero)
      )
    `,
    )
    .eq('restaurante_id', perfil.restauranteId)
    .in('estado', ['pendiente', 'en_preparacion', 'lista'])
    .gte('creada_en', inicioDia.toISOString())
    .order('creada_en', { ascending: true });

  const comandasArr = (comandasRaw ?? []) as {
    id: string;
    numero_diario: number;
    estado: string;
    total: number;
    creada_en: string;
    sesion_id: string;
    sesion_clientes: { nombre: string } | { nombre: string }[] | null;
    sesiones:
      | { mesas: { numero: string } | { numero: string }[] | null }
      | { mesas: { numero: string } | { numero: string }[] | null }[]
      | null;
  }[];

  let comandas: ComandaCocina[] = [];
  if (comandasArr.length > 0) {
    const comandaIds = comandasArr.map((c) => c.id);
    const { data: itemsRaw } = await supabase
      .from('comanda_items')
      .select('id, comanda_id, nombre_snapshot, precio_snapshot, cantidad, nota')
      .in('comanda_id', comandaIds)
      .order('id', { ascending: true });

    const itemsPorComanda = new Map<string, ComandaCocina['items']>();
    for (const c of comandasArr) {
      itemsPorComanda.set(c.id, []);
    }
    for (const it of itemsRaw ?? []) {
      const arr = itemsPorComanda.get(it.comanda_id as string);
      if (arr) {
        arr.push({
          id: it.id as string,
          nombre: it.nombre_snapshot as string,
          cantidad: it.cantidad as number,
          nota: (it.nota as string) ?? null,
        });
      }
    }

    comandas = comandasArr.map((c) => {
      const sc = Array.isArray(c.sesion_clientes) ? c.sesion_clientes[0] : c.sesion_clientes;
      const sesion = Array.isArray(c.sesiones) ? c.sesiones[0] : c.sesiones;
      const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;
      return {
        id: c.id,
        numeroDiario: c.numero_diario,
        estado: c.estado as 'pendiente' | 'en_preparacion' | 'lista',
        total: c.total,
        creadaEn: c.creada_en,
        clienteNombre: sc?.nombre ?? 'Cliente',
        mesaNumero: mesa?.numero ?? '?',
        items: itemsPorComanda.get(c.id) ?? [],
      };
    });
  }

  return (
    <TableroCocina
      perfilNombre={perfil.nombre}
      restauranteNombre={perfil.restauranteNombre}
      colorMarca={perfil.restauranteColor}
      comandasIniciales={comandas}
      restauranteId={perfil.restauranteId}
    />
  );
}
