# Boss Game

Jogo em canvas: ande pelo labirinto e fuja dos vilões que te perseguem.

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
- **Enter**: começar / jogar de novo
- **P**: pausar
- **Adicionar vilão** (botão): coloca mais um vilão no mapa

## Estrutura

```
src/
  main.ts              carrega imagens e monta o jogo
  core/Game.ts         loop com delta time e estados (menu, jogando, pausado, game over)
  core/Input.ts        estado do teclado
  core/assets.ts       carregamento das imagens
  entities/Entity.ts   personagem que anda casa a casa com movimento suave
  entities/Player.ts   personagem controlado pelo teclado
  entities/Boss.ts     vilão que persegue o jogador
  world/TileMap.ts     mapa: colisão e desenho do cenário
  world/Pathfinding.ts A* no grid
  world/maps.ts        dados dos mapas
public/                imagens e sons servidos como estão
```

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
* [ ] Class de Spreadsheet
* [x] Class de Teclado

### Boss

* [ ] 1 - A cada 10 segundos ele anda mais rapido
* [ ] 2 - 1 + Some e aparece em lugares diferentes
* [ ] 3 - 2 + Atravessa parede

### Mapas
* [ ] 1
* [ ] 2
* [ ] 3


### V1

* [x] Revisar codigo
* [x] Clean code
