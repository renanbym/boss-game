/**
 * Liga as setas do teclado a um personagem, com colisão contra paredes e bordas do canvas.
 * Deve ser chamada com o personagem como `this`: `Teclado.call(personagem, WALLS, PIXEL)`.
 * @this {Personagem}
 * @param {Array<[number, number]>} WALLS Lista de casas bloqueadas, como [x, y].
 * @param {number} PIXEL Tamanho de cada casa do grid, em pixels.
 */
function Teclado(WALLS, PIXEL) {
    this.SETA_ESQUERDA = 37;
    this.SETA_CIMA = 38;
    this.SETA_DIREITA = 39;
    this.SETA_BAIXO = 40;
    this.ESPACO = 32;
    this.WALLS = WALLS;
    this.PIXEL = PIXEL;

    /**
     * Verifica se uma casa está livre de parede.
     * @param {number} nextX Coluna de destino.
     * @param {number} nextY Linha de destino.
     * @returns {boolean} true se o personagem pode entrar na casa.
     */
    this.checkWall = (nextX, nextY) => {
        const find = this.WALLS.find(wall => wall[0] == nextX && wall[1] == nextY)
        if (find) return false
        return true
    }

    document.addEventListener('keydown', (event) => {
        if (!this.live) return

        if (event.keyCode == this.SETA_BAIXO) {
            const next = this.y + 1
            if (this.checkWall(this.x, next)) {
                this.lastPosition = this.SETA_BAIXO;
                this.y = next >= (canvas.height / PIXEL) - 1 ? (canvas.height / PIXEL) - 1 : next;
                this.nextFrame();
            }
        }

        if (event.keyCode == this.SETA_CIMA) {

            const next = this.y - 1
            if (this.checkWall(this.x, next)) {
                this.lastPosition = this.SETA_CIMA;
                this.y = next <= 0 ? 0 : next;
                this.nextFrame();
            }
        }

        if (event.keyCode == this.SETA_DIREITA) {
            const next = this.x + 1
            if (this.checkWall(next, this.y)) {
                this.lastPosition = this.SETA_DIREITA;
                this.x = next >= (canvas.width / PIXEL) - 1 ? (canvas.width / PIXEL) - 1 : next;
                this.nextFrame();
            }
        }

        if (event.keyCode == this.SETA_ESQUERDA) {
            const next = this.x - 1
            if (this.checkWall(next, this.y)) {
                this.lastPosition = this.SETA_ESQUERDA;
                this.x = next <= 0 ? 0 : next;
                this.nextFrame();
            }
        }

        if (event.keyCode == this.ESPACO) {

        }
    })
}