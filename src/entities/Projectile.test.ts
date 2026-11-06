import { describe, expect, it } from 'vitest'
import { gridFrom, simulate } from '../test/helpers'
import type { Point } from '../world/Pathfinding'
import { BOSS_SHOT_SETTINGS, Projectile, PROJECTILE_SETTINGS } from './Projectile'

const neverHits = () => false

describe('Projectile', () => {
  const open = gridFrom('..........', '..........')

  it('voa em linha reta e para no alcance de 3 casas a partir do personagem', () => {
    const shot = new Projectile({ x: 1, y: 0 }, 'right')
    simulate(2, (dt) => shot.advance(dt, open, neverHits))
    expect(shot.end).toBe('range')
    expect(shot.position.y).toBe(0)
    expect(shot.position.x).toBeCloseTo(1 + PROJECTILE_SETTINGS.range)
  })

  it('leva alcance / velocidade segundos para chegar ao fim', () => {
    const shot = new Projectile({ x: 0, y: 0 }, 'right')
    const flightTime = (PROJECTILE_SETTINGS.range - PROJECTILE_SETTINGS.handOffset) / PROJECTILE_SETTINGS.speed
    simulate(flightTime - 0.05, (dt) => shot.advance(dt, open, neverHits))
    expect(shot.isFlying).toBe(true)
    simulate(0.1, (dt) => shot.advance(dt, open, neverHits))
    expect(shot.isFlying).toBe(false)
  })

  it('sai da mão: começa à frente do centro do personagem', () => {
    const shot = new Projectile({ x: 5, y: 1 }, 'up')
    expect(shot.position).toEqual({ x: 5, y: 1 - PROJECTILE_SETTINGS.handOffset })
  })

  it('para ao bater numa parede', () => {
    const grid = gridFrom('...#......')
    const shot = new Projectile({ x: 1, y: 0 }, 'right')
    simulate(1, (dt) => shot.advance(dt, grid, neverHits))
    expect(shot.end).toBe('wall')
    expect(shot.position.x).toBeLessThan(3)
  })

  it('para no primeiro alvo atingido', () => {
    const enemy: Point = { x: 3, y: 0 }
    const shot = new Projectile({ x: 1, y: 0 }, 'right')
    const hits = (p: Point) => Math.hypot(p.x - enemy.x, p.y - enemy.y) < PROJECTILE_SETTINGS.hitDistance
    simulate(1, (dt) => shot.advance(dt, open, hits))
    expect(shot.end).toBe('hit')
    expect(Math.abs(shot.position.x - enemy.x)).toBeLessThan(PROJECTILE_SETTINGS.hitDistance)
  })

  it('não atravessa um alvo mesmo com frame longo', () => {
    const enemy: Point = { x: 2, y: 0 }
    const shot = new Projectile({ x: 0, y: 0 }, 'right')
    const hits = (p: Point) => Math.hypot(p.x - enemy.x, p.y - enemy.y) < PROJECTILE_SETTINGS.hitDistance
    shot.advance(1, open, hits) // um único frame de 1s
    expect(shot.end).toBe('hit')
  })

  it('não acerta nada além do alcance', () => {
    const enemy: Point = { x: 1 + PROJECTILE_SETTINGS.range + 1, y: 0 }
    const shot = new Projectile({ x: 1, y: 0 }, 'right')
    const hits = (p: Point) => Math.hypot(p.x - enemy.x, p.y - enemy.y) < PROJECTILE_SETTINGS.hitDistance
    simulate(2, (dt) => shot.advance(dt, open, hits))
    expect(shot.end).toBe('range')
  })

  it('depois de terminar, não anda mais', () => {
    const shot = new Projectile({ x: 0, y: 0 }, 'down')
    simulate(2, (dt) => shot.advance(dt, open, neverHits))
    const final = { ...shot.position }
    shot.advance(1, open, neverHits)
    expect(shot.position).toEqual(final)
  })

  it('para ao bater numa árvore', () => {
    const grid = gridFrom('...T......')
    const shot = new Projectile({ x: 1, y: 0 }, 'right')
    simulate(1, (dt) => shot.advance(dt, grid, neverHits))
    expect(shot.end).toBe('wall')
  })

  it('o tiro do boss usa a velocidade e o alcance dele', () => {
    const shot = new Projectile({ x: 0, y: 0 }, 'right', 'boss')
    expect(shot.kind).toBe('boss')
    expect(shot.settings).toBe(BOSS_SHOT_SETTINGS)
    expect(BOSS_SHOT_SETTINGS.speed).toBeLessThan(PROJECTILE_SETTINGS.speed)

    simulate(3, (dt) => shot.advance(dt, open, neverHits))
    expect(shot.end).toBe('range')
    expect(shot.position.x).toBeCloseTo(BOSS_SHOT_SETTINGS.range)
  })
})
