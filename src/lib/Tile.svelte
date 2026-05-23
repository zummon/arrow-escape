<script>
  import { createEventDispatcher } from 'svelte';
  
  export let tile;
  const dispatch = createEventDispatcher();
  
  let isBlocked = false;
  
  function handleClick() {
    if (isBlocked) return;
    dispatch('clickTile', { tile, setBlocked });
  }
  
  function setBlocked() {
    isBlocked = true;
    setTimeout(() => {
      isBlocked = false;
    }, 300); // match animation duration
  }
  
  // Map directions to SVG paths
  const icons = {
    Up: "M12 4l-8 8h6v8h4v-8h6z",
    Down: "M12 20l8-8h-6v-8h-4v8h-6z",
    Left: "M4 12l8 8v-6h8v-4h-8v-6z",
    Right: "M20 12l-8-8v6h-8v4h8v6z"
  };
</script>

<button 
  class="tile {tile.color} {isBlocked ? 'blocked' : ''}"
  on:click={handleClick}
  aria-label="Tile pointing {tile.direction}"
>
  <svg viewBox="0 0 24 24" class="arrow">
    <path fill="currentColor" d={icons[tile.direction]} />
  </svg>
</button>

<style>
  .tile {
    width: 100%;
    height: 100%;
    aspect-ratio: 1;
    border-radius: 12px;
    display: flex;
    justify-content: center;
    align-items: center;
    box-shadow: 0 4px 6px var(--tile-shadow);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    cursor: pointer;
    border: 2px solid rgba(255, 255, 255, 0.2);
    /* Ensure the button doesn't look like default button */
    outline: none;
    -webkit-tap-highlight-color: transparent;
  }
  
  .tile:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 12px var(--tile-shadow);
  }
  
  .tile:active {
    transform: scale(0.95);
  }
  
  .peach {
    background-color: var(--tile-peach);
  }
  
  .lavender {
    background-color: var(--tile-lavender);
  }
  
  .arrow {
    width: 60%;
    height: 60%;
    color: var(--text-color);
    opacity: 0.8;
  }
  
  .blocked {
    animation: bump 0.3s ease-in-out;
  }
  
  @keyframes bump {
    0% { transform: translate(0, 0); }
    20% { transform: translate(-4px, 0) rotate(-2deg); }
    40% { transform: translate(4px, 0) rotate(2deg); }
    60% { transform: translate(-4px, 0) rotate(-2deg); }
    80% { transform: translate(4px, 0) rotate(2deg); }
    100% { transform: translate(0, 0); }
  }
</style>
