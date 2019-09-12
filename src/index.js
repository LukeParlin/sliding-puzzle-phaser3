import Phaser from "phaser";
//Config for a single-scene Phaser 3 game instance
var config = {
   type: Phaser.AUTO,
   width: 500,
   height: 500,
   scene: {
      preload: preload,
      create: create,
      update: update
   }
};

//Create the Phaser 3 game instance
var game = new Phaser.Game(config);

var gridSize = 3;           //the number of rows and columns in our puzzle
var grid = [];              //an array which holds the rows of tiles in our puzzle

var tileWidth, halfWidth;   //the width of each tile in pixels (and half that, since the origin of each tile is the centerpoint)

/**
* @function     preload
* @description  main scene's preload function, called before the scene is created
*/
function preload() {
   //load in the complete puzzle image, background music, and tile slide sound
   this.load.image('puzzle-bg', 'assets/pingu-puzzle.png');
   this.load.audio('snowfall-bgm', 'assets/snowfall.mp3');
   this.load.audio('slide-snd', 'assets/dragslide.mp3');
}

/**
* @function     create
* @description  main scene's initialisation function, called before the first frame
*/
function create() {
   //calculate the width of a puzzle tile based on the size of the puzzle image, the canvas, and the grid
   let puzzleTex = this.textures.get('puzzle-bg');
   let puzzleScale = game.canvas.width / puzzleTex.source[0].width;
   let frameWidth = puzzleTex.source[0].width / gridSize;
   console.log(puzzleScale);

   tileWidth = game.canvas.width / gridSize;
   halfWidth = tileWidth * 0.5;

   //add frames to the puzzle image representing the tiles
   //this could have be done automatically by loading the image as a spritesheet, but doing it manually allows us to accept different sized images
   for (let i = 0; i < gridSize; ++i) {
      for (let j = 0; j < gridSize; ++j) {
         //args: frame ID, texture source index, frame x pos, frame y pos, frame width, frame height
         puzzleTex.add(i * gridSize + j, 0, j * frameWidth, i * frameWidth, frameWidth, frameWidth);
      }
   }

   //store a list of shuffled tile numbers
   var tiles = shuffleGrid();

   //create the puzzle tile game objects
   for (let i = 0; i < gridSize; ++i) {
      let row = [];
      for (let j = 0; j < gridSize; ++j) {
         if (i > 0 || j < gridSize - 1) { //leave a blank space in the top-right of the grid
            let tile = this.add.image(j * tileWidth + halfWidth, i * tileWidth + halfWidth, 'puzzle-bg');
            tile.setFrame(tiles.pop()); //set the tile to the next frame in the list
            tile.setScale(puzzleScale);
            tile.setInteractive();

            tile.row = i;
            tile.col = j;
            row.push(tile);
         } else {
            row.push(null);
         }
      }
      grid.push(row);
   }

   //play the background music, and begin listening for clicks/taps on game objects
   this.sound.play('snowfall-bgm', { volume: 0.3, loop: true });
   this.input.on('gameobjectdown', tileClicked);
}

/**
* @function     update
* @description  main scene's update function, called every frame
*/
function update() {
}

/**
* @function     tileClicked
* @description  check for blank spaces adjacent to a tile, then slide the tile
*
* @param {Phaser.Input.Pointer} pointer     pointer object which triggered the event
* @param {Phaser.GameObjects.Sprite} tile   the tile that was clicked
*/
function tileClicked(pointer, tile) {
   //check for a blank space above
   if (tile.row > 0 &&
      !grid[tile.row - 1][tile.col]) {
      slideTile(tile, tile.row - 1, tile.col);
   }
   //...and below
   else if (tile.row < gridSize - 1 &&
      !grid[tile.row + 1][tile.col]) {
      slideTile(tile, tile.row + 1, tile.col);
   }
   //...and left
   else if (tile.col > 0 &&
      !grid[tile.row][tile.col - 1]) {
      slideTile(tile, tile.row, tile.col - 1);
   }
   //...and right
   else if (tile.col < gridSize - 1 &&
      !grid[tile.row][tile.col + 1]) {
      slideTile(tile, tile.row, tile.col + 1);
   }
}

/**
* @function     slideTile
* @description  slides a tile into a blank space on the grid
*
* @param {Phaser.GameObjects.Sprite} tile   the tile to move
* @param {Number} newRow                    row to move to
* @param {Number} newCol                    column to move to
*/
function slideTile(tile, newRow, newCol) {
   //tween the tile into the blank space
   tile.scene.tweens.add({
      targets: tile,
      duration: 500,
      ease: 'Cubic.easeInOut',
      x: newCol * tileWidth + halfWidth,
      y: newRow * tileWidth + halfWidth
   });

   //swap the tile into the blank grid space, and update its row/column
   grid[newRow][newCol] = tile;
   grid[tile.row][tile.col] = null;
   tile.row = newRow;
   tile.col = newCol;

   //play the tile slide sound
   tile.scene.sound.play('slide-snd');
}

/**
* @function     shuffleGrid
* @description  builds a list of shuffled tile numbers, ensuring puzzle solvability
*
* @returns {Array} a shuffled list of tile (frame) numbers with the blank removed
*/
function shuffleGrid() {
   //create an array of tile numbers based on the grid size
   var tileNumbers = Phaser.Utils.Array.NumberArray(0, gridSize * gridSize - 1); //Returns an array containing numbers in a range (inclusive)
   Phaser.Utils.Array.Remove(tileNumbers, gridSize - 1); //Remove a frame for the blank space in the top-right
   Phaser.Utils.Array.Shuffle(tileNumbers); //Phaser has a built-in Fisher–Yates shuffle

   //to determine solvability, we need to calculate the number of "inversions" in our shuffle
   //see: https://www.cs.bham.ac.uk/~mdr/teaching/modules04/java2/TilesSolvability.html
   var inversions = 0;
   for (let i = 0; i < tileNumbers.length - 1; ++i) {
      for (let j = i + 1; j < tileNumbers.length; ++j) {
         if (tileNumbers[i] > tileNumbers[j]) {
            ++inversions;
         }
      }
   }

   //if the gridsize is odd, an even number of inversions means the puzzle is solvable
   //if the gridsize is even, an odd number of inversions means the puzzle is solvable
   let solvable = gridSize % 2 ^ inversions % 2;

   //if the puzzle isn't solvable, swap the two lowest tile numbers (0 and 1)
   if (!solvable) {
      Phaser.Utils.Array.Swap(tileNumbers, 0, 1);
   }

   return tileNumbers;
}