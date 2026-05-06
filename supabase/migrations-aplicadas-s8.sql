-- =========================================================================
-- SQL aplicado en sesión S8 (5 may 2026)
-- =========================================================================

ALTER TABLE comandas ADD COLUMN IF NOT EXISTS mesero_atendiendo_nombre text;
ALTER TABLE llamados_mesero ADD COLUMN IF NOT EXISTS mesero_atendiendo_nombre text;

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sesion_id uuid REFERENCES sesiones(id),
  estrellas int NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario text,
  creada_en timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews REPLICA IDENTITY FULL;

CREATE POLICY pagos_select_cliente ON pagos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sesion_clientes sc
    WHERE sc.sesion_id = pagos.sesion_id AND sc.auth_user_id = auth.uid()
  ));

CREATE POLICY llamados_select_cliente ON llamados_mesero
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sesion_clientes sc
    WHERE sc.sesion_id = llamados_mesero.sesion_id AND sc.auth_user_id = auth.uid()
  ));

CREATE POLICY reviews_insert_cliente ON reviews
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM sesion_clientes sc
    WHERE sc.sesion_id = reviews.sesion_id AND sc.auth_user_id = auth.uid()
  ));

CREATE POLICY reviews_select_cliente ON reviews
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sesion_clientes sc
    WHERE sc.sesion_id = reviews.sesion_id AND sc.auth_user_id = auth.uid()
  ));

CREATE POLICY reviews_select_staff ON reviews
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sesiones s
    WHERE s.id = reviews.sesion_id AND es_staff_de(s.restaurante_id)
  ));

ALTER TABLE pagos REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE pagos;
ALTER PUBLICATION supabase_realtime ADD TABLE reviews;

ALTER TABLE pagos DROP CONSTRAINT IF EXISTS pagos_metodo_check;
ALTER TABLE pagos
  ADD CONSTRAINT pagos_metodo_check
  CHECK (metodo IN ('efectivo', 'tarjeta', 'transferencia', 'no_seguro'));
