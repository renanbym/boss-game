import type { Point, Walkable } from '../world/Pathfinding'
import { STEP, type Direction } from './Entity'

/** Ajustes do poder lançado pelo jogador. */
export const PROJECTILE_SETTINGS = {
  /** Velocidade, em casas por segundo. */
  speed: 10,
  /** Alcance máximo, em casas, contado a partir do centro do personagem. */
  range: 3,
  /** Distância da mão até o centro do personagem, em casas. */
  handOffset: 0.35,
  /** Distância, em casas, entre o poder e um inimigo para acertá-lo. */
  hitDistance: 0.55,
  /** Maior deslocamento por verificação de colisão, em casas (evita atravessar inimigos). */
  maxSubstep: 0.2,
} as const

/** Quanto o desenho sobe em relação ao centro da casa, para sair na altura da mão (em casas). */
const HAND_HEIGHT = 0.15

/** Quantas posições anteriores formam o rastro. */
const TRAIL_LENGTH = 6

/** Como o voo do poder terminou. */
export type ProjectileEnd = 'flying' | 'hit' | 'wall' | 'range'

/**
 * Poder lançado pelo jogador: sai da mão e voa em linha reta até acertar algo,
 * bater numa parede ou atingir o alcance máximo.
 *
 * A posição usa a mesma convenção dos personagens: `(x, y)` em unidades de casa,
 * com o centro da casa em `(x + 0.5, y + 0.5)`.
 */
export class Projectile {
  /** Posição atual, em unidades de casa. */
  position: Point
  /** Estado do voo; qualquer valor diferente de `flying` significa que terminou. */
  end: ProjectileEnd = 'flying'
  private traveled = 0
  private readonly maxTravel: number
  private trail: Point[] = []

  /**
   * @param from Posição do personagem que lança (em unidades de casa).
   * @param direction Direção do voo.
   */
  constructor(
    from: Point,
    readonly direction: Direction,
  ) {
    const step = STEP[direction]
    this.position = {
      x: from.x + step.x * PROJECTILE_SETTINGS.handOffset,
      y: from.y + step.y * PROJECTILE_SETTINGS.handOffset,
    }
    this.maxTravel = PROJECTILE_SETTINGS.range - PROJECTILE_SETTINGS.handOffset
  }

  /** true enquanto ainda está voando. */
  get isFlying(): boolean {
    return this.end === 'flying'
  }

  /**
   * Avança o voo em pequenos passos, checando colisões a cada um.
   * @param dt Tempo desde o último frame, em segundos.
   * @param grid Grid usado para checar paredes.
   * @param collide Chamada a cada passo com a posição atual; devolve true se o poder acertou algo.
   */
  advance(dt: number, grid: Walkable, collide: (position: Point) => boolean): void {
    if (!this.isFlying) return
    if (collide(this.position)) {
      this.end = 'hit'
      return
    }

    let remaining = Math.min(PROJECTILE_SETTINGS.speed * dt, this.maxTravel - this.traveled)
    const step = STEP[this.direction]

    while (remaining > 0) {
      const delta = Math.min(remaining, PROJECTILE_SETTINGS.maxSubstep)
      remaining -= delta
      this.trail.push({ ...this.position })
      this.position = { x: this.position.x + step.x * delta, y: this.position.y + step.y * delta }
      this.traveled += delta

      if (!grid.isWalkable(Math.round(this.position.x), Math.round(this.position.y))) {
        this.end = 'wall'
        break
      }
      if (collide(this.position)) {
        this.end = 'hit'
        break
      }
    }

    this.trail = this.trail.slice(-TRAIL_LENGTH)
    if (this.isFlying && this.traveled >= this.maxTravel - 1e-9) this.end = 'range'
  }

  /**
   * Distância percorrida desde a mão, em casas.
   * @returns Distância em casas.
   */
  distanceTraveled(): number {
    return this.traveled
  }

  /**
   * Desenha o poder como uma esfera brilhante com rastro.
   * @param ctx Contexto onde desenhar.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(ctx: CanvasRenderingContext2D, tileSize: number): void {
    const toPixels = (p: Point) => ({
      x: (p.x + 0.5) * tileSize,
      y: (p.y + 0.5 - HAND_HEIGHT) * tileSize,
    })

    ctx.save()
    ctx.globalCompositeOperation = 'lighter'

    // Rastro: círculos cada vez menores e mais transparentes
    this.trail.forEach((point, i) => {
      const { x, y } = toPixels(point)
      const t = (i + 1) / (this.trail.length + 1)
      ctx.fillStyle = `rgba(120, 200, 255, ${0.35 * t})`
      ctx.beginPath()
      ctx.arc(x, y, tileSize * 0.14 * t, 0, Math.PI * 2)
      ctx.fill()
    })

    // Esfera: brilho externo azul e núcleo branco
    const { x, y } = toPixels(this.position)
    const glow = ctx.createRadialGradient(x, y, 0, x, y, tileSize * 0.35)
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)')
    glow.addColorStop(0.35, 'rgba(140, 220, 255, 0.9)')
    glow.addColorStop(1, 'rgba(60, 120, 255, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, tileSize * 0.35, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}
