import { describe, expect, it } from 'vitest'
import type { Input } from '../core/Input'
import { FAKE_LOOK, gridFrom, simulate } from '../test/helpers'
import type { Direction } from './Entity'
import { Player, PLAYER_SETTINGS } from './Player'

/**
 * Teclado falso: só o que o `Player` lê.
 * @param held Direção segurada.
 * @param tapped Direção tocada e ainda não usada.
 * @returns Objeto com a mesma forma usada pelo `Player`.
 */
function fakeInput(held: Direction | null = null, tapped: Direction | null = null): Input {
  const input = {
    direction: held,
    tappedDirection: tapped,
    clearTap() {
      input.tappedDirection = null
    },
  }
  return input as unknown as Input
}

describe('Player', () => {
  const grid = gridFrom('.....', '.....')

  it('anda enquanto a direção está segurada', () => {
    const p = new Player(FAKE_LOOK, { x: 0, y: 0 }, 3)
    const input = fakeInput('right')
    simulate(PLAYER_SETTINGS.stepDuration * 3 + 0.01, (dt) => p.step(dt, input, grid))
    expect(p.tile.x).toBeGreaterThanOrEqual(3)
  })

  it('um toque rápido anda uma casa só', () => {
    const p = new Player(FAKE_LOOK, { x: 0, y: 0 }, 3)
    const input = fakeInput(null, 'down')
    simulate(1, (dt) => p.step(dt, input, grid))
    expect(p.tile).toEqual({ x: 0, y: 1 })
    expect(input.tappedDirection).toBeNull()
  })

  it('um toque contra a parede é descartado, mas vira o personagem', () => {
    const p = new Player(FAKE_LOOK, { x: 0, y: 0 }, 3)
    const input = fakeInput(null, 'up')
    p.step(1 / 60, input, grid)
    expect(p.tile).toEqual({ x: 0, y: 0 })
    expect(p.facing).toBe('up')
    expect(input.tappedDirection).toBeNull()
  })

  it('ataca a casa à frente e respeita a recarga', () => {
    const p = new Player(FAKE_LOOK, { x: 1, y: 1 }, 3)
    p.facing = 'left'
    expect(p.attack()).toEqual({ x: 0, y: 1 })
    expect(p.attack()).toBeNull()

    simulate(PLAYER_SETTINGS.attackCooldown + 0.01, (dt) => p.step(dt, fakeInput(), grid))
    expect(p.attack()).not.toBeNull()
  })

  it('perde vida, fica invulnerável e só volta a ser atingido depois', () => {
    const p = new Player(FAKE_LOOK, { x: 0, y: 0 }, 3)
    expect(p.hurt()).toBe(true)
    expect(p.lives).toBe(2)
    expect(p.isInvulnerable).toBe(true)
    expect(p.hurt()).toBe(false)
    expect(p.lives).toBe(2)

    simulate(PLAYER_SETTINGS.invulnerableTime + 0.01, (dt) => p.step(dt, fakeInput(), grid))
    expect(p.isInvulnerable).toBe(false)
    expect(p.hurt()).toBe(true)
    expect(p.lives).toBe(1)
  })

  it('morre ao perder a última vida', () => {
    const p = new Player(FAKE_LOOK, { x: 0, y: 0 }, 1)
    p.hurt()
    expect(p.lives).toBe(0)
    expect(p.alive).toBe(false)
    expect(p.attack()).toBeNull()
  })
})
