import Phaser from 'phaser';
import { GRID_SIZE, NUM_SNAKES, CELL_SIZE, PAD_CELLS, generateSnakes } from '../lib/levels.js';
import { checkEscape, dirToVec } from '../lib/gameLogic.js';

// ── Layout constants ─────────────────────────────────────────────────────────
const CELL     = CELL_SIZE;   // px per grid cell
const PAD      = PAD_CELLS;   // extra cells around the grid so snakes can visibly exit
const OX       = PAD * CELL;  // board pixel origin X
const OY       = PAD * CELL;  // board pixel origin Y
const STEP_MS  = 60;   // ms per one-cell slither step
const BOARD_W  = GRID_SIZE * CELL;
const BOARD_H  = GRID_SIZE * CELL;

// ── Colour helpers ────────────────────────────────────────────────────────────
function hexToInt(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

// Detect OS dark mode so we can tint the board accordingly
const DARK = window.matchMedia('(prefers-color-scheme: dark)').matches;
const BOARD_FILL   = DARK ? 0x2b1b17 : 0xfff8f0;
const BOARD_ALPHA  = DARK ? 0.92 : 0.88;
const DOT_COLOR    = DARK ? 0xffdab9 : 0x8a6a5a;
const DOT_ALPHA    = 0.18;
const BORDER_COLOR = DARK ? 0xffdab9 : 0xd4a88a;
const BORDER_ALPHA = DARK ? 0.2 : 0.3;

// ── Deep-clone helper ─────────────────────────────────────────────────────────
function cloneSnakes(src) {
  return src.map(s => ({
    ...s,
    segments: s.segments.map(seg => [...seg]),
  }));
}

// ── Linear interpolation helper for smooth slithering path sampling ──────────
function getPointAt(points, x) {
  const index = Math.floor(x);
  if (index < 0) return points[0];
  if (index >= points.length - 1) return points[points.length - 1];
  const t = x - index;
  const p1 = points[index];
  const p2 = points[index + 1];
  return [
    p1[0] + (p2[0] - p1[0]) * t,
    p1[1] + (p2[1] - p1[1]) * t
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ---------------------------------------------------------------------------
  create() {
    this.initialSnakes = generateSnakes(GRID_SIZE, NUM_SNAKES);
    this.activeSnakes  = cloneSnakes(this.initialSnakes);
    this.snakeObjs     = {};   // id → { gfx, zones }
    this.slithering    = new Set();  // ids currently animating off
    this.blocked       = new Set();  // ids currently showing shake

    // Static board background (drawn once)
    this.boardGfx = this.add.graphics();
    this._drawBoard();

    // Spawn all snakes
    for (const snake of this.activeSnakes) {
      this._spawnSnake(snake);
    }
  }

  // ---------------------------------------------------------------------------
  // Board background + grid dots
  // ---------------------------------------------------------------------------
  _drawBoard() {
    const g = this.boardGfx;
    g.clear();

    // Rounded board rect
    g.fillStyle(BOARD_FILL, BOARD_ALPHA);
    g.fillRoundedRect(OX, OY, BOARD_W, BOARD_H, 14);

    // Dot grid (scaled radius)
    const dotRadius = Math.max(1, CELL * 0.05);
    g.fillStyle(DOT_COLOR, DOT_ALPHA);
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        g.fillCircle(OX + c * CELL + CELL / 2, OY + r * CELL + CELL / 2, dotRadius);
      }
    }

    // Border (scaled width)
    const borderThickness = Math.max(1.5, CELL * 0.04);
    g.lineStyle(borderThickness, BORDER_COLOR, BORDER_ALPHA);
    g.strokeRoundedRect(OX, OY, BOARD_W, BOARD_H, 14);
  }

  // ---------------------------------------------------------------------------
  // Create Graphics + hit zones for one snake
  // ---------------------------------------------------------------------------
  _spawnSnake(snake) {
    const gfx = this.add.graphics();
    this._drawSnakeSegments(gfx, snake.segments, snake.color, snake.direction);

    // One invisible Zone per segment cell for click detection
    const zones = snake.segments.map(([r, c]) => {
      const zone = this.add
        .zone(
          OX + c * CELL + CELL / 2,
          OY + r * CELL + CELL / 2,
          CELL,
          CELL,
        )
        .setInteractive({ cursor: 'pointer' });

      zone.on('pointerdown', () => this._handleClick(snake));

      // Hover highlight: temporarily brighten the snake
      zone.on('pointerover', () => gfx.setAlpha(0.82));
      zone.on('pointerout',  () => gfx.setAlpha(1.0));

      return zone;
    });

    this.snakeObjs[snake.id] = { gfx, zones };
  }

  // ---------------------------------------------------------------------------
  // Draw a snake onto a Graphics object using segment point coordinates
  // ---------------------------------------------------------------------------
  _drawSnakeSegments(gfx, segs, color, direction) {
    if (!segs || segs.length === 0) return;

    const col   = hexToInt(color);
    const thick = CELL * 0.54;
    const capR  = thick / 2;
    const rimWidth = Math.max(1.5, CELL * 0.08);
    const rimCapR = capR + rimWidth / 2;

    gfx.clear();

    // ── White rim (gives depth) ──────────────────────────────────────────────
    if (segs.length > 1) {
      gfx.lineStyle(thick + rimWidth, 0xffffff, DARK ? 0.08 : 0.28);
      this._strokeSegments(gfx, segs);
    }
    // rim circles at joints
    gfx.fillStyle(0xffffff, DARK ? 0.08 : 0.28);
    for (const [r, c] of segs) {
      gfx.fillCircle(OX + c * CELL + CELL / 2, OY + r * CELL + CELL / 2, rimCapR);
    }

    // ── Coloured body ───────────────────────────────────────────────────────
    if (segs.length > 1) {
      gfx.lineStyle(thick, col, 1);
      this._strokeSegments(gfx, segs);
    }
    // Round caps / joints
    gfx.fillStyle(col, 1);
    for (const [r, c] of segs) {
      gfx.fillCircle(OX + c * CELL + CELL / 2, OY + r * CELL + CELL / 2, capR);
    }

    // ── Arrowhead at head (last segment) ────────────────────────────────────
    const [hr, hc] = segs[segs.length - 1];

    let angle = 0;
    if (segs.length > 1) {
      const [pr, pc] = segs[segs.length - 2];
      angle = Math.atan2(hr - pr, hc - pc);
    } else {
      if (direction === 'Down')  angle =  Math.PI / 2;
      if (direction === 'Left')  angle =  Math.PI;
      if (direction === 'Up')    angle = -Math.PI / 2;
    }

    this._drawArrowAtAngle(
      gfx,
      OX + hc * CELL + CELL / 2,
      OY + hr * CELL + CELL / 2,
      angle,
    );
  }

  // Shared helper: stroke a path through all segments
  _strokeSegments(gfx, segs) {
    gfx.beginPath();
    segs.forEach(([r, c], i) => {
      const x = OX + c * CELL + CELL / 2;
      const y = OY + r * CELL + CELL / 2;
      if (i === 0) gfx.moveTo(x, y);
      else         gfx.lineTo(x, y);
    });
    gfx.strokePath();
  }

  // Draw a filled triangle arrowhead at (x,y) pointing at a specific angle
  _drawArrowAtAngle(gfx, x, y, angle) {
    const s = CELL * 0.28;
    const tip = [
      { x:  s * 1.15, y:  0          },
      { x: -s * 0.55, y: -s * 0.88  },
      { x: -s * 0.55, y:  s * 0.88  },
    ].map(p => ({
      x: x + p.x * Math.cos(angle) - p.y * Math.sin(angle),
      y: y + p.x * Math.sin(angle) + p.y * Math.cos(angle),
    }));

    gfx.fillStyle(0xffffff, 0.94);
    gfx.fillTriangle(
      tip[0].x, tip[0].y,
      tip[1].x, tip[1].y,
      tip[2].x, tip[2].y,
    );
  }

  // ---------------------------------------------------------------------------
  // Click handler
  // ---------------------------------------------------------------------------
  _handleClick(snake) {
    if (this.slithering.has(snake.id)) return;
    if (this.blocked.has(snake.id))    return;

    if (!checkEscape(snake, this.activeSnakes, GRID_SIZE)) {
      this._doShake(snake);
      return;
    }

    // Remove from active list immediately — frees blocking for other snakes
    this.activeSnakes = this.activeSnakes.filter(s => s.id !== snake.id);

    // Remove hit zones (snake is leaving)
    const obj = this.snakeObjs[snake.id];
    obj.zones.forEach(z => z.destroy());
    obj.zones = [];

    // Start the slither-off animation
    this.slithering.add(snake.id);
    const [dr, dc] = dirToVec(snake.direction);

    // Build path coordinates for follow-the-leader slither
    const S = snake.segments;
    const L = S.length;
    const points = [...S];
    const [hr, hc] = S[L - 1];

    const extensionLength = GRID_SIZE + PAD + L + 5;
    for (let i = 1; i <= extensionLength; i++) {
      points.push([hr + dr * i, hc + dc * i]);
    }

    const animObj = { t: 0 };
    this.tweens.add({
      targets: animObj,
      t: extensionLength,
      duration: extensionLength * STEP_MS,
      ease: 'Linear',
      onUpdate: () => {
        const t = animObj.t;
        const segs = [];
        for (let i = 0; i < L; i++) {
          segs.push(getPointAt(points, t + i));
        }
        this._drawSnakeSegments(obj.gfx, segs, snake.color, snake.direction);
      },
      onComplete: () => {
        obj.gfx.destroy();
        delete this.snakeObjs[snake.id];
        this.slithering.delete(snake.id);
        this._checkWin();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Shake animation for blocked snakes (Phaser tween on the Graphics object)
  // ---------------------------------------------------------------------------
  _doShake(snake) {
    this.blocked.add(snake.id);
    const gfx = this.snakeObjs[snake.id]?.gfx;
    if (!gfx) { this.blocked.delete(snake.id); return; }

    const ox = gfx.x;
    const shakeDist = Math.max(2, CELL * 0.08);

    this.tweens.add({
      targets: gfx,
      x: { from: ox - shakeDist, to: ox + shakeDist },
      duration: 55,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        gfx.x = ox;
        this.blocked.delete(snake.id);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Win detection
  // ---------------------------------------------------------------------------
  _checkWin() {
    if (this.activeSnakes.length === 0 && this.slithering.size === 0) {
      this.time.delayedCall(320, () => {
        this.events.emit('win');
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Reset — called from outside (main.js button handler)
  // ---------------------------------------------------------------------------
  resetGame(newPuzzle = false) {
    // Stop all timers and destroy objects
    for (const { gfx, zones } of Object.values(this.snakeObjs)) {
      zones.forEach(z => z.destroy());
      gfx.destroy();
    }
    this.tweens.killAll();

    if (newPuzzle) {
      this.initialSnakes = generateSnakes(GRID_SIZE, NUM_SNAKES);
    }

    this.snakeObjs    = {};
    this.slithering   = new Set();
    this.blocked      = new Set();
    this.activeSnakes = cloneSnakes(this.initialSnakes);

    for (const snake of this.activeSnakes) {
      this._spawnSnake(snake);
    }
  }
}
