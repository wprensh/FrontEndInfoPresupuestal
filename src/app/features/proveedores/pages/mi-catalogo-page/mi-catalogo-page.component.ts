import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { firstValueFrom, forkJoin } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { IfCanDirective } from '../../../../core/auth/if-can.directive';
import { attempt } from '../../../../shared/data/attempt';
import { PagedList } from '../../../../shared/data/paged-list';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { TipoInsumo, UnidadMedida } from '../../../mantenimiento/models/mantenimiento.model';
import { ListaPreciosDialogComponent } from '../../components/lista-precios-dialog/lista-precios-dialog.component';
import { ProductoFormData, ProductoFormDialogComponent } from '../../components/producto-form-dialog/producto-form-dialog.component';
import { ProveedoresApiService } from '../../data-access/proveedores-api.service';
import { PROVEEDORES_MATERIAL } from '../../material/proveedores-material';
import { ProductoFiltro, ProductoProveedor, ProductoProveedorDto, ciudadLabel } from '../../models/proveedores.model';

/** Catálogo propio del proveedor: sus productos y el precio vigente en cada ciudad, visibles para todas las constructoras. */
@Component({
  selector: 'app-mi-catalogo-page',
  imports: [CurrencyPipe, PageHeaderComponent, SearchBoxComponent, IfCanDirective, ...PROVEEDORES_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header title="Mi catálogo" [subtitle]="list.total() + ' productos · las constructoras ven tus precios vigentes'">
      <button mat-flat-button *appIfCan="['catalogo-proveedor', 'insertar']" (click)="open(null)"><mat-icon>add</mat-icon>Nuevo producto</button>
    </app-page-header>

    <div class="toolbar">
      <app-search-box label="Buscar por descripción, código o marca" [value]="list.search()" (search)="list.setSearch($event)" />
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
        <mat-label>Estado</mat-label>
        <mat-select [value]="filtro().activo" (valueChange)="setFiltro({ activo: $event })">
          <mat-option [value]="null">Todos</mat-option>
          <mat-option [value]="true">Activos</mat-option>
          <mat-option [value]="false">Inactivos</mat-option>
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
          <td mat-cell *matCellDef="let p" class="code">{{ p.codigo }}</td>
        </ng-container>
        <ng-container matColumnDef="descripcion">
          <th mat-header-cell *matHeaderCellDef>Descripción</th>
          <td mat-cell *matCellDef="let p" [class.inactivo]="!p.activo">
            {{ p.descripcion }}
            @if (p.marca) {
              <span class="muted">· {{ p.marca }}</span>
            }
            @if (!p.activo) {
              <span class="muted">(inactivo)</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="unidad">
          <th mat-header-cell *matHeaderCellDef>Unidad</th>
          <td mat-cell *matCellDef="let p">{{ p.unidad }}</td>
        </ng-container>
        <ng-container matColumnDef="categoria">
          <th mat-header-cell *matHeaderCellDef>Categoría</th>
          <td mat-cell *matCellDef="let p" class="muted">{{ p.categoria ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="precios">
          <th mat-header-cell *matHeaderCellDef>Precio vigente (sin IVA · con IVA)</th>
          <td mat-cell *matCellDef="let p">
            @for (precio of p.precios; track precio.id) {
              <div class="precio">
                <span class="ciudad">{{ ciudadLabel(precio.ciudad) }}</span>
                <span class="num">{{ precio.valorSinIva | currency: precio.moneda : 'symbol-narrow' : '1.0-2' }}</span>
                <span class="num muted">{{ precio.valorConIva | currency: precio.moneda : 'symbol-narrow' : '1.0-2' }}</span>
              </div>
            } @empty {
              <span class="muted">Sin precio</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let p" class="actions-cell">
            <button mat-icon-button matTooltip="Lista de precios" (click)="precios(p)"><mat-icon>price_change</mat-icon></button>
            <button mat-icon-button matTooltip="Editar" *appIfCan="['catalogo-proveedor', 'editar']" (click)="open(p)"><mat-icon>edit</mat-icon></button>
            <button mat-icon-button matTooltip="Eliminar" *appIfCan="['catalogo-proveedor', 'eliminar']" (click)="remove(p)"><mat-icon>delete</mat-icon></button>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (!list.loading() && list.items().length === 0) {
        <p class="empty">{{ list.search() ? 'No hay productos que coincidan.' : 'Todavía no tienes productos. Crea el primero con “Nuevo producto”.' }}</p>
      }
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)" />
  `,
  styles: `
    :host { display: block; padding: 16px 20px; max-width: 1440px; margin: 0 auto; }
    .toolbar mat-form-field { width: 180px; }
    .inactivo { opacity: 0.6; }
    .precio { display: grid; grid-template-columns: minmax(80px, auto) 96px 96px; gap: 8px; font-size: 13px; line-height: 20px; }
    .precio .ciudad { font-weight: 500; }
    .precio .num { text-align: right; font-variant-numeric: tabular-nums; }
  `,
})
export class MiCatalogoPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(ProveedoresApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly ciudadLabel = ciudadLabel;
  protected readonly columns = ['codigo', 'descripcion', 'unidad', 'categoria', 'precios', 'acciones'];
  protected readonly filtro = signal<ProductoFiltro>({ tipoInsumoId: null, activo: null });
  protected readonly list = new PagedList<ProductoProveedor>((q) => this.api.listProductos(q, this.filtro()));

  protected readonly tipos = signal<TipoInsumo[]>([]);
  private readonly unidades = signal<UnidadMedida[]>([]);

  ngOnInit(): void {
    void this.list.load();
    void this.loadCatalogos();
  }

  protected setFiltro(partial: Partial<ProductoFiltro>): void {
    this.filtro.update((f) => ({ ...f, ...partial }));
    void this.list.setPage(1, this.list.pageSize());
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async open(producto: ProductoProveedor | null): Promise<void> {
    if (this.unidades().length === 0 && !(await this.loadCatalogos())) return;
    const dto = await firstValueFrom(
      this.dialog
        .open<ProductoFormDialogComponent, ProductoFormData, ProductoProveedorDto>(ProductoFormDialogComponent, {
          data: { producto, tipos: this.tipos(), unidades: this.unidades() },
        })
        .afterClosed(),
    );
    if (!dto) return;
    const saved = producto
      ? await attempt(this.snackBar, this.api.updateProducto(producto.id, dto), 'Producto actualizado')
      : await attempt(this.snackBar, this.api.createProducto(dto), 'Producto creado');
    if (saved.ok) {
      void this.list.load();
      // Un producto nuevo sin precio no le sirve a nadie: se abre de una vez su lista de precios.
      if (!producto && this.auth.can('catalogo-proveedor', 'insertar')) await this.precios(saved.value);
    }
  }

  protected async precios(producto: ProductoProveedor): Promise<void> {
    const changed = await firstValueFrom(
      this.dialog
        .open<ListaPreciosDialogComponent, ProductoProveedor, boolean>(ListaPreciosDialogComponent, { data: producto, width: '820px', maxWidth: '95vw', disableClose: true })
        .afterClosed(),
    );
    if (changed) void this.list.load();
  }

  protected async remove(producto: ProductoProveedor): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            title: 'Eliminar producto',
            message: `¿Eliminar ${producto.codigo} · ${producto.descripcion}? También se borra su lista de precios. Para dejar de ofrecerlo sin perder el historial, desactívalo.`,
            confirmText: 'Eliminar',
          },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.deleteProducto(producto.id), 'Producto eliminado')).ok) void this.list.load();
  }

  private async loadCatalogos(): Promise<boolean> {
    const result = await attempt(this.snackBar, forkJoin([this.api.tipos(), this.api.unidades()]));
    if (!result.ok) return false;
    const [tipos, unidades] = result.value;
    this.tipos.set(tipos.items);
    this.unidades.set(unidades.items);
    return true;
  }
}
