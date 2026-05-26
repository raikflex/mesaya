export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      calificaciones: {
        Row: {
          comentario: string | null;
          creada_en: string;
          estrellas: number;
          id: string;
          sesion_cliente_id: string;
          sesion_id: string;
        };
        Insert: {
          comentario?: string | null;
          creada_en?: string;
          estrellas: number;
          id?: string;
          sesion_cliente_id: string;
          sesion_id: string;
        };
        Update: {
          comentario?: string | null;
          creada_en?: string;
          estrellas?: number;
          id?: string;
          sesion_cliente_id?: string;
          sesion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'calificaciones_sesion_cliente_id_fkey';
            columns: ['sesion_cliente_id'];
            isOneToOne: true;
            referencedRelation: 'sesion_clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'calificaciones_sesion_id_fkey';
            columns: ['sesion_id'];
            isOneToOne: false;
            referencedRelation: 'sesiones';
            referencedColumns: ['id'];
          },
        ];
      };
      categorias: {
        Row: {
          activa: boolean;
          creada_en: string;
          id: string;
          nombre: string;
          orden: number;
          restaurante_id: string;
        };
        Insert: {
          activa?: boolean;
          creada_en?: string;
          id?: string;
          nombre: string;
          orden?: number;
          restaurante_id: string;
        };
        Update: {
          activa?: boolean;
          creada_en?: string;
          id?: string;
          nombre?: string;
          orden?: number;
          restaurante_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categorias_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
      comanda_items: {
        Row: {
          cantidad: number;
          comanda_id: string;
          id: string;
          nombre_snapshot: string;
          nota: string | null;
          precio_snapshot: number;
          producto_id: string;
        };
        Insert: {
          cantidad?: number;
          comanda_id: string;
          id?: string;
          nombre_snapshot: string;
          nota?: string | null;
          precio_snapshot: number;
          producto_id: string;
        };
        Update: {
          cantidad?: number;
          comanda_id?: string;
          id?: string;
          nombre_snapshot?: string;
          nota?: string | null;
          precio_snapshot?: number;
          producto_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'comanda_items_comanda_id_fkey';
            columns: ['comanda_id'];
            isOneToOne: false;
            referencedRelation: 'comandas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comanda_items_producto_id_fkey';
            columns: ['producto_id'];
            isOneToOne: false;
            referencedRelation: 'productos';
            referencedColumns: ['id'];
          },
        ];
      };
      comandas: {
        Row: {
          actualizada_en: string;
          cancelada_en: string | null;
          creada_en: string;
          estado: string;
          id: string;
          mesero_atendiendo_id: string | null;
          mesero_atendiendo_nombre: string | null;
          motivo_cancelacion: string | null;
          nota_cocina: string | null;
          numero_diario: number;
          origen: string;
          restaurante_id: string;
          sesion_cliente_id: string;
          sesion_id: string;
          tiempo_estimado_min: number | null;
          total: number;
        };
        Insert: {
          actualizada_en?: string;
          cancelada_en?: string | null;
          creada_en?: string;
          estado?: string;
          id?: string;
          mesero_atendiendo_id?: string | null;
          mesero_atendiendo_nombre?: string | null;
          motivo_cancelacion?: string | null;
          nota_cocina?: string | null;
          numero_diario: number;
          origen?: string;
          restaurante_id: string;
          sesion_cliente_id: string;
          sesion_id: string;
          tiempo_estimado_min?: number | null;
          total?: number;
        };
        Update: {
          actualizada_en?: string;
          cancelada_en?: string | null;
          creada_en?: string;
          estado?: string;
          id?: string;
          mesero_atendiendo_id?: string | null;
          mesero_atendiendo_nombre?: string | null;
          motivo_cancelacion?: string | null;
          nota_cocina?: string | null;
          numero_diario?: number;
          origen?: string;
          restaurante_id?: string;
          sesion_cliente_id?: string;
          sesion_id?: string;
          tiempo_estimado_min?: number | null;
          total?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'comandas_mesero_atendiendo_id_fkey';
            columns: ['mesero_atendiendo_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comandas_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comandas_sesion_cliente_id_fkey';
            columns: ['sesion_cliente_id'];
            isOneToOne: false;
            referencedRelation: 'sesion_clientes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comandas_sesion_id_fkey';
            columns: ['sesion_id'];
            isOneToOne: false;
            referencedRelation: 'sesiones';
            referencedColumns: ['id'];
          },
        ];
      };
      eventos_comanda: {
        Row: {
          actor_rol: string | null;
          actor_user_id: string | null;
          comanda_id: string;
          creado_en: string;
          id: string;
          payload: Json | null;
          tipo: string;
        };
        Insert: {
          actor_rol?: string | null;
          actor_user_id?: string | null;
          comanda_id: string;
          creado_en?: string;
          id?: string;
          payload?: Json | null;
          tipo: string;
        };
        Update: {
          actor_rol?: string | null;
          actor_user_id?: string | null;
          comanda_id?: string;
          creado_en?: string;
          id?: string;
          payload?: Json | null;
          tipo?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'eventos_comanda_comanda_id_fkey';
            columns: ['comanda_id'];
            isOneToOne: false;
            referencedRelation: 'comandas';
            referencedColumns: ['id'];
          },
        ];
      };
      excepciones_horario: {
        Row: {
          abierto: boolean;
          actualizado_en: string;
          creado_en: string;
          fecha: string;
          hora_apertura: string | null;
          hora_cierre: string | null;
          id: string;
          nota: string | null;
          restaurante_id: string;
        };
        Insert: {
          abierto?: boolean;
          actualizado_en?: string;
          creado_en?: string;
          fecha: string;
          hora_apertura?: string | null;
          hora_cierre?: string | null;
          id?: string;
          nota?: string | null;
          restaurante_id: string;
        };
        Update: {
          abierto?: boolean;
          actualizado_en?: string;
          creado_en?: string;
          fecha?: string;
          hora_apertura?: string | null;
          hora_cierre?: string | null;
          id?: string;
          nota?: string | null;
          restaurante_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'excepciones_horario_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
      horarios_atencion: {
        Row: {
          abierto: boolean;
          actualizado_en: string;
          creado_en: string;
          dia_semana: number;
          hora_apertura: string | null;
          hora_cierre: string | null;
          id: string;
          restaurante_id: string;
        };
        Insert: {
          abierto?: boolean;
          actualizado_en?: string;
          creado_en?: string;
          dia_semana: number;
          hora_apertura?: string | null;
          hora_cierre?: string | null;
          id?: string;
          restaurante_id: string;
        };
        Update: {
          abierto?: boolean;
          actualizado_en?: string;
          creado_en?: string;
          dia_semana?: number;
          hora_apertura?: string | null;
          hora_cierre?: string | null;
          id?: string;
          restaurante_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'horarios_atencion_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
      llamados_mesero: {
        Row: {
          atendido_en: string | null;
          atendido_por_id: string | null;
          creado_en: string;
          doc_nombre: string | null;
          doc_numero: string | null;
          doc_tipo: string | null;
          estado: string;
          forma_pago_preferida: string | null;
          id: string;
          mesa_id: string;
          mesero_atendiendo_id: string | null;
          mesero_atendiendo_nombre: string | null;
          motivo: string;
          nota: string | null;
          restaurante_id: string;
          sesion_id: string;
        };
        Insert: {
          atendido_en?: string | null;
          atendido_por_id?: string | null;
          creado_en?: string;
          doc_nombre?: string | null;
          doc_numero?: string | null;
          doc_tipo?: string | null;
          estado?: string;
          forma_pago_preferida?: string | null;
          id?: string;
          mesa_id: string;
          mesero_atendiendo_id?: string | null;
          mesero_atendiendo_nombre?: string | null;
          motivo?: string;
          nota?: string | null;
          restaurante_id: string;
          sesion_id: string;
        };
        Update: {
          atendido_en?: string | null;
          atendido_por_id?: string | null;
          creado_en?: string;
          doc_nombre?: string | null;
          doc_numero?: string | null;
          doc_tipo?: string | null;
          estado?: string;
          forma_pago_preferida?: string | null;
          id?: string;
          mesa_id?: string;
          mesero_atendiendo_id?: string | null;
          mesero_atendiendo_nombre?: string | null;
          motivo?: string;
          nota?: string | null;
          restaurante_id?: string;
          sesion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'llamados_mesero_atendido_por_id_fkey';
            columns: ['atendido_por_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'llamados_mesero_mesa_id_fkey';
            columns: ['mesa_id'];
            isOneToOne: false;
            referencedRelation: 'mesas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'llamados_mesero_mesero_atendiendo_id_fkey';
            columns: ['mesero_atendiendo_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'llamados_mesero_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'llamados_mesero_sesion_id_fkey';
            columns: ['sesion_id'];
            isOneToOne: false;
            referencedRelation: 'sesiones';
            referencedColumns: ['id'];
          },
        ];
      };
      mesas: {
        Row: {
          activa: boolean;
          actualizada_en: string;
          borrada_en: string | null;
          capacidad: number;
          creada_en: string;
          id: string;
          mesero_asignado_id: string | null;
          numero: string;
          qr_token: string;
          restaurante_id: string;
        };
        Insert: {
          activa?: boolean;
          actualizada_en?: string;
          borrada_en?: string | null;
          capacidad?: number;
          creada_en?: string;
          id?: string;
          mesero_asignado_id?: string | null;
          numero: string;
          qr_token?: string;
          restaurante_id: string;
        };
        Update: {
          activa?: boolean;
          actualizada_en?: string;
          borrada_en?: string | null;
          capacidad?: number;
          creada_en?: string;
          id?: string;
          mesero_asignado_id?: string | null;
          numero?: string;
          qr_token?: string;
          restaurante_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'mesas_mesero_asignado_id_fkey';
            columns: ['mesero_asignado_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mesas_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
      pagos: {
        Row: {
          confirmado_en: string | null;
          confirmado_por_id: string | null;
          doc_nombre: string | null;
          doc_numero: string | null;
          doc_tipo: string | null;
          estado: string;
          id: string;
          metodo: string;
          monto_subtotal: number;
          monto_total: number;
          propina: number;
          sesion_id: string;
          solicitado_en: string;
        };
        Insert: {
          confirmado_en?: string | null;
          confirmado_por_id?: string | null;
          doc_nombre?: string | null;
          doc_numero?: string | null;
          doc_tipo?: string | null;
          estado?: string;
          id?: string;
          metodo: string;
          monto_subtotal: number;
          monto_total: number;
          propina?: number;
          sesion_id: string;
          solicitado_en?: string;
        };
        Update: {
          confirmado_en?: string | null;
          confirmado_por_id?: string | null;
          doc_nombre?: string | null;
          doc_numero?: string | null;
          doc_tipo?: string | null;
          estado?: string;
          id?: string;
          metodo?: string;
          monto_subtotal?: number;
          monto_total?: number;
          propina?: number;
          sesion_id?: string;
          solicitado_en?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'pagos_confirmado_por_id_fkey';
            columns: ['confirmado_por_id'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'pagos_sesion_id_fkey';
            columns: ['sesion_id'];
            isOneToOne: false;
            referencedRelation: 'sesiones';
            referencedColumns: ['id'];
          },
        ];
      };
      perfiles: {
        Row: {
          activo: boolean;
          actualizada_en: string;
          creado_en: string;
          id: string;
          nombre: string;
          restaurante_id: string;
          rol: string;
        };
        Insert: {
          activo?: boolean;
          actualizada_en?: string;
          creado_en?: string;
          id: string;
          nombre: string;
          restaurante_id: string;
          rol: string;
        };
        Update: {
          activo?: boolean;
          actualizada_en?: string;
          creado_en?: string;
          id?: string;
          nombre?: string;
          restaurante_id?: string;
          rol?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'perfiles_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
      productos: {
        Row: {
          actualizada_en: string;
          categoria_id: string;
          creado_en: string;
          descripcion: string | null;
          disponible: boolean;
          foto_url: string | null;
          id: string;
          nombre: string;
          orden: number;
          precio: number;
          restaurante_id: string;
          tiempo_preparacion_min: number | null;
        };
        Insert: {
          actualizada_en?: string;
          categoria_id: string;
          creado_en?: string;
          descripcion?: string | null;
          disponible?: boolean;
          foto_url?: string | null;
          id?: string;
          nombre: string;
          orden?: number;
          precio: number;
          restaurante_id: string;
          tiempo_preparacion_min?: number | null;
        };
        Update: {
          actualizada_en?: string;
          categoria_id?: string;
          creado_en?: string;
          descripcion?: string | null;
          disponible?: boolean;
          foto_url?: string | null;
          id?: string;
          nombre?: string;
          orden?: number;
          precio?: number;
          restaurante_id?: string;
          tiempo_preparacion_min?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'productos_categoria_id_fkey';
            columns: ['categoria_id'];
            isOneToOne: false;
            referencedRelation: 'categorias';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'productos_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth_key: string;
          creada_en: string;
          device_label: string | null;
          endpoint: string;
          id: string;
          invalida_en: string | null;
          p256dh: string;
          restaurante_id: string;
          rol: string;
          usada_en: string | null;
          usuario_id: string;
        };
        Insert: {
          auth_key: string;
          creada_en?: string;
          device_label?: string | null;
          endpoint: string;
          id?: string;
          invalida_en?: string | null;
          p256dh: string;
          restaurante_id: string;
          rol: string;
          usada_en?: string | null;
          usuario_id: string;
        };
        Update: {
          auth_key?: string;
          creada_en?: string;
          device_label?: string | null;
          endpoint?: string;
          id?: string;
          invalida_en?: string | null;
          p256dh?: string;
          restaurante_id?: string;
          rol?: string;
          usada_en?: string | null;
          usuario_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_limits: {
        Row: {
          action_type: string;
          contador: number;
          key: string;
          ultimo_intento: string;
          ventana_inicio: string;
        };
        Insert: {
          action_type: string;
          contador?: number;
          key: string;
          ultimo_intento?: string;
          ventana_inicio?: string;
        };
        Update: {
          action_type?: string;
          contador?: number;
          key?: string;
          ultimo_intento?: string;
          ventana_inicio?: string;
        };
        Relationships: [];
      };
      restaurantes: {
        Row: {
          actualizada_en: string;
          cocina_activa: boolean;
          color_marca: string;
          creado_en: string;
          direccion: string | null;
          dueno_user_id: string;
          estado: string;
          id: string;
          logo_url: string | null;
          nit: string | null;
          nombre_publico: string;
          primer_activacion_en: string | null;
          tiempo_estimado_preparacion_min: number | null;
          trial_termina_en: string | null;
          usa_meseros: boolean;
        };
        Insert: {
          actualizada_en?: string;
          cocina_activa?: boolean;
          color_marca?: string;
          creado_en?: string;
          direccion?: string | null;
          dueno_user_id: string;
          estado?: string;
          id?: string;
          logo_url?: string | null;
          nit?: string | null;
          nombre_publico: string;
          primer_activacion_en?: string | null;
          tiempo_estimado_preparacion_min?: number | null;
          trial_termina_en?: string | null;
          usa_meseros?: boolean;
        };
        Update: {
          actualizada_en?: string;
          cocina_activa?: boolean;
          color_marca?: string;
          creado_en?: string;
          direccion?: string | null;
          dueno_user_id?: string;
          estado?: string;
          id?: string;
          logo_url?: string | null;
          nit?: string | null;
          nombre_publico?: string;
          primer_activacion_en?: string | null;
          tiempo_estimado_preparacion_min?: number | null;
          trial_termina_en?: string | null;
          usa_meseros?: boolean;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          comentario: string | null;
          creada_en: string | null;
          estrellas: number;
          id: string;
          sesion_id: string | null;
        };
        Insert: {
          comentario?: string | null;
          creada_en?: string | null;
          estrellas: number;
          id?: string;
          sesion_id?: string | null;
        };
        Update: {
          comentario?: string | null;
          creada_en?: string | null;
          estrellas?: number;
          id?: string;
          sesion_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reviews_sesion_id_fkey';
            columns: ['sesion_id'];
            isOneToOne: false;
            referencedRelation: 'sesiones';
            referencedColumns: ['id'];
          },
        ];
      };
      sesion_clientes: {
        Row: {
          auth_user_id: string | null;
          entro_en: string;
          id: string;
          nombre: string;
          sesion_id: string;
        };
        Insert: {
          auth_user_id?: string | null;
          entro_en?: string;
          id?: string;
          nombre: string;
          sesion_id: string;
        };
        Update: {
          auth_user_id?: string | null;
          entro_en?: string;
          id?: string;
          nombre?: string;
          sesion_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'sesion_clientes_sesion_id_fkey';
            columns: ['sesion_id'];
            isOneToOne: false;
            referencedRelation: 'sesiones';
            referencedColumns: ['id'];
          },
        ];
      };
      sesiones: {
        Row: {
          abierta_en: string;
          cerrada_en: string | null;
          estado: string;
          id: string;
          mesa_id: string;
          mesero_id_snapshot: string | null;
          restaurante_id: string;
          total_facturado: number;
        };
        Insert: {
          abierta_en?: string;
          cerrada_en?: string | null;
          estado?: string;
          id?: string;
          mesa_id: string;
          mesero_id_snapshot?: string | null;
          restaurante_id: string;
          total_facturado?: number;
        };
        Update: {
          abierta_en?: string;
          cerrada_en?: string | null;
          estado?: string;
          id?: string;
          mesa_id?: string;
          mesero_id_snapshot?: string | null;
          restaurante_id?: string;
          total_facturado?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'sesiones_mesa_id_fkey';
            columns: ['mesa_id'];
            isOneToOne: false;
            referencedRelation: 'mesas';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sesiones_mesero_id_snapshot_fkey';
            columns: ['mesero_id_snapshot'];
            isOneToOne: false;
            referencedRelation: 'perfiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'sesiones_restaurante_id_fkey';
            columns: ['restaurante_id'];
            isOneToOne: false;
            referencedRelation: 'restaurantes';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancelar_comandas_viejas: { Args: never; Returns: undefined };
      cerrar_sesiones_viejas: { Args: never; Returns: undefined };
      check_rate_limit: {
        Args: {
          p_action_type: string;
          p_key: string;
          p_max_requests: number;
          p_ventana_segundos: number;
        };
        Returns: boolean;
      };
      es_miembro_sesion: { Args: { p_sesion_id: string }; Returns: boolean };
      es_staff_de: { Args: { p_rest_id: string }; Returns: boolean };
      user_restaurante_id: { Args: never; Returns: string };
      user_rol: { Args: never; Returns: string };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
