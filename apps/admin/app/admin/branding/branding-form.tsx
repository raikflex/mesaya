'use client';

import { useRef, useState, useTransition } from 'react';
import { subirLogo, eliminarLogo, actualizarTiempoEstimado } from './actions';

const TIPOS_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

const TAMANO_MAX = 2 * 1024 * 1024;

export function BrandingForm({
  logoInicial,
  nombreNegocio,
  colorMarca,
  tiempoEstimadoInicial,
}: {
  logoInicial: string | null;
  nombreNegocio: string;
  colorMarca: string;
  tiempoEstimadoInicial: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(logoInicial);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState(false);
  const [pending, startTransition] = useTransition();

  function elegirArchivo() {
    inputRef.current?.click();
  }

  function onArchivoSeleccionado(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setExito(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setError('Formato no permitido. Usa PNG, JPG, WebP o SVG.');
      return;
    }
    if (file.size > TAMANO_MAX) {
      setError(
        `El archivo es muy grande (max 2 MB). Pesa ${(file.size / 1024 / 1024).toFixed(2)} MB.`,
      );
      return;
    }

    const formData = new FormData();
    formData.append('archivo', file);

    startTransition(async () => {
      const res = await subirLogo(formData);
      if (!res.ok) {
        setError(res.error);
      } else {
        setLogoUrl(res.logoUrl);
        setExito('Logo actualizado.');
        setTimeout(() => setExito(null), 3000);
      }
      if (inputRef.current) inputRef.current.value = '';
    });
  }

  function handleEliminar() {
    setError(null);
    setExito(null);
    startTransition(async () => {
      const res = await eliminarLogo();
      if (!res.ok) {
        setError(res.error);
      } else {
        setLogoUrl(null);
        setExito('Logo eliminado.');
        setConfirmandoEliminar(false);
        setTimeout(() => setExito(null), 3000);
      }
    });
  }

  return (
    <>
      <section
        className="rounded-[var(--radius-lg)] border bg-white p-5 sm:p-7 mb-6"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <h2
          className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-1"
          style={{ color: 'var(--color-ink)' }}
        >
          Logo
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-ink-soft)' }}>
          Aparece en la pantalla de bienvenida cuando un cliente escanea el QR.
          Recomendado: cuadrado, PNG con fondo transparente.
        </p>

        <div className="mb-6">
          <div
            className="size-32 sm:size-40 rounded-[var(--radius-lg)] border-2 border-dashed grid place-items-center mx-auto sm:mx-0 overflow-hidden"
            style={{
              borderColor: 'var(--color-border-strong)',
              background: 'var(--color-paper)',
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={`Logo de ${nombreNegocio}`}
                className="size-full object-contain p-2"
              />
            ) : (
              <PlaceholderLogo nombre={nombreNegocio} colorMarca={colorMarca} />
            )}
          </div>
          {!logoUrl ? (
            <p
              className="text-[0.7rem] mt-2 text-center sm:text-left"
              style={{ color: 'var(--color-muted)' }}
            >
              Sin logo - mostramos las iniciales por ahora
            </p>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={onArchivoSeleccionado}
          className="hidden"
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={elegirArchivo}
            disabled={pending}
            className="h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--color-ink)',
              color: 'var(--color-paper)',
            }}
          >
            {pending ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
          </button>

          {logoUrl ? (
            <button
              type="button"
              onClick={() => setConfirmandoEliminar(true)}
              disabled={pending}
              className="h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium border disabled:opacity-50"
              style={{
                background: 'white',
                color: '#b91c1c',
                borderColor: '#fecaca',
              }}
            >
              Eliminar logo
            </button>
          ) : null}
        </div>

        <p
          className="text-[0.7rem] mt-3"
          style={{ color: 'var(--color-muted)' }}
        >
          Formatos: PNG, JPG, WebP, SVG. Tamano maximo: 2 MB.
        </p>

        {error ? (
          <div
            className="mt-4 px-3 py-2.5 rounded-[var(--radius-md)] border text-sm"
            style={{
              borderColor: '#fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        ) : null}

        {exito ? (
          <div
            className="mt-4 px-3 py-2.5 rounded-[var(--radius-md)] border text-sm"
            style={{
              borderColor: '#bbf7d0',
              background: '#f0fdf4',
              color: '#166534',
            }}
          >
            {exito}
          </div>
        ) : null}

        {confirmandoEliminar ? (
          <ModalConfirmar
            onConfirmar={handleEliminar}
            onCancelar={() => setConfirmandoEliminar(false)}
            pending={pending}
          />
        ) : null}
      </section>

      <SeccionTiempoEstimado tiempoInicial={tiempoEstimadoInicial} />
    </>
  );
}

function PlaceholderLogo({
  nombre,
  colorMarca,
}: {
  nombre: string;
  colorMarca: string;
}) {
  const iniciales = nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className="font-[family-name:var(--font-display)] text-4xl tracking-[-0.02em]"
      style={{ color: colorMarca }}
    >
      {iniciales || '?'}
    </span>
  );
}

function ModalConfirmar({
  onConfirmar,
  onCancelar,
  pending,
}: {
  onConfirmar: () => void;
  onCancelar: () => void;
  pending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-white p-6">
        <h3
          className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em] mb-2"
          style={{ color: 'var(--color-ink)' }}
        >
          Eliminar logo?
        </h3>
        <p
          className="text-sm mb-5"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Tus clientes veran las iniciales del nombre del restaurante hasta que
          subas otro.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onConfirmar}
            disabled={pending}
            className="flex-1 h-11 rounded-[var(--radius-md)] text-sm font-medium disabled:opacity-50"
            style={{ background: '#b91c1c', color: 'white' }}
          >
            {pending ? 'Eliminando...' : 'Eliminar'}
          </button>
          <button
            type="button"
            onClick={onCancelar}
            disabled={pending}
            className="flex-1 h-11 rounded-[var(--radius-md)] text-sm font-medium border"
            style={{
              background: 'white',
              color: 'var(--color-ink)',
              borderColor: 'var(--color-border-strong)',
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function SeccionTiempoEstimado({
  tiempoInicial,
}: {
  tiempoInicial: number | null;
}) {
  const [valor, setValor] = useState<string>(
    tiempoInicial !== null ? String(tiempoInicial) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleGuardar() {
    setError(null);
    setExito(null);
    const trim = valor.trim();
    const minutos = trim === '' ? null : Number(trim);

    if (
      minutos !== null &&
      (!Number.isInteger(minutos) || minutos < 1 || minutos > 240)
    ) {
      setError('Ingresa un numero entero entre 1 y 240.');
      return;
    }

    startTransition(async () => {
      const res = await actualizarTiempoEstimado(minutos);
      if (!res.ok) {
        setError(res.error);
      } else {
        setExito(
          minutos === null
            ? 'Tiempo eliminado. Los clientes no veran estimacion.'
            : 'Tiempo guardado.',
        );
        setTimeout(() => setExito(null), 3000);
      }
    });
  }

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white p-5 sm:p-7"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <h2
        className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-1"
        style={{ color: 'var(--color-ink)' }}
      >
        Tiempo estimado de preparacion
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--color-ink-soft)' }}>
        Cuando un cliente hace un pedido, ve &quot;Estara listo en ~X
        minutos&quot;. Deja vacio si no quieres mostrar nada.
      </p>

      <div className="flex items-end gap-3">
        <div className="flex-1 max-w-[10rem]">
          <label
            htmlFor="tiempo"
            className="block text-xs uppercase tracking-[0.12em] mb-1.5"
            style={{ color: 'var(--color-muted)' }}
          >
            Minutos
          </label>
          <input
            id="tiempo"
            type="number"
            inputMode="numeric"
            min={1}
            max={240}
            step={1}
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setError(null);
              setExito(null);
            }}
            placeholder="Ej: 20"
            className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-base"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
            }}
          />
        </div>
        <button
          type="button"
          onClick={handleGuardar}
          disabled={pending}
          className="h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            background: 'var(--color-ink)',
            color: 'var(--color-paper)',
          }}
        >
          {pending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {error ? (
        <div
          className="mt-4 px-3 py-2.5 rounded-[var(--radius-md)] border text-sm"
          style={{
            borderColor: '#fecaca',
            background: '#fef2f2',
            color: '#b91c1c',
          }}
        >
          {error}
        </div>
      ) : null}

      {exito ? (
        <div
          className="mt-4 px-3 py-2.5 rounded-[var(--radius-md)] border text-sm"
          style={{
            borderColor: '#bbf7d0',
            background: '#f0fdf4',
            color: '#166534',
          }}
        >
          {exito}
        </div>
      ) : null}
    </section>
  );
}
