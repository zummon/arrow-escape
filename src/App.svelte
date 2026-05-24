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
    border-radius: 20px; /* Super rounded pill shape */
    font-family: var(--font-cute);
    font-weight: 700;
    font-size: 1rem;
    cursor: pointer;
    box-shadow: 0 4px 0 var(--text-color); /* Cute sticker/comic thick shadow */
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
</style>
