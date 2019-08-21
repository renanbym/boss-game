import { Personagem } from './Personagem';

export class Animation {

    context: CanvasRenderingContext2D;
    sprites: Array<Personagem> = [];

    constructor(context: CanvasRenderingContext2D) {
        this.context = context;
    }

    newSprite(sprite: any) {
        this.sprites.push(sprite);
    }

    render() {
        this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height);

        for (const sprite of this.sprites) {
            sprite.render();
        }

    }

}
