'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button, Field, Input, cn } from '@mesaya/ui';
import {
  crearCuentaEquipo,
  eliminarCuentaEquipo,
  type CrearCuentaState,
} from '../onboarding/paso-8/actions';

export type Miembro = {
  id: string;
  nombre: string;
  rol: 'mesero' | 'cocina';
};

const initialAdd: CrearCuentaState = { ok: false };

/**
 * Versión post-onboarding del gestor de equipo. Reusa los server actions del
 * wizard paso-8 (crearCuentaEquipo, eliminarCuentaEquipo). Diferencias con el
 * del wizard:
 *   - No tiene botón "Ir a mi panel" (ya está en el panel).
 *   - No tiene mensaje de "necesitas al menos 1 cocina" (eso es solo bloqueante
 *     en el wizard, después puede operar sin cuentas si quiere).
 */
export function EquipoManager({ miembros }: { miembros: Miembro[] }) {
  const totalCocina = miembros.filter((m) => m.rol === 'cocina').length;
  const totalMeseros = miembros.filter((m) => m.rol === 'mesero').length;

  return (
    <div className="space-y-8">
      <FormularioAgregar />

      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2
            className="text-xs uppercase tracking-[0.14em]"
            style={{ color: 'var(--color-muted)' }}
          >
            Miembros · {miembros.length}
          </h2>
          <p className="text-[0.7rem]" style={{ color: 'var(--color-muted)' }}>
            {totalCocina} cocina · {totalMeseros} mesero
            {totalMeseros === 1 ? '' : 's'}
          </p>
        </div>
        <Lista miembros={miembros} />
      </div>
    </div>
  );
}

function FormularioAgregar() {
  const [state, formAction, pending] = useActionState(crearCuentaEquipo, initialAdd);
  const formRef = useRef<HTMLFormElement>(null);
  const [rolSeleccionado, setRolSeleccionado] = useState<'mesero' | 'cocina'>('mesero');

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
    }
  }, [state.ok]);

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={formAction}
        className="rounded-[var(--radius-lg)] border p-5 space-y-4"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-paper)',
        }}
      >
        <h2
          className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Agregar miembro
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="nombre" label="Nombre" error={state.fieldErrors?.nombre}>
            <Input
              id="nombre"
              name="nombre"
              type="text"
              required
              placeholder="Ej: Andrea"
              maxLength={80}
            />
          </Field>

          <Field id="email" label="Correo" error={state.fieldErrors?.email}>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="andrea@cafe.com"
              autoComplete="off"
            />
          </Field>
        </div>

        <div>
          <label
            className="block text-sm font-medium tracking-[-0.005em] mb-2"
            style={{ color: 'var(--color-ink)' }}
          >
            Rol
          </label>
          <input type="hidden" name="rol" value={rolSeleccionado} />
          <div className="grid sm:grid-cols-2 gap-3">
            <RolCard
              activo={rolSeleccionado === 'cocina'}
              onClick={() => setRolSeleccionado('cocina')}
              titulo="Cocina"
              descripcion="Recibe los pedidos, los marca como listos."
              icon={<IconCocina />}
            />
            <RolCard
              activo={rolSeleccionado === 'mesero'}
              onClick={() => setRolSeleccionado('mesero')}
              titulo="Mesero"
              descripcion="Atiende llamados, entrega platos, cobra."
              icon={<IconMesero />}
            />
          </div>
          {state.fieldErrors?.rol ? (
            <p
              className="text-xs leading-relaxed mt-2"
              style={{ color: 'var(--color-danger)' }}
            >
              {state.fieldErrors.rol}
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

        <div className="flex justify-end pt-1">
          <Button type="submit" loading={pending}>
            Crear cuenta
          </Button>
        </div>
      </form>

      {state.ok && state.credenciales ? (
        <CredencialesCard credenciales={state.credenciales} />
      ) : null}
    </div>
  );
}

