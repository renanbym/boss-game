import type { EnemyOptions } from '../entities/Enemy'
import { MAPS, type LevelMap } from '../world/maps'

/** Uma fase: mapa, boss e quantos lacaios começam junto. */
export interface LevelConfig {
  map: LevelMap
  /** Frase curta que explica a novidade da fase. */
  description: string
  boss: EnemyOptions
  /** Lacaios que nascem no começo da fase. */
  minions: number
}

/** Aceleração usada por todos os bosses: 12% mais rápido a cada 10s, até 0,14s por casa. */
const SPEED_UP = { every: 10, factor: 0.88, minStepDuration: 0.14 }

/** Teletransporte dos bosses das fases 2 e 3: a cada 6s, para pelo menos 6 casas do jogador. */
const TELEPORT = { every: 6, minDistance: 6 }

/** Lacaio comum: 1 golpe, sem habilidades. Também é o que o botão "Adicionar vilão" cria. */
export const MINION: EnemyOptions = {
  character: 0,
  stepDuration: 0.32,
  hp: 1,
  isBoss: false,
  abilities: {},
}

/** As fases, na ordem. Cada boss soma uma habilidade à anterior. */
export const LEVELS: readonly LevelConfig[] = [
  {
    map: MAPS[0]!,
    description: 'O boss fica mais rápido a cada 10 segundos.',
    boss: { character: 4, stepDuration: 0.3, hp: 4, isBoss: true, abilities: { speedUp: SPEED_UP } },
    minions: 0,
  },
  {
    map: MAPS[1]!,
    description: 'Agora ele também some e reaparece em outro lugar.',
    boss: { character: 5, stepDuration: 0.3, hp: 5, isBoss: true, abilities: { speedUp: SPEED_UP, teleport: TELEPORT } },
    minions: 1,
  },
  {
    map: MAPS[2]!,
    description: 'E agora atravessa paredes.',
    boss: {
      character: 7, stepDuration: 0.3, hp: 6, isBoss: true,
      abilities: { speedUp: SPEED_UP, teleport: TELEPORT, ghost: true },
    },
    minions: 2,
  },
]
