-- =========================================================================
-- SQL aplicado en sesión S7 (5 may 2026)
-- Estos cambios ya están aplicados en la DB de Supabase.
-- Documentados aquí para referencia y para facilitar replicación en otra DB.
-- =========================================================================

-- 1. RLS de la tabla pagos: permitir al staff insertar/leer pagos
--    de sesiones de su restaurante. Sin esto, mesero recibe error
--    "new row violates row-level security policy for table pagos"
--    al confirmar cobro.

CREATE POLICY pagos_insert_staff ON pagos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = pagos.sesion_id
        AND es_staff_de(s.restaurante_id)
    )
  );

CREATE POLICY pagos_select_staff ON pagos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sesiones s
      WHERE s.id = pagos.sesion_id
        AND es_staff_de(s.restaurante_id)
    )
  );

-- 2. REPLICA IDENTITY FULL en tablas con UPDATEs.
--    Necesario para que Supabase Realtime entregue eventos UPDATE/DELETE
--    completos a clientes con RLS. Sin esto, el evento llega con poca
--    info y las RLS del subscriber lo bloquean silenciosamente.
--    Aplicado preventivamente aunque el bug raíz era otro (rol).

ALTER TABLE comandas REPLICA IDENTITY FULL;
ALTER TABLE llamados_mesero REPLICA IDENTITY FULL;
