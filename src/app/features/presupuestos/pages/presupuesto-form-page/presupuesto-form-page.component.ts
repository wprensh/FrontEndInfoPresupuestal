import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, of, startWith } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { CapituloEditorComponent } from '../../components/capitulo-editor/capitulo-editor.component';
import { PresupuestoResumenComponent } from '../../components/presupuesto-resumen/presupuesto-resumen.component';
import { PresupuestosApiService } from '../../data-access/presupuestos-api.service';
import { PRESUPUESTOS_MATERIAL } from '../../material/presupuestos-material';
import { calcularTotales, valorItem } from '../../models/presupuesto.calc';
import { PresupuestoForm, aDto, crearCapitulo, crearPresupuesto } from '../../models/presupuesto.form';
import { ESTADO_LABELS, EstadoPresupuesto, Presupuesto, UnidadMedida } from '../../models/presupuesto.model';

/** Presupuesto de obra: encabezado, capítulos con ítems desde APU, AIU y resumen en vivo. */
@Component({
  selector: 'app-presupuesto-form-page',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, PageHeaderComponent, CapituloEditorComponent, PresupuestoResumenComponent, ...PRESUPUESTOS_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <app-page-header [title]="titulo()" [subtitle]="subtitulo()">
        <a mat-button routerLink="/presupuestos"><mat-icon>arrow_back</mat-icon>Volver</a>
        @if (presupuesto(); as p) {
          <button mat-stroked-button type="button" [matMenuTriggerFor]="acciones"><mat-icon>more_horiz</mat-icon>Acciones</button>
          <mat-menu #acciones="matMenu">
            @if (auth.can('presupuestos', 'editar')) {
              @if (p.estado !== 'APROBADO') {
                <button mat-menu-item (click)="cambiarEstado('APROBADO')"><mat-icon>verified</mat-icon>Aprobar</button>
              }
              @if (p.estado !== 'BORRADOR') {
                <button mat-menu-item (click)="cambiarEstado('BORRADOR')"><mat-icon>edit_note</mat-icon>Volver a borrador</button>
              }
              @if (p.estado !== 'ANULADO') {
                <button mat-menu-item (click)="cambiarEstado('ANULADO')"><mat-icon>block</mat-icon>Anular</button>
              }
            }
            @if (auth.can('presupuestos', 'insertar')) {
              <button mat-menu-item (click)="duplicar(p)"><mat-icon>content_copy</mat-icon>Duplicar</button>
            }
            <button mat-menu-item (click)="imprimir()"><mat-icon>print</mat-icon>Imprimir</button>
          </mat-menu>
        }
        @if (editable()) {
          <button mat-flat-button type="submit" form="presupuesto-form" [disabled]="guardando()"><mat-icon>save</mat-icon>Guardar</button>
        }
      </app-page-header>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error(); as e) {
        <p class="form-error" role="alert">{{ e }}</p>
      }

      @if (presupuesto(); as p) {
        @if (p.estado !== 'BORRADOR') {
          <p class="aviso"><mat-icon>lock</mat-icon>Presupuesto {{ estadoLabel(p.estado).toLowerCase() }}: solo lectura. Vuelve a borrador para modificarlo.</p>
        } @else if (desactualizados() > 0) {
          <p class="aviso warn">
            <mat-icon>update</mat-icon>{{ desactualizados() }} ítem(s) tienen un valor distinto al costo actual de su APU.
            @if (editable()) {
              <button mat-button type="button" (click)="recalcular(p)">Actualizar todos</button>
            }
          </p>
        }
      }

      @if (form(); as form) {
        <form id="presupuesto-form" [formGroup]="form" (ngSubmit)="guardar(form)" class="layout">
          <div class="main">
            <mat-card appearance="outlined" formGroupName="encabezado">
              <mat-card-header><mat-card-title>Obra</mat-card-title></mat-card-header>
              <mat-card-content class="grid">
                <mat-form-field appearance="outline" class="span2">
                  <mat-label>Nombre de la obra</mat-label>
                  <input matInput formControlName="nombreObra" maxlength="200" />
                  @if (form.controls.encabezado.controls.nombreObra.invalid) {
                    <mat-error>El nombre de la obra es obligatorio</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Fecha</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="fecha" />
                  <mat-datepicker-toggle matIconSuffix [for]="picker" />
                  <mat-datepicker #picker />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Propuesta N°</mat-label>
                  <input matInput formControlName="propuestaNumero" maxlength="30" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="span2">
                  <mat-label>Cliente</mat-label>
                  <input matInput formControlName="cliente" maxlength="200" />
                </mat-form-field>
                <mat-form-field appearance="outline" class="span2">
                  <mat-label>Ubicación</mat-label>
                  <input matInput formControlName="ubicacion" maxlength="200" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Duración (días laborables)</mat-label>
                  <input matInput type="number" formControlName="duracionDias" min="1" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Anticipo solicitado</mat-label>
                  <input matInput type="number" formControlName="anticipoPct" min="0" max="100" step="any" />
                  <span matTextSuffix>%</span>
                </mat-form-field>
                <mat-form-field appearance="outline" class="span2">
                  <mat-label>Observaciones</mat-label>
                  <input matInput formControlName="observaciones" maxlength="1000" />
                </mat-form-field>
              </mat-card-content>
            </mat-card>

            <div class="capitulos">
              <div class="capitulos-head">
                <h2>Capítulos e ítems</h2>
                @if (editable()) {
                  <button mat-stroked-button type="button" (click)="agregarCapitulo(form)"><mat-icon>add</mat-icon>Agregar capítulo</button>
                }
              </div>
              @for (cap of form.controls.capitulos.controls; track cap; let i = $index; let first = $first; let last = $last) {
                <app-capitulo-editor
                  [capitulo]="cap"
                  [numero]="i + 1"
                  [unidades]="unidades()"
                  [costoDirecto]="totales().costoDirecto"
                  [primero]="first"
                  [ultimo]="last"
                  [soloLectura]="!editable()"
                  (subir)="moverCapitulo(form, i, -1)"
                  (bajar)="moverCapitulo(form, i, 1)"
                  (quitar)="quitarCapitulo(form, i)"
                />
              } @empty {
                <p class="empty">Sin capítulos.</p>
              }
            </div>

            <mat-card appearance="outlined" formGroupName="aiu">
              <mat-card-header><mat-card-title>Costos indirectos (AIU)</mat-card-title></mat-card-header>
              <mat-card-content class="grid aiu">
                <mat-form-field appearance="outline">
                  <mat-label>Administración</mat-label>
                  <input matInput type="number" formControlName="administracion" min="0" max="100" step="any" />
                  <span matTextSuffix>%</span>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Imprevistos</mat-label>
                  <input matInput type="number" formControlName="imprevistos" min="0" max="100" step="any" />
                  <span matTextSuffix>%</span>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Utilidad</mat-label>
                  <input matInput type="number" formControlName="utilidad" min="0" max="100" step="any" />
                  <span matTextSuffix>%</span>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>IVA sobre utilidad</mat-label>
                  <input matInput type="number" formControlName="ivaUtilidad" min="0" max="100" step="any" />
                  <span matTextSuffix>%</span>
                </mat-form-field>
              </mat-card-content>
            </mat-card>
          </div>

          <aside class="side">
            <app-presupuesto-resumen [totales]="totales()" [aiu]="aiuValor()" />
            @if (presupuesto(); as p) {
              <p class="meta">{{ p.codigo }} · actualizado {{ p.actualizadoEn | date: 'short' }}</p>
            }
          </aside>
        </form>
      }
    </section>
  `,
  styles: `
    .page { padding: 16px 20px; max-width: 1440px; margin: 0 auto; }
    .layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 16px; align-items: start; }
    .main { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .side { position: sticky; top: 16px; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0 12px; padding-top: 8px; }
    .span2 { grid-column: span 2; }
    .capitulos { display: flex; flex-direction: column; gap: 12px; }
    .capitulos-head { display: flex; align-items: center; justify-content: space-between; }
    .capitulos-head h2 { margin: 0; font: 500 1.1rem/1.5 Roboto, sans-serif; }
    .form-error { color: var(--mat-sys-error); }
    .aviso { display: flex; gap: 8px; align-items: center; padding: 8px 12px; border-radius: 8px; background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); margin: 0 0 16px; }
    .aviso.warn { background: var(--mat-sys-tertiary-container); color: var(--mat-sys-on-tertiary-container); }
    .meta { opacity: 0.7; font-size: 12px; margin: 8px 4px; }
    .empty { opacity: 0.7; }
    @media (max-width: 1100px) {
      .layout { grid-template-columns: 1fr; }
      .side { position: static; }
    }
    @media (max-width: 700px) {
      .page { padding: 16px; }
      .grid { grid-template-columns: 1fr 1fr; }
    }
    @media print {
      .side { position: static; }
      .layout { grid-template-columns: 1fr; }
    }
  `,
})
export class PresupuestoFormPageComponent implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(PresupuestosApiService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  /** Id desde la ruta `/presupuestos/:id`; vacío en `/presupuestos/nuevo`. */
  readonly id = input<string>();

  protected readonly form = signal<PresupuestoForm | null>(null);
  protected readonly presupuesto = signal<Presupuesto | null>(null);
  protected readonly unidades = signal<UnidadMedida[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly valor = signal<ReturnType<PresupuestoForm['getRawValue']> | null>(null);

  protected readonly titulo = computed(() => this.presupuesto()?.codigo ?? (this.id() ? 'Presupuesto' : 'Nuevo presupuesto'));
  protected readonly subtitulo = computed(() => {
    const p = this.presupuesto();
    return p ? `${p.nombreObra} · ${ESTADO_LABELS[p.estado]}` : 'Presupuesto de obra con ítems desde APU';
  });
  protected readonly editable = computed(() => {
    const p = this.presupuesto();
    return p ? p.estado === 'BORRADOR' && this.auth.can('presupuestos', 'editar') : this.auth.can('presupuestos', 'insertar');
  });
  protected readonly aiuValor = computed(() => this.valor()?.aiu ?? { administracion: 0, imprevistos: 0, utilidad: 0, ivaUtilidad: 0 });
  protected readonly totales = computed(() => {
    const v = this.valor();
    const costoDirecto = (v?.capitulos ?? []).reduce((acc, c) => acc + c.items.reduce((s, i) => s + valorItem(i.cantidad, i.valorUnitario), 0), 0);
    const aiu = this.aiuValor();
    const anticipo = v?.encabezado.anticipoPct;
    return calcularTotales(
      costoDirecto,
      { administracion: aiu.administracion / 100, imprevistos: aiu.imprevistos / 100, utilidad: aiu.utilidad / 100, ivaUtilidad: aiu.ivaUtilidad / 100 },
      anticipo === null || anticipo === undefined ? null : anticipo / 100,
    );
  });
  protected readonly desactualizados = computed(
    () =>
      (this.valor()?.capitulos ?? []).flatMap((c) => c.items).filter((i) => i.costoApuActual !== null && Math.abs(i.costoApuActual - i.valorUnitario) >= 0.005)
        .length,
  );

  protected readonly estadoLabel = (e: EstadoPresupuesto) => ESTADO_LABELS[e];

  async ngOnInit(): Promise<void> {
    try {
      const [unidades, presupuesto] = await Promise.all([
        firstValueFrom(this.api.unidades().pipe(catchError(() => of<UnidadMedida[]>([])))),
        this.id() ? firstValueFrom(this.api.get(this.id()!)) : Promise.resolve(null),
      ]);
      this.unidades.set(unidades);
      this.usar(presupuesto);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el presupuesto');
    } finally {
      this.cargando.set(false);
    }
  }

  protected agregarCapitulo(form: PresupuestoForm): void {
    form.controls.capitulos.push(crearCapitulo(this.fb));
  }

  protected moverCapitulo(form: PresupuestoForm, i: number, delta: number): void {
    const capitulos = form.controls.capitulos;
    const cap = capitulos.at(i);
    capitulos.removeAt(i, { emitEvent: false });
    capitulos.insert(i + delta, cap);
  }

  protected async quitarCapitulo(form: PresupuestoForm, i: number): Promise<void> {
    const cap = form.controls.capitulos.at(i);
    if (cap.controls.items.length > 0) {
      const ok = await this.confirmar({
        title: 'Quitar capítulo',
        message: `¿Quitar el capítulo ${i + 1} con sus ${cap.controls.items.length} ítem(s)? Los demás capítulos se renumeran.`,
        confirmText: 'Quitar',
      });
      if (!ok) return;
    }
    form.controls.capitulos.removeAt(i);
  }

  protected async guardar(form: PresupuestoForm): Promise<void> {
    if (form.invalid) {
      form.markAllAsTouched();
      this.snackBar.open('Revisa los campos marcados', 'Cerrar', { duration: 4000 });
      return;
    }
    this.guardando.set(true);
    const dto = aDto(form.getRawValue());
    const actual = this.presupuesto();
    const result = actual
      ? await attempt(this.snackBar, this.api.update(actual.id, dto), 'Presupuesto guardado')
      : await attempt(this.snackBar, this.api.create(dto), 'Presupuesto creado');
    this.guardando.set(false);
    if (!result.ok) return;
    if (actual) {
      this.usar(result.value);
    } else {
      void this.router.navigate(['/presupuestos', result.value.id], { replaceUrl: true });
    }
  }

  protected async cambiarEstado(estado: EstadoPresupuesto): Promise<void> {
    const p = this.presupuesto()!;
    if (this.form()?.dirty && p.estado === 'BORRADOR') {
      const ok = await this.confirmar({ title: 'Cambios sin guardar', message: 'Hay cambios sin guardar que se perderán. ¿Continuar?', confirmText: 'Continuar' });
      if (!ok) return;
    }
    const result = await attempt(this.snackBar, this.api.cambiarEstado(p.id, estado), `Presupuesto ${ESTADO_LABELS[estado].toLowerCase()}`);
    if (result.ok) this.usar(result.value);
  }

  protected async recalcular(p: Presupuesto): Promise<void> {
    if (this.form()?.dirty) {
      this.snackBar.open('Guarda los cambios antes de actualizar los valores desde los APU', 'Cerrar', { duration: 5000 });
      return;
    }
    const result = await attempt(this.snackBar, this.api.recalcular(p.id), 'Valores actualizados desde los APU');
    if (result.ok) this.usar(result.value);
  }

  protected async duplicar(p: Presupuesto): Promise<void> {
    const result = await attempt(this.snackBar, this.api.duplicar(p.id), `Copia de ${p.codigo} creada`);
    if (result.ok) void this.router.navigate(['/presupuestos', result.value.id]);
  }

  protected imprimir(): void {
    window.print();
  }

  private confirmar(data: ConfirmDialogData): Promise<boolean | undefined> {
    return firstValueFrom(this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, { data }).afterClosed());
  }

  /** Arma el formulario desde el presupuesto guardado (o vacío); fuera de borrador queda de solo lectura. */
  private usar(p: Presupuesto | null): void {
    this.presupuesto.set(p);
    const form = crearPresupuesto(this.fb, p ?? undefined);
    if (!this.editable()) form.disable();
    form.valueChanges.pipe(startWith(null), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.valor.set(form.getRawValue()));
    this.form.set(form);
  }
}
