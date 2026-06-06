'use client';

import { useEffect, useState } from 'react';
import {
  obtenerPromptInstall,
  suscribirInstall,
  dispararInstall,
} from '@/lib/pwa-install';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * VERSION DEBUG TEMPORAL del pop-up de instalar.
 * Muestra una caja de diagnostico SIEMPRE visible (abajo a la derecha) con
 * el estado de la deteccion, para entender por que no aparece el pop-up real
 * en Android. Una vez diagnosticado, volver a la version normal.
 */
export function PopupInstalar({ colorMarca }: { colorMarca: string }) {
  const [esIOS, setEsIOS] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [hayPrompt, setHayPrompt] = useState(false);
  const [eventoLlego, setEventoLlego] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);

    const sa =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setStandalone(sa);

    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua);
    setEsIOS(iOS);

    // Ver si ya habia un evento capturado globalmente.
    if (obtenerPromptInstall()) {
      setHayPrompt(true);
      setEventoLlego(true);
    }

    // Suscribirse por si llega despues.
    const desuscribir = suscribirInstall(() => {
      const hay = !!obtenerPromptInstall();
      setHayPrompt(hay);
      if (hay) setEventoLlego(true);
    });

    // ADEMAS: escuchar directo aca tambien, por si el modulo global fallo.
    function onLocal() {
      setEventoLlego(true);
    }
    window.addEventListener('beforeinstallprompt', onLocal);

    return () => {
      desuscribir();
      window.removeEventListener('beforeinstallprompt', onLocal);
    };
  }, []);

  async function probarInstalar() {
    const outcome = await dispararInstall();
    alert('Resultado de instalar: ' + String(outcome));
  }

  if (!montado) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        right: 12,
        zIndex: 9999,
        background: '#1a1a1a',
        color: 'white',
        borderRadius: 12,
        padding: 16,
        fontFamily: 'monospace',
        fontSize: 13,
        lineHeight: 1.6,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 8, color: colorMarca === '#fff' ? '#fff' : '#ff9ec7' }}>
        DIAGNOSTICO INSTALL (temporal)
      </div>
      <div>iOS detectado: <b>{esIOS ? 'SI' : 'NO'}</b></div>
      <div>Ya instalada (standalone): <b>{standalone ? 'SI' : 'NO'}</b></div>
      <div>Evento beforeinstallprompt llego: <b style={{ color: eventoLlego ? '#7CFC00' : '#ff6b6b' }}>{eventoLlego ? 'SI' : 'NO (todavia)'}</b></div>
      <div>Prompt disponible para usar: <b>{hayPrompt ? 'SI' : 'NO'}</b></div>
      <button
        type="button"
        onClick={probarInstalar}
        style={{
          marginTop: 12,
          width: '100%',
          height: 44,
          background: hayPrompt ? '#7CFC00' : '#555',
          color: hayPrompt ? '#000' : '#aaa',
          border: 'none',
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 'bold',
        }}
      >
        {hayPrompt ? 'Probar instalar ahora' : 'Sin evento (boton inactivo)'}
      </button>
    </div>
  );
}
