import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { AuthService } from '../../../../core/auth/auth.service';
import { SectionLink, SectionNavComponent } from '../../../../shared/ui/section-nav/section-nav.component';

/** Menú de Administración: cada opción aparece solo si el usuario puede verla. */
@Component({
  selector: 'app-admin-layout',
  imports: [SectionNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-section-nav title="Administración" [links]="links()" />`,
})
export class AdminLayoutComponent {
  private readonly auth = inject(AuthService);

  protected readonly links = computed<SectionLink[]>(() => [
    ...(this.auth.can('usuarios') ? [{ path: 'usuarios', label: 'Usuarios', icon: 'group' }] : []),
    ...(this.auth.can('roles') ? [{ path: 'roles', label: 'Roles y permisos', icon: 'admin_panel_settings' }] : []),
    ...(this.auth.isSuperAdmin() ? [{ path: 'empresas', label: 'Empresas', icon: 'apartment' }] : []),
  ]);
}
