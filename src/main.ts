import { loadImages } from './core/assets'
import { Game } from './core/Game'
import { Input } from './core/Input'
import { MAP_1 } from './world/maps'
import { TileMap } from './world/TileMap'
import './style.css'

/** Tamanho de cada casa do mapa na tela, em pixels. */
const TILE_SIZE = 40

/**
 * Busca um elemento obrigatório da página.
 * @param selector Seletor CSS.
 * @returns O elemento encontrado.
 * @throws Se o elemento não existir.
 */
function requireElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`)
  return element
}

/** Carrega as imagens, monta o jogo e liga o botão de adicionar vilão. */
async function bootstrap(): Promise<void> {
  const canvas = requireElement<HTMLCanvasElement>('#game')
  const addVillain = requireElement<HTMLButtonElement>('#add-villain')

  const images = await loadImages()
  const map = new TileMap(MAP_1, TILE_SIZE, images)
  const game = new Game(canvas, map, images, new Input())
  canvas.style.setProperty('--aspect', String(map.pixelWidth / map.pixelHeight))

  addVillain.addEventListener('click', () => {
    game.addBoss()
    addVillain.blur() // devolve o foco ao jogo, para Enter/espaço não clicarem no botão de novo
  })

  game.start()
}

bootstrap().catch((error: unknown) => {
  console.error(error)
  document.body.insertAdjacentHTML(
    'beforeend',
    `<p class="error">Não foi possível iniciar o jogo: ${error instanceof Error ? error.message : String(error)}</p>`,
  )
})
