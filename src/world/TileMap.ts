import type { Images } from '../core/assets'
import { Tile, type MapData } from './maps'
import type { Point, Walkable } from './Pathfinding'

/** Tamanho de cada tile nas spritesheets de cenário, em pixels. */
const SOURCE_TILE = 48

/**
 * Mapa do jogo: sabe quais casas são parede e desenha o cenário.
 *
 * O cenário é desenhado uma única vez num canvas fora da tela e só copiado a cada frame.
 */
export class TileMap implements Walkable {
  readonly width: number
  readonly height: number
  private readonly background: HTMLCanvasElement

  /**
   * @param data Mapa indexado como `data[y][x]`.
   * @param tileSize Tamanho de cada casa na tela, em pixels.
   * @param images Imagens já carregadas (usa `floor` e `walls`).
   */
  constructor(
    private readonly data: MapData,
    readonly tileSize: number,
    images: Images,
  ) {
    this.height = data.length
    this.width = data[0]?.length ?? 0
    this.background = this.prerender(images)
  }

  /** Largura do mapa, em pixels. */
  get pixelWidth(): number {
    return this.width * this.tileSize
  }

  /** Altura do mapa, em pixels. */
  get pixelHeight(): number {
    return this.height * this.tileSize
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se a casa está dentro do mapa e não é parede.
   */
  isWalkable(x: number, y: number): boolean {
    return this.data[y]?.[x] === Tile.Floor
  }

  /**
   * Sorteia uma casa livre.
   * @param avoid Casas que não podem ser sorteadas (ex.: onde já há alguém).
   * @param minDistance Distância Manhattan mínima até cada casa de `avoid`.
   * @returns Uma casa livre que respeita as restrições.
   * @throws Se o mapa não tiver nenhuma casa livre que atenda às restrições.
   */
  randomFreeTile(avoid: Point[] = [], minDistance = 0): Point {
    const candidates: Point[] = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isWalkable(x, y)) continue
        const farEnough = avoid.every(p => Math.abs(p.x - x) + Math.abs(p.y - y) >= minDistance)
        if (farEnough) candidates.push({ x, y })
      }
    }
    const pick = candidates[Math.floor(Math.random() * candidates.length)]
    if (!pick) throw new Error('Nenhuma casa livre disponível no mapa')
    return pick
  }

  /**
   * Copia o cenário pronto para o canvas.
   * @param ctx Contexto onde desenhar.
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.background, 0, 0)
  }

  /**
   * Desenha chão e paredes num canvas fora da tela.
   * @param images Imagens do cenário.
   * @returns Canvas com o cenário completo.
   */
  private prerender(images: Images): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.pixelWidth
    canvas.height = this.pixelHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')

    const s = this.tileSize
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        ctx.drawImage(images.floor, 0, SOURCE_TILE, SOURCE_TILE, SOURCE_TILE, x * s, y * s, s, s)

        if (!this.isWalkable(x, y)) {
          // Duas variações de parede para o labirinto não ficar repetitivo
          const column = Math.random() < 0.3 ? 10 : 9
          ctx.drawImage(
            images.walls,
            column * SOURCE_TILE, 2 * SOURCE_TILE, SOURCE_TILE, SOURCE_TILE,
            x * s, y * s, s, s,
          )
        }
      }
    }
    return canvas
  }
}
