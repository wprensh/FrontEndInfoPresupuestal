/**
 * Valor en letras para documentos en pesos colombianos, como la celda
 * "VALOR TOTAL DE PRESUPUESTO (EN LETRAS)" del Excel: `UN MILLÓN DOSCIENTOS MIL PESOS M/CTE`.
 */

const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const ESPECIALES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const VEINTIS = ['VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

/** 0–999 en letras ("UN" en lugar de "UNO" porque siempre precede a un sustantivo). */
function centenas(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const partes = [CENTENAS[c]];
  if (resto >= 30) {
    partes.push(DECENAS[Math.floor(resto / 10)] + (resto % 10 ? ` Y ${UNIDADES[resto % 10]}` : ''));
  } else if (resto >= 20) {
    partes.push(VEINTIS[resto - 20]);
  } else if (resto >= 10) {
    partes.push(ESPECIALES[resto - 10]);
  } else if (resto > 0) {
    partes.push(UNIDADES[resto]);
  }
  return partes.filter(Boolean).join(' ');
}

/** Entero no negativo en letras, hasta billones. */
export function enteroALetras(valor: number): string {
  let n = Math.floor(Math.abs(valor));
  if (n === 0) return 'CERO';
  const grupos: string[] = [];
  const escalas: [number, string, string][] = [
    [1e12, 'BILLÓN', 'BILLONES'],
    [1e6, 'MILLÓN', 'MILLONES'],
  ];
  for (const [base, singular, plural] of escalas) {
    const q = Math.floor(n / base);
    if (q > 0) {
      grupos.push(q === 1 ? `UN ${singular}` : `${enteroALetras(q)} ${plural}`);
      n %= base;
    }
  }
  const miles = Math.floor(n / 1000);
  if (miles > 0) grupos.push(miles === 1 ? 'MIL' : `${centenas(miles)} MIL`);
  grupos.push(centenas(n % 1000));
  return grupos.filter(Boolean).join(' ');
}

/** `1200000` → `UN MILLÓN DOSCIENTOS MIL PESOS M/CTE`. Los millones exactos llevan "DE PESOS". */
export function pesosEnLetras(valor: number): string {
  const entero = Math.trunc(valor);
  const letras = enteroALetras(entero);
  const exacto = entero !== 0 && entero % 1_000_000 === 0;
  return `${letras}${exacto ? ' DE' : ''} ${entero === 1 ? 'PESO' : 'PESOS'} M/CTE`;
}
