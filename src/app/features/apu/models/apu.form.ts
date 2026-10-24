import { AbstractControl, FormArray, FormControl, FormGroup, NonNullableFormBuilder, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

import { fechaIso, fechaLocal } from '../../../shared/utils/fecha.utils';
import { Apu, ApuDto, ApuFormValue, ApuLinea, FACTOR_PRESTACIONES } from './apu.model';

/** Formularios tipados del APU. Las fábricas reciben el builder para usarse desde cualquier componente. */

export type MaterialForm = FormGroup<{
  insumoId: FormControl<string | null>;
  descripcion: FormControl<string>;
  unidadMedidaId: FormControl<number | null>;
  cantidad: FormControl<number>;
  desperdicio: FormControl<number>;
  precioUnitario: FormControl<number>;
}>;

export type ManoObraForm = FormGroup<{
  insumoId: FormControl<string | null>;
  descripcion: FormControl<string>;
  jornal: FormControl<number>;
  prestaciones: FormControl<number>;
  rendimiento: FormControl<number>;
}>;

export type EquipoForm = FormGroup<{
  insumoId: FormControl<string | null>;
  descripcion: FormControl<string>;
  unidadMedidaId: FormControl<number | null>;
  incidencia: FormControl<number>;
  precioUnitario: FormControl<number>;
}>;

export type ApuForm = FormGroup<{
  encabezado: FormGroup<{
    descripcion: FormControl<string>;
    unidadMedidaId: FormControl<number | null>;
    fecha: FormControl<Date | null>;
    observaciones: FormControl<string>;
    activo: FormControl<boolean>;
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

export function crearMaterial(fb: NonNullableFormBuilder, l?: ApuLinea): MaterialForm {
  return fb.group({
    insumoId: fb.control<string | null>(l?.insumoId ?? null),
    descripcion: fb.control(l?.descripcion ?? '', texto),
    unidadMedidaId: fb.control<number | null>(l?.unidadMedidaId ?? null, Validators.required),
    cantidad: fb.control(l?.cantidad ?? 1, [Validators.required, positivo]),
    desperdicio: fb.control(l ? redondear(l.desperdicio * 100, 2) : 5, [Validators.required, Validators.min(0), Validators.max(100)]),
    precioUnitario: fb.control(l?.precioUnitario ?? 0, [Validators.required, Validators.min(0)]),
  });
}

export function crearManoObra(fb: NonNullableFormBuilder, l?: ApuLinea): ManoObraForm {
  return fb.group({
    insumoId: fb.control<string | null>(l?.insumoId ?? null),
    descripcion: fb.control(l?.descripcion ?? '', texto),
    jornal: fb.control(l?.precioUnitario ?? 0, [Validators.required, Validators.min(0)]),
    prestaciones: fb.control(l?.factorPrestacional ?? FACTOR_PRESTACIONES, [Validators.required, Validators.min(1), Validators.max(3)]),
    rendimiento: fb.control(l?.rendimiento ?? 1, [Validators.required, positivo]),
  });
}

export function crearEquipo(fb: NonNullableFormBuilder, l?: ApuLinea): EquipoForm {
  return fb.group({
    insumoId: fb.control<string | null>(l?.insumoId ?? null),
    descripcion: fb.control(l?.descripcion ?? '', texto),
    unidadMedidaId: fb.control<number | null>(l?.unidadMedidaId ?? null, Validators.required),
    incidencia: fb.control(l?.cantidad ?? 1, [Validators.required, positivo]),
    precioUnitario: fb.control(l?.precioUnitario ?? 0, [Validators.required, Validators.min(0)]),
  });
}

/** Formulario de un APU nuevo (una línea por sección, como la plantilla FORMATOAPU) o de uno existente. */
export function crearApu(fb: NonNullableFormBuilder, apu?: Apu): ApuForm {
  return fb.group(
    {
      encabezado: fb.group({
        descripcion: fb.control(apu?.descripcion ?? '', texto),
        unidadMedidaId: fb.control<number | null>(apu?.unidadMedidaId ?? null, Validators.required),
        fecha: fb.control<Date | null>(apu ? fechaLocal(apu.fecha) : new Date(), Validators.required),
        observaciones: fb.control(apu?.observaciones ?? '', Validators.maxLength(500)),
        activo: fb.control(apu?.activo ?? true),
      }),
      materiales: fb.array(apu ? apu.materiales.map((l) => crearMaterial(fb, l)) : [crearMaterial(fb)]),
      manoObra: fb.array(apu ? apu.manoObra.map((l) => crearManoObra(fb, l)) : [crearManoObra(fb)]),
      equipo: fb.array(apu ? apu.equipo.map((l) => crearEquipo(fb, l)) : [crearEquipo(fb)]),
    },
    { validators: alMenosUnInsumo },
  );
}

/** Lo que espera la API: desperdicio como fracción y fecha ISO. */
export function aDto(v: ApuFormValue): ApuDto {
  return {
    descripcion: v.encabezado.descripcion.trim(),
    unidadMedidaId: v.encabezado.unidadMedidaId!,
    fecha: v.encabezado.fecha ? fechaIso(v.encabezado.fecha) : null,
    observaciones: v.encabezado.observaciones.trim() || null,
    activo: v.encabezado.activo,
    materiales: v.materiales.map((m) => ({
      insumoId: m.insumoId,
      descripcion: m.descripcion.trim(),
      unidadMedidaId: m.unidadMedidaId!,
      cantidad: m.cantidad,
      desperdicio: redondear(m.desperdicio / 100, 4),
      precioUnitario: m.precioUnitario,
    })),
    equipo: v.equipo.map((e) => ({
      insumoId: e.insumoId,
      descripcion: e.descripcion.trim(),
      unidadMedidaId: e.unidadMedidaId!,
      incidencia: e.incidencia,
      precioUnitario: e.precioUnitario,
    })),
    manoObra: v.manoObra.map((m) => ({
      insumoId: m.insumoId,
      descripcion: m.descripcion.trim(),
      jornal: m.jornal,
      factorPrestacional: m.prestaciones,
      rendimiento: m.rendimiento,
    })),
  };
}

const redondear = (v: number, decimales: number): number => Math.round(v * 10 ** decimales) / 10 ** decimales;

