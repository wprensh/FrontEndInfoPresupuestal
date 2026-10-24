import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { ApuApiService } from '../../data-access/apu-api.service';
import { APU_MATERIAL } from '../../material/apu-material';
import { APU_CURRENCY, InsumoCatalogo } from '../../models/apu.model';

/**
 * Descripción de una línea del APU con búsqueda en el catálogo de insumos. Elegir un insumo
 * enlaza la línea (`insumoId`) y avisa al padre para proponer unidad y precio; escribir a mano
 * deja la línea como texto libre.
 */
@Component({
  selector: 'app-insumo-autocomplete',
  imports: [CurrencyPipe, ReactiveFormsModule, ...APU_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline">
      <mat-label>{{ label() }}</mat-label>
      <input matInput [formControl]="descripcion()" [matAutocomplete]="auto" (input)="escribir($event)" (focus)="buscar(descripcion().value)" maxlength="200" />
      @if (insumoId().value) {
        <mat-icon matSuffix matTooltip="Del catálogo de insumos" class="link">link</mat-icon>
      }
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="elegir($event)" class="insumo-panel">
        @for (i of opciones(); track i.id) {
          <mat-option [value]="i">
            <span class="opt">
              <span>{{ i.descripcion }} <small>{{ i.unidad }}</small></span>
              <small>{{ i.precio ? (i.precio.valorUnitario | currency: moneda : 'symbol-narrow' : '1.0-0') : 'sin precio' }}</small>
            </span>
          </mat-option>
        }
      </mat-autocomplete>
      @if (descripcion().invalid) {
        <mat-error>Escribe o elige del catálogo</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    :host { display: block; }
    mat-form-field { width: 100%; }
    .link { color: var(--mat-sys-primary); font-size: 18px; width: 18px; height: 18px; }
    .opt { display: flex; justify-content: space-between; gap: 12px; width: 100%; }
    .opt small { opacity: 0.7; }
  `,
})
export class InsumoAutocompleteComponent {
  private readonly api = inject(ApuApiService);

  readonly label = input.required<string>();
  readonly tipoInsumoId = input.required<number>();
  readonly descripcion = input.required<FormControl<string>>();
  readonly insumoId = input.required<FormControl<string | null>>();
  readonly elegido = output<InsumoCatalogo>();

  protected readonly moneda = APU_CURRENCY;
  private readonly texto$ = new Subject<string>();
  protected readonly opciones = toSignal(
    this.texto$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((t) => this.api.buscarInsumos(this.tipoInsumoId(), t).pipe(catchError(() => of<InsumoCatalogo[]>([])))),
    ),
    { initialValue: [] },
  );

  protected buscar(texto: string): void {
    this.texto$.next(texto.trim());
  }

  protected escribir(e: Event): void {
    this.insumoId().setValue(null);
    this.buscar((e.target as HTMLInputElement).value);
  }

  protected elegir(e: MatAutocompleteSelectedEvent): void {
    const insumo = e.option.value as InsumoCatalogo;
    this.descripcion().setValue(insumo.descripcion);
    this.insumoId().setValue(insumo.id);
    this.elegido.emit(insumo);
  }
}
