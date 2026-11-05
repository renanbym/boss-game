import { describe, expect, it } from 'vitest'
import { FAKE_LOOK, gridFrom, simulate } from '../test/helpers'
import { manhattan, type Point } from '../world/Pathfinding'
import { Enemy, type Abilities, type EnemyOptions } from './Enemy'
import { Entity } from './Entity'

/**
 * Monta as opções de um inimigo de teste.
 * @param overrides Campos a trocar.
 * @returns Opções completas.
 */
function options(overrides: Partial<EnemyOptions> = {}): EnemyOptions {
  return { character: 0, stepDuration: 0.1, hp: 3, isBoss: true, abilities: {}, ...overrides }
}

/**
 * Cria um alvo parado e um inimigo perseguindo ele.
 * @param from Casa do inimigo.
 * @param to Casa do alvo.
 * @param abilities Habilidades do inimigo.
 * @returns O inimigo e o alvo.
 */
function chase(from: Point, to: Point, abilities: Abilities = {}) {
  const target = new Entity(FAKE_LOOK, to, 0.1)
  const enemy = new Enemy(FAKE_LOOK, from, options({ abilities }), target)
  return { enemy, target }
}

describe('Enemy', () => {
  it('persegue o alvo contornando paredes, sem nunca entrar nelas', () => {
    const grid = gridFrom(
      '.....', //
      '####.',
      '.....',
    )
    const { enemy, target } = chase({ x: 0, y: 0 }, { x: 0, y: 2 })
    simulate(3, (dt) => {
      enemy.step(dt, grid)
      expect(grid.isWalkable(enemy.tile.x, enemy.tile.y)).toBe(true)
    })
    expect(enemy.distanceTo(target)).toBe(0)
  })

  it('muda de rota quando o alvo se move', () => {
    const grid = gridFrom('.........')
    const { enemy, target } = chase({ x: 4, y: 0 }, { x: 8, y: 0 })
    simulate(0.15, (dt) => enemy.step(dt, grid))
    expect(enemy.tile.x).toBeGreaterThan(4)

    target.placeAt({ x: 0, y: 0 })
    simulate(1, (dt) => enemy.step(dt, grid))
    expect(enemy.tile).toEqual({ x: 0, y: 0 })
  })

  it('fica parado quando não há caminho', () => {
    const grid = gridFrom('..#..')
    const { enemy } = chase({ x: 0, y: 0 }, { x: 4, y: 0 })
    simulate(1, (dt) => enemy.step(dt, grid))
    expect(enemy.tile.x).toBeLessThanOrEqual(1)
  })

  it('atravessa paredes quando é fantasma', () => {
    const grid = gridFrom('..#..')
    const { enemy, target } = chase({ x: 0, y: 0 }, { x: 4, y: 0 }, { ghost: true })
    simulate(1, (dt) => enemy.step(dt, grid))
    expect(enemy.distanceTo(target)).toBe(0)
  })

  it('golpe tira vida, atordoa e empurra; golpe durante o atordoamento não conta', () => {
    const grid = gridFrom('.....')
    const { enemy } = chase({ x: 2, y: 0 }, { x: 0, y: 0 })

    expect(enemy.hurt('right', grid)).toBe(true)
    expect(enemy.hp).toBe(2)
    expect(enemy.isStunned).toBe(true)
    expect(enemy.tile).toEqual({ x: 3, y: 0 })

    expect(enemy.hurt('right', grid)).toBe(false)
    expect(enemy.hp).toBe(2)
  })

  it('atordoado não anda', () => {
    const grid = gridFrom('.....')
    const { enemy } = chase({ x: 2, y: 0 }, { x: 0, y: 0 })
    enemy.hurt('right', grid)
    const stunnedAt = { ...enemy.tile }
    enemy.step(0.1, grid)
    expect(enemy.tile).toEqual(stunnedAt)
  })

  it('não é empurrado para dentro de parede', () => {
    const grid = gridFrom('..#')
    const { enemy } = chase({ x: 1, y: 0 }, { x: 0, y: 0 })
    enemy.hurt('right', grid)
    expect(enemy.tile).toEqual({ x: 1, y: 0 })
  })

  it('morre quando a vida acaba', () => {
    const grid = gridFrom('...')
    const target = new Entity(FAKE_LOOK, { x: 0, y: 0 }, 0.1)
    const enemy = new Enemy(FAKE_LOOK, { x: 2, y: 0 }, options({ hp: 1 }), target)
    enemy.hurt('right', grid)
    expect(enemy.alive).toBe(false)
  })

  it('acelera a cada intervalo, até o limite', () => {
    const grid = gridFrom('.')
    const speedUp = { every: 10, factor: 0.5, minStepDuration: 0.03 }
    const { enemy } = chase({ x: 0, y: 0 }, { x: 0, y: 0 }, { speedUp })
    simulate(10.01, (dt) => enemy.step(dt, grid))
    expect(enemy.stepDuration).toBeCloseTo(0.05)
    simulate(20, (dt) => enemy.step(dt, grid))
    expect(enemy.stepDuration).toBe(0.03)
  })

  it('teletransporta para longe do alvo no intervalo certo', () => {
    const grid = gridFrom(...Array.from({ length: 10 }, () => '..........'))
    const teleport = { every: 2, minDistance: 8 }
    const { enemy, target } = chase({ x: 1, y: 0 }, { x: 0, y: 0 }, { teleport })

    simulate(1.9, (dt) => enemy.step(dt, grid))
    expect(enemy.takeEvents()).toEqual([])

    simulate(0.2, (dt) => enemy.step(dt, grid))
    const events = enemy.takeEvents()
    expect(events).toHaveLength(1)
    const to = events[0]!.to
    expect(manhattan(to, target.tile)).toBeGreaterThanOrEqual(8)
    // Depois de reaparecer ele volta a perseguir, então pode já ter dado um ou dois passos
    expect(manhattan(enemy.tile, to)).toBeLessThanOrEqual(2)
    expect(enemy.takeEvents()).toEqual([])
  })
})
