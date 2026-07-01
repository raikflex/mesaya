'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  leerCarrito,
  vaciarCarrito,
  calcularTotal,
  type ItemCarrito,
} from '../../../../../lib/carrito';
import { crearPedidoProgramado } from './actions';

export type DiaCheckout = {
  fecha: string;
  nombre: string;
  corte: string;
  esHoy: boolean;
};

// Paises soportados para el telefono (mismo patron que el checkout inmediato).
const PAISES = [
  { codigo: 'CO', nombre: 'Colombia', prefijo: '+57', digitos: 10 },
  { codigo: 'VE', nombre: 'Venezuela', prefijo: '+58', digitos: 10 },
  { codigo: 'EC', nombre: 'Ecuador', prefijo: '+593', digitos: 9 },
  { codigo: 'PE', nombre: 'Peru', prefijo: '+51', digitos: 9 },
  { codigo: 'PA', nombre: 'Panama', prefijo: '+507', digitos: 8 },
  { codigo: 'MX', nombre: 'Mexico', prefijo: '+52', digitos: 10 },
  { codigo: 'US', nombre: 'USA', prefijo: '+1', digitos: 10 },
] as const;

function claveDia(slug: string, fecha: string): string {
  return `${slug}::prog::${fecha}`;
}

/** "2026-06-30" -> "30 jun" */
function fechaCorta(fecha: string): string {
  const [, m, d] = fecha.split('-');
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mi = parseInt(m ?? '1', 10) - 1;
  return `${parseInt(d ?? '1', 10)} ${meses[mi] ?? ''}`;
}

type DiaConItems = { fecha: string; nombre: string; esHoy: boolean; items: ItemCarrito[] };
type ResumenDia = { nombre: string; fecha: string; hora: string; total: number };

