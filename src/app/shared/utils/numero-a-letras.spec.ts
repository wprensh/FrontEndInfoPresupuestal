import { enteroALetras, pesosEnLetras } from './numero-a-letras';

describe('numero-a-letras', () => {
  it('escribe los casos especiales del español', () => {
    expect(enteroALetras(0)).toBe('CERO');
    expect(enteroALetras(15)).toBe('QUINCE');
    expect(enteroALetras(21)).toBe('VEINTIÚN');
    expect(enteroALetras(45)).toBe('CUARENTA Y CINCO');
    expect(enteroALetras(100)).toBe('CIEN');
    expect(enteroALetras(101)).toBe('CIENTO UN');
    expect(enteroALetras(1000)).toBe('MIL');
    expect(enteroALetras(2500)).toBe('DOS MIL QUINIENTOS');
  });

  it('maneja millones y billones', () => {
    expect(enteroALetras(1_000_000)).toBe('UN MILLÓN');
    expect(enteroALetras(21_000_000)).toBe('VEINTIÚN MILLONES');
    expect(enteroALetras(189_167_281)).toBe('CIENTO OCHENTA Y NUEVE MILLONES CIENTO SESENTA Y SIETE MIL DOSCIENTOS OCHENTA Y UN');
    expect(enteroALetras(2_000_000_000_000)).toBe('DOS BILLONES');
  });

  it('agrega la moneda como el Excel', () => {
    expect(pesosEnLetras(1_200_000)).toBe('UN MILLÓN DOSCIENTOS MIL PESOS M/CTE');
    expect(pesosEnLetras(3_000_000)).toBe('TRES MILLONES DE PESOS M/CTE');
    expect(pesosEnLetras(1)).toBe('UN PESO M/CTE');
    expect(pesosEnLetras(1500.99)).toBe('MIL QUINIENTOS PESOS M/CTE');
  });
});
