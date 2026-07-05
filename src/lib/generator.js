// Full-coverage board generator.
//
// Every cell of the shape is covered by exactly one snake, and the board is
// always solvable:
//
//  1. Build a random spanning tree over the shape's 2x2 blocks.
//  2. Walk the tree's contour — that is a Hamiltonian cycle visiting every
//     cell exactly once (each block corner has one fixed successor).
//  3. Chop the cycle into snakes of 3-7 segments, so they tile the board.
//  4. "Peel" the board: repeatedly find a snake with a clear escape ray,
//     fix its arrow, and remove it. If peeling finishes, the peel order is
//     a valid solution. Removing a snake only ever frees cells, so any
//     order of valid moves the player finds also finishes the board.

const CHUNK_MIN = 3;
const CHUNK_MAX = 7;

const COLORS = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#54A0FF',
  '#5F27CD', '#C4B5FD', '#FF9FF3', '#00D2D3', '#01ABC1',
  '#10AC84', '#EE5A24', '#FD79A8', '#6C5CE7', '#FDCB6E',
  '#55EFC4', '#A29BFE', '#FD7272', '#FAB1A0', '#81ECEC',
];

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

const key = (r, c) => `${r},${c}`;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function parseShape(mask) {
  const blocks = [];
  const blockSet = new Set();
  mask.forEach((row, R) => {
    [...row].forEach((ch, C) => {
      if (ch === '#') {
        blocks.push([R, C]);
        blockSet.add(key(R, C));
      }
    });
  });
  const rows = mask.length * 2;
  const cols = Math.max(...mask.map((r) => r.length)) * 2;
  const cells = [];
  for (const [R, C] of blocks) {
    cells.push([R * 2, C * 2], [R * 2, C * 2 + 1], [R * 2 + 1, C * 2], [R * 2 + 1, C * 2 + 1]);
  }
  return { blocks, blockSet, rows, cols, cells };
}

function edgeKey(a, b) {
  const ka = key(a[0], a[1]);
  const kb = key(b[0], b[1]);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

function spanningTree(blocks, blockSet) {
  const edges = new Set();
  const visited = new Set();
  const start = blocks[Math.floor(Math.random() * blocks.length)];
  const stack = [start];
  visited.add(key(start[0], start[1]));

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nexts = shuffle(DIRS)
      .map(([dr, dc]) => [cur[0] + dr, cur[1] + dc])
      .filter(([R, C]) => blockSet.has(key(R, C)) && !visited.has(key(R, C)));
    if (!nexts.length) {
      stack.pop();
      continue;
    }
    visited.add(key(nexts[0][0], nexts[0][1]));
    edges.add(edgeKey(cur, nexts[0]));
    stack.push(nexts[0]);
  }
  return edges;
}

// Each cell is one corner of its 2x2 block; the corner plus "is there a tree
// edge on that side" fully determines the next cell on the contour.
function hamiltonianCycle(parsed, edges) {
  const linked = (R, C, R2, C2) =>
    parsed.blockSet.has(key(R2, C2)) && edges.has(edgeKey([R, C], [R2, C2]));

  const next = ([r, c]) => {
    const R = r >> 1, C = c >> 1;
    const top = (r & 1) === 0;
    const left = (c & 1) === 0;
    if (top && left) return linked(R, C, R, C - 1) ? [r, c - 1] : [r + 1, c];
    if (!top && left) return linked(R, C, R + 1, C) ? [r + 1, c] : [r, c + 1];
    if (!top && !left) return linked(R, C, R, C + 1) ? [r, c + 1] : [r - 1, c];
    return linked(R, C, R - 1, C) ? [r - 1, c] : [r, c - 1];
  };

  const start = [parsed.blocks[0][0] * 2, parsed.blocks[0][1] * 2];
  const cycle = [start];
  for (let cur = next(start); cur[0] !== start[0] || cur[1] !== start[1]; cur = next(cur)) {
    cycle.push(cur);
  }
  if (cycle.length !== parsed.blocks.length * 4) {
    throw new Error('contour walk did not cover the board');
  }
  return cycle;
}

function chunkLengths(total) {
  const lens = [];
  let remaining = total;
  while (remaining > 0) {
    let len;
    if (remaining <= CHUNK_MAX) {
      len = remaining;
    } else {
      len = CHUNK_MIN + Math.floor(Math.random() * (CHUNK_MAX - CHUNK_MIN + 1));
      if (remaining - len < CHUNK_MIN) len = remaining - CHUNK_MIN;
    }
    lens.push(len);
    remaining -= len;
  }
  return lens;
}

