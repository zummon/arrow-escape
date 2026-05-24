<script>
  import SnakePath from "./SnakePath.svelte";
  import { checkEscape, dirToVec } from "./gameLogic.js";
  import { GRID_SIZE, INITIAL_SNAKES, CELL_SIZE } from "./levels.js";

  let { onWin } = $props();

  // Dynamically pull layout dimensions from levels config
  const CELL = CELL_SIZE || 24;
  const STEP_MS = 75; // Smooth slither speed interval

  // Dynamic sizing of the board
  const SVG_W = GRID_SIZE * CELL;
  const SVG_H = GRID_SIZE * CELL;

  // Deep-clone helper to isolate level data changes
  function cloneSnakes(src) {
    return src.map((s) => ({
      ...s,
      segments: s.segments.map((seg) => [...seg]),
    }));
  }

  // --- Reactive state (Svelte 5 Runes) ---
  let snakes = $state(cloneSnakes(INITIAL_SNAKES));
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
        if (onWin) onWin();
      }, 300);
    }
  }

  // ---- Click handler ----
  function handleClick(snake) {
    if (slithering.find((s) => s.id === snake.id)) return;
    if (blockedIds.has(snake.id)) return;

    if (!checkEscape(snake, snakes, GRID_SIZE)) {
      markBlocked(snake.id);
      return;
    }

    // Instantly pull from active board bounds so paths clear immediately
    snakes = snakes.filter((s) => s.id !== snake.id);
    const copy = { ...snake, segments: snake.segments.map((seg) => [...seg]) };
    slithering = [...slithering, copy];

    const [dr, dc] = dirToVec(snake.direction);

    // --- NEW tail-follows-head path mechanism ---
    const timer = setInterval(() => {
      let done = false;

      slithering = slithering.map((es) => {
        if (es.id !== copy.id) return es;

        // If all segments have fully exited, mark as finished
        if (es.segments.length === 0) {
          done = true;
          return es;
        }

        // 1. Calculate where the head advances next
        const currentHead = es.segments[es.segments.length - 1];
        const nextHead = [currentHead[0] + dr, currentHead[1] + dc];

        // 2. Create the new body sequence by appending the new head position
        let newSegments = [...es.segments, nextHead];

        // 3. Drop the tail segment to simulate forward movement
        newSegments.shift();

        // 4. Prune trailing elements as they clear beyond the grid boundaries
        // This allows the snake to shrink out segment-by-segment as it leaves
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

  function reset() {
    snakes = cloneSnakes(INITIAL_SNAKES);
    slithering = [];
    blockedIds = new Set();
    won = false;
  }
</script>

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
          r={Math.max(1, CELL * 0.05)}
          fill="rgba(128,100,80,0.2)"
        />
      </pattern>
    </defs>

    <rect
      width={SVG_W}
      height={SVG_H}
      rx="12"
      fill="var(--board-bg, #fff8f0)"
    />
    <rect width={SVG_W} height={SVG_H} rx="12" fill="url(#grid-dots)" />
    <rect
      width={SVG_W}
      height={SVG_H}
      rx="12"
      fill="none"
      stroke="rgba(128,100,80,0.25)"
      stroke-width="3"
    />

    {#each slithering as s (s.id)}
      {#if s.segments.length > 0}
        <SnakePath
          snake={s}
          cellSize={CELL}
          isBlocked={false}
          onClickSnake={() => {}}
        />
      {/if}
    {/each}

    {#each snakes as s (s.id)}
      <SnakePath
        snake={s}
        cellSize={CELL}
        isBlocked={blockedIds.has(s.id)}
        onClickSnake={() => handleClick(s)}
      />
    {/each}
  </svg>

  {#if won}
    <div class="win-overlay">
      <div class="win-modal">
        <div class="win-emoji">🎉</div>
        <h2>Board Cleared!</h2>
        <button class="play-again-btn" onclick={reset}>Play Again</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .board-wrap {
    position: relative;
    display: inline-block;
    max-width: 100%;
    margin: 0 auto;
  }

  .board-svg {
    display: block;
    filter: drop-shadow(0 10px 25px rgba(0, 0, 0, 0.15));
    max-width: 100%;
    height: auto;
  }

  .win-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
    border-radius: 12px;
    animation: fadeIn 0.3s ease-out forwards;
  }

  .win-modal {
    background: #ffffff;
    padding: 2rem;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(0, 0, 0, 0.05);
    animation: popIn 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  :global(body.dark) .win-modal {
    background: #2b1b17;
    color: #fff;
    border-color: rgba(255, 255, 255, 0.1);
  }

  .win-emoji {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .win-modal h2 {
    font-size: 1.75rem;
    font-weight: 800;
    margin-bottom: 1.25rem;
  }

  .play-again-btn {
    background: #ee5a24;
    color: white;
    font-size: 1rem;
    font-weight: 700;
    padding: 0.65rem 1.75rem;
    border-radius: 99px;
    border: none;
    cursor: pointer;
    transition:
      transform 0.2s,
      background 0.2s;
  }

  .play-again-btn:hover {
    transform: scale(1.05);
    background: #ff6b6b;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes popIn {
    from {
      transform: scale(0.85);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
