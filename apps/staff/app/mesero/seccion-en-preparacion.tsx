'use client';

import { useState, useTransition } from 'react';
import { marcarComandaLista } from './actions';

export type ComandaPreparacionMesero = {
  id: string;
  numeroDiario: number;
  estado: 'pendiente' | 'en_preparacion';
  total: number;
  creadaEn: string;
  clienteNombre: string;
  mesaNumero: string;
  items: { id: string; nombre: string; cantidad: number; nota: string | null }[];
};

/**
 * Seccion visible solo cuando restaurantes.cocina_activa = false. El mesero
 * hace de cocinero: ve el pedido nuevo, lo imprime para la cocina fisica, y
 * con un boton lo marca listo para entregar.
 *
 * Toda comanda que aparece aca es "por preparar" (si estuviera lista ya
 * estaria en la seccion de Comandas listas). Por eso se muestran todas
 * destacadas como pedido nuevo, sin distinguir pendiente/en_preparacion.
 */
export function SeccionEnPreparacion({
  comandas,
  colorMarca,
}: {
  comandas: ComandaPreparacionMesero[];
  colorMarca: string;
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between gap-3">
        <h2
          className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em]"
          style={{ color: 'var(--color-ink)' }}
        >
          Pedidos por preparar
        </h2>
        <span
          className="text-sm uppercase tracking-[0.1em] px-2.5 py-1 rounded-full font-medium shrink-0"
          style={{
            background: 'var(--color-paper-deep)',
            color: 'var(--color-ink-soft)',
          }}
        >
          {comandas.length}
        </span>
      </header>

      {comandas.length === 0 ? (
        <div
          className="rounded-[var(--radius-lg)] border bg-white p-6 text-center"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
            Sin pedidos por preparar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comandas.map((c) => (
            <CardPreparacion key={c.id} comanda={c} colorMarca={colorMarca} />
          ))}
        </div>
      )}
    </section>
  );
}

