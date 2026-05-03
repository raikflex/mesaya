'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  borrarSesionCliente,
  leerSesionCliente,
} from '../../../../lib/cliente-session';

export function MenuPlaceholder({
  qrToken,
  numeroMesa,
  nombreNegocio,
  colorMarca,
}: {
  qrToken: string;
  numeroMesa: string;
  nombreNegocio: string;
  colorMarca: string;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const sesion = leerSesionCliente(qrToken);
    if (!sesion) {
      // Sin sesión → redirect al inicio donde pide el nombre.
      router.replace(`/m/${qrToken}`);
      return;
    }
    setNombre(sesion.nombre);
    setCargando(false);
  }, [qrToken, router]);

  function cambiarNombre() {
    borrarSesionCliente(qrToken);
    router.replace(`/m/${qrToken}`);
  }

  if (cargando) {
    return (
      <main
        className="min-h-screen grid place-items-center"
        style={{ background: 'var(--color-paper)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Cargando…
        </p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)' }}
    >
      {/* Header sticky con nombre + mesa */}
      <header
        className="sticky top-0 z-10 px-5 py-3 border-b backdrop-blur-sm"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.92)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[0.65rem] uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Mesa {numeroMesa} · Hola, {nombre}
            </p>
            <h1
              className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate"
              style={{ color: 'var(--color-ink)' }}
            >
              {nombreNegocio}
            </h1>
          </div>
          <button
            type="button"
            onClick={cambiarNombre}
            className="text-xs underline shrink-0"
            style={{ color: 'var(--color-muted)' }}
          >
            No soy yo
          </button>
        </div>
      </header>

      {/* Contenido placeholder */}
      <div className="flex-1 px-6 py-12 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div
            className="size-14 rounded-full grid place-items-center mx-auto mb-5"
            style={{ background: colorMarca, color: 'white' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <polyline
                points="14 2 14 8 20 8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 13h6M9 17h6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <h2
            className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
            style={{ color: 'var(--color-ink)' }}
          >
            Bienvenido, {nombre}.
          </h2>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Aquí verás el menú agrupado por categorías, podrás agregar productos
            al carrito y enviar tu pedido a la cocina. Esta pantalla se
            construye en el siguiente bloque.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 text-center">
        <p
          className="text-[0.7rem] uppercase tracking-[0.14em]"
          style={{ color: 'var(--color-muted)' }}
        >
          Servido con <span style={{ color: 'var(--color-ink)' }}>MesaYA</span>
        </p>
      </footer>
    </main>
  );
}
