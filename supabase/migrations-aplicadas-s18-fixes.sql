-- Sesion S18 - Fixes rapidos + branding
-- Aplicado en Supabase SQL Editor el 2026-05-18

-- ============================================
-- Fix 1: Bug del estado en cocina
-- ============================================
-- El CHECK constraint usaba 'preparando' pero el codigo TS usa 'en_preparacion'.
-- Migracion segura: 0 comandas tenian 'preparando'.

ALTER TABLE comandas DROP CONSTRAINT comandas_estado_check;
ALTER TABLE comandas ADD CONSTRAINT comandas_estado_check
  CHECK (estado = ANY (ARRAY[
    'pendiente'::text,
    'aceptada'::text,
    'en_preparacion'::text,
    'lista'::text,
    'entregada'::text,
    'cancelada'::text
  ]));

-- ============================================
-- Fix 2: Cleanup policies redundantes en restaurantes
-- ============================================
-- rest_select_publico (USING true) ya permite SELECT a todos,
-- entonces rest_select_dueno y rest_select_staff eran redundantes.

DROP POLICY rest_select_dueno ON public.restaurantes;
DROP POLICY rest_select_staff ON public.restaurantes;
