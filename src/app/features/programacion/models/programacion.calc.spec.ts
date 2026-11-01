import { Arco, Nodo, aDia, ajustarPorDependencias, avancePonderado, deDia, inicioExigido, rutaCritica } from './programacion.calc';

const n = (id: string, inicio: number, duracion: number, parentId: string | null = null, tipo: Nodo['tipo'] = 'task'): Nodo => ({ id, inicio, duracion, parentId, tipo });
const fc = (origen: string, destino: string, desfase = 0): Arco => ({ origen, destino, tipo: 0, desfase });

describe('programacion.calc', () => {
  it('convierte fechas a días y de vuelta sin correrse por la zona horaria', () => {
    expect(deDia(aDia('2026-11-02'))).toBe('2026-11-02');
    expect(aDia(new Date(2026, 10, 3)) - aDia('2026-11-02')).toBe(1);
  });

  it('calcula el inicio exigido por los cuatro tipos de vínculo', () => {
    const origen = n('a', 10, 5); // termina el día 15
    expect(inicioExigido(origen, 3, { tipo: 0, desfase: 2 })).toBe(17);
    expect(inicioExigido(origen, 3, { tipo: 1, desfase: 1 })).toBe(11);
    expect(inicioExigido(origen, 3, { tipo: 2, desfase: 0 })).toBe(12);
    expect(inicioExigido(origen, 3, { tipo: 3, desfase: 0 })).toBe(7);
  });

  it('mueve hacia adelante las actividades que no cumplen sus dependencias, en cadena', () => {
    const cambios = ajustarPorDependencias([n('a', 0, 5), n('b', 2, 3), n('c', 4, 2)], [fc('a', 'b'), fc('b', 'c', 1)]);
    expect(cambios.get('b')).toBe(5);
    expect(cambios.get('c')).toBe(9);
  });

  it('no adelanta actividades que ya empiezan después de lo exigido', () => {
    expect(ajustarPorDependencias([n('a', 0, 5), n('b', 10, 3)], [fc('a', 'b')]).size).toBe(0);
  });

  it('aplica a las actividades los vínculos de su capítulo', () => {
    const nodos = [n('c1', 0, 5, null, 'project'), n('a', 0, 5, 'c1'), n('c2', 0, 4, null, 'project'), n('b', 1, 4, 'c2')];
    const cambios = ajustarPorDependencias(nodos, [fc('c1', 'c2')]);
    expect(cambios.get('b')).toBe(5);
    expect(cambios.has('c2')).toBeFalse();
  });

  it('marca como crítica la cadena más larga y deja holgura a la paralela', () => {
    // a(0-5) → c(5-10); b(0-2) → c. b puede atrasarse 3 días.
    const holguras = rutaCritica([n('a', 0, 5), n('b', 0, 2), n('c', 5, 5)], [fc('a', 'c'), fc('b', 'c')]);
    expect(holguras.get('a')!.critica).toBeTrue();
    expect(holguras.get('c')!.critica).toBeTrue();
    expect(holguras.get('b')!.total).toBe(3);
    expect(holguras.get('b')!.critica).toBeFalse();
  });

  it('respeta el capítulo como límite y no se bloquea con ciclos', () => {
    const nodos = [n('p', 0, 10, null, 'project'), n('x', 0, 4, 'p'), n('y', 0, 10, 'p'), n('fin', 10, 0, null, 'milestone')];
    const holguras = rutaCritica(nodos, [fc('p', 'fin'), fc('x', 'y'), fc('y', 'x')]);
    expect(holguras.get('y')!.critica).toBeTrue();
    expect(holguras.get('fin')!.critica).toBeTrue();
  });

  it('pondera el avance por valor y, sin valores, por duración', () => {
    const tareas = [
      { id: 'p', parentId: null, tipo: 'project' as const, duracion: 10, progreso: 0, valor: 400 },
      { id: 'a', parentId: 'p', tipo: 'task' as const, duracion: 2, progreso: 1, valor: 300 },
      { id: 'b', parentId: 'p', tipo: 'task' as const, duracion: 8, progreso: 0, valor: 100 },
    ];
    const { porCapitulo, total } = avancePonderado(tareas);
    expect(porCapitulo.get('p')).toBeCloseTo(0.75);
    expect(total).toBeCloseTo(0.75);

    const sinValor = avancePonderado(tareas.map((t) => ({ ...t, valor: null })));
    expect(sinValor.porCapitulo.get('p')).toBeCloseTo(0.2);
  });
});
