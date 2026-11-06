import type { Point } from './Pathfinding'

/**
 * Fase do ciclo de uma árvore.
 * - `solid`: está no mapa e bloqueia passagem e tiros.
 * - `gone`: sumiu; a casa fica livre.
 * - `warning`: vai reaparecer (já no lugar novo); pisca, mas ainda não bloqueia.
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
  /** Casa onde a árvore está (ou onde vai aparecer, quando `warning`). */
  tile: Point
  phase: TreePhase
  /** Segundos que faltam para a fase atual acabar. */
  timeLeft: number
}

/**
 * Escolhe onde uma árvore vai reaparecer.
 * @param tree Árvore que vai reaparecer.
 * @param isOccupied Diz se há alguém numa casa.
 * @returns A casa nova, ou null para reaparecer no mesmo lugar.
 */
export type ChooseSpot = (tree: TreeState, isOccupied: (tile: Point) => boolean) => Point | null

/**
 * Controla o ciclo das árvores: ficam sólidas, somem e reaparecem num lugar sorteado,
 * piscando por `TREE_CYCLE.warning` segundos no lugar novo antes de bloquear.
 *
 * Uma árvore só reaparece se a casa estiver livre; se houver alguém em cima,
 * ela continua piscando até a casa vagar (para ninguém ficar preso dentro dela).
 */
export class Grove {
  readonly trees: TreeState[]
  private readonly byKey = new Map<string, TreeState>()

  /**
   * Todas começam sólidas, onde o mapa mandou, mas com tempos diferentes
   * para não sumirem todas juntas.
   * @param tiles Casas iniciais das árvores.
   * @param random Gerador de números em [0, 1). Trocável nos testes.
   * @param chooseSpot Escolhe o lugar de cada reaparição; sem ele, a árvore volta para o mesmo lugar.
   */
  constructor(
    tiles: Point[],
    random: () => number = Math.random,
    private readonly chooseSpot?: ChooseSpot,
  ) {
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
          // Escolhe o lugar novo já no aviso, para o jogador ver onde ela vai surgir
          const spot = this.chooseSpot?.(tree, isOccupied)
          if (spot) this.move(tree, spot)
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

  /**
   * Muda a árvore de casa, mantendo o índice por casa em dia.
   * @param tree Árvore.
   * @param tile Casa nova.
   */
  private move(tree: TreeState, tile: Point): void {
    const oldKey = key(tree.tile.x, tree.tile.y)
    if (this.byKey.get(oldKey) === tree) this.byKey.delete(oldKey)
    tree.tile = { ...tile }
    this.byKey.set(key(tile.x, tile.y), tree)
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
