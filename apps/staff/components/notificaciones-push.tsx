'use client';

import { useEffect, useState } from 'react';
import { guardarSuscripcionPush, eliminarSuscripcionPush } from '../lib/push-actions';

type Estado = 'cargando' | 'no_soportado' | 'desactivadas' | 'denegadas' | 'activas';

/**
 * Boton redondo (mismo tamano que el de sonido) que muestra el estado de
 * push notifications y permite togglearlas con un click.
 *
 * Estados:
 *  - cargando / no_soportado: oculto (no estorba al header)
 *  - desactivadas: fondo neutro, icono smartphone con dot
 *  - activas: fondo colorMarca, icono blanco
 *  - denegadas: boton disabled, icono campana tachada + tooltip explicativo
 */
export function NotificacionesPush({ colorMarca }: { colorMarca: string }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    async function detectar() {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        setEstado('no_soportado');
        return;
      }

      if (Notification.permission === 'denied') {
        setEstado('denegadas');
        return;
      }

      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub ? 'activas' : 'desactivadas');
      } catch {
        setEstado('no_soportado');
      }
    }
    detectar();
  }, []);

  async function activar() {
    setTrabajando(true);
    setError(null);

    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') {
        setEstado(permiso === 'denied' ? 'denegadas' : 'desactivadas');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const subJson = sub.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const authKey = subJson.keys?.auth;

      if (!endpoint || !p256dh || !authKey) {
        throw new Error('Suscripcion incompleta.');
      }

      const resultado = await guardarSuscripcionPush({
        endpoint,
        p256dh,
        authKey,
        deviceLabel: navigator.userAgent.slice(0, 100),
      });

      if (!resultado.ok) {
        await sub.unsubscribe();
        throw new Error(resultado.error);
      }

      setEstado('activas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al activar.');
    } finally {
      setTrabajando(false);
    }
  }

  async function desactivar() {
    setTrabajando(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await eliminarSuscripcionPush({ endpoint });
      }
      setEstado('desactivadas');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al desactivar.');
    } finally {
      setTrabajando(false);
    }
  }

  function toggle() {
    if (estado === 'activas') desactivar();
    else if (estado === 'desactivadas') activar();
  }

  // Ocultar el boton si no soporta o esta cargando
  if (estado === 'cargando' || estado === 'no_soportado') return null;

  const activas = estado === 'activas';
  const denegadas = estado === 'denegadas';

  const titulo = error
    ? `Error: ${error}`
    : denegadas
      ? 'Notificaciones bloqueadas. Habilitalas en los ajustes del navegador.'
      : activas
        ? 'Notificaciones push activas. Click para desactivar.'
        : 'Activar notificaciones push para este dispositivo.';

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={trabajando || denegadas}
      aria-label={titulo}
      title={titulo}
      className="size-9 rounded-full grid place-items-center transition-colors hover:opacity-80 disabled:opacity-50"
      style={{
        background: activas ? colorMarca : 'var(--color-paper-deep)',
        color: activas ? 'white' : 'var(--color-muted)',
      }}
    >
      {denegadas ? (
        // Smartphone tachado (notificaciones bloqueadas)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="6"
            y="2"
            width="12"
            height="20"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
        </svg>
      ) : (
        // Smartphone con dot (notificacion al dispositivo)
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="6"
            y="2"
            width="12"
            height="20"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M10 18h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="18.5" cy="5.5" r="2.5" fill="currentColor" />
        </svg>
      )}
    </button>
  );
}

/**
 * Convierte la VAPID public key (base64 URL-safe) al Uint8Array que pide
 * pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
