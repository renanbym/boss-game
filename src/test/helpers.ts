import type { Look } from '../entities/Entity'
import { Grid } from '../world/Grid'
import { parseMap } from '../world/maps'

/**
 * Cria um `Grid` a partir de linhas de texto (`#` parede, `.` chão).
 * @param tiles Linhas do mapa.
 * @returns O grid pronto.
 */
export function gridFrom(...tiles: string[]): Grid {
  return new Grid(parseMap({ name: 'teste', tiles }))
}

/** Aparência falsa: os testes não desenham nada, então a imagem não é usada. */
export const FAKE_LOOK: Look = { image: {} as HTMLImageElement, character: 0 }

/**
 * Chama `fn` várias vezes simulando frames de 1/60 s.
 * @param seconds Quanto tempo simular.
 * @param fn Função chamada a cada frame, recebendo o delta time.
 */
export function simulate(seconds: number, fn: (dt: number) => void): void {
  const dt = 1 / 60
  for (let t = 0; t < seconds; t += dt) fn(dt)
}
