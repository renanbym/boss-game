/**
 * Personagem desenhado no grid a partir de uma spritesheet 3x4
 * (3 colunas de animação, 4 linhas de direção).
 *
 * Serve tanto para o jogador quanto para vilões: quando `villain` e
 * `walkingTo` são informados, o personagem persegue o alvo usando A*.
 */
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
    live = true

    /**
     * @param {Object} options
     * @param {number} [options.x] Coluna inicial no grid. Se omitida ou bloqueada, é sorteada.
     * @param {number} [options.y] Linha inicial no grid. Se omitida ou bloqueada, é sorteada.
     * @param {number} options.width Largura de desenho, em pixels.
     * @param {number} options.height Altura de desenho, em pixels.
     * @param {CanvasRenderingContext2D} options.context Contexto onde o personagem é desenhado.
     * @param {string} options.image Caminho da spritesheet.
     * @param {number[][]} options.WORLD Grid de colisão indexado como WORLD[y][x] (0 = livre).
     * @param {number} options.PIXEL Tamanho de cada casa do grid, em pixels.
     * @param {number} [options.velocity] Intervalo entre passos do vilão, em ms.
     * @param {boolean} [options.villain] Se verdadeiro, persegue `walkingTo`.
     * @param {Personagem} [options.walkingTo] Alvo perseguido pelo vilão.
     * @param {Function} [options.walkingFn] Reservado para lógica de movimento customizada.
     */
    constructor() {
        this.params(arguments[0])

        if (this.villain && this.walkingTo && this.walkingTo.live) this.walking();
    }

    /**
     * Sorteia uma casa livre do grid.
     * @returns {{x: number, y: number}} Coordenadas de uma casa onde WORLD[y][x] == 0.
     */
    randomXY = () => {
        const randY = Math.floor(Math.random() * this.WORLD.length);
        const randX = Math.floor(Math.random() * this.WORLD[randY].length);

        if (this.WORLD[randY][randX] == 0) {
            return { x: randX, y: randY }
        } else {
            return this.randomXY()
        }
    }

    /**
     * Valida uma posição inicial; se ela não existir ou estiver bloqueada, sorteia outra.
     * @param {number} [x] Coluna desejada.
     * @param {number} [y] Linha desejada.
     * @returns {{x: number, y: number}} Posição livre a ser usada.
     */
    checkXY = (x, y) => {
        if (x == null || y == null) return this.randomXY()

        if (this.WORLD[y] && this.WORLD[y][x] == 0) {
            return { x, y }
        } else {
            return this.randomXY()
        }
    }

    /**
     * Copia as opções do construtor para a instância e carrega a spritesheet.
     * @param {Object} options Mesmas opções aceitas pelo construtor.
     */
    params = ({ x, y, width, height, context, image, velocity, villain, walkingTo, WORLD, walkingFn, PIXEL }) => {

        this.PIXEL = PIXEL
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

    /**
     * Avança a animação: escolhe a linha da spritesheet pela última direção
     * e passa para a próxima coluna, respeitando `intervalo`.
     */
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

    /**
     * Desenha o quadro atual na posição do grid, se o personagem estiver vivo.
     */
    render = () => {
        if (this.live) {
            this.context.drawImage(this.image, this.column * 49, this.line * 48, 49, 48, this.x * this.PIXEL, this.y * this.PIXEL, this.width, this.height)
        }
    }

    /** Reservado para a animação de explosão (Fase 3). */
    explode = () => {

    }

    /** Reservado para o ataque (Fase 3). */
    fire = () => {
    }

    /**
     * Marca o personagem como morto.
     * @param {Function} [callback] Reservado para efeitos de morte (som, animação).
     */
    die = (callback) => {
        this.live = false
        // callback()
    }

    /** Reservado para liberar recursos do personagem. */
    destroy = () => {

    }

    /**
     * Um passo da perseguição: calcula o caminho até `walkingTo` e anda uma casa.
     * Reagenda a si mesmo a cada `velocity` ms até alguém morrer.
     *
     * - Sem caminho até o alvo: espera e tenta de novo.
     * - Alvo na mesma casa ou adjacente: o alvo morre.
     */
    walking = () => {
        if (!this.live || !this.walkingTo.live) return

        const pathStart = [Math.round(this.x), Math.round(this.y)]
        const pathEnd = [Math.round(this.walkingTo.x), Math.round(this.walkingTo.y)]

        const currentPath = findPath(this.WORLD, pathStart, pathEnd)

        if (currentPath.length === 0) {
            setTimeout(this.walking, this.velocity)
            return
        }

        if (currentPath.length <= 2) {
            this.walkingTo.die()
            return
        }

        const [nextX, nextY] = currentPath[1]

        if (nextY < pathStart[1]) this.lastPosition = this.SETA_CIMA
        if (nextY > pathStart[1]) this.lastPosition = this.SETA_BAIXO
        if (nextX < pathStart[0]) this.lastPosition = this.SETA_ESQUERDA
        if (nextX > pathStart[0]) this.lastPosition = this.SETA_DIREITA

        this.x = nextX
        this.y = nextY

        this.nextFrame()
        setTimeout(this.walking, this.velocity)
    }

}
