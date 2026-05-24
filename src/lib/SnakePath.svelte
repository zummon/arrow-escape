<script>
  /** @type {{ snake: object, cellSize: number, isBlocked: boolean, onClickSnake: Function }} */
  let { snake, cellSize, isBlocked = false, onClickSnake } = $props();

  // Transform coordinates into path pairs dynamically mapping space coordinates to center vectors
  let points = $derived(
    snake.segments
      .map(
        ([r, c]) =>
          `${c * cellSize + cellSize / 2},${r * cellSize + cellSize / 2}`,
      )
      .join(" "),
  );

  let headSeg = $derived(snake.segments[snake.segments.length - 1]);
  let headX = $derived(headSeg[1] * cellSize + cellSize / 2);
  let headY = $derived(headSeg[0] * cellSize + cellSize / 2);

  let arrowAngle = $derived(() => {
    if (snake.direction === "Right") return 0;
    if (snake.direction === "Down") return 90;
    if (snake.direction === "Left") return 180;
    if (snake.direction === "Up") return -90;
    return 0;
  });

  // Balanced scaling layout parameters mapped directly down from cell sizes
  let bodyWidth = $derived(cellSize * 0.56);
  let rimWidth = $derived(cellSize * 0.56 + Math.max(1.5, cellSize * 0.1));
  let arrowScale = $derived(cellSize * 0.26);
</script>

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

  <g transform="translate({headX},{headY}) rotate({arrowAngle()})">
    <polygon
      points="{arrowScale * 1.15},0 {-arrowScale * 0.55},{-arrowScale *
        0.8} {-arrowScale * 0.55},{arrowScale * 0.8}"
      fill="white"
      opacity="0.95"
      style="pointer-events:none;"
    />
  </g>
</g>

<style>
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
