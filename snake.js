//Creation of <game-over> shadowElement
class GameOver extends HTMLElement {
    constructor() {
        super();
        const template = document.getElementById('modelGameOver');
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
    static get observedAttributes() {
        return ['scoreValue'];
    }
    //getAttributes value to copy in the inner element #score
    connectedCallback() {
        if (this.hasAttribute('scoreValue')) {
            this.shadowRoot.querySelector("#score").innerHTML = this.getAttribute('scoreValue');
        }
    }
}
//Ajouter à la bibliothjèque des éléments
customElements.define('game-over', GameOver);
// --------------------------------------------------------------------MAIN PROGRAM----------------------------------------------------------------
//Global values
let eatScore = 50;
let boxSize = 15;
let defaultDirection = "up";
let snakeColor = "red";
let appelColor = "green";
//Canvas elements
let zoneJeu = document.querySelector('#zoneJeu');
let ctx = zoneJeu.getContext('2d');
//Canvas dimensions DON'T FORGET TO UPDATE HTML element canvas
let width = boxSize * 40;
let height = boxSize * 20;
//ToStop setInterval deplacement when game over
let intervalID = 0;
//Sound eatApple and gameOver
let audio = new Audio('son/bip.mp3');
audio.volume = 0.4;
let audio1 = new Audio('son/end.mp3');
audio1.volume = 0.4;
let start = document.getElementById('divStart');
start.addEventListener('click', launch);
//Class Game
//Snake, apple and possibleApplePosition
class Game {
    _snake;
    _apple;
    _appleLeft;
    _appleTop;
    _possibleApplePositions;
    _direction; //actual movement direction ['up','down','rigth','left']
    constructor(firstSnake, firstApple, defaultDirection) {
        this._snake = firstSnake;
        this._apple = firstApple;
        this._appleLeft = firstApple.getLeft();
        this._appleTop = firstApple.getTop();
        this._direction = defaultDirection;
        //2-dim number tab with the possible value for apple (all divJeu coordinates - [snake coordinates])
        //[[x0,y0],[x1,y1],......,[xn,yn]]
        this._possibleApplePositions = new Array();
        for (let i = 0; i < width; i += boxSize) {
            for (let j = 0; j < height; j += boxSize) {
                this._possibleApplePositions.push(new Array(i, j));
            }
        }
        //Remove the firstSnake box position
        this.removeCoord(firstSnake.getCoord());
    }
    //Direction Getter Setter
    setDirection(direction) {
        this._direction = direction;
    }
    getDirection() {
        return this._direction;
    }
    //delete the box from _possibleApplePositions by using its coordinates
    //function is used when the snake moves: the new box is created and its coordinates not available anymore
    removeCoord(coord) {
        for (let i = 0; i < this._possibleApplePositions.length; i++) {
            //Verify if the coordinates are in the tab _possibleApplePositions
            if (JSON.stringify(this._possibleApplePositions[i]) === JSON.stringify(coord)) {
                this._possibleApplePositions.splice(i, 1); //delete the coordinates
            }
        }
    }
    //General function that remove the last created Box in _snake and add the associated coordinates in _possibleApplePositions
    removeBox() {
        let lastBox = this._snake.getLastBox();
        this.addCoord(lastBox.getLeftTop());
        this._snake.removeBox();
    }
    //Add the box to tab _possibleApplePositions by using its coordinates
    //function is used when the snake moves: the last box is deleted and its coordinates available again
    addCoord(coord) {
        this._possibleApplePositions.push(coord);
    }
    //General function that add a newbox to _snake and remove the associated coordinates in _possibleApplePositions
    addBox(newBox) {
        this._snake.addBox(newBox);
        this.removeCoord(newBox.getCoord());
    }
    //Function that create a new _apple with random coordinates in _possibleApplePositions
    createRandomApple() {
        let randomPosition = Math.round(Math.random() * this._possibleApplePositions.length);
        let newApplePosition = this._possibleApplePositions[randomPosition];
        this._apple = new Box(boxSize, newApplePosition[0], newApplePosition[1], appelColor);
        this._appleLeft = newApplePosition[0];
        this._appleTop = newApplePosition[1];
    }
    //test if the snake is moving outside the canvas element on Y axis
    isBorderY(newY) {
        if (newY === -boxSize) { //up
            return (height - boxSize); //return bottom
        }
        else if (newY === height) { //down
            return 0; //return top
        }
        else {
            return newY; //is not moving outside
        }
    }
    //test if the snake is moving outside the canvas element on X axis
    isBorderX(newX) {
        if (newX === -boxSize) { //left
            return (width - boxSize); //return rigth
        }
        else if (newX === width) { //rigth
            return 0; //return left
        }
        else {
            return newX; //is not moving outside
        }
    }
    //Test is the snake is going to it himself
    isCollision() {
        //Get new head posistion
        let left = this._snake.getLeft();
        let top = this._snake.getTop();
        //Loop on the _snake Boxes
        for (let box of this._snake.getList()) {
            // console.log("Top new and existing: "+top+"  "+box.getTop());
            // console.log("Left new and existing: "+left+"  "+box.getTop());
            if (box.getLeft() === left && box.getTop() == top) { //If the new head position has the same coordinates than an existing Box
                return true;
            }
        }
        return false; //no collision
    }
    //General function launch by setIntervalle
    //Manage the _snake movement, the tests (collision, border and aplleEat events)
    deplacement() {
        //Change the coordinates according to the movement direction (include the border management)
        switch (this._direction) {
            case "up":
                //create new Y coordinate
                let newUp = this._snake.getTop() - boxSize;
                //test if it crosses the border and return the correct Y coordinate
                newUp = this.isBorderY(newUp);
                //Update the Y coordinate
                this._snake.setTop(newUp);
                break;
            case "down":
                let newDown = this._snake.getTop() + boxSize;
                newDown = this.isBorderY(newDown);
                this._snake.setTop(newDown);
                break;
            case "left":
                let newLeft = this._snake.getLeft() - boxSize;
                newLeft = this.isBorderX(newLeft);
                this._snake.setLeft(newLeft);
                break;
            case "right":
                let newRight = this._snake.getLeft() + boxSize;
                newRight = this.isBorderX(newRight);
                this._snake.setLeft(newRight);
                break;
        }
        //Test if the snake is eating himself --> GameOver
        if (this.isCollision()) {
            return this.gameOver();
        }
        //If the snake can move further
        else {
            //Create the new Box
            let newBox = new Box(boxSize, this._snake.getLeft(), this._snake.getTop(), snakeColor);
            //Add it to snake and delete the coordinates in tab _possibleApplePositions 
            this.addBox(newBox);
            //Test if the sanke eat _apple
            this.eatApple();
        }
    }
    //Test if the snake eat the apple, create new apple, update _score
    eatApple() {
        //If the snake eat the apple
        if (this._appleTop === this._snake.getTop() && this._appleLeft === this._snake.getLeft()) {
            audio.play();
            //create a new apple
            this.createRandomApple();
            //draw the apple
            this._apple.createBox();
            //Update score 
            this._snake.increaseScore(eatScore);
            //Update score display
            document.getElementById('displayScore').innerText = "Your score: " + this._snake.getScore().toString();
        }
        //If the snake doesn't eat the apple, remove the last created Box in snake
        else {
            this.removeBox();
        }
    }
    //Function stop the setIntervall, display the score, addEventListener on startButton
    gameOver() {
        //Create the instance of the shadow element and set Attribute score
        let gameOver = document.createElement('game-over');
        gameOver.setAttribute('scoreValue', this._snake.getScore());
        gameOver.setAttribute('id', 'idGameOver');
        document.getElementById('blockGame').appendChild(gameOver);
        //Absolute position of the gameOver Div
        let go_left = zoneJeu.offsetLeft + (width - gameOver.offsetWidth) / 2;
        let go_top = zoneJeu.offsetTop + (height - gameOver.offsetHeight) / 2;
        gameOver.style.left = go_left + "px";
        gameOver.style.top = go_top + "px";
        audio1.play();
        //Stop the function deplacement()
        clearInterval(intervalID);
        //Reattribute the event listener on StartButton
        start.addEventListener('click', launch);
    }
}
//class Snake
class Snake {
    _list;
    _left;
    _top;
    _score;
    constructor(firstBox, score = 0) {
        this._list = new Array;
        this._list.push(firstBox);
        this._left = firstBox.getLeft();
        this._top = firstBox.getTop();
        this._score = score;
    }
    //Getter Setter
    getList() {
        return this._list;
    }
    getTop() {
        return this._top;
    }
    setTop(newTop) {
        this._top = newTop;
    }
    getLeft() {
        return this._left;
    }
    setLeft(newLeft) {
        this._left = newLeft;
    }
    getScore() {
        return this._score.toString();
    }
    getCoord() {
        return new Array(this._left, this._top);
    }
    increaseScore(newScore) {
        this._score += newScore;
    }
    //Add new Box (head) and Drawn it
    addBox(newBox) {
        this._list.push(newBox);
        newBox.createBox();
    }
    //return oldest added Box (tail)
    getLastBox() {
        return this._list[0];
    }
    //Remove the oldest Box (tail) from the list and remove the colorBox
    removeBox() {
        let removeBox = this._list.shift();
        removeBox.remove();
    }
}
//Class BoxSnake
class Box {
    _size;
    _left;
    _top;
    _color;
    constructor(size, left, top, color) {
        this._size = size;
        this._left = left;
        this._top = top;
        this._color = color;
    }
    //Getter Setter  
    getCoord() {
        return new Array(this._left, this._top);
    }
    getLeftTop() {
        return new Array(this._left, this._top);
    }
    getColor() {
        return this._color;
    }
    getLeft() {
        return this._left;
    }
    getTop() {
        return this._top;
    }
    //Draw the colorBox on Canvas #zoneJeu
    createBox() {
        ctx.fillStyle = this._color;
        ctx.fillRect(this._left, this._top, this._size, this._size);
    }
    //Remove the graphic colorBox
    remove() {
        ctx.clearRect(this._left, this._top, this._size, this._size);
    }
}
//Main function called onClick StartButton
//Clean the Canvas #zoneJeu and the GameOver element
//Initialise the instances game (Game), snake (Snake) and apple (Box)
//Launch setInterval on function deplacement (general function)
function launch() {
    //Remove previous game elements
    ctx.clearRect(0, 0, width, height);
    //Remove GameOver pannel if exists
    if (document.getElementById('idGameOver') != null) {
        document.getElementById('idGameOver')?.remove();
    }
    //Disable the event listener on button start
    start.removeEventListener('click', launch);
    //Create first Snake Box and add to Snake element
    let firstBox = new Box(boxSize, boxSize * 5, boxSize * 5, snakeColor);
    firstBox.createBox();
    let snake = new Snake(firstBox);
    snake.addBox(firstBox);
    //Create first Apple 
    let apple = new Box(boxSize, boxSize * 5, boxSize * 1, appelColor);
    apple.createBox();
    //Create Game element
    const game = new Game(snake, apple, defaultDirection);
    //Add event listener on keyboard press Arrows
    document.addEventListener("keydown", (e) => {
        listenArrow(e, game);
    });
    //Afficher le score
    let displayScore = document.getElementById('displayScore');
    displayScore.innerText = "Your score: " + snake.getScore().toString();
    //coordonnées de l'adversaire aléatoire
    intervalID = setInterval(() => {
        game.deplacement();
    }, 150);
}
;
'';
//Update game._direction according to the Arrow event
function listenArrow(event, game) {
    if (event.key == "ArrowLeft") {
        // To avoid to go in the opposite direction (u-turn)
        if (game.getDirection() != "right") {
            game.setDirection("left");
        }
    }
    else if (event.key == "ArrowUp") {
        // To avoid to go in the opposite direction (u-turn)
        if (game.getDirection() != "down") {
            game.setDirection("up");
        }
    }
    else if (event.key == "ArrowRight") {
        // To avoid to go in the opposite direction (u-turn)
        if (game.getDirection() != "left") {
            game.setDirection("right");
        }
    }
    else if (event.key == "ArrowDown") {
        // To avoid to go in the opposite direction (u-turn)
        if (game.getDirection() != "up") {
            game.setDirection("down");
        }
    }
}
