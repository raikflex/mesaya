'use client';

import { useEffect } from 'react';
import { inicializarCapturaInstall } from '../lib/pwa-install';

/**
 * Componente invisible que activa la captura global del evento
 * beforeinstallprompt apenas la app carga del lado del cliente.
 *
 * Va en el layout raiz para que el listener se registre lo antes posible,
 * ANTES de que cualquier pantalla (pedido enviado, gracias) se monte. Asi el
 * evento de Chrome queda guardado y los pop-ups pueden leerlo aunque
 * aparezcan mucho despues.
 *
 * No renderiza nada.
 */
export function RegistrarInstall() {
  useEffect(() => {
    inicializarCapturaInstall();
  }, []);
  return null;
}
