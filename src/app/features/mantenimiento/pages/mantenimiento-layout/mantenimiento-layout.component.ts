import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { Modulo } from '../../../../core/auth/auth.model';
import { AuthService } from '../../../../core/auth/auth.service';
import { SectionLink, SectionNavComponent } from '../../../../shared/ui/section-nav/section-nav.component';

const LINKS: readonly (SectionLink & { modulo: Modulo })[] = [
  { path: 'insumos', label: 'Insumos y precios', icon: 'inventory_2', modulo: 'insumos' },
  { path: 'clasificaciones', label: 'Clasificaciones', icon: 'category', modulo: 'clasificaciones' },
  { path: 'unidades-medida', label: 'Unidades de medida', icon: 'straighten', modulo: 'unidades-medida' },
  { path: 'tipos-insumo', label: 'Tipos de insumo', icon: 'label', modulo: 'tipos-insumo' },
];

/** Menú de Mantenimiento de tablas, filtrado por los permisos de Ver. */
@Component({
  selector: 'app-mantenimiento-layout',
  imports: [SectionNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-section-nav title="Mantenimiento" [links]="links()" />`,
})
export class MantenimientoLayoutComponent {
  private readonly auth = inject(AuthService);
  protected readonly links = computed(() => LINKS.filter((l) => this.auth.can(l.modulo)));
}
