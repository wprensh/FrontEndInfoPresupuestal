import { DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { RouterLink } from '@angular/router';

import { PagedList } from '../../../../shared/data/paged-list';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { ProgramacionApiService } from '../../data-access/programacion-api.service';
import { PROGRAMACION_MATERIAL } from '../../material/programacion-material';
import { ProgramacionResumen } from '../../models/programacion.model';

/** Obras con su programación: fechas, actividades y avance ponderado. */
@Component({
  selector: 'app-programacion-list-page',
  imports: [DatePipe, PercentPipe, RouterLink, PageHeaderComponent, SearchBoxComponent, ...PROGRAMACION_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <section class="page">
      <app-page-header title="Programación de obra" subtitle="Diagrama de Gantt de cada presupuesto: actividades, dependencias, ruta crítica y avance" />

      <div class="toolbar">
        <app-search-box label="Buscar por obra, cliente o código" [value]="list.search()" (search)="list.setSearch($event)" />
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
              <a [routerLink]="p.presupuestoId" class="link">{{ p.nombreObra }}</a>
              @if (p.cliente) {
                <div class="muted">{{ p.cliente }}</div>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Programación</th>
            <td mat-cell *matCellDef="let p">
              <span class="chip" [class.si]="p.existe">{{ p.existe ? 'Programada' : 'Sin programar' }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="fechas">
            <th mat-header-cell *matHeaderCellDef>Inicio – fin</th>
            <td mat-cell *matCellDef="let p">
              @if (p.fechaInicio) {
                {{ p.fechaInicio | date: 'dd/MM/yyyy' : 'UTC' }} – {{ p.fechaFin ? (p.fechaFin | date: 'dd/MM/yyyy' : 'UTC') : '…' }}
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="actividades">
            <th mat-header-cell *matHeaderCellDef class="num">Actividades</th>
            <td mat-cell *matCellDef="let p" class="num">{{ p.existe ? p.actividades : '' }}</td>
          </ng-container>
          <ng-container matColumnDef="avance">
            <th mat-header-cell *matHeaderCellDef>Avance</th>
            <td mat-cell *matCellDef="let p" class="avance">
              @if (p.avance !== null) {
                <mat-progress-bar mode="determinate" [value]="p.avance * 100" />
                <span>{{ p.avance | percent: '1.0-1' }}</span>
              }
            </td>
          </ng-container>
          <ng-container matColumnDef="acciones">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let p" class="actions-cell">
              <a mat-icon-button [routerLink]="p.presupuestoId" matTooltip="Abrir diagrama"><mat-icon>view_timeline</mat-icon></a>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
          <tr mat-row *matRowDef="let row; columns: columns"></tr>
        </table>
        @if (!list.loading() && list.items().length === 0) {
          <p class="empty">No hay presupuestos para programar. Crea uno en Presupuestos.</p>
        }
      </div>
      <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)" />
    </section>
  `,
  styles: `
    .page { padding: 16px 20px; max-width: 1440px; margin: 0 auto; }
    .link { color: inherit; text-decoration: none; font-weight: 500; }
    .link:hover { text-decoration: underline; }
    .chip { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; background: var(--mat-sys-surface-container-high); }
    .chip.si { background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .avance { min-width: 140px; }
    .avance mat-progress-bar { display: inline-block; width: 80px; vertical-align: middle; margin-right: 8px; }
  `,
})
export class ProgramacionListPageComponent implements OnInit {
  private readonly api = inject(ProgramacionApiService);

  protected readonly columns = ['codigo', 'obra', 'estado', 'fechas', 'actividades', 'avance', 'acciones'];
  protected readonly list = new PagedList<ProgramacionResumen>((q) => this.api.list(q));

  ngOnInit(): void {
    void this.list.load();
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }
}
