import { Grove, type TreeState } from './Grove'
import type { LevelMap } from './maps'
import type { Point, Walkable } from './Pathfinding'

/** As 4 direções sem diagonal. */
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

/** Quantas casas sorteadas testar antes de desistir de mover uma árvore. */
const TREE_SPOT_ATTEMPTS = 60

/**
 * Lógica do mapa sem desenho: colisão, árvores, regiões conectadas e sorteio de casas.
 * Não depende de canvas, por isso pode ser testada fora do navegador.
 *
 * Paredes são fixas. Árvores mudam: somem e reaparecem em lugares sorteados (ver `Grove`).
 */
export class Grid implements Walkable {
  readonly name: string
  readonly width: number
  readonly height: number
  /**
   * Grade que ignora paredes e árvores (só respeita as bordas do mapa).
   * Usada por quem atravessa paredes.
   */
  readonly ghostGrid: Walkable
  /** Ciclo das árvores: onde cada uma está e se está bloqueando agora. */
  readonly grove: Grove
  /** `walls[y][x]`: parede fixa (sem contar árvores). */
  private readonly walls: boolean[][]
  /** Onde as árvores começam, conforme o arquivo do mapa. */
  private readonly initialTrees: Point[]
  /** Casas de chão da maior região conectada (ignorando árvores): onde dá para nascer e pôr árvores. */
  private readonly spawnable: Point[]
  private readonly random: () => number

  /**
   * @param map Mapa da fase.
   * @param random Gerador de números em [0, 1) usado nas árvores. Trocável nos testes.
   */
  constructor(map: LevelMap, random: () => number = Math.random) {
    this.name = map.name
    this.random = random
    this.walls = map.walls.map((row, y) => row.map((wall, x) => wall && !map.trees[y]?.[x]))
    this.initialTrees = []
    map.trees.forEach((row, y) => row.forEach((tree, x) => tree && this.initialTrees.push({ x, y })))
    this.height = map.walls.length
    this.width = map.walls[0]?.length ?? 0
    this.ghostGrid = {
      width: this.width,
      height: this.height,
      isWalkable: (x, y) => this.isInside(x, y),
    }
    this.spawnable = this.largestRegion()
    this.grove = new Grove(this.initialTrees, random, (tree, isOccupied) => this.randomTreeSpot(tree, isOccupied))
  }

