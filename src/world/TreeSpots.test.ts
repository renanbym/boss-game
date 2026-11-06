import { describe, expect, it } from 'vitest'
import { gridFrom, simulate } from '../test/helpers'
import { Grove, TREE_CYCLE } from './Grove'
import { MAPS } from './maps'
import { Grid } from './Grid'
import type { Point } from './Pathfinding'

const nobody = () => false

/**
 * Leva todas as árvores do grid até o início do aviso (já no lugar novo).
 * @param grid Grid com árvores.
 * @param isOccupied Diz se há alguém numa casa.
 */
function untilWarning(grid: Grid, isOccupied: (tile: Point) => boolean = nobody): void {
  for (const tree of grid.grove.trees) tree.timeLeft = 0.001
  grid.grove.update(0.01, isOccupied) // solid -> gone
  for (const tree of grid.grove.trees) tree.timeLeft = 0.001
  grid.grove.update(0.01, isOccupied) // gone -> warning (lugar novo)
}

/**
 * Verifica se todo o chão livre (sem paredes nem árvores presentes) está conectado.
 * @param grid Grid a verificar.
 * @returns true se não há áreas isoladas.
 */
function allFloorConnected(grid: Grid): boolean {
  const free: Point[] = []
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) if (!grid.isStaticWall(x, y) && !grid.isTree(x, y)) free.push({ x, y })
  }
  const start = free[0]
  if (!start) return true
  const seen = new Set([`${start.x},${start.y}`])
  const stack = [start]
  while (stack.length) {
    const p = stack.pop()!
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: p.x + dx!, y: p.y + dy! }
      const k = `${n.x},${n.y}`
      if (!grid.isStaticWall(n.x, n.y) && !grid.isTree(n.x, n.y) && !seen.has(k)) {
        seen.add(k)
        stack.push(n)
      }
    }
  }
  return seen.size === free.length
}

describe('árvores em lugares aleatórios', () => {
  const open = () =>
    gridFrom(
      '.........', //
      '.........',
      '....T....',
      '.........',
      '.........',
    )

  it('reaparece numa casa diferente de onde estava, e o aviso pisca já no lugar novo', () => {
    const grid = open()
    const before = { ...grid.grove.trees[0]!.tile }
    untilWarning(grid)
    const tree = grid.grove.trees[0]!
    expect(tree.phase).toBe('warning')
    expect(tree.tile).not.toEqual(before)
    expect(grid.isTree(tree.tile.x, tree.tile.y)).toBe(true)
  })

  it('a casa antiga fica livre e a nova só bloqueia quando a árvore volta', () => {
    const grid = open()
    const before = { ...grid.grove.trees[0]!.tile }
    untilWarning(grid)
    const spot = grid.grove.trees[0]!.tile
    expect(grid.isWalkable(before.x, before.y)).toBe(true)
    expect(grid.isWalkable(spot.x, spot.y)).toBe(true) // piscando ainda não bloqueia

    simulate(TREE_CYCLE.warning + 0.1, (dt) => grid.grove.update(dt, nobody))
    expect(grid.isWalkable(spot.x, spot.y)).toBe(false)
  })

  it('não escolhe casa ocupada, nem corredor (precisa de 3 vizinhos livres)', () => {
    for (let i = 0; i < 30; i++) {
      const grid = gridFrom(
        '#########', //
        '#.......#',
        '#.T.....#',
        '#.......#',
        '###.#####', // corredor de 1 casa
        '#.......#',
        '#########',
      )
      const occupied = { x: 4, y: 2 }
      untilWarning(grid, (t) => t.x === occupied.x && t.y === occupied.y)
      const spot = grid.grove.trees[0]!.tile
      expect(spot).not.toEqual(occupied)
      expect(spot).not.toEqual({ x: 3, y: 4 })
      const freeNeighbours = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].filter(([dx, dy]) => !grid.isStaticWall(spot.x + dx!, spot.y + dy!)).length
      expect(freeNeighbours).toBeGreaterThanOrEqual(3)
    }
  })

  it('árvores não reaparecem encostadas em outras', () => {
    const grid = gridFrom(
      '...........', //
      '..T.....T..',
      '...........',
      '.....T.....',
      '...........',
    )
    untilWarning(grid)
    const [a, b, c] = grid.grove.trees.map((t) => t.tile)
    for (const [p, q] of [
      [a!, b!],
      [a!, c!],
      [b!, c!],
    ]) {
      expect(Math.max(Math.abs(p!.x - q!.x), Math.abs(p!.y - q!.y))).toBeGreaterThan(1)
    }
  })

  it.each(MAPS.map((m) => [m.name, m] as const))(
    '%s: depois de várias reaparições, nenhuma área fica isolada',
    (_name, map) => {
      const grid = new Grid(map)
      for (let round = 0; round < 15; round++) {
        untilWarning(grid)
        expect(allFloorConnected(grid)).toBe(true)
      }
    },
  )

  it('sem escolhedor (Grove sozinho), a árvore volta para o mesmo lugar', () => {
    const grove = new Grove([{ x: 2, y: 2 }], () => 1)
    simulate(TREE_CYCLE.solid + TREE_CYCLE.gone + 0.1, (dt) => grove.update(dt, nobody))
    expect(grove.trees[0]!.tile).toEqual({ x: 2, y: 2 })
  })

  it('ninguém nasce numa casa com árvore presente', () => {
    const grid = gridFrom('.T.', '...')
    for (let i = 0; i < 100; i++) expect(grid.randomFreeTile()).not.toEqual({ x: 1, y: 0 })
  })
})
