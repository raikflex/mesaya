'use client';

import { useState, useTransition } from 'react';
import { enviarReview } from './actions';

type EstadoFinal = 'pendiente' | 'enviado' | 'saltado';

export function GraciasCliente({
  qrToken: _qrToken,
  sesionId,
  mesaNumero,
  nombreNegocio,
  colorMarca,
  totalPagado,
}: {
  qrToken: string;
  sesionId: string;
  mesaNumero: string;
  nombreNegocio: string;
  colorMarca: string;
  totalPagado: number;
}) {
  const [estrellas, setEstrellas] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [comentario, setComentario] = useState('');
  const [estado, setEstado] = useState<EstadoFinal>('pendiente');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    if (estrellas === 0) {
      setError('Elige cuántas estrellas darle a tu visita.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await enviarReview({
        sesionId,
        estrellas,
        comentario: comentario.trim() || null,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setEstado('enviado');
    });
  }

  function saltar() {
    setEstado('saltado');
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)' }}
    >
      <div className="flex-1 px-5 py-10 max-w-md mx-auto w-full">
        {/* Hero gracias */}
        <div
          className="rounded-[var(--radius-lg)] p-6 mb-6 text-center"
          style={{ background: colorMarca, color: 'white' }}
        >
          <div
            className="size-14 rounded-full mx-auto mb-4 grid place-items-center"
            style={{ background: 'rgba(255,255,255,0.2)' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 21s-7-4.5-9-9a5.5 5.5 0 0 1 9-5 5.5 5.5 0 0 1 9 5c-2 4.5-9 9-9 9z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-[0.7rem] uppercase tracking-[0.14em] opacity-80">
            Mesa {mesaNumero} cerrada
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] mt-1">
            ¡Gracias por tu visita!
          </h1>
          <p className="text-sm mt-2 opacity-90">
            {nombreNegocio} te espera de vuelta.
          </p>
        </div>

        {/* Total pagado */}
        <div
          className="rounded-[var(--radius-lg)] border bg-white p-4 mb-6 flex items-center justify-between"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div>
            <p
              className="text-[0.65rem] uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Total pagado
            </p>
            <p
              className="font-[family-name:var(--font-display)] text-2xl mt-0.5"
              style={{ color: 'var(--color-ink)' }}
            >
              ${totalPagado.toLocaleString('es-CO')}
            </p>
          </div>
          <div
            className="size-10 rounded-full grid place-items-center"
            style={{ background: '#dcfce7', color: '#166534' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <polyline
                points="5 12 10 17 19 8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {estado === 'pendiente' ? (
          <section
            className="rounded-[var(--radius-lg)] border bg-white p-5"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <h2
              className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1"
              style={{ color: 'var(--color-ink)' }}
            >
              ¿Cómo estuvo todo?
            </h2>
            <p
              className="text-xs mb-4"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              Tu opinión ayuda a {nombreNegocio} a mejorar.
            </p>

            <div className="flex items-center justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((n) => {
                const activa = (hover || estrellas) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setEstrellas(n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    className="size-10 grid place-items-center transition-transform active:scale-95"
                    aria-label={`${n} estrella${n === 1 ? '' : 's'}`}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill={activa ? colorMarca : 'none'}
                      style={{
                        color: activa ? colorMarca : 'var(--color-border-strong)',
                      }}
                    >
                      <polygon
                        points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                );
              })}
            </div>

            <label
              htmlFor="comentario"
              className="text-xs uppercase tracking-[0.14em] mb-2 block"
              style={{ color: 'var(--color-muted)' }}
            >
              Comentario{' '}
              <span className="lowercase tracking-normal">(opcional)</span>
            </label>
            <textarea
              id="comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value.slice(0, 500))}
              placeholder="¿Qué te gustó? ¿Qué mejorarías?"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-[var(--radius-md)] border text-sm resize-none focus:outline-none focus:ring-1"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />
            <p
              className="text-[0.7rem] mt-1 text-right"
              style={{ color: 'var(--color-muted)' }}
            >
              {comentario.length} / 500
            </p>

            {error ? (
              <p
                role="alert"
                className="mt-3 text-xs text-center"
                style={{ color: 'var(--color-danger)' }}
              >
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={enviar}
              disabled={pending || estrellas === 0}
              className="w-full mt-4 h-12 rounded-[var(--radius-md)] text-base font-medium transition-opacity disabled:opacity-50"
              style={{ background: colorMarca, color: 'white' }}
            >
              {pending ? 'Enviando…' : 'Enviar reseña'}
            </button>

            <p
              className="text-[0.7rem] text-center mt-3"
              style={{ color: 'var(--color-muted)' }}
            >
              <button
                type="button"
                onClick={saltar}
                disabled={pending}
                className="underline disabled:opacity-50"
                style={{ color: 'var(--color-muted)' }}
              >
                Saltar
              </button>
            </p>
          </section>
        ) : null}

        {estado === 'enviado' ? (
          <PantallaFinal
            titulo="¡Gracias por tu reseña!"
            mensaje={`Tu opinión llegó a ${nombreNegocio}. ¡Hasta la próxima!`}
          />
        ) : null}

        {estado === 'saltado' ? (
          <PantallaFinal
            titulo="¡Hasta pronto!"
            mensaje={`Gracias por visitar ${nombreNegocio}. Ya puedes cerrar esta página.`}
          />
        ) : null}
      </div>

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

function PantallaFinal({
  titulo,
  mensaje,
}: {
  titulo: string;
  mensaje: string;
}) {
  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white p-6 text-center"
      style={{ borderColor: '#bbf7d0', borderWidth: 1.5 }}
    >
      <div
        className="size-12 rounded-full mx-auto mb-3 grid place-items-center"
        style={{ background: '#dcfce7', color: '#166534' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <polyline
            points="5 12 10 17 19 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2
        className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1"
        style={{ color: 'var(--color-ink)' }}
      >
        {titulo}
      </h2>
      <p
        className="text-sm"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        {mensaje}
      </p>
    </section>
  );
}
