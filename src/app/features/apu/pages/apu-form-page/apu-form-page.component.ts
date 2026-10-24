import { formatCurrency } from '@angular/common';
import { ChangeDetectionStrategy, Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, startWith } from 'rxjs';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { ApuEquipoComponent } from '../../components/apu-equipo/apu-equipo.component';
import { ApuManoObraComponent } from '../../components/apu-mano-obra/apu-mano-obra.component';
import { ApuMaterialesComponent } from '../../components/apu-materiales/apu-materiales.component';
import { ApuResumenComponent } from '../../components/apu-resumen/apu-resumen.component';
import { ApuCatalogosService } from '../../data-access/apu-catalogos.service';
import { APU_MATERIAL } from '../../material/apu-material';
import { calcularTotales } from '../../models/apu.calc';
import { crearApu, crearEquipo, crearManoObra, crearMaterial } from '../../models/apu.form';
import { APU_CURRENCY, Apu, UNIDADES } from '../../models/apu.model';

/** Formulario de Análisis de Precios Unitarios, a partir de la hoja APU's del formato Excel. */
@Component({
  selector: 'app-apu-form-page',
  imports: [
    ReactiveFormsModule,
    PageHeaderComponent,
    ApuMaterialesComponent,
    ApuManoObraComponent,
    ApuEquipoComponent,
    ApuResumenComponent,
    ...APU_MATERIAL,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <app-page-header title="Análisis de precios unitarios" subtitle="Costo directo de una actividad por unidad de medida">
        <button mat-button type="button" (click)="limpiar()"><mat-icon>restart_alt</mat-icon>Limpiar</button>
        <button mat-flat-button type="submit" form="apu-form"><mat-icon>save</mat-icon>Guardar</button>
      </app-page-header>

      <form id="apu-form" [formGroup]="form" (ngSubmit)="guardar()" class="layout">
        <div class="main">
          <mat-card appearance="outlined" formGroupName="encabezado">
            <mat-card-header><mat-card-title>Actividad</mat-card-title></mat-card-header>
            <mat-card-content class="header-grid">
              <mat-form-field appearance="outline">
                <mat-label>Ítem</mat-label>
                <input matInput formControlName="item" maxlength="20" placeholder="1.1" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Descripción de la actividad</mat-label>
                <input matInput formControlName="descripcion" maxlength="200" placeholder="REPLANTEO" />
                @if (encabezado.controls.descripcion.invalid) {
                  <mat-error>La descripción es obligatoria</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Unidad</mat-label>
                <mat-select formControlName="unidad">
                  @for (u of unidades; track u) {
                    <mat-option [value]="u">{{ u }}</mat-option>
                  }
                </mat-select>
                @if (encabezado.controls.unidad.invalid) {
                  <mat-error>Elige la unidad</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Fecha</mat-label>
                <input matInput [matDatepicker]="picker" formControlName="fecha" />
                <mat-datepicker-toggle matIconSuffix [for]="picker" />
                <mat-datepicker #picker />
                @if (encabezado.controls.fecha.invalid) {
                  <mat-error>Fecha no válida</mat-error>
                }
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <mat-card appearance="outlined">
            <mat-card-content class="sections">
              <app-apu-materiales
                [lineas]="form.controls.materiales"
                [catalogo]="catalogos().materiales"
                [subtotal]="totales().materiales"
                (agregar)="form.controls.materiales.push(nuevoMaterial())"
                (quitar)="form.controls.materiales.removeAt($event)"
              />
              <app-apu-mano-obra
                [lineas]="form.controls.manoObra"
                [catalogo]="catalogos().manoObra"
                [subtotal]="totales().manoObra"
                (agregar)="form.controls.manoObra.push(nuevaManoObra())"
                (quitar)="form.controls.manoObra.removeAt($event)"
              />
              <app-apu-equipo
                [lineas]="form.controls.equipo"
                [catalogo]="catalogos().equipos"
                [subtotal]="totales().equipo"
                (agregar)="form.controls.equipo.push(nuevoEquipo())"
                (quitar)="form.controls.equipo.removeAt($event)"
              />
              @if (enviado() && form.hasError('sinInsumos')) {
                <p class="form-error" role="alert">Agrega al menos un material, mano de obra o equipo.</p>
              }
            </mat-card-content>
          </mat-card>
        </div>

        <aside class="side">
          <app-apu-resumen [totales]="totales()" [unidad]="encabezado.controls.unidad.value" />
        </aside>
      </form>
    </section>
  `,
  styles: `
    .page { padding: 24px; max-width: 1440px; margin: 0 auto; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
    .main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .side { position: sticky; top: 16px; }
    .header-grid { display: grid; grid-template-columns: 140px minmax(0, 1fr) 160px 200px; gap: 0 12px; padding-top: 8px; }
    .sections { display: flex; flex-direction: column; gap: 28px; padding-top: 16px; }
    .form-error { color: var(--mat-sys-error); margin: 0; }
    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: static; }
    }
    @media (max-width: 700px) {
      .page { padding: 16px; }
      .header-grid { grid-template-columns: 1fr 1fr; }
      .header-grid .wide { grid-column: 1 / -1; }
    }
  `,
})
export class ApuFormPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly locale = inject(LOCALE_ID);

  protected readonly unidades = UNIDADES;
  protected readonly catalogos = toSignal(inject(ApuCatalogosService).getCatalogos(), {
    initialValue: { materiales: [], manoObra: [], equipos: [] },
  });

  protected readonly form = crearApu(this.fb);
  protected readonly encabezado = this.form.controls.encabezado;
  protected readonly enviado = signal(false);

  /** Totales en vivo; getRawValue incluye controles deshabilitados y evita valores parciales. */
  private readonly valor = toSignal(
    this.form.valueChanges.pipe(
      startWith(null),
      map(() => this.form.getRawValue()),
    ),
    { requireSync: true },
  );
  protected readonly totales = computed(() => calcularTotales(this.valor()));

  protected readonly nuevoMaterial = () => crearMaterial(this.fb);
  protected readonly nuevaManoObra = () => crearManoObra(this.fb);
  protected readonly nuevoEquipo = () => crearEquipo(this.fb);

  protected guardar(): void {
    this.enviado.set(true);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Revisa los campos marcados', 'Cerrar', { duration: 4000 });
      return;
    }
    const apu: Apu = this.form.getRawValue();
    const costo = formatCurrency(this.totales().costoDirecto, this.locale, '$', APU_CURRENCY, '1.0-2');
    // Sin endpoint de APU todavía: el valor queda listo para enviarlo a la API.
    console.info('APU', apu);
    this.snackBar.open(`APU "${apu.encabezado.descripcion.trim()}" listo: costo directo ${costo}`, 'Cerrar', { duration: 5000 });
  }

  protected limpiar(): void {
    const nuevo = crearApu(this.fb);
    this.form.setControl('materiales', nuevo.controls.materiales);
    this.form.setControl('manoObra', nuevo.controls.manoObra);
    this.form.setControl('equipo', nuevo.controls.equipo);
    this.encabezado.reset({ item: '', descripcion: '', unidad: null, fecha: new Date() });
    this.enviado.set(false);
  }
}
