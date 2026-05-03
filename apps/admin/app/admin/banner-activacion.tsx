'use client';

import { useActionState } from 'react';
import { Button } from '@mesaya/ui';
import {
  empezarAOperar,
  type EmpezarAOperarState,
} from './actions/empezar-a-operar';

const initialState: EmpezarAOperarState = { ok: false };

/**
 * Banner que cambia según el estado del restaurante:
 * - archivado: amarillo, "Aún no has abierto" + botón "Empezar a operar"
 * - activo: verde, "Operando" + días que quedan de trial
 * - suspendido: rojo, "Trial vencido" + info de reactivación
 */
export function BannerActivacion({
  estado,
  trialTerminaEn,
}: {
  estado: string;
  trialTerminaEn: string | null;
}) {
  if (estado === 'archivado') {
    return <BannerArchivado />;
  }
  if (estado === 'activo') {
    return <BannerActivo trialTerminaEn={trialTerminaEn} />;
  }
  if (estado === 'suspendido') {
    return <BannerSuspendido />;
  }
  return null;
}

function BannerArchivado() {
  const [state, formAction, pending] = useActionState(empezarAOperar, initialState);

  return (
    <section
      className="rounded-[var(--radius-lg)] border-2 p-6 sm:p-8"
      style={{
        borderColor: '#b07a2e',
        background: '#fef7e6',
      }}
    >
      <div className="flex items-start gap-4">
        <span
          className="size-11 rounded-full grid place-items-center shrink-0"
          style={{ background: '#b07a2e', color: '#fff' }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
          >
            <path
              d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <h2
            className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em]"
            style={{ color: '#7a4f0d' }}
          >
            Aún no has abierto al público.
          </h2>
          <p
            className="mt-2 text-sm leading-relaxed max-w-xl"
            style={{ color: '#7a4f0d' }}
          >
            Tu restaurante está configurado pero los QRs no funcionan todavía.
            Cuando estés listo, click "Empezar a operar". Empieza tu trial gratuito
            de 15 días desde ese momento.
          </p>

          {state.error ? (
            <div
              role="alert"
              className="mt-4 rounded-[var(--radius-md)] border px-3.5 py-3 text-sm"
              style={{
                borderColor: 'var(--color-danger)',
                color: 'var(--color-danger)',
                background: '#fff',
              }}
            >
              {state.error}
            </div>
          ) : null}

          <form action={formAction} className="mt-5">
            <Button type="submit" size="lg" loading={pending}>
              {pending ? 'Activando…' : 'Empezar a operar'}
              <ArrowRight />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}

function BannerActivo({ trialTerminaEn }: { trialTerminaEn: string | null }) {
  if (!trialTerminaEn) {
    return (
      <SimpleBanner
        color="#2f5d3a"
        bg="#e8f5ed"
        textColor="#1d3d24"
        icon={<IconCheck />}
        titulo="Operando"
        mensaje="Tu restaurante está abierto al público y recibiendo pedidos."
      />
    );
  }

  const fin = new Date(trialTerminaEn);
  const ahora = new Date();
  const ms = fin.getTime() - ahora.getTime();
  const dias = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));

  let titulo = 'Operando';
  let mensaje = `Tu trial gratuito termina en ${dias} día${dias === 1 ? '' : 's'}.`;
  let urgente = false;

  if (dias <= 0) {
    titulo = 'Trial vencido';
    mensaje =
      'Tu trial terminó. Pronto tu restaurante pasará a suspendido si no activas el pago.';
    urgente = true;
  } else if (dias <= 3) {
    titulo = `Operando · trial vence pronto`;
    mensaje = `Te quedan ${dias} día${dias === 1 ? '' : 's'} de trial gratuito. Activa tu suscripción para no interrumpir el servicio (próximamente).`;
    urgente = true;
  }

  return (
    <SimpleBanner
      color={urgente ? '#b07a2e' : '#2f5d3a'}
      bg={urgente ? '#fef7e6' : '#e8f5ed'}
      textColor={urgente ? '#7a4f0d' : '#1d3d24'}
      icon={urgente ? <IconWarning /> : <IconCheck />}
      titulo={titulo}
      mensaje={mensaje}
    />
  );
}

function BannerSuspendido() {
  return (
    <SimpleBanner
      color="var(--color-danger)"
      bg="var(--color-accent-soft)"
      textColor="var(--color-danger)"
      icon={<IconWarning />}
      titulo="Tu restaurante está suspendido"
      mensaje="Tu trial terminó y aún no has activado el pago. Tus QRs muestran 'sin servicio' hasta reactivar (próximamente: pago en línea)."
    />
  );
}

function SimpleBanner({
  color,
  bg,
  textColor,
  icon,
  titulo,
  mensaje,
}: {
  color: string;
  bg: string;
  textColor: string;
  icon: React.ReactNode;
  titulo: string;
  mensaje: string;
}) {
  return (
    <section
      className="rounded-[var(--radius-lg)] border-2 p-5 sm:p-6"
      style={{ borderColor: color, background: bg }}
    >
      <div className="flex items-start gap-4">
        <span
          className="size-10 rounded-full grid place-items-center shrink-0"
          style={{ background: color, color: '#fff' }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h2
            className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em]"
            style={{ color: textColor }}
          >
            {titulo}
          </h2>
          <p
            className="mt-1.5 text-sm leading-relaxed max-w-2xl"
            style={{ color: textColor }}
          >
            {mensaje}
          </p>
        </div>
      </div>
    </section>
  );
}

function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <polyline
        points="5 12 10 17 19 8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconWarning() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
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
