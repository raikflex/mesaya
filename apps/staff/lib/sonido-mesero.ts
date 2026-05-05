/**
 * Sonidos para el tablero del mesero. 3 eventos distintos = 3 timbres distintos.
 *
 *   - 'llamado'  → 1 nota corta media (700Hz, 200ms): cliente toca campana
 *   - 'comanda'  → 2 notas ascendentes (700Hz + 1000Hz): cocina entregó algo
 *   - 'pago'     → 3 notas descendentes (1100Hz + 800Hz + 500Hz): mesa pide cuenta
 *
 * Mismo patrón Web Audio API que sonido-cocina.ts. Toggle ON/OFF persistido
 * en localStorage por device.
 */

const STORAGE_KEY = 'mesaya:mesero:sonido-on';

let audioContext: AudioContext | null = null;
let desbloqueado = false;

export type EventoSonido = 'llamado' | 'comanda' | 'pago';

export function inicializarAudio(): void {
  if (typeof window === 'undefined') return;
  if (audioContext) return;
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioContext = new Ctor();
  } catch (err) {
    console.warn('[audio mesero] No se pudo crear AudioContext:', err);
  }
}

export function desbloquearAudio(): void {
  if (desbloqueado) return;
  inicializarAudio();
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }
  desbloqueado = true;
}

export function reproducir(evento: EventoSonido): void {
  if (typeof window === 'undefined') return;
  if (!estaSonidoActivo()) return;
  if (!audioContext) return;

  try {
    const ahora = audioContext.currentTime;

    if (evento === 'llamado') {
      // 1 nota larga: campana del cliente.
      crearNota(audioContext, 700, ahora, 0.22);
    } else if (evento === 'comanda') {
      // 2 notas ascendentes: cocina entregó.
      crearNota(audioContext, 700, ahora, 0.13);
      crearNota(audioContext, 1000, ahora + 0.13, 0.16);
    } else if (evento === 'pago') {
      // 3 notas descendentes: mesa pide cuenta (más urgente).
      crearNota(audioContext, 1100, ahora, 0.13);
      crearNota(audioContext, 800, ahora + 0.13, 0.13);
      crearNota(audioContext, 500, ahora + 0.26, 0.18);
    }
  } catch (err) {
    console.warn('[audio mesero] No se pudo reproducir:', err);
  }
}

function crearNota(
  ctx: AudioContext,
  frecuencia: number,
  inicio: number,
  duracion: number,
): void {
  const oscilador = ctx.createOscillator();
  const ganancia = ctx.createGain();

  oscilador.type = 'sine';
  oscilador.frequency.setValueAtTime(frecuencia, inicio);

  ganancia.gain.setValueAtTime(0, inicio);
  ganancia.gain.linearRampToValueAtTime(0.18, inicio + 0.01);
  ganancia.gain.exponentialRampToValueAtTime(0.001, inicio + duracion);

  oscilador.connect(ganancia);
  ganancia.connect(ctx.destination);

  oscilador.start(inicio);
  oscilador.stop(inicio + duracion);
}

export function estaSonidoActivo(): boolean {
  if (typeof window === 'undefined') return true;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true;
  return stored === 'true';
}

export function alternarSonido(): boolean {
  if (typeof window === 'undefined') return true;
  const nuevo = !estaSonidoActivo();
  window.localStorage.setItem(STORAGE_KEY, String(nuevo));
  return nuevo;
}
