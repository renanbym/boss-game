import { describe, expect, it } from 'vitest'
import { FAKE_LOOK, gridFrom } from '../test/helpers'
import { Entity } from './Entity'

describe('Entity', () => {
  const grid = gridFrom(
    '...', //
    '.#.',
  )

  it('anda para uma casa livre e chega depois de stepDuration', () => {
    const e = new Entity(FAKE_LOOK, { x: 0, y: 0 }, 0.2)
    expect(e.tryMove('right', grid)).toBe(true)
    expect(e.tile).toEqual({ x: 1, y: 0 })
    expect(e.isMoving).toBe(true)

    e.update(0.1)
    expect(e.position).toEqual({ x: 0.5, y: 0 })

    e.update(0.1)
    expect(e.isMoving).toBe(false)
    expect(e.position).toEqual({ x: 1, y: 0 })
  })

  it('não entra em parede nem sai do mapa, mas vira para a direção', () => {
    const e = new Entity(FAKE_LOOK, { x: 1, y: 0 }, 0.2)
    expect(e.tryMove('down', grid)).toBe(false)
    expect(e.facing).toBe('down')
    expect(e.tryMove('up', grid)).toBe(false)
    expect(e.tile).toEqual({ x: 1, y: 0 })
  })

  it('não começa outro passo no meio de um passo', () => {
    const e = new Entity(FAKE_LOOK, { x: 0, y: 0 }, 0.2)
    e.tryMove('right', grid)
    expect(e.tryMove('right', grid)).toBe(false)
    expect(e.tile).toEqual({ x: 1, y: 0 })
  })

  it('placeAt cancela o passo e coloca direto na casa', () => {
    const e = new Entity(FAKE_LOOK, { x: 0, y: 0 }, 0.2)
    e.tryMove('right', grid)
    e.placeAt({ x: 2, y: 1 })
    expect(e.isMoving).toBe(false)
    expect(e.position).toEqual({ x: 2, y: 1 })
  })

  it('morto não anda', () => {
    const e = new Entity(FAKE_LOOK, { x: 0, y: 0 }, 0.2)
    e.die()
    expect(e.tryMove('right', grid)).toBe(false)
  })

  it('mede a distância pela posição desenhada', () => {
    const a = new Entity(FAKE_LOOK, { x: 0, y: 0 }, 0.2)
    const b = new Entity(FAKE_LOOK, { x: 2, y: 0 }, 0.2)
    expect(a.distanceTo(b)).toBe(2)
    a.tryMove('right', grid)
    a.update(0.1)
    expect(a.distanceTo(b)).toBe(1.5)
  })
})
