import type { Grid } from '../world/Grid'
import { findPath, type Point, type Walkable } from '../world/Pathfinding'
import { Entity, STEP, type Direction, type Look } from './Entity'

/** Habilidades especiais de um inimigo. Cada fase do boss liga mais uma. */
export interface Abilities {
  /** Fica mais rápido de tempos em tempos. */
  speedUp?: {
    /** Intervalo entre acelerações, em segundos. */
    every: number
    /** Multiplica o tempo de passo por este fator (menor que 1 = mais rápido). */
    factor: number
    /** Menor tempo de passo possível, em segundos. */
    minStepDuration: number
  }
  /** Some e reaparece em outro lugar de tempos em tempos. */
  teleport?: {
    /** Intervalo entre teletransportes, em segundos. */
    every: number
    /** Distância mínima, em casas, entre o destino e o alvo. */
    minDistance: number
  }
  /** Atravessa paredes. */
  ghost?: boolean
  /**
   * Só leva dano em janelas de tempo; fora delas os golpes são bloqueados.
   * A primeira janela abre em `every` segundos, depois a cada `every` segundos.
   */
  vulnerability?: {
    /** Intervalo entre a abertura de uma janela e a próxima, em segundos. */
    every: number
    /** Quanto tempo cada janela fica aberta, em segundos. */
    duration: number
  }
  /**
   * Atira no alvo de tempos em tempos, só enquanto está protegido (fora da janela de vulnerabilidade).
   * Se o tempo vencer durante a janela, o tiro espera a janela fechar.
   */
  shooter?: {
    /** Intervalo mínimo entre dois tiros, em segundos. */
    every: number
  }
}

/** Configuração de um inimigo. */
export interface EnemyOptions {
  /** Índice do personagem na spritesheet. */
  character: number
  /** Tempo inicial para andar uma casa, em segundos. */
  stepDuration: number
  /** Golpes necessários para derrotá-lo. */
  hp: number
  /** true para o boss da fase (derrotá-lo conclui a fase). */
  isBoss: boolean
  abilities: Abilities
}

/** Algo que aconteceu com o inimigo neste frame e que o jogo precisa mostrar. */
export type EnemyEvent =
  { type: 'teleport'; from: Point; to: Point } | { type: 'shoot'; from: Point; direction: Direction }

/** Tempo atordoado depois de levar um golpe, em segundos. */
const STUN_TIME = 0.6

/**
 * Inimigo que persegue um alvo pelo menor caminho. Serve para o boss e para os lacaios.
 *
 * O caminho só é recalculado quando o alvo muda de casa ou quando o inimigo
 * sai do caminho previsto, em vez de rodar o A* a cada passo.
 */
export class Enemy extends Entity {
  hp: number
  readonly maxHp: number
  readonly isBoss: boolean
  readonly abilities: Abilities
  /** Eventos gerados desde a última leitura de `takeEvents()`. */
  private events: EnemyEvent[] = []
  private stun = 0
  private speedTimer = 0
  private teleportTimer = 0
  /** Tempo de vida do inimigo, usado para calcular as janelas de vulnerabilidade. */
  private age = 0
  private shootTimer = 0
  private path: Point[] = []
  private pathGoal: Point | null = null

  /**
   * @param look Spritesheet e personagem usados no desenho.
   * @param start Casa inicial.
   * @param options Vida, velocidade e habilidades.
   * @param target Personagem perseguido.
   */
  constructor(
    look: Look,
    start: Point,
    options: EnemyOptions,
    public target: Entity,
  ) {
    super(look, start, options.stepDuration)
    this.hp = options.hp
    this.maxHp = options.hp
    this.isBoss = options.isBoss
    this.abilities = options.abilities
  }

  /** true enquanto está atordoado por um golpe (não anda nem machuca). */
  get isStunned(): boolean {
    return this.stun > 0
  }

  /** true se um golpe agora tiraria vida (sempre true para quem não tem janela de vulnerabilidade). */
  get isVulnerable(): boolean {
    const window = this.abilities.vulnerability
    if (!window) return true
    return this.age >= window.every && this.age % window.every < window.duration
  }

  /**
   * Quanto falta para a janela de vulnerabilidade mudar.
   * @returns Segundos até fechar (se aberta) ou até abrir (se fechada); null se não tiver janela.
   */
  get vulnerabilityCountdown(): number | null {
    const window = this.abilities.vulnerability
    if (!window) return null
    if (this.isVulnerable) return window.duration - (this.age % window.every)
    return window.every - (this.age % window.every)
  }

  /**
   * Avança timers e movimento e, quando parado numa casa, dá o próximo passo rumo ao alvo.
   * @param dt Tempo desde o último frame, em segundos.
   * @param map Mapa da fase.
   */
  step(dt: number, map: Grid): void {
    this.age += dt
    this.stun = Math.max(0, this.stun - dt)
    this.update(dt)
    this.updateAbilities(dt, map)
    this.updateOpacity(map)

    if (this.isMoving || this.isStunned || !this.alive || !this.target.alive) return

    const grid = this.grid(map)
    const next = this.nextTile(grid)
    if (!next) return // sem caminho até o alvo: fica parado e tenta no próximo frame

    const direction = directionBetween(this.tile, next)
    if (direction && this.tryMove(direction, grid)) this.path.shift()
  }

