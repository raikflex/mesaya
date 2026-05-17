-- Migracion S16 (audit de seguridad - cleanup policies duplicadas)
-- Aplicada manualmente en SQL Editor de Supabase
-- Elimina 3 policies redundantes que tenian la misma logica que sus pares.

DROP POLICY IF EXISTS llamados_select_cliente ON llamados_mesero;
DROP POLICY IF EXISTS pagos_select_cliente ON pagos;
DROP POLICY IF EXISTS pagos_select_staff ON pagos;

-- Quedan vigentes:
--   llamados_mesero: llam_select_cliente (usa helper es_miembro_sesion)
--   pagos: pag_select_cliente (usa helper) y pag_select_staff (EXISTS directo)