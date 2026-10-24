import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ApuCatalogosService } from '../../data-access/apu-catalogos.service';
import { ApuFormPageComponent } from './apu-form-page.component';

describe('ApuFormPageComponent', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [ApuFormPageComponent],
      providers: [ApuCatalogosService, provideNativeDateAdapter(), provideNoopAnimations()],
    });
    const fixture = TestBed.createComponent(ApuFormPageComponent);
    fixture.detectChanges();
    // Acceso a miembros protegidos solo para la prueba.
    return { fixture, page: fixture.componentInstance as any };
  }

  it('arranca inválido con una línea por sección', () => {
    const { page } = setup();
    expect(page.form.invalid).toBeTrue();
    expect(page.form.controls.materiales.length).toBe(1);
    expect(page.form.controls.manoObra.length).toBe(1);
    expect(page.form.controls.equipo.length).toBe(1);
  });

  it('recalcula el costo directo al cambiar las líneas', () => {
    const { page } = setup();
    page.form.controls.materiales.at(0).patchValue({ cantidad: 2, precioUnitario: 100, desperdicio: 0 });
    page.form.controls.equipo.at(0).patchValue({ incidencia: 1, precioUnitario: 50 });
    expect(page.totales().costoDirecto).toBe(250);
  });

  it('exige al menos un insumo', () => {
    const { page } = setup();
    page.form.controls.materiales.clear();
    page.form.controls.manoObra.clear();
    page.form.controls.equipo.clear();
    expect(page.form.hasError('sinInsumos')).toBeTrue();
  });

  it('queda válido con encabezado y una línea completa', () => {
    const { page } = setup();
    page.form.controls.manoObra.clear();
    page.form.controls.equipo.clear();
    page.encabezado.patchValue({ descripcion: 'REPLANTEO', unidad: 'M2' });
    page.form.controls.materiales.at(0).patchValue({ insumoId: 1, descripcion: 'MINERAL ROJO', unidad: 'KG', cantidad: 23, precioUnitario: 4700 });
    expect(page.form.valid).toBeTrue();
  });
});
