-- Sesion S19 - Drop columnas viejas de restaurantes
-- Aplicado en Supabase SQL Editor el 2026-05-19

-- ============================================
-- Contexto: estas 4 columnas estaban en restaurantes desde antes
-- de la migracion a horarios_atencion / excepciones_horario.
-- Solo el onboarding paso-3 seguia escribiendo a ellas. Tras refactor
-- del paso-3 para usar horarios_atencion, las columnas quedaron sin uso.
-- ============================================

ALTER TABLE restaurantes
  DROP COLUMN horario_apertura,
  DROP COLUMN horario_cierre,
  DROP COLUMN dias_operacion,
  DROP COLUMN timezone;
