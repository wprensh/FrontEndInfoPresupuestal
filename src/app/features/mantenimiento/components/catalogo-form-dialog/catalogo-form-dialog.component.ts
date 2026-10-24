import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';


import { MANTENIMIENTO_MATERIAL } from '../../material/mantenimiento-material';
import { CampoCatalogo, CatalogoConfig, CatalogoItem } from '../../models/mantenimiento.model';

export interface CatalogoFormData {
  config: CatalogoConfig;
  item: CatalogoItem | null;
}

/** Formulario genérico de un catálogo simple; los campos salen de su `CatalogoConfig`. */
@Component({
  selector: 'app-catalogo-form-dialog',
  imports: [ReactiveFormsModule, ...MANTENIMIENTO_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.item ? 'Editar' : 'Nueva' }} {{ data.config.singular }}</h2>
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-dialog-content class="fields">
        @for (campo of campos; track campo.key) {
          @if (campo.tipo === 'activo') {
            <mat-slide-toggle [formControlName]="campo.key">{{ campo.label }}</mat-slide-toggle>
          } @else {
            <mat-form-field appearance="outline">
              <mat-label>{{ campo.label }}</mat-label>
              <input matInput [formControlName]="campo.key" [maxLength]="campo.maxLength" [class.upper]="campo.mayusculas" />
              @if (campo.hint) {
                <mat-hint>{{ campo.hint }}</mat-hint>
              }
            </mat-form-field>
          }
        }
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Guardar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields { display: flex; flex-direction: column; gap: 4px; min-width: min(380px, 80vw); }
    .upper { text-transform: uppercase; }
  `,
})
export class CatalogoFormDialogComponent {
  protected readonly data = inject<CatalogoFormData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<CatalogoFormDialogComponent, Record<string, unknown>>>(MatDialogRef);

  protected readonly campos: CampoCatalogo[] = this.data.config.campos.filter((c) => (this.data.item ? !c.soloCrear : !c.soloEditar));

  protected readonly form = new FormGroup(
    Object.fromEntries(
      this.campos.map((c) => [
        c.key,
        c.tipo === 'activo'
          ? new FormControl<boolean>((this.data.item?.[c.key] as boolean | undefined) ?? true, { nonNullable: true })
          : new FormControl<string>((this.data.item?.[c.key] as string | undefined) ?? '', {
              nonNullable: true,
              validators: [Validators.required, Validators.maxLength(c.maxLength), Validators.pattern(/\S/)],
            }),
      ]),
    ),
  );

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue() as Record<string, unknown>;
    this.dialogRef.close(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v])));
  }
}
