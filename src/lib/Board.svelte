<script>
  import SnakePath from './SnakePath.svelte';
  import { checkEscape, dirToVec } from './gameLogic.js';
  import { GRID_SIZE, INITIAL_SNAKES } from './levels.js';

  let { onWin } = $props();

  const CELL   = 72;            // px per grid cell
  const STEP_MS = 95;           // ms between each 1-cell slither step
  const SVG_W  = GRID_SIZE * CELL;
  const SVG_H  = GRID_SIZE * CELL;

  // Deep-clone helper so we never mutate the source constants
  function cloneSnakes(src) {
    return src.map(s => ({ ...s, segments: s.segments.map(seg => [...seg]) }));
  }

  // --- Reactive state ---
  let snakes        = $state(cloneSnakes(INITIAL_SNAKES));  // still on board
  let slithering    = $state([]);                            // escaping (animating off)
  let blockedIds    = $state(new Set());                     // IDs showing shake
  let won           = $state(false);

  // ---- Helpers ----
  function markBlocked(id) {
    blockedIds = new Set([...blockedIds, id]);
    setTimeout(() => {
      blockedIds = new Set([...blockedIds].filter(x => x !== id));
    }, 400);
  }

  function checkWin() {
    if (snakes.length === 0 && slithering.length === 0) {
      setTimeout(() => { won = true; }, 350);
    }
  }

  // ---- Main click handler ----
  function handleClick(snake) {
    // Ignore clicks on snakes that are already slithering off
    if (slithering.find(s => s.id === snake.id)) return;
    if (blockedIds.has(snake.id)) return;

    if (!checkEscape(snake, snakes, GRID_SIZE)) {
      markBlocked(snake.id);
      return;
    }

    // Remove from active board immediately (so it can't block others mid-slither)
    snakes = snakes.filter(s => s.id !== snake.id);

    // Kick off slither animation
    const copy = { ...snake, segments: snake.segments.map(seg => [...seg]) };
    slithering = [...slithering, copy];

    const [dr, dc] = dirToVec(snake.direction);

    const timer = setInterval(() => {
      let done = false;

      slithering = slithering.map(es => {
        if (es.id !== copy.id) return es;

        // Move every segment one cell in the escape direction
        const moved = es.segments.map(([r, c]) => [r + dr, c + dc]);

        // Keep rendering as long as at least one segment is still near the viewport
        // (generous margin so we see the full tail exit)
        const visible = moved.filter(([r, c]) =>
          r > -1.5 && r < GRID_SIZE + 1.5 &&
          c > -1.5 && c < GRID_SIZE + 1.5
        );

        if (visible.length === 0) {
          done = true;
          return { ...es, segments: [] }; // will be pruned below
        }
        return { ...es, segments: visible };
      });

      if (done) {
        clearInterval(timer);
        slithering = slithering.filter(s => s.id !== copy.id);
        checkWin();
      }
    }, STEP_MS);
  }

  // ---- Reset ----
  function reset() {
    snakes     = cloneSnakes(INITIAL_SNAKES);
    slithering = [];
    blockedIds = new Set();
    won        = false;
  }
</script>

<div class="board-wrap">
  <svg
    width={SVG_W}
    height={SVG_H}
    class="board-svg"
    style="overflow:visible;"
  >
    <defs>
      <!-- subtle grid pattern -->
      <pattern id="grid-dots" width={CELL} height={CELL} patternUnits="userSpaceOnUse">
        <circle cx={CELL/2} cy={CELL/2} r="2" fill="rgba(128,100,80,0.18)" />
      </pattern>
    </defs>

    <!-- Board background -->
    <rect width={SVG_W} height={SVG_H} rx="12" fill="var(--board-bg)" />
    <!-- Dot grid overlay -->
    <rect width={SVG_W} height={SVG_H} rx="12" fill="url(#grid-dots)" />
    <!-- Board border -->
    <rect
      width={SVG_W} height={SVG_H} rx="12"
      fill="none"
      stroke="rgba(255,255,255,0.25)"
      stroke-width="3"
      stroke-dasharray="10 8"
    />

    <!-- Slithering (escaping) snakes — rendered below active so they slide "under" the border -->
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

    <!-- Active snakes -->
    {#each snakes as s (s.id)}
      <SnakePath
        snake={s}
        cellSize={CELL}
        isBlocked={blockedIds.has(s.id)}
        onClickSnake={() => handleClick(s)}
      />
    {/each}
  </svg>

  <!-- Win overlay -->
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
  }

  .board-svg {
    display: block;
    filter: drop-shadow(0 8px 32px rgba(0,0,0,0.18));
  }

  /* Win overlay */
  .win-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    background: rgba(0,0,0,0.25);
    backdrop-filter: blur(6px);
    border-radius: 12px;
    animation: fadeIn 0.35s ease-out;
  }

  .win-modal {
    background: var(--bg-color);
    padding: 2.5rem 3rem;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 12px 48px rgba(0,0,0,0.25);
    border: 2px solid rgba(255,255,255,0.15);
    animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .win-emoji {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .win-modal h2 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    color: var(--text-color);
  }

  .play-again-btn {
    background: var(--btn-bg);
    color: var(--text-color);
    font-size: 1.1rem;
    font-weight: 700;
    padding: 0.75rem 2rem;
    border-radius: 99px;
    border: none;
    cursor: pointer;
    transition: transform 0.2s, background 0.2s;
    box-shadow: 0 4px 12px var(--tile-shadow);
  }

  .play-again-btn:hover {
    background: var(--btn-hover);
    transform: scale(1.06);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes popIn {
    from { transform: scale(0.85); opacity: 0; }
    to   { transform: scale(1);    opacity: 1; }
  }
</style>
