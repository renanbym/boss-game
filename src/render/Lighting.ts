import type { Point } from '../world/Pathfinding'

/** Uma fonte de luz na cena. */
export interface Light {
  /** Posição, em unidades de casa (mesma convenção dos personagens). */
  position: Point
  /** Alcance da luz, em casas. */
  radius: number
  /** Quanto da escuridão a luz remove no centro, de 0 a 1. */
  intensity: number
  /** Cor da luz (r, g, b). Luz quente por padrão. */
  color?: string
}

/** Ajustes da iluminação. */
export const LIGHTING_SETTINGS = {
  /** Escuridão fora das luzes, de 0 (nenhuma) a 1 (preto). */
  darkness: 0.68,
  /** Cor da escuridão (r, g, b): um azul-arroxeado bem escuro, como sombra de masmorra. */
  shadow: '14, 9, 22',
  /** Força do brilho colorido das luzes sobre a cena. */
  glow: 0.22,
  /** Força da vinheta nas bordas da tela. */
  vignette: 0.55,
} as const

/**
 * Iluminação de masmorra: escurece a cena e abre "furos" de luz quente ao redor das fontes,
 * depois aplica um brilho colorido e uma vinheta nas bordas.
 *
 * Usa um canvas fora da tela para montar a escuridão antes de aplicar por cima da cena.
 */
export class Lighting {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  /**
   * @param width Largura da cena, em pixels.
   * @param height Altura da cena, em pixels.
   */
  constructor(
    private width: number,
    private height: number,
  ) {
    this.canvas = document.createElement('canvas')
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    this.ctx = ctx
    this.resize(width, height)
  }

  /**
   * Ajusta o tamanho da camada de luz (quando o mapa muda).
   * @param width Largura da cena, em pixels.
   * @param height Altura da cena, em pixels.
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
    this.canvas.width = width
    this.canvas.height = height
  }

  /**
   * Aplica escuridão, luzes, brilho e vinheta por cima da cena já desenhada.
   * @param target Contexto da cena.
   * @param lights Fontes de luz.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(target: CanvasRenderingContext2D, lights: Light[], tileSize: number): void {
    const { ctx, width, height } = this
    const toPixels = (light: Light) => ({
      x: (light.position.x + 0.5) * tileSize,
      y: (light.position.y + 0.5) * tileSize,
      r: light.radius * tileSize,
    })

    // 1) Escuridão com furos onde há luz
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = `rgba(${LIGHTING_SETTINGS.shadow}, ${LIGHTING_SETTINGS.darkness})`
    ctx.fillRect(0, 0, width, height)
    ctx.globalCompositeOperation = 'destination-out'
    for (const light of lights) {
      const { x, y, r } = toPixels(light)
      const hole = ctx.createRadialGradient(x, y, 0, x, y, r)
      hole.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`)
      hole.addColorStop(0.55, `rgba(0, 0, 0, ${light.intensity * 0.6})`)
      hole.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = hole
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
    ctx.globalCompositeOperation = 'source-over'
    target.drawImage(this.canvas, 0, 0)

    // 2) Brilho colorido das luzes (tocha alaranjada, poderes na cor deles)
    target.save()
    target.globalCompositeOperation = 'lighter'
    for (const light of lights) {
      const { x, y, r } = toPixels(light)
      const color = light.color ?? '255, 150, 60'
      const glow = target.createRadialGradient(x, y, 0, x, y, r * 0.8)
      glow.addColorStop(0, `rgba(${color}, ${LIGHTING_SETTINGS.glow * light.intensity})`)
      glow.addColorStop(1, `rgba(${color}, 0)`)
      target.fillStyle = glow
      target.fillRect(x - r, y - r, r * 2, r * 2)
    }
    target.restore()

    // 3) Vinheta: bordas mais escuras puxam o olhar para o centro
    const vignette = target.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.35,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75,
    )
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
    vignette.addColorStop(1, `rgba(0, 0, 0, ${LIGHTING_SETTINGS.vignette})`)
    target.fillStyle = vignette
    target.fillRect(0, 0, width, height)
  }
}
