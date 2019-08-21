
import { Personagem } from './Personagem'
import { Animation } from './Animation'
import { Background } from './Background'

const canvas: HTMLCanvasElement = (document.getElementById('container') as HTMLCanvasElement);
const context: CanvasRenderingContext2D = canvas.getContext('2d');

const images = ['./public/actor.png', './public/bg.png', './public/attack.png'];
let carregadas = 0;

const SETA_ESQUERDA: number = 37;
const SETA_CIMA: number = 38;
const SETA_DIREITA: number = 39;
const SETA_BAIXO: number = 40;
const ESPACO: number = 32;

const carregando = () => {
    ++carregadas;
    if (carregadas == images.length) iniciar()
}

for (const img of images) {
    const image = new Image();
    image.onload = carregando
    image.src = img;
}

let sinDragon: Personagem;
let offscreenCanvas: any;

const attackFn = (number: number, x: number, y: number) => {

    const xy = [[0, 0], [200, 0], [380, 0], [560, 0], [760, 0], [0, 200], [200, 200]];

    if (number >= xy.length) {
        number = 0;
        return;
    }

    const attack = new Image();
    attack.src = './public/attack.png';

    const attackCanvas = document.createElement('canvas');
    attackCanvas.width = 45;
    attackCanvas.height = 45;

    const attackCanvasCtx = attackCanvas.getContext('2d');
    attackCanvasCtx.clearRect(0, 0, 45, 45);

    attackCanvasCtx.translate(22, 22);
    attackCanvasCtx.rotate(-40 * Math.PI / 180);
    // attackCanvasCtx.translate(0, 0);

    attackCanvasCtx.drawImage(attack, xy[number][0], xy[number][1], 150, 150, 0, 0, 45, 45)

    bg();
    sinDragon.render()

    context.drawImage(attackCanvas, x, y);

    setTimeout(() => {
        ++number;
        attackFn(number, x, y);
    }, 100)

}

const iniciar = () => {

    sinDragon = new Personagem(context, './public/actor.png', 10, 4, 3, 49, 48);
    sinDragon.x = 200;
    sinDragon.y = 200;


    const bg = new Background(context);

    const image = new Image();
    image.src = './public/bg.png';
    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 45;
    offscreenCanvas.height = 45;
    const offscreenContext = offscreenCanvas.getContext('2d');
    offscreenContext.drawImage(image, 0, 290, 46, 46, 0, 0, 45, 45)
    bg.repeat(offscreenContext);


    const animation = new Animation(context);
    animation.newSprite(sinDragon);
    animation.newSprite(bg);

    animation.render();

}

const desenha = (x: number, y: number) => {
    sinDragon.nextFrame()
    sinDragon.render()
}


const elemento = document;
let ultimaPosicao: any = false;

elemento.addEventListener('keydown', (evento: KeyboardEvent) => {


    if (evento.keyCode == SETA_BAIXO) {
        ultimaPosicao = SETA_BAIXO;
        sinDragon.linha = 0;
        // sinDragon.coluna = 0;
        sinDragon.y += sinDragon.velocidade;  // E aqui é sinal de menos!
        desenha(0, sinDragon.y)
    }


    if (evento.keyCode == SETA_CIMA) {
        ultimaPosicao = SETA_CIMA;

        sinDragon.linha = 3;
        // sinDragon.coluna = 0;

        sinDragon.y -= sinDragon.velocidade;  // E aqui é sinal de menos!
        desenha(0, sinDragon.y)
    }

    if (evento.keyCode == SETA_DIREITA) {
        ultimaPosicao = SETA_DIREITA;

        sinDragon.linha = 2;
        // sinDragon.coluna = 0;

        sinDragon.x += sinDragon.velocidade;  // E aqui é sinal de menos!
        desenha(sinDragon.x, 0)
    }

    if (evento.keyCode == SETA_ESQUERDA) {
        ultimaPosicao = SETA_ESQUERDA;

        sinDragon.linha = 1;
        // sinDragon.coluna = 0;

        sinDragon.x -= sinDragon.velocidade;  // E aqui é sinal de menos!
        desenha(sinDragon.x, 0)
    }


    if (evento.keyCode == ESPACO) {

        if (ultimaPosicao == SETA_CIMA) {
            attackFn(0, sinDragon.x - 10, sinDragon.y - 20);
        } else {
            attackFn(0, sinDragon.x - 10, sinDragon.y + 15);
        }
    }



});
