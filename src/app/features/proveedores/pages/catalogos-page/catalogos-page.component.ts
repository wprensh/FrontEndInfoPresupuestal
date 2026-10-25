import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { Paged, PagedList } from '../../../../shared/data/paged-list';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { TipoInsumo } from '../../../mantenimiento/models/mantenimiento.model';
import { RevisionImportacionDialogComponent } from '../../components/revision-importacion-dialog/revision-importacion-dialog.component';
import { ProveedoresApiService } from '../../data-access/proveedores-api.service';
import { PROVEEDORES_MATERIAL } from '../../material/proveedores-material';
import { CatalogoFiltro, FilaCatalogo, ProductoCatalogo, Proveedor, ResultadoImportacion, ciudadLabel } from '../../models/proveedores.model';

/**
 * Catálogos de todos los proveedores para la constructora: busca, compara precios por ciudad y
 * selecciona los que quiere traer a sus insumos. La importación siempre pasa por una revisión.
 */
@Component({
  selector: 'app-catalogos-page',
  imports: [CurrencyPipe, DatePipe, PageHeaderComponent, SearchBoxComponent, ...PROVEEDORES_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header title="Catálogos de proveedores" [subtitle]="list.total() + ' productos · precios sin y con IVA por ciudad'">
      @if (puedeImportar) {
        <button mat-flat-button [disabled]="seleccion().size === 0" (click)="revisar()">
          <mat-icon>download</mat-icon>Importar a mis insumos{{ seleccion().size ? ' (' + seleccion().size + ')' : '' }}
        </button>
      }
    </app-page-header>

    <div class="toolbar">
      <app-search-box label="Buscar por descripción, código, marca o categoría" [value]="list.search()" (search)="list.setSearch($event)" />
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Proveedor</mat-label>
        <mat-select [value]="filtro().proveedor" (valueChange)="setFiltro({ proveedor: $event })">
          <mat-option [value]="null">Todos</mat-option>
          @for (p of proveedores(); track p.id) {
            <mat-option [value]="p.tenantId">{{ p.razonSocial }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
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
        <mat-label>Ciudad</mat-label>
        <input matInput #ciudad [value]="filtro().ciudad ?? ''" (keyup.enter)="setFiltro({ ciudad: ciudad.value.trim() || null })" (blur)="setFiltro({ ciudad: ciudad.value.trim() || null })" />
      </mat-form-field>
    </div>

    @if (seleccion().size > 0) {
      <div class="seleccion">
        {{ seleccion().size }} {{ seleccion().size === 1 ? 'precio seleccionado' : 'precios seleccionados' }}
        <button mat-button (click)="limpiar()">Quitar selección</button>
      </div>
    }
    @if (list.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (list.loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="table-wrap">
      <table mat-table [dataSource]="filas()">
        <ng-container matColumnDef="sel">
          <th mat-header-cell *matHeaderCellDef>
            @if (puedeImportar) {
              <mat-checkbox [checked]="paginaCompleta()" [indeterminate]="paginaParcial()" (change)="marcarPagina($event.checked)" aria-label="Seleccionar la página" />
            }
          </th>
          <td mat-cell *matCellDef="let f">
            @if (puedeImportar) {
              <mat-checkbox [checked]="seleccion().has(f.precio.id)" (change)="marcar(f.precio.id, $event.checked)" aria-label="Seleccionar precio" />
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="producto">
          <th mat-header-cell *matHeaderCellDef>Producto</th>
          <td mat-cell *matCellDef="let f">
            {{ f.producto.descripcion }}
            <div class="muted">{{ f.producto.codigo }}{{ f.producto.marca ? ' · ' + f.producto.marca : '' }}{{ f.producto.categoria ? ' · ' + f.producto.categoria : '' }}</div>
          </td>
        </ng-container>
        <ng-container matColumnDef="proveedor">
          <th mat-header-cell *matHeaderCellDef>Proveedor</th>
          <td mat-cell *matCellDef="let f">{{ f.producto.razonSocial }}</td>
        </ng-container>
        <ng-container matColumnDef="unidad">
          <th mat-header-cell *matHeaderCellDef>Unidad</th>
          <td mat-cell *matCellDef="let f">{{ f.producto.unidad }}</td>
        </ng-container>
        <ng-container matColumnDef="ciudad">
          <th mat-header-cell *matHeaderCellDef>Ciudad</th>
          <td mat-cell *matCellDef="let f">{{ ciudadLabel(f.precio.ciudad) }}</td>
        </ng-container>
        <ng-container matColumnDef="sinIva">
          <th mat-header-cell *matHeaderCellDef class="num">Sin IVA</th>
          <td mat-cell *matCellDef="let f" class="num">{{ f.precio.valorSinIva | currency: f.precio.moneda : 'symbol-narrow' : '1.0-2' }}</td>
        </ng-container>
        <ng-container matColumnDef="conIva">
          <th mat-header-cell *matHeaderCellDef class="num">Con IVA</th>
          <td mat-cell *matCellDef="let f" class="num muted">{{ f.precio.valorConIva | currency: f.precio.moneda : 'symbol-narrow' : '1.0-2' }}</td>
        </ng-container>
        <ng-container matColumnDef="vigencia">
          <th mat-header-cell *matHeaderCellDef>Desde</th>
          <td mat-cell *matCellDef="let f" class="muted">{{ f.precio.fechaVigencia | date: 'mediumDate' : 'UTC' }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
        <tr mat-row *matRowDef="let row; columns: columns" [class.marcada]="seleccion().has(row.precio.id)"></tr>
      </table>
      @if (!list.loading() && filas().length === 0) {
        <p class="empty">No hay productos que coincidan.</p>
      }
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)" />
  `,
  styles: `
    .toolbar mat-form-field { width: 180px; }
    .seleccion { display: flex; align-items: center; gap: 8px; margin: -8px 0 8px; font-size: 13px; }
    .marcada { background: var(--mat-sys-secondary-container); }
  `,
})
export class CatalogosPageComponent implements OnInit {
  private readonly api = inject(ProveedoresApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);

  protected readonly ciudadLabel = ciudadLabel;
  protected readonly puedeImportar = this.auth.can('insumos', 'insertar') && this.auth.can('precios-insumo', 'insertar');
  protected readonly columns = ['sel', 'producto', 'proveedor', 'unidad', 'ciudad', 'sinIva', 'conIva', 'vigencia'];
  protected readonly filtro = signal<CatalogoFiltro>({ proveedor: null, tipoInsumoId: null, ciudad: null });
  protected readonly list = new PagedList<ProductoCatalogo>((q) => this.api.buscarProductos(q, this.filtro()));
  protected readonly proveedores = signal<Proveedor[]>([]);
  protected readonly tipos = signal<TipoInsumo[]>([]);
  /** Precios elegidos; se conservan al cambiar de página o de búsqueda. */
  protected readonly seleccion = signal(new Set<number>());

  /** Una fila por precio vigente (un producto con precio en varias ciudades ocupa varias filas). */
  protected readonly filas = computed<FilaCatalogo[]>(() => this.list.items().flatMap((producto) => producto.precios.map((precio) => ({ producto, precio }))));
  protected readonly paginaCompleta = computed(() => this.filas().length > 0 && this.filas().every((f) => this.seleccion().has(f.precio.id)));
  protected readonly paginaParcial = computed(() => !this.paginaCompleta() && this.filas().some((f) => this.seleccion().has(f.precio.id)));

  ngOnInit(): void {
    void this.list.load();
    void this.loadFiltros();
  }

  protected setFiltro(partial: Partial<CatalogoFiltro>): void {
    const actual = this.filtro();
    if (Object.entries(partial).every(([k, v]) => actual[k as keyof CatalogoFiltro] === v)) return;
    this.filtro.set({ ...actual, ...partial });
    void this.list.setPage(1, this.list.pageSize());
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected marcar(precioId: number, incluir: boolean): void {
    this.seleccion.update((s) => {
      const nueva = new Set(s);
      if (incluir) nueva.add(precioId);
      else nueva.delete(precioId);
      return nueva;
    });
  }

  protected marcarPagina(incluir: boolean): void {
    this.seleccion.update((s) => {
      const nueva = new Set(s);
      for (const f of this.filas()) {
        if (incluir) nueva.add(f.precio.id);
        else nueva.delete(f.precio.id);
      }
      return nueva;
    });
  }

  protected limpiar(): void {
    this.seleccion.set(new Set());
  }

  protected async revisar(): Promise<void> {
    const resultado = await firstValueFrom(
      this.dialog
        .open<RevisionImportacionDialogComponent, number[], ResultadoImportacion>(RevisionImportacionDialogComponent, {
          data: [...this.seleccion()],
          width: '1100px',
          maxWidth: '96vw',
          disableClose: true,
        })
        .afterClosed(),
    );
    if (!resultado) return;
    const partes = [
      resultado.creados && `${resultado.creados} insumos nuevos`,
      resultado.actualizados && `${resultado.actualizados} precios actualizados`,
    ].filter(Boolean);
    this.snackBar.open(`Importado: ${partes.join(' y ') || 'sin cambios'}. Ya puedes usarlos en tus APU.`, 'Cerrar', { duration: 6000 });
    this.limpiar();
  }

  private async loadFiltros(): Promise<void> {
    const vacio = <T>(): Paged<T> => ({ items: [], page: 1, pageSize: 0, total: 0 });
    const result = await attempt(
      this.snackBar,
      forkJoin([
        this.api.listProveedores({ page: 1, pageSize: 100, search: '' }).pipe(catchError(() => of(vacio<Proveedor>()))),
        this.api.tipos().pipe(catchError(() => of(vacio<TipoInsumo>()))),
      ]),
    );
    if (!result.ok) return;
    this.proveedores.set(result.value[0].items);
    this.tipos.set(result.value[1].items);
  }
}
