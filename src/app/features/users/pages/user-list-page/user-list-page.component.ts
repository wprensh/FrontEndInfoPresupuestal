import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { UserFormDialogComponent } from '../../components/user-form-dialog/user-form-dialog.component';
import { UserTableComponent } from '../../components/user-table/user-table.component';
import { UsersStore } from '../../data-access/users.store';
import { USERS_MATERIAL } from '../../material/users-material';
import { CreateUserDto, User } from '../../models/user.model';

/**
 * Página contenedora (smart): conecta el store con los componentes
 * presentacionales y orquesta diálogos y notificaciones.
 */
@Component({
  selector: 'app-user-list-page',
  imports: [PageHeaderComponent, UserTableComponent, ...USERS_MATERIAL],
  templateUrl: './user-list-page.component.html',
  styleUrl: './user-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListPageComponent implements OnInit {
  protected readonly store = inject(UsersStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.store.load();
  }

  protected onSearch(event: Event): void {
    this.store.setQuery((event.target as HTMLInputElement).value);
  }

  protected openCreateDialog(): void {
    this.dialog
      .open<UserFormDialogComponent, void, CreateUserDto>(UserFormDialogComponent)
      .afterClosed()
      .subscribe(async (dto) => {
        if (!dto) return;
        const user = await this.store.create(dto);
        if (user) this.notify(`Usuario ${user.firstName} creado`);
      });
  }

  protected confirmDelete(user: User): void {
    this.dialog
      .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
        data: {
          title: 'Eliminar usuario',
          message: `¿Seguro que deseas eliminar a ${user.firstName} ${user.lastName}?`,
          confirmText: 'Eliminar',
        },
      })
      .afterClosed()
      .subscribe(async (confirmed) => {
        if (confirmed && (await this.store.remove(user.id))) this.notify('Usuario eliminado');
      });
  }

  private notify(message: string): void {
    this.snackBar.open(message, 'Cerrar', { duration: 3000 });
  }
}
