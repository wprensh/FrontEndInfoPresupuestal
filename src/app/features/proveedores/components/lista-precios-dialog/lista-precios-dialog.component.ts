import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { MONEDA } from '../../../mantenimiento/models/mantenimiento.model';
import { ProveedoresApiService } from '../../data-access/proveedores-api.service';
import { PROVEEDORES_MATERIAL } from '../../material/proveedores-material';
import { IVA_GENERAL, PrecioProveedor, ProductoProveedor, ciudadLabel } from '../../models/proveedores.model';

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * Lista de precios de un producto: un precio por ciudad (vacía = todo el país) y fecha de vigencia.
 * El valor se digita con o sin IVA y se muestran ambos. Un precio nuevo agrega una fila; editar
 * corrige un precio mal digitado. Cierra con `true` si algo cambió.
 */
@Component({
  selector: 'app-lista-precios-dialog',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, ...PROVEEDORES_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Precios de {{ producto.codigo }}</h2>
    <mat-dialog-content>
      <p class="desc">{{ producto.descripcion }} · {{ producto.unidad }}</p>
      @if (puede.insertar || (puede.editar && editando())) {
        <form [formGroup]="form" (ngSubmit)="save()" class="row">
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="ciudad">
            <mat-label>Ciudad</mat-label>
            <input matInput formControlName="ciudad" maxlength="80" placeholder="Vacía = todo el país" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Valor ({{ moneda }})</mat-label>
            <input matInput type="number" min="0.01" step="0.01" formControlName="valor" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic" class="iva">
            <mat-label>IVA %</mat-label>
            <input matInput type="number" min="0" max="100" step="0.01" formControlName="ivaPct" />
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Vigente desde</mat-label>
            <input matInput type="date" formControlName="fechaVigencia" />
          </mat-form-field>
          <mat-slide-toggle formControlName="incluyeIva">El valor incluye IVA</mat-slide-toggle>
          <span class="spacer"></span>
          @if (editando()) {
            <button mat-button type="button" (click)="cancel()">Cancelar</button>
          }
          <button mat-flat-button type="submit">{{ editando() ? 'Corregir' : 'Agregar' }}</button>
        </form>
        @if (preview(); as p) {
          <p class="preview">Sin IVA {{ p.sin | currency: moneda : 'symbol-narrow' : '1.0-2' }} · Con IVA {{ p.con | currency: moneda : 'symbol-narrow' : '1.0-2' }}</p>
        }
      }
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <table mat-table [dataSource]="precios()">
        <ng-container matColumnDef="ciudad">
          <th mat-header-cell *matHeaderCellDef>Ciudad</th>
          <td mat-cell *matCellDef="let p">
            {{ ciudadLabel(p.ciudad) }}
            @if (vigentes().has(p.id)) {
              <mat-chip highlighted>vigente</mat-chip>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="fecha">
          <th mat-header-cell *matHeaderCellDef>Vigente desde</th>
          <td mat-cell *matCellDef="let p">{{ p.fechaVigencia | date: 'mediumDate' : 'UTC' }}</td>
        </ng-container>
        <ng-container matColumnDef="sinIva">
          <th mat-header-cell *matHeaderCellDef class="num">Sin IVA</th>
          <td mat-cell *matCellDef="let p" class="num" [class.digitado]="!p.incluyeIva">{{ p.valorSinIva | currency: p.moneda : 'symbol-narrow' : '1.0-2' }}</td>
        </ng-container>
        <ng-container matColumnDef="conIva">
          <th mat-header-cell *matHeaderCellDef class="num">Con IVA</th>
          <td mat-cell *matCellDef="let p" class="num" [class.digitado]="p.incluyeIva">{{ p.valorConIva | currency: p.moneda : 'symbol-narrow' : '1.0-2' }}</td>
        </ng-container>
        <ng-container matColumnDef="iva">
          <th mat-header-cell *matHeaderCellDef class="num">IVA</th>
          <td mat-cell *matCellDef="let p" class="num muted">{{ p.ivaPct * 100 }} %</td>
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
        <p class="muted">Este producto todavía no tiene precio.</p>
      } @else {
        <p class="muted nota">En negrilla, el valor tal como se digitó.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: `
    .desc { margin: 0 0 12px; opacity: 0.8; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .row mat-form-field { flex: 1; min-width: 130px; }
    .row .ciudad { flex: 1.4; }
    .row .iva { flex: 0 0 90px; min-width: 90px; }
    .spacer { flex: 1; }
    .preview { margin: 6px 0 12px; font-size: 13px; opacity: 0.8; }
    table { width: 100%; min-width: 640px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .digitado { font-weight: 600; }
    .muted { opacity: 0.6; font-size: 12px; }
    .nota { margin: 8px 0 0; }
    .actions { text-align: right; white-space: nowrap; }
    .selected { background: var(--mat-sys-secondary-container); }
    mat-chip { margin-left: 6px; transform: scale(0.85); }
  `,
})
export class ListaPreciosDialogComponent implements OnInit {
  protected readonly producto = inject<ProductoProveedor>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ListaPreciosDialogComponent, boolean>>(MatDialogRef);
  private readonly api = inject(ProveedoresApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  protected readonly moneda = MONEDA;
  protected readonly ciudadLabel = ciudadLabel;
  protected readonly columns = ['ciudad', 'fecha', 'sinIva', 'conIva', 'iva', 'acciones'];
  protected readonly puede = {
    insertar: this.auth.can('catalogo-proveedor', 'insertar'),
    editar: this.auth.can('catalogo-proveedor', 'editar'),
    eliminar: this.auth.can('catalogo-proveedor', 'eliminar'),
  };
  protected readonly precios = signal<PrecioProveedor[]>([]);
  protected readonly loading = signal(false);
  protected readonly editando = signal<PrecioProveedor | null>(null);
  private changed = false;

  /** El precio vigente de cada ciudad es el de fecha más reciente. */
  protected readonly vigentes = computed(() => {
    const vistos = new Set<string>();
    const ids = new Set<number>();
    for (const p of this.precios()) {
      const clave = p.ciudad ?? '';
      if (!vistos.has(clave)) {
        vistos.add(clave);
        ids.add(p.id);
      }
    }
    return ids;
  });

  private readonly fb = inject(NonNullableFormBuilder);
  protected readonly form = this.fb.group({
    ciudad: [''],
    valor: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    incluyeIva: [false],
    ivaPct: [IVA_GENERAL * 100, [Validators.required, Validators.min(0), Validators.max(100)]],
    fechaVigencia: [today(), Validators.required],
  });
  private readonly valores = signal(this.form.getRawValue());

  /** Lo que queda sin y con IVA según lo digitado, antes de guardar. */
  protected readonly preview = computed(() => {
    const { valor, incluyeIva, ivaPct } = this.valores();
    const v = Number(valor);
    const iva = Number(ivaPct) / 100;
    if (!(v > 0) || !(iva >= 0)) return null;
    return incluyeIva ? { sin: v / (1 + iva), con: v } : { sin: v, con: v * (1 + iva) };
  });

  constructor() {
    this.form.valueChanges.subscribe(() => this.valores.set(this.form.getRawValue()));
  }

  ngOnInit(): void {
    void this.load();
  }

  protected edit(precio: PrecioProveedor): void {
    this.editando.set(precio);
    this.form.setValue({
      ciudad: precio.ciudad ?? '',
      valor: precio.valor,
      incluyeIva: precio.incluyeIva,
      ivaPct: Math.round(precio.ivaPct * 10000) / 100,
      fechaVigencia: precio.fechaVigencia,
    });
  }

  protected cancel(): void {
    this.editando.set(null);
    this.form.reset({ ciudad: '', valor: null, incluyeIva: false, ivaPct: IVA_GENERAL * 100, fechaVigencia: today() });
  }

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const dto = {
      valor: Number(v.valor),
      fechaVigencia: v.fechaVigencia,
      ciudad: v.ciudad.trim().replace(/\s+/g, ' ').toUpperCase() || null,
      incluyeIva: v.incluyeIva,
      ivaPct: Math.round(Number(v.ivaPct) * 100) / 10000,
      moneda: MONEDA,
    };
    const editando = this.editando();
    const result = editando
      ? await attempt(this.snackBar, this.api.updatePrecio(this.producto.id, editando.id, dto), 'Precio corregido')
      : await attempt(this.snackBar, this.api.createPrecio(this.producto.id, dto), 'Precio agregado');
    if (result.ok) {
      this.changed = true;
      this.cancel();
      await this.load();
    }
  }

  protected async remove(precio: PrecioProveedor): Promise<void> {
    if ((await attempt(this.snackBar, this.api.deletePrecio(this.producto.id, precio.id), 'Precio eliminado')).ok) {
      this.changed = true;
      await this.load();
    }
  }

  protected close(): void {
    this.dialogRef.close(this.changed);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    const result = await attempt(this.snackBar, this.api.getProducto(this.producto.id));
    if (result.ok) {
      const orden = [...result.value.precios].sort(
        (a, b) => (a.ciudad ?? '').localeCompare(b.ciudad ?? '') || b.fechaVigencia.localeCompare(a.fechaVigencia),
      );
      this.precios.set(orden);
    }
    this.loading.set(false);
  }
}
