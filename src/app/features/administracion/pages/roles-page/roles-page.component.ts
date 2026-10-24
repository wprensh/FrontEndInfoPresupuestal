import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PageEvent } from '@angular/material/paginator';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { IfCanDirective } from '../../../../core/auth/if-can.directive';
import { attempt } from '../../../../shared/data/attempt';
import { PagedList } from '../../../../shared/data/paged-list';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { RolFormData, RolFormDialogComponent } from '../../components/rol-form-dialog/rol-form-dialog.component';
import { AdminApiService } from '../../data-access/admin-api.service';
import { ADMIN_MATERIAL } from '../../material/admin-material';
import { ModuloInfo, Rol, RolDto, RolResumen } from '../../models/admin.model';

/** Roles de la empresa (tipos de usuario) con su matriz Ver / Insertar / Editar / Eliminar. */
@Component({
  selector: 'app-roles-page',
  imports: [PageHeaderComponent, SearchBoxComponent, IfCanDirective, ...ADMIN_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header title="Roles y permisos" subtitle="Cada rol define qué puede ver, insertar, editar y eliminar en cada módulo">
      <button mat-flat-button *appIfCan="['roles', 'insertar']" (click)="open(null)"><mat-icon>add</mat-icon>Nuevo rol</button>
    </app-page-header>
    <div class="toolbar">
      <app-search-box label="Buscar rol" [value]="list.search()" (search)="list.setSearch($event)" />
    </div>
    @if (list.error(); as error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (list.loading()) {
      <mat-progress-bar mode="indeterminate" />
    }
    <div class="table-wrap">
      <table mat-table [dataSource]="list.items()">
        <ng-container matColumnDef="nombre">
          <th mat-header-cell *matHeaderCellDef>Rol</th>
          <td mat-cell *matCellDef="let r">
            {{ r.nombre }}
            @if (r.esSistema) {
              <mat-icon class="lock" matTooltip="Rol del sistema">lock</mat-icon>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="descripcion">
          <th mat-header-cell *matHeaderCellDef>Descripción</th>
          <td mat-cell *matCellDef="let r" class="muted">{{ r.descripcion }}</td>
        </ng-container>
        <ng-container matColumnDef="usuarios">
          <th mat-header-cell *matHeaderCellDef class="num">Usuarios</th>
          <td mat-cell *matCellDef="let r" class="num">{{ r.usuarios }}</td>
        </ng-container>
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let r" class="actions-cell">
            <button mat-icon-button [matTooltip]="r.esSistema || !auth.can('roles', 'editar') ? 'Ver permisos' : 'Editar'" (click)="open(r)">
              <mat-icon>{{ r.esSistema || !auth.can('roles', 'editar') ? 'visibility' : 'edit' }}</mat-icon>
            </button>
            @if (!r.esSistema) {
              <button mat-icon-button matTooltip="Eliminar" *appIfCan="['roles', 'eliminar']" (click)="remove(r)"><mat-icon>delete</mat-icon></button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" />
    <p class="muted">Los cambios de permisos aplican cuando el usuario vuelve a iniciar sesión.</p>
  `,
  styles: `.lock { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; opacity: 0.6; }`,
})
export class RolesPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['nombre', 'descripcion', 'usuarios', 'acciones'];
  protected readonly list = new PagedList<RolResumen>((q) => this.api.listRoles(q));
  private readonly modulos = signal<ModuloInfo[]>([]);

  ngOnInit(): void {
    void this.list.load();
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async open(resumen: RolResumen | null): Promise<void> {
    if (this.modulos().length === 0) {
      const modulos = await attempt(this.snackBar, this.api.listModulos());
      if (!modulos.ok) return;
      this.modulos.set(modulos.value);
    }

    let rol: Rol | null = null;
    if (resumen) {
      const loaded = await attempt(this.snackBar, this.api.getRol(resumen.id));
      if (!loaded.ok) return;
      rol = loaded.value;
    }

    const soloLectura = !!rol && (rol.esSistema || !this.auth.can('roles', 'editar'));
    const dto = await firstValueFrom(
      this.dialog
        .open<RolFormDialogComponent, RolFormData, RolDto>(RolFormDialogComponent, { data: { rol, modulos: this.modulos(), soloLectura }, width: '760px', maxWidth: '95vw' })
        .afterClosed(),
    );
    if (!dto) return;

    const saved = rol
      ? await attempt(this.snackBar, this.api.updateRol(rol.id, dto), 'Rol actualizado')
      : await attempt(this.snackBar, this.api.createRol(dto), 'Rol creado');
    if (saved.ok) void this.list.load();
  }

  protected async remove(rol: RolResumen): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: { title: 'Eliminar rol', message: `¿Eliminar el rol ${rol.nombre}?`, confirmText: 'Eliminar' },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.deleteRol(rol.id), 'Rol eliminado')).ok) void this.list.load();
  }
}
