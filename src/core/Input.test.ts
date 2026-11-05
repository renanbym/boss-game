// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Input } from './Input'

describe('Input', () => {
  let input: Input

  /**
   * Dispara um evento de teclado na janela.
   * @param type Tipo do evento.
   * @param key Tecla.
   * @param repeat true para simular a repetição automática de tecla segurada.
   */
  const fire = (type: 'keydown' | 'keyup', key: string, repeat = false): void => {
    window.dispatchEvent(new KeyboardEvent(type, { key, repeat, cancelable: true }))
  }

  beforeEach(() => {
    input = new Input(window)
  })

  afterEach(() => {
    input.dispose()
  })

  it('a última direção pressionada vence; ao soltar, volta para a anterior', () => {
    fire('keydown', 'ArrowUp')
    fire('keydown', 'ArrowLeft')
    expect(input.direction).toBe('left')
    fire('keyup', 'ArrowLeft')
    expect(input.direction).toBe('up')
    fire('keyup', 'ArrowUp')
    expect(input.direction).toBeNull()
  })

  it('aceita WASD, inclusive com Caps Lock', () => {
    fire('keydown', 'D')
    expect(input.direction).toBe('right')
  })

  it('guarda o toque rápido até ser usado', () => {
    fire('keydown', 'ArrowDown')
    fire('keyup', 'ArrowDown')
    expect(input.direction).toBeNull()
    expect(input.tappedDirection).toBe('down')
    input.endFrame()
    expect(input.tappedDirection).toBe('down')
    input.clearTap()
    expect(input.tappedDirection).toBeNull()
  })

  it('repetição automática não conta como toque novo', () => {
    fire('keydown', 'ArrowDown')
    input.clearTap()
    fire('keydown', 'ArrowDown', true)
    expect(input.tappedDirection).toBeNull()
  })

  it('wasPressed vale só até o fim do frame e ignora maiúsculas', () => {
    fire('keydown', 'P')
    expect(input.wasPressed('p')).toBe(true)
    input.endFrame()
    expect(input.wasPressed('p')).toBe(false)
  })

  it('impede as setas e o espaço de rolarem a página', () => {
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true })
    const space = new KeyboardEvent('keydown', { key: ' ', cancelable: true })
    window.dispatchEvent(arrow)
    window.dispatchEvent(space)
    expect(arrow.defaultPrevented).toBe(true)
    expect(space.defaultPrevented).toBe(true)
  })

  it('solta tudo quando a janela perde o foco', () => {
    fire('keydown', 'ArrowUp')
    window.dispatchEvent(new Event('blur'))
    expect(input.direction).toBeNull()
  })

  it('para de escutar depois de dispose', () => {
    input.dispose()
    fire('keydown', 'ArrowUp')
    expect(input.direction).toBeNull()
  })
})
