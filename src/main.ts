import { loadImages } from './core/assets'
import { Game } from './core/Game'
import { Input } from './core/Input'
import './style.css'

/**
 * Busca um elemento obrigatório da página.
 * @param selector Seletor CSS.
 * @returns O elemento encontrado.
 * @throws {Error} Se o elemento não existir.
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
  const game = new Game(canvas, images, new Input())

  addVillain.addEventListener('click', () => {
    game.addMinion()
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
