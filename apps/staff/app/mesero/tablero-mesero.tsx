'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@mesaya/database/client';
import {
  MapaMesas,
  type MesaInfo,
  type SesionAbiertaResumen,
  type ModoMesa,
  type SesionPrecargada,
} from './mapa-mesas';
import { ModalTomarPedido } from './modal-tomar-pedido';
export type { CategoriaMenu } from './modal-tomar-pedido';
import type { CategoriaMenu } from './modal-tomar-pedido';
import { SeccionEnPreparacion, type ComandaPreparacionMesero } from './seccion-en-preparacion';
import { ModalDomicilio } from './modal-domicilio';
import {
  alternarSonido,
  desbloquearAudio,
  estaSonidoActivo,
  inicializarAudio,
  reproducir,
} from '../../lib/sonido-mesero';
import { NotificacionesPush } from '../../components/notificaciones-push';
import {
  atenderLlamado,
  cerrarSesion,
  confirmarPago,
  entregarComanda,
  liberarComanda,
  liberarLlamado,
  liberarPago,
  tomarComanda,
  tomarLlamado,
  tomarPago,
  type FormaPagoBackend,
} from './actions';

export type LlamadoMesero = {
  id: string;
  motivo: 'campana' | 'otro';
  creadoEn: string;
  mesaNumero: string;
  meseroAtendiendoId: string | null;
  nota: string | null;
};

export type InfoEntregaMesero = {
  pedidoExternoId: string;
  estadoEntrega: string;
  tipo: 'domicilio' | 'pickup';
  nombreCliente: string;
  telefono: string;
  direccion: string | null;
  horaPedido: string | null;
  notasEntrega: string | null;
} | null;

export type ComandaListaMesero = {
  id: string;
  sesionId: string;
  numeroDiario: number;
  total: number;
  creadaEn: string;
  clienteNombre: string;
  mesaNumero: string;
  meseroAtendiendoId: string | null;
  origen: string;
  entrega: InfoEntregaMesero;
  items: { id: string; nombre: string; cantidad: number; nota: string | null }[];
};

export type ItemComandaPago = {
  nombre: string;
  cantidad: number;
  precio: number;
  nota: string | null;
};

export type ComandaDetalladaPago = {
  numeroDiario: number;
  total: number;
  items: ItemComandaPago[];
};

export type PagoMesero = {
  id: string;
  sesionId: string;
  creadoEn: string;
  mesaNumero: string;
  meseroAtendiendoId: string | null;
  totalAcumulado: number;
  cantidadComandas: number;
  formaPagoPreferida: string | null;
  propinaSugerida: number | null;
  docTipo: string | null;
  docNumero: string | null;
  docNombre: string | null;
  comandas: ComandaDetalladaPago[];
};

export type ColaMesero = {
  llamados: LlamadoMesero[];
  comandasListas: ComandaListaMesero[];
  pagos: PagoMesero[];
  comandasEnPreparacion: ComandaPreparacionMesero[];
};

