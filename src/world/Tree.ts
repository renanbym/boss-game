import type { TreeState } from './Grove'
import type { Point } from './Pathfinding'

/** Tamanho de cada tile nas spritesheets de cenário, em pixels. */
const SOURCE_TILE = 48

/** Recortes das árvores no `walls.png`: coluna, linha e altura em tiles. */
const TREE_SPRITES = [
  /** Pinheiro: 1 casa de largura por 2 de altura. */
  { column: 4, row: 8, tall: 2 },
  /** Arbusto redondo: 1 casa. */
  { column: 4, row: 7, tall: 1 },
] as const

/** Piscadas por segundo enquanto a árvore avisa que vai reaparecer. */
const BLINK_RATE = 6

/**
 * Árvore do cenário. É desenhada junto com os personagens (ordenada pela altura)
 * para quem passa atrás ficar coberto pela copa. Some, pisca e reaparece conforme o `Grove`.
 */
export class Tree {
  /** Posição da árvore, em unidades de casa. */
  readonly position: Point
  private readonly sprite: (typeof TREE_SPRITES)[number]

  /**
   * @param state Estado da árvore no ciclo (compartilhado com o `Grove`).
   * @param image Spritesheet de cenário (`walls.png`).
   */
  constructor(
    private readonly state: TreeState,
    private readonly image: HTMLImageElement,
  ) {
    this.position = { ...state.tile }
    // Escolha estável por posição: a mesma casa sempre tem o mesmo tipo de árvore
    this.sprite = TREE_SPRITES[(state.tile.x * 7 + state.tile.y * 13) % 4 === 0 ? 1 : 0]
  }

  /**
   * Transparência da árvore conforme a fase: some quando `gone`, pisca quando `warning`.
   * @returns Opacidade de 0 a 1.
   */
  opacity(): number {
    if (this.state.phase === 'gone') return 0
    if (this.state.phase === 'solid') return 1
    // Pisca contando o tempo que falta, então o ritmo é o mesmo em todas as árvores
    return Math.floor(this.state.timeLeft * BLINK_RATE * 2) % 2 === 0 ? 0.75 : 0.15
  }

  /**
   * Desenha a árvore apoiada na base da casa (o pinheiro sobe para a casa de cima).
   * @param ctx Contexto onde desenhar.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(ctx: CanvasRenderingContext2D, tileSize: number): void {
    const alpha = this.opacity()
    if (alpha <= 0) return

    const { column, row, tall } = this.sprite
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.drawImage(
      this.image,
      column * SOURCE_TILE,
      row * SOURCE_TILE,
      SOURCE_TILE,
      SOURCE_TILE * tall,
      this.position.x * tileSize,
      (this.position.y + 1 - tall) * tileSize,
      tileSize,
      tileSize * tall,
    )
    ctx.restore()
  }
}
