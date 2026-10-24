import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of, startWith } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { ApuEquipoComponent } from '../../components/apu-equipo/apu-equipo.component';
import { ApuManoObraComponent } from '../../components/apu-mano-obra/apu-mano-obra.component';
import { ApuMaterialesComponent } from '../../components/apu-materiales/apu-materiales.component';
import { ApuResumenComponent } from '../../components/apu-resumen/apu-resumen.component';
import { ApuApiService } from '../../data-access/apu-api.service';
import { APU_MATERIAL } from '../../material/apu-material';
import { calcularTotales } from '../../models/apu.calc';
import { ApuForm, aDto, crearApu, crearEquipo, crearManoObra, crearMaterial } from '../../models/apu.form';
import { Apu, ApuTotales, UnidadMedida } from '../../models/apu.model';

const SIN_TOTALES: ApuTotales = { materiales: 0, manoObra: 0, equipo: 0, costoDirecto: 0 };

/** Alta y edición de un Análisis de Precios Unitarios (hoja APU's del formato Excel). */
@Component({
  selector: 'app-apu-form-page',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
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
      <app-page-header [title]="titulo()" subtitle="Costo directo de una actividad por unidad de medida">
        <a mat-button routerLink="/apu"><mat-icon>arrow_back</mat-icon>Volver</a>
        @if (puedeGuardar()) {
          <button mat-flat-button type="submit" form="apu-form" [disabled]="guardando()"><mat-icon>save</mat-icon>Guardar</button>
        }
      </app-page-header>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error(); as e) {
        <p class="form-error" role="alert">{{ e }}</p>
      }

      @if (form(); as form) {
        @if (apu(); as a) {
          @if (a.usosEnPresupuestos > 0) {
            <p class="aviso"><mat-icon>info</mat-icon>Se usa en {{ a.usosEnPresupuestos }} ítem(s) de presupuestos. Los presupuestos conservan su valor hasta que se recalculen.</p>
          }
        }
        <form id="apu-form" [formGroup]="form" (ngSubmit)="guardar(form)" class="layout">
          <div class="main">
            <mat-card appearance="outlined" formGroupName="encabezado">
              <mat-card-header><mat-card-title>Actividad</mat-card-title></mat-card-header>
              <mat-card-content class="header-grid">
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Descripción de la actividad</mat-label>
                  <input matInput formControlName="descripcion" maxlength="200" placeholder="REPLANTEO" />
                  @if (form.controls.encabezado.controls.descripcion.invalid) {
                    <mat-error>La descripción es obligatoria</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Unidad</mat-label>
                  <mat-select formControlName="unidadMedidaId">
                    @for (u of unidades(); track u.id) {
                      <mat-option [value]="u.id">{{ u.codigo }} · {{ u.nombre }}</mat-option>
                    }
                  </mat-select>
                  @if (form.controls.encabezado.controls.unidadMedidaId.invalid) {
                    <mat-error>Elige la unidad</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Fecha</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="fecha" />
                  <mat-datepicker-toggle matIconSuffix [for]="picker" />
                  <mat-datepicker #picker />
                  @if (form.controls.encabezado.controls.fecha.invalid) {
                    <mat-error>Fecha no válida</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Observaciones</mat-label>
                  <input matInput formControlName="observaciones" maxlength="500" />
                </mat-form-field>
                @if (apu()) {
                  <mat-slide-toggle formControlName="activo">Activo (se ofrece al armar presupuestos)</mat-slide-toggle>
                }
              </mat-card-content>
            </mat-card>

            <mat-card appearance="outlined">
              <mat-card-content class="sections">
                <app-apu-materiales
                  [lineas]="form.controls.materiales"
                  [unidades]="unidades()"
                  [subtotal]="totales().materiales"
                  [soloLectura]="!puedeGuardar()"
                  (agregar)="form.controls.materiales.push(nuevoMaterial())"
                  (quitar)="form.controls.materiales.removeAt($event)"
                />
                <app-apu-mano-obra
                  [lineas]="form.controls.manoObra"
                  [subtotal]="totales().manoObra"
                  [soloLectura]="!puedeGuardar()"
                  (agregar)="form.controls.manoObra.push(nuevaManoObra())"
                  (quitar)="form.controls.manoObra.removeAt($event)"
                />
                <app-apu-equipo
                  [lineas]="form.controls.equipo"
                  [unidades]="unidades()"
                  [subtotal]="totales().equipo"
                  [soloLectura]="!puedeGuardar()"
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
            <app-apu-resumen [totales]="totales()" [unidad]="unidadCodigo()" />
            @if (apu(); as a) {
              <p class="meta">{{ a.codigo }} · actualizado {{ a.actualizadoEn | date: 'short' }}</p>
            }
          </aside>
        </form>
      }
    </section>
  `,
  styles: `
    .page { padding: 24px; max-width: 1440px; margin: 0 auto; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 16px; align-items: start; }
    .main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .side { position: sticky; top: 16px; }
    .header-grid { display: grid; grid-template-columns: minmax(0, 1fr) 200px 200px; gap: 0 12px; padding-top: 8px; align-items: center; }
    .header-grid .wide:first-child { grid-column: 1; }
    .header-grid .wide:not(:first-child) { grid-column: 1 / -1; }
    .sections { display: flex; flex-direction: column; gap: 28px; padding-top: 16px; }
    .form-error { color: var(--mat-sys-error); margin: 0; }
    .aviso { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 8px; background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); margin: 0 0 16px; }
    .meta { opacity: 0.7; font-size: 12px; margin: 8px 4px; }
    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: static; }
    }
    @media (max-width: 700px) {
      .page { padding: 16px; }
      .header-grid { grid-template-columns: 1fr 1fr; }
      .header-grid .wide:first-child { grid-column: 1 / -1; }
    }
  `,
})
export class ApuFormPageComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApuApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  /** Id del APU desde la ruta `/apu/:id`; vacío en `/apu/nuevo`. */
  readonly id = input<string>();

  protected readonly form = signal<ApuForm | null>(null);
  protected readonly apu = signal<Apu | null>(null);
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly valor = signal<ReturnType<ApuForm['getRawValue']> | null>(null);

  protected readonly titulo = computed(() => (this.apu() ? `APU ${this.apu()!.codigo}` : this.id() ? 'APU' : 'Nuevo APU'));
  protected readonly puedeGuardar = computed(() => this.auth.can('apu', this.id() ? 'editar' : 'insertar'));
  protected readonly totales = computed(() => {
    const v = this.valor();
    return v ? calcularTotales(v) : SIN_TOTALES;
  });
  protected readonly unidadCodigo = computed(() => this.unidades().find((u) => u.id === this.valor()?.encabezado.unidadMedidaId)?.codigo ?? null);

  protected readonly nuevoMaterial = () => crearMaterial(this.fb);
  protected readonly nuevaManoObra = () => crearManoObra(this.fb);
  protected readonly nuevoEquipo = () => crearEquipo(this.fb);

  async ngOnInit(): Promise<void> {
    try {
      const [unidades, apu] = await Promise.all([
        firstValueFrom(this.api.unidades().pipe(catchError(() => of<UnidadMedida[]>([])))),
        this.id() ? firstValueFrom(this.api.get(this.id()!)) : Promise.resolve(null),
      ]);
      this.unidades.set(unidades);
      this.usar(apu);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el APU');
    } finally {
      this.cargando.set(false);
    }
  }

  protected async guardar(form: ApuForm): Promise<void> {
    this.enviado.set(true);
    if (form.invalid) {
      form.markAllAsTouched();
      this.snackBar.open('Revisa los campos marcados', 'Cerrar', { duration: 4000 });
      return;
    }
    this.guardando.set(true);
    const dto = aDto(form.getRawValue());
    const actual = this.apu();
    const result = actual
      ? await attempt(this.snackBar, this.api.update(actual.id, dto), 'APU guardado')
      : await attempt(this.snackBar, this.api.create(dto), 'APU creado');
    this.guardando.set(false);
    if (!result.ok) return;
    if (actual) {
      this.usar(result.value);
    } else {
      void this.router.navigate(['/apu', result.value.id], { replaceUrl: true });
    }
  }

  /** Arma el formulario desde el APU guardado (o vacío) y lo deja de solo lectura sin permiso. */
  private usar(apu: Apu | null): void {
    const form = crearApu(this.fb, apu ?? undefined);
    if (!this.puedeGuardar()) form.disable();
    form.valueChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.valor.set(form.getRawValue()));
    this.apu.set(apu);
    this.form.set(form);
    this.enviado.set(false);
  }
}
