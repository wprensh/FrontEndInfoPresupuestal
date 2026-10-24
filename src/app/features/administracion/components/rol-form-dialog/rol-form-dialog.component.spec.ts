import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ModuloInfo, RolDto } from '../../models/admin.model';
import { RolFormData, RolFormDialogComponent } from './rol-form-dialog.component';

const modulos: ModuloInfo[] = [
  { codigo: 'insumos', nombre: 'Insumos', grupo: 'M', alcance: 'Tenant', accionesAsignables: ['ver', 'insertar', 'editar', 'eliminar'] },
  { codigo: 'unidades-medida', nombre: 'Unidades', grupo: 'M', alcance: 'Global', accionesAsignables: ['ver'] },
];

describe('RolFormDialogComponent', () => {
  let close: jasmine.Spy;

  function create(): RolFormDialogComponent {
    close = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      imports: [RolFormDialogComponent],
      providers: [
        provideNoopAnimations(),
        { provide: MAT_DIALOG_DATA, useValue: { rol: null, modulos, soloLectura: false } satisfies RolFormData },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(RolFormDialogComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  // Acceso a los miembros protegidos para probar la lógica de la matriz.
  type Internals = { toggle: (m: ModuloInfo, a: string, c: boolean) => void; todo: (c: boolean) => void; submit: () => void; form: { setValue: (v: object) => void } };

  it('checking Editar also checks Ver, and unchecking Ver clears the row', () => {
    const dialog = create() as unknown as Internals;
    dialog.form.setValue({ nombre: 'Compras', descripcion: '' });

    dialog.toggle(modulos[0], 'editar', true);
    dialog.submit();
    expect((close.calls.mostRecent().args[0] as RolDto).permisos).toEqual([{ modulo: 'insumos', ver: true, insertar: false, editar: true, eliminar: false }]);

    dialog.toggle(modulos[0], 'ver', false);
    dialog.submit();
    expect((close.calls.mostRecent().args[0] as RolDto).permisos).toEqual([]);
  });

  it('"Marcar todo" only marks the actions each module allows', () => {
    const dialog = create() as unknown as Internals;
    dialog.form.setValue({ nombre: 'Todo', descripcion: '' });

    dialog.todo(true);
    dialog.submit();

    const permisos = (close.calls.mostRecent().args[0] as RolDto).permisos;
    expect(permisos.find((p) => p.modulo === 'unidades-medida')).toEqual({ modulo: 'unidades-medida', ver: true, insertar: false, editar: false, eliminar: false });
    expect(permisos.find((p) => p.modulo === 'insumos')?.eliminar).toBeTrue();
  });
});
