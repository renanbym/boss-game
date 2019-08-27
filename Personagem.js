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
    walkingFn
    walkWORLDingFn
    live = true

    constructor() {
        this.params(arguments[0])


        if (this.villain && this.walkingTo && this.walkingTo.live) this.walking();
    }


    randomXY = () => {
        const randY = Math.floor(Math.random() * this.WORLD.length);
        const randX = Math.floor(Math.random() * this.WORLD[randY].length);

        if (this.WORLD[randY][randX] == 0) {
            return { x: randX, y: randY }
        } else {
            return this.randomXY()
        }
    }

    checkXY = (x, y) => {
        if (!x || !y) return this.randomXY()

        if (this.WORLD[y][x] == 0) {
            return { x, y }
        } else {
            return this.randomXY()
        }
    }

    params = ({ x, y, width, height, context, image, velocity, villain, walkingTo, WORLD, walkingFn }) => {

        this.width = width
        this.height = height
        this.context = context
        this.velocity = velocity
        this.villain = villain
        this.walkingTo = walkingTo
        this.WORLD = WORLD
        this.walkingFn = walkingFn

        const xy = this.checkXY(x, y)

        this.x = xy.x
        this.y = xy.y

        this.image = new Image()
        this.image.src = image
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
        if (this.live) {
            this.context.drawImage(this.image, this.column * 49, this.line * 48, 49, 48, this.x * PIXEL, this.y * PIXEL, this.width, this.height)
        }
    }

    explode = () => {

    }

    fire = () => {
    }

    die = (callback) => {
        this.live = false
        // callback()
    }

    destroy = () => {

    }

    walking = () => {
        const pathStart = [Math.round(this.x), Math.round(this.y)]
        const pathEnd = [Math.round(this.walkingTo.x), Math.round(this.walkingTo.y)]

        const currentPath = findPath(this.WORLD, pathStart, pathEnd)
        if (currentPath[2] && this.live && this.walkingTo.live) {

            if (currentPath[1][1] != pathStart[1]) {
                if (pathStart[1] > currentPath[1][1]) {
                    this.lastPosition = this.SETA_CIMA
                }

                if (currentPath[1][1] > pathStart[1]) {
                    this.lastPosition = this.SETA_BAIXO
                }
            }

            if (currentPath[1][0] != pathStart[0]) {

                if (pathStart[0] > currentPath[1][0]) {
                    this.lastPosition = this.SETA_ESQUERDA
                }

                if (currentPath[1][0] > pathStart[0]) {
                    this.lastPosition = this.SETA_DIREITA
                }
            }

            this.x = currentPath[1][0]
            this.y = currentPath[1][1]

            this.nextFrame()
            setTimeout(() => { this.walking.call(this) }, this.velocity)
        } else {
            this.walkingTo.live = false
        }

    }

}