function chopCycle(cycle) {
  const offset = Math.floor(Math.random() * cycle.length);
  const rotated = cycle.slice(offset).concat(cycle.slice(0, offset));
  const chunks = [];
  let i = 0;
  for (const len of chunkLengths(rotated.length)) {
    chunks.push(rotated.slice(i, i + len));
    i += len;
  }
  return chunks;
}

// Pick a head for every snake such that a full removal order exists.
// Returns oriented segment lists (head last), or null on deadlock.
function orientAndPeel(chunks, rows, cols, minOpeningMoves) {
  const owner = new Map();
  chunks.forEach((segs, i) => segs.forEach(([r, c]) => owner.set(key(r, c), i)));
  const remaining = new Set(chunks.map((_, i) => i));

  // A ray is blocked by any still-remaining snake, its own body included
  // (gameplay is laxer about self-crossing, so this stays a safe bound).
  const rayClear = (segs) => {
    const [hr, hc] = segs[segs.length - 1];
    const [pr, pc] = segs[segs.length - 2];
    const dr = hr - pr, dc = hc - pc;
    for (let r = hr + dr, c = hc + dc; r >= 0 && r < rows && c >= 0 && c < cols; r += dr, c += dc) {
      const o = owner.get(key(r, c));
      if (o !== undefined && remaining.has(o)) return false;
    }
    return true;
  };

  const fixed = new Map();
  const clearOrientations = (i) => {
    if (fixed.has(i)) return rayClear(fixed.get(i)) ? [fixed.get(i)] : [];
    const out = [];
    if (rayClear(chunks[i])) out.push(chunks[i]);
    const rev = [...chunks[i]].reverse();
    if (rayClear(rev)) out.push(rev);
    return out;
  };

  // Snakes movable on the untouched board are the player's opening moves;
  // require a few so the start isn't a hunt for one pixel, and lock their
  // arrows now (their rays only get clearer as other snakes leave).
  const openers = [];
  for (const i of remaining) {
    const opts = clearOrientations(i);
    if (opts.length) openers.push([i, opts]);
  }
  if (openers.length < minOpeningMoves) return null;
  for (const [i, opts] of openers) {
    fixed.set(i, opts[Math.floor(Math.random() * opts.length)]);
  }

  while (remaining.size) {
    let peeled = -1;
    for (const i of shuffle([...remaining])) {
      const opts = clearOrientations(i);
      if (opts.length) {
        if (!fixed.has(i)) fixed.set(i, opts[Math.floor(Math.random() * opts.length)]);
        peeled = i;
        break;
      }
    }
    if (peeled < 0) return null;
    remaining.delete(peeled);
  }
  return chunks.map((_, i) => fixed.get(i));
}

function dirToName(dr, dc) {
  if (dr === -1) return 'Up';
  if (dr === 1) return 'Down';
  if (dc === -1) return 'Left';
  return 'Right';
}

function toSnakes(orientedChunks) {
  return orientedChunks.map((segments, i) => {
    const [hr, hc] = segments[segments.length - 1];
    const [pr, pc] = segments[segments.length - 2];
    return {
      id: i + 1,
      color: COLORS[i % COLORS.length],
      segments: segments.map((s) => [...s]),
      direction: dirToName(hr - pr, hc - pc),
    };
  });
}

// Emergency layout if every random attempt deadlocks (statistically ~never):
// slice each row into leftward snakes, solvable left to right.
function fallbackChunks(parsed) {
  const cellSet = new Set(parsed.cells.map(([r, c]) => key(r, c)));
  const chunks = [];
  for (let r = 0; r < parsed.rows; r++) {
    let c = 0;
    while (c < parsed.cols) {
      if (!cellSet.has(key(r, c))) {
        c++;
        continue;
      }
      let end = c;
      while (end < parsed.cols && cellSet.has(key(r, end))) end++;
      for (const len of chunkLengths(end - c)) {
        const segs = [];
        for (let k = len - 1; k >= 0; k--) segs.push([r, c + k]);
        chunks.push(segs);
        c += len;
      }
    }
  }
  return chunks;
}

export function generateBoard(shape) {
  const parsed = parseShape(shape.mask);
  let oriented = null;
  for (let attempt = 0; attempt < 80 && !oriented; attempt++) {
    const edges = spanningTree(parsed.blocks, parsed.blockSet);
    const cycle = hamiltonianCycle(parsed, edges);
    const minOpeningMoves = attempt < 60 ? 3 : 1;
    oriented = orientAndPeel(chopCycle(cycle), parsed.rows, parsed.cols, minOpeningMoves);
  }
  if (!oriented) oriented = fallbackChunks(parsed);

  return {
    shapeName: shape.name,
    rows: parsed.rows,
    cols: parsed.cols,
    blocks: parsed.blocks,
    cells: parsed.cells,
    snakes: toSnakes(oriented),
  };
}
