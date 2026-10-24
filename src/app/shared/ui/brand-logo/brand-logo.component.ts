import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Logo de InfoPresupuestal: tres columnas ascendentes (estructura / avance)
 * coronadas por una viga. Puramente visual, sin lógica de negocio.
 */
@Component({
  selector: 'app-brand-logo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.on-primary]': "tone() === 'on-primary'", role: 'img', 'aria-label': 'InfoPresupuestal' },
  template: `
    <span class="mark" aria-hidden="true">
      <span class="beam"></span>
      <span class="col c1"></span><span class="col c2"></span><span class="col c3"></span>
    </span>
    @if (showName()) {
      <span class="name">Info<strong>Presupuestal</strong></span>
    }
  `,
  styles: `
    :host { display: inline-flex; align-items: center; gap: 12px; --mark-bg: var(--mat-sys-primary); --mark-fg: var(--mat-sys-on-primary); }
    :host(.on-primary) { --mark-bg: var(--mat-sys-on-primary); --mark-fg: var(--mat-sys-primary); }
    .mark { position: relative; width: 36px; height: 36px; border-radius: 9px; background: var(--mark-bg); flex: none; }
    .beam { position: absolute; left: 7px; right: 7px; top: 7px; height: 4px; border-radius: 1px; background: var(--ip-brand-accent); }
    .col { position: absolute; bottom: 7px; width: 5px; border-radius: 1px; background: var(--mark-fg); }
    .c1 { left: 8px; height: 9px; } .c2 { left: 15.5px; height: 14px; } .c3 { left: 23px; height: 19px; }
    .name { font: 400 20px/1 Roboto, sans-serif; letter-spacing: -0.01em; }
    .name strong { font-weight: 700; }
  `,
})
export class BrandLogoComponent {
  readonly tone = input<'default' | 'on-primary'>('default');
  readonly showName = input(true);
}
