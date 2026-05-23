<script>
  /** @type {{ snake: object, cellSize: number, isBlocked: boolean, onClickSnake: Function }} */
  let { snake, cellSize, isBlocked = false, onClickSnake } = $props();

  // Convert [row, col] segments to SVG "x,y" pairs for <polyline>
  let points = $derived(
    snake.segments
      .map(([r, c]) => `${c * cellSize + cellSize / 2},${r * cellSize + cellSize / 2}`)
      .join(' ')
  );

  // Head is always the LAST segment
  let headSeg = $derived(snake.segments[snake.segments.length - 1]);
  let headX   = $derived(headSeg[1] * cellSize + cellSize / 2);
  let headY   = $derived(headSeg[0] * cellSize + cellSize / 2);

  // Arrow angle comes from the snake's direction string — stays stable even mid-slither
  let arrowAngle = $derived(() => {
    if (snake.direction === 'Right') return 0;
    if (snake.direction === 'Down')  return 90;
    if (snake.direction === 'Left')  return 180;
    if (snake.direction === 'Up')    return -90;
    return 0;
  });

  const AW = 0.38; // arrowhead width ratio
  const AH = 0.32; // arrowhead half-height ratio
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<g
  class="snake-group"
  class:blocked={isBlocked}
  onclick={onClickSnake}
  style="cursor: pointer;"
>
  <!-- Body stroke -->
  <polyline
    {points}
    stroke={snake.color}
    stroke-width={cellSize * 0.55}
    fill="none"
    stroke-linejoin="round"
    stroke-linecap="round"
    class="snake-body"
  />

  <!-- White outline rim for depth -->
  <polyline
    {points}
    stroke="rgba(255,255,255,0.18)"
    stroke-width={cellSize * 0.55 + 4}
    fill="none"
    stroke-linejoin="round"
    stroke-linecap="round"
    style="pointer-events:none;"
  />
  <!-- Re-draw body on top of rim -->
  <polyline
    {points}
    stroke={snake.color}
    stroke-width={cellSize * 0.55}
    fill="none"
    stroke-linejoin="round"
    stroke-linecap="round"
    style="pointer-events:none;"
  />

  <!-- Arrowhead at head position, rotated by direction (not segment delta) -->
  <g transform="translate({headX},{headY}) rotate({arrowAngle()})">
    <polygon
      points="{cellSize*AW},0 {-cellSize*AW*0.5},{-cellSize*AH} {-cellSize*AW*0.5},{cellSize*AH}"
      fill="white"
      opacity="0.92"
    />
  </g>
</g>

<style>
  .snake-group {
    transition: filter 0.15s;
  }
  .snake-group:hover .snake-body {
    filter: brightness(1.25) drop-shadow(0 0 6px rgba(255,255,255,0.4));
  }
  .blocked {
    animation: shake 0.35s ease-in-out;
  }
  @keyframes shake {
    0%   { transform: translate(0,0); }
    20%  { transform: translate(-5px, 0); }
    40%  { transform: translate(5px, 0); }
    60%  { transform: translate(-5px, 0); }
    80%  { transform: translate(5px, 0); }
    100% { transform: translate(0,0); }
  }
</style>
