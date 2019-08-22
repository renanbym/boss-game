function Teclado(PIXEL, WALLS, FN) {
    this.SETA_ESQUERDA = 37;
    this.SETA_CIMA = 38;
    this.SETA_DIREITA = 39;
    this.SETA_BAIXO = 40;
    this.ESPACO = 32;
    this.PIXEL = PIXEL;
    this.WALLS = WALLS;
    this.FN = FN;

    this.checkWall = (nextX, nextY) => {
        const find = this.WALLS.find(wall => wall[0] == nextX / this.PIXEL && wall[1] == nextY / this.PIXEL)
        if (find) return false
        return true
    }

    document.addEventListener('keydown', (event) => {

        if (event.keyCode == this.SETA_BAIXO) {

            const next = this.y + this.velocity
            if (this.checkWall(this.x, next)) {
                this.lastPosition = this.SETA_BAIXO;
                this.y = next > (canvas.height - this.height) ? (canvas.height - this.height) : next;

                this.nextFrame();
                this.render()
                this.FN()
            }
        }

        if (event.keyCode == this.SETA_CIMA) {

            const next = this.y - this.velocity
            if (this.checkWall(this.x, next)) {
                this.lastPosition = this.SETA_CIMA;
                this.y = next <= 0 ? 0 : next;

                this.nextFrame();
                this.render()
                this.FN()

            }
        }

        if (event.keyCode == this.SETA_DIREITA) {
            const next = this.x + this.velocity
            if (this.checkWall(next, this.y)) {
                this.lastPosition = this.SETA_DIREITA;
                this.x = next > (canvas.height - this.width) ? (canvas.width - this.width) : next;

                this.nextFrame();
                this.render()
                this.FN()

            }
        }

        if (event.keyCode == this.SETA_ESQUERDA) {
            const next = this.x - this.velocity
            if (this.checkWall(next, this.y)) {
                this.lastPosition = this.SETA_ESQUERDA;
                this.x = next <= 0 ? 0 : next;

                this.nextFrame();
                this.render()
                this.FN()

            }
        }

        if (event.keyCode == this.ESPACO) {

        }
    })
}