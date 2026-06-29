'use client';

import { useState, useTransition } from 'react';
import {
  actualizarHorariosDomicilios,
  type HorarioDomicilioInput,
} from './domicilios-actions';
import { nombreDiaCapital, type HorarioDia } from '../../../lib/horarios';

const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

export function HorariosDomiciliosEditor({
  horariosIniciales,
}: {
  horariosIniciales: HorarioDia[];
}) {
  const [horarios, setHorarios] = useState<Record<number, HorarioDia>>(() => {
    const map: Record<number, HorarioDia> = {};
    for (let i = 0; i < 7; i++) {
      map[i] = horariosIniciales.find((h) => h.dia_semana === i) ?? {
        dia_semana: i,
        abierto: true,
        hora_apertura: '08:00',
        hora_cierre: '12:00',
      };
    }
    return map;
  });

  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [pending, startTransition] = useTransition();

  function actualizarDia(dia: number, cambios: Partial<HorarioDia>) {
    setError(null);
    setExito(false);
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia]!, ...cambios },
    }));
  }

  function handleSubmit() {
    setError(null);
    setExito(false);
    const filas: HorarioDomicilioInput[] = Object.values(horarios).map((h) => ({
      ...h,
      hora_apertura: h.abierto ? h.hora_apertura || '08:00' : null,
      hora_cierre: h.abierto ? h.hora_cierre || '12:00' : null,
    }));

    startTransition(async () => {
      const res = await actualizarHorariosDomicilios(filas);
      if (!res.ok) {
        setError(res.error);
      } else {
        setExito(true);
        setTimeout(() => setExito(false), 3000);
      }
    });
  }

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white p-5 sm:p-6 mb-6"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <h2
        className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-1"
        style={{ color: 'var(--color-ink)' }}
      >
        Horario de domicilios
      </h2>
      <p className="text-sm mb-2" style={{ color: 'var(--color-ink-soft)' }}>
        Define hasta que hora recibes domicilios programados cada dia. La hora de corte de cada dia
        es el limite para que un cliente programe ese dia.
      </p>
      <p
        className="text-xs mb-6 leading-relaxed rounded-[var(--radius-md)] px-3 py-2"
        style={{ background: 'var(--color-paper-deep)', color: 'var(--color-muted)' }}
      >
        Ejemplo: si el lunes corta a las 9:00, despues de esa hora el lunes deja de aparecer y el
        cliente solo puede programar martes en adelante.
      </p>

      <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {ORDEN_DIAS.map((dia) => (
          <FilaDiaDomicilio
            key={dia}
            horario={horarios[dia]!}
            onCambio={(cambios) => actualizarDia(dia, cambios)}
          />
        ))}
      </ul>

      {error ? (
        <div
          className="mt-5 px-3 py-2.5 rounded-[var(--radius-md)] border text-sm"
          style={{ borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}
        >
          {error}
        </div>
      ) : null}

      {exito ? (
        <div
          className="mt-5 px-3 py-2.5 rounded-[var(--radius-md)] border text-sm"
          style={{ borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534' }}
        >
          Horario de domicilios guardado.
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={pending}
        className="mt-6 w-full sm:w-auto h-11 px-6 rounded-[var(--radius-md)] text-sm font-medium transition-opacity disabled:opacity-50"
        style={{ background: 'var(--color-ink)', color: 'var(--color-paper)' }}
      >
        {pending ? 'Guardando...' : 'Guardar horario de domicilios'}
      </button>
    </section>
  );
}

function FilaDiaDomicilio({
  horario,
  onCambio,
}: {
  horario: HorarioDia;
  onCambio: (cambios: Partial<HorarioDia>) => void;
}) {
  const horaInicioInput = (horario.hora_apertura ?? '08:00').slice(0, 5);
  const horaCorteInput = (horario.hora_cierre ?? '12:00').slice(0, 5);

  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center justify-between sm:w-44 sm:shrink-0">
          <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
            {nombreDiaCapital(horario.dia_semana)}
          </span>

          <button
            type="button"
            role="switch"
            aria-checked={horario.abierto}
            onClick={() => {
              const nuevoAbierto = !horario.abierto;
              const cambios: Partial<HorarioDia> = { abierto: nuevoAbierto };
              if (nuevoAbierto && !horario.hora_apertura) cambios.hora_apertura = '08:00';
              if (nuevoAbierto && !horario.hora_cierre) cambios.hora_cierre = '12:00';
              onCambio(cambios);
            }}
            className="relative w-10 h-6 rounded-full transition-colors shrink-0"
            style={{
              background: horario.abierto ? 'var(--color-ink)' : 'var(--color-border-strong)',
            }}
          >
            <span
              className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
              style={{
                transform: horario.abierto ? 'translateX(1rem)' : 'translateX(0)',
              }}
            />
          </button>
        </div>

        {horario.abierto ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="time"
              value={horaInicioInput}
              onChange={(e) => {
                if (e.target.value) onCambio({ hora_apertura: e.target.value });
              }}
              aria-label="Hora de inicio"
              className="h-10 px-3 rounded-[var(--radius-md)] border text-sm flex-1 max-w-[8rem]"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
              corta a
            </span>
            <input
              type="time"
              value={horaCorteInput}
              onChange={(e) => {
                if (e.target.value) onCambio({ hora_cierre: e.target.value });
              }}
              aria-label="Hora de corte"
              className="h-10 px-3 rounded-[var(--radius-md)] border text-sm flex-1 max-w-[8rem]"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'var(--color-paper)',
              }}
            />
          </div>
        ) : (
          <span className="text-sm italic" style={{ color: 'var(--color-muted)' }}>
            No recibe domicilios este dia
          </span>
        )}
      </div>
    </li>
  );
}
