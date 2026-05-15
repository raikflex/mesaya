-- Migracion S15 (sesion 3 push notifications)
-- Aplicada manualmente en SQL Editor de Supabase el 2026-05-15
-- Agrega 2 triggers en la tabla comandas:
--   - trigger_push_comanda_nueva (AFTER INSERT) -> push a cocina
--   - trigger_push_comanda_lista (AFTER UPDATE estado=lista) -> push a mesero
-- Ambos usan vault.decrypted_secrets para leer webhook_secret_send_push
-- y llamar a la edge function send-push via pg_net.http_post async.

-- ============================================
-- TRIGGER A: Comanda nueva -> push a COCINA
-- ============================================

CREATE OR REPLACE FUNCTION public.notificar_push_comanda_nueva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_url text := 'https://jvifgtoahbtqdzymhaog.supabase.co/functions/v1/send-push';
  v_secret text;
  v_titulo text;
  v_cuerpo text;
  v_mesa_numero text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_secret_send_push'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE WARNING 'No se encontro webhook_secret_send_push en vault';
    RETURN NEW;
  END IF;

  SELECT m.numero INTO v_mesa_numero
  FROM public.sesiones s
  JOIN public.mesas m ON m.id = s.mesa_id
  WHERE s.id = NEW.sesion_id;

  v_titulo := format('Nueva comanda - Mesa %s', COALESCE(v_mesa_numero, '?'));
  v_cuerpo := format('Comanda #%s - Total $%s',
    NEW.numero_diario,
    to_char(NEW.total, 'FM999G999G999'));

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'tipo', 'comanda_nueva',
      'restauranteId', NEW.restaurante_id,
      'rolDestino', 'cocina',
      'titulo', v_titulo,
      'cuerpo', v_cuerpo,
      'url', '/cocina'
    )
  ) INTO v_request_id;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trigger_push_comanda_nueva ON public.comandas;
CREATE TRIGGER trigger_push_comanda_nueva
AFTER INSERT ON public.comandas
FOR EACH ROW
EXECUTE FUNCTION public.notificar_push_comanda_nueva();

-- ============================================
-- TRIGGER B: Comanda lista -> push a MESERO
-- ============================================

CREATE OR REPLACE FUNCTION public.notificar_push_comanda_lista()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_url text := 'https://jvifgtoahbtqdzymhaog.supabase.co/functions/v1/send-push';
  v_secret text;
  v_titulo text;
  v_cuerpo text;
  v_mesa_numero text;
  v_request_id bigint;
  v_items_lista text;
  v_total_items integer;
BEGIN
  -- Solo dispara cuando el estado cambia A 'lista' (no si ya estaba)
  IF NEW.estado != 'lista' OR OLD.estado = 'lista' THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'webhook_secret_send_push'
  LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE WARNING 'No se encontro webhook_secret_send_push en vault';
    RETURN NEW;
  END IF;

  SELECT m.numero INTO v_mesa_numero
  FROM public.sesiones s
  JOIN public.mesas m ON m.id = s.mesa_id
  WHERE s.id = NEW.sesion_id;

  SELECT COUNT(*) INTO v_total_items
  FROM public.comanda_items
  WHERE comanda_id = NEW.id;

  -- Construir lista: primeros 3 items + "y N mas" si hay mas
  IF v_total_items <= 3 THEN
    SELECT string_agg(nombre_snapshot || ' x' || cantidad, ', ' ORDER BY id)
    INTO v_items_lista
    FROM public.comanda_items
    WHERE comanda_id = NEW.id;
  ELSE
    SELECT
      (SELECT string_agg(s.nombre_snapshot || ' x' || s.cantidad, ', ' ORDER BY s.id)
       FROM (
         SELECT nombre_snapshot, cantidad, id
         FROM public.comanda_items
         WHERE comanda_id = NEW.id
         ORDER BY id
         LIMIT 3
       ) s) || ' y ' || (v_total_items - 3) || ' mas'
    INTO v_items_lista;
  END IF;

  v_titulo := format('Comanda lista - Mesa %s', COALESCE(v_mesa_numero, '?'));
  v_cuerpo := COALESCE(v_items_lista, 'Comanda sin items');

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    body := jsonb_build_object(
      'tipo', 'comanda_lista',
      'restauranteId', NEW.restaurante_id,
      'rolDestino', 'mesero',
      'titulo', v_titulo,
      'cuerpo', v_cuerpo,
      'url', '/mesero'
    )
  ) INTO v_request_id;

  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trigger_push_comanda_lista ON public.comandas;
CREATE TRIGGER trigger_push_comanda_lista
AFTER UPDATE OF estado ON public.comandas
FOR EACH ROW
EXECUTE FUNCTION public.notificar_push_comanda_lista();