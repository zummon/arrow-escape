/**
 * Returns the [dr, dc] delta for a given direction string.
 */
export function dirToVec(direction) {
  if (direction === 'Up')    return [-1,  0];
  if (direction === 'Down')  return [ 1,  0];
  if (direction === 'Left')  return [ 0, -1];
  if (direction === 'Right') return [ 0,  1];
  return [0, 0];
}

/**
 * Checks whether the HEAD of a snake can reach the grid edge unobstructed.
 * The body will slither through the same path — so only the head's lane matters.
 * 
 * @param {object} snake       - The snake to test ({ id, segments, direction })
 * @param {object[]} allSnakes - All active snakes on the board
 * @param {number} size        - Grid size (NxN)
 * @returns {boolean}
 */
export function checkEscape(snake, allSnakes, size) {
  const { segments, direction } = snake;
  // Convention: last segment = head, first segment = tail
  const [hr, hc] = segments[segments.length - 1];
  const [dr, dc] = dirToVec(direction);

  // Collect cells occupied by every OTHER snake
  const blocked = new Set();
  for (const other of allSnakes) {
    if (other.id === snake.id) continue;
    for (const [r, c] of other.segments) {
      blocked.add(`${r},${c}`);
    }
  }

  // Walk the head's path cell by cell until it exits the grid
  let r = hr + dr, c = hc + dc;
  while (r >= 0 && r < size && c >= 0 && c < size) {
    if (blocked.has(`${r},${c}`)) return false; // something is in the way
    r += dr;
    c += dc;
  }
  return true; // Clear path — head (and body behind it) can escape
}
