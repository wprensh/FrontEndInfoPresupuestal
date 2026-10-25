import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { firstValueFrom } from 'rxjs';

import { IfCanDirective } from '../../../../core/auth/if-can.directive';
import { attempt } from '../../../../shared/data/attempt';
import { PagedList } from '../../../../shared/data/paged-list';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import {
  EmpresaFormData,
  EmpresaFormDialogComponent,
  EmpresaFormResult,
} from '../../../administracion/components/empresa-form-dialog/empresa-form-dialog.component';
import { ProveedoresApiService } from '../../data-access/proveedores-api.service';
import { PROVEEDORES_MATERIAL } from '../../material/proveedores-material';
import { Proveedor } from '../../models/proveedores.model';

/**
 * Directorio de proveedores para la constructora. Las listas de precios son públicas para todas
 * las constructoras; el administrador puede dar de alta un proveedor con su primer usuario.
 */
@Component({
  selector: 'app-directorio-page',
  imports: [DatePipe, PageHeaderComponent, SearchBoxComponent, IfCanDirective, ...PROVEEDORES_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header title="Proveedores" [subtitle]="list.total() === 1 ? '1 proveedor publica su catálogo y precios' : list.total() + ' proveedores publican su catálogo y precios'">
      <button mat-flat-button *appIfCan="['proveedores', 'insertar']" (click)="create()"><mat-icon>add_business</mat-icon>Nuevo proveedor</button>
    </app-page-header>
    <div class="toolbar">
      <app-search-box label="Buscar por razón social o NIT" [value]="list.search()" (search)="list.setSearch($event)" />
    </div>
    @if (list.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (list.loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    <div class="table-wrap">
      <table mat-table [dataSource]="list.items()">
        <ng-container matColumnDef="razonSocial">
          <th mat-header-cell *matHeaderCellDef>Proveedor</th>
          <td mat-cell *matCellDef="let p">
            {{ p.razonSocial }}
            <span class="muted code">{{ p.tenantId }}</span>
          </td>
        </ng-container>
        <ng-container matColumnDef="nit">
          <th mat-header-cell *matHeaderCellDef>NIT</th>
          <td mat-cell *matCellDef="let p">{{ p.nit ?? '—' }}</td>
        </ng-container>
        <ng-container matColumnDef="contacto">
          <th mat-header-cell *matHeaderCellDef>Contacto</th>
          <td mat-cell *matCellDef="let p" class="muted">{{ contacto(p) }}</td>
        </ng-container>
        <ng-container matColumnDef="productos">
          <th mat-header-cell *matHeaderCellDef class="num">Productos</th>
          <td mat-cell *matCellDef="let p" class="num">{{ p.productos }}</td>
        </ng-container>
        <ng-container matColumnDef="creado">
          <th mat-header-cell *matHeaderCellDef>Desde</th>
          <td mat-cell *matCellDef="let p" class="muted">{{ p.creadoEn | date: 'mediumDate' }}</td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns; sticky: true"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (!list.loading() && list.items().length === 0) {
        <p class="empty">{{ list.search() ? 'No hay proveedores que coincidan.' : 'Aún no hay proveedores registrados.' }}</p>
      }
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[20, 50, 100]" (page)="onPage($event)" />
  `,
  styles: `:host { display: block; padding: 16px 20px; max-width: 1440px; margin: 0 auto; } .code { margin-left: 6px; font-size: 12px; } .num { text-align: right; font-variant-numeric: tabular-nums; }`,
})
export class DirectorioPageComponent implements OnInit {
  private readonly api = inject(ProveedoresApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['razonSocial', 'nit', 'contacto', 'productos', 'creado'];
  protected readonly list = new PagedList<Proveedor>((q) => this.api.listProveedores(q));

  ngOnInit(): void {
    void this.list.load();
  }

  protected contacto(p: Proveedor): string {
    return [p.email, p.telefono].filter((x) => !!x).join(' · ') || '—';
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async create(): Promise<void> {
    const result = await firstValueFrom(
      this.dialog
        .open<EmpresaFormDialogComponent, EmpresaFormData, EmpresaFormResult>(EmpresaFormDialogComponent, {
          data: { empresa: null, tipo: 'PROVEEDOR' },
          width: '640px',
          maxWidth: '95vw',
        })
        .afterClosed(),
    );
    if (result?.tipo !== 'crear') return;
    const { tipo: _tipo, ...dto } = result.dto;
    const saved = await attempt(this.snackBar, this.api.createProveedor(dto), 'Proveedor creado: ya puede iniciar sesión y cargar su catálogo');
    if (saved.ok) void this.list.load();
  }
}
