import { findPath, type Point, type Walkable } from '../world/Pathfinding'
import { Entity, type Direction } from './Entity'

/**
 * Vilão que persegue um alvo pelo menor caminho.
 *
 * O caminho só é recalculado quando o alvo muda de casa ou quando o vilão
 * sai do caminho previsto, em vez de rodar o A* a cada passo.
 */
export class Boss extends Entity {
  private path: Point[] = []
  private pathGoal: Point | null = null

  /**
   * @param image Spritesheet 3x4 do vilão.
   * @param start Casa inicial.
   * @param stepDuration Tempo para andar uma casa, em segundos.
   * @param target Personagem perseguido.
   */
  constructor(image: HTMLImageElement, start: Point, stepDuration: number, public target: Entity) {
    super(image, start, stepDuration)
  }

  /**
   * Avança o movimento e, quando parado numa casa, dá o próximo passo rumo ao alvo.
   * @param dt Tempo desde o último frame, em segundos.
   * @param map Grid usado para o pathfinding.
   */
  step(dt: number, map: Walkable): void {
    this.update(dt)
    if (this.isMoving || !this.alive || !this.target.alive) return

    const next = this.nextTile(map)
    if (!next) return // sem caminho até o alvo: fica parado e tenta no próximo frame

    const direction = directionBetween(this.tile, next)
    if (direction && this.tryMove(direction, map)) this.path.shift()
  }

  /**
   * Próxima casa do caminho até o alvo, recalculando o caminho só quando necessário.
   * @param map Grid usado para o pathfinding.
   * @returns A próxima casa, ou null se não houver caminho ou se já estiver no alvo.
   */
  private nextTile(map: Walkable): Point | null {
    const goal = this.target.tile
    const goalChanged = !this.pathGoal || !samePoint(this.pathGoal, goal)
    const offPath = !this.path[0] || !samePoint(this.path[0], this.tile)

    if (goalChanged || offPath) {
      this.path = findPath(map, this.tile, goal)
      this.pathGoal = { ...goal }
    }
    return this.path[1] ?? null
  }
}

/**
 * @param a Primeira casa.
 * @param b Segunda casa.
 * @returns true se as duas casas são a mesma.
 */
function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

/**
 * Direção para ir de uma casa a uma vizinha.
 * @param from Casa de origem.
 * @param to Casa vizinha (sem diagonal).
 * @returns A direção, ou null se as casas não forem vizinhas.
 */
function directionBetween(from: Point, to: Point): Direction | null {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (dx === 1 && dy === 0) return 'right'
  if (dx === -1 && dy === 0) return 'left'
  if (dx === 0 && dy === 1) return 'down'
  if (dx === 0 && dy === -1) return 'up'
  return null
}
