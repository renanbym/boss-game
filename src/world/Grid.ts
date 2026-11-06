import type { LevelMap } from './maps'
import type { Point, Walkable } from './Pathfinding'

/**
 * Lógica do mapa sem desenho: colisão, regiões conectadas e sorteio de casas.
 * Não depende de canvas, por isso pode ser testada fora do navegador.
 */
export class Grid implements Walkable {
  readonly name: string
  readonly width: number
  readonly height: number
  /**
   * Grade que ignora paredes (só respeita as bordas do mapa).
   * Usada por quem atravessa paredes.
   */
  readonly ghostGrid: Walkable
  private readonly walls: boolean[][]
  private readonly trees: boolean[][]
  /** Casas livres da maior região conectada: só nelas alguém pode nascer. */
  private readonly spawnable: Point[]

  /**
   * @param map Mapa da fase.
   */
  constructor(map: LevelMap) {
    this.name = map.name
    this.walls = map.walls
    this.trees = map.trees
    this.height = map.walls.length
    this.width = map.walls[0]?.length ?? 0
    this.ghostGrid = {
      width: this.width,
      height: this.height,
      isWalkable: (x, y) => this.isInside(x, y),
    }
    this.spawnable = this.largestRegion()
  }

  /** Quantidade de casas onde alguém pode nascer (tamanho da maior região conectada). */
  get spawnableCount(): number {
    return this.spawnable.length
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se a casa está dentro do mapa.
   */
  isInside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se a casa está dentro do mapa e não é parede.
   */
  isWalkable(x: number, y: number): boolean {
    return this.walls[y]?.[x] === false
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se há uma árvore na casa.
   */
  isTree(x: number, y: number): boolean {
    return this.trees[y]?.[x] === true
  }

  /**
   * Lista as casas com árvore.
   * @returns Casas com árvore, de cima para baixo.
   */
  treeTiles(): Point[] {
    const tiles: Point[] = []
    this.trees.forEach((row, y) => row.forEach((tree, x) => tree && tiles.push({ x, y })))
    return tiles
  }

  /**
   * Conta as casas de chão do mapa inteiro, conectadas ou não.
   * @returns Número de casas livres.
   */
  countFloor(): number {
    return this.walls.reduce((total, row) => total + row.filter((wall) => !wall).length, 0)
  }

  /**
   * Sorteia uma casa livre na região principal do mapa.
   * @param avoid Casas que devem ficar longe (ex.: o jogador).
   * @param minDistance Distância Manhattan mínima até cada casa de `avoid`.
   *   Se nenhuma casa atender, a restrição é relaxada até achar uma.
   * @param random Gerador de números em [0, 1). Trocável nos testes.
   * @returns Uma casa livre.
   * @throws {Error} Se o mapa não tiver nenhuma casa livre.
   */
  randomFreeTile(avoid: Point[] = [], minDistance = 0, random: () => number = Math.random): Point {
    for (let distance = minDistance; distance >= 0; distance--) {
      const candidates = this.spawnable.filter((t) =>
        avoid.every((p) => Math.abs(p.x - t.x) + Math.abs(p.y - t.y) >= distance),
      )
      const pick = candidates[Math.floor(random() * candidates.length)]
      if (pick) return { ...pick }
    }
    throw new Error(`Mapa "${this.name}" não tem casas livres`)
  }

  /**
   * Acha a maior região de casas livres conectadas, para ninguém nascer num canto isolado.
   * @returns As casas dessa região.
   */
  private largestRegion(): Point[] {
    const seen = new Set<number>()
    let best: Point[] = []

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isWalkable(x, y) || seen.has(y * this.width + x)) continue

        const region: Point[] = []
        const stack: Point[] = [{ x, y }]
        seen.add(y * this.width + x)
        while (stack.length > 0) {
          const p = stack.pop()!
          region.push(p)
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ] as const) {
            const n = { x: p.x + dx, y: p.y + dy }
            const key = n.y * this.width + n.x
            if (this.isWalkable(n.x, n.y) && !seen.has(key)) {
              seen.add(key)
              stack.push(n)
            }
          }
        }
        if (region.length > best.length) best = region
      }
    }
    return best
  }
}
