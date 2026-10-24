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
      <app-brand-logo tone="on-primary" />
      <span class="spacer"></span>
      @if (auth.actingTenant(); as tenant) {
        <button mat-stroked-button class="acting" (click)="volver()" matTooltip="Volver a la empresa propia">
          <mat-icon>swap_horiz</mat-icon>Empresa: {{ tenant }}<mat-icon iconPositionEnd>close</mat-icon>
        </button>
      }
      <span class="company">{{ auth.user()?.razonSocial }}</span>
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
    <nav mat-tab-nav-bar [tabPanel]="panel" class="tabs">
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
      --mat-icon-button-icon-color: var(--mat-sys-on-primary);
      gap: 8px; padding: 0 24px;
    }
    .spacer { flex: 1; }
    .company { font-size: 14px; opacity: 0.9; }
    .acting { --mdc-outlined-button-label-text-color: var(--mat-sys-on-primary); --mdc-outlined-button-outline-color: var(--mat-sys-on-primary); }
    .avatar {
      width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
      background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); font: 500 13px Roboto;
    }
    .avatar-button { display: grid; place-items: center; }
    .who { display: flex; flex-direction: column; gap: 2px; padding: 12px 16px; font-size: 13px; }
    .who span { opacity: 0.7; }
    .tabs { background: var(--mat-sys-surface-container-lowest); border-bottom: 1px solid var(--mat-sys-outline-variant); padding: 0 16px; }
    .tabs mat-icon { margin-right: 8px; }
    .content { flex: 1; min-height: 0; overflow: auto; display: block; }
    @media (max-width: 600px) { .company { display: none; } .topbar { padding: 0 12px; } }
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

  /** El superadministrador deja de actuar sobre otra empresa. */
  protected volver(): void {
    this.auth.setActingTenant(null);
    void this.router.navigateByUrl('/presupuesto');
  }
}
