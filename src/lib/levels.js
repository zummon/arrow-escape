// ── Grid & puzzle constants ────────────────────────────────────────────────
export const GRID_SIZE = 25;
export const NUM_SNAKES = 75;
export const CELL_SIZE = 24; // Compact size so it scales nicely inside viewports
export const PAD_CELLS = 2;

const MIN_LEN = 3;
const MAX_LEN = 7;

const COLORS = [
  '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#54A0FF',
  '#5F27CD', '#C4B5FD', '#FF9FF3', '#00D2D3', '#01ABC1',
  '#10AC84', '#EE5A24', '#FD79A8', '#6C5CE7', '#FDCB6E',
  '#55EFC4', '#A29BFE', '#FD7272', '#FAB1A0', '#81ECEC',
];

export function dirToName(dr, dc) {
  if (dr === -1) return 'Up';
  if (dr === 1) return 'Down';
  if (dc === -1) return 'Left';
  if (dc === 1) return 'Right';
  return 'Right';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generateSnakes(gridSize = GRID_SIZE, numSnakes = NUM_SNAKES) {
  const occupied = new Set();
  const snakes = [];

  for (let id = 1; id <= numSnakes; id++) {
    let placed = false;
    for (let attempt = 0; attempt < 1000 && !placed; attempt++) {
      const len = MIN_LEN + Math.floor(Math.random() * (MAX_LEN - MIN_LEN + 1));
      const segs = _buildPath(gridSize, occupied, len);
      if (!segs) continue;

      const head = segs[segs.length - 1];
      const prev = segs[segs.length - 2];
      const dr = head[0] - prev[0];
      const dc = head[1] - prev[1];
      const direction = dirToName(dr, dc);

      let selfIntersects = false;
      const bodySet = new Set(segs.slice(0, -1).map(([r, c]) => `${r},${c}`));
      let r = head[0] + dr, c = head[1] + dc;
      while (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        if (bodySet.has(`${r},${c}`)) {
          selfIntersects = true;
          break;
        }
        r += dr;
        c += dc;
      }
      if (selfIntersects) continue;

      let pathBlocked = false;
      r = head[0] + dr;
      c = head[1] + dc;
      while (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
        if (occupied.has(`${r},${c}`)) {
          pathBlocked = true;
          break;
        }
        r += dr;
        c += dc;
      }
      if (pathBlocked) continue;

      const snake = {
        id,
        color: COLORS[(id - 1) % COLORS.length],
        segments: segs,
        direction,
      };

      segs.forEach(([r, c]) => occupied.add(`${r},${c}`));
      snakes.push(snake);
      placed = true;
    }
  }
  return snakes;
}

function _buildPath(gridSize, occupied, targetLen) {
  const VECS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  for (let attempt = 0; attempt < 150; attempt++) {
    const r0 = Math.floor(Math.random() * gridSize);
    const c0 = Math.floor(Math.random() * gridSize);
    if (occupied.has(`${r0},${c0}`)) continue;

    const segs = [[r0, c0]];
    const cellSet = new Set([`${r0},${c0}`]);
    let prevDr = null, prevDc = null;

    while (segs.length < targetLen) {
      const [lr, lc] = segs[segs.length - 1];

      let dirs = shuffle(VECS);
      if (prevDr !== null && Math.random() < 0.65) {
        const si = dirs.findIndex(([dr, dc]) => dr === prevDr && dc === prevDc);
        if (si > -1) {
          const [straight] = dirs.splice(si, 1);
          dirs.push(straight);
        }
      }

      let extended = false;
      for (const [dr, dc] of dirs) {
        const nr = lr + dr, nc = lc + dc;
        const key = `${nr},${nc}`;
        if (
          nr >= 0 && nr < gridSize &&
          nc >= 0 && nc < gridSize &&
          !occupied.has(key) &&
          !cellSet.has(key)
        ) {
          segs.push([nr, nc]);
          cellSet.add(key);
          prevDr = dr; prevDc = dc;
          extended = true;
          break;
        }
      }
      if (!extended) break;
    }
    if (segs.length >= 3) return segs;
  }
  return null;
}

// Automatically generate a puzzle board for the Svelte initialization lifecycle
export const INITIAL_SNAKES = generateSnakes(GRID_SIZE, NUM_SNAKES);