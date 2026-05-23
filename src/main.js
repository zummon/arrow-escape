import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.js';
import { GRID_SIZE, CELL_SIZE, PAD_CELLS } from './lib/levels.js';

const SIZE = (GRID_SIZE + PAD_CELLS * 2) * CELL_SIZE;

const config = {
  type:            Phaser.AUTO,
  width:           SIZE,
  height:          SIZE,
  backgroundColor: 'transparent',
  transparent:     true,
  parent:          'game-container',
  scene:           [GameScene],
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

// ── Wire up UI buttons ────────────────────────────────────────────────────────
const winOverlay   = document.getElementById('win-overlay');
const resetBtn     = document.getElementById('reset-btn');
const playAgainBtn = document.getElementById('play-again-btn');

function getScene() {
  return game.scene.getScene('GameScene');
}

function doReset() {
  winOverlay.classList.add('hidden');
  getScene()?.resetGame(false); // Restart current puzzle
}

function doPlayAgain() {
  winOverlay.classList.add('hidden');
  getScene()?.resetGame(true); // Generate new puzzle
}

resetBtn.addEventListener('click', doReset);
playAgainBtn.addEventListener('click', doPlayAgain);

// Listen for the win event emitted by GameScene
game.events.on('ready', () => {
  const scene = getScene();
  if (scene) {
    scene.events.on('win', () => {
      winOverlay.classList.remove('hidden');
    });
  }
});
