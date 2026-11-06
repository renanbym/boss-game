// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { AudioManager, SILENT } from './audio'

describe('som', () => {
  beforeEach(() => localStorage.clear())

  it('a versão muda aceita todas as chamadas sem fazer nada', () => {
    expect(() => {
      SILENT.startMusic()
      SILENT.play('playerShot')
      SILENT.duckMusic(true)
      SILENT.stopMusic()
    }).not.toThrow()
  })

  it('sem Web Audio no navegador, o jogo segue sem som e sem erro', () => {
    const sound = new AudioManager()
    expect(() => {
      sound.unlock()
      sound.startMusic()
      sound.play('bossShot')
      sound.play('hit')
      sound.play('blocked')
      sound.stopMusic()
    }).not.toThrow()
  })

  it('M liga e desliga o som e a escolha fica salva para a próxima vez', () => {
    const sound = new AudioManager()
    expect(sound.muted).toBe(false)
    expect(sound.toggleMute()).toBe(true)
    expect(new AudioManager().muted).toBe(true)
    expect(sound.toggleMute()).toBe(false)
    expect(new AudioManager().muted).toBe(false)
  })
})
