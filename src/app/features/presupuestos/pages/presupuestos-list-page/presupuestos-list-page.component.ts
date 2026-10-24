import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { IfCanDirective } from '../../../../core/auth/if-can.directive';
import { attempt } from '../../../../shared/data/attempt';
import { PagedList } from '../../../../shared/data/paged-list';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { PresupuestosApiService } from '../../data-access/presupuestos-api.service';
import { PRESUPUESTOS_MATERIAL } from '../../material/presupuestos-material';
import { ESTADO_LABELS, EstadoPresupuesto, PRESUPUESTO_CURRENCY, PresupuestoResumen } from '../../models/presupuesto.model';

/** Mantenimiento de presupuestos de obra: búsqueda, estado, totales y acciones según permisos. */
@Component({
  selector: 'app-presupuestos-list-page',
  imports: [CurrencyPipe, DatePipe, RouterLink, PageHeaderComponent, SearchBoxComponent, IfCanDirective, ...PRESUPUESTOS_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <section class="page">
      <app-page-header title="Presupuestos de obra" [subtitle]="list.total() + ' presupuestos'">
        <a mat-flat-button *appIfCan="['presupuestos', 'insertar']" routerLink="nuevo"><mat-icon>add</mat-icon>Nuevo presupuesto</a>
      </app-page-header>

      <div class="toolbar">
        <app-search-box label="Buscar por obra, cliente o código" [value]="list.search()" (search)="list.setSearch($event)" />
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Estado</mat-label>
          <mat-select [value]="estado()" (valueChange)="setEstado($event)">
            <mat-option [value]="null">Todos</mat-option>
            @for (e of estados; track e) {
              <mat-option [value]="e">{{ label(e) }}</mat-option>
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
            <td mat-cell *matCellDef="let p" class="code">{{ p.codigo }}</td>
          </ng-container>
          <ng-container matColumnDef="obra">
            <th mat-header-cell *matHeaderCellDef>Obra</th>
            <td mat-cell *matCellDef="let p">
              <a [routerLink]="p.id" class="link">{{ p.nombreObra }}</a>
              @if (p.cliente) {
                <div class="muted">{{ p.cliente }}</div>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="fecha">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let p">{{ p.fecha | date: 'dd/MM/yyyy' }}</td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let p"><span class="estado" [attr.data-estado]="p.estado">{{ label(p.estado) }}</span></td>
          </ng-container>
          <ng-container matColumnDef="items">
            <th mat-header-cell *matHeaderCellDef class="num">Ítems</th>
            <td mat-cell *matCellDef="let p" class="num">{{ p.items }} <span class="muted">en {{ p.capitulos }} cap.</span></td>
          </ng-container>
          <ng-container matColumnDef="costo">
            <th mat-header-cell *matHeaderCellDef class="num">Costo directo</th>
            <td mat-cell *matCellDef="let p" class="num">{{ p.costoDirecto | currency: moneda : 'symbol-narrow' : '1.0-0' }}</td>
          </ng-container>
          <ng-container matColumnDef="total">
            <th mat-header-cell *matHeaderCellDef class="num">Valor total</th>
            <td mat-cell *matCellDef="let p" class="num"><strong>{{ p.valorTotal | currency: moneda : 'symbol-narrow' : '1.0-0' }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p" class="actions-cell">
              <a mat-icon-button [routerLink]="p.id" matTooltip="Abrir"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button matTooltip="Duplicar" *appIfCan="['presupuestos', 'insertar']" (click)="duplicar(p)"><mat-icon>content_copy</mat-icon></button>
              <button mat-icon-button matTooltip="Eliminar" *appIfCan="['presupuestos', 'eliminar']" [disabled]="p.estado === 'APROBADO'" (click)="remove(p)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        @if (!list.loading() && list.items().length === 0) {
          <p class="empty">No hay presupuestos que coincidan.</p>
        }
      </div>
      <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)" />
    </section>
  `,
  styles: `
    .page { padding: 24px; max-width: 1440px; margin: 0 auto; }
    .toolbar mat-form-field { width: 180px; }
    .link { color: inherit; text-decoration: none; font-weight: 500; }
    .link:hover { text-decoration: underline; }
    .estado { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; background: var(--mat-sys-surface-container-high); }
    .estado[data-estado='APROBADO'] { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .estado[data-estado='ANULADO'] { background: var(--mat-sys-error-container); color: var(--mat-sys-on-error-container); }
    @media (max-width: 700px) { .page { padding: 16px; } }
  `,
})
export class PresupuestosListPageComponent implements OnInit {
  private readonly api = inject(PresupuestosApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly moneda = PRESUPUESTO_CURRENCY;
  protected readonly label = (e: EstadoPresupuesto) => ESTADO_LABELS[e];
  protected readonly estados = Object.keys(ESTADO_LABELS) as EstadoPresupuesto[];
  protected readonly columns = ['codigo', 'obra', 'fecha', 'estado', 'items', 'costo', 'total', 'acciones'];
  protected readonly estado = signal<EstadoPresupuesto | null>(null);
  protected readonly list = new PagedList<PresupuestoResumen>((q) => this.api.list(q, this.estado()));

  ngOnInit(): void {
    void this.list.load();
  }

  protected setEstado(estado: EstadoPresupuesto | null): void {
    this.estado.set(estado);
    void this.list.setPage(1, this.list.pageSize());
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async duplicar(p: PresupuestoResumen): Promise<void> {
    const result = await attempt(this.snackBar, this.api.duplicar(p.id), `Copia de ${p.codigo} creada`);
    if (result.ok) void this.router.navigate(['/presupuestos', result.value.id]);
  }

  protected async remove(p: PresupuestoResumen): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: { title: 'Eliminar presupuesto', message: `¿Eliminar ${p.codigo} · ${p.nombreObra} con todos sus capítulos e ítems?`, confirmText: 'Eliminar' },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.delete(p.id), 'Presupuesto eliminado')).ok) void this.list.load();
  }
}
