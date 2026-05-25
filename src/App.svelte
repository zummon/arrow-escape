<script>
  import "./app.css";

  // ── Grid & puzzle constants (from levels.js) ───────────────────────────────
  const GRID_SIZE = 25;
  const NUM_SNAKES = 75;
  const CELL_SIZE = 24; // Compact size so it scales nicely inside viewports
  const PAD_CELLS = 2;

  const MIN_LEN = 3;
  const MAX_LEN = 7;

  const COLORS = [
    '#FF6B6B', '#FF9F43', '#FECA57', '#48DBFB', '#54A0FF',
    '#5F27CD', '#C4B5FD', '#FF9FF3', '#00D2D3', '#01ABC1',
    '#10AC84', '#EE5A24', '#FD79A8', '#6C5CE7', '#FDCB6E',
    '#55EFC4', '#A29BFE', '#FD7272', '#FAB1A0', '#81ECEC',
  ];

  function dirToName(dr, dc) {
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

  function generateSnakes(gridSize = GRID_SIZE, numSnakes = NUM_SNAKES) {
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

  let initialSnakes = generateSnakes(GRID_SIZE, NUM_SNAKES);

  // ── Game logic helpers (from gameLogic.js) ─────────────────────────────────
  function dirToVec(direction) {
    if (direction === 'Up')    return [-1,  0];
    if (direction === 'Down')  return [ 1,  0];
    if (direction === 'Left')  return [ 0, -1];
    if (direction === 'Right') return [ 0,  1];
    return [0, 0];
  }

  function checkEscape(snake, allSnakes, size) {
    const { segments, direction } = snake;
    const [hr, hc] = segments[segments.length - 1];
    const [dr, dc] = dirToVec(direction);

    const blocked = new Set();
    for (const other of allSnakes) {
      if (other.id === snake.id) continue;
      for (const [r, c] of other.segments) {
        blocked.add(`${r},${c}`);
      }
    }

    let r = hr + dr, c = hc + dc;
    while (r >= 0 && r < size && c >= 0 && c < size) {
      if (blocked.has(`${r},${c}`)) return false;
      r += dr;
      c += dc;
    }
    return true;
  }

  // ── Board reactive state & handlers (from Board.svelte) ──────────────────────
  const CELL = CELL_SIZE;
  const STEP_MS = 75;
  const SVG_W = GRID_SIZE * CELL;
  const SVG_H = GRID_SIZE * CELL;

  function cloneSnakes(src) {
    return src.map((s) => ({
      ...s,
      segments: s.segments.map((seg) => [...seg]),
    }));
  }

  let snakes = $state(cloneSnakes(initialSnakes));
  let slithering = $state([]);
  let blockedIds = $state(new Set());
  let won = $state(false);

  function markBlocked(id) {
    blockedIds = new Set([...blockedIds, id]);
    setTimeout(() => {
      blockedIds = new Set([...blockedIds].filter((x) => x !== id));
    }, 350);
  }

  function checkWin() {
    if (snakes.length === 0 && slithering.length === 0) {
      setTimeout(() => {
        won = true;
      }, 300);
    }
  }

  function handleClick(snake) {
    if (slithering.find((s) => s.id === snake.id)) return;
    if (blockedIds.has(snake.id)) return;

    if (!checkEscape(snake, snakes, GRID_SIZE)) {
      markBlocked(snake.id);
      return;
    }

    snakes = snakes.filter((s) => s.id !== snake.id);
    const copy = { ...snake, segments: snake.segments.map((seg) => [...seg]) };
    slithering = [...slithering, copy];

    const [dr, dc] = dirToVec(snake.direction);

    const timer = setInterval(() => {
      let done = false;

      slithering = slithering.map((es) => {
        if (es.id !== copy.id) return es;

        if (es.segments.length === 0) {
          done = true;
          return es;
        }

        const currentHead = es.segments[es.segments.length - 1];
        const nextHead = [currentHead[0] + dr, currentHead[1] + dc];
        let newSegments = [...es.segments, nextHead];
        newSegments.shift();

        newSegments = newSegments.filter(
          ([r, c]) =>
            r >= -1 && r < GRID_SIZE + 1 && c >= -1 && c < GRID_SIZE + 1,
        );

        if (newSegments.length === 0) {
          done = true;
        }

        return { ...es, segments: newSegments };
      });

      if (done) {
        clearInterval(timer);
        slithering = slithering.filter((s) => s.id !== copy.id);
        checkWin();
      }
    }, STEP_MS);
  }

  function handleReset() {
    initialSnakes = generateSnakes(GRID_SIZE, NUM_SNAKES);
    reset();
  }

  function reset() {
    snakes = cloneSnakes(initialSnakes);
    slithering = [];
    blockedIds = new Set();
    won = false;
  }

  // SnakePath helper functions
  function getPoints(segments, cellSize) {
    return segments
      .map(
        ([r, c]) =>
          `${c * cellSize + cellSize / 2},${r * cellSize + cellSize / 2}`,
      )
      .join(" ");
  }

  function getHeadCoords(segments, cellSize) {
    if (!segments || segments.length === 0) return { x: 0, y: 0 };
    const headSeg = segments[segments.length - 1];
    return {
      x: headSeg[1] * cellSize + cellSize / 2,
      y: headSeg[0] * cellSize + cellSize / 2,
    };
  }

  function getArrowAngle(direction) {
    if (direction === "Right") return 0;
    if (direction === "Down") return 90;
    if (direction === "Left") return 180;
    if (direction === "Up") return -90;
    return 0;
  }
</script>

{#snippet snakePath(snake, isBlocked, onClickSnake)}
  {@const points = getPoints(snake.segments, CELL)}
  {@const headCoords = getHeadCoords(snake.segments, CELL)}
  {@const arrowAngle = getArrowAngle(snake.direction)}
  {@const bodyWidth = CELL * 0.56}
  {@const rimWidth = CELL * 0.56 + Math.max(1.5, CELL * 0.1)}
  {@const arrowScale = CELL * 0.26}

  <g class="snake-group" class:blocked={isBlocked} onclick={onClickSnake}>
    <polyline
      {points}
      stroke="rgba(255,255,255,0.25)"
      stroke-width={rimWidth}
      fill="none"
      stroke-linejoin="round"
      stroke-linecap="round"
      style="pointer-events:none;"
    />

    <polyline
      {points}
      stroke={snake.color}
      stroke-width={bodyWidth}
      fill="none"
      stroke-linejoin="round"
      stroke-linecap="round"
      class="snake-body"
    />

    <g transform="translate({headCoords.x},{headCoords.y}) rotate({arrowAngle})">
      <polygon
        points="{arrowScale * 1.15},0 {-arrowScale * 0.55},{-arrowScale *
          0.8} {-arrowScale * 0.55},{arrowScale * 0.8}"
        fill="white"
        opacity="0.95"
        style="pointer-events:none;"
      />
    </g>
  </g>
{/snippet}

<main class="app-container">
  <header>
    <h1>Arrow Escape</h1>
    <p>Click a snake to escape — only if its head's path is clear!</p>
    <button class="reset-btn" onclick={handleReset}>↺ Reset Map</button>
  </header>

  <div class="game-area">
    <div class="board-wrap">
      <svg
        width={SVG_W}
        height={SVG_H}
        class="board-svg"
        style="overflow: visible;"
      >
        <defs>
          <pattern
            id="grid-dots"
            width={CELL}
            height={CELL}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={CELL / 2}
              cy={CELL / 2}
              r="3"
              fill="var(--text-color)"
              opacity="0.1"
            />
          </pattern>
        </defs>

        <rect width={SVG_W} height={SVG_H} rx="24" fill="var(--board-bg)" />
        <rect width={SVG_W} height={SVG_H} rx="24" fill="url(#grid-dots)" />

        <rect
          width={SVG_W}
          height={SVG_H}
          rx="24"
          fill="none"
          stroke="var(--text-color)"
          stroke-width="4"
          opacity="0.15"
        />

        {#each slithering as s (s.id)}
          {#if s.segments.length > 0}
            {@render snakePath(s, false, () => {})}
          {/if}
        {/each}

        {#each snakes as s (s.id)}
          {@render snakePath(s, blockedIds.has(s.id), () => handleClick(s))}
        {/each}
      </svg>

      {#if won}
        <div class="win-overlay">
          <div class="win-modal">
            <div class="win-emoji">🎉</div>
            <h2>Board Cleared!</h2>
            <button class="play-again-btn" onclick={handleReset}>Play Again</button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.2rem;
    padding: 2.5rem 1rem;
    text-align: center;
    width: 100%;
  }

  header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }

  h1 {
    font-size: 2.6rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
    letter-spacing: -0.5px;
    filter: drop-shadow(0 2px 0px var(--board-bg));
  }

  p {
    font-size: 1.05rem;
    color: var(--text-muted);
    max-width: 360px;
    margin: 0;
  }

  .reset-btn {
    margin-top: 0.5rem;
    background: var(--btn-bg);
    border: none;
    color: var(--text-color);
    padding: 0.6rem 1.4rem;
    border-radius: 20px;
    font-family: var(--font-cute);
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 0 var(--text-color);
    transition:
      transform 0.1s ease,
      box-shadow 0.1s ease;
  }

  .reset-btn:hover {
    background: var(--btn-hover);
    transform: translateY(-2px);
    box-shadow: 0 6px 0 var(--text-color);
  }

  .reset-btn:active {
    transform: translateY(2px);
    box-shadow: 0 2px 0 var(--text-color);
  }

  .game-area {
    display: flex;
    justify-content: center;
    margin-top: 1rem;
  }

  .board-wrap {
    position: relative;
    display: inline-block;
  }

  .board-svg {
    display: block;
    filter: drop-shadow(0 12px 36px var(--tile-shadow));
  }

  .win-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(35, 25, 36, 0.4);
    backdrop-filter: blur(8px);
    border-radius: 24px;
    animation: fadeIn 0.3s ease-out forwards;
  }

  .win-modal {
    background: var(--modal-bg);
    padding: 2.5rem 3rem;
    border-radius: 28px;
    text-align: center;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.2);
    border: 4px solid var(--text-color);
    animation: popSquish 0.45s cubic-bezier(0.175, 0.885, 0.42, 1.4);
  }

  .win-emoji {
    font-size: 3.5rem;
    margin-bottom: 0.25rem;
    animation: bounce 1.2s infinite alternate ease-in-out;
  }

  .win-modal h2 {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--text-color);
  }

  .play-again-btn {
    background: var(--btn-bg);
    color: var(--text-color);
    font-family: var(--font-cute);
    font-size: 1.15rem;
    font-weight: 700;
    padding: 0.8rem 2.2rem;
    border-radius: 24px;
    border: none;
    cursor: pointer;
    box-shadow: 0 5px 0 var(--text-color);
    transition:
      transform 0.1s ease,
      box-shadow 0.1s ease;
  }

  .play-again-btn:hover {
    background: var(--btn-hover);
    transform: translateY(-2px);
    box-shadow: 0 7px 0 var(--text-color);
  }

  .play-again-btn:active {
    transform: translateY(3px);
    box-shadow: 0 2px 0 var(--text-color);
  }

  .snake-group {
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .snake-group:hover .snake-body {
    filter: brightness(1.15);
  }

  .blocked {
    animation: shake 0.35s ease-in-out;
    transform-origin: center;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes popSquish {
    0% {
      transform: scale(0.7) rotate(-3deg);
      opacity: 0;
    }
    60% {
      transform: scale(1.05) rotate(2deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }

  @keyframes bounce {
    from {
      transform: translateY(0) scale(1);
    }
    to {
      transform: translateY(-8px) scale(1.05);
    }
  }

  @keyframes shake {
    0% {
      transform: translate(0, 0);
    }
    20% {
      transform: translate(-3px, 0);
    }
    40% {
      transform: translate(3px, 0);
    }
    60% {
      transform: translate(-3px, 0);
    }
    80% {
      transform: translate(3px, 0);
    }
    100% {
      transform: translate(0, 0);
    }
  }
</style>
