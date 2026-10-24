import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, Validators } from '@angular/forms';

import { fechaIso, fechaLocal } from '../../../shared/utils/fecha.utils';
import { AIU_POR_DEFECTO, Presupuesto, PresupuestoDto, PresupuestoItem } from './presupuesto.model';

/** Formularios tipados del presupuesto. Los porcentajes se escriben en % y viajan como fracción. */

export type ItemForm = FormGroup<{
  apuId: FormControl<string | null>;
  apuCodigo: FormControl<string | null>;
  descripcion: FormControl<string>;
  unidadMedidaId: FormControl<number | null>;
  cantidad: FormControl<number>;
  valorUnitario: FormControl<number>;
  /** Costo actual del APU, solo para avisar si el valor quedó desactualizado. */
  costoApuActual: FormControl<number | null>;
}>;

export type CapituloForm = FormGroup<{
  nombre: FormControl<string>;
  items: FormArray<ItemForm>;
}>;

export type PresupuestoForm = FormGroup<{
  encabezado: FormGroup<{
    nombreObra: FormControl<string>;
    cliente: FormControl<string>;
    ubicacion: FormControl<string>;
    fecha: FormControl<Date | null>;
    propuestaNumero: FormControl<string>;
    duracionDias: FormControl<number | null>;
    anticipoPct: FormControl<number | null>;
    observaciones: FormControl<string>;
  }>;
  aiu: FormGroup<{
    administracion: FormControl<number>;
    imprevistos: FormControl<number>;
    utilidad: FormControl<number>;
    ivaUtilidad: FormControl<number>;
  }>;
  capitulos: FormArray<CapituloForm>;
}>;

const texto = [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)];
const porcentaje = [Validators.required, Validators.min(0), Validators.max(100)];

export function crearItem(fb: NonNullableFormBuilder, i?: Partial<PresupuestoItem>): ItemForm {
  return fb.group({
    apuId: fb.control<string | null>(i?.apuId ?? null),
    apuCodigo: fb.control<string | null>(i?.apuCodigo ?? null),
    descripcion: fb.control(i?.descripcion ?? '', texto),
    unidadMedidaId: fb.control<number | null>(i?.unidadMedidaId ?? null, Validators.required),
    cantidad: fb.control(i?.cantidad ?? 1, [Validators.required, Validators.min(0.0001)]),
    valorUnitario: fb.control(i?.valorUnitario ?? 0, [Validators.required, Validators.min(0)]),
    costoApuActual: fb.control<number | null>(i?.costoApuActual ?? null),
  });
}

export function crearCapitulo(fb: NonNullableFormBuilder, nombre = '', items: ItemForm[] = []): CapituloForm {
  return fb.group({ nombre: fb.control(nombre, texto), items: fb.array(items) });
}

const pct = (fraccion: number | null | undefined): number | null => (fraccion === null || fraccion === undefined ? null : Math.round(fraccion * 10000) / 100);

/** Formulario vacío (un capítulo) o con un presupuesto guardado. */
export function crearPresupuesto(fb: NonNullableFormBuilder, p?: Presupuesto): PresupuestoForm {
  return fb.group({
    encabezado: fb.group({
      nombreObra: fb.control(p?.nombreObra ?? '', texto),
      cliente: fb.control(p?.cliente ?? '', Validators.maxLength(200)),
      ubicacion: fb.control(p?.ubicacion ?? '', Validators.maxLength(200)),
      fecha: fb.control<Date | null>(p ? fechaLocal(p.fecha) : new Date(), Validators.required),
      propuestaNumero: fb.control(p?.propuestaNumero ?? '', Validators.maxLength(30)),
      duracionDias: fb.control<number | null>(p?.duracionDias ?? null, Validators.min(1)),
      anticipoPct: fb.control<number | null>(pct(p?.anticipoPct), [Validators.min(0), Validators.max(100)]),
      observaciones: fb.control(p?.observaciones ?? '', Validators.maxLength(1000)),
    }),
    aiu: fb.group({
      administracion: fb.control(pct(p?.administracionPct) ?? AIU_POR_DEFECTO.administracion, porcentaje),
      imprevistos: fb.control(pct(p?.imprevistosPct) ?? AIU_POR_DEFECTO.imprevistos, porcentaje),
      utilidad: fb.control(pct(p?.utilidadPct) ?? AIU_POR_DEFECTO.utilidad, porcentaje),
      ivaUtilidad: fb.control(pct(p?.ivaUtilidadPct) ?? AIU_POR_DEFECTO.ivaUtilidad, porcentaje),
    }),
    capitulos: fb.array(
      p ? p.capitulos.map((c) => crearCapitulo(fb, c.nombre, c.items.map((i) => crearItem(fb, i)))) : [crearCapitulo(fb, 'PRELIMINARES')],
    ),
  });
}

const fraccion = (v: number | null): number | null => (v === null ? null : Math.round(v * 100) / 10000);

export function aDto(v: ReturnType<PresupuestoForm['getRawValue']>): PresupuestoDto {
  const e = v.encabezado;
  return {
    nombreObra: e.nombreObra.trim(),
    cliente: e.cliente.trim() || null,
    ubicacion: e.ubicacion.trim() || null,
    fecha: e.fecha ? fechaIso(e.fecha) : null,
    propuestaNumero: e.propuestaNumero.trim() || null,
    administracionPct: fraccion(v.aiu.administracion)!,
    imprevistosPct: fraccion(v.aiu.imprevistos)!,
    utilidadPct: fraccion(v.aiu.utilidad)!,
    ivaUtilidadPct: fraccion(v.aiu.ivaUtilidad)!,
    duracionDias: e.duracionDias || null,
    anticipoPct: fraccion(e.anticipoPct),
    observaciones: e.observaciones.trim() || null,
    capitulos: v.capitulos.map((c) => ({
      nombre: c.nombre.trim(),
      items: c.items.map((i) => ({
        apuId: i.apuId,
        descripcion: i.descripcion.trim(),
        unidadMedidaId: i.unidadMedidaId!,
        cantidad: i.cantidad,
        valorUnitario: i.valorUnitario,
      })),
    })),
  };
}
