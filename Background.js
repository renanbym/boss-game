/**
 * Fundo do mapa: desenha o chão e as paredes uma vez num canvas fora da tela
 * e copia esse canvas para o canvas principal a cada frame.
 */
class Background {

    canvasBG
    contextBG
    images
    MAP
    context
    canvas

    /**
     * @param {Object} options
     * @param {string[]} options.images Caminhos das spritesheets: [0] chão, [1] paredes.
     * @param {number[][]} options.MAP Mapa indexado como MAP[y][x] (1 = parede).
     * @param {CanvasRenderingContext2D} options.context Contexto do canvas principal.
     * @param {HTMLCanvasElement} options.canvas Canvas principal.
     * @param {number} options.PIXEL Tamanho de cada casa do grid, em pixels.
     */
    constructor() {

        this.params(arguments[0])

        this.canvasBG = document.createElement('canvas')
        this.contextBG = this.canvasBG.getContext('2d')
        this.canvasBG.width = this.canvas.width
        this.canvasBG.height = this.canvas.height

    }

    /**
     * Carrega as imagens e desenha chão e paredes no canvas fora da tela.
     */
    init() {

        this.loadImg().then((spritesheet) => {

            for (let eixoY = 0; eixoY < this.MAP.length; eixoY++) {
                for (let eixoX = 0; eixoX < this.MAP[0].length; eixoX++) {

                    const [gridY, gridX, type] = [eixoY * this.PIXEL, eixoX * this.PIXEL, this.MAP[eixoY][eixoX]]

                    this.contextBG.drawImage(spritesheet[0].img, 0 * 48, 1 * 48, 48, 48, gridX, gridY, this.PIXEL, this.PIXEL)
                    // this.contextBG.drawImage(spritesheet[0].img, 4 * 48, 6 * 48, 48, 48, gridX, gridY, this.PIXEL, this.PIXEL)
                    // if (Math.random() > 0.85) this.contextBG.drawImage(spritesheet[0].img, 4 * 48, 13 * 48, 48, 48, gridX, gridY, this.PIXEL, this.PIXEL)

                    if (type == '1') {

                        if (spritesheet[1]) {
                            if (Math.random() < 0.30) {
                                this.contextBG.drawImage(spritesheet[1].img, 9 * 48, 2 * 48, 48, 48, gridX, gridY, this.PIXEL, this.PIXEL)
                            } else if ((Math.random() > 0.40)) {
                                this.contextBG.drawImage(spritesheet[1].img, 9 * 48, 2 * 48, 48, 48, gridX, gridY, this.PIXEL, this.PIXEL)
                            } else {
                                this.contextBG.drawImage(spritesheet[1].img, 10 * 48, 2 * 48, 48, 48, gridX, gridY, this.PIXEL, this.PIXEL)
                            }
                        }

                    }

                }
            }

        });
    }

    /**
     * Copia as opções do construtor para a instância e inicia o carregamento.
     * @param {Object} options Mesmas opções aceitas pelo construtor.
     */
    params = ({ images, MAP, context, canvas, PIXEL }) => {
        this.images = images
        this.MAP = MAP
        this.context = context
        this.canvas = canvas
        this.PIXEL = PIXEL

        this.init();
    }

    /**
     * Limpa o canvas principal e desenha o fundo pronto.
     */
    render = () => {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.canvasBG, 0, 0)
    }


    /**
     * Carrega todas as imagens de `images`. Uma imagem com erro não rejeita a promise.
     * @returns {Promise<Array<{path: string, img: HTMLImageElement, status: 'ok'|'error'}>>}
     */
    loadImg = () => {
        'use strict';
        const paths = this.images;
        const promise = [];
        paths.forEach((path) => {
            promise.push(new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve({ path, img, status: 'ok' });
                img.onerror = () => resolve({ path, img, status: 'error' });
                img.src = path;
            }));
        });
        return Promise.all(promise);
    };

}