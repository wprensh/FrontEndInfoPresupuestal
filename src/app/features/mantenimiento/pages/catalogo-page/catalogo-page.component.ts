import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { PagedList } from '../../../../shared/data/paged-list';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { CatalogoFormData, CatalogoFormDialogComponent } from '../../components/catalogo-form-dialog/catalogo-form-dialog.component';
import { MantenimientoApiService } from '../../data-access/mantenimiento-api.service';
import { MANTENIMIENTO_MATERIAL } from '../../material/mantenimiento-material';
import { CatalogoConfig, CatalogoItem } from '../../models/mantenimiento.model';

/**
 * Pantalla genérica de un catálogo simple (clasificaciones, unidades, tipos).
 * La configuración llega por `data.config` de la ruta.
 */
@Component({
  selector: 'app-catalogo-page',
  imports: [PageHeaderComponent, SearchBoxComponent, ...MANTENIMIENTO_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header [title]="config().titulo" [subtitle]="config().subtitulo">
      @if (puede().insertar) {
        <button mat-flat-button (click)="open(null)"><mat-icon>add</mat-icon>Nueva {{ config().singular }}</button>
      }
    </app-page-header>
    <div class="toolbar">
      <app-search-box [label]="'Buscar ' + config().singular" [value]="list.search()" (search)="list.setSearch($event)" />
    </div>
    @if (list.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (list.loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    <div class="table-wrap">
      <table mat-table [dataSource]="list.items()">
        @for (col of config().columnas; track col.key) {
          <ng-container [matColumnDef]="col.key">
            <th mat-header-cell *matHeaderCellDef [class.num]="col.tipo === 'numero'">{{ col.label }}</th>
            <td mat-cell *matCellDef="let row" [class.num]="col.tipo === 'numero'" [class.code]="col.tipo === 'codigo'">
              @if (col.tipo === 'activo') {
                <mat-chip [highlighted]="row[col.key]">{{ row[col.key] ? 'Activa' : 'Inactiva' }}</mat-chip>
              } @else {
                {{ row[col.key] }}
              }
            </td>
          </ng-container>
        }
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let row" class="actions-cell">
            @if (puede().editar) {
              <button mat-icon-button matTooltip="Editar" (click)="open(row)"><mat-icon>edit</mat-icon></button>
            }
            @if (puede().eliminar) {
              <button mat-icon-button matTooltip="Eliminar" (click)="remove(row)"><mat-icon>delete</mat-icon></button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns()"></tr>
        <tr mat-row *matRowDef="let row; columns: columns()"></tr>
      </table>
      @if (!list.loading() && list.items().length === 0) {
        <p class="empty">No hay registros que coincidan.</p>
      }
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[10, 20, 50, 100]" (page)="onPage($event)" />
  `,
})
export class CatalogoPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(MantenimientoApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Llega de `data` de la ruta gracias a `withComponentInputBinding`. */
  readonly config = input.required<CatalogoConfig>();

  protected readonly puede = computed(() => {
    const m = this.config().modulo;
    return { insertar: this.auth.can(m, 'insertar'), editar: this.auth.can(m, 'editar'), eliminar: this.auth.can(m, 'eliminar') };
  });
  protected readonly columns = computed(() => [...this.config().columnas.map((c) => c.key), 'acciones']);
  protected readonly list = new PagedList<CatalogoItem>((q) => this.api.listCatalogo(this.config().endpoint, q));

  ngOnInit(): void {
    void this.list.load();
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async open(item: CatalogoItem | null): Promise<void> {
    const config = this.config();
    const dto = await firstValueFrom(
      this.dialog
        .open<CatalogoFormDialogComponent, CatalogoFormData, Record<string, unknown>>(CatalogoFormDialogComponent, { data: { config, item } })
        .afterClosed(),
    );
    if (!dto) return;
    const saved = item
      ? await attempt(this.snackBar, this.api.updateCatalogo(config.endpoint, item.id, dto), 'Cambios guardados')
      : await attempt(this.snackBar, this.api.createCatalogo(config.endpoint, dto), 'Registro creado');
    if (saved.ok) void this.list.load();
  }

  protected async remove(item: CatalogoItem): Promise<void> {
    const config = this.config();
    const nombre = String(item['nombre'] ?? item['codigo'] ?? item.id);
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: { title: `Eliminar ${config.singular}`, message: `¿Eliminar "${nombre}"? Si algún insumo la usa, no se podrá eliminar.`, confirmText: 'Eliminar' },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.deleteCatalogo(config.endpoint, item.id), 'Registro eliminado')).ok) void this.list.load();
  }
}
