/** Efeitos sonoros disponíveis. */
export type SoundEffect = 'playerShot' | 'bossShot' | 'hit' | 'blocked'

/** O que o jogo precisa do sistema de som. Permite trocar por uma versão muda (testes). */
export interface Sound {
  /** Começa a música de fundo (não faz nada se já estiver tocando). */
  startMusic(): void
  /** Para a música de fundo. */
  stopMusic(): void
  /**
   * Abaixa a música (pausa) ou volta ao volume normal.
   * @param ducked true para abaixar.
   */
  duckMusic(ducked: boolean): void
  /**
   * Toca um efeito sonoro.
   * @param effect Qual efeito.
   */
  play(effect: SoundEffect): void
  /**
   * Liga ou desliga todo o som.
   * @returns true se ficou mudo.
   */
  toggleMute(): boolean
  /** true se o som está desligado. */
  readonly muted: boolean
}

/** Som que não faz nada: usado quando não há áudio (testes, navegadores sem Web Audio). */
export const SILENT: Sound = {
  startMusic: () => {},
  stopMusic: () => {},
  duckMusic: () => {},
  play: () => {},
  toggleMute: () => true,
  muted: true,
}

/** Volumes de cada parte. */
const VOLUME = { master: 0.7, music: 0.16, musicDucked: 0.04, sfx: 0.5 } as const

/** Andamento da música, em batidas por minuto. */
const BPM = 84

/** Duração de uma colcheia, em segundos. */
const EIGHTH = 60 / BPM / 2

/** Quanto tempo à frente as notas são agendadas, em segundos. */
const LOOKAHEAD = 0.3

/**
 * Acordes da música, um por compasso (8 colcheias), em números MIDI.
 * Ré menor, Si bemol, Fá, Lá: uma progressão melancólica de masmorra.
 */
const CHORDS = [
  [50, 53, 57], // Dm
  [46, 50, 53], // Bb
  [41, 45, 48], // F
  [45, 49, 52], // A
]

/** Ordem das notas do acorde no arpejo, por colcheia (índices em acorde + oitava). */
const ARPEGGIO = [0, 1, 2, 3, 2, 1, 2, 4]

/** Chave usada para lembrar se o som está desligado. */
const MUTE_KEY = 'boss-game:muted'

/**
 * Converte nota MIDI em frequência.
 * @param note Número MIDI (69 = Lá 440 Hz).
 * @returns Frequência em Hz.
 */
function frequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12)
}

/**
 * Música e efeitos sonoros sintetizados com Web Audio (nenhum arquivo de áudio).
 *
 * O `AudioContext` só é criado no primeiro uso depois de uma interação do jogador,
 * por causa da política de autoplay dos navegadores.
 */
export class AudioManager implements Sound {
  muted: boolean
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private musicBus: GainNode | null = null
  private sfxBus: GainNode | null = null
  private echo: DelayNode | null = null
  private noise: AudioBuffer | null = null
  private scheduler: number | null = null
  private nextNoteTime = 0
  private step = 0

  /** Começa mudo se o jogador desligou o som da última vez. */
  constructor() {
    this.muted = readMuted()
  }

  /** Cria ou retoma o contexto de áudio. Chamar a partir de uma interação do jogador. */
  unlock(): void {
    const context = this.ensureContext()
    if (context?.state === 'suspended') void context.resume()
  }

  /** Começa a música de fundo (não faz nada se já estiver tocando). */
  startMusic(): void {
    const context = this.ensureContext()
    if (!context || this.scheduler !== null) return
    this.unlock()
    this.nextNoteTime = context.currentTime + 0.1
    this.step = 0
    this.scheduler = window.setInterval(() => this.scheduleMusic(), 50)
    this.duckMusic(false)
  }

  /** Para a música de fundo. */
  stopMusic(): void {
    if (this.scheduler !== null) window.clearInterval(this.scheduler)
    this.scheduler = null
  }

  /**
   * Abaixa a música (pausa) ou volta ao volume normal.
   * @param ducked true para abaixar.
   */
  duckMusic(ducked: boolean): void {
    if (!this.context || !this.musicBus) return
    const volume = ducked ? VOLUME.musicDucked : VOLUME.music
    this.musicBus.gain.setTargetAtTime(volume, this.context.currentTime, 0.2)
  }

