import { describe, expect, it } from 'vitest'
import { gridFrom } from '../test/helpers'
import { manhattan } from './Pathfinding'

describe('Grid', () => {
  const grid = gridFrom(
    '...#', //
    '.#.#',
    '...#',
  )

  it('lê as dimensões', () => {
    expect([grid.width, grid.height]).toEqual([4, 3])
  })

  it('diz onde dá para andar, inclusive fora do mapa', () => {
    expect(grid.isWalkable(0, 0)).toBe(true)
    expect(grid.isWalkable(1, 1)).toBe(false)
    expect(grid.isWalkable(-1, 0)).toBe(false)
    expect(grid.isWalkable(0, 3)).toBe(false)
  })

  it('a grade fantasma ignora paredes mas respeita as bordas', () => {
    expect(grid.ghostGrid.isWalkable(1, 1)).toBe(true)
    expect(grid.ghostGrid.isWalkable(3, 0)).toBe(true)
    expect(grid.ghostGrid.isWalkable(4, 0)).toBe(false)
  })

  it('sorteia só casas livres', () => {
    for (let i = 0; i < 200; i++) {
      const t = grid.randomFreeTile()
      expect(grid.isWalkable(t.x, t.y)).toBe(true)
    }
  })

  it('nunca sorteia casas fora da maior região conectada', () => {
    const split = gridFrom(
      '...#.', //
      '...#.',
    )
    expect(split.spawnableCount).toBe(6)
    for (let i = 0; i < 200; i++) expect(split.randomFreeTile().x).toBeLessThan(3)
  })

  it('respeita a distância mínima até as casas a evitar', () => {
    const open = gridFrom(...Array.from({ length: 10 }, () => '..........'))
    const player = { x: 0, y: 0 }
    for (let i = 0; i < 200; i++) {
      expect(manhattan(open.randomFreeTile([player], 12), player)).toBeGreaterThanOrEqual(12)
    }
  })

  it('relaxa a distância quando nenhuma casa atende', () => {
    const tiny = gridFrom('...')
    const t = tiny.randomFreeTile([{ x: 0, y: 0 }], 50)
    expect(tiny.isWalkable(t.x, t.y)).toBe(true)
  })

  it('usa o gerador de números recebido', () => {
    expect(grid.randomFreeTile([], 0, () => 0)).toEqual(grid.randomFreeTile([], 0, () => 0))
  })

  it('falha quando não há chão', () => {
    expect(() => gridFrom('###').randomFreeTile()).toThrow(/não tem casas livres/)
  })

  it('árvores bloqueiam o caminho, mas o fantasma passa por elas', () => {
    const forest = gridFrom('.T.', '...')
    expect(forest.isWalkable(1, 0)).toBe(false)
    expect(forest.isTree(1, 0)).toBe(true)
    expect(forest.isTree(0, 0)).toBe(false)
    expect(forest.ghostGrid.isWalkable(1, 0)).toBe(true)
    expect(forest.treeTiles()).toEqual([{ x: 1, y: 0 }])
  })
})
