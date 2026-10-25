import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { attempt } from '../../../../shared/data/attempt';
import { Clasificacion, MONEDA } from '../../../mantenimiento/models/mantenimiento.model';
import { ProveedoresApiService } from '../../data-access/proveedores-api.service';
import { PROVEEDORES_MATERIAL } from '../../material/proveedores-material';
import { AccionImportacion, PropuestaImportacion, ResultadoImportacion, ciudadLabel } from '../../models/proveedores.model';

interface Fila {
  propuesta: PropuestaImportacion;
  incluir: boolean;
  clasificacionId: number | null;
}

const ETIQUETAS: Record<AccionImportacion, string> = {
  CREAR: 'Insumo nuevo',
  ACTUALIZAR: 'Cambia el precio',
  SIN_CAMBIO: 'Sin cambio',
  REPETIDO: 'Repetido',
};

/**
 * Revisión antes de importar: muestra qué pasa con cada precio (insumo nuevo o cambio de precio, con
 * el precio actual y la variación) y deja quitar filas o elegir la clasificación de los insumos nuevos.
 * Cierra con el resultado si se importó algo.
 */
@Component({
  selector: 'app-revision-importacion-dialog',
  imports: [CurrencyPipe, DecimalPipe, ...PROVEEDORES_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>Revisar antes de importar</h2>
    <mat-dialog-content>
      <p class="intro">
        Se importa el valor <strong>sin IVA</strong> con vigencia de hoy. Quita la marca de lo que no quieras traer.
        @if (resumen(); as r) {
          <span class="resumen">{{ r.crear }} nuevos · {{ r.actualizar }} cambios de precio · {{ r.otros }} sin cambio o repetidos</span>
        }
      </p>
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <div class="wrap">
        <table mat-table [dataSource]="filas()">
          <ng-container matColumnDef="incluir">
            <th mat-header-cell *matHeaderCellDef>
              <mat-checkbox [checked]="todas()" [indeterminate]="algunas()" (change)="marcarTodas($event.checked)" aria-label="Marcar todas" />
            </th>
            <td mat-cell *matCellDef="let f">
              <mat-checkbox [checked]="f.incluir" [disabled]="!aplicable(f)" (change)="marcar(f, $event.checked)" aria-label="Importar esta fila" />
            </td>
          </ng-container>
          <ng-container matColumnDef="accion">
            <th mat-header-cell *matHeaderCellDef>Qué pasa</th>
            <td mat-cell *matCellDef="let f">
              <span class="accion" [attr.data-accion]="f.propuesta.accion" [matTooltip]="ayuda(f.propuesta.accion)">{{ etiqueta(f.propuesta.accion) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="producto">
            <th mat-header-cell *matHeaderCellDef>Producto</th>
            <td mat-cell *matCellDef="let f">
              {{ f.propuesta.descripcion }}
              <div class="muted">{{ f.propuesta.razonSocial }} · {{ f.propuesta.codigoProveedor }} · {{ ciudadLabel(f.propuesta.ciudad) }} · {{ f.propuesta.unidad }}</div>
            </td>
          </ng-container>
          <ng-container matColumnDef="insumo">
            <th mat-header-cell *matHeaderCellDef>Insumo</th>
            <td mat-cell *matCellDef="let f">
              @if (f.propuesta.insumoCodigo) {
                <span class="code">{{ f.propuesta.insumoCodigo }}</span>
              } @else {
                <mat-form-field appearance="outline" subscriptSizing="dynamic" class="clasif">
                  <mat-label>Clasificación</mat-label>
                  <mat-select [value]="f.clasificacionId" (valueChange)="f.clasificacionId = $event" [disabled]="!f.incluir">
                    <mat-option [value]="null">Sin clasificación</mat-option>
                    @for (c of clasificaciones(); track c.id) {
                      <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="actual">
            <th mat-header-cell *matHeaderCellDef class="num">Precio actual</th>
            <td mat-cell *matCellDef="let f" class="num muted">
              {{ f.propuesta.precioActual === null ? '—' : (f.propuesta.precioActual | currency: moneda : 'symbol-narrow' : '1.0-2') }}
            </td>
          </ng-container>
          <ng-container matColumnDef="nuevo">
            <th mat-header-cell *matHeaderCellDef class="num">Precio nuevo</th>
            <td mat-cell *matCellDef="let f" class="num"><strong>{{ f.propuesta.valorSinIva | currency: moneda : 'symbol-narrow' : '1.0-2' }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="variacion">
            <th mat-header-cell *matHeaderCellDef class="num">Variación</th>
            <td mat-cell *matCellDef="let f" class="num">
              @if (variacion(f.propuesta); as v) {
                <span [class.sube]="v > 0" [class.baja]="v < 0">{{ v > 0 ? '+' : '' }}{{ v | number: '1.0-1' }} %</span>
              }
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: columns" [class.fuera]="!row.incluir"></tr>
        </table>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button [disabled]="seleccionadas() === 0 || saving()" (click)="importar()">
        Importar {{ seleccionadas() }} {{ seleccionadas() === 1 ? 'precio' : 'precios' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .intro { margin: 0 0 12px; font-size: 13px; }
    .resumen { display: block; margin-top: 4px; opacity: 0.7; }
    .wrap { max-height: 60vh; overflow: auto; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; }
    table { width: 100%; min-width: 820px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .muted { opacity: 0.65; font-size: 12px; }
    .code { font-family: var(--ip-font-mono); font-size: 13px; }
    .clasif { width: 190px; }
    .accion { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; white-space: nowrap; background: var(--mat-sys-surface-container-high); }
    .accion[data-accion='CREAR'] { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .accion[data-accion='ACTUALIZAR'] { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .sube { color: var(--mat-sys-error); }
    .baja { color: var(--mat-sys-primary); }
    .fuera { opacity: 0.5; }
  `,
})
export class RevisionImportacionDialogComponent implements OnInit {
  private readonly precioIds = inject<number[]>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RevisionImportacionDialogComponent, ResultadoImportacion>>(MatDialogRef);
  private readonly api = inject(ProveedoresApiService);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly moneda = MONEDA;
  protected readonly ciudadLabel = ciudadLabel;
  protected readonly columns = ['incluir', 'accion', 'producto', 'insumo', 'actual', 'nuevo', 'variacion'];
  protected readonly filas = signal<Fila[]>([]);
  protected readonly clasificaciones = signal<Clasificacion[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  /** Se incrementa al marcar o desmarcar para recalcular los totales (las filas son objetos mutables). */
  private readonly version = signal(0);

  protected readonly seleccionadas = computed(() => (this.version(), this.filas().filter((f) => f.incluir).length));
  protected readonly todas = computed(() => {
    const aplicables = (this.version(), this.filas().filter((f) => this.aplicable(f)));
    return aplicables.length > 0 && aplicables.every((f) => f.incluir);
  });
  protected readonly algunas = computed(() => !this.todas() && this.seleccionadas() > 0);
  protected readonly resumen = computed(() => {
    const filas = this.filas();
    if (filas.length === 0) return null;
    const contar = (a: AccionImportacion) => filas.filter((f) => f.propuesta.accion === a).length;
    return { crear: contar('CREAR'), actualizar: contar('ACTUALIZAR'), otros: contar('SIN_CAMBIO') + contar('REPETIDO') };
  });

  async ngOnInit(): Promise<void> {
    const result = await attempt(this.snackBar, forkJoin([this.api.revisarImportacion(this.precioIds), this.api.clasificaciones()]));
    this.loading.set(false);
    if (!result.ok) {
      this.dialogRef.close();
      return;
    }
    const [propuestas, clasificaciones] = result.value;
    this.clasificaciones.set(clasificaciones.items);
    this.filas.set(
      propuestas.map((propuesta) => ({
        propuesta,
        incluir: propuesta.accion === 'CREAR' || propuesta.accion === 'ACTUALIZAR',
        clasificacionId: propuesta.clasificacionId,
      })),
    );
  }

  protected etiqueta(accion: AccionImportacion): string {
    return ETIQUETAS[accion];
  }

  protected ayuda(accion: AccionImportacion): string {
    return accion === 'REPETIDO'
      ? 'Otro precio del mismo producto ya está en la lista (por ejemplo, otra ciudad): se importa solo el primero.'
      : accion === 'SIN_CAMBIO'
        ? 'El insumo ya tiene este mismo precio.'
        : '';
  }

  protected aplicable(f: Fila): boolean {
    return f.propuesta.accion === 'CREAR' || f.propuesta.accion === 'ACTUALIZAR';
  }

  protected variacion(p: PropuestaImportacion): number | null {
    return p.precioActual ? ((p.valorSinIva - p.precioActual) / p.precioActual) * 100 : null;
  }

  protected marcar(f: Fila, incluir: boolean): void {
    f.incluir = incluir;
    this.version.update((v) => v + 1);
  }

  protected marcarTodas(incluir: boolean): void {
    for (const f of this.filas()) if (this.aplicable(f)) f.incluir = incluir;
    this.version.update((v) => v + 1);
  }

  protected async importar(): Promise<void> {
    const items = this.filas()
      .filter((f) => f.incluir)
      .map((f) => ({ precioId: f.propuesta.precioId, clasificacionId: f.propuesta.accion === 'CREAR' ? f.clasificacionId : null }));
    this.saving.set(true);
    const result = await attempt(this.snackBar, this.api.importar(items));
    this.saving.set(false);
    if (result.ok) this.dialogRef.close(result.value);
  }
}
