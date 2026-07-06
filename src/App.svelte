<script>
  import "./app.css";
  import { pickShape } from "./lib/shapes.js";
  import { generateBoard } from "./lib/generator.js";

  const CELL = 24;
  const BLOCK = CELL * 2;
  const STEP_MS = 75;

  let board = $state(generateBoard(pickShape()));
  let snakes = $state(board.snakes.map(cloneSnake));
  let slithering = $state([]);
  let blockedIds = $state(new Set());
  let won = $state(false);

  const svgW = $derived(board.cols * CELL);
  const svgH = $derived(board.rows * CELL);
  const boardPath = $derived(
    board.blocks
      .map(([R, C]) => `M${C * BLOCK} ${R * BLOCK}h${BLOCK}v${BLOCK}h${-BLOCK}Z`)
      .join(""),
  );

  function cloneSnake(s) {
    return { ...s, segments: s.segments.map((seg) => [...seg]) };
  }

  function newGame() {
    board = generateBoard(pickShape(board.shapeName));
    snakes = board.snakes.map(cloneSnake);
    slithering = [];
    blockedIds = new Set();
    won = false;
  }

  function dirToVec(direction) {
    if (direction === "Up") return [-1, 0];
    if (direction === "Down") return [1, 0];
    if (direction === "Left") return [0, -1];
    return [0, 1];
  }

  function checkEscape(snake) {
    const [hr, hc] = snake.segments[snake.segments.length - 1];
    const [dr, dc] = dirToVec(snake.direction);

    const blocked = new Set();
    for (const other of snakes) {
      if (other.id === snake.id) continue;
      for (const [r, c] of other.segments) {
        blocked.add(`${r},${c}`);
      }
    }

    let r = hr + dr, c = hc + dc;
    while (r >= 0 && r < board.rows && c >= 0 && c < board.cols) {
      if (blocked.has(`${r},${c}`)) return false;
      r += dr;
      c += dc;
    }
    return true;
  }

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

    if (!checkEscape(snake)) {
      markBlocked(snake.id);
      return;
    }

    snakes = snakes.filter((s) => s.id !== snake.id);
    const copy = cloneSnake(snake);
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
            r >= -1 && r < board.rows + 1 && c >= -1 && c < board.cols + 1,
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
    <p class="board-info">{board.shapeName} board · {snakes.length} snakes left</p>
    <button class="reset-btn" onclick={newGame}>↺ New Board</button>
  </header>

  <div class="game-area">
    <div class="board-wrap">
      <svg
        width={svgW}
        height={svgH}
        class="board-svg"
        style="overflow: visible;"
      >
        <path d={boardPath} class="board-rim" />
        <path d={boardPath} class="board-base" />

        {#each board.cells as [r, c]}
          <circle
            cx={c * CELL + CELL / 2}
            cy={r * CELL + CELL / 2}
            r="3"
            fill="var(--text-color)"
            opacity="0.1"
          />
        {/each}

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
            <button class="play-again-btn" onclick={newGame}>Next Board ➜</button>
          </div>
        </div>
      {/if}
    </div>
  </div>

  <footer class="game-footer">
    <p>
      Made by Ai,
      <a class="underline" target="_blank" rel="noopener" href="https://github.com/zummon"
        >Teerapat Anantarattanachai</a
      >
    </p>
    <p class="footer-note">Something breaks, needs upgrade. Let me know</p>
  </footer>
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

  .board-info {
    font-size: 0.92rem;
    font-weight: 700;
    opacity: 0.85;
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
    padding: 16px;
  }

  .board-svg {
    display: block;
    filter: drop-shadow(0 12px 36px var(--tile-shadow));
  }

  .board-rim {
    fill: var(--board-bg);
    stroke: var(--text-color);
    stroke-opacity: 0.15;
    stroke-width: 28;
    stroke-linejoin: round;
  }

  .board-base {
    fill: var(--board-bg);
    stroke: var(--board-bg);
    stroke-width: 20;
    stroke-linejoin: round;
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

  .game-footer p {
    font-size: 0.88rem;
    color: inherit;
  }

  .game-footer .footer-note {
    font-size: 0.8rem;
    opacity: 0.8;
    margin-top: 0.25rem;
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
