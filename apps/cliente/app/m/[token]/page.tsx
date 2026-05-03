import { notFound } from 'next/navigation';
import { createClient } from '@mesaya/database/server';
import { EstadoRestauranteScreen } from './estado-restaurante';

/**
 * Entrada del cliente al escanear un QR.
 * URL: m.mesaya.co/m/{qr_token}
 *
 * En esta sesión (S3), solo manejamos los estados del restaurante.
 * El flujo completo de pedido (mostrar menú, agregar al carrito, enviar comanda)
 * se construye en S4.
 */

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: mesa } = await supabase
    .from('mesas')
    .select('numero, restaurantes(nombre_publico)')
    .eq('qr_token', token)
    .maybeSingle();

  if (!mesa) {
    return { title: 'MesaYA' };
  }

  const rest = (Array.isArray(mesa.restaurantes) ? mesa.restaurantes[0] : mesa.restaurantes) as { nombre_publico?: string } | null;
  const nombre = rest?.nombre_publico ?? 'Restaurante';
  return {
    title: `Mesa ${mesa.numero as string} · ${nombre}`,
  };
}

export default async function MesaQRPage({ params }: PageProps) {
  const { token } = await params;

  const supabase = await createClient();

  // Buscar la mesa por qr_token y traer datos del restaurante.
  const { data: mesa } = await supabase
    .from('mesas')
    .select(
      `
      id,
      numero,
      activa,
      restaurante_id,
      restaurantes (
        id,
        nombre_publico,
        color_marca,
        estado,
        horario_apertura,
        horario_cierre,
        dias_operacion,
        timezone
      )
    `,
    )
    .eq('qr_token', token)
    .maybeSingle();

  // QR inválido: token no existe en la DB.
  if (!mesa) {
    notFound();
  }

  const restaurante = (Array.isArray(mesa.restaurantes) ? mesa.restaurantes[0] : mesa.restaurantes) as {
    id: string;
    nombre_publico: string;
    color_marca: string;
    estado: 'activo' | 'archivado' | 'suspendido';
    horario_apertura: string;
    horario_cierre: string;
    dias_operacion: string[];
    timezone: string;
  } | null;

  if (!restaurante) {
    notFound();
  }

  // Estados que NO permiten pedir.
  if (restaurante.estado === 'archivado') {
    return (
      <EstadoRestauranteScreen
        tipo="aun-no-abre"
        nombreNegocio={restaurante.nombre_publico}
        colorMarca={restaurante.color_marca}
      />
    );
  }

  if (restaurante.estado === 'suspendido') {
    return (
      <EstadoRestauranteScreen
        tipo="suspendido"
        nombreNegocio={restaurante.nombre_publico}
        colorMarca={restaurante.color_marca}
      />
    );
  }

  if (!mesa.activa) {
    return (
      <EstadoRestauranteScreen
        tipo="mesa-inactiva"
        nombreNegocio={restaurante.nombre_publico}
        colorMarca={restaurante.color_marca}
        numeroMesa={mesa.numero as string}
      />
    );
  }

  // Validar horario.
  const ahoraEnTZ = ahoraEnTimezone(restaurante.timezone);
  if (!estaAbierto(ahoraEnTZ, restaurante)) {
    return (
      <EstadoRestauranteScreen
        tipo="cerrado"
        nombreNegocio={restaurante.nombre_publico}
        colorMarca={restaurante.color_marca}
        proximaApertura={proximaApertura(ahoraEnTZ, restaurante)}
      />
    );
  }

  // Restaurante activo + en horario + mesa activa.
  // El flujo de pedido completo se construye en S4.
  return (
    <EstadoRestauranteScreen
      tipo="placeholder-pedido"
      nombreNegocio={restaurante.nombre_publico}
      colorMarca={restaurante.color_marca}
      numeroMesa={mesa.numero as string}
    />
  );
}

/* ============ helpers de horario ============ */

function ahoraEnTimezone(tz: string): { dia: string; hora: string } {
  const ahora = new Date();
  // Formato: día corto en español (lun, mar, mie, jue, vie, sab, dom).
  const fmt = new Intl.DateTimeFormat('es-CO', {
    timeZone: tz,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const partes = fmt.formatToParts(ahora);
  const weekday = partes.find((p) => p.type === 'weekday')?.value.toLowerCase() ?? '';
  const hora = partes.find((p) => p.type === 'hour')?.value ?? '00';
  const minuto = partes.find((p) => p.type === 'minute')?.value ?? '00';

  // Normalizar weekday a slug de 3 letras como guarda la DB.
  const map: Record<string, string> = {
    lun: 'lun',
    mar: 'mar',
    mié: 'mie',
    jue: 'jue',
    vie: 'vie',
    sáb: 'sab',
    dom: 'dom',
  };
  const sin_punto = weekday.replace('.', '');
  const dia = map[sin_punto] ?? sin_punto.slice(0, 3);

  return { dia, hora: `${hora}:${minuto}` };
}

function estaAbierto(
  ahora: { dia: string; hora: string },
  rest: { dias_operacion: string[]; horario_apertura: string; horario_cierre: string },
): boolean {
  if (!rest.dias_operacion.includes(ahora.dia)) return false;

  const apertura = rest.horario_apertura.slice(0, 5);
  const cierre = rest.horario_cierre.slice(0, 5);

  // Caso simple: apertura < cierre (ej. 08:00 - 22:00).
  if (apertura <= cierre) {
    return ahora.hora >= apertura && ahora.hora < cierre;
  }
  // Caso "trasnoche" (ej. 18:00 - 02:00).
  return ahora.hora >= apertura || ahora.hora < cierre;
}

function proximaApertura(
  ahora: { dia: string; hora: string },
  rest: { dias_operacion: string[]; horario_apertura: string },
): string {
  // Devuelve un texto humano "Abre el lunes a las 8:00am" o similar.
  const ordenDias = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'];
  const nombreDias: Record<string, string> = {
    lun: 'lunes',
    mar: 'martes',
    mie: 'miércoles',
    jue: 'jueves',
    vie: 'viernes',
    sab: 'sábado',
    dom: 'domingo',
  };

  const idxHoy = ordenDias.indexOf(ahora.dia);
  if (idxHoy === -1) return '';

  // ¿Abre hoy más tarde?
  if (
    rest.dias_operacion.includes(ahora.dia) &&
    ahora.hora < rest.horario_apertura.slice(0, 5)
  ) {
    return `Abre hoy a las ${rest.horario_apertura.slice(0, 5)}`;
  }

  // Buscar el próximo día abierto.
  for (let i = 1; i <= 7; i++) {
    const idx = (idxHoy + i) % 7;
    const dia = ordenDias[idx]!;
    if (rest.dias_operacion.includes(dia)) {
      return `Abre el ${nombreDias[dia]} a las ${rest.horario_apertura.slice(0, 5)}`;
    }
  }
  return '';
}
