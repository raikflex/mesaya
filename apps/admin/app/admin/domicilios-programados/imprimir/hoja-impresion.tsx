'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';

export type PedidoImpresion = {
  id: string;
  nombreCliente: string;
  telefono: string;
  direccion: string;
  horaEntrega: string;
  total: number;
  nota: string | null;
  items: { nombre: string; precio: number; cantidad: number }[];
};

const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function fechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const dt = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
  const diaSem = DIAS[dt.getDay()] ?? '';
  const cap = diaSem.charAt(0).toUpperCase() + diaSem.slice(1);
  return `${cap} ${d} de ${MESES[(m ?? 1) - 1]} de ${y}`;
}

/** "14:30:00" o "14:30" -> "2:30 pm" */
function formatearHora(hora: string): string {
  const [hStr, mStr] = hora.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const mm = parseInt(mStr ?? '0', 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mm.toString().padStart(2, '0')} ${ampm}`;
}

export function HojaImpresion({
  nombreNegocio,
  dia,
  pedidos,
}: {
  nombreNegocio: string;
  dia: string;
  pedidos: PedidoImpresion[];
}) {
  // Auto-imprimir al abrir (breve espera para que renderice).
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  const resumen = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pedidos)
      for (const it of p.items) map.set(it.nombre, (map.get(it.nombre) ?? 0) + it.cantidad);
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [pedidos]);

  const totalDinero = pedidos.reduce((acc, p) => acc + p.total, 0);

  const tinta = '#1a1814';
  const suave = '#6b6b6b';
  const borde = '#d8d3cc';

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
        }
        @page { margin: 14mm; }
      `}</style>

      <div
        className="no-print"
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: '16px 24px 0',
          display: 'flex',
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 8,
            background: tinta,
            color: 'white',
            fontSize: 14,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Imprimir
        </button>
        <Link
          href="/admin/domicilios-programados"
          style={{
            height: 40,
            padding: '0 20px',
            borderRadius: 8,
            border: `1px solid ${borde}`,
            color: tinta,
            fontSize: 14,
            display: 'inline-flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          Volver
        </Link>
      </div>

      <article
        style={{
          maxWidth: 720,
          margin: '0 auto',
          padding: 24,
          color: tinta,
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <header style={{ borderBottom: `2px solid ${tinta}`, paddingBottom: 12, marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.01em', margin: 0 }}>
            {nombreNegocio}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 15 }}>Hoja de preparacion &middot; {fechaLarga(dia)}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: suave }}>
            {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'} &middot; Total $
            {totalDinero.toLocaleString('es-CO')}
          </p>
        </header>

        {pedidos.length === 0 ? (
          <p style={{ color: suave }}>No hay pedidos para preparar este dia.</p>
        ) : (
          <>
            {/* Resumen para la cocina */}
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>
                Para preparar (total del dia)
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {resumen.map(([nombre, cantidad]) => (
                    <tr key={nombre} style={{ borderBottom: `1px solid ${borde}` }}>
                      <td style={{ padding: '6px 0', fontWeight: 600, width: 48, fontSize: 16 }}>
                        {cantidad}
                      </td>
                      <td style={{ padding: '6px 0' }}>{nombre}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Detalle por pedido */}
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 10px' }}>Pedidos</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pedidos.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      border: `1px solid ${borde}`,
                      borderRadius: 8,
                      padding: 12,
                      breakInside: 'avoid',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ fontSize: 15 }}>
                        <strong>{idx + 1}. {formatearHora(p.horaEntrega)}</strong>
                        {'  '}
                        {p.nombreCliente}
                      </span>
                      <span style={{ fontWeight: 600 }}>${p.total.toLocaleString('es-CO')}</span>
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: 13, color: suave }}>
                      {p.telefono} &middot; {p.direccion}
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {p.items.map((it, i) => (
                        <li key={i}>
                          {it.cantidad}x {it.nombre}
                        </li>
                      ))}
                    </ul>
                    {p.nota ? (
                      <p style={{ margin: '6px 0 0', fontSize: 13, fontStyle: 'italic', color: suave }}>
                        Nota: {p.nota}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </article>
    </>
  );
}
