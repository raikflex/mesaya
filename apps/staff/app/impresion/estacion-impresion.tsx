'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@mesaya/database/client';

export type ItemComandaImpresion = {
  id: string;
  nombre: string;
  cantidad: number;
  nota: string | null;
};

export type ComandaImpresion = {
  id: string;
  numeroDiario: number;
  estado: string;
  total: number;
  creadaEn: string;
  clienteNombre: string;
  mesaNumero: string;
  items: ItemComandaImpresion[];
};

type RegistroImpresion = {
  numero: number;
  mesa: string;
  hora: string;
};

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Construye el HTML del ticket. Mismo formato que el boton Imprimir del mesero.
function construirTicketHtml(comanda: ComandaImpresion): string {
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

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: ui-monospace, "Courier New", monospace; padding: 12px; color: #000; width: 280px; }
  .titulo { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 4px; }
  .sub { font-size: 13px; text-align: center; margin-bottom: 10px; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { font-size: 14px; padding: 3px 0; vertical-align: top; }
  .cant { width: 36px; font-weight: bold; }
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
</body>
</html>`;
}

// Trae la comanda completa desde Supabase (mismo patron que la cocina).
async function traerComandaCompleta(comandaId: string): Promise<ComandaImpresion | null> {
  const supabase = createClient();
  const { data: comanda } = await supabase
    .from('comandas')
    .select(
      `
      id, numero_diario, estado, total, creada_en,
      sesion_clientes (nombre),
      sesiones (mesas (numero)),
      comanda_items (id, nombre_snapshot, cantidad, nota)
    `,
    )
    .eq('id', comandaId)
    .maybeSingle();

  if (!comanda) return null;

  const sc = Array.isArray(comanda.sesion_clientes)
    ? comanda.sesion_clientes[0]
    : comanda.sesion_clientes;
  const sesion = Array.isArray(comanda.sesiones) ? comanda.sesiones[0] : comanda.sesiones;
  const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;

  const itemsRaw = (comanda.comanda_items ?? []) as {
    id: string;
    cantidad: number;
    nota: string | null;
    nombre_snapshot: string;
  }[];

  return {
    id: comanda.id as string,
    numeroDiario: comanda.numero_diario as number,
    estado: comanda.estado as string,
    total: (comanda.total as number) ?? 0,
    creadaEn: comanda.creada_en as string,
    clienteNombre: (sc?.nombre as string) ?? 'Cliente',
    mesaNumero: (mesa?.numero as string) ?? '-',
    items: itemsRaw.map((it) => ({
      id: it.id,
      nombre: it.nombre_snapshot,
      cantidad: it.cantidad,
      nota: it.nota,
    })),
  };
}

export function EstacionImpresion({
  restauranteNombre,
  restauranteId,
  modoCocina,
}: {
  restauranteNombre: string;
  restauranteId: string;
  modoCocina: 'con_pantalla' | 'sin_pantalla' | 'impresion';
}) {
  const [activa, setActiva] = useState(modoCocina === 'impresion');
  const [log, setLog] = useState<RegistroImpresion[]>([]);
  const idsImpresasRef = useRef<Set<string>>(new Set());
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Imprime una comanda usando un iframe oculto (no requiere click del usuario).
  function imprimirEnIframe(comanda: ComandaImpresion) {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(construirTicketHtml(comanda));
    doc.close();

    // Esperar a que el contenido cargue antes de imprimir.
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Error al imprimir:', e);
      }
    }, 250);

    // Registrar en el log visual.
    const hora = new Date(comanda.creadaEn).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
    setLog((prev) => [
      { numero: comanda.numeroDiario, mesa: comanda.mesaNumero, hora },
      ...prev.slice(0, 19),
    ]);
  }

  // Realtime: escucha comandas nuevas e imprime automaticamente.
  useEffect(() => {
    if (!activa) return;

    const supabase = createClient();
    const canalNombre = `impresion-realtime-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let cancelado = false;

    async function setupRealtime() {
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
          { event: 'INSERT', schema: 'public', table: 'comandas' },
          async (payload) => {
            const nueva = payload.new as { id: string; estado: string; restaurante_id: string };
            if (nueva.restaurante_id !== restauranteId) return;
            if (idsImpresasRef.current.has(nueva.id)) return;
            // Solo imprimir comandas que entran para preparar.
            if (!['pendiente', 'en_preparacion'].includes(nueva.estado)) return;

            const completa = await traerComandaCompleta(nueva.id);
            if (completa && !idsImpresasRef.current.has(completa.id)) {
              idsImpresasRef.current.add(completa.id);
              imprimirEnIframe(completa);
            }
          },
        )
        .subscribe();

      return canal;
    }

    const canalPromise = setupRealtime();

    return () => {
      cancelado = true;
      canalPromise.then((canal) => {
        if (canal) supabase.removeChannel(canal);
      });
    };
  }, [activa, restauranteId]);

  // Prueba: imprime un ticket de ejemplo para calibrar la impresora.
  function imprimirPrueba() {
    imprimirEnIframe({
      id: 'prueba',
      numeroDiario: 0,
      estado: 'pendiente',
      total: 25000,
      creadaEn: new Date().toISOString(),
      clienteNombre: 'Prueba',
      mesaNumero: '1',
      items: [
        { id: 'a', nombre: 'Arepa de queso', cantidad: 2, nota: 'Sin mantequilla' },
        { id: 'b', nombre: 'Jugo de mango', cantidad: 1, nota: null },
      ],
    });
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: activa ? '#0f1a0f' : '#1a1410',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
        transition: 'background 0.3s',
      }}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            Estacion de impresion
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7 }}>{restauranteNombre}</p>
          {modoCocina !== 'impresion' ? (
            <p style={{ fontSize: 13, marginTop: 8, color: '#c9a574' }}>
              Nota: tu restaurante no esta en modo impresion automatica. Puedes activar
              la estacion igual, pero para que sea automatica cambia el modo de cocina
              en el panel de administracion.
            </p>
          ) : null}
        </header>

        {/* Estado grande */}
        <div
          style={{
            background: activa ? '#16351a' : '#2a2018',
            border: `1px solid ${activa ? '#2f7c3a' : '#4a3a2a'}`,
            borderRadius: 16,
            padding: 28,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 12,
            }}
          >
            {activa ? '🖨️' : '⏸️'}
          </div>
          <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            {activa ? 'Imprimiendo automaticamente' : 'Estacion en pausa'}
          </p>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 20 }}>
            {activa
              ? 'Las comandas nuevas se imprimen solas. Deja esta pantalla abierta.'
              : 'Activa la estacion para empezar a imprimir las comandas automaticamente.'}
          </p>
          <button
            onClick={() => setActiva((v) => !v)}
            style={{
              background: activa ? '#7c2d2d' : '#2f7c3a',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '12px 32px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {activa ? 'Pausar estacion' : 'Activar estacion'}
          </button>
        </div>

        {/* Boton de prueba */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <button
            onClick={imprimirPrueba}
            style={{
              background: 'transparent',
              color: '#c9a574',
              border: '1px solid #4a3a2a',
              borderRadius: 999,
              padding: '10px 24px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Imprimir ticket de prueba
          </button>
          <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>
            Usalo para calibrar tu impresora antes del servicio.
          </p>
        </div>

        {/* Log de impresiones */}
        <div>
          <h2 style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6, marginBottom: 12 }}>
            Ultimas impresiones
          </h2>
          {log.length === 0 ? (
            <p style={{ fontSize: 14, opacity: 0.4 }}>Todavia no se imprimio ninguna comanda.</p>
          ) : (
            <ul style={{ listStyle: 'none' }}>
              {log.map((r, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: '#221a14',
                    borderRadius: 8,
                    marginBottom: 6,
                    fontSize: 14,
                  }}
                >
                  <span>Comanda #{r.numero.toString().padStart(3, '0')} · Mesa {r.mesa}</span>
                  <span style={{ opacity: 0.6 }}>{r.hora}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Iframe oculto donde se renderiza e imprime cada ticket */}
      <iframe
        ref={iframeRef}
        title="impresion"
        style={{ position: 'absolute', width: 0, height: 0, border: 0, visibility: 'hidden' }}
      />
    </div>
  );
}
