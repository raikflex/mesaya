-- =========================================================================
-- SQL adicional aplicado en S8 (post-cierre principal)
-- =========================================================================

-- Habilitar pg_cron desde Supabase Dashboard:
-- Database > Extensions > pg_cron > toggle ON

-- Cron job: cerrar sesiones que llevan >8h abiertas (zombies).
-- Corre cada hora en el minuto 0.
-- Importante porque sin esto, mesas que olvidaron pagar quedan ocupando
-- recursos y bloquean reapertura para próximos clientes.

SELECT cron.schedule(
  'cerrar-sesiones-zombies',
  '0 */1 * * *',
  $$
  UPDATE sesiones
  SET estado = 'cerrada', cerrada_en = now()
  WHERE estado = 'abierta'
    AND creada_en < now() - interval '8 hours'
  $$
);

-- Para ver jobs activos: SELECT * FROM cron.job;
-- Para desactivar: SELECT cron.unschedule('cerrar-sesiones-zombies');
