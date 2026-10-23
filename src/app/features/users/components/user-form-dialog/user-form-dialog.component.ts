import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

import { AutofocusDirective } from '../../../../shared/directives/autofocus.directive';
import { USERS_MATERIAL } from '../../material/users-material';
import { CreateUserDto, USER_ROLE_LABELS, UserRole } from '../../models/user.model';

/**
 * Formulario de creación en un MatDialog. Devuelve el `CreateUserDto` al
 * cerrarse; quien lo abre decide qué hacer con él (normalmente `store.create`).
 */
@Component({
  selector: 'app-user-form-dialog',
  imports: [ReactiveFormsModule, AutofocusDirective, ...USERS_MATERIAL],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<UserFormDialogComponent, CreateUserDto>>(MatDialogRef);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly roles = Object.entries(USER_ROLE_LABELS) as [UserRole, string][];

  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email]],
    role: this.fb.control<UserRole>('viewer', Validators.required),
    active: [true],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }
}
