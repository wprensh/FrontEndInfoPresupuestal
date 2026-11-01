import { Presupuesto } from '../../presupuestos/models/presupuesto.model';

/** Membrete con que la empresa imprime sus presupuestos (`/api/impresion/configuracion`). */
export interface ConfiguracionImpresion {
  razonSocial: string;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  email: string | null;
  sitioWeb: string | null;
  /** Data URL de la imagen (PNG, JPG o WebP). */
  logo: string | null;
  colorPrimario: string;
  encabezado: string | null;
  piePagina: string | null;
  firmaNombre: string | null;
  firmaCargo: string | null;
  firmaMatricula: string | null;
  mostrarApu: boolean;
  mostrarParticipacion: boolean;
  mostrarValorLetras: boolean;
  /** false mientras la empresa no ha guardado su formato: se usan los datos de la empresa. */
  personalizada: boolean;
  actualizadoEn: string | null;
}

export type ConfiguracionImpresionDto = Omit<ConfiguracionImpresion, 'personalizada' | 'actualizadoEn'>;

/** Respuesta de `/api/presupuestos/:id/impresion`. */
export interface PresupuestoImpresion {
  empresa: ConfiguracionImpresion;
  presupuesto: Presupuesto;
}

/** Tamaño máximo del logo que acepta la API. */
export const LOGO_MAX_BYTES = 512 * 1024;
export const LOGO_TIPOS = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** Colores sugeridos: el institucional de la aplicación primero. */
export const COLORES_SUGERIDOS = ['#006a6a', '#0d47a1', '#1b5e20', '#b71c1c', '#4a148c', '#e65100', '#37474f', '#000000'] as const;

/** Presupuesto de ejemplo para la vista previa del formato. */
export const PRESUPUESTO_MUESTRA: Presupuesto = {
  id: 'muestra',
  codigo: 'PRE-0001',
  nombreObra: 'CONSTRUCCIÓN VIVIENDA UNIFAMILIAR',
  cliente: 'Cliente de ejemplo',
  ubicacion: 'Bogotá D.C.',
  fecha: new Date().toISOString().slice(0, 10),
  propuestaNumero: '001-2026',
  estado: 'APROBADO',
  moneda: 'COP',
  administracionPct: 0.09,
  imprevistosPct: 0.03,
  utilidadPct: 0.08,
  ivaUtilidadPct: 0.19,
  duracionDias: 90,
  anticipoPct: 0.3,
  observaciones: null,
  capitulos: [
    {
      id: 1,
      numero: 1,
      nombre: 'PRELIMINARES',
      subtotal: 3_600_000,
      participacion: 0.15,
      items: [
        { id: 11, codigo: '1.1', numero: 1, apuId: null, apuCodigo: 'APU-0001', descripcion: 'LOCALIZACIÓN Y REPLANTEO', unidadMedidaId: 1, unidad: 'M2', cantidad: 120, valorUnitario: 5_000, valorTotal: 600_000, costoApuActual: null },
        { id: 12, codigo: '1.2', numero: 2, apuId: null, apuCodigo: 'APU-0002', descripcion: 'DESCAPOTE A MANO E=0.20 M', unidadMedidaId: 1, unidad: 'M2', cantidad: 120, valorUnitario: 25_000, valorTotal: 3_000_000, costoApuActual: null },
      ],
    },
    {
      id: 2,
      numero: 2,
      nombre: 'CIMENTACIÓN',
      subtotal: 20_400_000,
      participacion: 0.85,
      items: [
        { id: 21, codigo: '2.1', numero: 1, apuId: null, apuCodigo: 'APU-0003', descripcion: 'CONCRETO CICLÓPEO 2500 PSI', unidadMedidaId: 2, unidad: 'M3', cantidad: 24, valorUnitario: 450_000, valorTotal: 10_800_000, costoApuActual: null },
        { id: 22, codigo: '2.2', numero: 2, apuId: null, apuCodigo: 'APU-0004', descripcion: 'VIGA DE CIMENTACIÓN 0.30 X 0.30', unidadMedidaId: 3, unidad: 'ML', cantidad: 80, valorUnitario: 120_000, valorTotal: 9_600_000, costoApuActual: null },
      ],
    },
  ],
  totales: {
    costoDirecto: 24_000_000,
    administracion: 2_160_000,
    imprevistos: 720_000,
    utilidad: 1_920_000,
    totalAiu: 4_800_000,
    ivaUtilidad: 364_800,
    costosIndirectos: 5_164_800,
    valorTotal: 29_164_800,
    anticipo: 8_749_440,
  },
  itemsDesactualizados: 0,
  actualizadoEn: new Date().toISOString(),
};
