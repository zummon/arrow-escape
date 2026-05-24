<script>
  import Board from "./lib/Board.svelte";
  import "./app.css";

  let resetKey = $state(0);

  function handleReset() {
    resetKey++;
  }
</script>

<main class="app-container">
  <header>
    <h1>Arrow Escape</h1>
    <p>Click a snake to escape — only if its head's path is clear!</p>
    <button class="reset-btn" onclick={handleReset}>↺ Reset Map</button>
  </header>

  <div class="game-area">
    {#key resetKey}
      <Board onWin={() => console.log("Board completely cleared!")} />
    {/key}
  </div>
</main>

<style>
  :global(:root) {
    --board-bg: #fff8f0;
    --text-color: #4a3728;
    --bg-color: #f7ebe1;
  }

  :global(body) {
    background-color: var(--bg-color);
    color: var(--text-color);
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
    margin: 0;
    padding: 0;
  }

  .app-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 1rem;
    text-align: center;
    width: 100%;
    box-sizing: border-box;
  }

  header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: 2.2rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.5px;
  }

  p {
    font-size: 0.95rem;
    opacity: 0.8;
    max-width: 360px;
    margin: 0;
  }

  .reset-btn {
    margin-top: 0.5rem;
    background: transparent;
    border: 2px solid var(--text-color);
    color: var(--text-color);
    padding: 0.45rem 1.2rem;
    border-radius: 99px;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .reset-btn:hover {
    background: var(--text-color);
    color: var(--bg-color);
  }

  .game-area {
    display: flex;
    justify-content: center;
    width: 100%;
    overflow: auto; /* Adds touch scroll on smaller mobile breakpoints */
    padding: 10px;
    box-sizing: border-box;
  }
</style>
