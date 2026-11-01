import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { HojaPresupuestoComponent } from '../../components/hoja-presupuesto/hoja-presupuesto.component';
import { ImpresionApiService } from '../../data-access/impresion-api.service';
import { PresupuestoImpresion } from '../../models/impresion.model';

/** Vista previa e impresión (o PDF desde el navegador) del presupuesto con el membrete de la empresa. */
@Component({
  selector: 'app-presupuesto-impresion-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, MatTooltipModule, HojaPresupuestoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="barra no-print">
      <a mat-button [routerLink]="['/presupuestos', id()]"><mat-icon>arrow_back</mat-icon>Volver al presupuesto</a>
      <span class="spacer"></span>
      @if (auth.can('impresion')) {
        <a mat-button routerLink="/administracion/formato-impresion" matTooltip="Logo, razón social, firma y columnas"><mat-icon>tune</mat-icon>Formato</a>
      }
      <button mat-flat-button (click)="imprimir()" [disabled]="!datos()"><mat-icon>print</mat-icon>Imprimir o guardar PDF</button>
    </div>
    @if (cargando()) {
      <mat-progress-bar mode="indeterminate" class="no-print" />
    }
    @if (error(); as e) {
      <p class="error no-print" role="alert">{{ e }}</p>
    }
    @if (datos(); as d) {
      @if (!d.empresa.personalizada && auth.can('impresion')) {
        <p class="aviso no-print">
          <mat-icon>info</mat-icon>Se usan los datos de la empresa. Configura el logo, la dirección y la firma en
          <a routerLink="/administracion/formato-impresion">Formato de impresión</a>.
        </p>
      }
      <div class="papel">
        <app-hoja-presupuesto [empresa]="d.empresa" [presupuesto]="d.presupuesto" />
      </div>
    }
  `,
  styles: `
    :host { display: block; background: var(--mat-sys-surface-container); min-height: 100%; padding-bottom: 32px; }
    .barra {
      position: sticky; top: 0; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 8px 16px;
      background: var(--mat-sys-surface-container-lowest); border-bottom: 1px solid var(--mat-sys-outline-variant);
    }
    .spacer { flex: 1; }
    .aviso { display: flex; align-items: center; gap: 8px; max-width: 216mm; margin: 16px auto 0; font-size: 13px; }
    .error { color: var(--mat-sys-error); text-align: center; }
    .papel { width: 216mm; max-width: calc(100% - 32px); margin: 16px auto; box-shadow: 0 1px 3px rgb(0 0 0 / 0.2), 0 4px 16px rgb(0 0 0 / 0.08); }
    @media print {
      :host { background: none; padding: 0; }
      .papel { width: auto; max-width: none; margin: 0; box-shadow: none; }
    }
  `,
})
export class PresupuestoImpresionPageComponent implements OnInit {
  private readonly api = inject(ImpresionApiService);
  private readonly title = inject(Title);
  protected readonly auth = inject(AuthService);

  /** Id desde la ruta `/impresion/presupuesto/:id`. */
  readonly id = input.required<string>();

  protected readonly datos = signal<PresupuestoImpresion | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const datos = await firstValueFrom(this.api.presupuesto(this.id()));
      this.datos.set(datos);
      // El título es el nombre sugerido del PDF al guardar desde el navegador.
      this.title.setTitle(`${datos.presupuesto.codigo} ${datos.presupuesto.nombreObra}`);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el presupuesto');
    } finally {
      this.cargando.set(false);
    }
  }

  protected imprimir(): void {
    window.print();
  }
}
