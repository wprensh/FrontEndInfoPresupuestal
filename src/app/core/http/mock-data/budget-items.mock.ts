/** Datos en memoria para `GET /budget/items` (solo desarrollo), en pesos colombianos. */
const split = (budget: number, executed: number) => [
  { type: 'materials', budget: budget * 0.52, executed: executed * 0.55 },
  { type: 'labor', budget: budget * 0.28, executed: executed * 0.26 },
  { type: 'equipment', budget: budget * 0.14, executed: executed * 0.13 },
  { type: 'indirect', budget: budget * 0.06, executed: executed * 0.06 },
];

const item = (id: string, name: string, budget: number, executed: number, physicalProgress: number) => ({
  id, code: id.padStart(2, '0'), name, budget, executed, physicalProgress, inputs: split(budget, executed),
});

export const BUDGET_ITEMS_MOCK = [
  item('1', 'Preliminares y terracerías', 1_850_000_000, 1_792_000_000, 100),
  item('2', 'Cimentación', 4_320_000_000, 4_510_000_000, 96),
  item('3', 'Estructura de concreto', 7_680_000_000, 5_210_000_000, 64),
  item('4', 'Albañilería y muros', 2_940_000_000, 1_080_000_000, 38),
  item('5', 'Instalación hidrosanitaria', 1_620_000_000, 372_000_000, 22),
  item('6', 'Instalación eléctrica', 1_380_000_000, 198_000_000, 15),
  item('7', 'Acabados', 2_310_000_000, 0, 0),
];
