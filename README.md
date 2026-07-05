# Arrow Escape

A tiny puzzle game built with Svelte 5 + SVG. Every cell of the board is
covered by a snake; click a snake to send it sliding off in the direction of
its arrow — but only if its path is clear. Untangle the whole board to win,
then get a fresh board in a new shape (square, diamond, ring, heart, ...).

## How boards are generated

Boards are always 100% covered and always solvable:

1. The shape is defined on a coarse grid of 2x2-cell blocks (`src/lib/shapes.js`).
2. A random spanning tree over the blocks is walked along its contour,
   producing a Hamiltonian cycle that visits every cell exactly once.
3. The cycle is chopped into snakes of 3-7 segments, so they tile the shape.
4. A peeling pass assigns each snake's arrow such that a full removal order
   exists. Since removing a snake only ever frees cells, any order of valid
   moves the player finds also clears the board — no dead ends.

See `src/lib/generator.js`. Property tests: `npm run verify`.

## Develop

```sh
npm install
npm run dev      # local dev server
npm run build    # production build
npm run verify   # generator property tests (coverage + solvability)
```
