import type { Images } from '../core/assets'
import { Grid } from './Grid'
import type { LevelMap } from './maps'
import { Tree } from './Tree'

/** Tamanho de cada tile nas spritesheets de cenário, em pixels. */
const SOURCE_TILE = 48

/** Recortes do piso no `bgs.png` (coluna, linha): calçamento de pedra e a variação com terra. */
const FLOOR_TILES = {
  stone: { column: 6, row: 4 },
  dirt: { column: 6, row: 12 },
} as const

/** Tons de verde do musgo, do mais escuro ao mais claro. */
const MOSS_COLORS = ['#1f3a14', '#2e5a1c', '#3f7a26', '#5b9a32', '#7fb848']

/**
 * Gerador de números pseudoaleatórios com semente: o mesmo muro sempre recebe o mesmo musgo.
 * @param seed Semente.
 * @returns Função que devolve números em [0, 1).
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1
  return () => {
    state ^= state << 13
    state ^= state >>> 17
    state ^= state << 5
    return (state >>> 0) / 4294967296
  }
}

/**
 * Mapa do jogo na tela: a lógica do `Grid` mais o desenho do cenário em estilo de masmorra.
 *
 * O cenário (piso, muros com musgo e sombras) é desenhado uma única vez num canvas fora da tela
 * e só copiado a cada frame. As árvores ficam de fora: o jogo as desenha junto com os personagens.
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
   * Desenha piso, sombras e muros com musgo num canvas fora da tela.
   * @param images Imagens do cenário.
   * @returns Canvas com o cenário completo.
   */
  private prerender(images: Images): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = this.pixelWidth
    canvas.height = this.pixelHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) this.drawFloor(ctx, images, x, y)
    }
    // Sombras do pé dos muros por cima do piso, antes dos muros
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) if (!this.isStaticWall(x, y)) this.drawWallShadow(ctx, x, y)
    }
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isStaticWall(x, y)) continue
        this.drawWall(ctx, images, x, y)
        this.drawMoss(ctx, x, y)
      }
    }
    return canvas
  }

  /**
   * Piso de pedra com variações de terra e manchas escuras.
   * @param ctx Contexto do cenário.
   * @param images Imagens do cenário.
   * @param x Coluna.
   * @param y Linha.
   */
  private drawFloor(ctx: CanvasRenderingContext2D, images: Images, x: number, y: number): void {
    const s = this.tileSize
    const random = seededRandom(x * 92821 + y * 68917 + 1)
    const tile = random() < 0.25 ? FLOOR_TILES.dirt : FLOOR_TILES.stone
    ctx.drawImage(
      images.floor,
      tile.column * SOURCE_TILE,
      tile.row * SOURCE_TILE,
      SOURCE_TILE,
      SOURCE_TILE,
      x * s,
      y * s,
      s,
      s,
    )
    // Tom terroso e um pouco de sujeira, para tirar o aspecto de piso novo
    ctx.fillStyle = `rgba(60, 38, 20, ${0.25 + random() * 0.15})`
    ctx.fillRect(x * s, y * s, s, s)
    if (random() < 0.3) {
      ctx.fillStyle = 'rgba(20, 12, 6, 0.25)'
      ctx.beginPath()
      ctx.ellipse(x * s + random() * s, y * s + random() * s, s * 0.3, s * 0.18, random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  /**
   * Sombra no chão encostado em muros (mais forte embaixo de um muro), para dar profundidade.
   * @param ctx Contexto do cenário.
   * @param x Coluna.
   * @param y Linha.
   */
  private drawWallShadow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const s = this.tileSize
    const px = x * s
    const py = y * s
    const shade = (x0: number, y0: number, x1: number, y1: number, strength: number) => {
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1)
      gradient.addColorStop(0, `rgba(0, 0, 0, ${strength})`)
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(px, py, s, s)
    }
    if (this.isStaticWall(x, y - 1)) shade(px, py, px, py + s * 0.6, 0.55)
    if (this.isStaticWall(x - 1, y)) shade(px, py, px + s * 0.35, py, 0.3)
    if (this.isStaticWall(x + 1, y)) shade(px + s, py, px + s * 0.65, py, 0.3)
  }

  /**
   * Bloco de pedra do muro, com variação e um leve escurecimento.
   * @param ctx Contexto do cenário.
   * @param images Imagens do cenário.
   * @param x Coluna.
   * @param y Linha.
   */
  private drawWall(ctx: CanvasRenderingContext2D, images: Images, x: number, y: number): void {
    const s = this.tileSize
    const random = seededRandom(x * 7919 + y * 104729 + 7)
    // Duas variações de pedra para o labirinto não ficar repetitivo
    const column = random() < 0.3 ? 10 : 9
    ctx.drawImage(images.walls, column * SOURCE_TILE, 2 * SOURCE_TILE, SOURCE_TILE, SOURCE_TILE, x * s, y * s, s, s)
    ctx.fillStyle = 'rgba(40, 30, 20, 0.25)'
    ctx.fillRect(x * s, y * s, s, s)
  }

  /**
   * Musgo no muro: tufos densos no topo, manchas nas laterais e fios escorrendo.
   * O topo fica mais coberto quando não há muro em cima (é a face exposta).
   * @param ctx Contexto do cenário.
   * @param x Coluna.
   * @param y Linha.
   */
  private drawMoss(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const s = this.tileSize
    const px = x * s
    const py = y * s
    const random = seededRandom(x * 31337 + y * 7331 + 13)
    const exposedTop = !this.isStaticWall(x, y - 1)
    const color = () => MOSS_COLORS[Math.floor(random() * MOSS_COLORS.length)]!

    const blob = (cx: number, cy: number, radius: number) => {
      ctx.fillStyle = color()
      ctx.globalAlpha = 0.55 + random() * 0.4
      ctx.beginPath()
      ctx.ellipse(cx, cy, radius, radius * (0.6 + random() * 0.4), random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    // Tufos no topo
    const topTufts = exposedTop ? 7 + Math.floor(random() * 5) : Math.floor(random() * 3)
    for (let i = 0; i < topTufts; i++) blob(px + random() * s, py + random() * s * 0.3, s * (0.06 + random() * 0.08))

    // Manchas espalhadas pela pedra
    const patches = Math.floor(random() * 4)
    for (let i = 0; i < patches; i++)
      blob(px + random() * s, py + s * (0.3 + random() * 0.6), s * (0.04 + random() * 0.07))

    // Fios escorrendo do topo
    if (exposedTop) {
      const drips = 1 + Math.floor(random() * 3)
      for (let i = 0; i < drips; i++) {
        const dx = px + s * (0.1 + random() * 0.8)
        const length = s * (0.2 + random() * 0.45)
        ctx.strokeStyle = color()
        ctx.globalAlpha = 0.7
        ctx.lineWidth = 1.5 + random() * 1.5
        ctx.beginPath()
        ctx.moveTo(dx, py + s * 0.1)
        ctx.quadraticCurveTo(dx + (random() - 0.5) * s * 0.15, py + length * 0.6, dx, py + length)
        ctx.stroke()
      }
    }

    // Pontinhos claros dão brilho de umidade
    ctx.fillStyle = '#a8d870'
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = 0.5 * random()
      ctx.fillRect(px + random() * s, py + random() * s * (exposedTop ? 0.35 : 1), 1.5, 1.5)
    }
    ctx.restore()
  }
}
