
export class Personagem {

    context: CanvasRenderingContext2D;
    x: number = 0;
    y: number = 0;
    velocidade = 1;
    andando: boolean = false;
    direcao: number;
    imagem: HTMLImageElement;
    linha: number = 0;
    coluna: number = 0;
    ultimoTempo: number;
    largura: number;
    altura: number;
    numLinhas: number;
    numColunas: number;
    DIREITA: number = 1;
    ESQUERDA: number = 2;
    CIMA: number = 3;
    BAIXO: number = 4;
    intervalo: number = 0;

    constructor(context: CanvasRenderingContext2D, imageSrc: string, velocidade: number, linhas: number, colunas: number, largura: number, altura: number) {
        let sprite = new Image();
        sprite.src = imageSrc;

        this.imagem = sprite;

        this.context = context;
        this.x = 0;
        this.y = 0;
        this.velocidade = velocidade;

        this.andando = false;
        this.direcao = this.DIREITA;

        this.numLinhas = linhas;
        this.numColunas = colunas;
        this.linha = 0;
        this.coluna = 0;
        this.largura = largura;
        this.altura = altura;

    }

    nextFrame() {
        let agora = new Date().getTime();

        // Se ainda não tem último tempo medido
        if (!this.ultimoTempo) this.ultimoTempo = agora;

        // Já é hora de mudar de coluna?
        if (agora - this.ultimoTempo < this.intervalo) return;

        if (this.coluna < this.numColunas - 1)
            this.coluna++;
        else
            this.coluna = 0;


        // Guardar hora da última mudança
        this.ultimoTempo = agora;
    }

    render() {
        this.context.drawImage(this.imagem, this.largura * this.coluna, this.altura * this.linha, this.largura, this.altura, this.x, this.y, this.largura, this.altura);
    }


}

