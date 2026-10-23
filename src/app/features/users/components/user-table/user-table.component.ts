import { ChangeDetectionStrategy, Component, effect, input, output, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { USERS_MATERIAL } from '../../material/users-material';
import { USER_ROLE_LABELS, User } from '../../models/user.model';

/**
 * Tabla presentacional: recibe usuarios por `input()` y emite eventos por
 * `output()`. No conoce el store ni la API.
 */
@Component({
  selector: 'app-user-table',
  imports: [DatePipe, ...USERS_MATERIAL],
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserTableComponent {
  readonly users = input.required<User[]>();
  readonly delete = output<User>();

  protected readonly columns = ['name', 'email', 'role', 'active', 'createdAt', 'actions'];
  protected readonly roleLabels: Record<string, string> = USER_ROLE_LABELS;
  protected readonly dataSource = new MatTableDataSource<User>([]);

  private readonly sort = viewChild.required(MatSort);
  private readonly paginator = viewChild.required(MatPaginator);

  constructor() {
    this.dataSource.sortingDataAccessor = (user, column) =>
      column === 'name' ? `${user.firstName} ${user.lastName}`.toLowerCase() : (user[column as keyof User] as string);

    effect(() => {
      this.dataSource.data = this.users();
    });
    effect(() => {
      this.dataSource.sort = this.sort();
      this.dataSource.paginator = this.paginator();
    });
  }
}
