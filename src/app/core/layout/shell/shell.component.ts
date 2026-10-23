import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';

/** Layout principal de la aplicación: barra superior + menú lateral. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatListModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-toolbar color="primary">
      <mat-icon>account_balance</mat-icon>
      <span class="title">InfoPresupuestal</span>
    </mat-toolbar>
    <mat-sidenav-container class="container">
      <mat-sidenav mode="side" opened>
        <mat-nav-list>
          <a mat-list-item routerLink="/dashboard" routerLinkActive="active">
            <mat-icon matListItemIcon>dashboard</mat-icon>
            <span matListItemTitle>Dashboard</span>
          </a>
          <a mat-list-item routerLink="/users" routerLinkActive="active">
            <mat-icon matListItemIcon>group</mat-icon>
            <span matListItemTitle>Usuarios</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>
      <mat-sidenav-content>
        <main><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host { display: flex; flex-direction: column; height: 100vh; }
    .title { margin-left: 12px; }
    .container { flex: 1; }
    mat-sidenav { width: 220px; }
    main { padding: 24px; }
    .active { font-weight: 600; }
  `,
})
export class ShellComponent {}
