import { ApuCatalogos } from '../models/apu.model';

/**
 * Catálogos simulados con los insumos y precios que trae el formato Excel.
 * Se reemplazan por la API de mantenimiento cuando el APU se guarde en el backend.
 */
export const APU_CATALOGOS_MOCK: ApuCatalogos = {
  materiales: [
    { id: 1, descripcion: 'MINERAL ROJO', unidad: 'KG', precio: 4700 },
    { id: 2, descripcion: 'APOYO DE NEOPRENO', unidad: 'UN', precio: 66950 },
    { id: 3, descripcion: 'ADOQ.GREES PEATO.11X20X2.5', unidad: 'M2', precio: 20000 },
    { id: 4, descripcion: 'ALQUITRAN', unidad: 'KG', precio: 2300 },
    { id: 5, descripcion: 'CONCRETO ARGOS 5000 PSI FLUIDO', unidad: 'M3', precio: 378763 },
  ],
  manoObra: [
    { id: 101, descripcion: 'AUXILIAR OFICIOS VARIOS NOCTURNO', jornal: 34583.53 },
    { id: 102, descripcion: 'M.O. TOPOGRAFIA 1 CADENERO-1 TOP', jornal: 211628.24 },
    { id: 103, descripcion: 'MANO OBRA OFICIAL ALBANILERIA', jornal: 42174.12 },
    { id: 104, descripcion: 'M.O. ALBANILERIA 1 AYUDANTE-1 OFI', jornal: 76842.35 },
    { id: 105, descripcion: 'M.O. ALBANILERIA 1 AYUDANTE', jornal: 28818.82 },
    { id: 106, descripcion: 'M.O. TRAZADO DE LOSAS 1 CONTRAMAESTRO- 1 MAESTRO', jornal: 113336.47 },
    { id: 107, descripcion: 'ARQUITECTO', jornal: 96470.59 },
  ],
  equipos: [
    { id: 201, descripcion: 'COMPRESOR DE DOS MARTILLOS 60 LBS', unidad: 'HR', precio: 27500 },
    { id: 202, descripcion: 'RETROEXCAVADORA JD-510', unidad: 'HR', precio: 88000 },
    { id: 203, descripcion: 'VIBRADOR ELECTRICO', unidad: 'DIA', precio: 55000 },
    { id: 204, descripcion: 'HERRAMIENTA MENOR', unidad: 'GLB', precio: 1400 },
  ],
};
