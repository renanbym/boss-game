import { describe, expect, it } from 'vitest'
import { Grid } from './Grid'
import { MAPS, parseMap } from './maps'

describe('parseMap', () => {
  it('converte # em parede e . em chão', () => {
    expect(parseMap({ name: 'm', tiles: ['#.', '.#'] }).walls).toEqual([
      [true, false],
      [false, true],
    ])
  })

  it('recusa mapa vazio', () => {
    expect(() => parseMap({ name: 'm', tiles: [] })).toThrow(/vazio/)
  })

  it('recusa linhas de tamanhos diferentes', () => {
    expect(() => parseMap({ name: 'm', tiles: ['...', '..'] })).toThrow(/linha 1/)
  })

  it('árvore (T) bloqueia a passagem e fica marcada como árvore', () => {
    const map = parseMap({ name: 'm', tiles: ['.T#'] })
    expect(map.walls).toEqual([[false, true, true]])
    expect(map.trees).toEqual([[false, true, false]])
  })

  it('recusa caracteres desconhecidos', () => {
    expect(() => parseMap({ name: 'm', tiles: ['.x.'] })).toThrow(/"x"/)
  })
})

describe('mapas do jogo', () => {
  it('tem as 3 fases', () => {
    expect(MAPS.map((m) => m.name)).toEqual(['Labirinto', 'Ruínas', 'Arena'])
  })

  it.each(MAPS.map((m) => [m.name, m] as const))('%s: todo o chão é alcançável', (_name, map) => {
    const grid = new Grid(map)
    expect(grid.spawnableCount).toBe(grid.countFloor())
  })

  it.each(MAPS.map((m) => [m.name, m] as const))('%s: tem árvores', (_name, map) => {
    expect(map.trees.flat().filter(Boolean).length).toBeGreaterThan(0)
  })
})
