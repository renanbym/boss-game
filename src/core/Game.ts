import { SpriteEffect, type EffectSheet } from '../effects/SpriteEffect'
import { Enemy, type EnemyOptions } from '../entities/Enemy'
import type { Direction } from '../entities/Entity'
import { Player, PLAYER_SETTINGS } from '../entities/Player'
import type { Point } from '../world/Pathfinding'
import { TileMap } from '../world/TileMap'
import { playSound, type Images } from './assets'
import type { Input } from './Input'
import { LEVELS, MINION, type LevelConfig } from './levels'

/**
 * Fase em que o jogo está.
 * - `menu`: tela inicial.
 * - `intro`: apresentação da próxima fase.
 * - `playing`: jogando.
 * - `paused`: tudo parado.
 * - `gameover`: acabaram as vidas.
 * - `victory`: venceu o boss da última fase.
 */
export type GameState = 'menu' | 'intro' | 'playing' | 'paused' | 'gameover' | 'victory'

/** Ajustes gerais de jogabilidade. */
export const SETTINGS = {
  /** Tamanho de cada casa na tela, em pixels. */
  tileSize: 40,
  /** Distância mínima, em casas, entre o jogador e um inimigo novo. */
  spawnDistance: 8,
  /** Distância, em casas, em que um inimigo pega o jogador. */
  catchDistance: 0.6,
  /** Distância, em casas, entre o centro do golpe e um inimigo para acertá-lo. */
  hitDistance: 0.75,
  /** Maior delta time aceito, em segundos (evita "teleporte" depois de a aba ficar parada). */
  maxDeltaTime: 0.1,
} as const

/** Ângulo do golpe para cada direção (a arte do golpe aponta para a direita). */
const SLASH_ROTATION: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
}

/**
 * Loop principal do jogo: atualiza a lógica com delta time, controla as fases e desenha a cena.
 */
export class Game {
  state: GameState = 'menu'
  /** Índice da fase atual em `LEVELS`. */
  levelIndex = 0
  map: TileMap
  player: Player | null = null
  enemies: Enemy[] = []
  effects: SpriteEffect[] = []
  /** Tempo na fase atual, em segundos. */
  levelTime = 0
  /** Tempo total de jogo, somando as fases, em segundos. */
  totalTime = 0

  private readonly ctx: CanvasRenderingContext2D
  private frameId: number | null = null
  private lastTime: number | null = null