export function TableroMesero({
  perfilId,
  perfilNombre,
  restauranteNombre,
  colorMarca,
  restauranteId,
  colaInicial,
  mesasInfo,
  sesionesAbiertasInicial,
  cocinaActiva,
  menu,
  puedeVerMesas,
  puedeVerDomicilios,
}: {
  perfilId: string;
  perfilNombre: string;
  restauranteNombre: string;
  colorMarca: string;
  restauranteId: string;
  colaInicial: ColaMesero;
  mesasInfo: MesaInfo[];
  sesionesAbiertasInicial: SesionAbiertaResumen[];
  cocinaActiva: boolean;
  menu: CategoriaMenu[];
  puedeVerMesas: boolean;
  puedeVerDomicilios: boolean;
}) {
  const [cola, setCola] = useState<ColaMesero>(colaInicial);
  const [mesaParaPedido, setMesaParaPedido] = useState<{
    mesa: MesaInfo;
    modo: ModoMesa;
    sesion: SesionPrecargada;
  } | null>(null);
  const router = useRouter();

  const llamadoIdsRef = useRef<Set<string>>(new Set(colaInicial.llamados.map((l) => l.id)));
  const comandaIdsRef = useRef<Set<string>>(new Set(colaInicial.comandasListas.map((c) => c.id)));
  const pagoIdsRef = useRef<Set<string>>(new Set(colaInicial.pagos.map((p) => p.id)));

  useEffect(() => {
    setCola(colaInicial);
    llamadoIdsRef.current = new Set(colaInicial.llamados.map((l) => l.id));
    comandaIdsRef.current = new Set(colaInicial.comandasListas.map((c) => c.id));
    pagoIdsRef.current = new Set(colaInicial.pagos.map((p) => p.id));
  }, [colaInicial]);

  useEffect(() => { inicializarAudio(); }, []);

  useEffect(() => {
    const supabase = createClient();
    const canalNombre = `mesero-realtime-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let canalActual: ReturnType<typeof supabase.channel> | null = null;
    let cancelado = false;

    async function setupRealtime() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelado) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      if (cancelado) return;

      const canal = supabase
        .channel(canalNombre)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'llamados_mesero' }, async (payload) => {
          if (payload.eventType === 'INSERT') {
            const fila = payload.new as { id: string; restaurante_id: string; motivo: string; estado: string };
            if (fila.restaurante_id !== restauranteId) return;
            if (fila.estado !== 'pendiente') return;
            const llamadoCompleto = await traerLlamadoCompleto(fila.id);
            if (!llamadoCompleto) return;
            if (fila.motivo === 'pago') {
              if (pagoIdsRef.current.has(fila.id)) return;
              pagoIdsRef.current.add(fila.id);
              const pago = await traerPagoCompleto(fila.id);
              if (pago) { setCola((c) => ({ ...c, pagos: [...c.pagos, pago] })); reproducir('pago'); }
            } else {
              if (llamadoIdsRef.current.has(fila.id)) return;
              llamadoIdsRef.current.add(fila.id);
              setCola((c) => ({ ...c, llamados: [...c.llamados, llamadoCompleto] }));
              reproducir('llamado');
            }
            return;
          }
          if (payload.eventType === 'UPDATE') {
            const actualizada = payload.new as { id: string; restaurante_id: string; estado: string; mesero_atendiendo_id: string | null; motivo: string };
            if (actualizada.restaurante_id !== restauranteId) return;
            if (actualizada.estado === 'atendido' || actualizada.estado === 'cancelado') {
              llamadoIdsRef.current.delete(actualizada.id);
              pagoIdsRef.current.delete(actualizada.id);
              setCola((c) => ({ ...c, llamados: c.llamados.filter((l) => l.id !== actualizada.id), pagos: c.pagos.filter((p) => p.id !== actualizada.id) }));
              return;
            }
            setCola((c) => ({
              ...c,
              llamados: c.llamados.map((l) => l.id === actualizada.id ? { ...l, meseroAtendiendoId: actualizada.mesero_atendiendo_id } : l),
              pagos: c.pagos.map((p) => p.id === actualizada.id ? { ...p, meseroAtendiendoId: actualizada.mesero_atendiendo_id } : p),
            }));
            return;
          }
          if (payload.eventType === 'DELETE') {
            const fila = payload.old as { id: string };
            llamadoIdsRef.current.delete(fila.id);
            pagoIdsRef.current.delete(fila.id);
            setCola((c) => ({ ...c, llamados: c.llamados.filter((l) => l.id !== fila.id), pagos: c.pagos.filter((p) => p.id !== fila.id) }));
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'comandas' }, async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const fila = payload.new as { id: string; restaurante_id: string; estado: string; mesero_atendiendo_id: string | null };
            if (fila.restaurante_id !== restauranteId) return;
            if (fila.estado === 'pendiente' || fila.estado === 'en_preparacion') { router.refresh(); return; }
            if (fila.estado === 'lista') {
              if (comandaIdsRef.current.has(fila.id)) {
                setCola((c) => ({ ...c, comandasListas: c.comandasListas.map((cm) => cm.id === fila.id ? { ...cm, meseroAtendiendoId: fila.mesero_atendiendo_id } : cm) }));
                return;
              }
              comandaIdsRef.current.add(fila.id);
              const completa = await traerComandaCompleta(fila.id);
              if (completa) {
                setCola((c) => ({ ...c, comandasListas: [...c.comandasListas.filter((cm) => cm.id !== completa.id), completa] }));
                reproducir('comanda');
              }
              return;
            }
            if (fila.estado === 'entregada' || fila.estado === 'cancelada') {
              comandaIdsRef.current.delete(fila.id);
              setCola((c) => ({ ...c, comandasListas: c.comandasListas.filter((cm) => cm.id !== fila.id) }));
            }
          }
        });

      if (cancelado) { supabase.removeChannel(canal); return; }
      canalActual = canal;
      canal.subscribe();
    }

    setupRealtime();
    return () => {
      cancelado = true;
      if (canalActual) { supabase.removeChannel(canalActual); canalActual = null; }
    };
  }, [restauranteId, router]);

  // Capa 3: separar comandas de mesa vs domicilio segun rol.
  const comandasMesas = cola.comandasListas.filter((c) => !c.entrega);
  const comandasDomicilios = cola.comandasListas.filter((c) => c.entrega);
  // Lo que ve cada quien segun sus roles.
  const comandasListasVisibles = [
    ...(puedeVerMesas ? comandasMesas : []),
    ...(puedeVerDomicilios ? comandasDomicilios : []),
  ];
  const llamadosVisibles = puedeVerMesas ? cola.llamados : [];
  const pagosVisibles = puedeVerMesas ? cola.pagos : [];
  const enPrepVisibles = puedeVerMesas ? cola.comandasEnPreparacion : [];

  const total = llamadosVisibles.length + comandasListasVisibles.length + pagosVisibles.length + enPrepVisibles.length;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: 'var(--color-paper)' }}>
      <Header perfilNombre={perfilNombre} restauranteNombre={restauranteNombre} colorMarca={colorMarca} totalItems={total} />
      <div className="flex-1 px-5 lg:px-8 py-6 max-w-[1400px] mx-auto w-full">
        {puedeVerMesas && mesasInfo.length > 0 ? (
          <div className="mb-6">
            <MapaMesas mesas={mesasInfo} sesionesAbiertasIniciales={sesionesAbiertasInicial} restauranteId={restauranteId} colorMarca={colorMarca} variante="mesero" onTomarPedido={(mesa, modo, sesion) => setMesaParaPedido({ mesa, modo, sesion })} />
          </div>
        ) : null}
        {puedeVerMesas && !cocinaActiva ? (
          <div className="mb-6">
            <SeccionEnPreparacion comandas={enPrepVisibles} colorMarca={colorMarca} />
          </div>
        ) : null}
        {total === 0 ? (
          <EstadoVacio colorMarca={colorMarca} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {puedeVerMesas ? <SeccionLlamados llamados={llamadosVisibles} colorMarca={colorMarca} perfilId={perfilId} /> : null}
            <SeccionComandasListas comandas={comandasListasVisibles} colorMarca={colorMarca} perfilId={perfilId} />
            {puedeVerMesas ? <SeccionPagos pagos={pagosVisibles} colorMarca={colorMarca} perfilId={perfilId} /> : null}
          </div>
        )}
      </div>
      {mesaParaPedido ? (
        <ModalTomarPedido mesa={{ id: mesaParaPedido.mesa.id, numero: mesaParaPedido.mesa.numero }} grupos={menu} colorMarca={colorMarca} modoInicial={mesaParaPedido.modo} sesionPrecargada={mesaParaPedido.sesion} onCerrar={() => setMesaParaPedido(null)} />
      ) : null}
    </main>
  );
}

async function traerLlamadoCompleto(llamadoId: string): Promise<LlamadoMesero | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('llamados_mesero')
    .select(`id, motivo, creado_en, mesero_atendiendo_id, nota, sesiones (mesas (numero))`)
    .eq('id', llamadoId)
    .maybeSingle();
  if (!data) return null;
  const sesion = Array.isArray(data.sesiones) ? data.sesiones[0] : data.sesiones;
  const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;
  return {
    id: data.id as string,
    motivo: data.motivo as 'campana' | 'otro',
    creadoEn: data.creado_en as string,
    mesaNumero: (mesa as { numero: string } | null)?.numero ?? '?',
    meseroAtendiendoId: (data.mesero_atendiendo_id as string | null) ?? null,
    nota: (data.nota as string | null) ?? null,
  };
}

async function traerPagoCompleto(llamadoId: string): Promise<PagoMesero | null> {
  const supabase = createClient();
  const { data: llamado } = await supabase
    .from('llamados_mesero')
    .select(`id, creado_en, mesero_atendiendo_id, sesion_id, doc_tipo, doc_numero, doc_nombre, forma_pago_preferida, propina_sugerida, sesiones (mesas (numero))`)
    .eq('id', llamadoId)
    .maybeSingle();
  if (!llamado) return null;

  const { data: comandasRaw } = await supabase
    .from('comandas')
    .select('id, numero_diario, total, creada_en')
    .eq('sesion_id', llamado.sesion_id as string)
    .neq('estado', 'cancelada')
    .order('creada_en', { ascending: true });

  const comandasArr = (comandasRaw ?? []) as { id: string; numero_diario: number; total: number; creada_en: string }[];
  const idsComandas = comandasArr.map((c) => c.id);
  const itemsRaw = idsComandas.length > 0
    ? ((await supabase.from('comanda_items').select('comanda_id, nombre_snapshot, cantidad, precio_snapshot, nota').in('comanda_id', idsComandas).order('id', { ascending: true })).data ?? [])
    : [];

  const itemsPorComanda = new Map<string, ItemComandaPago[]>();
  for (const c of comandasArr) itemsPorComanda.set(c.id, []);
  for (const it of itemsRaw) {
    const arr = itemsPorComanda.get(it.comanda_id as string);
    if (arr) arr.push({ nombre: it.nombre_snapshot as string, cantidad: it.cantidad as number, precio: it.precio_snapshot as number, nota: (it.nota as string) ?? null });
  }

  const totalAcumulado = comandasArr.reduce((acc, c) => acc + (c.total ?? 0), 0);
  const sesion = Array.isArray(llamado.sesiones) ? llamado.sesiones[0] : llamado.sesiones;
  const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;

  return {
    id: llamado.id as string,
    sesionId: llamado.sesion_id as string,
    creadoEn: llamado.creado_en as string,
    mesaNumero: (mesa as { numero: string } | null)?.numero ?? '?',
    meseroAtendiendoId: (llamado.mesero_atendiendo_id as string | null) ?? null,
    totalAcumulado,
    cantidadComandas: comandasArr.length,
    formaPagoPreferida: (llamado.forma_pago_preferida as string | null) ?? null,
    propinaSugerida: (llamado.propina_sugerida as number | null) ?? null,
    docTipo: (llamado.doc_tipo as string | null) ?? null,
    docNumero: (llamado.doc_numero as string | null) ?? null,
    docNombre: (llamado.doc_nombre as string | null) ?? null,
    comandas: comandasArr.map((c) => ({ numeroDiario: c.numero_diario, total: c.total, items: itemsPorComanda.get(c.id) ?? [] })),
  };
}

async function traerComandaCompleta(comandaId: string): Promise<ComandaListaMesero | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('comandas')
    .select(`
      id, sesion_id, numero_diario, total, creada_en, mesero_atendiendo_id, origen,
      sesion_clientes (nombre),
      sesiones (mesas (numero)),
      pedidos_externos (id, estado_entrega, tipo, nombre_cliente, telefono, direccion, hora_pickup, notas_entrega)
    `)
    .eq('id', comandaId)
    .maybeSingle();
  if (!data) return null;

  const { data: items } = await supabase
    .from('comanda_items')
    .select('id, nombre_snapshot, cantidad, nota')
    .eq('comanda_id', comandaId)
    .order('id', { ascending: true });

  const sc = Array.isArray(data.sesion_clientes) ? data.sesion_clientes[0] : data.sesion_clientes;
  const sesion = Array.isArray(data.sesiones) ? data.sesiones[0] : data.sesiones;
  const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;

  const pedidoRaw = Array.isArray(data.pedidos_externos) ? data.pedidos_externos[0] : data.pedidos_externos;
  const pedido = pedidoRaw as {
    id: string; estado_entrega: string; tipo: string; nombre_cliente: string; telefono: string;
    direccion: string | null; hora_pickup: string | null; notas_entrega: string | null;
  } | null;

  const entrega: InfoEntregaMesero = pedido
    ? { pedidoExternoId: pedido.id, estadoEntrega: pedido.estado_entrega, tipo: pedido.tipo as 'domicilio' | 'pickup', nombreCliente: pedido.nombre_cliente, telefono: pedido.telefono, direccion: pedido.direccion, horaPedido: pedido.hora_pickup, notasEntrega: pedido.notas_entrega }
    : null;

  return {
    id: data.id as string,
    sesionId: data.sesion_id as string,
    numeroDiario: data.numero_diario as number,
    total: data.total as number,
    creadaEn: data.creada_en as string,
    clienteNombre: (sc as { nombre: string } | null)?.nombre ?? 'Cliente',
    mesaNumero: (mesa as { numero: string } | null)?.numero ?? '?',
    meseroAtendiendoId: (data.mesero_atendiendo_id as string | null) ?? null,
    origen: (data.origen as string) ?? 'cliente',
    entrega,
    items: (items ?? []).map((it) => ({ id: it.id as string, nombre: it.nombre_snapshot as string, cantidad: it.cantidad as number, nota: (it.nota as string) ?? null })),
  };
}

function Header({ perfilNombre, restauranteNombre, colorMarca, totalItems }: { perfilNombre: string; restauranteNombre: string; colorMarca: string; totalItems: number }) {
  const [sonidoOn, setSonidoOn] = useState<boolean | null>(null);
  useEffect(() => { setSonidoOn(estaSonidoActivo()); }, []);
  function toggleSonido() {
    desbloquearAudio();
    const nuevo = alternarSonido();
    setSonidoOn(nuevo);
    if (nuevo) reproducir('llamado');
  }
  return (
    <header className="sticky top-0 z-20 px-5 lg:px-8 py-3 border-b backdrop-blur-sm" style={{ borderColor: 'var(--color-border)', background: 'rgba(250, 246, 241, 0.92)' }}>
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="size-10 rounded-full grid place-items-center shrink-0" style={{ background: colorMarca, color: 'white' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 11h18l-2 9H5l-2-9zM12 7v4M9 7v4M15 7v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="min-w-0">
            <p className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>Mesero · {perfilNombre}</p>
            <h1 className="font-[family-name:var(--font-display)] text-lg tracking-[-0.015em] truncate" style={{ color: 'var(--color-ink)' }}>{restauranteNombre}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--color-paper-deep)' }}>
            <span className="size-2 rounded-full animate-pulse" style={{ background: colorMarca }} />
            <span className="text-xs" style={{ color: 'var(--color-ink-soft)' }}>{totalItems} pendiente{totalItems === 1 ? '' : 's'}</span>
          </div>
          {sonidoOn !== null ? (
            <button type="button" onClick={toggleSonido} aria-label={sonidoOn ? 'Apagar sonido' : 'Activar sonido'} className="size-9 rounded-full grid place-items-center transition-colors hover:opacity-80" style={{ background: sonidoOn ? colorMarca : 'var(--color-paper-deep)', color: sonidoOn ? 'white' : 'var(--color-muted)' }}>
              {sonidoOn ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M13.73 21a2 2 0 0 1-3.46 0M18.63 13A17.89 17.89 0 0 1 18 8M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14M18 8a6 6 0 0 0-9.33-5M1 1l22 22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </button>
          ) : null}
          <NotificacionesPush colorMarca={colorMarca} />
          <form action={cerrarSesion}>
            <button type="submit" className="text-xs underline shrink-0" style={{ color: 'var(--color-muted)' }}>Cerrar sesion</button>
          </form>
        </div>
      </div>
    </header>
  );
}

function SeccionLlamados({ llamados, colorMarca, perfilId }: { llamados: LlamadoMesero[]; colorMarca: string; perfilId: string }) {
  return (
    <section>
      <CabeceraSeccion titulo="Llamados" descripcion="Clientes que necesitan algo" count={llamados.length} bgColor="#fef3c7" fgColor="#92400e" />
      {llamados.length === 0 ? <SeccionVacia mensaje="Sin llamados ahora" borderColor="#fde68a" /> : (
        <ul className="space-y-3">{llamados.map((l) => <li key={l.id}><CardLlamado llamado={l} colorMarca={colorMarca} perfilId={perfilId} /></li>)}</ul>
      )}
    </section>
  );
}

function SeccionComandasListas({ comandas, colorMarca, perfilId }: { comandas: ComandaListaMesero[]; colorMarca: string; perfilId: string }) {
  return (
    <section>
      <CabeceraSeccion titulo="Listas para entregar" descripcion="La cocina ya las termino" count={comandas.length} bgColor="#dcfce7" fgColor="#166534" />
      {comandas.length === 0 ? <SeccionVacia mensaje="Nada listo para entregar" borderColor="#bbf7d0" /> : (
        <ul className="space-y-3">{comandas.map((c) => <li key={c.id}><CardComanda comanda={c} colorMarca={colorMarca} perfilId={perfilId} /></li>)}</ul>
      )}
    </section>
  );
}

function SeccionPagos({ pagos, colorMarca, perfilId }: { pagos: PagoMesero[]; colorMarca: string; perfilId: string }) {
  return (
    <section>
      <CabeceraSeccion titulo="Pagos pendientes" descripcion="Mesas pidiendo la cuenta" count={pagos.length} bgColor="var(--color-paper-deep)" fgColor="var(--color-ink-soft)" />
      {pagos.length === 0 ? <SeccionVacia mensaje="Nadie pidio la cuenta" borderColor="var(--color-border)" /> : (
        <ul className="space-y-3">{pagos.map((p) => <li key={p.id}><CardPago pago={p} colorMarca={colorMarca} perfilId={perfilId} /></li>)}</ul>
      )}
    </section>
  );
}

function CabeceraSeccion({ titulo, descripcion, count, bgColor, fgColor }: { titulo: string; descripcion: string; count: number; bgColor: string; fgColor: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em]" style={{ color: 'var(--color-ink)' }}>{titulo}</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-muted)' }}>{descripcion}</p>
      </div>
      <span className="text-sm uppercase tracking-[0.1em] px-2.5 py-1 rounded-full font-medium shrink-0" style={{ background: bgColor, color: fgColor }}>{count}</span>
    </div>
  );
}

function CardLlamado({ llamado, colorMarca, perfilId }: { llamado: LlamadoMesero; colorMarca: string; perfilId: string }) {
  const esMio = llamado.meseroAtendiendoId === perfilId;
  const esDeOtro = llamado.meseroAtendiendoId !== null && llamado.meseroAtendiendoId !== perfilId;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function tomar() { setError(null); desbloquearAudio(); startTransition(async () => { const r = await tomarLlamado({ llamadoId: llamado.id }); if (!r.ok) setError(r.error); }); }
  function liberar() { setError(null); startTransition(async () => { const r = await liberarLlamado({ llamadoId: llamado.id }); if (!r.ok) setError(r.error); }); }
  function atender() { setError(null); startTransition(async () => { const r = await atenderLlamado({ llamadoId: llamado.id }); if (!r.ok) setError(r.error); }); }

  return (
    <CardBase esMio={esMio} esDeOtro={esDeOtro} colorMarca={colorMarca} pending={pending}>
      <header className="px-4 py-3 flex items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'var(--color-paper-deep)', color: 'var(--color-ink-soft)' }}>Mesa {llamado.mesaNumero}</span>
        <TiempoTranscurrido fecha={llamado.creadoEn} />
      </header>
      <div className="px-4 py-3">
        <p className="text-base font-medium" style={{ color: 'var(--color-ink)' }}>{llamado.motivo === 'campana' ? 'Necesita ayuda' : 'Llamado del cliente'}</p>
        {llamado.nota ? (
          <div className="mt-2 rounded-[var(--radius-md)] border px-3 py-2" style={{ borderColor: '#fde68a', background: '#fefce8' }}>
            <p className="text-xs uppercase tracking-[0.12em] mb-0.5" style={{ color: '#92400e' }}>El cliente dice</p>
            <p className="text-base leading-relaxed" style={{ color: 'var(--color-ink)' }}>"{llamado.nota}"</p>
          </div>
        ) : null}
        {error ? <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p> : null}
      </div>
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <button type="button" onClick={atender} disabled={pending} className="w-full h-12 rounded-[var(--radius-md)] text-base font-medium transition-opacity disabled:opacity-60" style={{ background: colorMarca, color: 'white' }}>
          Atendido
        </button>
      </div>
    </CardBase>
  );
}

function CardComanda({ comanda, colorMarca, perfilId }: { comanda: ComandaListaMesero; colorMarca: string; perfilId: string }) {
  const esMio = comanda.meseroAtendiendoId === perfilId;
  const esDeOtro = comanda.meseroAtendiendoId !== null && comanda.meseroAtendiendoId !== perfilId;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const esDomicilio = comanda.origen === 'domicilio' || comanda.origen === 'pickup';

  function tomar() { setError(null); desbloquearAudio(); startTransition(async () => { const r = await tomarComanda({ comandaId: comanda.id }); if (!r.ok) setError(r.error); }); }
  function liberar() { setError(null); startTransition(async () => { const r = await liberarComanda({ comandaId: comanda.id }); if (!r.ok) setError(r.error); }); }
  function entregar() { setError(null); startTransition(async () => { const r = await entregarComanda({ comandaId: comanda.id }); if (!r.ok) setError(r.error); }); }

  return (
    <>
      <CardBase esMio={esMio} esDeOtro={esDeOtro} colorMarca={colorMarca} pending={pending}>
        <header className="px-4 py-3 flex items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-[family-name:var(--font-display)] text-lg tabular-nums" style={{ color: 'var(--color-ink)' }}>#{comanda.numeroDiario.toString().padStart(3, '0')}</span>
            {esDomicilio ? (
              <span className="text-sm px-2 py-0.5 rounded-full font-medium" style={{ background: comanda.origen === 'domicilio' ? '#dbeafe' : '#dcfce7', color: comanda.origen === 'domicilio' ? '#1e40af' : '#166534' }}>
                {comanda.origen === 'domicilio' ? 'Domicilio' : 'Para recoger'}
              </span>
            ) : (
              <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'var(--color-paper-deep)', color: 'var(--color-ink-soft)' }}>Mesa {comanda.mesaNumero}</span>
            )}
          </div>
          <TiempoTranscurrido fecha={comanda.creadaEn} />
        </header>
        <div className="px-4 py-3">
          <p className="text-sm uppercase tracking-[0.1em] mb-2" style={{ color: 'var(--color-muted)' }}>{comanda.clienteNombre}</p>
          <ul className="space-y-1.5">
            {comanda.items.map((item) => (
              <li key={item.id} className="text-base">
                <div className="flex items-baseline gap-2">
                  <span className="font-[family-name:var(--font-display)] text-lg tabular-nums shrink-0" style={{ color: colorMarca }}>{item.cantidad}x</span>
                  <span style={{ color: 'var(--color-ink)' }}>{item.nombre}</span>
                </div>
                {item.nota ? <p className="text-sm mt-0.5 ml-7 italic" style={{ color: 'var(--color-ink-soft)' }}>"{item.nota}"</p> : null}
              </li>
            ))}
          </ul>

          {/* Datos de entrega + boton ver detalles */}
          {comanda.entrega ? (
            <div className="mt-3 pt-3 border-t rounded-[var(--radius-md)] p-2.5" style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}>
              <p className="text-xs uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--color-muted)' }}>
                {comanda.entrega.tipo === 'domicilio' ? 'Entrega a domicilio' : 'Para recoger'}
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--color-ink)' }}>
                {comanda.entrega.nombreCliente} - {comanda.entrega.telefono}
              </p>
              {comanda.entrega.direccion ? <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>{comanda.entrega.direccion}</p> : null}
              {comanda.entrega.horaPedido ? <p className="text-sm mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>Hora: {comanda.entrega.horaPedido}</p> : null}
              {comanda.entrega.notasEntrega ? <p className="text-sm mt-0.5 italic" style={{ color: 'var(--color-ink-soft)' }}>{comanda.entrega.notasEntrega}</p> : null}
              <button
                type="button"
                onClick={() => setModalAbierto(true)}
                className="mt-2.5 w-full h-10 rounded-[var(--radius-md)] border text-sm font-medium"
                style={{ borderColor: colorMarca, color: colorMarca, background: 'white' }}
              >
                Ver detalles{comanda.entrega.estadoEntrega === 'en_camino' ? ' - En camino' : comanda.entrega.estadoEntrega === 'listo_pickup' ? ' - Listo' : ''}
              </button>
            </div>
          ) : null}

          {esDomicilio ? null : <p className="text-sm mt-2" style={{ color: 'var(--color-ink-soft)' }}>Lleva el pedido a la mesa y marcalo</p>}
          {error ? <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p> : null}
        </div>
        {esDomicilio ? null : (
          <div className="px-4 py-3 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)' }}><span className="font-[family-name:var(--font-mono)] text-base" style={{ color: 'var(--color-ink-soft)' }}>${comanda.total.toLocaleString('es-CO')}</span><button type="button" onClick={entregar} disabled={pending} className="flex-1 h-12 rounded-[var(--radius-md)] text-base font-medium transition-opacity disabled:opacity-60" style={{ background: colorMarca, color: 'white' }}>Entregado</button></div>
        )}
      </CardBase>

      {modalAbierto && comanda.entrega ? (
        <ModalDomicilio
          pedidoExternoId={comanda.entrega.pedidoExternoId}
          sesionId={comanda.sesionId}
          entrega={comanda.entrega}
          items={comanda.items}
          numeroDiario={comanda.numeroDiario}
          total={comanda.total}
          colorMarca={colorMarca}
          estadoEntregaActual={comanda.entrega.estadoEntrega}
          onCerrar={() => setModalAbierto(false)}
        />
      ) : null}
    </>
  );
}

function CardPago({ pago, colorMarca, perfilId }: { pago: PagoMesero; colorMarca: string; perfilId: string }) {
  const esMio = pago.meseroAtendiendoId === perfilId;
  const esDeOtro = pago.meseroAtendiendoId !== null && pago.meseroAtendiendoId !== perfilId;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  function tomar() { setError(null); desbloquearAudio(); startTransition(async () => { const r = await tomarPago({ llamadoId: pago.id }); if (!r.ok) setError(r.error); }); }
  function liberar() { setError(null); startTransition(async () => { const r = await liberarPago({ llamadoId: pago.id }); if (!r.ok) setError(r.error); }); }
  function abrirModal() { setError(null); setModalAbierto(true); }

  const tieneFactura = !!pago.docNumero;
  const ETIQUETAS_PAGO: Record<string, { label: string; bg: string; fg: string }> = {
    efectivo: { label: 'Efectivo', bg: '#dcfce7', fg: '#166534' },
    tarjeta: { label: 'Tarjeta', bg: '#dbeafe', fg: '#1e40af' },
    transferencia: { label: 'Transferencia', bg: '#ede9fe', fg: '#5b21b6' },
    no_seguro: { label: 'No decide', bg: '#fef3c7', fg: '#92400e' },
  };
  const formaPago = pago.formaPagoPreferida ? ETIQUETAS_PAGO[pago.formaPagoPreferida] : null;

  return (
    <>
      <CardBase esMio={esMio} esDeOtro={esDeOtro} colorMarca={colorMarca} pending={pending}>
        <header className="px-4 py-3 flex items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-sm px-2 py-0.5 rounded-full" style={{ background: 'var(--color-paper-deep)', color: 'var(--color-ink-soft)' }}>Mesa {pago.mesaNumero}</span>
            <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{pago.cantidadComandas} pedido{pago.cantidadComandas === 1 ? '' : 's'}</span>
            {formaPago ? <span className="text-xs uppercase tracking-[0.05em] px-1.5 py-0.5 rounded font-medium" style={{ background: formaPago.bg, color: formaPago.fg }}>{formaPago.label}</span> : null}
            {tieneFactura ? <span className="text-xs uppercase tracking-[0.1em] px-1.5 py-0.5 rounded font-medium" style={{ background: '#dbeafe', color: '#1e40af' }}>Pide factura</span> : null}
          </div>
          <TiempoTranscurrido fecha={pago.creadoEn} />
        </header>
        <div className="px-4 py-3">
          <p className="text-sm uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>{pago.propinaSugerida ? 'Total con propina' : 'Total acumulado'}</p>
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.02em]" style={{ color: 'var(--color-ink)' }}>${(pago.totalAcumulado + (pago.propinaSugerida ?? 0)).toLocaleString('es-CO')}</p>
          {pago.propinaSugerida ? <p className="text-sm mt-1" style={{ color: 'var(--color-muted)' }}>Subtotal ${pago.totalAcumulado.toLocaleString('es-CO')} + propina ${pago.propinaSugerida.toLocaleString('es-CO')}</p> : null}
          <p className="text-sm mt-2" style={{ color: 'var(--color-ink-soft)' }}>Acercate a la mesa para cobrar</p>
          {error ? <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--color-danger)' }}>{error}</p> : null}
        </div>
        <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button type="button" onClick={abrirModal} disabled={pending} className="w-full h-12 rounded-[var(--radius-md)] text-base font-medium transition-opacity disabled:opacity-60" style={{ background: colorMarca, color: 'white' }}>
            Ver detalles
          </button>
        </div>
      </CardBase>
      {modalAbierto ? <ModalCobrar pago={pago} colorMarca={colorMarca} onCerrar={() => setModalAbierto(false)} /> : null}
    </>
  );
}

function ModalCobrar({ pago, colorMarca, onCerrar }: { pago: PagoMesero; colorMarca: string; onCerrar: () => void }) {
  const [propinaPct, setPropinaPct] = useState('');
  // Precargar con la propina que el cliente sugirio al pedir la cuenta.
  // El mesero la confirma o la ajusta si el cliente cambio de opinion.
  const [propinaManual, setPropinaManual] = useState(
    pago.propinaSugerida ? String(pago.propinaSugerida) : '',
  );
  const [metodo, setMetodo] = useState<FormaPagoBackend>('efectivo');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const propina = propinaManual !== ''
    ? Math.max(0, Math.round(Number(propinaManual) || 0))
    : propinaPct !== ''
      ? Math.max(0, Math.round((pago.totalAcumulado * (Number(propinaPct) || 0)) / 100))
      : 0;
  const total = pago.totalAcumulado + propina;

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const r = await confirmarPago({ llamadoId: pago.id, metodoConfirmado: metodo, propinaMonto: propina });
      if (!r.ok) { setError(r.error); return; }
      onCerrar();
    });
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-8" style={{ background: 'rgba(26, 24, 20, 0.6)' }} onClick={onCerrar}>
      <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-white overflow-hidden" style={{ maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <header className="px-5 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>Cobrar Mesa {pago.mesaNumero}</p>
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.02em] mt-1" style={{ color: 'var(--color-ink)' }}>Confirmar pago</h2>
        </header>
        <div className="px-5 py-4 space-y-4">
          {pago.comandas.length > 0 ? (
            <div className="rounded-[var(--radius-md)] border bg-white" style={{ borderColor: 'var(--color-border)' }}>
              <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}>
                <p className="text-sm uppercase tracking-[0.14em]" style={{ color: 'var(--color-muted)' }}>Detalle - {pago.cantidadComandas} {pago.cantidadComandas === 1 ? 'comanda' : 'comandas'}</p>
              </div>
              <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {pago.comandas.map((c, idxC) => (
                  <li key={`${c.numeroDiario}-${idxC}`} className="px-4 py-3">
                    <div className="flex items-baseline justify-between mb-2">
                      <p className="font-[family-name:var(--font-display)] text-base tabular-nums" style={{ color: 'var(--color-ink)' }}>Comanda #{c.numeroDiario.toString().padStart(3, '0')}</p>
                      <span className="font-[family-name:var(--font-mono)] text-sm" style={{ color: 'var(--color-ink-soft)' }}>${c.total.toLocaleString('es-CO')}</span>
                    </div>
                    <ul className="space-y-1">
                      {c.items.map((it, idxI) => (
                        <li key={idxI} className="text-base">
                          <div className="flex items-baseline gap-2">
                            <span className="font-[family-name:var(--font-mono)] text-sm tabular-nums shrink-0 w-7" style={{ color: 'var(--color-muted)' }}>{it.cantidad}×</span>
                            <span className="flex-1" style={{ color: 'var(--color-ink)' }}>{it.nombre}</span>
                            <span className="font-[family-name:var(--font-mono)] text-sm tabular-nums shrink-0" style={{ color: 'var(--color-ink-soft)' }}>${(it.precio * it.cantidad).toLocaleString('es-CO')}</span>
                          </div>
                          {it.nota ? <p className="text-sm ml-9 italic mt-0.5" style={{ color: 'var(--color-muted)' }}>"{it.nota}"</p> : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pago.docNumero ? (
            <div className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: '#3b82f6', background: '#eff6ff' }}>
              <p className="text-xs uppercase tracking-[0.14em] mb-2" style={{ color: '#1e40af' }}>El cliente pidio factura</p>
              <dl className="space-y-1 text-base">
                <div className="flex items-baseline gap-2"><dt className="text-sm uppercase tracking-[0.1em] w-20 shrink-0" style={{ color: '#1e40af' }}>Tipo</dt><dd className="font-[family-name:var(--font-mono)]" style={{ color: 'var(--color-ink)' }}>{pago.docTipo}</dd></div>
                <div className="flex items-baseline gap-2"><dt className="text-sm uppercase tracking-[0.1em] w-20 shrink-0" style={{ color: '#1e40af' }}>Numero</dt><dd className="font-[family-name:var(--font-mono)] select-all" style={{ color: 'var(--color-ink)' }}>{pago.docNumero}</dd></div>
                <div className="flex items-baseline gap-2"><dt className="text-sm uppercase tracking-[0.1em] w-20 shrink-0" style={{ color: '#1e40af' }}>Nombre</dt><dd className="select-all" style={{ color: 'var(--color-ink)' }}>{pago.docNombre}</dd></div>
              </dl>
            </div>
          ) : null}

          <div className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}>
            <div className="flex items-center justify-between text-base">
              <span style={{ color: 'var(--color-ink-soft)' }}>Subtotal</span>
              <span className="font-[family-name:var(--font-mono)]" style={{ color: 'var(--color-ink)' }}>${pago.totalAcumulado.toLocaleString('es-CO')}</span>
            </div>
            <div className="py-2">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-base" style={{ color: 'var(--color-ink-soft)' }}>Propina (opcional)</span>
                {propina > 0 ? <span className="text-base font-[family-name:var(--font-mono)]" style={{ color: 'var(--color-ink)' }}>${propina.toLocaleString('es-CO')}</span> : null}
              </div>
              {pago.propinaSugerida ? <p className="text-sm mb-2 px-2 py-1.5 rounded" style={{ background: 'var(--color-paper-deep)', color: 'var(--color-ink-soft)' }}>El cliente sugirio ${pago.propinaSugerida.toLocaleString('es-CO')} de propina. Puedes ajustarlo si pago distinto.</p> : null}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input type="number" inputMode="numeric" min={0} value={propinaPct} onChange={(e) => { setPropinaPct(e.target.value); setPropinaManual(''); }} placeholder="%" className="w-full h-11 pl-3 pr-7 rounded-[var(--radius-md)] border text-base" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)', background: 'var(--color-paper)' }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-base" style={{ color: 'var(--color-muted)' }}>%</span>
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base" style={{ color: 'var(--color-muted)' }}>$</span>
                  <input type="number" inputMode="numeric" min={0} value={propinaManual} onChange={(e) => { setPropinaManual(e.target.value); setPropinaPct(''); }} placeholder="Monto" className="w-full h-11 pl-7 pr-3 rounded-[var(--radius-md)] border text-base" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)', background: 'var(--color-paper)' }} />
                </div>
              </div>
            </div>
            <div className="border-t pt-3 mt-2 flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-lg font-medium" style={{ color: 'var(--color-ink)' }}>Total</span>
              <span className="font-[family-name:var(--font-display)] text-3xl" style={{ color: 'var(--color-ink)' }}>${total.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div>
            <p className="text-sm uppercase tracking-[0.14em] mb-2" style={{ color: 'var(--color-muted)' }}>Metodo de pago</p>
            <div className="grid grid-cols-2 gap-2">
              {([{ v: 'efectivo', l: 'Efectivo' }, { v: 'tarjeta', l: 'Tarjeta' }, { v: 'transferencia', l: 'Transferencia' }, { v: 'no_seguro', l: 'Otro' }] as const).map((opt) => (
                <button key={opt.v} type="button" onClick={() => setMetodo(opt.v)} className="h-11 rounded-[var(--radius-md)] border text-base transition-colors" style={{ borderColor: metodo === opt.v ? colorMarca : 'var(--color-border-strong)', borderWidth: metodo === opt.v ? 1.5 : 1, background: metodo === opt.v ? 'var(--color-paper)' : 'white', color: metodo === opt.v ? colorMarca : 'var(--color-ink)' }}>{opt.l}</button>
              ))}
            </div>
          </div>

          {error ? <p role="alert" className="text-sm text-center" style={{ color: 'var(--color-danger)' }}>{error}</p> : null}
          <p className="text-sm text-center px-2" style={{ color: 'var(--color-muted)' }}>Al confirmar, la mesa se cierra y todas las comandas pendientes se marcan como entregadas.</p>
        </div>
        <footer className="px-5 py-4 border-t flex items-center gap-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}>
          <button type="button" onClick={onCerrar} disabled={pending} className="flex-1 h-12 rounded-[var(--radius-md)] text-base border" style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-ink)', background: 'white' }}>Cancelar</button>
          <button type="button" onClick={confirmar} disabled={pending} className="flex-1 h-12 rounded-[var(--radius-md)] text-base font-medium disabled:opacity-50" style={{ background: colorMarca, color: 'white' }}>{pending ? 'Cobrando...' : 'Confirmar y cerrar'}</button>
        </footer>
      </div>
    </div>
  );
}

function CardBase({ children, esMio, esDeOtro, colorMarca, pending }: { children: React.ReactNode; esMio: boolean; esDeOtro: boolean; colorMarca: string; pending: boolean }) {
  return (
    <article className="rounded-[var(--radius-lg)] border bg-white overflow-hidden transition-shadow" style={{ borderColor: esMio ? colorMarca : 'var(--color-border)', borderWidth: esMio ? 1.5 : 1, opacity: esDeOtro ? 0.65 : pending ? 0.6 : 1 }}>
      {children}
    </article>
  );
}

function FooterAcciones({ esMio, esDeOtro, colorMarca, pending, onTomar, onLiberar, onAccionPrimaria, textoAccionPrimaria, infoExtra }: { esMio: boolean; esDeOtro: boolean; colorMarca: string; pending: boolean; onTomar: () => void; onLiberar: () => void; onAccionPrimaria: () => void; textoAccionPrimaria: string; infoExtra?: string }) {
  return (
    <footer className="px-4 py-2.5 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--color-border)', background: 'var(--color-paper)' }}>
      {infoExtra ? <span className="text-sm" style={{ color: 'var(--color-muted)' }}>{infoExtra}</span> : <span />}
      <div className="flex items-center gap-3">
        {esMio ? (
          <>
            <button type="button" onClick={onLiberar} disabled={pending} className="text-sm underline disabled:opacity-50" style={{ color: 'var(--color-muted)' }}>Liberar</button>
            <button type="button" onClick={onAccionPrimaria} disabled={pending} className="text-sm font-medium disabled:opacity-50" style={{ color: colorMarca }}>{pending ? 'Procesando...' : `${textoAccionPrimaria}`}</button>
          </>
        ) : esDeOtro ? (
          <span className="text-sm italic" style={{ color: 'var(--color-muted)' }}>En atencion</span>
        ) : (
          <button type="button" onClick={onTomar} disabled={pending} className="text-sm font-medium disabled:opacity-50" style={{ color: colorMarca }}>{pending ? 'Tomando...' : 'Tomar'}</button>
        )}
      </div>
    </footer>
  );
}

function SeccionVacia({ mensaje, borderColor }: { mensaje: string; borderColor: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border-2 border-dashed py-10 px-4 text-center" style={{ borderColor }}>
      <p className="text-sm italic" style={{ color: 'var(--color-muted)' }}>{mensaje}</p>
    </div>
  );
}

function TiempoTranscurrido({ fecha }: { fecha: string }) {
  const [texto, setTexto] = useState<string>(() => formatearTiempo(fecha));
  useEffect(() => {
    const interval = setInterval(() => { setTexto(formatearTiempo(fecha)); }, 30_000);
    return () => clearInterval(interval);
  }, [fecha]);
  return <span className="text-sm tabular-nums" style={{ color: 'var(--color-muted)' }}>{texto}</span>;
}
function formatearTiempo(fecha: string): string {
  const ahora = Date.now();
  const desde = new Date(fecha).getTime();
  const minutos = Math.floor((ahora - desde) / 60_000);
  if (minutos < 1) return 'recien';
  if (minutos === 1) return 'hace 1 min';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas === 1) return 'hace 1 h';
  return `hace ${horas} h`;
}

function EstadoVacio({ colorMarca }: { colorMarca: string }) {
  return (
    <div className="text-center py-20 max-w-md mx-auto">
      <div className="size-16 rounded-full grid place-items-center mx-auto mb-6" style={{ background: colorMarca, color: 'white' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-[-0.015em] mb-3" style={{ color: 'var(--color-ink)' }}>Todo bajo control.</h2>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink-soft)' }}>Sin llamados, comandas listas, o pagos pendientes. Cuando llegue algo, sonara un aviso y aparecera aqui.</p>
    </div>
  );
}
