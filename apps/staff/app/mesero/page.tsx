import { createClient } from '@mesaya/database/server';
import { obtenerPerfilStaff } from '../../lib/auth-server';
import { TableroMesero, type ColaMesero, type CategoriaMenu } from './tablero-mesero';
import type { MesaInfo, SesionAbiertaResumen } from './mapa-mesas';

export const dynamic = 'force-dynamic';

/**
 * Tablero del mesero con cola unificada del restaurante.
 *
 * 3 secciones:
 *   1. Llamados activos (campana/otro/pago) en estado 'pendiente'.
 *   2. Comandas con estado='lista' (cocina ya las termino, falta entregar).
 *   3. Pagos: derivados de los llamados motivo='pago' pendientes, enriquecidos
 *      con el detalle de comandas + total de la sesion + datos opcionales de
 *      facturacion (doc_tipo, doc_numero, doc_nombre) que el cliente paso al
 *      pedir cuenta.
 *
 * Modelo "free pickup": cualquier mesero puede tomar cualquier item via
 * `mesero_atendiendo_id`. Lock optimista en el server action (Bloque B.2).
 */
export default async function MeseroPage() {
  const perfil = await obtenerPerfilStaff('mesero');
  const supabase = await createClient();

  // Leer los roles multi del usuario para filtrar que ve (capa 3).
  // El dueno siempre ve todo. Para los demas: si tiene rol 'mesero' ve mesas,
  // si tiene 'domiciliario' ve domicilios. Default permisivo: si no tiene
  // ninguno de los dos (caso raro), ve todo para no quedar bloqueado.
  const { data: rolesRaw } = await supabase
    .from('perfil_roles')
    .select('rol')
    .eq('perfil_id', perfil.id);
  const misRoles = (rolesRaw ?? []).map((r) => r.rol as string);
  const esDueno = perfil.rol === 'dueno';
  const tieneMesero = misRoles.includes('mesero');
  const tieneDomiciliario = misRoles.includes('domiciliario');
  // Si no tiene ninguno de los roles operativos, ve todo (no bloquear).
  const sinRolesOperativos = !tieneMesero && !tieneDomiciliario;
  const puedeVerMesas = esDueno || tieneMesero || sinRolesOperativos;
  const puedeVerDomicilios = esDueno || tieneDomiciliario || sinRolesOperativos;

  // Verificar si la pantalla de cocina esta activa. Si no lo esta, el mesero
  // ve una seccion extra "En preparacion" donde maneja el ciclo de vida de
  // las comandas (pendiente -> en_preparacion -> lista) manualmente.
  const { data: restaurante } = await supabase
    .from('restaurantes')
    .select('cocina_activa')
    .eq('id', perfil.restauranteId)
    .maybeSingle();

  const cocinaActiva = (restaurante?.cocina_activa as boolean) ?? false;

  // --- Llamados activos (excluyendo motivo='pago' que va a seccion de pagos) ---
  // Traemos tambien doc_tipo, doc_numero, doc_nombre, forma_pago_preferida y nota.
  // Las primeras 4 son para pagos; nota es para llamados normales (cliente
  // escribio detalles como "mas servilletas"). Leerlas en todos no tiene costo.
  const { data: llamadosRaw } = await supabase
    .from('llamados_mesero')
    .select(
      `
      id,
      motivo,
      estado,
      creado_en,
      mesero_atendiendo_id,
      sesion_id,
      doc_tipo,
      doc_numero,
      doc_nombre,
      forma_pago_preferida,
      propina_sugerida,
      nota,
      sesiones (
        mesas (numero)
      )
    `,
    )
    .eq('restaurante_id', perfil.restauranteId)
    .eq('estado', 'pendiente')
    .order('creado_en', { ascending: true });

  const llamadosArr = (llamadosRaw ?? []) as {
    id: string;
    motivo: string;
    estado: string;
    creado_en: string;
    mesero_atendiendo_id: string | null;
    sesion_id: string;
    doc_tipo: string | null;
    doc_numero: string | null;
    doc_nombre: string | null;
    forma_pago_preferida: string | null;
    propina_sugerida: number | null;
    nota: string | null;
    sesiones:
      | { mesas: { numero: string } | { numero: string }[] | null }
      | { mesas: { numero: string } | { numero: string }[] | null }[]
      | null;
  }[];

  const llamadosNoPago = llamadosArr.filter((l) => l.motivo !== 'pago');
  const llamadosPago = llamadosArr.filter((l) => l.motivo === 'pago');

  // --- Comandas listas para entregar ---
  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);

  // Si la cocina esta inactiva, el mesero ve TODAS las comandas en estados
  // activos (pendiente, en_preparacion, lista) para manejarlas manualmente.
  // Si la cocina esta activa, solo ve las que ya estan listas para entregar.
  const estadosFiltro = cocinaActiva ? ['lista'] : ['pendiente', 'en_preparacion', 'lista'];

  const { data: comandasListasRaw } = await supabase
    .from('comandas')
    .select(
      `
      id,
      numero_diario,
      estado,
      total,
      creada_en,
      mesero_atendiendo_id,
      sesion_id,
      origen,
      sesion_clientes (nombre),
      sesiones (mesas (numero)),
      pedidos_externos (id, estado_entrega, tipo, nombre_cliente, telefono, direccion, hora_pickup, notas_entrega)
    `,
    )
    .eq('restaurante_id', perfil.restauranteId)
    .in('estado', estadosFiltro)
    .gte('creada_en', inicioDia.toISOString())
    .order('creada_en', { ascending: true });

  const comandasListasArr = (comandasListasRaw ?? []) as {
    id: string;
    sesion_id: string;
    numero_diario: number;
    estado: string;
    total: number;
    creada_en: string;
    mesero_atendiendo_id: string | null;
    origen: string;
    sesion_clientes: { nombre: string } | { nombre: string }[] | null;
    sesiones:
      | { mesas: { numero: string } | { numero: string }[] | null }
      | { mesas: { numero: string } | { numero: string }[] | null }[]
      | null;
    pedidos_externos:
      | { id: string; estado_entrega: string; tipo: string; nombre_cliente: string; telefono: string; direccion: string | null; hora_pickup: string | null; notas_entrega: string | null }
      | { id: string; estado_entrega: string; tipo: string; nombre_cliente: string; telefono: string; direccion: string | null; hora_pickup: string | null; notas_entrega: string | null }[]
      | null;
  }[];

  const idsComandasListas = comandasListasArr.map((c) => c.id);
  const itemsComandasListas =
    idsComandasListas.length > 0
      ? ((
          await supabase
            .from('comanda_items')
            .select('id, comanda_id, nombre_snapshot, cantidad, nota')
            .in('comanda_id', idsComandasListas)
            .order('id', { ascending: true })
        ).data ?? [])
      : [];

  const itemsPorComanda = new Map<
    string,
    { id: string; nombre: string; cantidad: number; nota: string | null }[]
  >();
  for (const c of comandasListasArr) {
    itemsPorComanda.set(c.id, []);
  }
  for (const it of itemsComandasListas) {
    const arr = itemsPorComanda.get(it.comanda_id as string);
    if (arr) {
      arr.push({
        id: it.id as string,
        nombre: it.nombre_snapshot as string,
        cantidad: it.cantidad as number,
        nota: (it.nota as string) ?? null,
      });
    }
  }

  const sesionesPago = llamadosPago.map((l) => l.sesion_id);
  const comandasDeSesionesPago =
    sesionesPago.length > 0
      ? ((
          await supabase
            .from('comandas')
            .select('id, sesion_id, numero_diario, total, estado, creada_en')
            .in('sesion_id', sesionesPago)
            .neq('estado', 'cancelada')
            .order('creada_en', { ascending: true })
        ).data ?? [])
      : [];

  // Traer items de TODAS las comandas de pago en una sola query
  const idsComandasPago = comandasDeSesionesPago.map((c) => c.id as string);
  const itemsDeComandasPago =
    idsComandasPago.length > 0
      ? ((
          await supabase
            .from('comanda_items')
            .select('comanda_id, nombre_snapshot, cantidad, precio_snapshot, nota')
            .in('comanda_id', idsComandasPago)
            .order('id', { ascending: true })
        ).data ?? [])
      : [];

  const itemsPorComandaPago = new Map<
    string,
    { nombre: string; cantidad: number; precio: number; nota: string | null }[]
  >();
  for (const c of comandasDeSesionesPago) {
    itemsPorComandaPago.set(c.id as string, []);
  }
  for (const it of itemsDeComandasPago) {
    const arr = itemsPorComandaPago.get(it.comanda_id as string);
    if (arr) {
      arr.push({
        nombre: it.nombre_snapshot as string,
        cantidad: it.cantidad as number,
        precio: it.precio_snapshot as number,
        nota: (it.nota as string) ?? null,
      });
    }
  }

  const totalPorSesion = new Map<string, number>();
  const countPorSesion = new Map<string, number>();
  const comandasDetPorSesion = new Map<
    string,
    {
      numeroDiario: number;
      total: number;
      items: { nombre: string; cantidad: number; precio: number; nota: string | null }[];
    }[]
  >();

  for (const c of comandasDeSesionesPago) {
    const sid = c.sesion_id as string;
    totalPorSesion.set(sid, (totalPorSesion.get(sid) ?? 0) + (c.total as number));
    countPorSesion.set(sid, (countPorSesion.get(sid) ?? 0) + 1);
    const arr = comandasDetPorSesion.get(sid) ?? [];
    arr.push({
      numeroDiario: c.numero_diario as number,
      total: c.total as number,
      items: itemsPorComandaPago.get(c.id as string) ?? [],
    });
    comandasDetPorSesion.set(sid, arr);
  }

  const cola: ColaMesero = {
    llamados: llamadosNoPago.map((l) => {
      const sesion = Array.isArray(l.sesiones) ? l.sesiones[0] : l.sesiones;
      const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;
      return {
        id: l.id,
        motivo: l.motivo as 'campana' | 'otro',
        creadoEn: l.creado_en,
        mesaNumero: mesa?.numero ?? '?',
        meseroAtendiendoId: l.mesero_atendiendo_id,
        nota: l.nota,
      };
    }),
    comandasListas: comandasListasArr
      .filter((c) => c.estado === 'lista')
      .map((c) => {
        const sc = Array.isArray(c.sesion_clientes) ? c.sesion_clientes[0] : c.sesion_clientes;
        const sesion = Array.isArray(c.sesiones) ? c.sesiones[0] : c.sesiones;
        const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;
        const pedidoRaw = Array.isArray(c.pedidos_externos) ? c.pedidos_externos[0] : c.pedidos_externos;
        const pedido = pedidoRaw as {
          id: string; estado_entrega: string; tipo: string; nombre_cliente: string; telefono: string;
          direccion: string | null; hora_pickup: string | null; notas_entrega: string | null;
        } | null;
        return {
          id: c.id,
          sesionId: c.sesion_id,
          numeroDiario: c.numero_diario,
          total: c.total,
          creadaEn: c.creada_en,
          clienteNombre: (sc as { nombre: string } | null)?.nombre ?? 'Cliente',
          mesaNumero: (mesa as { numero: string } | null)?.numero ?? '?',
          meseroAtendiendoId: c.mesero_atendiendo_id,
          origen: c.origen ?? 'cliente',
          entrega: pedido ? {
            pedidoExternoId: pedido.id,
            estadoEntrega: pedido.estado_entrega,
            tipo: pedido.tipo as 'domicilio' | 'pickup',
            nombreCliente: pedido.nombre_cliente,
            telefono: pedido.telefono,
            direccion: pedido.direccion,
            horaPedido: pedido.hora_pickup,
            notasEntrega: pedido.notas_entrega,
          } : null,
          items: itemsPorComanda.get(c.id) ?? [],
        };
      }),
    // Comandas en pendiente o en_preparacion - solo se llenan cuando
    // cocinaActiva = false. Si esta activa, este array queda vacio.
    comandasEnPreparacion: comandasListasArr
      .filter((c) => c.estado === 'pendiente' || c.estado === 'en_preparacion')
      .map((c) => {
        const sc = Array.isArray(c.sesion_clientes) ? c.sesion_clientes[0] : c.sesion_clientes;
        const sesion = Array.isArray(c.sesiones) ? c.sesiones[0] : c.sesiones;
        const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;
        return {
          id: c.id,
          numeroDiario: c.numero_diario,
          estado: c.estado as 'pendiente' | 'en_preparacion',
          total: c.total,
          creadaEn: c.creada_en,
          clienteNombre: sc?.nombre ?? 'Cliente',
          mesaNumero: mesa?.numero ?? '?',
          items: itemsPorComanda.get(c.id) ?? [],
        };
      }),
    pagos: llamadosPago.map((l) => {
      const sesion = Array.isArray(l.sesiones) ? l.sesiones[0] : l.sesiones;
      const mesa = sesion ? (Array.isArray(sesion.mesas) ? sesion.mesas[0] : sesion.mesas) : null;
      return {
        id: l.id,
        sesionId: l.sesion_id,
        creadoEn: l.creado_en,
        mesaNumero: mesa?.numero ?? '?',
        meseroAtendiendoId: l.mesero_atendiendo_id,
        totalAcumulado: totalPorSesion.get(l.sesion_id) ?? 0,
        cantidadComandas: countPorSesion.get(l.sesion_id) ?? 0,
        formaPagoPreferida: l.forma_pago_preferida,
        propinaSugerida: l.propina_sugerida,
        docTipo: l.doc_tipo,
        docNumero: l.doc_numero,
        docNombre: l.doc_nombre,
        comandas: comandasDetPorSesion.get(l.sesion_id) ?? [],
      };
    }),
  };

  // === MAPA DE MESAS para el mesero (libres/ocupadas) ===
  const [mesasResp, sesionesAbiertasResp] = await Promise.all([
    supabase
      .from('mesas')
      .select('id, numero, capacidad')
      .eq('restaurante_id', perfil.restauranteId)
      .order('numero', { ascending: true }),
    supabase
      .from('sesiones')
      .select('id, mesa_id, abierta_en, comandas(id, total, estado)')
      .eq('restaurante_id', perfil.restauranteId)
      .eq('estado', 'abierta'),
  ]);

  const mesasInfo: MesaInfo[] = (
    (mesasResp.data ?? []) as { id: string; numero: string; capacidad: number }[]
  )
    .filter((m) => !m.numero.startsWith('_'))
    .slice()
    .sort((a, b) => {
      const na = parseInt(a.numero, 10);
      const nb = parseInt(b.numero, 10);
      if (Number.isNaN(na) || Number.isNaN(nb)) return a.numero.localeCompare(b.numero);
      return na - nb;
    })
    .map((m) => ({ id: m.id, numero: m.numero, capacidad: m.capacidad ?? 0 }));

  const sesionesAbiertas: SesionAbiertaResumen[] = (
    (sesionesAbiertasResp.data ?? []) as Array<{
      id: string;
      mesa_id: string;
      abierta_en: string;
      comandas: { total: number; estado: string }[] | null;
    }>
  ).map((s) => {
    const comandasNoCanceladas = (s.comandas ?? []).filter((c) => c.estado !== 'cancelada');
    // Bloquea cobro solo si hay comandas 'lista' (cocina termino, falta que el
    // mesero las entregue). Las que siguen en cocina no bloquean.
    const tienePendientesEntrega = comandasNoCanceladas.some((c) => c.estado === 'lista');
    return {
      sesionId: s.id,
      mesaId: s.mesa_id,
      abiertaEn: s.abierta_en,
      totalAcumulado: comandasNoCanceladas.reduce((acc, c) => acc + (c.total ?? 0), 0),
      comandasCount: comandasNoCanceladas.length,
      tienePendientesEntrega,
    };
  });

  // === MENU del restaurante (para que el mesero pueda tomar pedidos) ===
  const [{ data: categoriasMenu }, { data: productosMenu }] = await Promise.all([
    supabase
      .from('categorias')
      .select('id, nombre, orden')
      .eq('restaurante_id', perfil.restauranteId)
      .eq('activa', true)
      .order('orden', { ascending: true }),
    supabase
      .from('productos')
      .select('id, nombre, descripcion, precio, disponible, categoria_id')
      .eq('restaurante_id', perfil.restauranteId)
      .order('nombre', { ascending: true }),
  ]);

  const menu: CategoriaMenu[] = (categoriasMenu ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    orden: c.orden as number,
    productos: (
      (productosMenu ?? []) as {
        id: string;
        nombre: string;
        descripcion: string | null;
        precio: number;
        disponible: boolean;
        categoria_id: string;
      }[]
    )
      .filter((p) => p.categoria_id === c.id)
      .map(({ id, nombre, descripcion, precio, disponible }) => ({
        id,
        nombre,
        descripcion,
        precio,
        disponible,
      })),
  }));

  return (
    <TableroMesero
      perfilId={perfil.id}
      perfilNombre={perfil.nombre}
      restauranteNombre={perfil.restauranteNombre}
      colorMarca={perfil.restauranteColor}
      restauranteId={perfil.restauranteId}
      colaInicial={cola}
      mesasInfo={mesasInfo}
      sesionesAbiertasInicial={sesionesAbiertas}
      cocinaActiva={cocinaActiva}
      menu={menu}
      puedeVerMesas={puedeVerMesas}
      puedeVerDomicilios={puedeVerDomicilios}
    />
  );
}
