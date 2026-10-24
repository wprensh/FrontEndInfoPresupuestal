import { TestBed } from '@angular/core/testing';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/auth/auth.service';
import { ApuApiService } from '../../data-access/apu-api.service';
import { ApuFormPageComponent } from './apu-form-page.component';

describe('ApuFormPageComponent', () => {
  async function setup(puede = true) {
    TestBed.configureTestingModule({
      imports: [ApuFormPageComponent],
      providers: [
        provideRouter([]),
        provideNativeDateAdapter(),
        provideNoopAnimations(),
        { provide: AuthService, useValue: { can: () => puede } },
        { provide: ApuApiService, useValue: { unidades: () => of([{ id: 3, codigo: 'M2', nombre: 'Metro cuadrado' }]), buscarInsumos: () => of([]) } },
      ],
    });
    const fixture = TestBed.createComponent(ApuFormPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    // Acceso a miembros protegidos solo para la prueba.
    const page = fixture.componentInstance as any;
    return { fixture, page, form: page.form() };
  }

  it('arranca inválido con una línea por sección', async () => {
    const { form, page } = await setup();
    expect(page.unidades().length).toBe(1);
    expect(form.invalid).toBeTrue();
    expect(form.controls.materiales.length).toBe(1);
    expect(form.controls.manoObra.length).toBe(1);
    expect(form.controls.equipo.length).toBe(1);
  });

  it('recalcula el costo directo al cambiar las líneas', async () => {
    const { form, page } = await setup();
    form.controls.manoObra.clear();
    form.controls.materiales.at(0).patchValue({ cantidad: 2, precioUnitario: 100, desperdicio: 0 });
    form.controls.equipo.at(0).patchValue({ incidencia: 1, precioUnitario: 50 });
    expect(page.totales().costoDirecto).toBe(250);
  });

  it('exige al menos un insumo', async () => {
    const { form } = await setup();
    form.controls.materiales.clear();
    form.controls.manoObra.clear();
    form.controls.equipo.clear();
    expect(form.hasError('sinInsumos')).toBeTrue();
  });

  it('queda válido con encabezado y una línea completa', async () => {
    const { form } = await setup();
    form.controls.manoObra.clear();
    form.controls.equipo.clear();
    form.controls.encabezado.patchValue({ descripcion: 'REPLANTEO', unidadMedidaId: 3 });
    form.controls.materiales.at(0).patchValue({ descripcion: 'MINERAL ROJO', unidadMedidaId: 3, cantidad: 23, precioUnitario: 4700 });
    expect(form.valid).toBeTrue();
  });

  it('queda de solo lectura sin permiso', async () => {
    const { form } = await setup(false);
    expect(form.disabled).toBeTrue();
  });
});
