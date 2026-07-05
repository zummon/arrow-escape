// Property tests for the board generator. Run with: npm run verify
//
// For every shape, many times over, checks that a generated board:
//  - covers every cell of the shape exactly once (full coverage)
//  - has only contiguous snakes whose arrow matches their head segment
//  - offers at least one opening move
//  - can always be cleared using the same escape rule the game uses
import { SHAPES } from '../src/lib/shapes.js';
import { generateBoard, parseShape } from '../src/lib/generator.js';

const RUNS_PER_SHAPE = 60;

const key = (r, c) => `${r},${c}`;
const VEC = { Up: [-1, 0], Down: [1, 0], Left: [0, -1], Right: [0, 1] };

// Mirrors checkEscape in App.svelte: blocked by other snakes only.
function canEscape(snake, others, rows, cols) {
  const [hr, hc] = snake.segments[snake.segments.length - 1];
  const [dr, dc] = VEC[snake.direction];
  const blocked = new Set();
  for (const o of others) {
    if (o.id === snake.id) continue;
    for (const [r, c] of o.segments) blocked.add(key(r, c));
  }
  for (let r = hr + dr, c = hc + dc; r >= 0 && r < rows && c >= 0 && c < cols; r += dr, c += dc) {
    if (blocked.has(key(r, c))) return false;
  }
  return true;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

let openingMovesTotal = 0;
let snakesTotal = 0;

for (const shape of SHAPES) {
  const parsed = parseShape(shape.mask);
  for (let run = 0; run < RUNS_PER_SHAPE; run++) {
    const board = generateBoard(shape);

    // Full coverage, no overlaps, snakes contiguous and inside the shape.
    const covered = new Set();
    for (const s of board.snakes) {
      assert(s.segments.length >= 3, `${shape.name}: snake shorter than 3`);
      for (let i = 0; i < s.segments.length; i++) {
        const [r, c] = s.segments[i];
        assert(!covered.has(key(r, c)), `${shape.name}: cell covered twice`);
        covered.add(key(r, c));
        if (i > 0) {
          const [pr, pc] = s.segments[i - 1];
          assert(Math.abs(r - pr) + Math.abs(c - pc) === 1, `${shape.name}: snake not contiguous`);
        }
      }
      const [hr, hc] = s.segments[s.segments.length - 1];
      const [pr, pc] = s.segments[s.segments.length - 2];
      const [dr, dc] = VEC[s.direction];
      assert(hr - pr === dr && hc - pc === dc, `${shape.name}: arrow disagrees with head segment`);
    }
    assert(covered.size === parsed.cells.length, `${shape.name}: not full coverage`);
    for (const [r, c] of parsed.cells) {
      assert(covered.has(key(r, c)), `${shape.name}: shape cell left empty`);
    }

    // Playability: count opening moves, then clear the whole board greedily
    // with the exact rule the game applies on click.
    let remaining = [...board.snakes];
    openingMovesTotal += remaining.filter((s) => canEscape(s, remaining, board.rows, board.cols)).length;
    snakesTotal += remaining.length;

    while (remaining.length) {
      const idx = remaining.findIndex((s) => canEscape(s, remaining, board.rows, board.cols));
      assert(idx >= 0, `${shape.name}: board not solvable (${remaining.length} snakes stuck)`);
      remaining.splice(idx, 1);
    }
  }
  console.log(`ok: ${shape.name} (${RUNS_PER_SHAPE} boards)`);
}

console.log(
  `all shapes pass — avg snakes/board: ${(snakesTotal / (SHAPES.length * RUNS_PER_SHAPE)).toFixed(1)},` +
  ` avg opening moves: ${(openingMovesTotal / (SHAPES.length * RUNS_PER_SHAPE)).toFixed(1)}`,
);
