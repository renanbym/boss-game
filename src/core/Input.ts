import type { Direction } from '../entities/Entity'

/** Teclas que movem o jogador (setas e WASD). */
const DIRECTION_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

/**
 * Estado do teclado consultado pelo loop do jogo.
 *
 * Em vez de mover o personagem direto no evento, guarda o que está pressionado
 * e o jogo lê isso a cada frame.
 */
export class Input {
  /** Direções seguradas, na ordem em que foram pressionadas. */
  private held: Direction[] = []
  /** Teclas pressionadas desde o último `endFrame()`. */
  private pressed = new Set<string>()
  /** Última seta tocada e ainda não usada (para toques rápidos entre dois frames). */
  private tapped: Direction | null = null

  /**
   * @param target Onde escutar os eventos de teclado.
   */
  constructor(private readonly target: Window = window) {
    target.addEventListener('keydown', this.onKeyDown)
    target.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('blur', this.onBlur)
  }

  /**
   * Direção que o jogador quer andar agora: a última seta pressionada que ainda está segurada.
   * @returns A direção, ou null se nenhuma estiver segurada.
   */
  get direction(): Direction | null {
    return this.held[this.held.length - 1] ?? null
  }

  /**
   * Última seta tocada que ainda não virou movimento. Garante que um toque rápido,
   * apertado e solto entre dois frames, ainda mova o jogador.
   * @returns A direção tocada, ou null.
   */
  get tappedDirection(): Direction | null {
    return this.tapped
  }

  /** Descarta o toque guardado (depois de usado, ou ao trocar de tela). */
  clearTap(): void {
    this.tapped = null
  }

  /**
   * Indica se a tecla foi pressionada neste frame.
   * @param key Valor de `KeyboardEvent.key` (ex.: 'Enter', 'p').
   * @returns true se a tecla foi pressionada desde o último `endFrame()`.
   */
  wasPressed(key: string): boolean {
    return this.pressed.has(key.toLowerCase())
  }

  /** Limpa as teclas "pressionadas neste frame". Chamar no fim de cada update. */
  endFrame(): void {
    this.pressed.clear()
  }

  /** Remove os listeners de teclado. */
  dispose(): void {
    this.target.removeEventListener('keydown', this.onKeyDown)
    this.target.removeEventListener('keyup', this.onKeyUp)
    this.target.removeEventListener('blur', this.onBlur)
  }

  /**
   * Registra a tecla pressionada e, se for direção, coloca no topo das seguradas.
   * @param event Evento de teclado.
   */
  private onKeyDown = (event: KeyboardEvent): void => {
    const direction = DIRECTION_KEYS[event.key] ?? DIRECTION_KEYS[event.key.toLowerCase()]
    if (direction) {
      event.preventDefault() // evita rolar a página com as setas
      this.held = this.held.filter(d => d !== direction)
      this.held.push(direction)
      if (!event.repeat) this.tapped = direction
    }
    if (!event.repeat) this.pressed.add(event.key.toLowerCase())
  }

  /**
   * Tira a direção solta da lista de seguradas.
   * @param event Evento de teclado.
   */
  private onKeyUp = (event: KeyboardEvent): void => {
    const direction = DIRECTION_KEYS[event.key] ?? DIRECTION_KEYS[event.key.toLowerCase()]
    if (direction) this.held = this.held.filter(d => d !== direction)
  }

  /** Solta tudo quando a janela perde o foco, para o personagem não "grudar" andando. */
  private onBlur = (): void => {
    this.held = []
  }
}