export function CheckoutProgramarCliente({
  slug,
  nombreNegocio,
  colorMarca,
  logoUrl,
  dias,
}: {
  slug: string;
  nombreNegocio: string;
  colorMarca: string;
  logoUrl: string | null;
  dias: DiaCheckout[];
}) {
  const [cargando, setCargando] = useState(true);
  const [diasData, setDiasData] = useState<DiaConItems[]>([]);
  const [horas, setHoras] = useState<Record<string, string>>({});
  const [nombre, setNombre] = useState('');
  const [paisCodigo, setPaisCodigo] = useState('CO');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [notaGeneral, setNotaGeneral] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmado, setConfirmado] = useState<{
    telefono: string;
    resumen: ResumenDia[];
    total: number;
  } | null>(null);

  useEffect(() => {
    const data: DiaConItems[] = [];
    for (const d of dias) {
      const items = leerCarrito(claveDia(slug, d.fecha));
      if (items.length > 0) {
        data.push({ fecha: d.fecha, nombre: d.nombre, esHoy: d.esHoy, items });
      }
    }
    setDiasData(data);
    setCargando(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pais = PAISES.find((p) => p.codigo === paisCodigo) ?? PAISES[0];
  const totalGlobal = diasData.reduce((acc, d) => acc + calcularTotal(d.items), 0);

  function confirmar() {
    setError(null);

    if (!nombre.trim() || nombre.trim().length < 2) {
      setError('Ingresa tu nombre.');
      return;
    }
    const soloDigitos = telefono.replace(/\D/g, '');
    if (soloDigitos.length !== pais.digitos) {
      setError(
        `El numero de ${pais.nombre} debe tener ${pais.digitos} digitos. Escribiste ${soloDigitos.length}.`,
      );
      return;
    }
    if (!direccion.trim()) {
      setError('Ingresa la direccion de entrega.');
      return;
    }
    for (const d of diasData) {
      if (!horas[d.fecha]) {
        setError(`Falta la hora de entrega del ${d.nombre}.`);
        return;
      }
    }

    const telefonoCompleto = `${pais.prefijo} ${soloDigitos}`;
    const payloadDias = diasData.map((d) => ({
      fecha: d.fecha,
      horaEntrega: horas[d.fecha]!,
      items: d.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
    }));

    startTransition(async () => {
      const r = await crearPedidoProgramado({
        slug,
        nombreCliente: nombre,
        telefono: telefonoCompleto,
        direccion,
        notaGeneral: notaGeneral || undefined,
        dias: payloadDias,
      });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      const resumen: ResumenDia[] = diasData.map((d) => ({
        nombre: d.nombre,
        fecha: d.fecha,
        hora: horas[d.fecha]!,
        total: calcularTotal(d.items),
      }));
      for (const d of diasData) vaciarCarrito(claveDia(slug, d.fecha));
      setConfirmado({ telefono: telefonoCompleto, resumen, total: r.total });
    });
  }

  if (cargando) {
    return (
      <main className="min-h-screen grid place-items-center" style={{ background: 'var(--color-paper)' }}>
        <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
          Cargando...
        </p>
      </main>
    );
  }

  // Pantalla de confirmacion (in-place, tras crear el pedido).
  if (confirmado) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="max-w-md w-full text-center">
          <div
            className="size-16 rounded-full grid place-items-center mx-auto mb-5"
            style={{ background: colorMarca, color: 'white' }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
              <polyline
                points="5 12 10 17 19 8"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1] mb-2"
            style={{ color: 'var(--color-ink)' }}
          >
            Pedido programado
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-ink-soft)' }}>
            {nombreNegocio} recibio tu pedido. Te contactaran al{' '}
            <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
              {confirmado.telefono}
            </span>{' '}
            para confirmar cada entrega.
          </p>

          <ul
            className="rounded-[var(--radius-lg)] border bg-white divide-y text-left mb-4"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {confirmado.resumen.map((d) => (
              <li key={d.fecha} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {d.nombre} {fechaCorta(d.fecha)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>
                    Entrega a las {d.hora}
                  </p>
                </div>
                <span
                  className="font-[family-name:var(--font-mono)] text-sm shrink-0"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  ${d.total.toLocaleString('es-CO')}
                </span>
              </li>
            ))}
            <li
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'var(--color-paper)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                Total
              </span>
              <span
                className="font-[family-name:var(--font-display)] text-lg"
                style={{ color: 'var(--color-ink)' }}
              >
                ${confirmado.total.toLocaleString('es-CO')}
              </span>
            </li>
          </ul>

          <p className="text-xs leading-relaxed mb-6" style={{ color: 'var(--color-muted)' }}>
            El pago es contra entrega. Le pagas al domiciliario cuando llegue tu pedido.
          </p>

          <Link
            href={`/d/${slug}`}
            className="inline-flex items-center justify-center h-11 px-6 rounded-[var(--radius-md)] text-sm font-medium"
            style={{ background: colorMarca, color: 'white' }}
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  // Carrito vacio (llego aca sin productos).
  if (diasData.length === 0) {
    return (
      <main className="min-h-screen grid place-items-center" style={{ background: 'var(--color-paper)' }}>
        <div className="text-center px-6">
          <p className="text-sm mb-4" style={{ color: 'var(--color-muted)' }}>
            No tienes productos en tu pedido.
          </p>
          <Link
            href={`/d/${slug}/programar`}
            className="inline-flex items-center justify-center h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium"
            style={{ background: colorMarca, color: 'white' }}
          >
            Elegir dias
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--color-paper)', paddingBottom: '6rem' }}
    >
      <header
        className="sticky top-0 z-10 px-5 py-3 border-b backdrop-blur-sm"
        style={{ borderColor: 'var(--color-border)', background: 'rgba(250, 246, 241, 0.92)' }}
      >
        <Link
          href={`/d/${slug}/programar/menu?dias=${dias.map((d) => d.fecha).join(',')}`}
          className="inline-flex items-center gap-2 text-sm"
          style={{ color: 'var(--color-ink)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Volver al menu
        </Link>
      </header>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full space-y-6">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={`Logo de ${nombreNegocio}`}
              className="size-10 rounded-full object-contain shrink-0"
              style={{ background: 'white' }}
            />
          ) : null}
          <div>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
              {nombreNegocio}
            </p>
            <h1
              className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] leading-[1.1]"
              style={{ color: 'var(--color-ink)' }}
            >
              Confirma tu pedido
            </h1>
          </div>
        </div>

        {/* Resumen por dia con hora de entrega */}
        <div className="space-y-4">
          {diasData.map((d) => {
            const totalDia = calcularTotal(d.items);
            return (
              <div
                key={d.fecha}
                className="rounded-[var(--radius-lg)] border bg-white overflow-hidden"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <div
                  className="px-4 py-2.5 flex items-center gap-2 border-b"
                  style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}
                >
                  <span className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {d.nombre} {fechaCorta(d.fecha)}
                  </span>
                  {d.esHoy ? (
                    <span
                      className="text-[0.6rem] uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full"
                      style={{ background: colorMarca, color: 'white' }}
                    >
                      Hoy
                    </span>
                  ) : null}
                </div>

                <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {d.items.map((item) => (
                    <li key={item.productoId} className="px-4 py-2.5 flex items-baseline justify-between gap-3">
                      <p className="text-sm flex-1 min-w-0" style={{ color: 'var(--color-ink)' }}>
                        <span className="mr-1.5" style={{ color: colorMarca }}>
                          {item.cantidad}x
                        </span>
                        {item.nombre}
                      </p>
                      <span
                        className="font-[family-name:var(--font-mono)] text-sm shrink-0"
                        style={{ color: 'var(--color-ink-soft)' }}
                      >
                        ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ background: 'var(--color-paper)' }}>
                  <label className="text-sm" style={{ color: 'var(--color-ink)' }}>
                    Hora de entrega
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="time"
                      value={horas[d.fecha] ?? ''}
                      onChange={(e) => setHoras((prev) => ({ ...prev, [d.fecha]: e.target.value }))}
                      aria-label={`Hora de entrega del ${d.nombre}`}
                      className="h-10 px-3 rounded-[var(--radius-md)] border text-sm"
                      style={{
                        borderColor: 'var(--color-border-strong)',
                        color: 'var(--color-ink)',
                        background: 'white',
                      }}
                    />
                    <span
                      className="font-[family-name:var(--font-mono)] text-sm"
                      style={{ color: 'var(--color-ink)' }}
                    >
                      ${totalDia.toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Datos del cliente */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>
            Tus datos
          </p>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
            maxLength={60}
            className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-sm"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'white',
            }}
          />

          <div className="flex gap-2">
            <div className="relative shrink-0">
              <select
                value={paisCodigo}
                onChange={(e) => setPaisCodigo(e.target.value)}
                className="h-11 pl-3 pr-8 rounded-[var(--radius-md)] border text-sm appearance-none cursor-pointer"
                style={{
                  borderColor: 'var(--color-border-strong)',
                  color: 'var(--color-ink)',
                  background: 'white',
                }}
                aria-label="Pais"
              >
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.codigo} {p.prefijo}
                  </option>
                ))}
              </select>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-muted)' }}
                aria-hidden
              >
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value.replace(/[^\d\s]/g, ''))}
              placeholder={`Telefono (${pais.digitos} digitos)`}
              maxLength={15}
              className="flex-1 min-w-0 h-11 px-3 rounded-[var(--radius-md)] border text-sm"
              style={{
                borderColor: 'var(--color-border-strong)',
                color: 'var(--color-ink)',
                background: 'white',
              }}
            />
          </div>

          <textarea
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            placeholder="Direccion de entrega (barrio, calle, numero, referencias)"
            rows={2}
            maxLength={300}
            className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-sm resize-none"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'white',
            }}
          />
        </div>

        {/* Nota general */}
        <div>
          <p className="text-xs uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-muted)' }}>
            Nota para el domicilio (opcional)
          </p>
          <textarea
            value={notaGeneral}
            onChange={(e) => setNotaGeneral(e.target.value)}
            placeholder="Instrucciones de entrega, alergias, detalles por dia..."
            rows={2}
            maxLength={300}
            className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border text-sm resize-none"
            style={{
              borderColor: 'var(--color-border-strong)',
              color: 'var(--color-ink)',
              background: 'white',
            }}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-5 py-4 border-t"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.96)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <p className="max-w-md mx-auto text-xs text-center leading-relaxed mb-3" style={{ color: 'var(--color-muted)' }}>
          Pago contra entrega. Al confirmar, aceptas nuestra{' '}
          <a href="/politica-datos" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-ink-soft)' }}>
            Politica de Datos
          </a>
          .
        </p>
        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className="w-full max-w-md mx-auto h-12 rounded-[var(--radius-md)] text-base font-medium flex items-center justify-between px-5 disabled:opacity-50"
          style={{ background: colorMarca, color: 'white' }}
        >
          <span>{pending ? 'Enviando...' : 'Confirmar pedido'}</span>
          <span className="font-[family-name:var(--font-mono)]">
            ${totalGlobal.toLocaleString('es-CO')}
          </span>
        </button>
      </div>
    </main>
  );
}
