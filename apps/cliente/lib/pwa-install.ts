// Captura global del evento beforeinstallprompt.
//
// PROBLEMA QUE RESUELVE: Chrome dispara beforeinstallprompt UNA sola vez y
// MUY temprano (al cargar la pagina). Si un componente React registra el
// listener dentro de un useEffect, se monta tarde y el evento ya paso: se lo
// pierde y el boton de instalar queda sin nada que disparar.
//
// SOLUCION: registrar el listener apenas se importa este modulo (desde el
// layout raiz, que carga tempranisimo), guardar el evento aqui en una
// variable de modulo, y que los componentes lo LEAN de aca cuando se monten,
// sin importar cuan tarde sea.

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

// El evento capturado (o null si Chrome todavia no lo disparo / no aplica).
let promptGuardado: BeforeInstallPromptEvent | null = null;

// Suscriptores que quieren enterarse cuando el evento llega o cambia.
const suscriptores = new Set<() => void>();

// Marca para no registrar los listeners dos veces.
let inicializado = false;

function avisar() {
  for (const fn of suscriptores) fn();
}

/**
 * Registra los listeners globales. Idempotente: se puede llamar varias veces
 * pero solo engancha una vez. Llamar del lado del cliente (en el layout).
 */
export function inicializarCapturaInstall() {
  if (inicializado) return;
  if (typeof window === 'undefined') return;
  inicializado = true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Evita que Chrome muestre su mini-infobar por defecto; queremos
    // dispararlo nosotros desde nuestro boton.
    e.preventDefault();
    promptGuardado = e as BeforeInstallPromptEvent;
    avisar();
  });

  // Cuando la app se instala, limpiamos el evento (ya no sirve).
  window.addEventListener('appinstalled', () => {
    promptGuardado = null;
    avisar();
  });
}

/** Devuelve el evento capturado, o null si no hay. */
export function obtenerPromptInstall(): BeforeInstallPromptEvent | null {
  return promptGuardado;
}

/**
 * Suscribe una funcion que se llama cuando el evento llega o cambia.
 * Devuelve una funcion para desuscribirse. Pensado para useSyncExternalStore
 * o para un useEffect que setea estado.
 */
export function suscribirInstall(fn: () => void): () => void {
  suscriptores.add(fn);
  return () => {
    suscriptores.delete(fn);
  };
}

/**
 * Dispara el prompt nativo de instalacion (Android/Chrome). Devuelve el
 * outcome ('accepted' | 'dismissed') o null si no habia evento para disparar.
 * Tras usarse, el evento se consume (Chrome no permite reusarlo).
 */
export async function dispararInstall(): Promise<'accepted' | 'dismissed' | null> {
  if (!promptGuardado) return null;
  await promptGuardado.prompt();
  const { outcome } = await promptGuardado.userChoice;
  // El evento ya no se puede reutilizar.
  promptGuardado = null;
  avisar();
  return outcome;
}
