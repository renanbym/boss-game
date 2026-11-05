import type { Images } from '../core/assets'
import type { LevelMap } from './maps'
import type { Point, Walkable } from './Pathfinding'

/** Tamanho de cada tile nas spritesheets de cenário, em pixels. */
const SOURCE_TILE = 48

/**
 * Mapa do jogo: sabe quais casas são parede e desenha o cenário.
 *
 * O cenário é desenhado uma única vez num canvas fora da tela e só copiado a cada frame.
 */
export class TileMap implements Walkable {
  readonly name: string
  readonly width: number
  readonly height: number
  /**
   * Grade que ignora paredes (só respeita as bordas do mapa).
   * Usada por quem atravessa paredes.
   */
  readonly ghostGrid: Walkable
  private readonly walls: boolean[][]
  /** Casas livres da maior região conectada: só nelas alguém pode nascer. */
  private readonly spawnable: Point[]
  private readonly background: HTMLCanvasElement

  /**
   * @param map Mapa da fase.
   * @param tileSize Tamanho de cada casa na tela, em pixels.
   * @param images Imagens já carregadas (usa `floor` e `walls`).
   */
  constructor(map: LevelMap, readonly tileSize: number, images: Images) {
    this.name = map.name
    this.walls = map.walls
    this.height = map.walls.length
    this.width = map.walls[0]?.length ?? 0
    this.ghostGrid = {
      width: this.width,
      height: this.height,
      isWalkable: (x, y) => this.isInside(x, y),
    }
    this.spawnable = this.largestRegion()
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
   * @returns true se a casa está dentro do mapa.
   */
  isInside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height
  }

  /**
   * @param x Coluna.
   * @param y Linha.
   * @returns true se a casa está dentro do mapa e não é parede.
   */
  isWalkable(x: number, y: number): boolean {
    return this.walls[y]?.[x] === false
  }

  /**
   * Sorteia uma casa livre na região principal do mapa.
   * @param avoid Casas que devem ficar longe (ex.: o jogador).
   * @param minDistance Distância Manhattan mínima até cada casa de `avoid`.
   *   Se nenhuma casa atender, a restrição é relaxada até achar uma.
   * @returns Uma casa livre.
   */
  randomFreeTile(avoid: Point[] = [], minDistance = 0): Point {
    for (let distance = minDistance; distance >= 0; distance--) {
      const candidates = this.spawnable.filter(t =>
        avoid.every(p => Math.abs(p.x - t.x) + Math.abs(p.y - t.y) >= distance),
      )
      const pick = candidates[Math.floor(Math.random() * candidates.length)]
      if (pick) return { ...pick }
    }
    throw new Error(`Mapa "${this.name}" não tem casas livres`)
  }

  /**
   * Copia o cenário pronto para o canvas.
   * @param ctx Contexto onde desenhar.
   */
  render(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.background, 0, 0)
  }

  /**
   * Acha a maior região de casas livres conectadas, para ninguém nascer num canto isolado.
   * @returns As casas dessa região.
   */
  private largestRegion(): Point[] {
    const seen = new Set<number>()
    let best: Point[] = []

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isWalkable(x, y) || seen.has(y * this.width + x)) continue

        const region: Point[] = []
        const stack: Point[] = [{ x, y }]
        seen.add(y * this.width + x)
        while (stack.length > 0) {
          const p = stack.pop()!
          region.push(p)
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const n = { x: p.x + dx, y: p.y + dy }
            const key = n.y * this.width + n.x
            if (this.isWalkable(n.x, n.y) && !seen.has(key)) {
              seen.add(key)
              stack.push(n)
            }
          }
        }
        if (region.length > best.length) best = region
      }
    }
    return best
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
