import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface SectionLink {
  readonly path: string;
  readonly label: string;
  readonly icon: string;
}

/** Menú lateral de una sección (Administración, Mantenimiento) con su `<router-outlet>`. */
@Component({
  selector: 'app-section-nav',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside>
      <h2>{{ title() }}</h2>
      @for (link of links(); track link.path) {
        <a [routerLink]="link.path" routerLinkActive="active"><mat-icon>{{ link.icon }}</mat-icon>{{ link.label }}</a>
      }
    </aside>
    <section><router-outlet /></section>
  `,
  styles: `
    :host { display: grid; grid-template-columns: 220px 1fr; min-height: 100%; }
    aside { border-right: 1px solid var(--mat-sys-outline-variant); padding: 16px 8px; background: var(--mat-sys-surface-container-lowest); }
    h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; margin: 8px 12px 12px; font-weight: 500; }
    a { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 24px; color: inherit; text-decoration: none; font-size: 14px; }
    a:hover { background: var(--mat-sys-surface-container-high); }
    a.active { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); font-weight: 500; }
    section { padding: 24px; min-width: 0; }
    @media (max-width: 720px) {
      :host { grid-template-columns: 1fr; }
      aside { display: flex; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--mat-sys-outline-variant); padding: 8px; }
      h2 { display: none; }
      a { white-space: nowrap; }
      section { padding: 16px; }
    }
  `,
})
export class SectionNavComponent {
  readonly title = input.required<string>();
  readonly links = input.required<readonly SectionLink[]>();
}
