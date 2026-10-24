import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { MantenimientoApiService } from '../../data-access/mantenimiento-api.service';
import { MANTENIMIENTO_MATERIAL } from '../../material/mantenimiento-material';
import { Insumo, MONEDA, PrecioInsumo } from '../../models/mantenimiento.model';

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Historial de precios de un insumo. Un precio nuevo agrega una fila con su fecha de vigencia;
 * editar solo corrige un precio mal digitado. Cierra con `true` si algo cambió.
 */
@Component({
  selector: 'app-precios-dialog',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, ...MANTENIMIENTO_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Precios de {{ insumo.codigo }}</h2>
    <mat-dialog-content>
      <p class="desc">{{ insumo.descripcion }} · {{ insumo.unidad }}</p>
      @if (puede.insertar || (puede.editar && editando())) {
        <form [formGroup]="form" (ngSubmit)="save()" class="row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Valor unitario ({{ moneda }})</mat-label>
            <input matInput type="number" min="0.01" step="0.01" formControlName="valorUnitario" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Vigente desde</mat-label>
            <input matInput type="date" formControlName="fechaVigencia" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Fuente</mat-label>
            <input matInput formControlName="fuente" maxlength="120" />
          </mat-form-field>
          <button mat-flat-button type="submit">{{ editando() ? 'Corregir' : 'Agregar' }}</button>
          @if (editando()) {
            <button mat-button type="button" (click)="cancel()">Cancelar</button>
          }
        </form>
      }
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <table mat-table [dataSource]="precios()">
        <ng-container matColumnDef="fecha">
          <th mat-header-cell *matHeaderCellDef>Vigente desde</th>
          <td mat-cell *matCellDef="let p; let i = index">{{ p.fechaVigencia | date: 'mediumDate' : 'UTC' }} @if (i === 0) {<mat-chip highlighted>vigente</mat-chip>}</td>
        </ng-container>
        <ng-container matColumnDef="valor">
          <th mat-header-cell *matHeaderCellDef class="num">Valor</th>
          <td mat-cell *matCellDef="let p" class="num">{{ p.valorUnitario | currency: p.moneda : 'symbol-narrow' : '1.0-2' }} {{ p.moneda }}</td>
        </ng-container>
        <ng-container matColumnDef="fuente">
          <th mat-header-cell *matHeaderCellDef>Fuente</th>
          <td mat-cell *matCellDef="let p" class="muted">{{ p.fuente }}</td>
        </ng-container>
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="actions">
            @if (puede.editar) {
              <button mat-icon-button matTooltip="Corregir" (click)="edit(p)"><mat-icon>edit</mat-icon></button>
            }
            @if (puede.eliminar) {
              <button mat-icon-button matTooltip="Eliminar" (click)="remove(p)"><mat-icon>delete</mat-icon></button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" [class.selected]="row.id === editando()?.id"></tr>
      </table>
      @if (!loading() && precios().length === 0) {
        <p class="muted">Este insumo todavía no tiene precio.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .desc { margin: 0 0 12px; opacity: 0.8; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
    .row mat-form-field { flex: 1; min-width: 140px; }
    table { width: 100%; min-width: 520px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .muted { opacity: 0.6; font-size: 12px; }
    .actions { text-align: right; white-space: nowrap; }
    .selected { background: var(--mat-sys-secondary-container); }
    mat-chip { margin-left: 6px; transform: scale(0.85); }
  `,
})
export class PreciosDialogComponent implements OnInit {
  protected readonly insumo = inject<Insumo>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<PreciosDialogComponent, boolean>>(MatDialogRef);
  private readonly api = inject(MantenimientoApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  protected readonly moneda = MONEDA;
  protected readonly columns = ['fecha', 'valor', 'fuente', 'acciones'];
  protected readonly puede = {
    insertar: this.auth.can('precios-insumo', 'insertar'),
    editar: this.auth.can('precios-insumo', 'editar'),
    eliminar: this.auth.can('precios-insumo', 'eliminar'),
  };
  protected readonly precios = signal<PrecioInsumo[]>([]);
  protected readonly loading = signal(false);
  protected readonly editando = signal<PrecioInsumo | null>(null);
  private changed = false;

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    valorUnitario: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    fechaVigencia: [today(), Validators.required],
    fuente: [''],
  });

  ngOnInit(): void {
    void this.load();
  }

  protected edit(precio: PrecioInsumo): void {
    this.editando.set(precio);
    this.form.setValue({ valorUnitario: precio.valorUnitario, fechaVigencia: precio.fechaVigencia, fuente: precio.fuente ?? '' });
  }

  protected cancel(): void {
    this.editando.set(null);
    this.form.reset({ valorUnitario: null, fechaVigencia: today(), fuente: '' });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto = { valorUnitario: Number(v.valorUnitario), fechaVigencia: v.fechaVigencia, moneda: MONEDA, fuente: v.fuente.trim() || null };
    const editando = this.editando();
    const result = editando
      ? await attempt(this.snackBar, this.api.updatePrecio(this.insumo.id, editando.id, dto), 'Precio corregido')
      : await attempt(this.snackBar, this.api.createPrecio(this.insumo.id, dto), 'Precio agregado');
    if (result.ok) {
      this.changed = true;
      this.cancel();
      await this.load();
    }
  }

  protected async remove(precio: PrecioInsumo): Promise<void> {
    if ((await attempt(this.snackBar, this.api.deletePrecio(this.insumo.id, precio.id), 'Precio eliminado')).ok) {
      this.changed = true;
      await this.load();
    }
  }

  protected close(): void {
    this.dialogRef.close(this.changed);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const result = await attempt(this.snackBar, this.api.listPrecios(this.insumo.id));
    if (result.ok) this.precios.set(result.value);
    this.loading.set(false);
  }
}
