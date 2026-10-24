import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Observable, catchError, firstValueFrom, forkJoin, of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { IfCanDirective } from '../../../../core/auth/if-can.directive';
import { attempt } from '../../../../shared/data/attempt';
import { Paged, PagedList } from '../../../../shared/data/paged-list';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { InsumoFormData, InsumoFormDialogComponent, InsumoFormResult } from '../../components/insumo-form-dialog/insumo-form-dialog.component';
import { PreciosDialogComponent } from '../../components/precios-dialog/precios-dialog.component';
import { MantenimientoApiService } from '../../data-access/mantenimiento-api.service';
import { MANTENIMIENTO_MATERIAL } from '../../material/mantenimiento-material';
import { Clasificacion, Insumo, InsumoFiltro, TipoInsumo, UnidadMedida } from '../../models/mantenimiento.model';

/** Un catálogo que el rol no puede ver queda vacío en lugar de impedir abrir el formulario. */
const orEmpty = <T>(call: Observable<Paged<T>>): Observable<Paged<T>> =>
  call.pipe(catchError(() => of({ items: [] as T[], page: 1, pageSize: 0, total: 0 })));

/** Catálogo de insumos de la empresa con su precio vigente y su historial. */
@Component({
  selector: 'app-insumos-page',
  imports: [CurrencyPipe, PageHeaderComponent, SearchBoxComponent, IfCanDirective, ...MANTENIMIENTO_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header title="Insumos y precios" [subtitle]="list.total() + ' insumos'">
      <button mat-flat-button *appIfCan="['insumos', 'insertar']" (click)="open(null)"><mat-icon>add</mat-icon>Nuevo insumo</button>
    </app-page-header>

    <div class="toolbar">
      <app-search-box label="Buscar por descripción o código" [value]="list.search()" (search)="list.setSearch($event)" />
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Tipo</mat-label>
        <mat-select [value]="filtro().tipoInsumoId" (valueChange)="setFiltro({ tipoInsumoId: $event })">
          <mat-option [value]="null">Todos</mat-option>
          @for (t of tipos(); track t.id) {
            <mat-option [value]="t.id">{{ t.nombre }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Clasificación</mat-label>
        <mat-select [value]="filtro().clasificacionId" (valueChange)="setFiltro({ clasificacionId: $event })">
          <mat-option [value]="null">Todas</mat-option>
          @for (c of clasificaciones(); track c.id) {
            <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>

    @if (list.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (list.loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="table-wrap">
      <table mat-table [dataSource]="list.items()">
        <ng-container matColumnDef="codigo">
          <th mat-header-cell *matHeaderCellDef>Código</th>
          <td mat-cell *matCellDef="let i" class="code">{{ i.codigo }}</td>
        </ng-container>
        <ng-container matColumnDef="descripcion">
          <th mat-header-cell *matHeaderCellDef>Descripción</th>
          <td mat-cell *matCellDef="let i" [class.inactivo]="!i.activo">
            {{ i.descripcion }}
            @if (!i.activo) {
              <span class="muted">(inactivo)</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="unidad">
          <th mat-header-cell *matHeaderCellDef>Unidad</th>
          <td mat-cell *matCellDef="let i">{{ i.unidad }}</td>
        </ng-container>
        <ng-container matColumnDef="clasificacion">
          <th mat-header-cell *matHeaderCellDef>Clasificación</th>
          <td mat-cell *matCellDef="let i" class="muted">{{ i.clasificacion ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="precio">
          <th mat-header-cell *matHeaderCellDef class="num">Precio vigente</th>
          <td mat-cell *matCellDef="let i" class="num">
            @if (i.precio; as p) {
              {{ p.valorUnitario | currency: p.moneda : 'symbol-narrow' : '1.0-2' }}
            } @else {
              <span class="muted">Sin precio</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let i" class="actions-cell">
            <button mat-icon-button matTooltip="Historial de precios" *appIfCan="['precios-insumo', 'ver']" (click)="precios(i)"><mat-icon>price_change</mat-icon></button>
            <button mat-icon-button matTooltip="Editar" *appIfCan="['insumos', 'editar']" (click)="open(i)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button matTooltip="Eliminar" *appIfCan="['insumos', 'eliminar']" (click)="remove(i)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (!list.loading() && list.items().length === 0) {
        <p class="empty">No hay insumos que coincidan.</p>
      }
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)" />
  `,
  styles: `.toolbar mat-form-field { width: 200px; } .inactivo { opacity: 0.6; }`,
})
export class InsumosPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(MantenimientoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['codigo', 'descripcion', 'unidad', 'clasificacion', 'precio', 'acciones'];
  protected readonly filtro = signal<InsumoFiltro>({ tipoInsumoId: null, clasificacionId: null, activo: null });
  protected readonly list = new PagedList<Insumo>((q) => this.api.listInsumos(q, this.filtro()));

  protected readonly tipos = signal<TipoInsumo[]>([]);
  protected readonly clasificaciones = signal<Clasificacion[]>([]);
  private readonly unidades = signal<UnidadMedida[]>([]);

  ngOnInit(): void {
    void this.list.load();
    void this.loadCatalogos();
  }

  protected setFiltro(partial: Partial<InsumoFiltro>): void {
    this.filtro.update((f) => ({ ...f, ...partial }));
    void this.list.setPage(1, this.list.pageSize());
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async open(insumo: Insumo | null): Promise<void> {
    if (this.unidades().length === 0 && !(await this.loadCatalogos())) return;
    const result = await firstValueFrom(
      this.dialog
        .open<InsumoFormDialogComponent, InsumoFormData, InsumoFormResult>(InsumoFormDialogComponent, {
          data: { insumo, tipos: this.tipos(), unidades: this.unidades(), clasificaciones: this.clasificaciones() },
        })
        .afterClosed(),
    );
    if (!result) return;
    const saved =
      result.tipo === 'crear'
        ? await attempt(this.snackBar, this.api.createInsumo(result.dto), 'Insumo creado')
        : await attempt(this.snackBar, this.api.updateInsumo(insumo!.id, result.dto), 'Insumo actualizado');
    if (saved.ok) {
      void this.list.load();
      if (result.tipo === 'crear' && this.auth.can('precios-insumo', 'insertar')) await this.precios(saved.value);
    }
  }

  protected async precios(insumo: Insumo): Promise<void> {
    const changed = await firstValueFrom(
      this.dialog.open<PreciosDialogComponent, Insumo, boolean>(PreciosDialogComponent, { data: insumo, width: '720px', maxWidth: '95vw', disableClose: true }).afterClosed(),
    );
    if (changed) void this.list.load();
  }

  protected async remove(insumo: Insumo): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            title: 'Eliminar insumo',
            message: `¿Eliminar ${insumo.codigo} · ${insumo.descripcion}? También se borra su historial de precios. Para conservarlo, desactívalo.`,
            confirmText: 'Eliminar',
          },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.deleteInsumo(insumo.id), 'Insumo eliminado')).ok) void this.list.load();
  }

  private async loadCatalogos(): Promise<boolean> {
    const result = await attempt(this.snackBar, forkJoin([orEmpty(this.api.tipos()), orEmpty(this.api.unidades()), orEmpty(this.api.clasificaciones())]));
    if (!result.ok) return false;
    const [tipos, unidades, clasificaciones] = result.value;
    this.tipos.set(tipos.items);
    this.unidades.set(unidades.items);
    this.clasificaciones.set(clasificaciones.items);
    return true;
  }
}
