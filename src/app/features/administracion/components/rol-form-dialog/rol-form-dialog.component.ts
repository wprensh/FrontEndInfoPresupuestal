import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { ACCIONES, Accion } from '../../../../core/auth/auth.model';
import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { ADMIN_MATERIAL } from '../../material/admin-material';
import { ModuloInfo, Permiso, Rol, RolDto } from '../../models/admin.model';

export interface RolFormData {
  rol: Rol | null;
  modulos: ModuloInfo[];
  /** Roles del sistema o usuario sin permiso de edición: solo se muestran. */
  soloLectura: boolean;
}

export const ACCION_LABELS: Record<Accion, string> = { ver: 'Ver', insertar: 'Insertar', editar: 'Editar', eliminar: 'Eliminar' };

/** Rol con su matriz de permisos: una fila por módulo y una columna por acción. */
@Component({
  selector: 'app-rol-form-dialog',
  imports: [ReactiveFormsModule, AutofocusDirective, ...ADMIN_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.rol ? (data.soloLectura ? 'Rol ' + data.rol.nombre : 'Editar rol') : 'Nuevo rol' }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content>
        <div class="fields">
          <mat-form-field appearance="outline">
            <mat-label>Nombre</mat-label>
            <input matInput formControlName="nombre" appAutofocus />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Descripción</mat-label>
            <input matInput formControlName="descripcion" />
          </mat-form-field>
        </div>
        @if (data.rol?.esSistema) {
          <p class="note"><mat-icon>lock</mat-icon>Rol del sistema: no se edita ni se elimina. Crea un rol nuevo para otra combinación de permisos.</p>
        }
        <table class="matrix">
          <thead>
            <tr>
              <th>Módulo</th>
              @for (accion of acciones; track accion) {
                <th>{{ labels[accion] }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (modulo of data.modulos; track modulo.codigo) {
              <tr>
                <td>
                  {{ modulo.nombre }}
                  @if (modulo.alcance === 'Global') {
                    <span class="tag" matTooltip="Catálogo compartido por todas las empresas: solo el superadministrador lo modifica">compartido</span>
                  }
                </td>
                @for (accion of acciones; track accion) {
                  <td>
                    <mat-checkbox
                      [checked]="tiene(modulo.codigo, accion)"
                      [disabled]="data.soloLectura || !modulo.accionesAsignables.includes(accion)"
                      (change)="toggle(modulo, accion, $event.checked)"
                      [attr.aria-label]="labels[accion] + ' ' + modulo.nombre"
                    />
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        @if (data.soloLectura) {
          <button mat-flat-button type="button" mat-dialog-close>Cerrar</button>
        } @else {
          <button mat-button type="button" (click)="todo(false)">Quitar todo</button>
          <button mat-button type="button" (click)="todo(true)">Marcar todo</button>
          <span class="spacer"></span>
          <button mat-button type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button type="submit">Guardar</button>
        }
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields { display: grid; grid-template-columns: 1fr 2fr; gap: 12px; }
    .matrix { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .matrix th { font-weight: 500; font-size: 13px; text-align: center; padding: 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .matrix th:first-child, .matrix td:first-child { text-align: left; }
    .matrix td { text-align: center; padding: 2px 8px; border-bottom: 1px solid var(--mat-sys-surface-container-high); }
    .tag { font-size: 11px; padding: 2px 6px; border-radius: 8px; background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); margin-left: 6px; }
    .note { display: flex; align-items: center; gap: 8px; font-size: 13px; opacity: 0.8; }
    .spacer { flex: 1; }
    @media (max-width: 600px) { .fields { grid-template-columns: 1fr; } }
  `,
})
export class RolFormDialogComponent {
  protected readonly data = inject<RolFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RolFormDialogComponent, RolDto>>(MatDialogRef);

  protected readonly acciones = ACCIONES;
  protected readonly labels = ACCION_LABELS;

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: [{ value: this.data.rol?.nombre ?? '', disabled: this.data.soloLectura }, [Validators.required, Validators.maxLength(60)]],
    descripcion: [{ value: this.data.rol?.descripcion ?? '', disabled: this.data.soloLectura }, Validators.maxLength(300)],
  });

  private readonly permisos = signal<Map<string, Permiso>>(new Map((this.data.rol?.permisos ?? []).map((p) => [p.modulo, { ...p }])));

  protected tiene(modulo: string, accion: Accion): boolean {
    return this.permisos().get(modulo)?.[accion] === true;
  }

  /** Insertar, Editar o Eliminar implican Ver; quitar Ver quita todo. */
  protected toggle(modulo: ModuloInfo, accion: Accion, checked: boolean): void {
    this.permisos.update((map) => {
      const next = new Map(map);
      const p = { ...(next.get(modulo.codigo) ?? { modulo: modulo.codigo, ver: false, insertar: false, editar: false, eliminar: false }) };
      p[accion] = checked;
      if (checked && accion !== 'ver') p.ver = true;
      if (!checked && accion === 'ver') p.insertar = p.editar = p.eliminar = false;
      next.set(modulo.codigo, p);
      return next;
    });
  }

  protected todo(checked: boolean): void {
    this.permisos.set(
      new Map(
        this.data.modulos.map((m) => [
          m.codigo,
          {
            modulo: m.codigo,
            ver: checked,
            insertar: checked && m.accionesAsignables.includes('insertar'),
            editar: checked && m.accionesAsignables.includes('editar'),
            eliminar: checked && m.accionesAsignables.includes('eliminar'),
          },
        ]),
      ),
    );
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombre, descripcion } = this.form.getRawValue();
    const permisos = [...this.permisos().values()].filter((p) => p.ver || p.insertar || p.editar || p.eliminar);
    this.dialogRef.close({ nombre: nombre.trim(), descripcion: descripcion.trim() || null, permisos });
  }
}
