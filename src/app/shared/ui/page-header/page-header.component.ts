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
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 1.75rem; font-weight: 500; }
    p { margin: 4px 0 0; opacity: 0.7; }
    .actions { display: flex; gap: 8px; }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
