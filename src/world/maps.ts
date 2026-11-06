import level1 from './maps/level1.json'
import level2 from './maps/level2.json'
import level3 from './maps/level3.json'

/** Formato dos arquivos de mapa em `maps/*.json`. */
export interface MapFile {
  /** Nome mostrado na tela. */
  name: string
  /** Uma string por linha: `#` = parede, `T` = árvore, `.` = chão. */
  tiles: string[]
}

/** Mapa já interpretado. */
export interface LevelMap {
  name: string
  /** `walls[y][x]` é true onde não dá para passar (parede ou árvore). */
  walls: boolean[][]
  /** `trees[y][x]` é true onde há árvore. Árvores também contam como `walls`. */
  trees: boolean[][]
}

/**
 * Converte um arquivo de mapa e valida o formato.
 * @param file Conteúdo do JSON.
 * @returns O mapa pronto para o `TileMap`.
 * @throws {Error} Se o mapa estiver vazio, não for retangular ou tiver caracteres desconhecidos.
 */
export function parseMap(file: MapFile): LevelMap {
  const width = file.tiles[0]?.length ?? 0
  if (width === 0) throw new Error(`Mapa "${file.name}" está vazio`)

  const cells = file.tiles.map((row, y) => {
    if (row.length !== width) {
      throw new Error(`Mapa "${file.name}": a linha ${y} tem ${row.length} casas, esperado ${width}`)
    }
    return [...row].map((char, x) => {
      if (char !== '#' && char !== 'T' && char !== '.') {
        throw new Error(`Mapa "${file.name}": caractere "${char}" desconhecido em (${x}, ${y})`)
      }
      return char
    })
  })

  return {
    name: file.name,
    walls: cells.map((row) => row.map((char) => char !== '.')),
    trees: cells.map((row) => row.map((char) => char === 'T')),
  }
}

/** Mapas das fases, na ordem. */
export const MAPS: readonly LevelMap[] = [level1, level2, level3].map(parseMap)
