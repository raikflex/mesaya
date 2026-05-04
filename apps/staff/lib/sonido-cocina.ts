/**
 * Sonido de notificación para el tablero de cocina.
 *
 * Usamos Web Audio API para sintetizar el sonido localmente, evitando depender
 * de archivos externos (que requieren copy a /public, manejo de assets, etc).
 *
 * El sonido es un "ding" de dos notas cortas: 800Hz y 1200Hz, ~150ms cada una.
 * Profesional, no agresivo, audible en ambiente de cocina con ruido moderado.
 *
 * Importante: los browsers bloquean AudioContext hasta la primera interacción
 * del usuario. Por eso `desbloquearAudio()` se llama desde un click handler
 * en el header (no automáticamente al cargar la página).
 *
 * Persistimos la preferencia ON/OFF en localStorage por device — el cocinero
 * que apaga el sonido espera que siga apagado al volver mañana.
 */

const STORAGE_KEY = 'mesaya:cocina:sonido-on';

let audioContext: AudioContext | null = null;
let desbloqueado = false;

/**
 * Crea el AudioContext si no existe. Algunos browsers requieren esto dentro
 * de un user gesture (click) para que arranque "running" en lugar de "suspended".
 */
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
    console.warn('[audio] No se pudo crear AudioContext:', err);
  }
}

/**
 * Marca el audio como "desbloqueado" tras la primera interacción.
 * Llamar desde cualquier click handler que ejecute por user gesture.
 */
export function desbloquearAudio(): void {
  if (desbloqueado) return;
  inicializarAudio();
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {
      // ignore
    });
  }
  desbloqueado = true;
}

/**
 * Reproduce el ding. Si el sonido está apagado por el usuario o el audio no
 * se ha desbloqueado, no hace nada.
 */
export function reproducirDing(): void {
  if (typeof window === 'undefined') return;
  if (!estaSonidoActivo()) return;
  if (!audioContext) return;

  try {
    const ahora = audioContext.currentTime;

    // Primera nota: 800Hz, ataque rápido y decay corto.
    crearNota(audioContext, 800, ahora, 0.15);
    // Segunda nota: 1200Hz, sigue inmediatamente.
    crearNota(audioContext, 1200, ahora + 0.15, 0.18);
  } catch (err) {
    console.warn('[audio] No se pudo reproducir ding:', err);
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

  // Envelope ADSR muy simple: ataque rápido, decay exponencial.
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
  if (stored === null) return true; // default ON
  return stored === 'true';
}

export function alternarSonido(): boolean {
  if (typeof window === 'undefined') return true;
  const nuevo = !estaSonidoActivo();
  window.localStorage.setItem(STORAGE_KEY, String(nuevo));
  return nuevo;
}
