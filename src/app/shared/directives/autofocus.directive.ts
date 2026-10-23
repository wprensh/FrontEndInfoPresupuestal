import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/** Da foco al elemento host en cuanto se renderiza (útil en diálogos y formularios). */
@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    afterNextRender(() => element.focus());
  }
}
