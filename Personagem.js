class Personagem {

    x
    y
    width
    height
    context
    image
    line = 0
    column = 0

    constructor() {

        this.params(arguments[0]);
    }

    params = ({ x, y, width, height, context, image }) => {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.context = context
        this.image = image
    }

    render = () => {

        this.context.drawImage(this.image, this.line * 45, this.column * 45, 45, 45, this.x, this.y, this.width, this.height);
    }

    explode = () => {

    }

    fire = () => {

    }

}