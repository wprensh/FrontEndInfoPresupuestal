import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';

/** Placeholder del slice de dashboard; se completará con indicadores presupuestales. */
@Component({
  selector: 'app-dashboard-page',
  imports: [PageHeaderComponent, MatCardModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header title="Dashboard" subtitle="Resumen de la ejecución presupuestal" />
    <mat-card appearance="outlined">
      <mat-card-content>Próximamente: indicadores y gráficos.</mat-card-content>
    </mat-card>
  `,
})
export class DashboardPageComponent {}
