import type { Images } from '../core/assets'
import { Grid } from './Grid'
import type { LevelMap } from './maps'
import { Tree } from './Tree'

/** Tamanho de cada tile nas spritesheets de cenário, em pixels. */
const SOURCE_TILE = 48

/**
 * Mapa do jogo na tela: a lógica do `Grid` mais o desenho do cenário.
 *
 * O cenário (chão e paredes) é desenhado uma única vez num canvas fora da tela e só copiado
 * a cada frame. As árvores ficam de fora: o jogo as desenha junto com os personagens.
 */
export class TileMap extends Grid {
  /** Árvores do mapa, para o jogo desenhar ordenadas com os personagens. */
  readonly treeSprites: Tree[]
  private readonly background: HTMLCanvasElement

  /**
   * @param map Mapa da fase.
   * @param tileSize Tamanho de cada casa na tela, em pixels.
   * @param images Imagens já carregadas (usa `floor` e `walls`).
   */
  constructor(
    map: LevelMap,
    readonly tileSize: number,
    images: Images,
  ) {
    super(map)
    this.background = this.prerender(images)
    this.treeSprites = this.grove.trees.map((state) => new Tree(state, images.walls))
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
   * Copia o cenário pronto para o canvas.
   * @param ctx Contexto onde desenhar.
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.background, 0, 0)
  }

  /**
   * Desenha chão e paredes num canvas fora da tela (casas com árvore ficam só com o chão).
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

        if (!this.isWalkable(x, y) && !this.isTree(x, y)) {
          // Duas variações de parede para o labirinto não ficar repetitivo
          const column = Math.random() < 0.3 ? 10 : 9
          ctx.drawImage(
            images.walls,
            column * SOURCE_TILE,
            2 * SOURCE_TILE,
            SOURCE_TILE,
            SOURCE_TILE,
            x * s,
            y * s,
            s,
            s,
          )
        }
      }
    }
    return canvas
  }
}
