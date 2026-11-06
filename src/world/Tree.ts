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

/**
 * Árvore do cenário. Fica numa casa bloqueada, mas é desenhada junto com os
 * personagens (ordenada pela altura) para quem passa atrás ficar coberto pela copa.
 */
export class Tree {
  /** Posição da árvore, em unidades de casa. */
  readonly position: Point
  private readonly sprite: (typeof TREE_SPRITES)[number]

  /**
   * @param tile Casa onde a árvore está.
   * @param image Spritesheet de cenário (`walls.png`).
   */
  constructor(
    tile: Point,
    private readonly image: HTMLImageElement,
  ) {
    this.position = { ...tile }
    // Escolha estável por posição: a mesma casa sempre tem o mesmo tipo de árvore
    this.sprite = TREE_SPRITES[(tile.x * 7 + tile.y * 13) % 4 === 0 ? 1 : 0]
  }

  /**
   * Desenha a árvore apoiada na base da casa (o pinheiro sobe para a casa de cima).
   * @param ctx Contexto onde desenhar.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(ctx: CanvasRenderingContext2D, tileSize: number): void {
    const { column, row, tall } = this.sprite
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
  }
}
