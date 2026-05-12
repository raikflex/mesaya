'use client';

import { useState, useTransition } from 'react';
import { obtenerDatosReporte } from './reporte-actions';
import { exportarCSV, exportarExcel, exportarPDF } from './exportar';

type Preset = 'hoy' | 'semana' | 'mes' | 'mes_anterior' | 'personalizado';

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rangoPara(preset: Preset): { desde: string; hasta: string } | null {
  const ahora = new Date();
  if (preset === 'hoy') {
    const h = ymd(ahora);
    return { desde: h, hasta: h };
  }
  if (preset === 'semana') {
    const inicio = new Date(ahora);
    inicio.setDate(inicio.getDate() - 6); // ultimos 7 dias incluyendo hoy
    return { desde: ymd(inicio), hasta: ymd(ahora) };
  }
  if (preset === 'mes') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return { desde: ymd(inicio), hasta: ymd(ahora) };
  }
  if (preset === 'mes_anterior') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth(), 0); // ultimo dia del mes anterior
    return { desde: ymd(inicio), hasta: ymd(fin) };
  }
  return null;
}

export function ReporteExportador() {
  const [preset, setPreset] = useState<Preset>('mes');
  const inicial = rangoPara('mes')!;
  const [desde, setDesde] = useState(inicial.desde);
  const [hasta, setHasta] = useState(inicial.hasta);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function elegirPreset(p: Preset) {
    setPreset(p);
    setError(null);
    if (p !== 'personalizado') {
      const r = rangoPara(p);
      if (r) {
        setDesde(r.desde);
        setHasta(r.hasta);
      }
    }
  }

  function handleDescarga(formato: 'csv' | 'excel' | 'pdf') {
    setError(null);
    startTransition(async () => {
      const res = await obtenerDatosReporte(desde, hasta);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.data.resumen.cantidadSesiones === 0) {
        setError('No hay datos en el rango seleccionado.');
        return;
      }
      try {
        if (formato === 'csv') exportarCSV(res.data);
        else if (formato === 'excel') exportarExcel(res.data);
        else exportarPDF(res.data);
      } catch (err) {
        setError('Error al generar el archivo: ' + String(err));
      }
    });
  }

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white p-5 sm:p-6 mb-8"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <h2
        className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-1"
        style={{ color: 'var(--color-ink)' }}
      >
        Exportar reporte
      </h2>
      <p className="text-sm mb-5" style={{ color: 'var(--color-ink-soft)' }}>
        Descarga el detalle de ventas para tu contabilidad. Incluye sesiones
        cerradas y comandas detalladas con items.
      </p>

      {/* Presets de rango */}
      <div className="flex flex-wrap gap-2 mb-4">
        <PresetButton
          activo={preset === 'hoy'}
          onClick={() => elegirPreset('hoy')}
        >
          Hoy
        </PresetButton>
        <PresetButton
          activo={preset === 'semana'}
          onClick={() => elegirPreset('semana')}
        >
          Esta semana
        </PresetButton>
        <PresetButton
          activo={preset === 'mes'}
          onClick={() => elegirPreset('mes')}
        >
          Este mes
        </PresetButton>
        <PresetButton
          activo={preset === 'mes_anterior'}
          onClick={() => elegirPreset('mes_anterior')}
        >
          Mes anterior
        </PresetButton>
        <PresetButton
          activo={preset === 'personalizado'}
          onClick={() => elegirPreset('personalizado')}
        >
          Personalizado
        </PresetButton>
      </div>

      {/* Date pickers */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <div className="flex-1 w-full sm:w-auto">
          <label
            className="block text-[0.65rem] uppercase tracking-[0.12em] mb-1"
            style={{ color: 'var(--color-muted)' }}
          >
            Desde
          </label>
          <input
            type="date"
            value={desde}
            onChange={(e) => {
              setDesde(e.target.value);
              setPreset('personalizado');
              setError(null);
            }}
            className="h-10 px-3 rounded-[var(--radius-md)] border text-sm w-full"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
            }}
          />
        </div>
        <div className="flex-1 w-full sm:w-auto">
          <label
            className="block text-[0.65rem] uppercase tracking-[0.12em] mb-1"
            style={{ color: 'var(--color-muted)' }}
          >
            Hasta
          </label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => {
              setHasta(e.target.value);
              setPreset('personalizado');
              setError(null);
            }}
            className="h-10 px-3 rounded-[var(--radius-md)] border text-sm w-full"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'var(--color-paper)',
            }}
          />
        </div>
      </div>

      {/* Botones de descarga */}
      <div className="flex flex-col sm:flex-row gap-2">
        <BotonDescarga
          onClick={() => handleDescarga('csv')}
          disabled={pending}
          icono={<IconCsv />}
          label="CSV"
        />
        <BotonDescarga
          onClick={() => handleDescarga('excel')}
          disabled={pending}
          icono={<IconExcel />}
          label="Excel"
        />
        <BotonDescarga
          onClick={() => handleDescarga('pdf')}
          disabled={pending}
          icono={<IconPdf />}
          label="PDF"
        />
      </div>

      {pending ? (
        <p
          className="mt-4 text-xs"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          Generando reporte...
        </p>
      ) : null}

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
    </section>
  );
}

function PresetButton({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="h-9 px-3.5 rounded-full text-xs transition-all"
      style={{
        background: activo ? 'var(--color-ink)' : 'transparent',
        color: activo ? 'var(--color-paper)' : 'var(--color-ink-soft)',
        border: activo
          ? '1px solid var(--color-ink)'
          : '1px solid var(--color-border-strong)',
      }}
    >
      {children}
    </button>
  );
}

function BotonDescarga({
  onClick,
  disabled,
  icono,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  icono: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 h-11 px-4 rounded-[var(--radius-md)] border flex items-center justify-center gap-2 text-sm font-medium transition-opacity disabled:opacity-50"
      style={{
        background: 'white',
        color: 'var(--color-ink)',
        borderColor: 'var(--color-border-strong)',
      }}
    >
      {icono}
      <span>{label}</span>
    </button>
  );
}

function IconCsv() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        d="M8 13h2M14 13h2M8 17h2M14 17h2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconExcel() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        d="M9 13l3 3M12 13l-3 3M9 18l3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPdf() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
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
        d="M9 15v-2h1.5a1 1 0 0 1 0 2zM14 13h2M14 13v4M14 15h1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
