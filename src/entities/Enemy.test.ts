import { describe, expect, it } from 'vitest'
import { FAKE_LOOK, gridFrom, simulate } from '../test/helpers'
import { manhattan, type Point } from '../world/Pathfinding'
import { directionTowards, Enemy, type Abilities, type EnemyEvent, type EnemyOptions } from './Enemy'
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

  it('refaz a rota quando uma árvore reaparece no caminho', () => {
    const grid = gridFrom(
      '..T..', //
      '.....',
    )
    // Árvore some: o caminho mais curto passa por ela
    simulate(10, (dt) => grid.grove.update(dt, () => false))
    expect(grid.isWalkable(2, 0)).toBe(true)

    const { enemy, target } = chase({ x: 0, y: 0 }, { x: 4, y: 0 })
    enemy.step(1 / 60, grid) // calcula a rota pela linha de cima
    const tree = grid.grove.trees[0]!
    tree.phase = 'solid' // a árvore volta antes de ele passar
    tree.timeLeft = 99

    simulate(2, (dt) => enemy.step(dt, grid))
    expect(enemy.distanceTo(target)).toBe(0)
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

  describe('janela de vulnerabilidade (boss)', () => {
    const vulnerability = { every: 10, duration: 3 }
    const grid = gridFrom('.....')

    /**
     * Boss parado (alvo na mesma casa) com janela de vulnerabilidade.
     * @returns O boss.
     */
    const boss = () => chase({ x: 2, y: 0 }, { x: 2, y: 0 }, { vulnerability }).enemy

    it('bloqueia golpes antes da primeira janela', () => {
      const b = boss()
      simulate(9.9, (dt) => b.step(dt, grid))
      expect(b.isVulnerable).toBe(false)
      expect(b.hurt('right', grid)).toBe(false)
      expect(b.hp).toBe(3)
    })

    it('leva dano durante os 3 segundos da janela', () => {
      const b = boss()
      simulate(10.05, (dt) => b.step(dt, grid))
      expect(b.isVulnerable).toBe(true)
      expect(b.hurt('right', grid)).toBe(true)
      expect(b.hp).toBe(2)
    })

    it('fecha depois de 3 segundos e abre de novo 10 segundos depois da anterior', () => {
      const b = boss()
      simulate(13.1, (dt) => b.step(dt, grid))
      expect(b.isVulnerable).toBe(false)
      expect(b.hurt('right', grid)).toBe(false)

      simulate(7, (dt) => b.step(dt, grid)) // ~20.1s
      expect(b.isVulnerable).toBe(true)
    })

    it('mostra quanto falta para abrir e para fechar', () => {
      const b = boss()
      simulate(4, (dt) => b.step(dt, grid))
      expect(b.vulnerabilityCountdown).toBeCloseTo(6, 1)
      simulate(7, (dt) => b.step(dt, grid)) // ~11s, janela aberta
      expect(b.vulnerabilityCountdown).toBeCloseTo(2, 1)
    })

    it('pisca enquanto está vulnerável e fica normal quando protegido', () => {
      const b = boss()
      const protectedOpacity = new Set<number>()
      simulate(9.5, (dt) => {
        b.step(dt, grid)
        protectedOpacity.add(b.opacity)
      })
      expect([...protectedOpacity]).toEqual([1])

      const vulnerableOpacity = new Set<number>()
      simulate(2.5, (dt) => {
        b.step(dt, grid)
        if (b.isVulnerable) vulnerableOpacity.add(b.opacity)
      })
      expect(vulnerableOpacity.size).toBe(2) // alterna entre visível e apagado
    })

    it('inimigos sem janela sempre levam dano e não piscam', () => {
      const { enemy } = chase({ x: 2, y: 0 }, { x: 2, y: 0 })
      expect(enemy.isVulnerable).toBe(true)
      expect(enemy.vulnerabilityCountdown).toBeNull()
      enemy.step(0.5, grid)
      expect(enemy.opacity).toBe(1)
    })
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
    const event = events[0]!
    if (event.type !== 'teleport') throw new Error('esperava um teletransporte')
    const to = event.to
    expect(manhattan(to, target.tile)).toBeGreaterThanOrEqual(8)
    // Depois de reaparecer ele volta a perseguir, então pode já ter dado um ou dois passos
    expect(manhattan(enemy.tile, to)).toBeLessThanOrEqual(2)
    expect(enemy.takeEvents()).toEqual([])
  })

  describe('tiro do boss', () => {
    const grid = gridFrom('..........', '..........', '..........')
    const shooter = { every: 5 }
    const vulnerability = { every: 10, duration: 3 }

    /**
     * Junta os tiros disparados enquanto a simulação roda.
     * @param enemy Inimigo observado.
     * @param seconds Quanto tempo simular.
     * @returns Instantes (em segundos) e eventos de cada tiro.
     */
    function collectShots(enemy: Enemy, seconds: number) {
      const shots: { at: number; event: EnemyEvent }[] = []
      let time = 0
      simulate(seconds, (dt) => {
        enemy.step(dt, grid)
        time += dt
        for (const event of enemy.takeEvents()) if (event.type === 'shoot') shots.push({ at: time, event })
      })
      return shots
    }

    it('atira a cada 5 segundos', () => {
      const target = new Entity(FAKE_LOOK, { x: 9, y: 0 }, 0.1)
      const boss = new Enemy(FAKE_LOOK, { x: 0, y: 0 }, options({ stepDuration: 999, abilities: { shooter } }), target)
      const shots = collectShots(boss, 16)
      expect(shots.map((s) => Math.round(s.at))).toEqual([5, 10, 15])
    })

    it('não atira enquanto está vulnerável; o tiro espera a janela fechar', () => {
      const target = new Entity(FAKE_LOOK, { x: 9, y: 0 }, 0.1)
      const abilities = { shooter, vulnerability }
      const boss = new Enemy(FAKE_LOOK, { x: 0, y: 0 }, options({ stepDuration: 999, abilities }), target)
      const shots = collectShots(boss, 21)
      // 5s: protegido, atira. 10s: vulnerável (10–13s), espera até 13s. 18s: protegido, atira.
      expect(shots.map((s) => Math.round(s.at))).toEqual([5, 13, 18])
      for (const shot of shots) {
        const at = shot.at
        expect(at >= 10 && at < 13).toBe(false)
      }
    })

    it('mira na direção do alvo e vira para ele', () => {
      const target = new Entity(FAKE_LOOK, { x: 2, y: 2 }, 0.1)
      const boss = new Enemy(FAKE_LOOK, { x: 2, y: 0 }, options({ stepDuration: 999, abilities: { shooter } }), target)
      const [shot] = collectShots(boss, 5.1)
      expect(shot?.event).toMatchObject({ type: 'shoot', direction: 'down' })
      expect(boss.facing).toBe('down')
    })

    it('não atira atordoado nem depois que o alvo morreu', () => {
      const target = new Entity(FAKE_LOOK, { x: 9, y: 0 }, 0.1)
      const boss = new Enemy(FAKE_LOOK, { x: 0, y: 0 }, options({ stepDuration: 999, abilities: { shooter } }), target)
      target.die()
      expect(collectShots(boss, 6)).toEqual([])
    })
  })

  describe('directionTowards', () => {
    it('escolhe o eixo com a maior diferença', () => {
      expect(directionTowards({ x: 0, y: 0 }, { x: 5, y: 2 })).toBe('right')
      expect(directionTowards({ x: 0, y: 0 }, { x: -5, y: 2 })).toBe('left')
      expect(directionTowards({ x: 0, y: 0 }, { x: 1, y: 4 })).toBe('down')
      expect(directionTowards({ x: 0, y: 0 }, { x: 1, y: -4 })).toBe('up')
    })
  })
})
