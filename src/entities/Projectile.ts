import type { Point, Walkable } from '../world/Pathfinding'
import { STEP, type Direction } from './Entity'

/** Quem lançou o projétil. */
export type ProjectileKind = 'player' | 'boss'

/** Ajustes de um tipo de projétil. */
export interface ProjectileSettings {
  /** Velocidade, em casas por segundo. */
  speed: number
  /** Alcance máximo, em casas, contado a partir do centro de quem lançou. */
  range: number
  /** Distância da mão até o centro de quem lançou, em casas. */
  handOffset: number
  /** Distância, em casas, entre o projétil e o alvo para acertá-lo. */
  hitDistance: number
  /** Maior deslocamento por verificação de colisão, em casas (evita atravessar alvos). */
  maxSubstep: number
  /** Cores do núcleo, do brilho e do rastro (r, g, b). */
  colors: { core: string; glow: string; edge: string; trail: string }
}

/** Ajustes do poder lançado pelo jogador. */
export const PROJECTILE_SETTINGS: ProjectileSettings = {
  speed: 10,
  range: 3,
  handOffset: 0.35,
  hitDistance: 0.55,
  maxSubstep: 0.2,
  colors: { core: '255, 255, 255', glow: '140, 220, 255', edge: '60, 120, 255', trail: '120, 200, 255' },
}

/** Ajustes do tiro do boss: mais lento que o poder do jogador, para dar tempo de desviar. */
export const BOSS_SHOT_SETTINGS: ProjectileSettings = {
  speed: 6,
  range: 7,
  handOffset: 0.35,
  hitDistance: 0.5,
  maxSubstep: 0.2,
  colors: { core: '255, 240, 220', glow: '255, 90, 60', edge: '170, 0, 60', trail: '255, 80, 80' },
}

/** Ajustes de cada tipo de projétil. */
const SETTINGS_BY_KIND: Record<ProjectileKind, ProjectileSettings> = {
  player: PROJECTILE_SETTINGS,
  boss: BOSS_SHOT_SETTINGS,
}

/** Quanto o desenho sobe em relação ao centro da casa, para sair na altura da mão (em casas). */
const HAND_HEIGHT = 0.15

/** Quantas posições anteriores formam o rastro. */
const TRAIL_LENGTH = 6

/** Como o voo do poder terminou. */
export type ProjectileEnd = 'flying' | 'hit' | 'wall' | 'range'

/**
 * Projétil (o poder do jogador ou o tiro do boss): sai da mão e voa em linha reta
 * até acertar algo, bater numa parede ou árvore, ou atingir o alcance máximo.
 *
 * A posição usa a mesma convenção dos personagens: `(x, y)` em unidades de casa,
 * com o centro da casa em `(x + 0.5, y + 0.5)`.
 */
export class Projectile {
  /** Posição atual, em unidades de casa. */
  position: Point
  /** Estado do voo; qualquer valor diferente de `flying` significa que terminou. */
  end: ProjectileEnd = 'flying'
  /** Ajustes do tipo deste projétil. */
  readonly settings: ProjectileSettings
  private traveled = 0
  private readonly maxTravel: number
  private trail: Point[] = []

  /**
   * @param from Posição de quem lança (em unidades de casa).
   * @param direction Direção do voo.
   * @param kind Quem lançou: define velocidade, alcance e cor.
   */
  constructor(
    from: Point,
    readonly direction: Direction,
    readonly kind: ProjectileKind = 'player',
  ) {
    this.settings = SETTINGS_BY_KIND[kind]
    const step = STEP[direction]
    this.position = {
      x: from.x + step.x * this.settings.handOffset,
      y: from.y + step.y * this.settings.handOffset,
    }
    this.maxTravel = this.settings.range - this.settings.handOffset
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

    let remaining = Math.min(this.settings.speed * dt, this.maxTravel - this.traveled)
    const step = STEP[this.direction]

    while (remaining > 0) {
      const delta = Math.min(remaining, this.settings.maxSubstep)
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
   * Desenha o projétil como uma esfera brilhante com rastro, na cor do seu tipo.
   * @param ctx Contexto onde desenhar.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(ctx: CanvasRenderingContext2D, tileSize: number): void {
    const { colors } = this.settings
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
      ctx.fillStyle = `rgba(${colors.trail}, ${0.35 * t})`
      ctx.beginPath()
      ctx.arc(x, y, tileSize * 0.14 * t, 0, Math.PI * 2)
      ctx.fill()
    })

    // Esfera: núcleo claro e brilho externo na cor do tipo
    const { x, y } = toPixels(this.position)
    const glow = ctx.createRadialGradient(x, y, 0, x, y, tileSize * 0.35)
    glow.addColorStop(0, `rgba(${colors.core}, 1)`)
    glow.addColorStop(0.35, `rgba(${colors.glow}, 0.9)`)
    glow.addColorStop(1, `rgba(${colors.edge}, 0)`)
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(x, y, tileSize * 0.35, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}