  /** Quantidade de casas de chão da região principal (onde dá para nascer). */
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
   * @returns true se a casa é uma parede fixa (fora do mapa também conta como parede).
   */
  isStaticWall(x: number, y: number): boolean {
    return this.walls[y]?.[x] !== false
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se a casa está dentro do mapa, não é parede e não tem árvore sólida agora.
   */
  isWalkable(x: number, y: number): boolean {
    return !this.isStaticWall(x, y) && !this.grove.isSolid(x, y)
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se há uma árvore na casa agora (sólida ou piscando para aparecer).
   */
  isTree(x: number, y: number): boolean {
    const tree = this.grove.at(x, y)
    return tree !== undefined && tree.phase !== 'gone'
  }

  /**
   * Onde as árvores começam, conforme o arquivo do mapa.
   * @returns Casas com árvore no início da fase, de cima para baixo.
   */
  treeTiles(): Point[] {
    return this.initialTrees.map((t) => ({ ...t }))
  }

  /**
   * Conta as casas de chão do mapa inteiro (casas de árvore contam como chão), conectadas ou não.
   * @returns Número de casas que não são parede.
   */
  countFloor(): number {
    return this.walls.reduce((total, row) => total + row.filter((wall) => !wall).length, 0)
  }

  /**
   * Sorteia uma casa livre na região principal do mapa (sem árvore no momento).
   * @param avoid Casas que devem ficar longe (ex.: o jogador).
   * @param minDistance Distância Manhattan mínima até cada casa de `avoid`.
   *   Se nenhuma casa atender, a restrição é relaxada até achar uma.
   * @param random Gerador de números em [0, 1). Trocável nos testes.
   * @returns Uma casa livre.
   * @throws {Error} Se o mapa não tiver nenhuma casa livre.
   */
  randomFreeTile(avoid: Point[] = [], minDistance = 0, random: () => number = Math.random): Point {
    const free = this.spawnable.filter((t) => !this.isTree(t.x, t.y))
    for (let distance = minDistance; distance >= 0; distance--) {
      const candidates = free.filter((t) => avoid.every((p) => Math.abs(p.x - t.x) + Math.abs(p.y - t.y) >= distance))
      const pick = candidates[Math.floor(random() * candidates.length)]
      if (pick) return { ...pick }
    }
    throw new Error(`Mapa "${this.name}" não tem casas livres`)
  }

  /**
   * Sorteia um lugar novo para uma árvore reaparecer. A casa precisa:
   * - ser chão da região principal, diferente de onde a árvore estava, sem ninguém em cima;
   * - estar em área aberta (pelo menos 3 vizinhos livres) e sem outra árvore encostada;
   * - não desconectar o mapa (todo o chão continua alcançável com a árvore lá).
   * @param tree Árvore que vai reaparecer.
   * @param isOccupied Diz se há alguém numa casa.
   * @returns A casa sorteada, ou null se nenhuma servir (a árvore volta para onde estava).
   */
  randomTreeSpot(tree: TreeState, isOccupied: (tile: Point) => boolean): Point | null {
    // Árvores presentes ou prestes a aparecer contam como obstáculo
    const others = this.grove.trees.filter((t) => t !== tree && t.phase !== 'gone')
    const blocked = new Set(others.map((t) => this.key(t.tile.x, t.tile.y)))
    const isOpen = (x: number, y: number) => !this.isStaticWall(x, y) && !blocked.has(this.key(x, y))

    const candidates = [...this.spawnable]
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!]
    }

    for (const spot of candidates.slice(0, TREE_SPOT_ATTEMPTS)) {
      if (spot.x === tree.tile.x && spot.y === tree.tile.y) continue
      if (!isOpen(spot.x, spot.y) || isOccupied(spot)) continue
      if (NEIGHBOURS.filter(([dx, dy]) => isOpen(spot.x + dx, spot.y + dy)).length < 3) continue
      if (others.some((t) => Math.abs(t.tile.x - spot.x) <= 1 && Math.abs(t.tile.y - spot.y) <= 1)) continue
      if (!this.staysConnected(blocked, spot)) continue
      return { ...spot }
    }
    return null
  }

  /**
   * Verifica se todo o chão da região principal continua conectado com uma árvore a mais.
   * @param blocked Casas já bloqueadas por árvores.
   * @param extra Casa onde a nova árvore ficaria.
   * @returns true se nenhuma área ficaria isolada.
   */
  private staysConnected(blocked: Set<string>, extra: Point): boolean {
    const isFree = (x: number, y: number) =>
      !this.isStaticWall(x, y) && !blocked.has(this.key(x, y)) && !(x === extra.x && y === extra.y)
    const free = this.spawnable.filter((t) => isFree(t.x, t.y))
    const start = free[0]
    if (!start) return true

    const seen = new Set([this.key(start.x, start.y)])
    const stack = [start]
    while (stack.length > 0) {
      const p = stack.pop()!
      for (const [dx, dy] of NEIGHBOURS) {
        const n = { x: p.x + dx, y: p.y + dy }
        const k = this.key(n.x, n.y)
        if (isFree(n.x, n.y) && !seen.has(k)) {
          seen.add(k)
          stack.push(n)
        }
      }
    }
    return seen.size === free.length
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns Chave única da casa.
   */
  private key(x: number, y: number): string {
    return `${x},${y}`
  }

  /**
   * Acha a maior região de chão conectada (ignorando árvores), para ninguém nascer num canto isolado.
   * @returns As casas dessa região.
   */
  private largestRegion(): Point[] {
    const seen = new Set<number>()
    let best: Point[] = []

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.isStaticWall(x, y) || seen.has(y * this.width + x)) continue

        const region: Point[] = []
        const stack: Point[] = [{ x, y }]
        seen.add(y * this.width + x)
        while (stack.length > 0) {
          const p = stack.pop()!
          region.push(p)
          for (const [dx, dy] of NEIGHBOURS) {
            const n = { x: p.x + dx, y: p.y + dy }
            const k = n.y * this.width + n.x
            if (!this.isStaticWall(n.x, n.y) && !seen.has(k)) {
              seen.add(k)
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
