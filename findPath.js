/**
 * Encontra o menor caminho entre duas casas usando A* (sem diagonais).
 * @param {number[][]} world Grid indexado como world[y][x]; 0 = livre, maior que 0 = bloqueado.
 * @param {[number, number]} pathStart Casa de origem, como [x, y].
 * @param {[number, number]} pathEnd Casa de destino, como [x, y].
 * @returns {Array<[number, number]>} Casas do caminho, da origem ao destino (inclusive),
 *   como [x, y]. Vazio se não houver caminho.
 */
function findPath(world, pathStart, pathEnd) {
    // shortcuts for speed
    var abs = Math.abs;
    var max = Math.max;
    var pow = Math.pow;
    var sqrt = Math.sqrt;

    // the world data are integers:
    // anything higher than this number is considered blocked
    // this is handy is you use numbered sprites, more than one
    // of which is walkable road, grass, mud, etc
    var maxWalkableTileNum = 0;

    // keep track of the world dimensions
    var worldWidth = world[0].length;
    var worldHeight = world.length;
    var worldSize = worldWidth * worldHeight;

    // which heuristic should we use?
    // default: no diagonals (Manhattan)
    var distanceFunction = ManhattanDistance;
    var findNeighbours = function () { }; // empty

    /*
 
    // alternate heuristics, depending on your game:
 
    // diagonals allowed but no sqeezing through cracks:
    var distanceFunction = DiagonalDistance;
    var findNeighbours = DiagonalNeighbours;
 
    // diagonals and squeezing through cracks allowed:
    var distanceFunction = DiagonalDistance;
    var findNeighbours = DiagonalNeighboursFree;
 
    // euclidean but no squeezing through cracks:
    var distanceFunction = EuclideanDistance;
    var findNeighbours = DiagonalNeighbours;
  */


    // euclidean and squeezing through cracks allowed:
    // var distanceFunction = EuclideanDistance;
    // var findNeighbours = DiagonalNeighboursFree;
 
   

    // distanceFunction functions
    // these return how far away a point is to another

    /**
     * Distância Manhattan: só movimentos nas 4 direções.
     * @param {{x: number, y: number}} Point
     * @param {{x: number, y: number}} Goal
     * @returns {number}
     */
    function ManhattanDistance(Point, Goal) {
        return abs(Point.x - Goal.x) + abs(Point.y - Goal.y);
    }

    /**
     * Distância com diagonais custando o mesmo que movimentos retos.
     * @param {{x: number, y: number}} Point
     * @param {{x: number, y: number}} Goal
     * @returns {number}
     */
    function DiagonalDistance(Point, Goal) {
        return max(abs(Point.x - Goal.x), abs(Point.y - Goal.y));
    }

    /**
     * Distância euclidiana: diagonais custam um pouco mais que movimentos retos.
     * @param {{x: number, y: number}} Point
     * @param {{x: number, y: number}} Goal
     * @returns {number}
     */
    function EuclideanDistance(Point, Goal) {
        return sqrt(pow(Point.x - Goal.x, 2) + pow(Point.y - Goal.y, 2));
    }

    // Neighbours functions, used by findNeighbours function
    // to locate adjacent available cells that aren't blocked

    /**
     * Vizinhos livres ao norte, sul, leste e oeste, mais os diagonais
     * que `findNeighbours` acrescentar.
     * @param {number} x
     * @param {number} y
     * @returns {Array<{x: number, y: number}>}
     */
    function Neighbours(x, y) {
        var N = y - 1,
            S = y + 1,
            E = x + 1,
            W = x - 1,
            myN = N > -1 && canWalkHere(x, N),
            myS = S < worldHeight && canWalkHere(x, S),
            myE = E < worldWidth && canWalkHere(E, y),
            myW = W > -1 && canWalkHere(W, y),
            result = [];
        if (myN)
            result.push({ x: x, y: N });
        if (myE)
            result.push({ x: E, y: y });
        if (myS)
            result.push({ x: x, y: S });
        if (myW)
            result.push({ x: W, y: y });
        findNeighbours(myN, myS, myE, myW, N, S, E, W, result);
        return result;
    }

    /**
     * Acrescenta a `result` os vizinhos diagonais livres, sem passar
     * espremido entre duas paredes em quina.
     * @param {boolean} myN Norte livre.
     * @param {boolean} myS Sul livre.
     * @param {boolean} myE Leste livre.
     * @param {boolean} myW Oeste livre.
     * @param {number} N Linha ao norte.
     * @param {number} S Linha ao sul.
     * @param {number} E Coluna a leste.
     * @param {number} W Coluna a oeste.
     * @param {Array<{x: number, y: number}>} result Lista que recebe os vizinhos.
     */
    function DiagonalNeighbours(myN, myS, myE, myW, N, S, E, W, result) {
        if (myN) {
            if (myE && canWalkHere(E, N))
                result.push({ x: E, y: N });
            if (myW && canWalkHere(W, N))
                result.push({ x: W, y: N });
        }
        if (myS) {
            if (myE && canWalkHere(E, S))
                result.push({ x: E, y: S });
            if (myW && canWalkHere(W, S))
                result.push({ x: W, y: S });
        }
    }

    /**
     * Acrescenta a `result` os vizinhos diagonais livres, permitindo passar
     * espremido entre duas paredes em quina.
     * @param {boolean} myN Ignorado; recalculado pelos limites do grid.
     * @param {boolean} myS Ignorado; recalculado pelos limites do grid.
     * @param {boolean} myE Ignorado; recalculado pelos limites do grid.
     * @param {boolean} myW Ignorado; recalculado pelos limites do grid.
     * @param {number} N Linha ao norte.
     * @param {number} S Linha ao sul.
     * @param {number} E Coluna a leste.
     * @param {number} W Coluna a oeste.
     * @param {Array<{x: number, y: number}>} result Lista que recebe os vizinhos.
     */
    function DiagonalNeighboursFree(myN, myS, myE, myW, N, S, E, W, result) {
        myN = N > -1;
        myS = S < worldHeight;
        myE = E < worldWidth;
        myW = W > -1;
        if (myE) {
            if (myN && canWalkHere(E, N))
                result.push({ x: E, y: N });
            if (myS && canWalkHere(E, S))
                result.push({ x: E, y: S });
        }
        if (myW) {
            if (myN && canWalkHere(W, N))
                result.push({ x: W, y: N });
            if (myS && canWalkHere(W, S))
                result.push({ x: W, y: S });
        }
    }

    /**
     * Indica se a casa existe no grid e está livre.
     * @param {number} x Coluna.
     * @param {number} y Linha.
     * @returns {boolean}
     */
    function canWalkHere(x, y) {
        return ((world[y] != null) &&
            (world[y][x] != null) &&
            (world[y][x] <= maxWalkableTileNum));
    };

    /**
     * Cria um nó do A*.
     * @param {Object|null} Parent Nó anterior no caminho.
     * @param {{x: number, y: number}} Point Casa do nó.
     * @returns {{Parent: Object|null, value: number, x: number, y: number, f: number, g: number}}
     *   `value` é o índice linear da casa; `g` o custo desde a origem; `f` o custo estimado total.
     */
    function Node(Parent, Point) {
        var newNode = {
            // pointer to another Node object
            Parent: Parent,
            // array index of this Node in the world linear array
            value: Point.x + (Point.y * worldWidth),
            // the location coordinates of this Node
            x: Point.x,
            y: Point.y,
            // the heuristic estimated cost
            // of an entire path using this node
            f: 0,
            // the distanceFunction cost to get
            // from the starting point to this node
            g: 0
        };

        return newNode;
    }

    /**
     * Executa o A* de `pathStart` até `pathEnd`.
     * @returns {Array<[number, number]>} Caminho como [x, y], ou vazio se não houver.
     */
    function calculatePath() {
        // create Nodes from the Start and End x,y coordinates
        var mypathStart = Node(null, { x: pathStart[0], y: pathStart[1] });
        var mypathEnd = Node(null, { x: pathEnd[0], y: pathEnd[1] });
        // create an array that will contain all world cells
        var AStar = new Array(worldSize);
        // list of currently open Nodes
        var Open = [mypathStart];
        // list of closed Nodes
        var Closed = [];
        // list of the final output array
        var result = [];
        // reference to a Node (that is nearby)
        var myNeighbours;
        // reference to a Node (that we are considering now)
        var myNode;
        // reference to a Node (that starts a path in question)
        var myPath;
        // temp integer variables used in the calculations
        var length, max, min, i, j;
        // iterate through the open list until none are left
        while (length = Open.length) {
            max = worldSize;
            min = -1;
            for (i = 0; i < length; i++) {
                if (Open[i].f < max) {
                    max = Open[i].f;
                    min = i;
                }
            }
            // grab the next node and remove it from Open array
            myNode = Open.splice(min, 1)[0];
            // is it the destination node?
            if (myNode.value === mypathEnd.value) {
                myPath = Closed[Closed.push(myNode) - 1];
                do {
                    result.push([myPath.x, myPath.y]);
                }
                while (myPath = myPath.Parent);
                // clear the working arrays
                AStar = Closed = Open = [];
                // we want to return start to finish
                result.reverse();
            }
            else // not the destination
            {
                // find which nearby nodes are walkable
                myNeighbours = Neighbours(myNode.x, myNode.y);
                // test each one that hasn't been tried already
                for (i = 0, j = myNeighbours.length; i < j; i++) {
                    myPath = Node(myNode, myNeighbours[i]);
                    if (!AStar[myPath.value]) {
                        // estimated cost of this particular route so far
                        myPath.g = myNode.g + distanceFunction(myNeighbours[i], myNode);
                        // estimated cost of entire guessed route to the destination
                        myPath.f = myPath.g + distanceFunction(myNeighbours[i], mypathEnd);
                        // remember this new path for testing above
                        Open.push(myPath);
                        // mark this node in the world graph as visited
                        AStar[myPath.value] = true;
                    }
                }
                // remember this route as having no more untested options
                Closed.push(myNode);
            }
        } // keep iterating until the Open list is empty
        return result;
    }

    // actually calculate the a-star path!
    // this returns an array of coordinates
    // that is empty if no path is possible
    return calculatePath();

} // end of findPath() function

