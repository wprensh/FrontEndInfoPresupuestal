import { Directive, TemplateRef, ViewContainerRef, effect, inject, input } from '@angular/core';

import { Accion, Modulo } from './auth.model';
import { AuthService } from './auth.service';

/**
 * Muestra el contenido solo si el usuario tiene el permiso:
 * `<button *appIfCan="['insumos', 'insertar']">Nuevo</button>`.
 */
@Directive({ selector: '[appIfCan]' })
export class IfCanDirective {
  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef);
  private readonly container = inject(ViewContainerRef);

  readonly appIfCan = input.required<readonly [Modulo, Accion]>();

  private shown = false;

  constructor() {
    effect(() => {
      const [modulo, accion] = this.appIfCan();
      const allowed = this.auth.can(modulo, accion);
      if (allowed && !this.shown) {
        this.container.createEmbeddedView(this.template);
      } else if (!allowed && this.shown) {
        this.container.clear();
      }
      this.shown = allowed;
    });
  }
}
