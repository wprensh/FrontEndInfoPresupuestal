import { AbstractControl, FormArray, FormControl, FormGroup, NonNullableFormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { FACTOR_PRESTACIONES, Unidad } from './apu.model';

/** Formularios tipados del APU. Las fábricas reciben el builder para usarse desde cualquier componente. */

export type MaterialForm = FormGroup<{
  insumoId: FormControl<number | null>;
  descripcion: FormControl<string>;
  unidad: FormControl<Unidad | null>;
  cantidad: FormControl<number>;
  desperdicio: FormControl<number>;
  precioUnitario: FormControl<number>;
}>;

export type ManoObraForm = FormGroup<{
  insumoId: FormControl<number | null>;
  descripcion: FormControl<string>;
  jornal: FormControl<number>;
  prestaciones: FormControl<number>;
  rendimiento: FormControl<number>;
}>;

export type EquipoForm = FormGroup<{
  insumoId: FormControl<number | null>;
  descripcion: FormControl<string>;
  unidad: FormControl<Unidad | null>;
  incidencia: FormControl<number>;
  precioUnitario: FormControl<number>;
}>;

export type ApuForm = FormGroup<{
  encabezado: FormGroup<{
    item: FormControl<string>;
    descripcion: FormControl<string>;
    unidad: FormControl<Unidad | null>;
    fecha: FormControl<Date | null>;
  }>;
  materiales: FormArray<MaterialForm>;
  manoObra: FormArray<ManoObraForm>;
  equipo: FormArray<EquipoForm>;
}>;

/** Valor numérico estrictamente mayor que cero. */
export const positivo: ValidatorFn = (c: AbstractControl): ValidationErrors | null =>
  c.value === null || c.value === '' || Number(c.value) > 0 ? null : { positivo: true };

/** El APU necesita al menos un insumo en alguna de sus tres secciones. */
export const alMenosUnInsumo: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const g = c as ApuForm;
  const lineas = g.controls.materiales.length + g.controls.manoObra.length + g.controls.equipo.length;
  return lineas > 0 ? null : { sinInsumos: true };
};

const texto = [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)];

export function crearMaterial(fb: NonNullableFormBuilder): MaterialForm {
  return fb.group({
    insumoId: fb.control<number | null>(null, Validators.required),
    descripcion: fb.control('', texto),
    unidad: fb.control<Unidad | null>(null, Validators.required),
    cantidad: fb.control(1, [Validators.required, positivo]),
    desperdicio: fb.control(5, [Validators.required, Validators.min(0), Validators.max(100)]),
    precioUnitario: fb.control(0, [Validators.required, Validators.min(0)]),
  });
}

export function crearManoObra(fb: NonNullableFormBuilder): ManoObraForm {
  return fb.group({
    insumoId: fb.control<number | null>(null, Validators.required),
    descripcion: fb.control('', texto),
    jornal: fb.control(0, [Validators.required, Validators.min(0)]),
    prestaciones: fb.control(FACTOR_PRESTACIONES, [Validators.required, Validators.min(1), Validators.max(3)]),
    rendimiento: fb.control(1, [Validators.required, positivo]),
  });
}

export function crearEquipo(fb: NonNullableFormBuilder): EquipoForm {
  return fb.group({
    insumoId: fb.control<number | null>(null, Validators.required),
    descripcion: fb.control('', texto),
    unidad: fb.control<Unidad | null>(null, Validators.required),
    incidencia: fb.control(1, [Validators.required, positivo]),
    precioUnitario: fb.control(0, [Validators.required, Validators.min(0)]),
  });
}

/** Formulario vacío: una línea por sección, como la plantilla FORMATOAPU. */
export function crearApu(fb: NonNullableFormBuilder): ApuForm {
  return fb.group(
    {
      encabezado: fb.group({
        item: fb.control('', Validators.maxLength(20)),
        descripcion: fb.control('', texto),
        unidad: fb.control<Unidad | null>(null, Validators.required),
        fecha: fb.control<Date | null>(new Date(), Validators.required),
      }),
      materiales: fb.array([crearMaterial(fb)]),
      manoObra: fb.array([crearManoObra(fb)]),
      equipo: fb.array([crearEquipo(fb)]),
    },
    { validators: alMenosUnInsumo },
  );
}
