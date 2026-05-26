export * from './types.generated';

import type { Database } from './types.generated';

export type EstadoRestaurante = Database['public']['Tables']['restaurantes']['Row']['estado'];
export type RolPerfil = Database['public']['Tables']['perfiles']['Row']['rol'];
export type EstadoSesion = Database['public']['Tables']['sesiones']['Row']['estado'];
export type EstadoComanda = Database['public']['Tables']['comandas']['Row']['estado'];
export type EstadoPago = Database['public']['Tables']['pagos']['Row']['estado'];
export type MetodoPago = Database['public']['Tables']['pagos']['Row']['metodo'];
export type MotivoLlamado = Database['public']['Tables']['llamados_mesero']['Row']['motivo'];
export type EstadoLlamado = Database['public']['Tables']['llamados_mesero']['Row']['estado'];
