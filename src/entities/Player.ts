import type { Input } from '../core/Input'
import type { Point, Walkable } from '../world/Pathfinding'
import { Entity, STEP, type Look } from './Entity'

/** Ajustes do jogador. */
export const PLAYER_SETTINGS = {
  /** Tempo para andar uma casa, em segundos. */
  stepDuration: 0.15,
  /** Vidas no começo do jogo. */
  lives: 3,
  /** Tempo invulnerável depois de levar um golpe, em segundos. */
  invulnerableTime: 2,
  /** Tempo mínimo entre dois ataques, em segundos. */
  attackCooldown: 0.4,
} as const

/** Personagem controlado pelo teclado. */
export class Player extends Entity {
  /** Vidas restantes. */
  lives: number
  private invulnerable = 0
  private cooldown = 0

  /**
   * @param look Spritesheet e personagem usados no desenho.
   * @param start Casa inicial.
   * @param lives Vidas com que começa (as vidas passam de uma fase para a outra).
   */
  constructor(look: Look, start: Point, lives: number) {
    super(look, start, PLAYER_SETTINGS.stepDuration)
    this.lives = lives
  }

  /** true enquanto está piscando depois de levar um golpe. */
  get isInvulnerable(): boolean {
    return this.invulnerable > 0
  }

  /**
   * Lê o teclado, começa um passo se possível e avança o movimento e os timers.
   * @param dt Tempo desde o último frame, em segundos.
   * @param input Estado do teclado.
   * @param map Grid usado para checar paredes.
   */
  step(dt: number, input: Input, map: Walkable): void {
    this.invulnerable = Math.max(0, this.invulnerable - dt)
    this.cooldown = Math.max(0, this.cooldown - dt)
    // Pisca enquanto está invulnerável
    this.opacity = this.isInvulnerable && Math.floor(this.invulnerable * 10) % 2 === 0 ? 0.3 : 1

    // Tenta antes e depois do update para não perder um frame entre um passo e outro
    this.readInput(input, map)
    this.update(dt)
    this.readInput(input, map)
  }

  /**
   * Ataca a casa à frente, se o ataque estiver disponível.
   * @returns A casa atingida, ou null se ainda estiver em recarga.
   */
  attack(): Point | null {
    if (this.cooldown > 0 || !this.alive) return null
    this.cooldown = PLAYER_SETTINGS.attackCooldown
    const step = STEP[this.facing]
    const from = this.position
    return { x: from.x + step.x, y: from.y + step.y }
  }

  /**
   * Leva um golpe: perde uma vida e fica invulnerável por um tempo.
   * @returns true se o golpe contou (não estava invulnerável).
   */
  hurt(): boolean {
    if (this.isInvulnerable || !this.alive) return false
    this.lives--
    this.invulnerable = PLAYER_SETTINGS.invulnerableTime
    if (this.lives <= 0) this.die()
    return true
  }

  /**
   * Se estiver parado, anda na direção segurada ou, se nenhuma estiver, na última tocada.
   * Um toque é consumido assim que é usado, mesmo que bata numa parede.
   * @param input Estado do teclado.
   * @param map Grid usado para checar paredes.
   */
  private readInput(input: Input, map: Walkable): void {
    if (this.isMoving) return
    const direction = input.direction ?? input.tappedDirection
    if (!direction) return
    this.tryMove(direction, map)
    input.clearTap()
  }
}
