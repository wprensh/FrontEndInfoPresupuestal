import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';

import { BrandLogoComponent } from '../../../shared/ui/brand-logo/brand-logo.component';

interface NavLink {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

/** Layout principal: barra superior con marca + navegación por pestañas entre features. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatTabsModule, MatButtonModule, MatIconModule, BrandLogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar class="topbar">
      <app-brand-logo tone="on-primary" />
      <span class="spacer"></span>
      <button mat-icon-button aria-label="Notificaciones"><mat-icon>notifications</mat-icon></button>
      <button mat-icon-button aria-label="Configuración"><mat-icon>settings</mat-icon></button>
      <span class="avatar" aria-label="Usuario actual">MR</span>
    </mat-toolbar>
    <nav mat-tab-nav-bar [tabPanel]="panel" class="tabs">
      @for (link of links; track link.path) {
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
    .avatar {
      width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; margin-left: 8px;
      background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); font: 500 13px Roboto;
    }
    .tabs { background: var(--mat-sys-surface-container-lowest); border-bottom: 1px solid var(--mat-sys-outline-variant); padding: 0 16px; }
    .tabs mat-icon { margin-right: 8px; }
    .content { flex: 1; min-height: 0; overflow: auto; display: block; }
  `,
})
export class ShellComponent {
  protected readonly links: readonly NavLink[] = [
    { path: '/presupuesto', label: 'Partidas', icon: 'table_view' },
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { path: '/users', label: 'Usuarios', icon: 'group' },
  ];
}
