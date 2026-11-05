import type { Point } from '../world/Pathfinding'

/** Tamanho de cada célula das spritesheets de efeito, em pixels. */
const CELL = 192

/** Descreve quais quadros de uma spritesheet de efeito usar. */
export interface EffectSheet {
  image: HTMLImageElement
  /** Primeiro quadro (contando da esquerda para a direita, de cima para baixo). */
  firstFrame: number
  /** Quantos quadros tocar a partir de `firstFrame`. */
  frameCount: number
}

/** Opções de um efeito na tela. */
export interface EffectOptions {
  /** Centro do efeito, em unidades de casa. */
  center: Point
  /** Tamanho do efeito desenhado, em casas. */
  size: number
  /** Tempo de cada quadro, em segundos. */
  frameTime?: number
  /** Rotação, em radianos. */
  rotation?: number
}

/**
 * Animação que toca uma vez e some (golpe, explosão, teletransporte).
 * As spritesheets seguem o padrão de células 192x192 em linhas de 5.
 */
export class SpriteEffect {
  private time = 0
  private readonly frameTime: number
  private readonly rotation: number

  /**
   * @param sheet Spritesheet e intervalo de quadros.
   * @param options Posição, tamanho, velocidade e rotação.
   */
  constructor(private readonly sheet: EffectSheet, private readonly options: EffectOptions) {
    this.frameTime = options.frameTime ?? 0.05
    this.rotation = options.rotation ?? 0
  }

  /** true quando a animação terminou. */
  get done(): boolean {
    return this.time >= this.sheet.frameCount * this.frameTime
  }

  /**
   * Avança a animação.
   * @param dt Tempo desde o último frame, em segundos.
   */
  update(dt: number): void {
    this.time += dt
  }

  /**
   * Desenha o quadro atual.
   * @param ctx Contexto onde desenhar.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(ctx: CanvasRenderingContext2D, tileSize: number): void {
    if (this.done) return
    const columns = Math.floor(this.sheet.image.width / CELL)
    const frame = this.sheet.firstFrame + Math.floor(this.time / this.frameTime)
    const sx = (frame % columns) * CELL
    const sy = Math.floor(frame / columns) * CELL
    const size = this.options.size * tileSize

    ctx.save()
    ctx.translate((this.options.center.x + 0.5) * tileSize, (this.options.center.y + 0.5) * tileSize)
    ctx.rotate(this.rotation)
    ctx.drawImage(this.sheet.image, sx, sy, CELL, CELL, -size / 2, -size / 2, size, size)
    ctx.restore()
  }
}
