import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

/** Piezas de Angular Material que usa la feature de control presupuestal. */
export const BUDGET_MATERIAL = [
  MatButtonModule,
  MatChipsModule,
  MatIconModule,
  MatProgressBarModule,
  MatSnackBarModule,
  MatTableModule,
  MatTooltipModule,
] as const;
