import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Encabezado de página puramente visual. Las acciones se proyectan con
 * `<ng-content>` para que cada feature decida qué botones mostrar.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header>
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p>{{ subtitle() }}</p>
        }
      </div>
      <div class="actions"><ng-content /></div>
    </header>
  `,
  styles: `
    header { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    h1 { margin: 0; font: 500 22px/1.3 Roboto; letter-spacing: -0.01em; }
    p { margin: 2px 0 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); }
    .actions { display: flex; gap: 8px; }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
