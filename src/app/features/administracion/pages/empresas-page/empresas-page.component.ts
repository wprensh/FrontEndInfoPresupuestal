import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { PagedList } from '../../../../shared/data/paged-list';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { EmpresaFormDialogComponent, EmpresaFormResult } from '../../components/empresa-form-dialog/empresa-form-dialog.component';
import { AdminApiService } from '../../data-access/admin-api.service';
import { ADMIN_MATERIAL } from '../../material/admin-material';
import { Empresa } from '../../models/admin.model';

/** Empresas (tenants) de la plataforma. Solo para el superadministrador. */
@Component({
  selector: 'app-empresas-page',
  imports: [DatePipe, PageHeaderComponent, SearchBoxComponent, ...ADMIN_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header title="Empresas" subtitle="Cada empresa tiene sus propios usuarios, roles e insumos">
      <button mat-flat-button (click)="open(null)"><mat-icon>add_business</mat-icon>Nueva empresa</button>
    </app-page-header>
    <div class="toolbar">
      <app-search-box label="Buscar por razón social, NIT o identificador" [value]="list.search()" (search)="list.setSearch($event)" />
    </div>
    @if (list.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (list.loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    <div class="table-wrap">
      <table mat-table [dataSource]="list.items()">
        <ng-container matColumnDef="tenantId">
          <th mat-header-cell *matHeaderCellDef>Identificador</th>
          <td mat-cell *matCellDef="let e" class="code">{{ e.tenantId }}</td>
        </ng-container>
        <ng-container matColumnDef="razonSocial">
          <th mat-header-cell *matHeaderCellDef>Razón social</th>
          <td mat-cell *matCellDef="let e">{{ e.razonSocial }}</td>
        </ng-container>
        <ng-container matColumnDef="nit">
          <th mat-header-cell *matHeaderCellDef>NIT</th>
          <td mat-cell *matCellDef="let e">{{ e.nit }}</td>
        </ng-container>
        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let e"><mat-chip [highlighted]="e.activo">{{ e.activo ? 'Activa' : 'Inactiva' }}</mat-chip></td>
        </ng-container>
        <ng-container matColumnDef="creada">
          <th mat-header-cell *matHeaderCellDef>Creada</th>
          <td mat-cell *matCellDef="let e" class="muted">{{ e.creadoEn | date: 'mediumDate' }}</td>
        </ng-container>
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let e" class="actions-cell">
            @if (e.activo) {
              <button mat-icon-button matTooltip="Administrar esta empresa" (click)="actuar(e)"><mat-icon>login</mat-icon></button>
            }
            <button mat-icon-button matTooltip="Editar" (click)="open(e)"><mat-icon>edit</mat-icon></button>
            @if (e.activo && e.tenantId !== 'sistema') {
              <button mat-icon-button matTooltip="Desactivar" (click)="deactivate(e)"><mat-icon>block</mat-icon></button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" />
  `,
})
export class EmpresasPageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly columns = ['tenantId', 'razonSocial', 'nit', 'estado', 'creada', 'acciones'];
  protected readonly list = new PagedList<Empresa>((q) => this.api.listEmpresas(q));

  ngOnInit(): void {
    void this.list.load();
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  /** El superadministrador pasa a trabajar sobre la empresa elegida (header X-Tenant-Id). */
  protected actuar(empresa: Empresa): void {
    this.auth.setActingTenant(empresa.tenantId === this.auth.user()?.empresa ? null : empresa.tenantId);
    this.snackBar.open(`Trabajando sobre ${empresa.razonSocial}`, 'Cerrar', { duration: 3000 });
    void this.router.navigate(['/administracion/usuarios']);
  }

  protected async open(empresa: Empresa | null): Promise<void> {
    const result = await firstValueFrom(
      this.dialog.open<EmpresaFormDialogComponent, Empresa | null, EmpresaFormResult>(EmpresaFormDialogComponent, { data: empresa, width: '640px', maxWidth: '95vw' }).afterClosed(),
    );
    if (!result) return;
    const saved =
      result.tipo === 'crear'
        ? await attempt(this.snackBar, this.api.createEmpresa(result.dto), 'Empresa creada con sus roles y su administrador')
        : await attempt(this.snackBar, this.api.updateEmpresa(empresa!.id, result.dto), 'Empresa actualizada');
    if (saved.ok) void this.list.load();
  }

  protected async deactivate(empresa: Empresa): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: {
            title: 'Desactivar empresa',
            message: `¿Desactivar ${empresa.razonSocial}? Sus usuarios no podrán iniciar sesión. Sus datos se conservan y puedes reactivarla.`,
            confirmText: 'Desactivar',
          },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.deactivateEmpresa(empresa.id), 'Empresa desactivada')).ok) void this.list.load();
  }
}
