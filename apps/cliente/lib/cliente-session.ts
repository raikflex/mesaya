/**
 * Helper para gestionar la sesión del cliente en sessionStorage.
 * Sobrevive refresh, se borra al cerrar pestaña.
 *
 * Estructura:
 *   mesaya:cliente:{qr_token} → { nombre, iniciada_en }
 *
 * Por qué con qr_token: para que un cliente que escanea otra mesa con el mismo
 * dispositivo no se confunda con el nombre/sesión anterior. Cada mesa = sesión limpia.
 */

export type ClienteSession = {
  nombre: string;
  iniciadaEn: number;
};

function key(qrToken: string) {
  return `mesaya:cliente:${qrToken}`;
}

export function leerSesionCliente(qrToken: string): ClienteSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key(qrToken));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClienteSession;
    if (typeof parsed.nombre !== 'string' || parsed.nombre.length < 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function guardarSesionCliente(qrToken: string, nombre: string): void {
  if (typeof window === 'undefined') return;
  const session: ClienteSession = {
    nombre: nombre.trim(),
    iniciadaEn: Date.now(),
  };
  window.sessionStorage.setItem(key(qrToken), JSON.stringify(session));
}

export function borrarSesionCliente(qrToken: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(key(qrToken));
}

/** Capitaliza primera letra de cada palabra. "ana maría" → "Ana María". */
export function capitalizarNombre(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : ''))
    .join(' ');
}
