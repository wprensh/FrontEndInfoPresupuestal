import { CurrencyPipe, DatePipe, PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { attempt } from '../../../../shared/data/attempt';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/ui/confirm-dialog/confirm-dialog.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { FiltroTareas, FormatoExportacion, GanttChartComponent } from '../../components/gantt-chart/gantt-chart.component';
import { GenerarDialogComponent, GenerarDialogData } from '../../components/generar-dialog/generar-dialog.component';
import { ProgramacionApiService } from '../../data-access/programacion-api.service';
import { PROGRAMACION_MATERIAL } from '../../material/programacion-material';
import { ESCALAS, EscalaProgramacion, GenerarProgramacionDto, Programacion, TipoTarea } from '../../models/programacion.model';

const FILTROS: { valor: FiltroTareas; nombre: string }[] = [
  { valor: 'todas', nombre: 'Todas' },
  { valor: 'criticas', nombre: 'Ruta crítica' },
  { valor: 'atrasadas', nombre: 'Atrasadas' },
  { valor: 'en-curso', nombre: 'En curso' },
  { valor: 'sin-iniciar', nombre: 'Sin iniciar' },
  { valor: 'terminadas', nombre: 'Terminadas' },
];

/** Programación de una obra con DHTMLX Gantt: edición, dependencias, ruta crítica, línea base y exportación. */
@Component({
  selector: 'app-programacion-page',
  imports: [CurrencyPipe, DatePipe, PercentPipe, RouterLink, SearchBoxComponent, GanttChartComponent, ...PROGRAMACION_MATERIAL],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="page">
      <header class="head no-print">
        <a mat-icon-button routerLink="/programacion" aria-label="Volver" matTooltip="Volver a la lista"><mat-icon>arrow_back</mat-icon></a>
        <div class="titulo">
          <h1>Programación {{ programacion()?.codigo }}</h1>
          <p>{{ programacion()?.nombreObra }}@if (sucio()) {<span class="sucio"> · cambios sin guardar</span>}</p>
        </div>
        <span class="spacer"></span>
        @if (programacion(); as p) {
          <a mat-button [routerLink]="['/presupuestos', p.presupuestoId]"><mat-icon>request_quote</mat-icon>Presupuesto</a>
        }
        @if (puedeEditar()) {
          <button mat-flat-button (click)="guardar()" [disabled]="guardando() || !sucio()"><mat-icon>save</mat-icon>Guardar</button>
        }
      </header>

      @if (cargando()) {
        <mat-progress-bar mode="indeterminate" />
      }
      @if (error(); as e) {
        <p class="error" role="alert">{{ e }}</p>
      }

      @if (programacion(); as p) {
        @if (vacia()) {
          <div class="vacio">
            <mat-icon>view_timeline</mat-icon>
            <h2>Esta obra aún no tiene programación</h2>
            @if (puedeEditar() || auth.can('programacion', 'insertar')) {
              <p>Genérala desde los capítulos e ítems del presupuesto y ajústala en el diagrama, o empieza en blanco.</p>
            } @else {
              <p>Cuando alguien con permiso la programe, aquí verás el diagrama de Gantt.</p>
            }
            <div class="acciones">
              @if (auth.can('programacion', 'insertar')) {
                <button mat-flat-button (click)="generar()"><mat-icon>auto_fix_high</mat-icon>Generar desde el presupuesto</button>
              }
              @if (puedeEditar()) {
                <button mat-stroked-button (click)="empezarEnBlanco()"><mat-icon>add</mat-icon>Empezar en blanco</button>
              }
            </div>
          </div>
        }

        <div class="kpis no-print" [hidden]="vacia()">
          @let k = gantt().indicadores();
          <div><span>Inicio</span><strong>{{ k.inicio ? (k.inicio | date: 'dd/MM/yyyy' : 'UTC') : '—' }}</strong></div>
          <div><span>Fin</span><strong>{{ k.fin ? (k.fin | date: 'dd/MM/yyyy' : 'UTC') : '—' }}</strong></div>
          <div><span>Plazo</span><strong>{{ k.duracion }} días</strong>
            @if (p.duracionPresupuesto && k.duracion > p.duracionPresupuesto) {
              <small class="mal">+{{ k.duracion - p.duracionPresupuesto }} sobre lo presupuestado</small>
            }
          </div>
          <div class="avance"><span>Avance ponderado</span><strong>{{ (k.avance ?? 0) | percent: '1.0-1' }}</strong>
            <mat-progress-bar mode="determinate" [value]="(k.avance ?? 0) * 100" />
          </div>
          <div><span>Valor ejecutado</span><strong>{{ (k.avance ?? 0) * p.costoDirecto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</strong>
            <small>de {{ p.costoDirecto | currency: 'COP' : 'symbol-narrow' : '1.0-0' }}</small>
          </div>
          <div><span>Actividades</span><strong>{{ k.actividades }}</strong></div>
          <div [class.mal]="k.atrasadas > 0"><span>Atrasadas</span><strong>{{ k.atrasadas }}</strong></div>
          <div><span>Críticas</span><strong>{{ k.criticas }}</strong></div>
        </div>

        <div class="barra no-print" [hidden]="vacia()">
          <div class="grupo">
            @if (puedeEditar()) {
              <button mat-icon-button (click)="gantt().deshacer()" [disabled]="!gantt().puedeDeshacer()" matTooltip="Deshacer"><mat-icon>undo</mat-icon></button>
              <button mat-icon-button (click)="gantt().rehacer()" [disabled]="!gantt().puedeRehacer()" matTooltip="Rehacer"><mat-icon>redo</mat-icon></button>
              <button mat-stroked-button [matMenuTriggerFor]="agregarMenu"><mat-icon>add</mat-icon>Agregar</button>
              <mat-menu #agregarMenu="matMenu">
                <button mat-menu-item (click)="agregar('task')"><mat-icon>horizontal_rule</mat-icon>Actividad</button>
                <button mat-menu-item (click)="agregar('milestone')"><mat-icon>flag</mat-icon>Hito</button>
                <button mat-menu-item (click)="agregar('project')"><mat-icon>folder</mat-icon>Capítulo</button>
              </mat-menu>
            }
            <mat-button-toggle-group [value]="escala()" (change)="cambiarEscala($event.value)" hideSingleSelectionIndicator aria-label="Escala">
              @for (e of escalas; track e.valor) {
                <mat-button-toggle [value]="e.valor">{{ e.nombre }}</mat-button-toggle>
              }
            </mat-button-toggle-group>
            <button mat-icon-button (click)="gantt().alejar(); escala.set(gantt().escalaActual())" matTooltip="Alejar"><mat-icon>zoom_out</mat-icon></button>
            <button mat-icon-button (click)="gantt().acercar(); escala.set(gantt().escalaActual())" matTooltip="Acercar (Ctrl + rueda)"><mat-icon>zoom_in</mat-icon></button>
            <button mat-icon-button (click)="gantt().expandirTodo(true)" matTooltip="Expandir capítulos"><mat-icon>unfold_more</mat-icon></button>
            <button mat-icon-button (click)="gantt().expandirTodo(false)" matTooltip="Contraer capítulos"><mat-icon>unfold_less</mat-icon></button>
          </div>
          <div class="grupo">
            <mat-slide-toggle [checked]="gantt().rutaCriticaVisible()" (change)="gantt().mostrarRutaCritica($event.checked)">Ruta crítica</mat-slide-toggle>
            @if (puedeEditar()) {
              <button mat-button (click)="ajustar()" matTooltip="Mueve hacia adelante las actividades que no cumplen sus dependencias">
                <mat-icon>auto_mode</mat-icon>Ajustar fechas
              </button>
            }
            <button mat-icon-button [matMenuTriggerFor]="mas" aria-label="Más opciones" matTooltip="Más opciones"><mat-icon>more_vert</mat-icon></button>
            <mat-menu #mas="matMenu">
              @if (puedeEditar()) {
                <button mat-menu-item (click)="gantt().fijarLineaBase()"><mat-icon>bookmark_added</mat-icon>Fijar línea base</button>
                <button mat-menu-item (click)="gantt().quitarLineaBase()"><mat-icon>bookmark_remove</mat-icon>Quitar línea base</button>
              }
              @if (auth.can('programacion', 'insertar')) {
                <button mat-menu-item (click)="generar()"><mat-icon>auto_fix_high</mat-icon>Generar de nuevo desde el presupuesto</button>
              }
              <mat-divider />
              <button mat-menu-item (click)="gantt().pantallaCompleta()"><mat-icon>fullscreen</mat-icon>Pantalla completa</button>
              <button mat-menu-item (click)="imprimir()"><mat-icon>print</mat-icon>Imprimir</button>
              <mat-divider />
              <div class="menu-nota" mat-menu-item disabled>Exportar (servicio en línea de DHTMLX)</div>
              @for (f of exportaciones; track f.valor) {
                <button mat-menu-item (click)="exportar(f.valor)"><mat-icon>{{ f.icono }}</mat-icon>{{ f.nombre }}</button>
              }
              @if (auth.can('programacion', 'eliminar') && p.existe) {
                <mat-divider />
                <button mat-menu-item class="peligro" (click)="eliminar()"><mat-icon>delete</mat-icon>Eliminar programación</button>
              }
            </mat-menu>
          </div>
          <div class="grupo filtros">
            <app-search-box label="Buscar actividad o responsable" [value]="texto()" (search)="filtrar($event, filtro())" />
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Mostrar</mat-label>
              <mat-select [value]="filtro()" (valueChange)="filtrar(texto(), $event)">
                @for (f of filtros; track f.valor) {
                  <mat-option [value]="f.valor">{{ f.nombre }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        </div>
      }

      <app-gantt-chart
        class="diagrama"
        [hidden]="!programacion() || vacia()"
        [soloLectura]="!puedeEditar()"
        [nombre]="nombreArchivo()"
        (cambio)="sucio.set(true)"
      />
      <p class="leyenda no-print" [hidden]="!programacion() || vacia()">
        <span class="l-task"></span>Actividad <span class="l-project"></span>Capítulo <span class="l-milestone"></span>Hito
        <span class="l-critica"></span>Ruta crítica <span class="l-atrasada"></span>Atrasada · Doble clic para editar, arrastra las barras para mover
        o cambiar la duración, une los extremos para crear dependencias y arrastra sobre una fila vacía para fijar fechas.
      </p>
    </section>
  `,
  styles: `
    :host { display: block; height: 100%; }
    [hidden] { display: none !important; }
    .page { display: flex; flex-direction: column; height: 100%; box-sizing: border-box; padding: 12px 20px 8px; gap: 10px; }
    .head { display: flex; align-items: center; gap: 8px; }
    .titulo h1 { margin: 0; font: 500 20px/1.3 Roboto; }
    .titulo p { margin: 0; font-size: 13px; color: var(--mat-sys-on-surface-variant); }
    .sucio { color: var(--ip-status-warning); font-weight: 500; }
    .spacer { flex: 1; }
    .error { color: var(--mat-sys-error); }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; }
    .kpis > div {
      display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; border-radius: 10px;
      background: var(--mat-sys-surface-container-lowest); border: 1px solid var(--mat-sys-outline-variant);
    }
    .kpis span { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mat-sys-on-surface-variant); }
    .kpis strong { font: 500 16px Roboto; font-variant-numeric: tabular-nums; }
    .kpis small { font-size: 11px; color: var(--mat-sys-on-surface-variant); }
    .kpis .mal strong, .kpis small.mal { color: var(--mat-sys-error); }
    .kpis .avance mat-progress-bar { margin-top: 4px; }
    .barra { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
    .grupo { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
    .filtros { flex: 1; justify-content: flex-end; gap: 8px; }
    .filtros app-search-box { min-width: 220px; }
    .filtros mat-form-field { width: 150px; }
    mat-button-toggle-group { --mat-standard-button-toggle-height: 34px; margin: 0 4px; }
    .diagrama { flex: 1; min-height: 420px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 12px; overflow: hidden; background: #fff; }
    .vacio { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 48px 16px; gap: 8px; }
    .vacio mat-icon { font-size: 48px; width: 48px; height: 48px; color: var(--mat-sys-primary); }
    .vacio h2 { margin: 0; font: 500 18px Roboto; }
    .vacio p { margin: 0; color: var(--mat-sys-on-surface-variant); max-width: 520px; }
    .vacio .acciones { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; justify-content: center; }
    .leyenda { margin: 0; font-size: 12px; color: var(--mat-sys-on-surface-variant); display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
    .leyenda span { display: inline-block; width: 14px; height: 8px; border-radius: 2px; margin-left: 8px; }
    .l-task { background: var(--ip-gantt-task); } .l-project { background: var(--ip-gantt-project); }
    .l-milestone { background: var(--ip-gantt-milestone); transform: rotate(45deg); width: 8px !important; }
    .l-critica { background: var(--ip-gantt-critica); } .l-atrasada { background: var(--ip-gantt-atrasada); }
    .menu-nota { font-size: 12px; min-height: 32px; }
    .peligro { color: var(--mat-sys-error); }
    @media print {
      .page { padding: 0; height: auto; }
      .diagrama { border: 0; height: 180mm; }
    }
  `,
})
export class ProgramacionPageComponent implements OnInit {
  private readonly api = inject(ProgramacionApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly auth = inject(AuthService);
  protected readonly gantt = viewChild.required(GanttChartComponent);

  /** Id del presupuesto desde la ruta `/programacion/:id`. */
  readonly id = input.required<string>();

  protected readonly escalas = ESCALAS;
  protected readonly filtros = FILTROS;
  protected readonly exportaciones: { valor: FormatoExportacion; nombre: string; icono: string }[] = [
    { valor: 'pdf', nombre: 'PDF', icono: 'picture_as_pdf' },
    { valor: 'png', nombre: 'Imagen PNG', icono: 'image' },
    { valor: 'excel', nombre: 'Excel', icono: 'table_view' },
    { valor: 'msproject', nombre: 'MS Project (XML)', icono: 'account_tree' },
  ];

  protected readonly programacion = signal<Programacion | null>(null);
  protected readonly enBlanco = signal(false);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  readonly sucio = signal(false);
  protected readonly escala = signal<EscalaProgramacion>('semana');
  protected readonly texto = signal('');
  protected readonly filtro = signal<FiltroTareas>('todas');

  protected readonly puedeEditar = computed(() => this.auth.can('programacion', 'editar'));
  protected readonly vacia = computed(() => {
    const p = this.programacion();
    return !!p && p.tareas.length === 0 && !this.enBlanco();
  });
  protected readonly nombreArchivo = computed(() => {
    const p = this.programacion();
    return p ? `Programacion ${p.codigo} ${p.nombreObra}`.slice(0, 120) : 'Programacion';
  });

  async ngOnInit(): Promise<void> {
    try {
      this.usar(await firstValueFrom(this.api.get(this.id())));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar la programación');
    } finally {
      this.cargando.set(false);
    }
  }

  /** Avisa antes de cerrar la pestaña con cambios sin guardar. */
  @HostListener('window:beforeunload', ['$event'])
  protected antesDeSalir(event: BeforeUnloadEvent): void {
    if (this.sucio()) event.preventDefault();
  }

  protected async guardar(): Promise<void> {
    const p = this.programacion()!;
    const { tareas, vinculos } = this.gantt().serializar();
    const fechaInicio = tareas.map((t) => t.fechaInicio).sort()[0] ?? p.fechaInicio;
    this.guardando.set(true);
    const result = await attempt(this.snackBar, this.api.guardar(p.presupuestoId, { fechaInicio, escala: this.gantt().escalaActual(), tareas, vinculos }), 'Programación guardada');
    this.guardando.set(false);
    if (result.ok) {
      this.programacion.set(result.value);
      this.sucio.set(false);
    }
  }

  protected async generar(): Promise<void> {
    const p = this.programacion()!;
    const reemplaza = p.tareas.length > 0 || this.sucio();
    const dto = await firstValueFrom(
      this.dialog
        .open<GenerarDialogComponent, GenerarDialogData, GenerarProgramacionDto>(GenerarDialogComponent, {
          data: { fechaInicio: p.fechaInicio, duracionDias: p.duracionPresupuesto, reemplaza },
        })
        .afterClosed(),
    );
    if (!dto) return;
    const result = await attempt(this.snackBar, this.api.generar(p.presupuestoId, dto), 'Programación generada desde el presupuesto');
    if (result.ok) this.usar(result.value);
  }

  protected empezarEnBlanco(): void {
    this.enBlanco.set(true);
    queueMicrotask(() => this.gantt().agregar('task'));
  }

  protected agregar(tipo: TipoTarea): void {
    this.gantt().agregar(tipo);
  }

  protected cambiarEscala(escala: EscalaProgramacion): void {
    this.escala.set(escala);
    this.gantt().setEscala(escala);
  }

  protected ajustar(): void {
    const movidas = this.gantt().ajustarPorDependencias();
    this.snackBar.open(movidas ? `${movidas} actividad(es) movidas para cumplir sus dependencias` : 'Todas las actividades cumplen sus dependencias', 'Cerrar', {
      duration: 4000,
    });
  }

  protected filtrar(texto: string, filtro: FiltroTareas): void {
    this.texto.set(texto);
    this.filtro.set(filtro);
    if (filtro === 'criticas' && !this.gantt().rutaCriticaVisible()) this.gantt().mostrarRutaCritica(true);
    this.gantt().filtrar(texto, filtro);
  }

  protected exportar(formato: FormatoExportacion): void {
    this.gantt().exportar(formato);
    this.snackBar.open('Preparando el archivo en el servicio de exportación de DHTMLX…', 'Cerrar', { duration: 4000 });
  }

  protected imprimir(): void {
    window.print();
  }

  protected async eliminar(): Promise<void> {
    const p = this.programacion()!;
    const ok = await firstValueFrom(
      this.dialog
        .open<ConfirmDialogComponent, ConfirmDialogData, boolean>(ConfirmDialogComponent, {
          data: { title: 'Eliminar programación', message: `¿Eliminar la programación de ${p.codigo} con todas sus actividades y dependencias?`, confirmText: 'Eliminar' },
        })
        .afterClosed(),
    );
    if (!ok) return;
    const result = await attempt(this.snackBar, this.api.eliminar(p.presupuestoId), 'Programación eliminada');
    if (result.ok) this.usar(await firstValueFrom(this.api.get(p.presupuestoId)));
  }

  private usar(p: Programacion): void {
    this.programacion.set(p);
    this.enBlanco.set(false);
    this.escala.set(p.escala);
    this.sucio.set(false);
    this.gantt().cargar(p);
  }
}
