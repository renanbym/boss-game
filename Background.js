class Background {

    canvasBG
    contextBG
    images
    MAP
    context
    canvas

    constructor() {

        this.params(arguments[0])

        this.canvasBG = document.createElement('canvas')
        this.contextBG = this.canvasBG.getContext('2d')
        this.canvasBG.width = this.canvas.width
        this.canvasBG.height = this.canvas.height

    }

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

    params = ({ images, MAP, context, canvas, PIXEL }) => {
        this.images = images
        this.MAP = MAP
        this.context = context
        this.canvas = canvas
        this.PIXEL = PIXEL

        this.init();
    }

    render = () => {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(this.canvasBG, 0, 0)
    }


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