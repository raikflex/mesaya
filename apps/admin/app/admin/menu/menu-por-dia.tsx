'use client';

import { useState, useTransition } from 'react';
import { asignarMenuDia } from './menu-dia-actions';

export type MenuOpcion = { id: string; nombre: string; canal: string };
export type Asignacion = { canal: string; dia_semana: number; menu_id: string };

const CANALES: { canal: string; label: string }[] = [
  { canal: 'restaurante', label: 'Restaurante (mesa)' },
  { canal: 'domicilios_diarios', label: 'Domicilios diarios' },
  { canal: 'domicilios_programados', label: 'Domicilios programados' },
];

// -1 = "Por defecto". Luego lunes..domingo.
const FILAS: { dia: number; label: string }[] = [
  { dia: -1, label: 'Por defecto' },
  { dia: 1, label: 'Lunes' },
  { dia: 2, label: 'Martes' },
  { dia: 3, label: 'Miercoles' },
  { dia: 4, label: 'Jueves' },
  { dia: 5, label: 'Viernes' },
  { dia: 6, label: 'Sabado' },
  { dia: 0, label: 'Domingo' },
];

export function MenuPorDia({
  menus,
  asignaciones,
}: {
  menus: MenuOpcion[];
  asignaciones: Asignacion[];
}) {
  const [abierto, setAbierto] = useState(false);

  // canal -> (dia -> menu_id)
  const porCanal = new Map<string, Map<number, string>>();
  for (const a of asignaciones) {
    if (!porCanal.has(a.canal)) porCanal.set(a.canal, new Map());
    porCanal.get(a.canal)!.set(a.dia_semana, a.menu_id);
  }

  const conMenuPropio = asignaciones.filter((a) => a.dia_semana !== -1).length;

  return (
    <section
      className="rounded-[var(--radius-lg)] border bg-white overflow-hidden"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <h2
            className="font-[family-name:var(--font-display)] text-xl tracking-[-0.015em]"
            style={{ color: 'var(--color-ink)' }}
          >
            Menu por dia
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            Elige que menu se muestra cada dia, por canal. Por defecto aplica a los dias sin menu
            propio.
          </p>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{
            color: 'var(--color-muted)',
            transform: abierto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {abierto ? (
        <div
          className="px-5 pb-5 border-t pt-4 space-y-6"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {CANALES.map((c) => (
            <CanalSeccion
              key={c.canal}
              canal={c.canal}
              label={c.label}
              menus={menus.filter((m) => m.canal === c.canal)}
              asignaciones={porCanal.get(c.canal) ?? new Map()}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function CanalSeccion({
  canal,
  label,
  menus,
  asignaciones,
}: {
  canal: string;
  label: string;
  menus: MenuOpcion[];
  asignaciones: Map<number, string>;
}) {
  const [abierto, setAbierto] = useState(false);

  // Resumen para la cabecera colapsada.
  const tieneDefault = asignaciones.has(-1);
  const diasPropios = FILAS.filter((f) => f.dia !== -1 && asignaciones.has(f.dia)).length;
  let resumen: string;
  if (menus.length === 0) resumen = 'Sin menus para este canal';
  else if (!tieneDefault && diasPropios === 0) resumen = 'Menu normal (sin asignar)';
  else {
    const partes: string[] = [];
    if (tieneDefault) partes.push('Por defecto');
    if (diasPropios > 0) partes.push(`${diasPropios} dia${diasPropios === 1 ? '' : 's'} propio${diasPropios === 1 ? '' : 's'}`);
    resumen = partes.join(' + ');
  }

  return (
    <div className="rounded-[var(--radius-md)] border" style={{ borderColor: 'var(--color-border)' }}>
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
            {label}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {resumen}
          </p>
        </div>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{
            color: 'var(--color-muted)',
            transform: abierto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {abierto ? (
        <div className="px-3.5 pb-3.5 border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
          {menus.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
              No tienes menus pregrabados para este canal. Crea uno arriba para poder asignarlo.
            </p>
          ) : (
            <ul className="space-y-2">
              {FILAS.map((f) => (
                <FilaDia
                  key={f.dia}
                  canal={canal}
                  dia={f.dia}
                  label={f.label}
                  menus={menus}
                  menuIdActual={asignaciones.get(f.dia) ?? ''}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FilaDia({
  canal,
  dia,
  label,
  menus,
  menuIdActual,
}: {
  canal: string;
  dia: number;
  label: string;
  menus: MenuOpcion[];
  menuIdActual: string;
}) {
  const [pending, startTransition] = useTransition();
  const esDefault = dia === -1;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const menuId = e.target.value;
    const fd = new FormData();
    fd.append('canal', canal);
    fd.append('dia_semana', String(dia));
    fd.append('menu_id', menuId);
    startTransition(() => asignarMenuDia(fd));
  }

  return (
    <li
      className="flex items-center gap-3"
      style={
        esDefault ? { paddingBottom: 8, borderBottom: '1px solid var(--color-border)' } : undefined
      }
    >
      <span
        className="text-sm w-24 shrink-0"
        style={{
          color: esDefault ? 'var(--color-ink-soft)' : 'var(--color-ink)',
          fontWeight: esDefault ? 600 : 500,
        }}
      >
        {label}
      </span>
      <select
        key={`${canal}-${dia}-${menuIdActual}`}
        defaultValue={menuIdActual}
        onChange={onChange}
        disabled={pending}
        className="flex-1 h-9 px-3 rounded-[var(--radius-md)] border text-sm disabled:opacity-50"
        style={{
          borderColor: 'var(--color-border-strong)',
          color: 'var(--color-ink)',
          background: 'white',
        }}
      >
        <option value="">Menu normal</option>
        {menus.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
      </select>
    </li>
  );
}
