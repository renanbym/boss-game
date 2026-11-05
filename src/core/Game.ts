import { Boss } from '../entities/Boss'
import { Player } from '../entities/Player'
import type { TileMap } from '../world/TileMap'
import type { Images } from './assets'
import type { Input } from './Input'

/** Fase em que o jogo está. */
export type GameState = 'menu' | 'playing' | 'paused' | 'gameover'

/** Ajustes de jogabilidade. */
export const SETTINGS = {
  /** Tempo do jogador para andar uma casa, em segundos. */
  playerStepDuration: 0.15,
  /** Tempo do vilão para andar uma casa, em segundos. */
  bossStepDuration: 0.25,
  /** Distância mínima, em casas, entre o jogador e um vilão novo. */
  bossSpawnDistance: 8,
  /** Distância, em casas, em que o vilão pega o jogador. */
  catchDistance: 0.6,
  /** Maior delta time aceito, em segundos (evita "teleporte" depois de a aba ficar parada). */
  maxDeltaTime: 0.1,
} as const

/**
 * Loop principal do jogo: atualiza a lógica com delta time e desenha a cena.
 *
 * Estados:
 * - `menu`: tela inicial, Enter começa.
 * - `playing`: jogando; P pausa.
 * - `paused`: tudo parado; P volta.
 * - `gameover`: o jogador foi pego; Enter recomeça.
 */
export class Game {
  state: GameState = 'menu'
  player: Player | null = null
  bosses: Boss[] = []
  /** Tempo sobrevivido na rodada atual, em segundos. */
  survived = 0

  private readonly ctx: CanvasRenderingContext2D
  private frameId: number | null = null
  private lastTime: number | null = null

  /**
   * @param canvas Canvas onde o jogo é desenhado. É redimensionado para o tamanho do mapa.
   * @param map Mapa da rodada.
   * @param images Imagens já carregadas.
   * @param input Estado do teclado.
   */
  constructor(
    canvas: HTMLCanvasElement,
    private readonly map: TileMap,
    private readonly images: Images,
    private readonly input: Input,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    this.ctx = ctx
    canvas.width = map.pixelWidth
    canvas.height = map.pixelHeight
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

  /** Começa uma rodada nova: jogador em casa aleatória e um vilão longe dele. */
  newRound(): void {
    this.player = new Player(this.images.player, this.map.randomFreeTile(), SETTINGS.playerStepDuration)
    this.bosses = []
    this.survived = 0
    this.state = 'playing'
    this.addBoss()
  }

  /**
   * Coloca mais um vilão no mapa, longe do jogador. Só funciona durante a partida (ou pausado).
   * @returns O vilão criado, ou null se não houver partida em andamento.
   */
  addBoss(): Boss | null {
    if ((this.state !== 'playing' && this.state !== 'paused') || !this.player) return null
    const start = this.map.randomFreeTile([this.player.tile], SETTINGS.bossSpawnDistance)
    const boss = new Boss(this.images.villain, start, SETTINGS.bossStepDuration, this.player)
    this.bosses.push(boss)
    return boss
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
    switch (this.state) {
      case 'menu':
      case 'gameover':
        this.input.clearTap() // setas apertadas fora da partida não viram passo depois
        if (this.input.wasPressed('Enter')) this.newRound()
        break

      case 'paused':
        this.input.clearTap()
        if (this.input.wasPressed('p')) this.state = 'playing'
        break

      case 'playing':
        if (this.input.wasPressed('p')) {
          this.state = 'paused'
          break
        }
        this.updatePlaying(dt)
        break
    }
    this.input.endFrame()
  }

  /**
   * Move jogador e vilões e verifica se alguém pegou o jogador.
   * @param dt Tempo desde o último frame, em segundos.
   */
  private updatePlaying(dt: number): void {
    const player = this.player
    if (!player) return

    player.step(dt, this.input, this.map)
    for (const boss of this.bosses) boss.step(dt, this.map)

    if (this.bosses.some(boss => boss.distanceTo(player) < SETTINGS.catchDistance)) {
      player.die()
      this.state = 'gameover'
      return
    }
    this.survived += dt
  }

  /** Desenha cenário, personagens, HUD e a tela do estado atual. */
  private render(): void {
    const { ctx, map } = this
    ctx.clearRect(0, 0, map.pixelWidth, map.pixelHeight)
    map.render(ctx)

    // Quem está mais embaixo é desenhado por último, para sobrepor quem está atrás
    const entities = [...this.bosses, ...(this.player ? [this.player] : [])]
      .sort((a, b) => a.position.y - b.position.y)
    for (const entity of entities) entity.render(ctx, map.tileSize)

    if (this.state !== 'menu') this.renderHud()

    if (this.state === 'menu') this.renderOverlay('Boss Game', 'Fuja dos vilões. Setas ou WASD para andar.', 'Enter para começar')
    if (this.state === 'paused') this.renderOverlay('Pausado', '', 'P para continuar')
    if (this.state === 'gameover') {
      this.renderOverlay('Você foi pego!', `Sobreviveu ${this.survived.toFixed(1)}s`, 'Enter para jogar de novo')
    }
  }

  /** Desenha tempo sobrevivido e número de vilões no canto superior esquerdo. */
  private renderHud(): void {
    const { ctx } = this
    const text = `Tempo: ${this.survived.toFixed(1)}s   Vilões: ${this.bosses.length}`
    ctx.font = 'bold 20px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    ctx.fillRect(8, 8, ctx.measureText(text).width + 24, 36)
    ctx.fillStyle = '#fff'
    ctx.fillText(text, 20, 16)
  }

  /**
   * Escurece a tela e escreve uma mensagem centralizada.
   * @param title Texto principal.
   * @param subtitle Linha de apoio (pode ser vazia).
   * @param hint Instrução de qual tecla apertar.
   */
  private renderOverlay(title: string, subtitle: string, hint: string): void {
    const { ctx, map } = this
    const cx = map.pixelWidth / 2
    const cy = map.pixelHeight / 2

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'
    ctx.fillRect(0, 0, map.pixelWidth, map.pixelHeight)

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 64px system-ui, sans-serif'
    ctx.fillText(title, cx, cy - 60)
    ctx.font = '28px system-ui, sans-serif'
    if (subtitle) ctx.fillText(subtitle, cx, cy + 10)
    ctx.fillStyle = '#ffd54a'
    ctx.font = 'bold 28px system-ui, sans-serif'
    ctx.fillText(hint, cx, cy + 70)
  }
}
