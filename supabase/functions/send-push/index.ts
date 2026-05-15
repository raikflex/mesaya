import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

type PushPayload = {
  tipo: string;
  restauranteId: string;
  rolDestino: 'mesero' | 'cocina' | 'dueno';
  titulo: string;
  cuerpo: string;
  url: string;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Validar secret compartido con los triggers de DB
  const secretRecibido = req.headers.get('x-webhook-secret');
  const secretEsperado = Deno.env.get('WEBHOOK_SECRET');
  if (!secretEsperado || secretRecibido !== secretEsperado) {
    return new Response('Forbidden', { status: 403 });
  }

  let payload: PushPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!payload.restauranteId || !payload.rolDestino || !payload.titulo) {
    return new Response('Payload incompleto', { status: 400 });
  }

  // Buscar suscripciones activas del rol + restaurante
  const { data: subs, error: errSubs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('restaurante_id', payload.restauranteId)
    .eq('rol', payload.rolDestino)
    .is('invalida_en', null);

  if (errSubs) {
    return new Response(`DB error: ${errSubs.message}`, { status: 500 });
  }

  if (!subs || subs.length === 0) {
    return new Response(
      JSON.stringify({ ok: true, enviadas: 0, mensaje: 'Sin suscripciones activas' }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Cuerpo serializado del push (lo que llega al service worker)
  const cuerpoPush = JSON.stringify({
    tipo: payload.tipo,
    titulo: payload.titulo,
    cuerpo: payload.cuerpo,
    url: payload.url,
  });

  // Envio en paralelo, capturando errores individuales
  const resultados = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          cuerpoPush,
        );
        return { id: sub.id, ok: true };
      } catch (e: any) {
        const status = e?.statusCode;
        // 410 = Gone (suscripcion cancelada), 404 = Not Found = invalida
        if (status === 410 || status === 404) {
          await supabase
            .from('push_subscriptions')
            .update({ invalida_en: new Date().toISOString() })
            .eq('id', sub.id);
        }
        return { id: sub.id, ok: false, status, error: e?.message ?? 'unknown' };
      }
    }),
  );

  const enviadas = resultados.filter(
    (r) => r.status === 'fulfilled' && r.value.ok,
  ).length;
  const fallidas = resultados.length - enviadas;

  return new Response(
    JSON.stringify({ ok: true, total: subs.length, enviadas, fallidas }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});