function CredencialesCard({
  credenciales,
}: {
  credenciales: NonNullable<CrearCuentaState['credenciales']>;
}) {
  const [copiadoMensaje, setCopiadoMensaje] = useState(false);
  const [copiadoPass, setCopiadoPass] = useState(false);

  const textoParaCompartir = `Hola ${credenciales.nombre}, tu acceso a MesaYA:\n\nCorreo: ${credenciales.email}\nContraseña: ${credenciales.password}\n\nGuárdala bien, esta contraseña es temporal.`;

  function copiarMensaje() {
    void navigator.clipboard.writeText(textoParaCompartir);
    setCopiadoMensaje(true);
    setTimeout(() => setCopiadoMensaje(false), 2000);
  }

  function copiarSoloPassword() {
    void navigator.clipboard.writeText(credenciales.password);
    setCopiadoPass(true);
    setTimeout(() => setCopiadoPass(false), 2000);
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] border p-5"
      style={{
        borderColor: 'var(--color-ink)',
        background: 'var(--color-accent-soft)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span
            className="size-7 rounded-full grid place-items-center shrink-0"
            style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="size-4">
              <polyline
                points="5 12 10 17 19 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
              Cuenta creada para {credenciales.nombre}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
              Guarda estas credenciales y compártelas. No se mostrarán de nuevo.
            </p>
          </div>
        </div>
      </div>

      <dl
        className="space-y-2.5 mb-4 rounded-[var(--radius-md)] border p-3.5 font-[family-name:var(--font-mono)] text-sm"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-paper)',
        }}
      >
        <div className="flex items-baseline gap-3">
          <dt
            className="text-xs uppercase tracking-[0.12em] w-20 shrink-0"
            style={{ color: 'var(--color-muted)' }}
          >
            Correo
          </dt>
          <dd style={{ color: 'var(--color-ink)' }}>{credenciales.email}</dd>
        </div>
        <div className="flex items-baseline gap-3">
          <dt
            className="text-xs uppercase tracking-[0.12em] w-20 shrink-0"
            style={{ color: 'var(--color-muted)' }}
          >
            Clave
          </dt>
          <dd
            className="select-all px-2 py-1 rounded -mx-2 -my-1"
            style={{
              color: 'var(--color-ink)',
              background: 'var(--color-paper-deep)',
              letterSpacing: '0.05em',
            }}
          >
            {credenciales.password}
          </dd>
        </div>
      </dl>

      <p
        className="text-[0.7rem] mb-3 leading-relaxed"
        style={{ color: 'var(--color-ink-soft)' }}
      >
        ⚠️ No tipees la clave a mano. Usa los botones de abajo para evitar errores
        de copia.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          onClick={copiarSoloPassword}
          variant="ghost"
          size="sm"
        >
          {copiadoPass ? '¡Copiada!' : 'Copiar solo clave'}
        </Button>
        <Button type="button" onClick={copiarMensaje} variant="ghost" size="sm">
          {copiadoMensaje ? '¡Copiado!' : 'Copiar mensaje'}
        </Button>
      </div>
    </div>
  );
}

function RolCard({
  activo,
  onClick,
  titulo,
  descripcion,
  icon,
}: {
  activo: boolean;
  onClick: () => void;
  titulo: string;
  descripcion: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'group text-left p-4 rounded-[var(--radius-md)] border transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]',
        activo
          ? 'border-[var(--color-ink)] bg-white'
          : 'border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong)] hover:bg-white',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'size-9 rounded-[var(--radius-md)] grid place-items-center shrink-0',
            activo
              ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
              : 'bg-[var(--color-paper-deep)] text-[var(--color-ink-soft)]',
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {titulo}
          </p>
          <p
            className="text-xs mt-0.5 leading-relaxed"
            style={{ color: 'var(--color-muted)' }}
          >
            {descripcion}
          </p>
        </div>
      </div>
    </button>
  );
}

function Lista({ miembros }: { miembros: Miembro[] }) {
  if (miembros.length === 0) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-dashed p-8 text-center"
        style={{ borderColor: 'var(--color-border-strong)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Aún no tienes miembros en tu equipo. Crea la primera cuenta arriba.
        </p>
      </div>
    );
  }

  const cocina = miembros.filter((m) => m.rol === 'cocina');
  const meseros = miembros.filter((m) => m.rol === 'mesero');

  return (
    <div className="space-y-6">
      {cocina.length > 0 ? <SeccionRol titulo="Cocina" miembros={cocina} /> : null}
      {meseros.length > 0 ? <SeccionRol titulo="Meseros" miembros={meseros} /> : null}
    </div>
  );
}

function SeccionRol({ titulo, miembros }: { titulo: string; miembros: Miembro[] }) {
  return (
    <section>
      <h3
        className="text-xs uppercase tracking-[0.14em] mb-2 px-1"
        style={{ color: 'var(--color-muted)' }}
      >
        {titulo} · {miembros.length}
      </h3>
      <ul
        className="rounded-[var(--radius-lg)] border divide-y bg-white"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {miembros.map((m) => (
          <ItemMiembro key={m.id} miembro={m} />
        ))}
      </ul>
    </section>
  );
}

function ItemMiembro({ miembro }: { miembro: Miembro }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div
        className="size-9 rounded-full grid place-items-center shrink-0 text-sm font-medium"
        style={{
          background: 'var(--color-paper-deep)',
          color: 'var(--color-ink-soft)',
        }}
      >
        {miembro.nombre.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium truncate"
          style={{ color: 'var(--color-ink)' }}
        >
          {miembro.nombre}
        </p>
        <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
          {miembro.rol === 'cocina' ? 'Cocina' : 'Mesero'}
        </p>
      </div>
      <form action={eliminarCuentaEquipo} className="shrink-0">
        <input type="hidden" name="id" value={miembro.id} />
        <button
          type="submit"
          aria-label={`Eliminar a ${miembro.nombre}`}
          className={cn(
            'size-9 grid place-items-center rounded-[var(--radius-md)] transition-colors',
            'text-[var(--color-muted)] hover:text-[var(--color-danger)] hover:bg-[var(--color-paper-deep)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ink)]',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </form>
    </li>
  );
}

function IconCocina() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 2v6a2 2 0 0 0 4 0V2M14 2v6a2 2 0 0 0 4 0V2M4 22h16M5 14a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v8H5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMesero() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M5 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
