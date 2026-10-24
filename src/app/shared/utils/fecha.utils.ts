/** Fechas sin hora (`DateOnly` de la API) sin que la zona horaria las corra un día. */

/** `2026-10-24` → fecha local. */
export function fechaLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Fecha local → `2026-10-24`. */
export function fechaIso(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}
