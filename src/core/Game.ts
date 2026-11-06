import { SpriteEffect, type EffectSheet } from '../effects/SpriteEffect'
import { Enemy, type EnemyEvent, type EnemyOptions } from '../entities/Enemy'
import { Player, PLAYER_SETTINGS } from '../entities/Player'
import { Projectile } from '../entities/Projectile'
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

/** Algo desenhado na cena ordenado pela altura (personagens e árvores). */
interface Drawable {
  readonly position: Point
  /**
   * Desenha o objeto.
   * @param ctx Contexto onde desenhar.
   * @param tileSize Tamanho de cada casa, em pixels.
   */
  render(ctx: CanvasRenderingContext2D, tileSize: number): void
}

/** Ajustes gerais de jogabilidade. */
export const SETTINGS = {
  /** Tamanho de cada casa na tela, em pixels. */
  tileSize: 40,
  /** Distância mínima, em casas, entre o jogador e um inimigo novo. */
  spawnDistance: 8,
  /** Distância, em casas, em que um inimigo pega o jogador. */
  catchDistance: 0.6,
  /** Maior delta time aceito, em segundos (evita "teleporte" depois de a aba ficar parada). */
  maxDeltaTime: 0.1,
} as const

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
  /** Projéteis no ar: poderes do jogador e tiros do boss. */
  projectiles: Projectile[] = []
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
    this.projectiles = []
    this.state = 'intro'
  }

  /** Começa a fase atual: jogador, boss e lacaios em casas aleatórias. */
  private startLevel(): void {
    const lives = this.player?.lives ?? PLAYER_SETTINGS.lives
    this.player = new Player({ image: this.images.actors, character: 0 }, this.map.randomFreeTile(), lives)
    this.enemies = []
    this.effects = []
    this.projectiles = []
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
   * Move todo mundo, resolve os poderes lançados e verifica se o jogador foi pego.
   * @param dt Tempo desde o último frame, em segundos.
   * @param attack true se o jogador apertou o ataque neste frame.
   */
  private updatePlaying(dt: number, attack: boolean): void {
    const player = this.player
    if (!player) return

    this.levelTime += dt
    this.totalTime += dt

    // Árvores somem e reaparecem; não reaparecem em cima de ninguém
    this.map.grove.update(dt, (tile) => this.isOccupied(tile))

    player.step(dt, this.input, this.map)
    if (attack) {
      const projectile = player.shoot()
      if (projectile) this.projectiles.push(projectile)
    }

    for (const enemy of this.enemies) {
      enemy.step(dt, this.map)
      this.handleEvents(enemy.takeEvents())
    }

    this.updateProjectiles(dt, player)
    if (this.state !== 'playing') return // o boss pode ter sido derrotado, ou o jogador abatido, agora
    this.checkCaught(player)
  }

  /**
   * Diz se algum personagem está numa casa, inclusive de passagem (no meio de um passo).
   * @param tile Casa a verificar.
   * @returns true se o jogador ou algum inimigo vivo ocupa a casa.
   */
  private isOccupied(tile: Point): boolean {
    const characters = [...this.enemies, ...(this.player ? [this.player] : [])]
    return characters.some((c) => {
      if (!c.alive) return false
      const p = c.position
      const touches = (x: number, y: number) => x === tile.x && y === tile.y
      // A casa de destino e as casas que o desenho está tocando agora
      return (
        touches(c.tile.x, c.tile.y) ||
        touches(Math.floor(p.x), Math.floor(p.y)) ||
        touches(Math.ceil(p.x), Math.ceil(p.y))
      )
    })
  }

  /**
   * Reage ao que os inimigos fizeram neste frame: mostra teletransportes e cria os tiros.
   * @param events Eventos de um inimigo.
   */
  private handleEvents(events: EnemyEvent[]): void {
    for (const event of events) {
      if (event.type === 'teleport') this.showTeleport(event.from, event.to)
      else this.projectiles.push(new Projectile(event.from, event.direction, 'boss'))
    }
  }

  /**
   * Move os projéteis.
   * - Poder do jogador: o primeiro inimigo no caminho recebe o golpe; se estiver protegido
   *   (boss fora da janela ou atordoado), o golpe é bloqueado.
   * - Tiro do boss: tira uma vida do jogador, a não ser que ele esteja invulnerável (aí passa direto).
   * @param dt Tempo desde o último frame, em segundos.
   * @param player Jogador.
   */
  private updateProjectiles(dt: number, player: Player): void {
    for (const projectile of this.projectiles) {
      if (projectile.kind === 'boss') this.updateBossShot(dt, projectile, player)
      else this.updatePlayerShot(dt, projectile)
    }

    this.projectiles = this.projectiles.filter((p) => p.isFlying)
    this.enemies = this.enemies.filter((e) => e.alive)
  }

  /**
   * Avança um poder do jogador e aplica o golpe no primeiro inimigo atingido.
   * @param dt Tempo desde o último frame, em segundos.
   * @param projectile Poder do jogador.
   */
  private updatePlayerShot(dt: number, projectile: Projectile): void {
    let target: Enemy | undefined
    projectile.advance(dt, this.map, (position) => {
      target = this.enemies.find((e) => e.alive && e.distanceToPoint(position) < projectile.settings.hitDistance)
      return target !== undefined
    })

    if (projectile.end === 'hit' && target) {
      const damaged = target.hurt(projectile.direction, this.map)
      this.showImpact(projectile.position, damaged)
      if (damaged && !target.alive) this.onEnemyKilled(target)
    } else if (projectile.end === 'wall') {
      this.showImpact(projectile.position, false)
    }
  }

  /**
   * Avança um tiro do boss e tira uma vida do jogador se acertar.
   * @param dt Tempo desde o último frame, em segundos.
   * @param projectile Tiro do boss.
   * @param player Jogador.
   */
  private updateBossShot(dt: number, projectile: Projectile, player: Player): void {
    projectile.advance(
      dt,
      this.map,
      (position) =>
        player.alive && !player.isInvulnerable && player.distanceToPoint(position) < projectile.settings.hitDistance,
    )

    if (projectile.end === 'hit') {
      this.showImpact(projectile.position, true)
      player.hurt()
      if (!player.alive) {
        this.state = 'gameover'
        playSound('die')
      }
    } else if (projectile.end === 'wall') {
      this.showImpact(projectile.position, false)
    }
  }

  /**
   * Mostra o impacto de um projétil.
   * @param position Onde o projétil parou, em unidades de casa.
   * @param damaged true se tirou vida (explosão); false se foi bloqueado ou bateu na parede (faísca).
   */
  private showImpact(position: Point, damaged: boolean): void {
    this.effects.push(
      damaged
        ? new SpriteEffect(
            { image: this.images.burst, firstFrame: 5, frameCount: 12 },
            { center: position, size: 1.3, frameTime: 0.03 },
          )
        : new SpriteEffect(
            { image: this.images.slash, firstFrame: 0, frameCount: 6 },
            { center: position, size: 0.9, frameTime: 0.03 },
          ),
    )
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
    this.handleEvents(catcher.takeEvents())
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
    // Árvores entram na mesma ordenação: quem passa atrás de uma árvore fica coberto pela copa
    const drawables: Drawable[] = [
      ...map.treeSprites,
      ...this.enemies,
      ...(this.player && this.state !== 'intro' ? [this.player] : []),
    ].sort((a, b) => a.position.y - b.position.y)
    for (const drawable of drawables) drawable.render(ctx, map.tileSize)
    for (const projectile of this.projectiles) projectile.render(ctx, map.tileSize)
    for (const effect of this.effects) effect.render(ctx, map.tileSize)

    if (this.state === 'playing' || this.state === 'paused') this.renderHud()

    switch (this.state) {
      case 'menu':
        this.renderOverlay(
          'Boss Game',
          [
            'Derrote o boss de cada fase sem perder as 3 vidas.',
            'O boss só leva dano quando pisca: 3s a cada 10s.',
            'Protegido, ele atira em você a cada 5s.',
            'Setas/WASD: andar   ·   Espaço: lançar poder   ·   P: pausar',
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
    const countdown = boss.vulnerabilityCountdown
    let status = ''
    if (countdown !== null) {
      status = boss.isVulnerable ? `VULNERÁVEL ${countdown.toFixed(1)}s` : `protegido, abre em ${countdown.toFixed(1)}s`
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(x - 8, y - 30, width + 16, 62)
    ctx.font = 'bold 16px system-ui, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.fillText(`Boss  ${speed}x`, x, y - 24)
    ctx.textAlign = 'right'
    ctx.fillStyle = boss.isVulnerable ? '#ffd54a' : '#9e9e9e'
    ctx.fillText(status, x + width, y - 24)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#5a1d1d'
    ctx.fillRect(x, y, width, 16)
    ctx.fillStyle = boss.isVulnerable ? '#ff5252' : '#8e3b3b'
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
