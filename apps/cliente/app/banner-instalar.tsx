'use client';

import { useEffect, useState } from 'react';

// Tipo del evento beforeinstallprompt (no esta en los tipos estandar de TS).
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Banner que sugiere instalar EnPura como app en el inicio del telefono.
 * - Android/Chrome: captura beforeinstallprompt y muestra un boton que
 *   dispara el prompt nativo de instalacion.
 * - iOS/Safari: no permite prompt por codigo, asi que muestra instrucciones
 *   ("toca Compartir -> Agregar a inicio").
 * - Si la app YA esta instalada (display standalone), no muestra nada.
 * - Se puede cerrar; no reaparece en la misma carga (estado en memoria).
 */
export function BannerInstalar({ colorMarca }: { colorMarca: string }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [visible, setVisible] = useState(false);
  const [cerrado, setCerrado] = useState(false);

  useEffect(() => {
    // Si ya esta instalada (modo standalone), no mostrar nada.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS expone navigator.standalone
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    // Detectar iOS (iPhone/iPad).
    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua);
    // En iOS solo Safari permite "agregar a inicio". Detectamos que no sea
    // un navegador embebido raro, pero para simplificar mostramos en iOS.
    if (iOS) {
      setEsIOS(true);
      setVisible(true);
      return;
    }

    // Android/Chrome: escuchar el evento de instalacion.
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  async function instalar() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setPromptEvent(null);
  }

  if (!visible || cerrado) return null;

  return (
    <div
      className="rounded-[var(--radius-lg)] border bg-white p-4"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="size-11 rounded-[var(--radius-md)] grid place-items-center shrink-0"
          style={{ background: '#1a1a1a' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="7" stroke="#ff3b30" strokeWidth="1.9" />
            <path d="M12 8v4.3l3 1.7" stroke="#ff3b30" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            Pide mas rapido la proxima vez
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
            Agrega EnPura a tu pantalla de inicio y pide en un toque.
          </p>

          {esIOS ? (
            <p className="text-xs mt-2" style={{ color: 'var(--color-muted)' }}>
              Toca{' '}
              <span style={{ color: 'var(--color-ink)' }}>Compartir</span>{' '}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden className="inline align-[-1px]">
                <path d="M12 16V4M8 8l4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>{' '}
              y luego <span style={{ color: 'var(--color-ink)' }}>Agregar a inicio</span>.
            </p>
          ) : (
            <button
              type="button"
              onClick={instalar}
              className="mt-3 h-9 px-4 rounded-[var(--radius-md)] text-sm font-medium"
              style={{ background: colorMarca, color: 'white' }}
            >
              Agregar a mi inicio
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCerrado(true)}
          aria-label="Cerrar"
          className="size-7 grid place-items-center rounded-full shrink-0"
          style={{ color: 'var(--color-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
