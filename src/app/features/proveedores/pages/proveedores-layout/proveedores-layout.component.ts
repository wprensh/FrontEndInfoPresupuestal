import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SectionLink, SectionNavComponent } from '../../../../shared/ui/section-nav/section-nav.component';

const LINKS: readonly SectionLink[] = [
  { path: 'catalogos', label: 'Catálogos y precios', icon: 'manage_search' },
  { path: 'directorio', label: 'Directorio', icon: 'local_shipping' },
];

/** Sección Proveedores de la constructora: consultar catálogos e importar, y el directorio. */
@Component({
  selector: 'app-proveedores-layout',
  imports: [SectionNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-section-nav title="Proveedores" [links]="links" />`,
})
export class ProveedoresLayoutComponent {
  protected readonly links = LINKS;
}
