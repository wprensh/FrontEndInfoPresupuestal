import { calcularTotales, totalEquipo, totalJornal, totalManoObra, totalMaterial } from './apu.calc';

describe('apu.calc', () => {
  it('suma el desperdicio al material como en la hoja (E*G*F + E*G)', () => {
    // MINERAL ROJO de REPLANTEO: 23 KG × 4.700 con 5 %.
    expect(totalMaterial({ cantidad: 23, precioUnitario: 4700, desperdicio: 5 })).toBeCloseTo(113505, 6);
  });

  it('divide el jornal con prestaciones entre el rendimiento', () => {
    const linea = { jornal: 42174.12, prestaciones: 1.7, rendimiento: 250 };
    expect(totalJornal(linea)).toBeCloseTo(71696.004, 3);
    expect(totalManoObra(linea)).toBeCloseTo(286.784016, 6);
  });

  it('no aporta mano de obra sin rendimiento', () => {
    expect(totalManoObra({ jornal: 1000, prestaciones: 1.7, rendimiento: 0 })).toBe(0);
  });

  it('multiplica incidencia por precio en el equipo', () => {
    expect(totalEquipo({ incidencia: 0.23, precioUnitario: 88000 })).toBeCloseTo(20240, 6);
  });

  it('trata valores vacíos como cero y suma las tres secciones', () => {
    const t = calcularTotales({
      materiales: [{ cantidad: 2, precioUnitario: 100, desperdicio: 10 }, { cantidad: undefined }],
      manoObra: [{ jornal: 100, prestaciones: 2, rendimiento: 4 }],
      equipo: [{ incidencia: 3, precioUnitario: 10 }],
    });
    expect(t).toEqual({ materiales: 220, manoObra: 50, equipo: 30, costoDirecto: 300 });
  });
});
