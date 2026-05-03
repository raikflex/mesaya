/**
 * Helper para gestionar el carrito del cliente en sessionStorage.
 * Sobrevive refresh, se borra al cerrar pestaña.
 *
 * Estructura:
 *   mesaya:carrito:{qr_token} → ItemCarrito[]
 *
 * Cada ItemCarrito guarda snapshot del precio y nombre al momento de agregar:
 * si el dueño edita el menú mientras el cliente arma carrito, los precios
 * y nombres NO cambian.
 */

export type ItemCarrito = {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
  notas: string | null;
  /** Cuándo se agregó este item al carrito (para invalidar carritos viejos). */
  agregadoEn: number;
};

function key(qrToken: string) {
  return `mesaya:carrito:${qrToken}`;
}

export function leerCarrito(qrToken: string): ItemCarrito[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(key(qrToken));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ItemCarrito[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i) =>
        typeof i.productoId === 'string' &&
        typeof i.nombre === 'string' &&
        typeof i.precio === 'number' &&
        typeof i.cantidad === 'number' &&
        i.cantidad > 0,
    );
  } catch {
    return [];
  }
}

export function guardarCarrito(qrToken: string, items: ItemCarrito[]): void {
  if (typeof window === 'undefined') return;
  if (items.length === 0) {
    window.sessionStorage.removeItem(key(qrToken));
    return;
  }
  window.sessionStorage.setItem(key(qrToken), JSON.stringify(items));
}

/**
 * Agrega o incrementa un item en el carrito.
 * Si ya existía, suma la cantidad y reemplaza las notas.
 */
export function agregarItem(
  qrToken: string,
  nuevo: Omit<ItemCarrito, 'agregadoEn'>,
): ItemCarrito[] {
  const carrito = leerCarrito(qrToken);
  const idx = carrito.findIndex((i) => i.productoId === nuevo.productoId);

  let actualizado: ItemCarrito[];
  if (idx >= 0) {
    actualizado = [...carrito];
    const existente = actualizado[idx]!;
    actualizado[idx] = {
      ...existente,
      cantidad: Math.min(99, existente.cantidad + nuevo.cantidad),
      notas: nuevo.notas, // Reemplaza las notas con las nuevas.
      agregadoEn: Date.now(),
    };
  } else {
    actualizado = [...carrito, { ...nuevo, agregadoEn: Date.now() }];
  }

  guardarCarrito(qrToken, actualizado);
  return actualizado;
}

export function actualizarCantidad(
  qrToken: string,
  productoId: string,
  cantidad: number,
): ItemCarrito[] {
  const carrito = leerCarrito(qrToken);
  if (cantidad <= 0) {
    const actualizado = carrito.filter((i) => i.productoId !== productoId);
    guardarCarrito(qrToken, actualizado);
    return actualizado;
  }
  const actualizado = carrito.map((i) =>
    i.productoId === productoId ? { ...i, cantidad: Math.min(99, cantidad) } : i,
  );
  guardarCarrito(qrToken, actualizado);
  return actualizado;
}

export function eliminarItem(qrToken: string, productoId: string): ItemCarrito[] {
  const carrito = leerCarrito(qrToken);
  const actualizado = carrito.filter((i) => i.productoId !== productoId);
  guardarCarrito(qrToken, actualizado);
  return actualizado;
}

export function vaciarCarrito(qrToken: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(key(qrToken));
}

export function calcularTotal(items: ItemCarrito[]): number {
  return items.reduce((acc, i) => acc + i.precio * i.cantidad, 0);
}

export function totalUnidades(items: ItemCarrito[]): number {
  return items.reduce((acc, i) => acc + i.cantidad, 0);
}
