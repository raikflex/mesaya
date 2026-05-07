'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input } from '@mesaya/ui';
import { guardarConfig, type GuardarConfigState } from './actions';

const initialState: GuardarConfigState = { ok: false };

const PALETA_PRESET = [
  '#9a3f6b', // buganvilia
  '#1a1814', // tinta
  '#b45309', // ámbar
  '#166534', // verde bosque
  '#1e40af', // azul real
  '#7c2d12', // marrón rojizo
  '#5b21b6', // morado
  '#0f766e', // teal
];

export function ConfiguracionForm({
  nombreInicial,
  colorInicial,
  cocinaActivaInicial,
}: {
  nombreInicial: string;
  colorInicial: string;
  cocinaActivaInicial: boolean;
}) {
  const [state, formAction, pending] = useActionState(guardarConfig, initialState);
  const [color, setColor] = useState(colorInicial);
  const [cocinaActiva, setCocinaActiva] = useState(cocinaActivaInicial);

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border bg-white p-6 space-y-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <Field
        id="nombre_publico"
        label="Nombre público"
        hint="Es el que ven tus clientes al escanear el QR."
        error={state.fieldErrors?.nombre_publico}
      >
        <Input
          id="nombre_publico"
          name="nombre_publico"
          type="text"
          required
          defaultValue={nombreInicial}
          maxLength={80}
        />
      </Field>

      <div>
        <label
          htmlFor="color_marca"
          className="block text-sm font-medium tracking-[-0.005em] mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          Color de marca
        </label>
        <p
          className="text-xs mb-3 leading-relaxed"
          style={{ color: 'var(--color-muted)' }}
        >
          Tiñe los botones, headers y acentos de la app que ven tus clientes.
        </p>

        <div className="flex items-center gap-3 mb-3">
          <input
            id="color_marca"
            name="color_marca"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="size-12 rounded-[var(--radius-md)] border cursor-pointer"
            style={{ borderColor: 'var(--color-border-strong)' }}
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="#9a3f6b"
            maxLength={7}
            className="h-10 px-3 rounded-[var(--radius-md)] border font-[family-name:var(--font-mono)] text-sm w-32"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
            }}
            aria-label="Hex del color"
          />
          <div
            className="flex-1 h-10 rounded-[var(--radius-md)] grid place-items-center text-sm font-medium"
            style={{ background: color, color: 'white' }}
          >
            Vista previa
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PALETA_PRESET.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Usar ${c}`}
              className="size-8 rounded-full border transition-transform hover:scale-110"
              style={{
                background: c,
                borderColor: color === c ? 'var(--color-ink)' : 'var(--color-border)',
                borderWidth: color === c ? 2 : 1,
              }}
            />
          ))}
        </div>

        {state.fieldErrors?.color_marca ? (
          <p
            className="text-xs leading-relaxed mt-2"
            style={{ color: 'var(--color-danger)' }}
          >
            {state.fieldErrors.color_marca}
          </p>
        ) : null}
      </div>

      {/* === TOGGLE COCINA === */}
      <div
        className="rounded-[var(--radius-md)] border p-4"
        style={{
          borderColor: cocinaActiva ? 'var(--color-border-strong)' : 'var(--color-border)',
          background: cocinaActiva ? 'var(--color-paper)' : 'transparent',
        }}
      >
        <label
          htmlFor="cocina_activa"
          className="flex items-start gap-3 cursor-pointer select-none"
        >
          <button
            type="button"
            role="switch"
            aria-checked={cocinaActiva}
            onClick={() => setCocinaActiva((v) => !v)}
            className="relative h-6 w-11 rounded-full transition-colors mt-0.5 shrink-0"
            style={{
              background: cocinaActiva ? '#166534' : 'var(--color-paper-deep)',
              border: `1px solid ${cocinaActiva ? '#166534' : 'var(--color-border-strong)'}`,
            }}
          >
            <span
              className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform"
              style={{ transform: cocinaActiva ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
          {/* Hidden input para que el form lo envíe */}
          <input
            type="hidden"
            name="cocina_activa"
            value={cocinaActiva ? 'on' : 'off'}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--color-ink)' }}
            >
              Pantalla de cocina activa
            </p>
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: 'var(--color-ink-soft)' }}
            >
              {cocinaActiva ? (
                <>
                  La cocina ve los pedidos en una pantalla y marca cuándo están
                  listos. Necesitás una cuenta de cocina creada en Equipo.
                </>
              ) : (
                <>
                  El mesero imprime o anota la comanda y se la pasa al chef
                  físicamente. Después marca cuándo está lista para entregar.
                  Recomendado para la mayoría de restaurantes.
                </>
              )}
            </p>
          </div>
        </label>

        {state.fieldErrors?.cocina_activa ? (
          <p
            role="alert"
            className="text-xs leading-relaxed mt-2"
            style={{ color: 'var(--color-danger)' }}
          >
            {state.fieldErrors.cocina_activa}
          </p>
        ) : null}
      </div>

      {state.error ? (
        <div
          role="alert"
          className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
          style={{
            borderColor: 'var(--color-danger)',
            color: 'var(--color-danger)',
            background: 'var(--color-accent-soft)',
          }}
        >
          {state.error}
        </div>
      ) : null}

      {state.ok ? (
        <div
          role="status"
          className="rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
          style={{
            borderColor: '#bbf7d0',
            color: '#166534',
            background: '#dcfce7',
          }}
        >
          ✓ Cambios guardados. Recarga las apps abiertas (cliente, mesero,
          cocina) para ver los cambios.
        </div>
      ) : null}

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={pending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
