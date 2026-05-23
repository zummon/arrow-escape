<script>
  import Board from './lib/Board.svelte';
  import './app.css';

  let resetKey = $state(0);

  function handleReset() {
    resetKey++;
  }
</script>

<main class="app-container">
  <header>
    <h1>Arrow Escape</h1>
    <p>Click a snake to escape — only if its head's path is clear!</p>
    <button class="reset-btn" onclick={handleReset}>↺ Reset</button>
  </header>

  <div class="game-area">
    {#key resetKey}
      <Board onWin={() => {}} />
    {/key}
  </div>
</main>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 1rem;
    text-align: center;
    width: 100%;
  }

  header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  h1 {
    font-size: 2.4rem;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: var(--text-color);
  }

  p {
    font-size: 1rem;
    opacity: 0.75;
    max-width: 340px;
  }

  .reset-btn {
    margin-top: 0.25rem;
    background: transparent;
    border: 2px solid var(--text-color);
    color: var(--text-color);
    padding: 0.45rem 1.2rem;
    border-radius: 99px;
    font-weight: 600;
    font-size: 0.95rem;
    opacity: 0.65;
    transition: opacity 0.2s, background 0.2s;
  }

  .reset-btn:hover {
    opacity: 1;
    background: rgba(128, 80, 40, 0.08);
  }

  .game-area {
    display: flex;
    justify-content: center;
  }
</style>
