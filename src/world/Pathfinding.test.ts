import { describe, expect, it } from 'vitest'
import { gridFrom } from '../test/helpers'
import { findPath, manhattan } from './Pathfinding'

describe('manhattan', () => {
  it('soma as distâncias em x e y', () => {
    expect(manhattan({ x: 1, y: 2 }, { x: 4, y: 0 })).toBe(5)
  })
})

describe('findPath', () => {
  it('anda em linha reta quando não há obstáculos', () => {
    const grid = gridFrom('.....')
    expect(findPath(grid, { x: 0, y: 0 }, { x: 4, y: 0 })).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ])
  })

  it('contorna paredes pelo menor caminho', () => {
    const grid = gridFrom(
      '.....', //
      '####.',
      '.....',
    )
    const path = findPath(grid, { x: 0, y: 0 }, { x: 0, y: 2 })
    expect(path).toHaveLength(11)
    expect(path[0]).toEqual({ x: 0, y: 0 })
    expect(path.at(-1)).toEqual({ x: 0, y: 2 })
    for (const p of path) expect(grid.isWalkable(p.x, p.y)).toBe(true)
  })

  it('só dá passos entre casas vizinhas, sem diagonal', () => {
    const grid = gridFrom(
      '......', //
      '.##.#.',
      '......',
      '.#.##.',
    )
    const path = findPath(grid, { x: 0, y: 0 }, { x: 5, y: 3 })
    for (let i = 1; i < path.length; i++) {
      expect(manhattan(path[i - 1]!, path[i]!)).toBe(1)
    }
  })

  it('funciona em mapas não quadrados (era o bug do mapa transposto)', () => {
    const grid = gridFrom(
      '..#', //
      '..#',
      '...',
      '#..',
      '#..',
    )
    expect(findPath(grid, { x: 0, y: 0 }, { x: 2, y: 4 }).at(-1)).toEqual({ x: 2, y: 4 })
  })

  it('devolve vazio quando o destino está isolado', () => {
    const grid = gridFrom(
      '..#.', //
      '..#.',
      '###.',
    )
    expect(findPath(grid, { x: 0, y: 0 }, { x: 3, y: 0 })).toEqual([])
  })

  it('devolve vazio quando origem ou destino são parede', () => {
    const grid = gridFrom('.#.')
    expect(findPath(grid, { x: 1, y: 0 }, { x: 0, y: 0 })).toEqual([])
    expect(findPath(grid, { x: 0, y: 0 }, { x: 1, y: 0 })).toEqual([])
  })

  it('devolve só a origem quando origem e destino são a mesma casa', () => {
    const grid = gridFrom('...')
    expect(findPath(grid, { x: 1, y: 0 }, { x: 1, y: 0 })).toEqual([{ x: 1, y: 0 }])
  })
})
