import { describe, expect, it } from 'vitest'
import { gridFrom, simulate } from '../test/helpers'
import { Grove, TREE_CYCLE, type TreePhase } from './Grove'

const nobody = () => false

/**
 * Registra a sequência de fases de uma árvore e quanto tempo cada uma durou.
 * @param grove Árvores observadas.
 * @param seconds Quanto tempo simular.
 * @param isOccupied Diz se a casa está ocupada.
 * @returns Lista de fases na ordem, com a duração de cada uma.
 */
function phases(grove: Grove, seconds: number, isOccupied = nobody) {
  const tree = grove.trees[0]!
  const log: { phase: TreePhase; duration: number }[] = [{ phase: tree.phase, duration: 0 }]
  simulate(seconds, (dt) => {
    grove.update(dt, isOccupied)
    const last = log[log.length - 1]!
    if (tree.phase === last.phase) last.duration += dt
    else log.push({ phase: tree.phase, duration: dt })
  })
  return log
}

describe('Grove', () => {
  it('começa com todas as árvores sólidas', () => {
    const grove = new Grove([
      { x: 1, y: 1 },
      { x: 3, y: 2 },
    ])
    expect(grove.trees.map((t) => t.phase)).toEqual(['solid', 'solid'])
    expect(grove.isSolid(1, 1)).toBe(true)
    expect(grove.isSolid(0, 0)).toBe(false)
  })

  it('some, pisca por 2 segundos e reaparece, nessa ordem', () => {
    // random() = 1: a primeira fase sólida dura o ciclo inteiro
    const grove = new Grove([{ x: 0, y: 0 }], () => 1)
    const log = phases(grove, TREE_CYCLE.solid + TREE_CYCLE.gone + TREE_CYCLE.warning + 1)
    expect(log.map((l) => l.phase)).toEqual(['solid', 'gone', 'warning', 'solid'])
    expect(log[1]!.duration).toBeCloseTo(TREE_CYCLE.gone, 1)
    expect(log[2]!.duration).toBeCloseTo(2, 1)
  })

  it('não bloqueia enquanto pisca, só depois de reaparecer', () => {
    const grove = new Grove([{ x: 0, y: 0 }], () => 1)
    simulate(TREE_CYCLE.solid + TREE_CYCLE.gone + 0.5, (dt) => grove.update(dt, nobody))
    expect(grove.at(0, 0)?.phase).toBe('warning')
    expect(grove.isSolid(0, 0)).toBe(false)
  })

  it('não reaparece em cima de alguém: continua piscando até a casa vagar', () => {
    const grove = new Grove([{ x: 0, y: 0 }], () => 1)
    let occupied = true
    simulate(TREE_CYCLE.solid + TREE_CYCLE.gone + TREE_CYCLE.warning + 3, (dt) => grove.update(dt, () => occupied))
    expect(grove.at(0, 0)?.phase).toBe('warning')

    occupied = false
    grove.update(1 / 60, () => occupied)
    expect(grove.at(0, 0)?.phase).toBe('solid')
  })

  it('as árvores não somem todas juntas', () => {
    let seed = 0.1
    const tiles = Array.from({ length: 10 }, (_, x) => ({ x, y: 0 }))
    const grove = new Grove(tiles, () => (seed = (seed * 9301 + 0.49297) % 1))
    const times = new Set(grove.trees.map((t) => t.timeLeft.toFixed(2)))
    expect(times.size).toBeGreaterThan(1)
  })
})

describe('árvores no Grid', () => {
  it('a casa fica livre quando a árvore some e bloqueia de novo quando ela volta', () => {
    const grid = gridFrom('.T.')
    expect(grid.isWalkable(1, 0)).toBe(false)

    simulate(TREE_CYCLE.solid + 0.1, (dt) => grid.grove.update(dt, nobody))
    expect(grid.isWalkable(1, 0)).toBe(true)

    simulate(TREE_CYCLE.gone + TREE_CYCLE.warning, (dt) => grid.grove.update(dt, nobody))
    expect(grid.isWalkable(1, 0)).toBe(false)
  })
})
