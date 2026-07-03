'use client';

import { useActionState, useState } from 'react';
import { Button, Field, Input } from '@mesaya/ui';
import { guardarConfig, type GuardarConfigState } from './actions';

const initialState: GuardarConfigState = { ok: false };

const PALETA_PRESET = [
  '#9a3f6b', // buganvilia
  '#1a1814', // tinta
  '#b45309', // ambar
  '#166534', // verde bosque
  '#1e40af', // azul real
  '#7c2d12', // marron rojizo
  '#5b21b6', // morado
  '#0f766e', // teal
];

export function ConfiguracionForm({
  nombreInicial,
  colorInicial,
  modoCocinaInicial,
  aceptaDomiciliosInicial,
  aceptaPickupInicial,
  aceptaDomiciliosProgramadosInicial,
  slugInicial,
}: {
  nombreInicial: string;
  colorInicial: string;
  modoCocinaInicial: 'con_pantalla' | 'sin_pantalla' | 'impresion';
  aceptaDomiciliosInicial: boolean;
  aceptaPickupInicial: boolean;
  aceptaDomiciliosProgramadosInicial: boolean;
  slugInicial: string;
}) {
  const [state, formAction, pending] = useActionState(guardarConfig, initialState);
  const [color, setColor] = useState(colorInicial);
  const [modoCocina, setModoCocina] = useState(modoCocinaInicial);
  const [aceptaDomicilios, setAceptaDomicilios] = useState(aceptaDomiciliosInicial);
  const [aceptaPickup, setAceptaPickup] = useState(aceptaPickupInicial);
  const [aceptaDomiciliosProgramados, setAceptaDomiciliosProgramados] = useState(
    aceptaDomiciliosProgramadosInicial,
  );
  const [slug, setSlug] = useState(slugInicial);
  const [copiado, setCopiado] = useState(false);

  const ofrecePedidosOnline = aceptaDomicilios || aceptaPickup || aceptaDomiciliosProgramados;

  // URL completa del cliente para compartir. Respeta NEXT_PUBLIC_CLIENTE_URL si
  // esta configurada; si no, cae al dominio de produccion.
  const baseRaw = process.env.NEXT_PUBLIC_CLIENTE_URL ?? 'https://menu.enpura.co';
  const baseCliente = baseRaw.endsWith('/') ? baseRaw.slice(0, -1) : baseRaw;
  const enlaceCompleto = slug ? `${baseCliente}/d/${slug}` : '';

  async function copiarEnlace() {
    if (!enlaceCompleto) return;
    try {
      await navigator.clipboard.writeText(enlaceCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Algunos navegadores bloquean el portapapeles; se puede copiar a mano.
    }
  }

  return (
    <form
      action={formAction}
      className="rounded-[var(--radius-lg)] border bg-white p-6 space-y-5"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <Field
        id="nombre_publico"
        label="Nombre publico"
        hint="Es el que ven tus clientes al escanear el QR."
        error={state.fieldErrors?.nombre_publico}
      >
        <Input
          id="nombre_publico"
          name="nombre_publico"
          type="text"
          required
          defaultValue={nombreInicial}
          placeholder="Cafe Cumbre"
        />
      </Field>

      {/* === COLOR DE MARCA === */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-ink)' }}>
          Color de marca
        </label>
        <input type="hidden" name="color_marca" value={color} />
        <div className="flex flex-wrap gap-2">
          {PALETA_PRESET.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              className="size-9 rounded-full transition-transform"
              style={{
                background: preset,
                outline: color === preset ? '2px solid var(--color-ink)' : 'none',
                outlineOffset: '2px',
                transform: color === preset ? 'scale(1.1)' : 'scale(1)',
              }}
              aria-label={`Color ${preset}`}
            />
          ))}
        </div>
        {state.fieldErrors?.color_marca ? (
          <p role="alert" className="text-xs leading-relaxed mt-2" style={{ color: 'var(--color-danger)' }}>
            {state.fieldErrors.color_marca}
          </p>
        ) : null}
      </div>

      {/* === SELECTOR MODO DE COCINA === */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
          Como recibe los pedidos tu cocina
        </p>
        <input type="hidden" name="modo_cocina" value={modoCocina} />

        {/* Opcion 1: con pantalla */}
        <button
          type="button"
          onClick={() => setModoCocina('con_pantalla')}
          className="w-full text-left rounded-[var(--radius-md)] border p-4 transition-colors"
          style={{
            borderColor: modoCocina === 'con_pantalla' ? '#166534' : 'var(--color-border)',
            background: modoCocina === 'con_pantalla' ? 'var(--color-paper)' : 'transparent',
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="size-5 rounded-full border-2 mt-0.5 shrink-0 grid place-items-center"
              style={{ borderColor: modoCocina === 'con_pantalla' ? '#166534' : 'var(--color-border-strong)' }}
            >
              {modoCocina === 'con_pantalla' ? (
                <span className="size-2.5 rounded-full" style={{ background: '#166534' }} />
              ) : null}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Cocina con pantalla
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                La cocina ve los pedidos en una pantalla y marca cuando estan listos.
                Necesitas una cuenta de cocina creada en Equipo.
              </p>
            </div>
          </div>
        </button>

        {/* Opcion 2: sin pantalla */}
        <button
          type="button"
          onClick={() => setModoCocina('sin_pantalla')}
          className="w-full text-left rounded-[var(--radius-md)] border p-4 transition-colors"
          style={{
            borderColor: modoCocina === 'sin_pantalla' ? '#166534' : 'var(--color-border)',
            background: modoCocina === 'sin_pantalla' ? 'var(--color-paper)' : 'transparent',
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="size-5 rounded-full border-2 mt-0.5 shrink-0 grid place-items-center"
              style={{ borderColor: modoCocina === 'sin_pantalla' ? '#166534' : 'var(--color-border-strong)' }}
            >
              {modoCocina === 'sin_pantalla' ? (
                <span className="size-2.5 rounded-full" style={{ background: '#166534' }} />
              ) : null}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Cocina sin pantalla
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                El mesero anota la comanda y se la pasa al chef fisicamente. Despues
                marca cuando esta lista para entregar. Recomendado para la mayoria de
                restaurantes.
              </p>
            </div>
          </div>
        </button>

        {/* Opcion 3: impresion automatica */}
        <button
          type="button"
          onClick={() => setModoCocina('impresion')}
          className="w-full text-left rounded-[var(--radius-md)] border p-4 transition-colors"
          style={{
            borderColor: modoCocina === 'impresion' ? '#166534' : 'var(--color-border)',
            background: modoCocina === 'impresion' ? 'var(--color-paper)' : 'transparent',
          }}
        >
          <div className="flex items-start gap-3">
            <span
              className="size-5 rounded-full border-2 mt-0.5 shrink-0 grid place-items-center"
              style={{ borderColor: modoCocina === 'impresion' ? '#166534' : 'var(--color-border-strong)' }}
            >
              {modoCocina === 'impresion' ? (
                <span className="size-2.5 rounded-full" style={{ background: '#166534' }} />
              ) : null}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Impresion automatica
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                Las comandas salen solas en una impresora termica, sin pantalla. Dejas
                una tablet o PC con la impresora conectada en la estacion. Necesitas una
                cuenta de cocina creada en Equipo.
              </p>
            </div>
          </div>
        </button>

        {state.fieldErrors?.modo_cocina ? (
          <p role="alert" className="text-xs leading-relaxed mt-1" style={{ color: 'var(--color-danger)' }}>
            {state.fieldErrors.modo_cocina}
          </p>
        ) : null}
      </div>

      {/* === SECCION PEDIDOS ONLINE === */}
      <div className="pt-2">
        <h2
          className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Pedidos online
        </h2>
        <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Permite que tus clientes pidan a domicilio o para recoger, desde un enlace propio.
        </p>
        {/* TOGGLE DOMICILIOS */}
        <div
          className="rounded-[var(--radius-md)] border p-4 mb-3"
          style={{
            borderColor: aceptaDomicilios ? 'var(--color-border-strong)' : 'var(--color-border)',
            background: aceptaDomicilios ? 'var(--color-paper)' : 'transparent',
          }}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={aceptaDomicilios}
              onClick={() => setAceptaDomicilios((v) => !v)}
              className="relative h-6 w-11 rounded-full transition-colors mt-0.5 shrink-0"
              style={{
                background: aceptaDomicilios ? '#166534' : 'var(--color-paper-deep)',
                border: `1px solid ${aceptaDomicilios ? '#166534' : 'var(--color-border-strong)'}`,
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: aceptaDomicilios ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
            <input type="hidden" name="acepta_domicilios" value={aceptaDomicilios ? 'on' : 'off'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Aceptar domicilios
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                Tus clientes piden a domicilio desde el enlace. Dejan nombre, telefono y direccion.
              </p>
            </div>
          </label>
        </div>

        {/* TOGGLE PICKUP */}
        <div
          className="rounded-[var(--radius-md)] border p-4 mb-3"
          style={{
            borderColor: aceptaPickup ? 'var(--color-border-strong)' : 'var(--color-border)',
            background: aceptaPickup ? 'var(--color-paper)' : 'transparent',
          }}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={aceptaPickup}
              onClick={() => setAceptaPickup((v) => !v)}
              className="relative h-6 w-11 rounded-full transition-colors mt-0.5 shrink-0"
              style={{
                background: aceptaPickup ? '#166534' : 'var(--color-paper-deep)',
                border: `1px solid ${aceptaPickup ? '#166534' : 'var(--color-border-strong)'}`,
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: aceptaPickup ? 'translateX(20px)' : 'translateX(0)' }}
              />
            </button>
            <input type="hidden" name="acepta_pickup" value={aceptaPickup ? 'on' : 'off'} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Aceptar pedidos para recoger
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                El cliente pide y pasa a recoger en tu local a la hora que elija.
              </p>
            </div>
          </label>
        </div>

        {/* TOGGLE DOMICILIOS PROGRAMADOS */}
        <div
          className="rounded-[var(--radius-md)] border p-4 mb-3"
          style={{
            borderColor: aceptaDomiciliosProgramados
              ? 'var(--color-border-strong)'
              : 'var(--color-border)',
            background: aceptaDomiciliosProgramados ? 'var(--color-paper)' : 'transparent',
          }}
        >
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={aceptaDomiciliosProgramados}
              onClick={() => setAceptaDomiciliosProgramados((v) => !v)}
              className="relative h-6 w-11 rounded-full transition-colors mt-0.5 shrink-0"
              style={{
                background: aceptaDomiciliosProgramados ? '#166534' : 'var(--color-paper-deep)',
                border: `1px solid ${
                  aceptaDomiciliosProgramados ? '#166534' : 'var(--color-border-strong)'
                }`,
              }}
            >
              <span
                className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform"
                style={{
                  transform: aceptaDomiciliosProgramados ? 'translateX(20px)' : 'translateX(0)',
                }}
              />
            </button>
            <input
              type="hidden"
              name="acepta_domicilios_programados"
              value={aceptaDomiciliosProgramados ? 'on' : 'off'}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Aceptar domicilios programados
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>
                Tus clientes programan pedidos para dias de la semana (lunes a domingo), con fecha y
                hora de entrega. Recuerda configurar el horario de domicilios para definir hasta que
                hora recibes pedidos de cada dia.
              </p>
            </div>
          </label>
        </div>

        {/* CAMPO SLUG (solo relevante si ofrece pedidos online) */}
        <div
          className="rounded-[var(--radius-md)] border p-4"
          style={{
            borderColor: 'var(--color-border)',
            opacity: ofrecePedidosOnline ? 1 : 0.55,
          }}
        >
          <label
            htmlFor="slug"
            className="block text-sm font-medium mb-1"
            style={{ color: 'var(--color-ink)' }}
          >
            Tu enlace para pedidos
          </label>
          <p className="text-xs mb-3 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            Es la direccion que compartes con tus clientes (redes, WhatsApp, Google). Usa solo
            letras sin acentos, numeros y guiones.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-[family-name:var(--font-mono)]" style={{ color: 'var(--color-muted)' }}>
              /d/
            </span>
            <input
              id="slug"
              name="slug"
              type="text"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              }
              placeholder="cafe-cumbre"
              maxLength={40}
              className="flex-1 h-10 px-3 rounded-[var(--radius-md)] border font-[family-name:var(--font-mono)] text-sm"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />
          </div>
          {slug ? (
            <div className="mt-3">
              <p className="text-xs mb-1.5" style={{ color: 'var(--color-muted)' }}>
                Comparte este enlace con tus clientes (redes, WhatsApp, bio):
              </p>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 min-w-0 truncate text-sm font-[family-name:var(--font-mono)] px-3 py-2 rounded-[var(--radius-md)] border"
                  style={{
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-paper)',
                    color: 'var(--color-ink)',
                  }}
                  title={enlaceCompleto}
                >
                  {enlaceCompleto}
                </code>
                <button
                  type="button"
                  onClick={copiarEnlace}
                  className="h-9 px-4 rounded-[var(--radius-md)] text-sm font-medium shrink-0"
                  style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
                >
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : null}
          {state.fieldErrors?.slug ? (
            <p role="alert" className="text-xs leading-relaxed mt-2" style={{ color: 'var(--color-danger)' }}>
              {state.fieldErrors.slug}
            </p>
          ) : null}
        </div>
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
          style={{ borderColor: '#bbf7d0', color: '#166534', background: '#dcfce7' }}
        >
          Cambios guardados. Recarga las apps abiertas (cliente, mesero, cocina) para ver los cambios.
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