  /**
   * @param canvas Canvas onde o jogo é desenhado. É redimensionado para o tamanho do mapa.
   * @param images Imagens já carregadas.
   * @param input Estado do teclado.
   */
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly images: Images,
    private readonly input: Input,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    this.ctx = ctx
    this.map = this.buildMap(this.level)
  }

  /** Configuração da fase atual. */
  get level(): LevelConfig {
    return LEVELS[this.levelIndex]!
  }

  /** O boss da fase, enquanto estiver vivo. */
  get boss(): Enemy | undefined {
    return this.enemies.find((e) => e.isBoss)
  }

  /** Inicia o loop, se ainda não estiver rodando. */
  start(): void {
    if (this.frameId !== null) return
    this.lastTime = null
    this.frameId = requestAnimationFrame(this.frame)
  }

  /** Para o loop. */
  stop(): void {
    if (this.frameId !== null) cancelAnimationFrame(this.frameId)
    this.frameId = null
  }

  /** Volta para a fase 1 com as vidas cheias e mostra a apresentação dela. */
  newGame(): void {
    this.levelIndex = 0
    this.totalTime = 0
    this.player = null
    this.showIntro()
  }

  /**
   * Coloca mais um lacaio no mapa, longe do jogador. Só funciona durante a partida (ou pausado).
   * @returns O lacaio criado, ou null se não houver partida em andamento.
   */
  addMinion(): Enemy | null {
    if (this.state !== 'playing' && this.state !== 'paused') return null
    return this.spawnEnemy(MINION)
  }

  /** Prepara o mapa da fase atual e mostra a tela de apresentação. */
  private showIntro(): void {
    this.map = this.buildMap(this.level)
    this.enemies = []
    this.effects = []
    this.state = 'intro'
  }

  /** Começa a fase atual: jogador, boss e lacaios em casas aleatórias. */
  private startLevel(): void {
    const lives = this.player?.lives ?? PLAYER_SETTINGS.lives
    this.player = new Player({ image: this.images.actors, character: 0 }, this.map.randomFreeTile(), lives)
    this.enemies = []
    this.effects = []
    this.levelTime = 0
    this.state = 'playing'

    this.spawnEnemy(this.level.boss)
    for (let i = 0; i < this.level.minions; i++) this.spawnEnemy(MINION)
  }

  /**
   * Cria o mapa de uma fase e ajusta o canvas ao tamanho dele.
   * @param level Fase.
   * @returns O mapa pronto.
   */
  private buildMap(level: LevelConfig): TileMap {
    const map = new TileMap(level.map, SETTINGS.tileSize, this.images)
    this.canvas.width = map.pixelWidth
    this.canvas.height = map.pixelHeight
    this.canvas.style.setProperty('--aspect', String(map.pixelWidth / map.pixelHeight))
    return map
  }

  /**
   * Cria um inimigo longe do jogador.
   * @param options Configuração do inimigo.
   * @returns O inimigo, ou null se não houver jogador.
   */
  private spawnEnemy(options: EnemyOptions): Enemy | null {
    if (!this.player) return null
    const image = options.isBoss ? this.images.actors : this.images.villager
    const start = this.map.randomFreeTile([this.player.tile], SETTINGS.spawnDistance)
    const enemy = new Enemy({ image, character: options.character }, start, options, this.player)
    this.enemies.push(enemy)
    return enemy
  }

  /**
   * Um frame do loop: calcula o delta time, atualiza e desenha.
   * @param now Timestamp do `requestAnimationFrame`, em ms.
   */
  private frame = (now: number): void => {
    const dt = this.lastTime === null ? 0 : Math.min((now - this.lastTime) / 1000, SETTINGS.maxDeltaTime)
    this.lastTime = now

    this.update(dt)
    this.render()

    this.frameId = requestAnimationFrame(this.frame)
  }

  /**
   * Atualiza a lógica conforme o estado atual.
   * @param dt Tempo desde o último frame, em segundos.
   */
  private update(dt: number): void {
    const enter = this.input.wasPressed('Enter')
    const pause = this.input.wasPressed('p')
    const attack = this.input.wasPressed(' ')

    switch (this.state) {
      case 'menu':
      case 'gameover':
      case 'victory':
        if (enter) this.newGame()
        break

      case 'intro':
        if (enter) this.startLevel()
        break

      case 'paused':
        if (pause) this.state = 'playing'
        break

      case 'playing':
        if (pause) {
          this.state = 'paused'
          break
        }
        this.updatePlaying(dt, attack)
        break
    }

    if (this.state !== 'paused') {
      for (const effect of this.effects) effect.update(dt)
      this.effects = this.effects.filter((e) => !e.done)
    }

    if (this.state !== 'playing') this.input.clearTap() // setas fora da partida não viram passo depois
    this.input.endFrame()
  }

  /**
   * Move todo mundo, resolve ataques e golpes e verifica fim de fase.
   * @param dt Tempo desde o último frame, em segundos.
   * @param attack true se o jogador apertou o ataque neste frame.
   */
  private updatePlaying(dt: number, attack: boolean): void {
    const player = this.player
    if (!player) return

    this.levelTime += dt
    this.totalTime += dt

    player.step(dt, this.input, this.map)
    if (attack) this.playerAttack(player)

    for (const enemy of this.enemies) {
      enemy.step(dt, this.map)
      for (const event of enemy.takeEvents()) this.showTeleport(event.from, event.to)
    }

    this.checkCaught(player)
  }

  /**
   * Golpeia a casa à frente do jogador e machuca quem estiver nela.
   * @param player Jogador.
   */
  private playerAttack(player: Player): void {
    const target = player.attack()
    if (!target) return

    this.effects.push(
      new SpriteEffect(
        { image: this.images.slash, firstFrame: 0, frameCount: 6 },
        { center: target, size: 1.6, frameTime: 0.04, rotation: SLASH_ROTATION[player.facing] },
      ),
    )

    for (const enemy of this.enemies) {
      if (enemy.distanceToPoint(target) > SETTINGS.hitDistance) continue
      if (!enemy.hurt(player.facing, this.map)) continue
      if (!enemy.alive) this.onEnemyKilled(enemy)
    }
    this.enemies = this.enemies.filter((e) => e.alive)
  }

  /**
   * Explosão na morte do inimigo; se for o boss, conclui a fase.
   * @param enemy Inimigo derrotado.
   */
  private onEnemyKilled(enemy: Enemy): void {
    this.effects.push(
      new SpriteEffect(
        { image: this.images.burst, firstFrame: 5, frameCount: 12 },
        { center: enemy.position, size: enemy.isBoss ? 3 : 1.8, frameTime: 0.05 },
      ),
    )
    if (!enemy.isBoss) return

    // Os lacaios somem junto com o boss
    for (const minion of this.enemies) {
      if (minion === enemy || !minion.alive) continue
      minion.die()
      this.effects.push(
        new SpriteEffect(
          { image: this.images.burst, firstFrame: 5, frameCount: 12 },
          { center: minion.position, size: 1.8, frameTime: 0.05 },
        ),
      )
    }
    this.levelCleared()
  }

  /** Avança para a próxima fase, ou para a vitória se era a última. */
  private levelCleared(): void {
    if (this.levelIndex >= LEVELS.length - 1) {
      this.state = 'victory'
      return
    }
    this.levelIndex++
    // Deixa a explosão do boss terminar antes de trocar de mapa
    const effects = this.effects
    this.showIntro()
    this.effects = effects
  }

  /**
   * Se algum inimigo encostou no jogador, ele perde uma vida e o inimigo é jogado para longe.
   * @param player Jogador.
   */
  private checkCaught(player: Player): void {
    const catcher = this.enemies.find((e) => e.alive && !e.isStunned && e.distanceTo(player) < SETTINGS.catchDistance)
    if (!catcher || !player.hurt()) return

    if (!player.alive) {
      this.state = 'gameover'
      playSound('die')
      return
    }
    catcher.teleportAway(this.map, SETTINGS.spawnDistance)
    for (const event of catcher.takeEvents()) this.showTeleport(event.from, event.to)
  }

  /**
   * Mostra o redemoinho na saída e na chegada de um teletransporte.
   * @param from Casa de onde saiu.
   * @param to Casa onde chegou.
   */
  private showTeleport(from: Point, to: Point): void {
    const sheet: EffectSheet = { image: this.images.wind, firstFrame: 0, frameCount: 15 }
    this.effects.push(new SpriteEffect(sheet, { center: from, size: 1.8, frameTime: 0.04 }))
    this.effects.push(new SpriteEffect(sheet, { center: to, size: 1.8, frameTime: 0.04 }))
  }

  /** Desenha cenário, personagens, efeitos, HUD e a tela do estado atual. */
  private render(): void {
    const { ctx, map } = this
    ctx.clearRect(0, 0, map.pixelWidth, map.pixelHeight)
    map.render(ctx)

    // Quem está mais embaixo é desenhado por último, para sobrepor quem está atrás
    const entities = [...this.enemies, ...(this.player && this.state !== 'intro' ? [this.player] : [])].sort(
      (a, b) => a.position.y - b.position.y,
    )
    for (const entity of entities) entity.render(ctx, map.tileSize)
    for (const effect of this.effects) effect.render(ctx, map.tileSize)

    if (this.state === 'playing' || this.state === 'paused') this.renderHud()

    switch (this.state) {
      case 'menu':
        this.renderOverlay(
          'Boss Game',
          [
            'Derrote o boss de cada fase sem perder as 3 vidas.',
            'Setas ou WASD: andar   ·   Espaço: atacar   ·   P: pausar',
          ],
          'Enter para começar',
        )
        break
      case 'intro': {
        const n = this.levelIndex + 1
        const title = this.levelIndex === 0 ? `Fase ${n}: ${map.name}` : `Boss derrotado! Fase ${n}: ${map.name}`
        this.renderOverlay(title, [this.level.description], 'Enter para começar')
        break
      }
      case 'paused':
        this.renderOverlay('Pausado', [], 'P para continuar')
        break
      case 'gameover':
        this.renderOverlay(
          'Você foi pego!',
          [`Chegou à fase ${this.levelIndex + 1} de ${LEVELS.length}.`],
          'Enter para jogar de novo',
        )
        break
      case 'victory':
        this.renderOverlay(
          'Você venceu!',
          [`Derrotou os ${LEVELS.length} bosses em ${this.totalTime.toFixed(1)}s.`],
          'Enter para jogar de novo',
        )
        break
    }
  }

  /** Desenha fase, vidas e tempo no canto e a vida do boss no topo. */
  private renderHud(): void {
    const { ctx, map } = this
    const player = this.player
    const hearts = player
      ? '♥'.repeat(player.lives) + '♡'.repeat(Math.max(0, PLAYER_SETTINGS.lives - player.lives))
      : ''
    const text = `Fase ${this.levelIndex + 1}/${LEVELS.length}   ${hearts}   ${this.levelTime.toFixed(1)}s`

    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(8, 8, ctx.measureText(text).width + 24, 36)
    ctx.fillStyle = '#fff'
    ctx.fillText(text, 20, 16)

    const boss = this.boss
    if (!boss) return
    const width = 300
    const x = map.pixelWidth - width - 16
    const y = map.pixelHeight - 40
    const speed = (0.3 / boss.stepDuration).toFixed(1)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(x - 8, y - 30, width + 16, 62)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.fillText(`Boss   velocidade ${speed}x`, x, y - 24)
    ctx.fillStyle = '#5a1d1d'
    ctx.fillRect(x, y, width, 16)
    ctx.fillStyle = '#e53935'
    ctx.fillRect(x, y, (width * boss.hp) / boss.maxHp, 16)
    ctx.strokeStyle = '#fff'
    ctx.strokeRect(x, y, width, 16)
  }

  /**
   * Escurece a tela e escreve uma mensagem centralizada.
   * @param title Texto principal.
   * @param lines Linhas de apoio.
   * @param hint Instrução de qual tecla apertar.
   */
  private renderOverlay(title: string, lines: string[], hint: string): void {
    const { ctx, map } = this
    const cx = map.pixelWidth / 2
    let y = map.pixelHeight / 2 - 40 - lines.length * 20

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fillRect(0, 0, map.pixelWidth, map.pixelHeight)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${title.length > 24 ? 44 : 60}px system-ui, sans-serif`
    ctx.fillText(title, cx, y)
    y += 70

    ctx.font = '26px system-ui, sans-serif'
    for (const line of lines) {
      ctx.fillText(line, cx, y)
      y += 40
    }

    ctx.fillStyle = '#ffd54a'
    ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.fillText(hint, cx, y + 20)
  }
}