  /**
   * Liga ou desliga todo o som e lembra a escolha.
   * @returns true se ficou mudo.
   */
  toggleMute(): boolean {
    this.muted = !this.muted
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
    } catch {
      // Sem localStorage (modo privado, etc.): a escolha só vale nesta sessão
    }
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : VOLUME.master, this.context.currentTime, 0.05)
    }
    return this.muted
  }

  /**
   * Toca um efeito sonoro.
   * @param effect Qual efeito.
   */
  play(effect: SoundEffect): void {
    const context = this.ensureContext()
    if (!context || !this.sfxBus || this.muted) return
    const t = context.currentTime
    switch (effect) {
      case 'playerShot':
        // Sopro mágico agudo subindo
        this.sweep('triangle', 520, 1500, t, 0.16, 0.35)
        this.noiseBurst(t, 0.12, 0.18, 'highpass', 2500)
        break
      case 'bossShot':
        // Rosnado grave descendo
        this.sweep('sawtooth', 240, 70, t, 0.32, 0.3, 900)
        this.noiseBurst(t, 0.25, 0.15, 'lowpass', 600)
        break
      case 'hit':
        // Impacto: pancada grave com estalo
        this.sweep('sine', 180, 45, t, 0.22, 0.6)
        this.noiseBurst(t, 0.18, 0.35, 'lowpass', 1800)
        break
      case 'blocked':
        // Tinido metálico curto
        this.tone('square', 1900, t, 0.1, 0.12, 3000)
        this.tone('square', 2850, t + 0.01, 0.08, 0.08, 4000)
        break
    }
  }

  /**
   * Cria o contexto e a cadeia de volume na primeira vez.
   * @returns O contexto, ou null se o navegador não tiver Web Audio.
   */
  private ensureContext(): AudioContext | null {
    if (this.context) return this.context
    if (typeof AudioContext === 'undefined') return null

    const context = new AudioContext()
    this.master = context.createGain()
    this.master.gain.value = this.muted ? 0 : VOLUME.master
    this.master.connect(context.destination)

    this.musicBus = context.createGain()
    this.musicBus.gain.value = VOLUME.music
    this.musicBus.connect(this.master)

    // Eco de masmorra: atraso com realimentação, só na música
    this.echo = context.createDelay(1)
    this.echo.delayTime.value = EIGHTH * 3
    const feedback = context.createGain()
    feedback.gain.value = 0.35
    const echoTone = context.createBiquadFilter()
    echoTone.type = 'lowpass'
    echoTone.frequency.value = 1800
    this.echo.connect(echoTone)
    echoTone.connect(feedback)
    feedback.connect(this.echo)
    echoTone.connect(this.musicBus)

    this.sfxBus = context.createGain()
    this.sfxBus.gain.value = VOLUME.sfx
    this.sfxBus.connect(this.master)

    // Ruído branco reaproveitado pelos efeitos
    this.noise = context.createBuffer(1, context.sampleRate, context.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1

    this.context = context
    return context
  }

  /** Agenda as notas da música que caem dentro da janela de antecedência. */
  private scheduleMusic(): void {
    const context = this.context
    if (!context) return
    while (this.nextNoteTime < context.currentTime + LOOKAHEAD) {
      this.scheduleStep(this.step, this.nextNoteTime)
      this.nextNoteTime += EIGHTH
      this.step = (this.step + 1) % (CHORDS.length * 8)
    }
  }

  /**
   * Agenda uma colcheia da música: baixo, acorde, arpejo e tambor.
   * @param step Posição da colcheia no loop.
   * @param time Quando tocar, no relógio do contexto.
   */
  private scheduleStep(step: number, time: number): void {
    const chord = CHORDS[Math.floor(step / 8)]!
    const beat = step % 8

    if (beat === 0) {
      // Acorde sustentado (pad) e baixo no início do compasso
      for (const note of chord) this.musicNote('sawtooth', frequency(note), time, EIGHTH * 8, 0.05, 700, 0.6)
      this.musicNote('triangle', frequency(chord[0]! - 12), time, EIGHTH * 4, 0.35, 400, 0.02)
    }
    if (beat === 4) this.musicNote('triangle', frequency(chord[0]! - 12), time, EIGHTH * 4, 0.28, 400, 0.02)

    // Arpejo dedilhado, com eco
    const index = ARPEGGIO[beat]!
    const note = chord[index % 3]! + 12 + Math.floor(index / 3) * 12
    this.musicNote('triangle', frequency(note), time, EIGHTH * 0.9, 0.12, 2400, 0.005, true)

    // Tambor grave nos tempos 1 e 3
    if (beat === 0 || beat === 4) this.drum(time)
  }

  /**
   * Uma nota da música.
   * @param type Forma de onda.
   * @param hz Frequência.
   * @param time Início.
   * @param duration Duração, em segundos.
   * @param volume Volume de pico.
   * @param cutoff Corte do filtro passa-baixa, em Hz.
   * @param attack Tempo de ataque, em segundos.
   * @param echo true para mandar também para o eco.
   */
  private musicNote(
    type: OscillatorType,
    hz: number,
    time: number,
    duration: number,
    volume: number,
    cutoff: number,
    attack: number,
    echo = false,
  ): void {
    const context = this.context!
    const osc = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    osc.type = type
    osc.frequency.value = hz
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    gain.gain.setValueAtTime(0, time)
    gain.gain.linearRampToValueAtTime(volume, time + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.musicBus!)
    if (echo && this.echo) gain.connect(this.echo)
    osc.start(time)
    osc.stop(time + duration + 0.05)
  }

  /**
   * Tambor grave: seno que cai rápido de frequência.
   * @param time Início.
   */
  private drum(time: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.frequency.setValueAtTime(110, time)
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.25)
    gain.gain.setValueAtTime(0.5, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35)
    osc.connect(gain)
    gain.connect(this.musicBus!)
    osc.start(time)
    osc.stop(time + 0.4)
  }

  /**
   * Efeito com a frequência deslizando de um valor a outro.
   * @param type Forma de onda.
   * @param from Frequência inicial.
   * @param to Frequência final.
   * @param time Início.
   * @param duration Duração, em segundos.
   * @param volume Volume de pico.
   * @param cutoff Corte opcional de passa-baixa, em Hz.
   */
  private sweep(
    type: OscillatorType,
    from: number,
    to: number,
    time: number,
    duration: number,
    volume: number,
    cutoff?: number,
  ): void {
    const context = this.context!
    const osc = context.createOscillator()
    const gain = context.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, time)
    osc.frequency.exponentialRampToValueAtTime(to, time + duration)
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    let node: AudioNode = osc
    if (cutoff) {
      const filter = context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = cutoff
      osc.connect(filter)
      node = filter
    }
    node.connect(gain)
    gain.connect(this.sfxBus!)
    osc.start(time)
    osc.stop(time + duration + 0.05)
  }

  /**
   * Efeito de tom fixo e curto.
   * @param type Forma de onda.
   * @param hz Frequência.
   * @param time Início.
   * @param duration Duração, em segundos.
   * @param volume Volume de pico.
   * @param center Centro do filtro passa-faixa, em Hz.
   */
  private tone(type: OscillatorType, hz: number, time: number, duration: number, volume: number, center: number): void {
    const context = this.context!
    const osc = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    osc.type = type
    osc.frequency.value = hz
    filter.type = 'bandpass'
    filter.frequency.value = center
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxBus!)
    osc.start(time)
    osc.stop(time + duration + 0.05)
  }

  /**
   * Rajada de ruído filtrado (sopro, estalo, impacto).
   * @param time Início.
   * @param duration Duração, em segundos.
   * @param volume Volume de pico.
   * @param type Tipo de filtro.
   * @param cutoff Frequência do filtro, em Hz.
   */
  private noiseBurst(time: number, duration: number, volume: number, type: BiquadFilterType, cutoff: number): void {
    const context = this.context!
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    source.buffer = this.noise
    filter.type = type
    filter.frequency.value = cutoff
    gain.gain.setValueAtTime(volume, time)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.sfxBus!)
    source.start(time)
    source.stop(time + duration + 0.05)
  }
}

/**
 * Lê se o jogador desligou o som da última vez.
 * @returns true se o som deve começar desligado.
 */
function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}
