export class Background {

    context: CanvasRenderingContext2D;

    constructor(context: CanvasRenderingContext2D) {
        this.context = context;
    }

    repeat(offscreenCanvas: any) {
        const pattern = this.context.createPattern(offscreenCanvas, 'repeat');
        this.context.fillStyle = pattern;
        this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
    }


    render() {

    }

}