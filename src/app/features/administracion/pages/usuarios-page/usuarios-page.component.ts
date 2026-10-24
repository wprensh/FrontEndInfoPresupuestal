import { DatePipe } from '@angular/common';
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
import { PasswordDialogComponent } from '../../components/password-dialog/password-dialog.component';
import { UsuarioFormData, UsuarioFormDialogComponent, UsuarioFormResult } from '../../components/usuario-form-dialog/usuario-form-dialog.component';
import { AdminApiService } from '../../data-access/admin-api.service';
import { ADMIN_MATERIAL } from '../../material/admin-material';
import { RolResumen, Usuario } from '../../models/admin.model';

/** Usuarios de la empresa actual. Los botones aparecen según los permisos del rol. */
@Component({
  selector: 'app-usuarios-page',
  imports: [DatePipe, PageHeaderComponent, SearchBoxComponent, IfCanDirective, ...ADMIN_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../../../../shared/ui/list-page.styles.scss',
  template: `
    <app-page-header title="Usuarios" [subtitle]="list.total() + ' usuarios en ' + (auth.actingTenant() ?? auth.user()?.razonSocial)">
      <button mat-flat-button *appIfCan="['usuarios', 'insertar']" (click)="openForm(null)"><mat-icon>person_add</mat-icon>Nuevo usuario</button>
    </app-page-header>

    <div class="toolbar">
      <app-search-box label="Buscar por nombre o correo" [value]="list.search()" (search)="list.setSearch($event)" />
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
          <th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let u">{{ u.nombre }} @if (u.esSuperAdmin) {<mat-icon class="sa" matTooltip="Superadministrador">verified_user</mat-icon>}</td>
        </ng-container>
        <ng-container matColumnDef="email">
          <th mat-header-cell *matHeaderCellDef>Correo</th>
          <td mat-cell *matCellDef="let u">{{ u.email }}</td>
        </ng-container>
        <ng-container matColumnDef="rol">
          <th mat-header-cell *matHeaderCellDef>Rol</th>
          <td mat-cell *matCellDef="let u">{{ u.rol }}</td>
        </ng-container>
        <ng-container matColumnDef="estado">
          <th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let u"><mat-chip [highlighted]="u.activo">{{ u.activo ? 'Activo' : 'Inactivo' }}</mat-chip></td>
        </ng-container>
        <ng-container matColumnDef="acceso">
          <th mat-header-cell *matHeaderCellDef>Último acceso</th>
          <td mat-cell *matCellDef="let u" class="muted">{{ u.ultimoAcceso ? (u.ultimoAcceso | date: 'short') : 'Nunca' }}</td>
        </ng-container>
        <ng-container matColumnDef="acciones">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let u" class="actions-cell">
            <ng-container *appIfCan="['usuarios', 'editar']">
              <button mat-icon-button matTooltip="Editar" (click)="openForm(u)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button matTooltip="Cambiar contraseña" (click)="changePassword(u)"><mat-icon>key</mat-icon></button>
            </ng-container>
            @if (u.id !== auth.user()?.id && !u.esSuperAdmin) {
              <button mat-icon-button matTooltip="Eliminar" *appIfCan="['usuarios', 'eliminar']" (click)="remove(u)"><mat-icon>delete</mat-icon></button>
            }
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="columns"></tr>
        <tr mat-row *matRowDef="let row; columns: columns"></tr>
      </table>
      @if (!list.loading() && list.items().length === 0) {
        <p class="empty">No hay usuarios que coincidan.</p>
      }
    </div>
    <mat-paginator [length]="list.total()" [pageIndex]="list.page() - 1" [pageSize]="list.pageSize()" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" />
  `,
  styles: `.sa { font-size: 16px; width: 16px; height: 16px; vertical-align: middle; color: var(--mat-sys-primary); }`,
})
export class UsuariosPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(AdminApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['nombre', 'email', 'rol', 'estado', 'acceso', 'acciones'];
  protected readonly list = new PagedList<Usuario>((q) => this.api.listUsuarios(q));
  private readonly roles = signal<RolResumen[]>([]);

  ngOnInit(): void {
    void this.list.load();
  }

  protected onPage(e: PageEvent): void {
    void this.list.setPage(e.pageIndex + 1, e.pageSize);
  }

  protected async openForm(usuario: Usuario | null): Promise<void> {
    if (this.roles().length === 0) {
      const roles = await attempt(this.snackBar, this.api.listRoles({ page: 1, pageSize: 100, search: '' }));
      if (!roles.ok) return;
      this.roles.set(roles.value.items);
    }

    const result = await firstValueFrom(
      this.dialog
        .open<UsuarioFormDialogComponent, UsuarioFormData, UsuarioFormResult>(UsuarioFormDialogComponent, {
          data: { usuario, roles: this.roles(), esPropio: usuario?.id === this.auth.user()?.id },
        })
        .afterClosed(),
    );
    if (!result) return;

    const saved =
      result.tipo === 'crear'
        ? await attempt(this.snackBar, this.api.createUsuario(result.dto), 'Usuario creado')
        : await attempt(this.snackBar, this.api.updateUsuario(usuario!.id, result.dto), 'Usuario actualizado');
    if (saved.ok) void this.list.load();
  }

  protected async changePassword(usuario: Usuario): Promise<void> {
    const password = await firstValueFrom(
      this.dialog.open<PasswordDialogComponent, string, string>(PasswordDialogComponent, { data: usuario.nombre }).afterClosed(),
    );
    if (password) await attempt(this.snackBar, this.api.changePassword(usuario.id, password), 'Contraseña actualizada');
  }

  protected async remove(usuario: Usuario): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: { title: 'Eliminar usuario', message: `¿Eliminar a ${usuario.nombre}? Para conservar su historial puedes desactivarlo.`, confirmText: 'Eliminar' },
        })
        .afterClosed(),
    );
    if (ok && (await attempt(this.snackBar, this.api.deleteUsuario(usuario.id), 'Usuario eliminado')).ok) void this.list.load();
  }
}
