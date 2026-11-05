/** Caminhos das imagens usadas pelo jogo, relativos à pasta `public/`. */
export const IMAGE_PATHS = {
  player: 'img/actor.png',
  villain: 'img/Villager1.png',
  floor: 'img/bgs.png',
  walls: 'img/walls.png',
} as const

/** Nome de uma imagem conhecida pelo jogo. */
export type ImageName = keyof typeof IMAGE_PATHS

/** Todas as imagens do jogo, já carregadas. */
export type Images = Record<ImageName, HTMLImageElement>

/**
 * Carrega uma imagem.
 * @param src Caminho da imagem.
 * @returns Promise resolvida com a imagem pronta para desenhar.
 * @throws Rejeita se a imagem não puder ser carregada.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Não foi possível carregar a imagem: ${src}`))
    img.src = `${import.meta.env.BASE_URL}${src}`
  })
}

/**
 * Carrega todas as imagens de `IMAGE_PATHS` em paralelo.
 * @returns Promise com um objeto `nome -> imagem`.
 */
export async function loadImages(): Promise<Images> {
  const entries = await Promise.all(
    (Object.entries(IMAGE_PATHS) as [ImageName, string][]).map(
      async ([name, src]) => [name, await loadImage(src)] as const,
    ),
  )
  return Object.fromEntries(entries) as Images
}
