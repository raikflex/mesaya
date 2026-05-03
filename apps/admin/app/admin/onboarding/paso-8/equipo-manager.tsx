'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { Button, Field, Input, cn } from '@mesaya/ui';
import {
  cerrarOnboarding,
  crearCuentaEquipo,
  eliminarCuentaEquipo,
  type CrearCuentaState,
} from './actions';

type Miembro = {
  id: string;
  nombre: string;
  rol: 'mesero' | 'cocina';
};

const initialAdd: CrearCuentaState = { ok: false };

export function EquipoManager({ miembros }: { miembros: Miembro[] }) {
  const totalCocina = miembros.filter((m) => m.rol === 'cocina').length;
  const totalMeseros = miembros.filter((m) => m.rol === 'mesero').length;

  // Para MVP exigimos al menos 1 cuenta de cocina (alguien tiene que recibir comandas).
  const puedeCerrar = totalCocina >= 1;

  return (
    <div className="space-y-8">
      <FormularioAgregar />

      <Lista miembros={miembros} />

      <div className="pt-2 flex items-center justify-between gap-4 flex-wrap border-t border-[var(--color-border)] mt-2">
        <div className="pt-4">
          <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
            {totalCocina === 0
              ? 'Necesitas al menos una cuenta de cocina para continuar.'
              : `${totalCocina} cocina Â· ${totalMeseros} mesero${totalMeseros === 1 ? '' : 's'}.`}
          </p>
          {puedeCerrar ? (
            <p
              className="text-xs mt-1 max-w-md leading-relaxed"
              style={{ color: 'var(--color-muted)' }}
            >
              Tu restaurante quedarÃ¡ configurado pero sin abrirse al pÃºblico todavÃ­a.
              Desde el panel decides cuÃ¡ndo empezar a operar.
            </p>
          ) : null}
        </div>
        <form action={cerrarOnboarding} className="pt-4">
          <Button type="submit" size="lg" disabled={!puedeCerrar}>
            Ir a mi panel
            <ArrowRight />
          </Button>
        </form>
      </div>
    </div>
  );
}

function FormularioAgregar() {
  const [state, formAction, pending] = useActionState(crearCuentaEquipo, initialAdd);
  const formRef = useRef<HTMLFormElement>(null);
  const [rolSeleccionado, setRolSeleccionado] = useState<'mesero' | 'cocina'>('cocina');

  useEffect(() => {
    if (state.ok && formRef.current) {
      formRef.current.reset();
      // DespuÃ©s de crear, dejar el rol en mesero (lo mÃ¡s comÃºn a agregar despuÃ©s).
      setRolSeleccionado('mesero');
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
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="nombre" label="Nombre" error={state.fieldErrors?.nombre}>
            <Input
              id="nombre"
              name="nombre"
              type="text"
              required
              placeholder="Ej: Andrea"
              maxLength={80}
              autoFocus
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
  const [copiado, setCopiado] = useState(false);

  const textoParaCompartir = `Hola ${credenciales.nombre}, tu acceso a MesaYA:\n\nCorreo: ${credenciales.email}\nContraseÃ±a: ${credenciales.password}\n\nGuÃ¡rdala bien, esta contraseÃ±a es temporal.`;

  function copiar() {
    void navigator.clipboard.writeText(textoParaCompartir);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
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
              Guarda estas credenciales y compÃ¡rtelas. No se mostrarÃ¡n de nuevo.
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
          <dd style={{ color: 'var(--color-ink)' }}>{credenciales.password}</dd>
        </div>
      </dl>

      <Button type="button" onClick={copiar} variant="ghost" size="sm" className="w-full">
        {copiado ? 'Â¡Copiado!' : 'Copiar mensaje para enviar'}
      </Button>
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
          ? 'border-[var(--color-ink)] bg-[var(--color-paper)]'
          : 'border-[var(--color-border)] bg-transparent hover:border-[var(--color-border-strong)] hover:bg-[var(--color-paper-deep)]',
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
          AÃºn no has creado cuentas para tu equipo. Empieza por la cuenta de cocina.
        </p>
      </div>
    );
  }

  // Agrupar por rol
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
        {titulo} Â· {miembros.length}
      </h3>
      <ul
        className="rounded-[var(--radius-lg)] border divide-y"
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-paper)',
        }}
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

function ArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

