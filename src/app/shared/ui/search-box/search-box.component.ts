import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/** Caja de búsqueda que emite el texto 300 ms después de la última tecla. */
@Component({
  selector: 'app-search-box',
  imports: [MatFormFieldModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic">
      <mat-label>{{ label() }}</mat-label>
      <mat-icon matPrefix>search</mat-icon>
      <input matInput [value]="value()" (input)="onInput($event)" />
    </mat-form-field>
  `,
  styles: `:host { display: block; } mat-form-field { width: 100%; }`,
})
export class SearchBoxComponent {
  readonly label = input('Buscar');
  readonly value = input('');
  readonly search = output<string>();

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.search.emit(value), 300);
  }
}
