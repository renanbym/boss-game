import type { Point } from './Pathfinding'

/**
 * Fase do ciclo de uma árvore.
 * - `solid`: está no mapa e bloqueia passagem e tiros.
 * - `gone`: sumiu; a casa fica livre.
 * - `warning`: vai reaparecer; pisca, mas ainda não bloqueia.
 */
export type TreePhase = 'solid' | 'gone' | 'warning'

/** Duração de cada fase do ciclo das árvores, em segundos. */
export const TREE_CYCLE = {
  solid: 8,
  gone: 6,
  /** Tempo piscando antes de reaparecer. */
  warning: 2,
} as const

/** Estado de uma árvore. */
export interface TreeState {
  readonly tile: Point
  phase: TreePhase
  /** Segundos que faltam para a fase atual acabar. */
  timeLeft: number
}

/**
 * Controla o ciclo das árvores: ficam sólidas, somem e, antes de reaparecer,
 * piscam por `TREE_CYCLE.warning` segundos.
 *
 * Uma árvore só reaparece se a casa estiver livre; se houver alguém em cima,
 * ela continua piscando até a casa vagar (para ninguém ficar preso dentro dela).
 */
export class Grove {
  readonly trees: TreeState[]
  private readonly byKey = new Map<string, TreeState>()

  /**
   * Todas começam sólidas, como o mapa foi desenhado, mas com tempos diferentes
   * para não sumirem todas juntas.
   * @param tiles Casas com árvore.
   * @param random Gerador de números em [0, 1). Trocável nos testes.
   */
  constructor(tiles: Point[], random: () => number = Math.random) {
    this.trees = tiles.map((tile) => ({
      tile: { ...tile },
      phase: 'solid' as TreePhase,
      timeLeft: TREE_CYCLE.solid * (0.25 + 0.75 * random()),
    }))
    for (const tree of this.trees) this.byKey.set(key(tree.tile.x, tree.tile.y), tree)
  }

  /**
   * Estado da árvore numa casa.
   * @param x Coluna.
   * @param y Linha.
   * @returns O estado, ou undefined se não há árvore ali.
   */
  at(x: number, y: number): TreeState | undefined {
    return this.byKey.get(key(x, y))
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se há uma árvore sólida (bloqueando) na casa.
   */
  isSolid(x: number, y: number): boolean {
    return this.at(x, y)?.phase === 'solid'
  }

  /**
   * Avança o ciclo de todas as árvores.
   * @param dt Tempo desde o último frame, em segundos.
   * @param isOccupied Diz se há alguém numa casa; árvores não reaparecem em casas ocupadas.
   */
  update(dt: number, isOccupied: (tile: Point) => boolean): void {
    for (const tree of this.trees) {
      tree.timeLeft -= dt
      while (tree.timeLeft <= 0) {
        if (tree.phase === 'solid') {
          tree.phase = 'gone'
          tree.timeLeft += TREE_CYCLE.gone
        } else if (tree.phase === 'gone') {
          tree.phase = 'warning'
          tree.timeLeft += TREE_CYCLE.warning
        } else if (isOccupied(tree.tile)) {
          // Alguém em cima: continua piscando e tenta de novo no próximo frame
          tree.timeLeft = 0
          break
        } else {
          tree.phase = 'solid'
          tree.timeLeft += TREE_CYCLE.solid
        }
      }
    }
  }
}

/**
 * @param x Coluna.
 * @param y Linha.
 * @returns Chave única da casa.
 */
function key(x: number, y: number): string {
  return `${x},${y}`
}
