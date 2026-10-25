import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BrandLogoComponent } from '../../../shared/ui/brand-logo/brand-logo.component';
import { AuthService } from '../../auth/auth.service';

interface NavLink {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

/** Layout principal: barra superior con marca y sesión + navegación por pestañas según permisos. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    BrandLogoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="topbar">
      <app-brand-logo tone="on-primary" size="small" />
      <span class="divider" aria-hidden="true"></span>
      <span class="company" [matTooltip]="auth.user()?.empresa ?? ''">{{ auth.user()?.razonSocial }}</span>
      <span class="spacer"></span>
      @if (auth.actingTenant(); as tenant) {
        <button mat-stroked-button class="acting" (click)="volver()" matTooltip="Volver a la empresa propia">
          <mat-icon>swap_horiz</mat-icon>Empresa: {{ tenant }}<mat-icon iconPositionEnd>close</mat-icon>
        </button>
      }
      @if (settingsLink(); as link) {
        <a mat-icon-button class="on-primary" [routerLink]="link" aria-label="Configuración" matTooltip="Configuración"><mat-icon>settings</mat-icon></a>
      }
      <button mat-icon-button [matMenuTriggerFor]="menu" aria-label="Cuenta" class="avatar-button">
        <span class="avatar">{{ initials() }}</span>
      </button>
      <mat-menu #menu="matMenu" xPosition="before">
        <div class="who" (click)="$event.stopPropagation()">
          <strong>{{ auth.user()?.nombre }}</strong>
          <span>{{ auth.user()?.email }}</span>
          <span>{{ auth.isSuperAdmin() ? 'Superadministrador' : auth.user()?.rol }} · {{ auth.user()?.empresa }}</span>
        </div>
        <mat-divider />
        <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon>Cerrar sesión</button>
      </mat-menu>
    </mat-toolbar>
    <nav mat-tab-nav-bar [tabPanel]="panel" mat-stretch-tabs="false" mat-align-tabs="start" class="tabs">
      @for (link of links(); track link.path) {
        <a mat-tab-link [routerLink]="link.path" routerLinkActive #rla="routerLinkActive" [active]="rla.isActive">
          <mat-icon>{{ link.icon }}</mat-icon>{{ link.label }}
        </a>
      }
    </nav>
    <mat-tab-nav-panel #panel class="content"><router-outlet /></mat-tab-nav-panel>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100vh; }
    .topbar {
      --mat-toolbar-container-background-color: var(--mat-sys-primary);
      --mat-toolbar-container-text-color: var(--mat-sys-on-primary);
      --mat-toolbar-standard-height: 56px;
      --mat-icon-button-icon-color: var(--mat-sys-on-primary);
      gap: 4px; padding: 0 16px 0 20px;
    }
    .divider { width: 1px; height: 24px; margin: 0 12px; background: color-mix(in srgb, var(--mat-sys-on-primary) 35%, transparent); }
    .company { font: 500 14px Roboto; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
    .spacer { flex: 1; }
    .on-primary { color: var(--mat-sys-on-primary); }
    .acting { --mdc-outlined-button-label-text-color: var(--mat-sys-on-primary); --mdc-outlined-button-outline-color: var(--mat-sys-on-primary); margin-right: 4px; }
    .avatar {
      width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center;
      background: #b8ecec; color: var(--mat-sys-on-primary-container); font: 600 12px Roboto;
    }
    .avatar-button { display: grid; place-items: center; }
    .who { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; font-size: 13px; }
    .who span { opacity: 0.7; }
    .tabs {
      --mat-tab-header-label-text-size: 14px;
      --mat-tab-header-container-height: 46px;
      background: var(--mat-sys-surface-container-lowest); border-bottom: 1px solid var(--mat-sys-outline-variant); padding: 0 12px;
    }
    .tabs a { min-width: 0; padding: 0 14px; }
    .tabs mat-icon { margin-right: 8px; font-size: 20px; width: 20px; height: 20px; }
    .content { flex: 1; min-height: 0; overflow: auto; display: block; }
    @media (max-width: 600px) { .company, .divider { display: none; } .topbar { padding: 0 8px 0 12px; } }
  `,
})
export class ShellComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly initials = computed(() =>
    (this.auth.user()?.nombre ?? '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join(''),
  );

  protected readonly links = computed<NavLink[]>(() => [
    { path: '/presupuesto', label: 'Partidas', icon: 'table_view' },
    ...(this.auth.can('presupuestos') ? [{ path: '/presupuestos', label: 'Presupuestos', icon: 'request_quote' }] : []),
    ...(this.auth.can('apu') ? [{ path: '/apu', label: 'APU', icon: 'calculate' }] : []),
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    ...(this.auth.canAny(['insumos', 'clasificaciones', 'unidades-medida', 'tipos-insumo'])
      ? [{ path: '/mantenimiento', label: 'Mantenimiento', icon: 'inventory_2' }]
      : []),
    ...(this.auth.canAny(['usuarios', 'roles']) ? [{ path: '/administracion', label: 'Administración', icon: 'admin_panel_settings' }] : []),
  ]);

  /** El engranaje lleva a la configuración que el usuario puede ver. */
  protected readonly settingsLink = computed(() =>
    this.auth.canAny(['usuarios', 'roles'])
      ? '/administracion'
      : this.auth.canAny(['insumos', 'clasificaciones', 'unidades-medida', 'tipos-insumo'])
        ? '/mantenimiento'
        : null,
  );

  /** El superadministrador deja de actuar sobre otra empresa. */
  protected volver(): void {
    this.auth.setActingTenant(null);
    void this.router.navigateByUrl('/presupuesto');
  }
}
