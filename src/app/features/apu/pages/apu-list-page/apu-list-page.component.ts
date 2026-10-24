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
import { ApuApiService } from '../../data-access/apu-api.service';
import { APU_MATERIAL } from '../../material/apu-material';
import { APU_CURRENCY, ApuResumen } from '../../models/apu.model';

/** Mantenimiento de APU: búsqueda, costo directo por sección y acciones según permisos. */
@Component({
  selector: 'app-apu-list-page',
  imports: [CurrencyPipe, DatePipe, RouterLink, PageHeaderComponent, SearchBoxComponent, IfCanDirective, ...APU_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <section class="page">
      <app-page-header title="Análisis de precios unitarios" [subtitle]="list.total() + ' APU'">
        <a mat-flat-button *appIfCan="['apu', 'insertar']" routerLink="nuevo"><mat-icon>add</mat-icon>Nuevo APU</a>
      </app-page-header>

      <div class="toolbar">
        <app-search-box label="Buscar por descripción o código" [value]="list.search()" (search)="list.setSearch($event)" />
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Estado</mat-label>
          <mat-select [value]="activo()" (valueChange)="setActivo($event)">
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
            <td mat-cell *matCellDef="let a" class="code">{{ a.codigo }}</td>
          </ng-container>
          <ng-container matColumnDef="descripcion">
            <th mat-header-cell *matHeaderCellDef>Actividad</th>
            <td mat-cell *matCellDef="let a" [class.inactivo]="!a.activo">
              <a [routerLink]="a.id" class="link">{{ a.descripcion }}</a>
              @if (!a.activo) {
                <span class="muted">(inactivo)</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="unidad">
            <th mat-header-cell *matHeaderCellDef>Unidad</th>
            <td mat-cell *matCellDef="let a">{{ a.unidad }}</td>
          </ng-container>
          <ng-container matColumnDef="materiales">
            <th mat-header-cell *matHeaderCellDef class="num">Materiales</th>
            <td mat-cell *matCellDef="let a" class="num muted-num">{{ a.costos.materiales | currency: moneda : 'symbol-narrow' : '1.0-0' }}</td>
          </ng-container>
          <ng-container matColumnDef="manoObra">
            <th mat-header-cell *matHeaderCellDef class="num">Mano de obra</th>
            <td mat-cell *matCellDef="let a" class="num muted-num">{{ a.costos.manoObra | currency: moneda : 'symbol-narrow' : '1.0-0' }}</td>
          </ng-container>
          <ng-container matColumnDef="equipo">
            <th mat-header-cell *matHeaderCellDef class="num">Equipo</th>
            <td mat-cell *matCellDef="let a" class="num muted-num">{{ a.costos.equipo | currency: moneda : 'symbol-narrow' : '1.0-0' }}</td>
          </ng-container>
          <ng-container matColumnDef="costo">
            <th mat-header-cell *matHeaderCellDef class="num">Costo directo</th>
            <td mat-cell *matCellDef="let a" class="num"><strong>{{ a.costos.costoDirecto | currency: moneda : 'symbol-narrow' : '1.0-2' }}</strong></td>
          </ng-container>
          <ng-container matColumnDef="fecha">
            <th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let a" class="muted">{{ a.fecha | date: 'dd/MM/yyyy' }}</td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let a" class="actions-cell">
              <a mat-icon-button [routerLink]="a.id" matTooltip="Abrir"><mat-icon>edit</mat-icon></a>
              <button mat-icon-button matTooltip="Duplicar" *appIfCan="['apu', 'insertar']" (click)="duplicar(a)"><mat-icon>content_copy</mat-icon></button>
              <button mat-icon-button matTooltip="Eliminar" *appIfCan="['apu', 'eliminar']" (click)="remove(a)"><mat-icon>delete</mat-icon></button>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        @if (!list.loading() && list.items().length === 0) {
          <p class="empty">No hay APU que coincidan.</p>
        }
      </div>
      <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)" />
    </section>
  `,
  styles: `
    .page { padding: 24px; max-width: 1440px; margin: 0 auto; }
    .toolbar mat-form-field { width: 180px; }
    .inactivo { opacity: 0.6; }
    .link { color: inherit; text-decoration: none; font-weight: 500; }
    .link:hover { text-decoration: underline; }
    .muted-num { opacity: 0.75; }
    @media (max-width: 700px) { .page { padding: 16px; } }
  `,
})
export class ApuListPageComponent implements OnInit {
  private readonly api = inject(ApuApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly moneda = APU_CURRENCY;
  protected readonly columns = ['codigo', 'descripcion', 'unidad', 'materiales', 'manoObra', 'equipo', 'costo', 'fecha', 'acciones'];
  protected readonly activo = signal<boolean | null>(null);
  protected readonly list = new PagedList<ApuResumen>((q) => this.api.list(q, this.activo()));

  ngOnInit(): void {
    void this.list.load();
  }

  protected setActivo(activo: boolean | null): void {
    this.activo.set(activo);
    void this.list.setPage(1, this.list.pageSize());
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async duplicar(apu: ApuResumen): Promise<void> {
    const result = await attempt(this.snackBar, this.api.duplicar(apu.id), `Copia de ${apu.codigo} creada`);
    if (result.ok) void this.router.navigate(['/apu', result.value.id]);
  }

  protected async remove(apu: ApuResumen): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            title: 'Eliminar APU',
            message: `¿Eliminar ${apu.codigo} · ${apu.descripcion}? Si se usa en algún presupuesto no se puede eliminar; en ese caso desactívalo.`,
            confirmText: 'Eliminar',
          },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.delete(apu.id), 'APU eliminado')).ok) void this.list.load();
  }
}
