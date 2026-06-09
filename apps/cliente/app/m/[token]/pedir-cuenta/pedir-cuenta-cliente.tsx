'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@mesaya/database/client';
import { leerSesionCliente } from '../../../../lib/cliente-session';
import { borrarTimerLlamado, calcularSegundosRestantes } from '../../../../lib/timer-llamado';
import { cancelarLlamado } from '../llamar-mesero/actions';
import { pedirCuenta, type FormaPago, type TipoDoc } from './actions';

const PORCENTAJES_PROPINA = [5, 10, 15];

type ItemFila = {
  id: string;
  nombre_snapshot: string;
  precio_snapshot: number;
  cantidad: number;
  nota: string | null;
};

type ComandaPorCliente = {
  comandaId: string;
  numeroDiario: number;
  total: number;
  estado: string;
  items: ItemFila[];
  cliente: string;
};

const FORMAS_PAGO: { value: FormaPago; label: string; descripcion: string }[] = [
  { value: 'efectivo', label: 'Efectivo', descripcion: 'Pago en monedas y billetes' },
  { value: 'tarjeta', label: 'Tarjeta', descripcion: 'Debito o credito en datafono' },
  {
    value: 'transferencia',
    label: 'Transferencia / PSE',
    descripcion: 'Nequi, Bancolombia, Daviplata',
  },
  { value: 'no_seguro', label: 'Aun no decido', descripcion: 'Le digo al mesero al llegar' },
];

