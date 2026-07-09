/**
 * Motor de disponibilidad para domicilios programados.
 *
 * Calcula en que dias puede el cliente programar un domicilio, respetando:
 *  - El horario de domicilios (tabla horarios_domicilios) de cada dia.
 *  - La hora de corte de cada dia (= hora_cierre).
 *  - La ventana: desde hoy hasta el domingo de la PROXIMA semana. Asi el cliente
 *    puede pedir por anticipado los dias de esta semana y los de la que viene.
 *
 * Trae sus propios helpers de hora Colombia para NO tocar la lib horarios.ts
 * (que es critica y la usan los menus en vivo). Solo reusa de ahi lo exportado.
 */

import { formatearHora, nombreDiaCapital, type HorarioDia } from './horarios';

export type DiaDomicilioDisponible = {
  fecha: string; // "YYYY-MM-DD" en hora Colombia
  diaSemana: number; // 0=domingo ... 6=sabado
  nombre: string; // "Lunes"
  esHoy: boolean;
  corte: string; // hora de corte formateada, ej "9:00 am"
  semana: 'esta' | 'proxima'; // para agrupar en la UI
  platoVigente: boolean; // true si el plato del dia aplica (hasta el proximo viernes)
};

/** Parsea "HH:MM:SS" o "HH:MM" a minutos desde medianoche. */
function parseHoraMin(hora: string): number {
  const p = hora.split(':');
  const h = parseInt(p[0] ?? '0', 10);
  const m = parseInt(p[1] ?? '0', 10);
  return h * 60 + m;
}

/** Dia de semana (0-6) y minutos desde medianoche, en hora Colombia. */
function ahoraBogota(): { dow: number; minutos: number } {
  const ahora = new Date();
  const bogota = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  return { dow: bogota.getDay(), minutos: bogota.getHours() * 60 + bogota.getMinutes() };
}

/** Fecha "YYYY-MM-DD" en hora Colombia, desplazada offset dias. */
function fechaBogota(offset: number): string {
  const ahora = new Date();
  const bogota = new Date(ahora.toLocaleString('en-US', { timeZone: 'America/Bogota' }));
  if (offset !== 0) bogota.setDate(bogota.getDate() + offset);
  const y = bogota.getFullYear();
  const m = (bogota.getMonth() + 1).toString().padStart(2, '0');
  const d = bogota.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Devuelve los dias en los que el cliente puede programar un domicilio.
 * Ventana: desde hoy hasta el domingo de la PROXIMA semana (incluido).
 * Reglas por dia:
 *  - Debe estar 'abierto' en el horario de domicilios y tener hora de corte.
 *  - Si es HOY: disponible solo si todavia no paso la hora de corte.
 *  - Si es un dia futuro (de esta semana o de la proxima): disponible.
 */
export function diasDomicilioDisponibles(
  horariosDomicilios: HorarioDia[],
): DiaDomicilioDisponible[] {
  const { dow: dowHoy, minutos } = ahoraBogota();
  // Offset hasta el domingo de ESTA semana (domingo = 0). Si hoy es domingo, 0.
  const offsetDomingoEsta = dowHoy === 0 ? 0 : 7 - dowHoy;
  // Hasta el domingo de la PROXIMA semana: una semana mas.
  const offsetFinal = offsetDomingoEsta + 7;
  // Corte del plato del dia: vigente desde hoy hasta el PROXIMO viernes (incluido).
  // El sabado arranca semana nueva de platos -> lo posterior dice "Por definirse".
  const offsetViernes = (5 - dowHoy + 7) % 7;

  const dias: DiaDomicilioDisponible[] = [];
  for (let i = 0; i <= offsetFinal; i++) {
    const dow = (dowHoy + i) % 7;
    const h = horariosDomicilios.find((x) => x.dia_semana === dow);
    if (!h || !h.abierto || !h.hora_cierre) continue;

    // Hoy: si ya paso el corte, este dia no se puede pedir.
    if (i === 0 && minutos >= parseHoraMin(h.hora_cierre)) continue;

    dias.push({
      fecha: fechaBogota(i),
      diaSemana: dow,
      nombre: nombreDiaCapital(dow),
      esHoy: i === 0,
      corte: formatearHora(h.hora_cierre),
      semana: i <= offsetDomingoEsta ? 'esta' : 'proxima',
      platoVigente: i <= offsetViernes,
    });
  }

  return dias;
}
