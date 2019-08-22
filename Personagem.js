class Personagem {

    x
    y
    width
    height
    context
    image
    line = 0
    column = 0
    velocity
    lastTime = new Date().getTime();

    constructor() {

        this.params(arguments[0])
    }

    params = ({ x, y, width, height, context, image, velocity }) => {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.context = context
        this.image = image
        this.velocity = velocity
    }

    nextFrame = () => {
        const now = new Date().getTime();

        if (this.lastPosition == this.SETA_BAIXO) {
            this.line = 0
        }

        if (this.lastPosition == this.SETA_CIMA) {
            this.line = 3
        }

        if (this.lastPosition == this.SETA_DIREITA) {
            this.line = 2
        }

        if (this.lastPosition == this.SETA_ESQUERDA) {
            this.line = 1
        }

        if (!this.lastTime) this.lastTime = now;

        if (now - this.lastTime < this.intervalo) return;

        this.column = this.column >= 2 ? 0 : ++this.column;

        this.lastTime = now;
    }

    render = () => {
        this.context.drawImage(this.image, this.column * 49, this.line * 48, 49, 48, this.x, this.y, this.width, this.height)
    }

    explode = () => {

    }

    fire = () => {

    }

}