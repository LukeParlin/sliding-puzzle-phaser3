/**
 * A simple sliding puzzle game built to test Phaser 3
 * @author Luke Parlin <luke.parlin@linguaphonegroup.com>
 */

import Phaser from "phaser";

//Config for a single-scene, responsive Phaser 3 game instance
var config = {
   title: 'Pingu Sliding Puzzle',
   type: Phaser.AUTO,
   width: 1024,
   height: 1024,
   scene: {
      init: init, //Phaser 3 scenes will call these 4 built-in "lifecycle" functions if the developer has defined them
      preload: preload,
      create: create,
      update: update
   },
   scale: {  //the scale configuration can make a canvas responsive, though you don't need to include one
      mode: Phaser.Scale.FIT, //Scale.FIT adjusts the canvas to fit inside it's parent while maintaining its aspect ratio
      autoCenter: Phaser.Scale.CENTER_BOTH,
   },
};

/** @global */
var game = new Phaser.Game(config); //Create the Phaser 3 game instance

//check to make sure gridSize exists, and that it's valid
if (!gridSize || gridSize < 3) {
   /** @global */
   gridSize = 4;          //the number of rows and columns in our puzzle (this global should be set in the HTML, but in case it's not...)
}

/** @global */
var grid = [];              //an array which holds the rows of tiles in our puzzle

/** @global */
var tileWidth, halfWidth;   //the width of each tile in pixels (and half that, since the origin of each tile is the centerpoint)

/**
* @function     init
* @description  main scene's init function, called before the scene's assets are preloaded. the engine update loop is NOT running during init.
*/
function init() {
}

/**
* @function     preload
* @description  main scene's preload function, called before the scene is created
*/
function preload() {
   //set up a small pre-loader progress bar using Phaser's built-in loader plugin
   var progress = this.add.graphics();

   this.load.on('progress', function (percent) {
      //Style our loading bar outline and fill
      let lineWidth = 4;
      let lineColor = 0x009FDA;
      let barColor = 0xffffff;

      progress.clear();
      progress.lineStyle(lineWidth, lineColor) //Pingu's English blue!
      progress.fillStyle(barColor);

      //Set up the dimensions of our bar (this could be loaded from json or something)
      let barWidth = 500;
      let barHeight = 25;
      let barMargin = 2;
      let barX = (game.canvas.width - barWidth) * 0.5;
      let barY = (game.canvas.height - barHeight) * 0.5;

      //Draw the outline for our loading bar and fill it in
      progress.strokeRect(barX, barY, barWidth, barHeight);
      progress.fillRect(barX + barMargin + lineWidth * 0.5, barY + barMargin + lineWidth * 0.5, percent * (barWidth - lineWidth - barMargin * 2), barHeight - lineWidth - barMargin * 2);
   });

   this.load.on('complete', function () {
      progress.destroy();
   });

   //load in the complete puzzle image
   this.load.image('puzzle-bg', 'assets/pingu-puzzle.png');

   //load in the slide sound effect, the background music, and the win sound
   this.load.audio('snowfall-bgm', 'assets/snowfall.mp3');
   this.load.audio('slide-snd', 'assets/dragslide.mp3');
   this.load.audio('noot-snd', 'assets/noot.mp3')
}

/**
* @function     create
* @description  main scene's initialisation function, called before the first frame every time the scene is started
*/
function create() {
   //calculate the width of a puzzle tile based on the size of the puzzle image, the canvas, and the grid
   let puzzleTex = this.textures.get('puzzle-bg');
   let puzzleScale = game.canvas.width / puzzleTex.source[0].width;
   let frameWidth = puzzleTex.source[0].width / gridSize;

   tileWidth = game.canvas.width / gridSize;
   halfWidth = tileWidth * 0.5;

   //add frames to the puzzle image representing the tiles
   //this could have be done automatically by loading the image as a spritesheet, but doing it manually allows us to accept different sized images
   for (let i = 0; i < gridSize; ++i) {
      for (let j = 0; j < gridSize; ++j) {
         //calling "add" on a texture adds frames to that texture
         //args: frame ID, texture source index, frame x pos, frame y pos, frame width, frame height
         puzzleTex.add(i * gridSize + j, 0, j * frameWidth, i * frameWidth, frameWidth, frameWidth);
      }
   }

   //store a list of shuffled tile numbers
   var tileFrames = shuffleGrid();

   //create the puzzle tiles — each tile has an image game object, and a row and column
   for (let i = 0; i < gridSize; ++i) {
      let row = [];
      for (let j = 0; j < gridSize; ++j) {
         if (i > 0 || j < gridSize - 1) { //leave a blank space in the top-right of the grid
            //calling "add.<type>" in a scene adds a game object of that type to the scene
            //args: x position, y position, texture key, and the frame we want the image to display
            let tile = this.add.image(j * tileWidth + halfWidth, i * tileWidth + halfWidth, 'puzzle-bg', tileFrames.pop());
            tile.row = i;
            tile.col = j;

            //scale the image and tell it to receive input events
            tile.setScale(puzzleScale);
            tile.setInteractive();

            row.push(tile);
         } else {
            row.push(null);
         }
      }
      grid.push(row);
   }
   //store references to the background music and noot sounds in the scene
   this.bgm = this.sound.add('snowfall-bgm', { volume: 0.3, loop: true });
   this.noot = this.sound.add('noot-snd', { volume: 0.5 });

   //play the background music, and begin listening for clicks/taps on game objects
   this.bgm.play();
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
      duration: 600,
      ease: 'Cubic.easeInOut',
      x: newCol * tileWidth + halfWidth,
      y: newRow * tileWidth + halfWidth,
      onComplete: checkWin, //when the tween completes, check to see if the player has won
      onCompleteScope: tile.scene //allows me to access the current scene from 'this' in the onComplete function
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
* @function     checkWin
* @description  checks to see if the game has been won (and ends the game if so)
*/
function checkWin() {
   //starting from the top-left of the grid...
   for (let i = 0; i < gridSize; ++i) {
      for (let j = 0; j < gridSize; ++j) {
         //...if we're not on the empty space, and the tile isn't displaying the expected frame, stop checking
         if (grid[i][j] != null && grid[i][j].frame.name != gridSize * i + j) {
            return;
         }
      }

      //if we've made it this far the game has been won!
      this.input.off('gameobjectdown');
      this.bgm.stop();
      if( !this.noot.isPlaying ){
         this.noot.play();
      }
   }

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

//---------------------------------------------------------------------------------//
//         IT'S POSSIBLE TO EXTEND PHASER 3 BY ADDING CUSTOM GAME OBJECTS          //
// whether or not this is "best" practice is debatable, as JavaScript has no types //
//---------------------------------------------------------------------------------//

// HERE'S A CUSTOM GAME OBJECT
// class PuzzleTile extends Phaser.GameObjects.Image {
//    constructor(scene, row, col, texture, frame = 0) {
//       super(scene, col * tileWidth + halfWidth, row * tileWidth + halfWidth, texture, frame);
//       this.row = row;
//       this.col = col;
//    }
// }

// YOU CAN ADD IT TO THE GAME OBJECT FACTORY AS NEW TYPE
// function init() {
//    Phaser.GameObjects.GameObjectFactory.register('puzzleTile', function (row, col, texture, frame = 0) {
//       let tile = new PuzzleTile(this.scene, row, col, texture, frame);

//       this.displayList.add(tile);

//       return tile;
//    });
// }

// FROM THAT POINT YOU COULD ADD IT TO A SCENE EASILY. Note that it's built using a row and column, rather than an x and y position
// let tile = this.add.puzzleTile(i, j, 'puzzle-bg');