function CardPreparacion({
  comanda,
  colorMarca,
}: {
  comanda: ComandaPreparacionMesero;
  colorMarca: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function marcarLista() {
    setError(null);
    startTransition(async () => {
      const r = await marcarComandaLista({ comandaId: comanda.id });
      if (!r.ok) setError(r.error);
    });
  }

  function imprimir() {
    imprimirComanda(comanda);
  }

  const minutos = Math.max(
    0,
    Math.floor((Date.now() - new Date(comanda.creadaEn).getTime()) / 60000),
  );
  const tiempoFmt =
    minutos < 1
      ? 'recien'
      : minutos < 60
        ? `hace ${minutos}m`
        : `hace ${Math.floor(minutos / 60)}h ${minutos % 60}m`;

  return (
    <article
      className="rounded-[var(--radius-lg)] border overflow-hidden"
      style={{
        background: '#fffbeb',
        borderColor: '#fde68a',
        borderWidth: 1.5,
      }}
    >
      <header
        className="px-4 py-3 flex items-center justify-between gap-3 border-b"
        style={{
          borderColor: '#fde68a',
          background: '#fef3c7',
        }}
      >
        <div className="min-w-0">
          <p
            className="font-[family-name:var(--font-display)] text-lg tabular-nums"
            style={{ color: 'var(--color-ink)' }}
          >
            #{comanda.numeroDiario.toString().padStart(3, '0')} - Mesa {comanda.mesaNumero}
          </p>
          <p className="text-sm font-medium" style={{ color: '#b45309' }}>
            Pedido nuevo - {tiempoFmt}
          </p>
        </div>
        <span
          className="font-[family-name:var(--font-mono)] text-base tabular-nums shrink-0"
          style={{ color: 'var(--color-ink-soft)' }}
        >
          ${comanda.total.toLocaleString('es-CO')}
        </span>
      </header>

      {/* Encabezado de columnas: deja claro que el numero es la cantidad */}
      <div
        className="px-4 pt-3 pb-1.5 flex items-baseline gap-2 border-b"
        style={{ borderColor: '#fde68a' }}
      >
        <span
          className="text-xs uppercase tracking-[0.1em] shrink-0 w-7"
          style={{ color: 'var(--color-muted)' }}
        >
          Unid.
        </span>
        <span
          className="text-xs uppercase tracking-[0.1em]"
          style={{ color: 'var(--color-muted)' }}
        >
          Producto
        </span>
      </div>

      <ul className="px-4 py-3 space-y-2">
        {comanda.items.map((it) => (
          <li key={it.id}>
            <div className="flex items-baseline gap-2 text-base">
              <span
                className="font-[family-name:var(--font-display)] text-lg tabular-nums shrink-0 w-7"
                style={{ color: colorMarca }}
              >
                {it.cantidad}×
              </span>
              <span style={{ color: 'var(--color-ink)' }}>{it.nombre}</span>
            </div>
            {it.nota ? (
              <p
                className="text-sm ml-9 italic mt-0.5"
                style={{ color: 'var(--color-muted)' }}
              >
                "{it.nota}"
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="text-sm px-4 pb-1" style={{ color: 'var(--color-muted)' }}>
        Cliente: {comanda.clienteNombre}
      </p>

      {error ? (
        <p
          role="alert"
          className="px-4 pt-2 text-sm"
          style={{ color: 'var(--color-danger)' }}
        >
          {error}
        </p>
      ) : null}

      <footer className="px-4 py-3 border-t flex gap-2" style={{ borderColor: '#fde68a' }}>
        <button
          type="button"
          onClick={imprimir}
          disabled={pending}
          className="h-12 px-4 rounded-[var(--radius-md)] text-base font-medium border disabled:opacity-50 flex items-center gap-2"
          style={{
            borderColor: 'var(--color-border-strong)',
            color: 'var(--color-ink)',
            background: 'white',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Imprimir
        </button>
        <button
          type="button"
          onClick={marcarLista}
          disabled={pending}
          className="flex-1 h-12 rounded-[var(--radius-md)] text-base font-medium transition-opacity disabled:opacity-60"
          style={{ background: colorMarca, color: 'white' }}
        >
          {pending ? 'Marcando...' : 'Marcar como lista'}
        </button>
      </footer>
    </article>
  );
}

/**
 * Abre una ventana nueva con el ticket formateado y dispara el dialogo de
 * impresion del navegador. El mesero elige su impresora (termica o normal).
 * Imprimir solo el ticket evita que salga toda la pantalla del mesero.
 */
function imprimirComanda(comanda: ComandaPreparacionMesero) {
  const fecha = new Date(comanda.creadaEn);
  const hora = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  const numero = comanda.numeroDiario.toString().padStart(3, '0');

  const filasItems = comanda.items
    .map((it) => {
      const linea = `<tr><td class="cant">${it.cantidad}x</td><td class="prod">${escapar(it.nombre)}</td></tr>`;
      const nota = it.nota
        ? `<tr><td></td><td class="nota">${escapar(it.nota)}</td></tr>`
        : '';
      return linea + nota;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Comanda #${numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ui-monospace, "Courier New", monospace; padding: 12px; color: #000; width: 280px; }
  .titulo { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 4px; }
  .sub { font-size: 13px; text-align: center; margin-bottom: 10px; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { font-size: 14px; padding: 3px 0; vertical-align: top; }
  .cant { width: 36px; font-weight: bold; }
  .prod { }
  .nota { font-size: 12px; font-style: italic; padding-left: 4px; padding-bottom: 4px; }
  .total { font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; margin-top: 6px; }
  .pie { font-size: 11px; text-align: center; margin-top: 12px; }
</style>
</head>
<body>
  <div class="titulo">Comanda #${numero}</div>
  <div class="sub">Mesa ${escapar(comanda.mesaNumero)} &middot; ${hora}</div>
  <div class="sub">Cliente: ${escapar(comanda.clienteNombre)}</div>
  <hr />
  <table>${filasItems}</table>
  <hr />
  <div class="total"><span>TOTAL</span><span>$${comanda.total.toLocaleString('es-CO')}</span></div>
  <div class="pie">Servido con EnPura</div>
  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
      setTimeout(function () { window.close(); }, 500);
    };
  </script>
</body>
</html>`;

  const ventana = window.open('', '_blank', 'width=320,height=600');
  if (!ventana) {
    alert('Habilita las ventanas emergentes para imprimir la comanda.');
    return;
  }
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}

// Escapa texto para inyectarlo seguro en el HTML del ticket.
function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