export function PedirCuentaCliente({
  qrToken,
  numeroMesa,
  nombreNegocio,
  colorMarca,
  tieneSesionAbierta,
  comandas,
  llamadoPagoPendiente,
  sesionId,
}: {
  qrToken: string;
  numeroMesa: string;
  nombreNegocio: string;
  colorMarca: string;
  tieneSesionAbierta: boolean;
  comandas: ComandaPorCliente[];
  llamadoPagoPendiente: {
    id: string;
    creado_en: string;
    mesero_atendiendo_nombre?: string | null;
  } | null;
  sesionId: string | null;
}) {
  const router = useRouter();
  // Propina: monto en pesos. 0 = sin propina. El cliente elige con botones
  // rapidos (% del subtotal) o escribe un monto personalizado.
  const [propinaMonto, setPropinaMonto] = useState(0);
  const [montoManual, setMontoManual] = useState('');
  const [formaPago, setFormaPago] = useState<FormaPago>('efectivo');
  // Factura opcional: la mayoria de clientes no pide. Si abre el toggle,
  // aparecen los 3 campos. Sin esto el INSERT a llamados_mesero deja
  // doc_* en null y el mesero no ve seccion de factura.
  const [quiereFactura, setQuiereFactura] = useState(false);
  const [tipoDoc, setTipoDoc] = useState<TipoDoc>('CC');
  const [numeroDoc, setNumeroDoc] = useState('');
  const [nombreDoc, setNombreDoc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [urlVolver, setUrlVolver] = useState<string>(`/m/${qrToken}/menu`);
  const [llamadoActivo, setLlamadoActivo] = useState(llamadoPagoPendiente);

  useEffect(() => {
    setLlamadoActivo(llamadoPagoPendiente);
  }, [llamadoPagoPendiente]);

  useEffect(() => {
    const sesion = leerSesionCliente(qrToken);
    if (sesion?.ultimaComandaId) {
      setUrlVolver(`/m/${qrToken}/menu/enviada/${sesion.ultimaComandaId}`);
    }
  }, [qrToken]);

  /**
   * Realtime: escuchar cambios en el llamado de pago + INSERT en `pagos` para
   * redirigir a la pantalla de gracias cuando el mesero confirma el cobro.
   */
  useEffect(() => {
    if (!sesionId) return;

    const supabase = createClient();
    const canalNombre = `cliente-pago-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let canalActual: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    async function setup() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelado) return;
      if (session?.access_token) {
        supabase.realtime.setAuth(session.access_token);
      }
      if (cancelado) return;

      const canal = supabase
        .channel(canalNombre)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'llamados_mesero' },
          (payload) => {
            if (payload.eventType === 'UPDATE') {
              const fila = payload.new as {
                id: string;
                sesion_id: string;
                motivo: string;
                estado: string;
                mesero_atendiendo_nombre: string | null;
              };
              if (fila.sesion_id !== sesionId) return;
              if (fila.motivo !== 'pago') return;

              setLlamadoActivo((actual) => {
                if (!actual || actual.id !== fila.id) return actual;
                return {
                  ...actual,
                  mesero_atendiendo_nombre: fila.mesero_atendiendo_nombre,
                };
              });
            }
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'pagos' },
          (payload) => {
            const fila = payload.new as {
              sesion_id: string;
              estado: string;
            };
            if (fila.sesion_id !== sesionId) return;
            if (fila.estado === 'confirmado') {
              router.push(`/m/${qrToken}/gracias?sesion=${sesionId}`);
            }
          },
        );

      if (cancelado) {
        supabase.removeChannel(canal);
        return;
      }

      canalActual = canal;
      canal.subscribe();
    }

    setup();

    return () => {
      cancelado = true;
      if (canalActual) {
        supabase.removeChannel(canalActual);
        canalActual = null;
      }
    };
  }, [qrToken, sesionId, router]);

  if (!tieneSesionAbierta || comandas.length === 0) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
        style={{ background: 'var(--color-paper)' }}
      >
        <div className="w-full max-w-sm">
          <h1
            className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
            style={{ color: 'var(--color-ink)' }}
          >
            Aun no hiciste tu pedido.
          </h1>
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--color-ink-soft)' }}>
            Pide algo del menu primero. Cuando termines, regresas aqui para pedir la cuenta.
          </p>
          <Link
            href={`/m/${qrToken}/menu`}
            className="inline-flex items-center justify-center h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium"
            style={{ background: colorMarca, color: 'white' }}
          >
            Ir al menu
          </Link>
        </div>
      </main>
    );
  }

  const subtotal = comandas.reduce((acc, c) => acc + c.total, 0);
  const propina = propinaMonto;
  const totalFinal = subtotal + propina;

  // Que boton rapido esta activo (para resaltar), comparando el monto.
  const pctActivo = PORCENTAJES_PROPINA.find(
    (pct) => Math.round(subtotal * (pct / 100)) === propinaMonto && propinaMonto > 0,
  );

  // Elegir propina por porcentaje del subtotal (botones rapidos).
  function elegirPorcentaje(pct: number) {
    setPropinaMonto(Math.round(subtotal * (pct / 100)));
    setMontoManual('');
  }
  // Escribir un monto personalizado en pesos.
  function elegirMontoManual(valor: string) {
    const limpio = valor.replace(/[^\d]/g, '');
    setMontoManual(limpio);
    setPropinaMonto(limpio ? parseInt(limpio, 10) : 0);
  }
  function sinPropina() {
    setPropinaMonto(0);
    setMontoManual('');
  }

  function pedir() {
    setError(null);

    // Validacion local de factura antes de enviar
    if (quiereFactura) {
      const num = numeroDoc.trim();
      const nom = nombreDoc.trim();
      if (num.length < 3) {
        setError('Ingresa el numero de documento.');
        return;
      }
      if (nom.length < 3) {
        setError('Ingresa el nombre o razon social.');
        return;
      }
    }

    startTransition(async () => {
      const resultado = await pedirCuenta({
        qrToken,
        propinaMonto,
        formaPago,
        factura: quiereFactura
          ? {
              tipoDoc,
              numero: numeroDoc.trim(),
              nombre: nombreDoc.trim(),
            }
          : null,
      });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  if (llamadoActivo) {
    return (
      <PantallaCuentaPedida
        qrToken={qrToken}
        numeroMesa={numeroMesa}
        nombreNegocio={nombreNegocio}
        colorMarca={colorMarca}
        totalFinal={totalFinal}
        llamado={llamadoActivo}
        urlVolver={urlVolver}
        propinaMonto={propinaMonto}
        formaPago={formaPago}
      />
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{
        background: 'var(--color-paper)',
        paddingBottom: '6rem',
      }}
    >
      <header
        className="sticky top-0 z-10 px-5 py-3 border-b backdrop-blur-sm"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.92)',
        }}
      >
        <Link
          href={urlVolver}
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
          Volver
        </Link>
      </header>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        <p
          className="text-xs uppercase tracking-[0.14em] mb-1"
          style={{ color: 'var(--color-muted)' }}
        >
          Mesa {numeroMesa} - {nombreNegocio}
        </p>
        <h1
          className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em] leading-[1.1] mb-6"
          style={{ color: 'var(--color-ink)' }}
        >
          Tu cuenta
        </h1>

        <section
          className="rounded-[var(--radius-lg)] border bg-white mb-5 overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
            <p
              className="text-xs uppercase tracking-[0.14em]"
              style={{ color: 'var(--color-muted)' }}
            >
              Detalle de la mesa - {comandas.length} pedido
              {comandas.length === 1 ? '' : 's'}
            </p>
          </div>
          <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {comandas.map((c) => (
              <li key={c.comandaId} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p
                    className="text-xs uppercase tracking-[0.1em]"
                    style={{ color: 'var(--color-muted)' }}
                  >
                    #{c.numeroDiario.toString().padStart(3, '0')} - {c.cliente}
                  </p>
                  <span
                    className="font-[family-name:var(--font-mono)] text-sm"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    ${c.total.toLocaleString('es-CO')}
                  </span>
                </div>
                <ul className="space-y-1">
                  {c.items.map((it) => (
                    <li key={it.id} className="text-xs leading-relaxed flex items-start gap-2">
                      <span style={{ color: 'var(--color-muted)' }}>{it.cantidad}x</span>
                      <span className="flex-1" style={{ color: 'var(--color-ink-soft)' }}>
                        {it.nombre_snapshot}
                        {it.nota ? (
                          <span className="italic ml-1" style={{ color: 'var(--color-muted)' }}>
                            ({it.nota})
                          </span>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-[var(--radius-lg)] border bg-white p-5 mb-5"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span style={{ color: 'var(--color-ink-soft)' }}>Subtotal</span>
              <span
                className="font-[family-name:var(--font-mono)]"
                style={{ color: 'var(--color-ink)' }}
              >
                ${subtotal.toLocaleString('es-CO')}
              </span>
            </div>

            {/* Propina: botones rapidos + monto personalizado */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--color-ink-soft)' }}>
                  Propina <span style={{ color: 'var(--color-muted)' }}>(voluntaria)</span>
                </span>
                {propina > 0 ? (
                  <span
                    className="text-sm font-[family-name:var(--font-mono)]"
                    style={{ color: 'var(--color-ink)' }}
                  >
                    ${propina.toLocaleString('es-CO')}
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={sinPropina}
                  className="h-10 rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
                  style={{
                    borderColor: propinaMonto === 0 ? colorMarca : 'var(--color-border-strong)',
                    background: propinaMonto === 0 ? colorMarca : 'white',
                    color: propinaMonto === 0 ? 'white' : 'var(--color-ink)',
                    borderWidth: propinaMonto === 0 ? 1.5 : 1,
                  }}
                >
                  No
                </button>
                {PORCENTAJES_PROPINA.map((pct) => {
                  const activo = pctActivo === pct;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => elegirPorcentaje(pct)}
                      className="h-10 rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
                      style={{
                        borderColor: activo ? colorMarca : 'var(--color-border-strong)',
                        background: activo ? colorMarca : 'white',
                        color: activo ? 'white' : 'var(--color-ink)',
                        borderWidth: activo ? 1.5 : 1,
                      }}
                    >
                      {pct}%
                    </button>
                  );
                })}
              </div>
              <div className="mt-2">
                <div
                  className="flex items-center gap-2 px-3 h-10 rounded-[var(--radius-md)] border"
                  style={{
                    borderColor: montoManual ? colorMarca : 'var(--color-border-strong)',
                    background: 'var(--color-paper)',
                    borderWidth: montoManual ? 1.5 : 1,
                  }}
                >
                  <span className="text-sm" style={{ color: 'var(--color-muted)' }}>
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={montoManual}
                    onChange={(e) => elegirMontoManual(e.target.value)}
                    placeholder="Otro monto"
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                    style={{ color: 'var(--color-ink)' }}
                  />
                </div>
              </div>
            </div>

            <div
              className="border-t pt-3 mt-1 flex items-center justify-between"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <span className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>
                Total a pagar
              </span>
              <span
                className="font-[family-name:var(--font-display)] text-2xl"
                style={{ color: 'var(--color-ink)' }}
              >
                ${totalFinal.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        </section>

        <section className="mb-5">
          <p
            className="text-xs uppercase tracking-[0.14em] mb-3"
            style={{ color: 'var(--color-muted)' }}
          >
            Como prefieres pagar?
          </p>
          <div className="space-y-2">
            {FORMAS_PAGO.map((f) => (
              <label
                key={f.value}
                className="flex items-start gap-3 px-3.5 py-3 rounded-[var(--radius-md)] border cursor-pointer transition-colors bg-white"
                style={{
                  borderColor: formaPago === f.value ? colorMarca : 'var(--color-border-strong)',
                  borderWidth: formaPago === f.value ? 1.5 : 1,
                }}
              >
                <input
                  type="radio"
                  name="formaPago"
                  value={f.value}
                  checked={formaPago === f.value}
                  onChange={() => setFormaPago(f.value)}
                  className="sr-only"
                />
                <div
                  className="size-5 rounded-full border-2 grid place-items-center shrink-0 mt-0.5"
                  style={{
                    borderColor: formaPago === f.value ? colorMarca : 'var(--color-border-strong)',
                  }}
                >
                  {formaPago === f.value ? (
                    <span className="size-2.5 rounded-full" style={{ background: colorMarca }} />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                    {f.label}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                    {f.descripcion}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <button
            type="button"
            onClick={() => setQuiereFactura((v) => !v)}
            aria-expanded={quiereFactura}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-[var(--radius-md)] border bg-white"
            style={{
              borderColor: quiereFactura ? colorMarca : 'var(--color-border-strong)',
              borderWidth: quiereFactura ? 1.5 : 1,
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="size-5 rounded border-2 grid place-items-center shrink-0"
                style={{
                  borderColor: quiereFactura ? colorMarca : 'var(--color-border-strong)',
                  background: quiereFactura ? colorMarca : 'transparent',
                }}
              >
                {quiereFactura ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <polyline
                      points="5 12 10 17 19 8"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : null}
              </span>
              <div className="text-left min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                  Necesitas factura?
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>
                  Si lo activas, agrega tu documento.
                </p>
              </div>
            </div>
          </button>

          {quiereFactura ? (
            <div
              className="mt-3 space-y-3 rounded-[var(--radius-md)] border bg-white p-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <label
                  className="block text-xs uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Tipo de documento
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['CC', 'NIT', 'CE', 'PA'] as TipoDoc[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTipoDoc(t)}
                      aria-pressed={tipoDoc === t}
                      className="h-11 rounded-[var(--radius-md)] border text-sm font-medium transition-colors"
                      style={{
                        borderColor: tipoDoc === t ? colorMarca : 'var(--color-border-strong)',
                        background: tipoDoc === t ? colorMarca : 'white',
                        color: tipoDoc === t ? 'white' : 'var(--color-ink)',
                        borderWidth: tipoDoc === t ? 1.5 : 1,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="numeroDoc"
                  className="block text-xs uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  Numero
                </label>
                <input
                  id="numeroDoc"
                  type="text"
                  inputMode="numeric"
                  value={numeroDoc}
                  onChange={(e) => {
                    setNumeroDoc(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={tipoDoc === 'NIT' ? '900123456-7' : '1020304050'}
                  maxLength={30}
                  className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-base"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-ink)',
                    background: 'var(--color-paper)',
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="nombreDoc"
                  className="block text-xs uppercase tracking-[0.12em] mb-1.5"
                  style={{ color: 'var(--color-muted)' }}
                >
                  {tipoDoc === 'NIT' ? 'Razon social' : 'Nombre completo'}
                </label>
                <input
                  id="nombreDoc"
                  type="text"
                  value={nombreDoc}
                  onChange={(e) => {
                    setNombreDoc(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder={tipoDoc === 'NIT' ? 'Empresa SAS' : 'Como aparece en tu documento'}
                  maxLength={120}
                  className="w-full h-11 px-3 rounded-[var(--radius-md)] border text-base"
                  style={{
                    borderColor: 'var(--color-border-strong)',
                    color: 'var(--color-ink)',
                    background: 'var(--color-paper)',
                  }}
                />
              </div>
            </div>
          ) : null}
        </section>

        <p
          className="text-xs text-center mb-2 leading-relaxed px-2"
          style={{ color: 'var(--color-muted)' }}
        >
          Al pedir la cuenta, el mesero llega a tu mesa con la informacion que elegiste. La cuenta
          es para toda la mesa. Al continuar, aceptas nuestra{' '}
          <a
            href="/politica-datos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: 'var(--color-ink-soft)' }}
          >
            Politica de Datos
          </a>
          .
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-3 text-xs text-center"
            style={{ color: 'var(--color-danger)' }}
          >
            {error}
          </p>
        ) : null}
      </div>

      <div
        className="sticky bottom-0 left-0 right-0 px-5 py-4 border-t"
        style={{
          borderColor: 'var(--color-border)',
          background: 'rgba(250, 246, 241, 0.96)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <button
          type="button"
          onClick={pedir}
          disabled={pending}
          className="w-full max-w-md mx-auto h-12 rounded-[var(--radius-md)] text-base font-medium flex items-center justify-between px-5 transition-opacity disabled:opacity-60"
          style={{ background: colorMarca, color: 'white' }}
        >
          <span>{pending ? 'Avisando...' : 'Pedir la cuenta'}</span>
          <span className="font-[family-name:var(--font-mono)]">
            ${totalFinal.toLocaleString('es-CO')}
          </span>
        </button>
      </div>
    </main>
  );
}

function PantallaCuentaPedida({
  qrToken,
  numeroMesa,
  nombreNegocio,
  colorMarca,
  totalFinal,
  llamado,
  urlVolver,
  propinaMonto,
  formaPago,
}: {
  qrToken: string;
  numeroMesa: string;
  nombreNegocio: string;
  colorMarca: string;
  totalFinal: number;
  llamado: { id: string; creado_en: string; mesero_atendiendo_nombre?: string | null };
  urlVolver: string;
  propinaMonto: number;
  formaPago: FormaPago;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number | null>(null);

  useEffect(() => {
    setSegundosRestantes(calcularSegundosRestantes(llamado.id));
    const interval = setInterval(() => {
      setSegundosRestantes(calcularSegundosRestantes(llamado.id));
    }, 1000);
    return () => clearInterval(interval);
  }, [llamado.id]);

  function reLlamar() {
    setError(null);
    startTransition(async () => {
      const cancelarRes = await cancelarLlamado({ qrToken, llamadoId: llamado.id });
      if (!cancelarRes.ok) {
        setError(cancelarRes.error);
        return;
      }
      borrarTimerLlamado(llamado.id);
      const crearRes = await pedirCuenta({ qrToken, propinaMonto, formaPago });
      if (!crearRes.ok) {
        setError(crearRes.error);
        return;
      }
      router.refresh();
    });
  }

  const puedeReLlamar = segundosRestantes !== null && segundosRestantes <= 0;
  const minutos = segundosRestantes !== null ? Math.floor(segundosRestantes / 60) : 0;
  const segs = segundosRestantes !== null ? segundosRestantes % 60 : 0;
  const tieneAsignado = !!llamado.mesero_atendiendo_nombre;

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center"
      style={{ background: 'var(--color-paper)' }}
    >
      <div className="w-full max-w-sm">
        <div
          className="size-16 rounded-full grid place-items-center mx-auto mb-6 animate-pulse"
          style={{ background: colorMarca, color: 'white' }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 2a8 8 0 0 0-8 8c0 5 4 6 4 11h8c0-5 4-6 4-11a8 8 0 0 0-8-8z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1
          className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3"
          style={{ color: 'var(--color-ink)' }}
        >
          {tieneAsignado
            ? `${llamado.mesero_atendiendo_nombre} viene con la cuenta`
            : 'El mesero viene con la cuenta'}
        </h1>
        <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--color-ink-soft)' }}>
          Total a pagar:{' '}
          <span className="font-medium" style={{ color: 'var(--color-ink)' }}>
            ${totalFinal.toLocaleString('es-CO')}
          </span>
        </p>
        <p className="text-xs mb-8" style={{ color: 'var(--color-muted)' }}>
          Mesa {numeroMesa} - {nombreNegocio}
        </p>

        {segundosRestantes !== null ? (
          <div
            className="rounded-[var(--radius-md)] border px-4 py-3 mb-3"
            style={{ borderColor: 'var(--color-border)', background: 'white' }}
          >
            {puedeReLlamar ? (
              <button
                type="button"
                onClick={reLlamar}
                disabled={pending}
                className="w-full h-11 rounded-[var(--radius-md)] text-xs font-medium border transition-colors disabled:opacity-50"
                style={{ borderColor: colorMarca, color: colorMarca, background: 'white' }}
              >
                {pending ? 'Avisando...' : 'Volver a llamar al mesero'}
              </button>
            ) : (
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                Si no llega en{' '}
                <span
                  className="font-[family-name:var(--font-mono)] tabular-nums"
                  style={{ color: 'var(--color-ink-soft)' }}
                >
                  {minutos}:{segs.toString().padStart(2, '0')}
                </span>
                , podras llamarlo de nuevo
              </p>
            )}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-xs mb-3" style={{ color: 'var(--color-danger)' }}>
            {error}
          </p>
        ) : null}

        <Link
          href={urlVolver}
          className="inline-flex items-center justify-center h-11 px-5 rounded-[var(--radius-md)] text-sm font-medium"
          style={{
            background: 'white',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border-strong)',
          }}
        >
          Volver al resumen
        </Link>
      </div>
    </main>
  );
}
