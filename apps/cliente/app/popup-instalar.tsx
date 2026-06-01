'use client';

import { useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/**
 * Pop-up (modal) que sugiere instalar EnPura como acceso directo, pensado
 * para mostrarse al FINAL de la visita en mesa (despues de calificar/saltar).
 * Mensaje orientado a domicilios: "pedi de este y muchos otros restaurantes".
 *
 * - Android/Chrome: captura beforeinstallprompt y el boton dispara el prompt nativo.
 * - iOS/Safari: muestra instrucciones (Compartir -> Agregar a inicio).
 * - Si ya esta instalada (standalone), no aparece.
 * - Aparece con un pequeno delay para no saltar de golpe. Se cierra con X o tocando afuera.
 *
 * Controlar cuando montar este componente desde el padre (ej: solo cuando
 * el cliente ya califico o salto).
 */
export function PopupInstalar({ colorMarca }: { colorMarca: string }) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [esIOS, setEsIOS] = useState(false);
  const [montar, setMontar] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // No mostrar si ya esta instalada.
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (standalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const iOS = /iphone|ipad|ipod/.test(ua);

    if (iOS) {
      setEsIOS(true);
      setMontar(true);
    } else {
      function onBeforeInstall(e: Event) {
        e.preventDefault();
        setPromptEvent(e as BeforeInstallPromptEvent);
        setMontar(true);
      }
      window.addEventListener('beforeinstallprompt', onBeforeInstall);
      return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
    }
  }, []);

  // Pequeno delay antes de mostrar, para que no aparezca de golpe.
  useEffect(() => {
    if (!montar) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [montar]);

  async function instalar() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    await promptEvent.userChoice;
    setPromptEvent(null);
    setVisible(false);
  }

  if (!montar || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6"
      style={{ background: 'rgba(26, 24, 20, 0.6)' }}
      onClick={() => setVisible(false)}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-lg)] bg-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera con icono */}
        <div className="px-6 pt-6 pb-2 flex items-start justify-between gap-3">
          <div
            className="size-14 rounded-[var(--radius-md)] grid place-items-center shrink-0"
            style={{ background: '#1a1a1a' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="7" stroke="#ff3b30" strokeWidth="1.9" />
              <path d="M12 8v4.3l3 1.7" stroke="#ff3b30" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Cerrar"
            className="size-8 grid place-items-center rounded-full shrink-0"
            style={{ background: 'var(--color-paper-deep)', color: 'var(--color-ink-soft)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6">
          <h2
            className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] leading-tight"
            style={{ color: 'var(--color-ink)' }}
          >
            Lleva EnPura contigo
          </h2>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
            Agregando el acceso directo, puedes pedir a domicilio de este y muchos otros
            restaurantes con EnPura.
          </p>

          {esIOS ? (
            <div
              className="mt-4 rounded-[var(--radius-md)] border px-4 py-3"
              style={{ borderColor: 'var(--color-border-strong)', background: 'var(--color-paper)' }}
            >
              <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                Toca{' '}
                <span className="font-medium">Compartir</span>{' '}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden className="inline align-[-2px]">
                  <path d="M12 16V4M8 8l4-4 4 4M5 14v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>{' '}
                y luego <span className="font-medium">Agregar a inicio</span>.
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={instalar}
              className="mt-5 w-full h-12 rounded-[var(--radius-md)] text-base font-medium"
              style={{ background: colorMarca, color: 'white' }}
            >
              Agregar acceso directo
            </button>
          )}

          <button
            type="button"
            onClick={() => setVisible(false)}
            className="mt-3 w-full text-sm underline"
            style={{ color: 'var(--color-muted)' }}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
