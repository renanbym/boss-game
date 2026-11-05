/** Uma casa do grid. */
export interface Point {
  x: number
  y: number
}

/** Algo em que se pode procurar caminho: sabe o tamanho e quais casas estão livres. */
export interface Walkable {
  readonly width: number
  readonly height: number
  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se a casa existe e está livre.
   */
  isWalkable(x: number, y: number): boolean
}

const DIRECTIONS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
]

/**
 * Distância Manhattan entre duas casas (movimento só nas 4 direções).
 * @param a Casa de origem.
 * @param b Casa de destino.
 * @returns Número mínimo de passos ignorando paredes.
 */
export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Encontra o menor caminho entre duas casas com A*, sem diagonais.
 * @param grid Grid onde procurar.
 * @param start Casa de origem.
 * @param goal Casa de destino.
 * @returns Casas do caminho, da origem ao destino (inclusive). Vazio se não houver caminho
 *   ou se origem/destino estiverem bloqueados.
 */
export function findPath(grid: Walkable, start: Point, goal: Point): Point[] {
  if (!grid.isWalkable(start.x, start.y) || !grid.isWalkable(goal.x, goal.y)) return []

  const index = (p: Point) => p.y * grid.width + p.x
  const size = grid.width * grid.height
  const cameFrom = new Int32Array(size).fill(-1)
  const cost = new Float64Array(size).fill(Infinity)
  const closed = new Uint8Array(size)

  const startIndex = index(start)
  const goalIndex = index(goal)
  cost[startIndex] = 0

  // Lista aberta simples: o grid é pequeno (25x25), não compensa uma heap
  const open: { i: number; f: number }[] = [{ i: startIndex, f: manhattan(start, goal) }]

  while (open.length > 0) {
    let best = 0
    for (let k = 1; k < open.length; k++) {
      if (open[k]!.f < open[best]!.f) best = k
    }
    const current = open.splice(best, 1)[0]!.i
    if (current === goalIndex) return rebuild(cameFrom, current, grid.width)
    if (closed[current]) continue
    closed[current] = 1

    const cx = current % grid.width
    const cy = Math.floor(current / grid.width)

    for (const d of DIRECTIONS) {
      const nx = cx + d.x
      const ny = cy + d.y
      if (!grid.isWalkable(nx, ny)) continue

      const next = ny * grid.width + nx
      const newCost = cost[current]! + 1
      if (newCost < cost[next]!) {
        cost[next] = newCost
        cameFrom[next] = current
        open.push({ i: next, f: newCost + manhattan({ x: nx, y: ny }, goal) })
      }
    }
  }

  return []
}

/**
 * Monta o caminho final seguindo `cameFrom` do destino até a origem.
 * @param cameFrom Para cada casa, o índice da casa anterior (-1 na origem).
 * @param end Índice da casa de destino.
 * @param width Largura do grid, para converter índice em x/y.
 * @returns Caminho da origem ao destino.
 */
function rebuild(cameFrom: Int32Array, end: number, width: number): Point[] {
  const path: Point[] = []
  for (let i = end; i !== -1; i = cameFrom[i]!) {
    path.push({ x: i % width, y: Math.floor(i / width) })
  }
  return path.reverse()
}
