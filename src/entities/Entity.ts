import type { Point, Walkable } from '../world/Pathfinding'

/** Direção para onde o personagem anda ou olha. */
export type Direction = 'down' | 'left' | 'right' | 'up'

/** Deslocamento de uma casa em cada direção. */
export const STEP: Record<Direction, Point> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
}

/** Linha do personagem para cada direção (padrão 3x4: baixo, esquerda, direita, cima). */
const SHEET_ROW: Record<Direction, number> = { down: 0, left: 1, right: 2, up: 3 }

/** Tamanho de um quadro da spritesheet de personagem, em pixels. */
const FRAME_SIZE = 48

/** Personagens por linha na spritesheet (4 personagens de 3 colunas cada). */
const CHARACTERS_PER_ROW = 4

/** Sequência de colunas da animação de andar (a coluna 1 é a pose parada). */
const WALK_CYCLE = [0, 1, 2, 1]

/** Tempo de cada quadro da animação de andar, em segundos. */
const FRAME_TIME = 0.12

/** Aparência de um personagem: a spritesheet e qual dos 8 personagens dela usar. */
export interface Look {
  image: HTMLImageElement
  /** Índice do personagem na spritesheet, de 0 a 7 (da esquerda para a direita, de cima para baixo). */
  character: number
}

/**
 * Personagem que anda casa a casa no grid, com movimento suave entre as casas.
 *
 * `tile` é a casa lógica (o destino, enquanto anda); `position` é onde ele está
 * desenhado, interpolado entre a casa anterior e `tile`.
 */
export class Entity {
  /** Casa lógica atual (ou destino do passo em andamento). */
  tile: Point
  /** Para onde o personagem está olhando. */
  facing: Direction = 'down'
  /** false depois de `die()`. */
  alive = true
  /** Transparência ao desenhar, de 0 (invisível) a 1. */
  opacity = 1

  private from: Point
  /** Progresso do passo atual, de 0 a 1. 1 = parado na casa. */
  private progress = 1
  private animTime = 0

  /**
   * @param look Spritesheet e personagem usados no desenho.
   * @param start Casa inicial.
   * @param stepDuration Tempo para andar uma casa, em segundos.
   */
  constructor(
    private readonly look: Look,
    start: Point,
    public stepDuration: number,
  ) {
    this.tile = { ...start }
    this.from = { ...start }
  }

  /** true enquanto está no meio de um passo. */
  get isMoving(): boolean {
    return this.progress < 1
  }

  /**
   * Posição desenhada, em unidades de casa (pode ser fracionária durante o passo).
   * @returns Coordenadas interpoladas entre a casa anterior e a atual.
   */
  get position(): Point {
    return {
      x: this.from.x + (this.tile.x - this.from.x) * this.progress,
      y: this.from.y + (this.tile.y - this.from.y) * this.progress,
    }
  }

  /**
   * Vira para a direção e, se estiver parado e a casa estiver livre, começa a andar.
   * @param direction Direção do passo.
   * @param grid Grid usado para checar paredes.
   * @returns true se o passo começou.
   */
  tryMove(direction: Direction, grid: Walkable): boolean {
    if (this.isMoving || !this.alive) return false
    this.facing = direction

    const next = { x: this.tile.x + STEP[direction].x, y: this.tile.y + STEP[direction].y }
    if (!grid.isWalkable(next.x, next.y)) return false

    this.from = { ...this.tile }
    this.tile = next
    this.progress = 0
    return true
  }

  /**
   * Coloca o personagem direto numa casa, cancelando o passo em andamento.
   * @param tile Casa de destino.
   */
  placeAt(tile: Point): void {
    this.tile = { ...tile }
    this.from = { ...tile }
    this.progress = 1
  }

  /**
   * Avança o passo em andamento e a animação.
   * @param dt Tempo desde o último frame, em segundos.
   */
  update(dt: number): void {
    if (this.isMoving) {
      this.progress = Math.min(1, this.progress + dt / this.stepDuration)
      this.animTime += dt
      if (!this.isMoving) this.from = { ...this.tile }
    } else {
      this.animTime = 0
    }
  }

  /** Marca o personagem como morto. */
  die(): void {
    this.alive = false
  }

  /**
   * Distância até um ponto, usando a posição desenhada.
   * @param point Ponto em unidades de casa.
   * @returns Distância euclidiana, em casas.
   */
  distanceToPoint(point: Point): number {
    const p = this.position
    return Math.hypot(p.x - point.x, p.y - point.y)
  }

  /**
   * Distância até outro personagem, usando as posições desenhadas.
   * @param other Outro personagem.
   * @returns Distância euclidiana, em casas.
   */
  distanceTo(other: Entity): number {
    return this.distanceToPoint(other.position)
  }

  /**
   * Desenha o quadro atual, centralizado na casa e apoiado na base dela.
   * @param ctx Contexto onde desenhar.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(ctx: CanvasRenderingContext2D, tileSize: number): void {
    if (this.opacity <= 0) return

    const walkColumn = this.isMoving ? WALK_CYCLE[Math.floor(this.animTime / FRAME_TIME) % WALK_CYCLE.length]! : 1
    const baseColumn = (this.look.character % CHARACTERS_PER_ROW) * 3
    const baseRow = Math.floor(this.look.character / CHARACTERS_PER_ROW) * 4
    const { x, y } = this.position

    ctx.save()
    ctx.globalAlpha = this.opacity
    ctx.drawImage(
      this.look.image,
      (baseColumn + walkColumn) * FRAME_SIZE,
      (baseRow + SHEET_ROW[this.facing]) * FRAME_SIZE,
      FRAME_SIZE,
      FRAME_SIZE,
      Math.round(x * tileSize + (tileSize - FRAME_SIZE) / 2),
      Math.round(y * tileSize + tileSize - FRAME_SIZE),
      FRAME_SIZE,
      FRAME_SIZE,
    )
    ctx.restore()
  }
}
