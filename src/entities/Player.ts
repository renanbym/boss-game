import type { Input } from '../core/Input'
import type { Walkable } from '../world/Pathfinding'
import { Entity } from './Entity'

/** Personagem controlado pelo teclado. */
export class Player extends Entity {
  /**
   * Lê o teclado, começa um passo se possível e avança o movimento.
   * @param dt Tempo desde o último frame, em segundos.
   * @param input Estado do teclado.
   * @param map Grid usado para checar paredes.
   */
  step(dt: number, input: Input, map: Walkable): void {
    // Tenta antes e depois do update para não perder um frame entre um passo e outro
    this.readInput(input, map)
    this.update(dt)
    this.readInput(input, map)
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
