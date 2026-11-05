/** Caminhos das imagens usadas pelo jogo, relativos à pasta `public/`. */
export const IMAGE_PATHS = {
  /** Heróis e bosses: 8 personagens de 3x4 quadros. */
  actors: 'img/actor.png',
  /** Lacaios. */
  villager: 'img/Villager1.png',
  floor: 'img/bgs.png',
  walls: 'img/walls.png',
  /** Golpe do jogador. */
  slash: 'img/attack.png',
  /** Explosão quando um inimigo morre. */
  burst: 'img/Special3.png',
  /** Redemoinho do teletransporte. */
  wind: 'img/Wind2.png',
} as const

/** Caminhos dos sons, relativos à pasta `public/`. */
export const SOUND_PATHS = {
  die: 'sounds/die.mp3',
} as const

/** Nome de uma imagem conhecida pelo jogo. */
export type ImageName = keyof typeof IMAGE_PATHS

/** Todas as imagens do jogo, já carregadas. */
export type Images = Record<ImageName, HTMLImageElement>

/**
 * Monta a URL de um arquivo de `public/`, respeitando o `base` do Vite.
 * @param path Caminho relativo à pasta `public/`.
 * @returns URL pronta para usar em `src`.
 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`
}

/**
 * Carrega uma imagem.
 * @param src Caminho relativo à pasta `public/`.
 * @returns Promise resolvida com a imagem pronta para desenhar.
 * @throws Rejeita se a imagem não puder ser carregada.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Não foi possível carregar a imagem: ${src}`))
    img.src = assetUrl(src)
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

/**
 * Toca um som do jogo. Falhas (ex.: navegador bloqueando áudio) são ignoradas.
 * @param name Nome do som em `SOUND_PATHS`.
 */
export function playSound(name: keyof typeof SOUND_PATHS): void {
  const audio = new Audio(assetUrl(SOUND_PATHS[name]))
  audio.volume = 0.6
  audio.play().catch(() => {})
}