  /**
   * Recebe um golpe: perde vida, fica atordoado e é empurrado uma casa para trás.
   * Atordoado, não recebe novos golpes (evita derrotar o boss "travando" ele).
   * Fora da janela de vulnerabilidade, o golpe é bloqueado.
   * @param from Direção de onde veio o golpe (para onde o inimigo é empurrado).
   * @param map Mapa da fase.
   * @returns true se o golpe contou.
   */
  hurt(from: Direction, map: Grid): boolean {
    if (this.isStunned || !this.isVulnerable || !this.alive) return false
    this.hp--
    this.stun = STUN_TIME
    if (this.hp <= 0) {
      this.die()
      return true
    }

    const push = { x: this.tile.x + STEP[from].x, y: this.tile.y + STEP[from].y }
    if (this.grid(map).isWalkable(push.x, push.y)) this.placeAt(push)
    else this.placeAt(this.tile)
    this.path = []
    return true
  }

  /**
   * Teletransporta para uma casa livre longe do alvo.
   * @param map Mapa da fase.
   * @param minDistance Distância mínima, em casas, até o alvo.
   */
  teleportAway(map: Grid, minDistance: number): void {
    const from = { ...this.tile }
    const to = map.randomFreeTile([this.target.tile], minDistance)
    this.placeAt(to)
    this.path = []
    this.events.push({ type: 'teleport', from, to })
  }

  /**
   * Devolve e limpa os eventos acumulados.
   * @returns Eventos desde a última chamada.
   */
  takeEvents(): EnemyEvent[] {
    const events = this.events
    this.events = []
    return events
  }

  /**
   * Aplica aceleração, teletransporte e tiro conforme os timers.
   * @param dt Tempo desde o último frame, em segundos.
   * @param map Mapa da fase.
   */
  private updateAbilities(dt: number, map: Grid): void {
    const { speedUp, teleport, shooter } = this.abilities

    if (speedUp) {
      this.speedTimer += dt
      if (this.speedTimer >= speedUp.every) {
        this.speedTimer -= speedUp.every
        this.stepDuration = Math.max(speedUp.minStepDuration, this.stepDuration * speedUp.factor)
      }
    }

    if (teleport) {
      this.teleportTimer += dt
      // Espera terminar o passo (e o atordoamento) para sumir
      if (this.teleportTimer >= teleport.every && !this.isMoving && !this.isStunned) {
        this.teleportTimer = 0
        this.teleportAway(map, teleport.minDistance)
      }
    }

    if (shooter) {
      this.shootTimer += dt
      // Durante a janela de vulnerabilidade ele não atira (quem não tem janela atira sempre)
      const windowOpen = !!this.abilities.vulnerability && this.isVulnerable
      const canShoot = !windowOpen && !this.isStunned && this.alive && this.target.alive
      if (this.shootTimer >= shooter.every && canShoot) {
        this.shootTimer = 0
        this.facing = directionTowards(this.position, this.target.position)
        this.events.push({ type: 'shoot', from: this.position, direction: this.facing })
      }
    }
  }

  /**
   * Pisca quando atordoado ou vulnerável e fica translúcido dentro de paredes.
   * @param map Mapa da fase.
   */
  private updateOpacity(map: Grid): void {
    const p = this.position
    const insideWall = !map.isWalkable(Math.round(p.x), Math.round(p.y))
    const stunBlink = this.isStunned && Math.floor(this.stun * 12) % 2 === 0
    // Só pisca por vulnerabilidade quem tem janela (lacaios são sempre vulneráveis e não piscam)
    const vulnerableBlink = !!this.abilities.vulnerability && this.isVulnerable && Math.floor(this.age * 8) % 2 === 0
    this.opacity = stunBlink || vulnerableBlink ? 0.3 : insideWall ? 0.55 : 1
  }

  /**
   * Grid usado para andar: o mapa normal, ou só as bordas se atravessa paredes.
   * @param map Mapa da fase.
   * @returns O grid adequado às habilidades.
   */
  private grid(map: Grid): Walkable {
    return this.abilities.ghost ? map.ghostGrid : map
  }

  /**
   * Próxima casa do caminho até o alvo, recalculando o caminho só quando necessário.
   * @param grid Grid usado para o pathfinding.
   * @returns A próxima casa, ou null se não houver caminho ou se já estiver no alvo.
   */
  private nextTile(grid: Walkable): Point | null {
    const goal = this.target.tile
    const goalChanged = !this.pathGoal || !samePoint(this.pathGoal, goal)
    const offPath = !this.path[0] || !samePoint(this.path[0], this.tile)

    if (goalChanged || offPath) {
      this.path = findPath(grid, this.tile, goal)
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
 * Direção (sem diagonal) que mais aproxima de um ponto: o eixo com a maior diferença vence.
 * @param from Ponto de origem.
 * @param to Ponto de destino.
 * @returns A direção.
 */
export function directionTowards(from: Point, to: Point): Direction {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  return dy >= 0 ? 'down' : 'up'
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
