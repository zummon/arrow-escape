import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // GitHub Pages serves this repo from a subpath, out of the committed
  // docs/ folder — relative asset URLs keep both working.
  base: './',
  build: {
    outDir: 'docs',
  },
});