import { calcularTotales, valorItem } from './presupuesto.calc';

describe('presupuesto.calc', () => {
  it('redondea el valor del ítem a centavos', () => {
    expect(valorItem(1200, 134031.78)).toBe(160838136);
    expect(valorItem(3, 0.1)).toBe(0.3);
    expect(valorItem(null, 10)).toBe(0);
  });

  it('aplica AIU, IVA sobre la utilidad y trunca el total como la API', () => {
    // Mismo caso que la prueba con PostgreSQL: costo directo 162.180.453,80.
    const t = calcularTotales(162180453.8, { administracion: 0.1, imprevistos: 0.02, utilidad: 0.04, ivaUtilidad: 0.16 }, 0.12);
    expect(t.administracion).toBe(16218045.38);
    expect(t.imprevistos).toBe(3243609.08);
    expect(t.utilidad).toBe(6487218.15);
    expect(t.ivaUtilidad).toBe(1037954.9);
    expect(t.valorTotal).toBe(189167281);
    expect(t.anticipo).toBe(22700073.72);
  });

  it('sin anticipo no lo calcula', () => {
    expect(calcularTotales(1000, { administracion: 0, imprevistos: 0, utilidad: 0, ivaUtilidad: 0 }, null).anticipo).toBeNull();
  });
});
