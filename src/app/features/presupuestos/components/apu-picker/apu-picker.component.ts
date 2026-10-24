import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import { PresupuestosApiService } from '../../data-access/presupuestos-api.service';
import { PRESUPUESTOS_MATERIAL } from '../../material/presupuestos-material';
import { ItemForm } from '../../models/presupuesto.form';
import { ApuOpcion, PRESUPUESTO_CURRENCY } from '../../models/presupuesto.model';

/**
 * Descripción del ítem con búsqueda de APU existentes. Elegir un APU copia su descripción, unidad
 * y costo directo al ítem; escribir a mano lo deja como ítem manual con valor propio.
 */
@Component({
  selector: 'app-apu-picker',
  imports: [CurrencyPipe, ReactiveFormsModule, ...PRESUPUESTOS_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field appearance="outline" subscriptSizing="dynamic">
      @if (item().controls.apuCodigo.value; as codigo) {
        <span matTextPrefix class="apu" matTooltip="Viene de un APU">{{ codigo }}&nbsp;</span>
      }
      <input matInput aria-label="Descripción del ítem" [formControl]="item().controls.descripcion" [matAutocomplete]="auto" (input)="escribir($event)" (focus)="buscar(item().controls.descripcion.value)" placeholder="Busca un APU o escribe" />
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="elegir($event)">
        @for (a of opciones(); track a.id) {
          <mat-option [value]="a">
            <span class="opt">
              <span><small class="apu">{{ a.codigo }}</small> {{ a.descripcion }} <small>{{ a.unidad }}</small></span>
              <small>{{ a.costos.costoDirecto | currency: moneda : 'symbol-narrow' : '1.0-0' }}</small>
            </span>
          </mat-option>
        } @empty {
          @if (buscado()) {
            <mat-option disabled>Sin APU que coincidan: el ítem queda manual</mat-option>
          }
        }
      </mat-autocomplete>
      @if (item().controls.descripcion.invalid && item().controls.descripcion.touched) {
        <mat-error>Requerida</mat-error>
      }
    </mat-form-field>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    mat-form-field { width: 100%; }
    .apu { font-family: var(--ip-font-mono); font-size: 12px; color: var(--mat-sys-primary); }
    .opt { display: flex; justify-content: space-between; gap: 12px; width: 100%; }
    .opt small { opacity: 0.75; }
  `,
})
export class ApuPickerComponent {
  private readonly api = inject(PresupuestosApiService);

  readonly item = input.required<ItemForm>();

  protected readonly moneda = PRESUPUESTO_CURRENCY;
  private readonly texto$ = new Subject<string>();
  private readonly resultado = toSignal(
    this.texto$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((t) => this.api.buscarApus(t).pipe(catchError(() => of<ApuOpcion[]>([])))),
    ),
  );
  protected readonly opciones = () => this.resultado() ?? [];
  protected readonly buscado = () => this.resultado() !== undefined;

  protected buscar(texto: string): void {
    this.texto$.next(texto.trim());
  }

  protected escribir(e: Event): void {
    this.item().patchValue({ apuId: null, apuCodigo: null, costoApuActual: null });
    this.buscar((e.target as HTMLInputElement).value);
  }

  protected elegir(e: MatAutocompleteSelectedEvent): void {
    const apu = e.option.value as ApuOpcion;
    this.item().patchValue({
      apuId: apu.id,
      apuCodigo: apu.codigo,
      descripcion: apu.descripcion,
      unidadMedidaId: apu.unidadMedidaId,
      valorUnitario: apu.costos.costoDirecto,
      costoApuActual: apu.costos.costoDirecto,
    });
  }
}
