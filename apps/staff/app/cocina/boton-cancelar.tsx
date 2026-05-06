'use client';

import { useState, useTransition } from 'react';
import { cancelarComanda } from './actions';

const MOTIVOS_RAPIDOS = [
  'Sin ingredientes',
  'Cocina cerrada',
  'Producto agotado',
];

/**
 * Botón rojo + modal para cancelar una comanda con motivo. Muestra opciones
 * pre-armadas (sin ingredientes, cocina cerrada, etc.) o motivo personalizado.
 * El cliente recibe el motivo via realtime en su pantalla de pedido.
 *
 * Uso en el tablero de cocina:
 *   <BotonCancelarComanda comandaId={c.id} numeroComanda={c.numero_diario} />
 */
export function BotonCancelarComanda({
  comandaId,
  numeroComanda,
}: {
  comandaId: string;
  numeroComanda: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function abrir() {
    setMotivo('');
    setError(null);
    setAbierto(true);
  }

  function cerrar() {
    if (pending) return;
    setAbierto(false);
  }

  function confirmar() {
    setError(null);
    const motivoLimpio = motivo.trim();
    if (motivoLimpio.length < 3) {
      setError('Escribe un motivo claro.');
      return;
    }
    startTransition(async () => {
      const r = await cancelarComanda({ comandaId, motivo: motivoLimpio });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setAbierto(false);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className="text-[0.7rem] uppercase tracking-[0.1em] underline disabled:opacity-50"
        style={{ color: 'var(--color-danger, #b91c1c)' }}
      >
        Cancelar
      </button>

      {abierto ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={cerrar}
        >
          <div
            className="w-full max-w-md rounded-[var(--radius-lg)] bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1"
              style={{ color: 'var(--color-ink)' }}
            >
              Cancelar pedido #{String(numeroComanda).padStart(3, '0')}
            </h2>
            <p
              className="text-xs mb-4"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              El cliente verá el motivo en su pantalla.
            </p>

            <p
              className="text-[0.65rem] uppercase tracking-[0.14em] mb-2"
              style={{ color: 'var(--color-muted)' }}
            >
              Motivos rápidos
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {MOTIVOS_RAPIDOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(m)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    borderColor:
                      motivo === m ? 'var(--color-ink)' : 'var(--color-border-strong)',
                    background: motivo === m ? 'var(--color-ink)' : 'white',
                    color: motivo === m ? 'white' : 'var(--color-ink-soft)',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            <label
              htmlFor="motivo-cancelacion"
              className="text-[0.65rem] uppercase tracking-[0.14em] mb-2 block"
              style={{ color: 'var(--color-muted)' }}
            >
              O escribe uno personalizado
            </label>
            <textarea
              id="motivo-cancelacion"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value.slice(0, 200))}
              placeholder="Ej: se nos acabó el aguacate"
              rows={2}
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border text-sm resize-none focus:outline-none focus:ring-1"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />

            {error ? (
              <p
                role="alert"
                className="mt-2 text-xs text-center"
                style={{ color: 'var(--color-danger, #b91c1c)' }}
              >
                {error}
              </p>
            ) : null}

            <div className="flex items-center gap-2 mt-4">
              <button
                type="button"
                onClick={cerrar}
                disabled={pending}
                className="flex-1 h-10 rounded-[var(--radius-md)] text-sm font-medium border disabled:opacity-50"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-ink)',
                  background: 'white',
                }}
              >
                Volver
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={pending}
                className="flex-1 h-10 rounded-[var(--radius-md)] text-sm font-medium text-white disabled:opacity-50"
                style={{ background: 'var(--color-danger, #b91c1c)' }}
              >
                {pending ? 'Cancelando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
