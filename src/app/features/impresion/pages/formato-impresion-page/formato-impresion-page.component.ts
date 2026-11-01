import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom, startWith } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { HojaPresupuestoComponent } from '../../components/hoja-presupuesto/hoja-presupuesto.component';
import { ImpresionApiService } from '../../data-access/impresion-api.service';
import { COLORES_SUGERIDOS, ConfiguracionImpresion, ConfiguracionImpresionDto, LOGO_MAX_BYTES, LOGO_TIPOS, PRESUPUESTO_MUESTRA } from '../../models/impresion.model';
import { ajustarLogo } from '../../models/logo.utils';

/** Formato de impresión de la empresa: membrete, firma y columnas, con vista previa en vivo. */
@Component({
  selector: 'app-formato-impresion-page',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTooltipModule,
    HojaPresupuestoComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div>
        <h1>Formato de impresión</h1>
        <p>Membrete con que la empresa imprime sus presupuestos. Los campos vacíos usan los datos registrados de la empresa.</p>
      </div>
      @if (puedeEditar()) {
        <button mat-flat-button type="submit" form="formato-form" [disabled]="guardando() || form.invalid"><mat-icon>save</mat-icon>Guardar</button>
      }
    </header>
    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" />
    }

    <div class="layout">
      <form id="formato-form" [formGroup]="form" (ngSubmit)="guardar()" class="campos">
        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Empresa</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="logo-box">
              <div class="logo-preview" [class.vacio]="!logo()">
                @if (logo(); as l) {
                  <img [src]="l" alt="Logo de la empresa" />
                } @else {
                  <mat-icon>image</mat-icon>
                }
              </div>
              <div class="logo-acciones">
                <input #archivo type="file" hidden [accept]="tipos" (change)="cargarLogo(archivo)" />
                <button mat-stroked-button type="button" (click)="archivo.click()" [disabled]="!puedeEditar()"><mat-icon>upload</mat-icon>Subir logo</button>
                @if (logo()) {
                  <button mat-button type="button" (click)="logo.set(null); form.markAsDirty()" [disabled]="!puedeEditar()">Quitar</button>
                }
                <small>PNG, JPG o WebP. Las imágenes grandes se reducen automáticamente.</small>
              </div>
            </div>
            <div class="grid">
              <mat-form-field appearance="outline" class="span2">
                <mat-label>Razón social</mat-label>
                <input matInput formControlName="razonSocial" maxlength="200" [placeholder]="original()?.razonSocial ?? ''" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>NIT</mat-label>
                <input matInput formControlName="nit" maxlength="20" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="telefono" maxlength="30" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="span2">
                <mat-label>Dirección</mat-label>
                <input matInput formControlName="direccion" maxlength="200" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Ciudad</mat-label>
                <input matInput formControlName="ciudad" maxlength="80" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Correo</mat-label>
                <input matInput type="email" formControlName="email" maxlength="200" />
                @if (form.controls.email.invalid) {
                  <mat-error>Correo no válido</mat-error>
                }
              </mat-form-field>
              <mat-form-field appearance="outline" class="span2">
                <mat-label>Sitio web</mat-label>
                <input matInput formControlName="sitioWeb" maxlength="200" />
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Presentación</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="colores" role="radiogroup" aria-label="Color del membrete">
              @for (c of colores; track c) {
                <button
                  type="button"
                  class="color"
                  role="radio"
                  [attr.aria-checked]="color() === c"
                  [style.background]="c"
                  [class.activo]="color() === c"
                  [matTooltip]="c === colores[0] ? 'Color institucional' : c"
                  [disabled]="!puedeEditar()"
                  (click)="form.controls.colorPrimario.setValue(c); form.markAsDirty()"
                ></button>
              }
              <label class="color otro" matTooltip="Otro color">
                <input type="color" [value]="color()" [disabled]="!puedeEditar()" (input)="elegirColor($event)" />
                <mat-icon>palette</mat-icon>
              </label>
            </div>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Texto bajo el membrete</mat-label>
              <textarea matInput formControlName="encabezado" maxlength="500" rows="2" placeholder="Ej.: Señores… nos permitimos presentar la siguiente propuesta"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Pie de página</mat-label>
              <textarea matInput formControlName="piePagina" maxlength="500" rows="2" placeholder="Ej.: Validez de la oferta: 30 días"></textarea>
            </mat-form-field>
            <div class="toggles">
              <mat-slide-toggle formControlName="mostrarApu">Código del APU en cada ítem</mat-slide-toggle>
              <mat-slide-toggle formControlName="mostrarParticipacion">Participación de cada capítulo</mat-slide-toggle>
              <mat-slide-toggle formControlName="mostrarValorLetras">Valor total en letras</mat-slide-toggle>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card appearance="outlined">
          <mat-card-header><mat-card-title>Firma</mat-card-title></mat-card-header>
          <mat-card-content class="grid">
            <mat-form-field appearance="outline" class="span2">
              <mat-label>Nombre de quien firma</mat-label>
              <input matInput formControlName="firmaNombre" maxlength="120" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cargo</mat-label>
              <input matInput formControlName="firmaCargo" maxlength="120" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Matrícula profesional</mat-label>
              <input matInput formControlName="firmaMatricula" maxlength="60" />
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      </form>

      <aside class="preview">
        <h2>Vista previa</h2>
        <div class="papel">
          <app-hoja-presupuesto [empresa]="vista()" [presupuesto]="muestra" />
        </div>
      </aside>
    </div>
  `,
  styles: `
    .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    h1 { margin: 0; font: 500 22px/1.3 Roboto; }
    .head p { margin: 2px 0 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); }
    .layout { display: grid; grid-template-columns: minmax(0, 460px) minmax(0, 1fr); gap: 20px; align-items: start; }
    .campos { display: flex; flex-direction: column; gap: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 12px; padding-top: 8px; }
    .span2, .full { grid-column: span 2; width: 100%; }
    .logo-box { display: flex; gap: 16px; align-items: center; padding: 12px 0; }
    .logo-preview {
      width: 140px; height: 72px; display: grid; place-items: center; border-radius: 8px;
      border: 1px solid var(--mat-sys-outline-variant); background: #fff; overflow: hidden;
    }
    .logo-preview img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .logo-preview.vacio { border-style: dashed; color: var(--mat-sys-outline); }
    .logo-acciones { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .logo-acciones small { flex-basis: 100%; color: var(--mat-sys-on-surface-variant); font-size: 12px; }
    .colores { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 0 16px; }
    .color { width: 30px; height: 30px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--mat-sys-outline-variant); cursor: pointer; padding: 0; }
    .color.activo { box-shadow: 0 0 0 2px var(--mat-sys-on-surface); }
    .otro { display: grid; place-items: center; position: relative; background: var(--mat-sys-surface-container-high); }
    .otro input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
    .otro mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .toggles { display: flex; flex-direction: column; gap: 8px; }
    .preview { position: sticky; top: 0; }
    .preview h2 { margin: 0 0 8px; font: 500 12px Roboto; text-transform: uppercase; letter-spacing: 0.08em; color: var(--mat-sys-on-surface-variant); }
    .papel { background: #fff; box-shadow: 0 1px 3px rgb(0 0 0 / 0.2), 0 4px 16px rgb(0 0 0 / 0.08); zoom: 0.8; }
    @media (max-width: 1200px) { .layout { grid-template-columns: 1fr; } .preview { position: static; } }
  `,
})
export class FormatoImpresionPageComponent implements OnInit {
  private readonly api = inject(ImpresionApiService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tipos = LOGO_TIPOS.join(',');
  protected readonly colores = COLORES_SUGERIDOS;
  protected readonly muestra = PRESUPUESTO_MUESTRA;
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly original = signal<ConfiguracionImpresion | null>(null);
  protected readonly logo = signal<string | null>(null);
  protected readonly puedeEditar = computed(() => this.auth.can('impresion', 'editar'));

  protected readonly form = this.fb.group({
    razonSocial: [''],
    nit: [''],
    direccion: [''],
    ciudad: [''],
    telefono: [''],
    email: ['', Validators.email],
    sitioWeb: [''],
    colorPrimario: [COLORES_SUGERIDOS[0] as string],
    encabezado: [''],
    piePagina: [''],
    firmaNombre: [''],
    firmaCargo: [''],
    firmaMatricula: [''],
    mostrarApu: [true],
    mostrarParticipacion: [true],
    mostrarValorLetras: [true],
  });

  private readonly valor = signal(this.form.getRawValue());
  protected readonly color = computed(() => this.valor().colorPrimario);

  /** Lo que se imprimiría con los valores actuales del formulario. */
  protected readonly vista = computed<ConfiguracionImpresion>(() => {
    const v = this.valor();
    const o = this.original();
    const t = (s: string) => s.trim() || null;
    return {
      ...v,
      razonSocial: t(v.razonSocial) ?? o?.razonSocial ?? 'Razón social',
      nit: t(v.nit),
      direccion: t(v.direccion),
      ciudad: t(v.ciudad),
      telefono: t(v.telefono),
      email: t(v.email),
      sitioWeb: t(v.sitioWeb),
      encabezado: t(v.encabezado),
      piePagina: t(v.piePagina),
      firmaNombre: t(v.firmaNombre),
      firmaCargo: t(v.firmaCargo),
      firmaMatricula: t(v.firmaMatricula),
      logo: this.logo(),
      personalizada: true,
      actualizadoEn: null,
    };
  });

  async ngOnInit(): Promise<void> {
    this.form.valueChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.valor.set(this.form.getRawValue()));
    if (!this.puedeEditar()) this.form.disable();
    try {
      this.usar(await firstValueFrom(this.api.configuracion()));
    } catch (e) {
      this.snackBar.open(e instanceof Error ? e.message : 'No se pudo cargar el formato', 'Cerrar', { duration: 5000 });
    } finally {
      this.cargando.set(false);
    }
  }

  protected elegirColor(event: Event): void {
    this.form.controls.colorPrimario.setValue((event.target as HTMLInputElement).value);
    this.form.markAsDirty();
  }

  protected async cargarLogo(input: HTMLInputElement): Promise<void> {
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    if (!(LOGO_TIPOS as readonly string[]).includes(archivo.type)) {
      this.snackBar.open('El logo debe ser PNG, JPG o WebP', 'Cerrar', { duration: 4000 });
      return;
    }
    try {
      this.logo.set(await ajustarLogo(archivo, LOGO_MAX_BYTES));
      this.form.markAsDirty();
    } catch (e) {
      this.snackBar.open(e instanceof Error ? e.message : 'No se pudo leer la imagen', 'Cerrar', { duration: 5000 });
    }
  }

  protected async guardar(): Promise<void> {
    if (this.form.invalid) return;
    this.guardando.set(true);
    const v = this.form.getRawValue();
    const dto: ConfiguracionImpresionDto = { ...this.vista(), ...v, razonSocial: v.razonSocial.trim() };
    const result = await attempt(this.snackBar, this.api.guardar(dto), 'Formato de impresión guardado');
    this.guardando.set(false);
    if (result.ok) this.usar(result.value);
  }

  /** Solo se muestran como propios los campos guardados; la razón social sin personalizar queda de sugerencia. */
  private usar(c: ConfiguracionImpresion): void {
    this.original.set(c);
    this.logo.set(c.logo);
    this.form.reset({
      razonSocial: c.personalizada ? c.razonSocial : '',
      nit: c.nit ?? '',
      direccion: c.direccion ?? '',
      ciudad: c.ciudad ?? '',
      telefono: c.telefono ?? '',
      email: c.email ?? '',
      sitioWeb: c.sitioWeb ?? '',
      colorPrimario: c.colorPrimario,
      encabezado: c.encabezado ?? '',
      piePagina: c.piePagina ?? '',
      firmaNombre: c.firmaNombre ?? '',
      firmaCargo: c.firmaCargo ?? '',
      firmaMatricula: c.firmaMatricula ?? '',
      mostrarApu: c.mostrarApu,
      mostrarParticipacion: c.mostrarParticipacion,
      mostrarValorLetras: c.mostrarValorLetras,
    });
  }
}
