import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';

export type Attempt<T> = { ok: true; value: T } | { ok: false };

/** Ejecuta una llamada a la API y avisa con un snackbar si salió bien (`success`) o el error. */
export async function attempt<T>(snackBar: MatSnackBar, call: Observable<T>, success?: string): Promise<Attempt<T>> {
  try {
    const value = await firstValueFrom(call, { defaultValue: undefined as T });
    if (success) snackBar.open(success, 'Cerrar', { duration: 3000 });
    return { ok: true, value };
  } catch (e) {
    snackBar.open(e instanceof Error ? e.message : 'Error inesperado', 'Cerrar', { duration: 5000 });
    return { ok: false };
  }
}
