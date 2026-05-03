'use client';

import { useEffect, useState } from 'react';

/**
 * Banner que aparece UNA vez después de hacer "Empezar a operar".
 * Se autocierra a los 6 segundos. El URL se limpia con history.replaceState
 * para que un refresh no lo vuelva a mostrar.
 */
export function BannerBienvenida() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Limpiar el query param sin recargar.
    const url = new URL(window.location.href);
    url.searchParams.delete('bienvenida');
    window.history.replaceState(null, '', url.toString());

    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <section
      className="rounded-[var(--radius-lg)] border-2 p-5 flex items-center gap-3 transition-opacity"
      style={{
        borderColor: '#2f5d3a',
        background: '#e8f5ed',
      }}
    >
      <span
        className="size-9 rounded-full grid place-items-center shrink-0"
        style={{ background: '#2f5d3a', color: '#fff' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline
            points="5 12 10 17 19 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="flex-1">
        <p
          className="text-sm font-medium"
          style={{ color: '#1d3d24' }}
        >
          ¡Listo! Tu restaurante está abierto.
        </p>
        <p
          className="text-xs mt-0.5"
          style={{ color: '#1d3d24' }}
        >
          Los clientes ya pueden escanear los QRs y hacer pedidos.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar"
        className="size-8 grid place-items-center rounded-[var(--radius-md)] transition-colors hover:bg-white/40"
        style={{ color: '#1d3d24' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M18 6 6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </section>
  );
}
