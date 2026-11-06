# Boss Game

Jogo em canvas: atravesse 3 fases e derrote o boss de cada uma. A cada fase o boss ganha uma habilidade nova.

| Fase | Mapa      | Boss                                               |
| ---- | --------- | -------------------------------------------------- |
| 1    | Labirinto | Fica mais rápido a cada 10 segundos                |
| 2    | Ruínas    | + Some e reaparece longe de você a cada 6 segundos |
| 3    | Arena     | + Atravessa paredes                                |

Você tem 3 vidas para o jogo todo. Ao ser pego, perde uma, fica invulnerável por 2 segundos e quem te pegou é jogado para longe.

**O boss só leva dano quando pisca.** A cada 10 segundos ele fica vulnerável por 3 segundos (aos 10s, 20s, 30s…). Fora dessa janela o poder é bloqueado. A barra do boss mostra quanto falta para abrir ou fechar. Os lacaios levam dano a qualquer momento.

## Como rodar

Precisa do Node.js 22.12 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:5173.

| Script               | O que faz                                               |
| -------------------- | ------------------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento com recarga automática      |
| `npm run build`      | Checa os tipos e gera o build em `dist/`                |
| `npm run preview`    | Serve o build de `dist/`                                |
| `npm test`           | Roda os testes (Vitest) uma vez                         |
| `npm run test:watch` | Roda os testes a cada alteração                         |
| `npm run lint`       | ESLint, incluindo a regra de JSDoc em toda função       |
| `npm run format`     | Formata o código com o Prettier                         |
| `npm run check`      | Tipos, lint, formatação e testes: o mesmo que o CI roda |

## Qualidade e deploy

- **Testes** ficam ao lado do código (`*.test.ts`) e cobrem a lógica sem desenho: pathfinding, mapas, grid, movimento, jogador, inimigos e teclado. O desenho no canvas e o `Game` não têm testes automáticos.
- **Toda função, método e classe precisa de JSDoc**: o `npm run lint` falha se faltar.
- **CI** (`.github/workflows/ci.yml`): em todo push e pull request roda o `npm run check` e o build. Em push no `master`, publica o jogo no GitHub Pages. Para isso funcionar, ative uma vez em _Settings > Pages > Source: GitHub Actions_.

## Controles

- **Setas ou WASD**: andar
- **Espaço**: lançar o poder. Ele sai da mão do personagem, voa em linha reta na direção em que você está olhando e alcança no máximo 3 casas. Para no primeiro inimigo ou parede; o inimigo atingido fica atordoado e é empurrado
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
  entities/Player.ts   jogador: vidas, lançar o poder, invulnerabilidade
  entities/Projectile.ts  o poder: voo em linha reta, alcance e colisão
  entities/Enemy.ts    boss e lacaios: perseguição, habilidades e janela de vulnerabilidade
  effects/SpriteEffect.ts  animações de golpe, explosão e teletransporte
  world/Grid.ts        lógica do mapa: colisão, regiões e sorteio de casas
  world/TileMap.ts     Grid + desenho do cenário
  world/Pathfinding.ts A* no grid
  world/maps.ts        leitura e validação dos mapas
  world/maps/*.json    os mapas
public/                imagens e sons servidos como estão
```

## Editando os mapas

Cada mapa em `src/world/maps/` é uma lista de linhas, uma string por linha: `#` é parede e `.` é chão. Todas as linhas precisam ter o mesmo tamanho; o jogo avisa na tela se algo estiver errado. Ninguém nasce em pedaços de chão isolados do resto do mapa.

## Progresso

### Steps

- [x] Personagem
- [x] Vilões
- [x] Explosão
- [x] Background
- [x] Vilão correr atras do personagem
- [x] Colisão Paredes
- [x] Colisão Personagem
- [x] Colisão Vilões

### Clean

- [x] Class de Personagens
- [x] Class de Background
- [x] Class de Spreadsheet
- [x] Class de Teclado

### Boss

- [x] 1 - A cada 10 segundos ele anda mais rapido
- [x] 2 - 1 + Some e aparece em lugares diferentes
- [x] 3 - 2 + Atravessa parede

### Mapas

- [x] 1
- [x] 2
- [x] 3

### V1

- [x] Revisar codigo
- [x] Clean code
