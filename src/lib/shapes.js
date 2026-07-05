// Board shapes drawn on a coarse grid: every '#' is a block of 2x2 cells.
// The generator needs blocks (not single cells) so it can thread one
// Hamiltonian cycle through the whole shape.
//
// Rules for adding a shape:
//  - all blocks must be connected (edge-adjacent)
//  - every horizontal run of blocks must be at least 2 wide
//    (the row-based fallback generator relies on this)
export const SHAPES = [
  {
    name: 'Square',
    mask: [
      '#########',
      '#########',
      '#########',
      '#########',
      '#########',
      '#########',
      '#########',
      '#########',
      '#########',
    ],
  },
  {
    name: 'Diamond',
    mask: [
      '....##....',
      '...####...',
      '..######..',
      '.########.',
      '##########',
      '##########',
      '.########.',
      '..######..',
      '...####...',
      '....##....',
    ],
  },
  {
    name: 'Plus',
    mask: [
      '...####...',
      '...####...',
      '...####...',
      '##########',
      '##########',
      '##########',
      '##########',
      '...####...',
      '...####...',
      '...####...',
    ],
  },
  {
    name: 'Ring',
    mask: [
      '..######..',
      '.########.',
      '##########',
      '###....###',
      '###....###',
      '###....###',
      '###....###',
      '##########',
      '.########.',
      '..######..',
    ],
  },
  {
    name: 'Heart',
    mask: [
      '.###..###.',
      '##########',
      '##########',
      '##########',
      '.########.',
      '.########.',
      '..######..',
      '...####...',
      '....##....',
    ],
  },
  {
    name: 'Hexagon',
    mask: [
      '..######..',
      '.########.',
      '##########',
      '##########',
      '##########',
      '##########',
      '.########.',
      '..######..',
    ],
  },
  {
    name: 'Bowtie',
    mask: [
      '##.....##',
      '###...###',
      '####.####',
      '#########',
      '####.####',
      '###...###',
      '##.....##',
    ],
  },
];

export function pickShape(excludeName) {
  const pool = SHAPES.filter((s) => s.name !== excludeName);
  return pool[Math.floor(Math.random() * pool.length)];
}
