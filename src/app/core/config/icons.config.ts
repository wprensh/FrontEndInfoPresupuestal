import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';

/** Hace que todos los `<mat-icon>` usen Material Symbols Outlined en lugar de Material Icons. */
export function provideMaterialSymbols(): EnvironmentProviders {
  return provideAppInitializer(() => {
    inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
  });
}
