# Boss Game

Jogo em canvas: atravesse 3 fases e derrote o boss de cada uma. A cada fase o boss ganha uma habilidade nova.

| Fase | Mapa | Boss |
|---|---|---|
| 1 | Labirinto | Fica mais rápido a cada 10 segundos |
| 2 | Ruínas | + Some e reaparece longe de você a cada 6 segundos |
| 3 | Arena | + Atravessa paredes |

Você tem 3 vidas para o jogo todo. Ao ser pego, perde uma, fica invulnerável por 2 segundos e quem te pegou é jogado para longe.

## Como rodar

Precisa do Node.js 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Checa os tipos e gera o build em `dist/` |
| `npm run preview` | Serve o build de `dist/` |
| `npm run typecheck` | Só checa os tipos |

## Controles

- **Setas ou WASD**: andar
- **Espaço**: atacar a casa à frente (o inimigo atingido fica atordoado e é empurrado)
- **Enter**: começar / avançar / jogar de novo
- **P**: pausar
- **Adicionar vilão** (botão): coloca mais um lacaio no mapa

## Estrutura

```
src/
  main.ts              carrega imagens e monta o jogo
  core/Game.ts         loop com delta time, estados e progressão das fases
  core/levels.ts       configuração das fases (mapa, boss, lacaios)
  core/Input.ts        estado do teclado
  core/assets.ts       carregamento de imagens e sons
  entities/Entity.ts   personagem que anda casa a casa com movimento suave
  entities/Player.ts   jogador: vidas, ataque, invulnerabilidade
  entities/Enemy.ts    boss e lacaios: perseguição e habilidades
  effects/SpriteEffect.ts  animações de golpe, explosão e teletransporte
  world/TileMap.ts     mapa: colisão, regiões e desenho do cenário
  world/Pathfinding.ts A* no grid
  world/maps.ts        leitura e validação dos mapas
  world/maps/*.json    os mapas
public/                imagens e sons servidos como estão
```

## Editando os mapas

Cada mapa em `src/world/maps/` é uma lista de linhas, uma string por linha: `#` é parede e `.` é chão. Todas as linhas precisam ter o mesmo tamanho; o jogo avisa na tela se algo estiver errado. Ninguém nasce em pedaços de chão isolados do resto do mapa.

## Progresso

### Steps

* [x] Personagem
* [x] Vilões
* [x] Explosão
* [x] Background
* [x] Vilão correr atras do personagem
* [x] Colisão Paredes
* [x] Colisão Personagem
* [x] Colisão Vilões

### Clean

* [x] Class de Personagens
* [x] Class de Background
* [x] Class de Spreadsheet
* [x] Class de Teclado

### Boss

* [x] 1 - A cada 10 segundos ele anda mais rapido
* [x] 2 - 1 + Some e aparece em lugares diferentes
* [x] 3 - 2 + Atravessa parede

### Mapas
* [x] 1
* [x] 2
* [x] 3


### V1

* [x] Revisar codigo
* [x] Clean code
