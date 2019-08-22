class Personagem {

    SETA_ESQUERDA = 37;
    SETA_CIMA = 38;
    SETA_DIREITA = 39;
    SETA_BAIXO = 40;
    ESPACO = 32;

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
    intervalo = 0
    villain = false
    walkingTo
    PIXEL

    constructor() {
        this.params(arguments[0])

        if (this.villain && this.walkingTo) this.walking();
    }

    params = ({ x, y, width, height, context, image, velocity, villain, walkingTo, PIXEL }) => {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.context = context
        this.image = image
        this.velocity = velocity
        this.villain = villain
        this.walkingTo = walkingTo
        this.PIXEL = PIXEL
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

    walking() {
        const pathStart = [this.x / this.PIXEL, this.y / this.PIXEL]
        const pathEnd = [this.walkingTo.x / this.PIXEL, this.walkingTo.y / this.PIXEL]

        const currentPath = findPath(WORLD_INVERT, pathStart, pathEnd)

        if (currentPath[1]) {

            if (currentPath[1][1] != pathStart[1]) {
                if (pathStart[1] > currentPath[1][1]) {
                    this.lastPosition = this.SETA_CIMA;
                }

                if (currentPath[1][1] > pathStart[1]) {
                    this.lastPosition = this.SETA_BAIXO;
                }
            }

            if (currentPath[1][0] != pathStart[0]) {

                if (pathStart[0] > currentPath[1][0]) {
                    this.lastPosition = this.SETA_ESQUERDA;
                }

                if (currentPath[1][0] > pathStart[0]) {
                    this.lastPosition = this.SETA_DIREITA;
                }
            }

            this.x = currentPath[1][0] * this.PIXEL
            this.y = currentPath[1][1] * this.PIXEL

            this.nextFrame()
     
            setTimeout(() => {
                this.walking.call(this)
            }, this.velocity * 10)
        } else {
            this.walkingTo.live = false
        }

    }

}