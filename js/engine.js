// js/engine.js
export const SIZES  = { TINY: 0, SMALL: 1, MEDIUM: 2, LARGE: 3 };
export const COLORS = { RED: 'red', YELLOW: 'yellow' };

// Stride for the implicitly-segmented 64-bit BigInt bitboard.
// Bit (size * BIT_STRIDE + cell) = 1 means player owns that size at that cell.
export const BIT_STRIDE = 16;

// 10 pre-computed 16-bit win masks for 4×4 board (row-major cell index = r*4+c)
// Bit i = cell i is in this winning line
export const WIN_MASKS = Object.freeze([
  0x000Fn, // row 0: cells  0, 1, 2, 3
  0x00F0n, // row 1: cells  4, 5, 6, 7
  0x0F00n, // row 2: cells  8, 9,10,11
  0xF000n, // row 3: cells 12,13,14,15
  0x1111n, // col 0: cells  0, 4, 8,12
  0x2222n, // col 1: cells  1, 5, 9,13
  0x4444n, // col 2: cells  2, 6,10,14
  0x8888n, // col 3: cells  3, 7,11,15
  0x8421n, // diag \: cells  0, 5,10,15
  0x1248n, // diag /: cells  3, 6, 9,12
]);

export const state = {
  board: [],
  stock: {},
  redMask:    0n,
  yellowMask: 0n,
  surfaceRed:    0n,
  surfaceYellow: 0n,
  currentTurn: 'red',
  gameStartTime: 0,
  moveLog: [],
  gameOver: false,
  winner: null,
};

export function initGame() {
  state.board        = Array.from({ length: 16 }, () => []);
  state.stock        = { red: [3,3,3,3], yellow: [3,3,3,3] };
  state.redMask      = 0n;
  state.yellowMask   = 0n;
  state.surfaceRed   = 0n;
  state.surfaceYellow= 0n;
  state.currentTurn  = 'red';
  state.gameStartTime= Date.now();
  state.moveLog      = [];
  state.gameOver     = false;
  state.winner       = null;
}

// Count set bits in a 16-bit BigInt (used by checkThreats and AI eval)
export function popcount16(n) {
  let count = 0;
  let m = n & 0xFFFFn;
  while (m > 0n) { m &= m - 1n; count++; }
  return count;
}

/**
 * Can a piece of `fromSize` (0-3) be placed on `cell` by `currentColor`?
 * True if: cell is empty, OR fromSize > top.size AND top.color !== currentColor.
 */
export function canPlace(fromSize, cell, currentColor) {
  const stack = state.board[cell];
  if (stack.length === 0) return true;
  const top = stack[stack.length - 1];
  if (top.color === currentColor) return false;
  return fromSize > top.size;
}

/**
 * Recompute the surface-mask bits for a single cell from its current stack top.
 * Must be called after every push/pop on state.board[cell].
 */
export function updateSurfaceCell(cell) {
  const bit = 1n << BigInt(cell);
  state.surfaceRed    &= ~bit;
  state.surfaceYellow &= ~bit;
  const stack = state.board[cell];
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  if (top.color === 'red')         state.surfaceRed    |= bit;
  else if (top.color === 'yellow') state.surfaceYellow |= bit;
}

/**
 * O(1) win check via 16-bit surface projection.
 * Returns true if `color` has 4-in-a-row on the visible surface.
 */
export function checkWin(color) {
  const surface = color === 'red' ? state.surfaceRed : state.surfaceYellow;
  return WIN_MASKS.some(mask => (surface & mask) === mask);
}

/**
 * Returns true if `color` has >= `count` pieces in some winning line
 * with no opponent piece blocking that same line.
 * Stock Exception Rule check: checkThreats(oppColor, 3).
 * AI threat detection: checkThreats(color, 3) or checkThreats(color, 2).
 */
export function checkThreats(color, count) {
  const surface    = color === 'red' ? state.surfaceRed    : state.surfaceYellow;
  const oppSurface = color === 'red' ? state.surfaceYellow : state.surfaceRed;
  return WIN_MASKS.some(mask => {
    if ((oppSurface & mask) !== 0n) return false; // opponent blocks this line
    return popcount16(surface & mask) >= count;
  });
}

/**
 * Returns all valid moves for `color` given current state.
 * Enforces the Stock Exception Rule: placing a new piece from stock onto an
 * occupied cell (gobbling) is only legal when the opponent has an active
 * 3-in-a-row threat on the surface.
 */
export function getValidMoves(color) {
  const moves = [];

  // ── Stock moves ──────────────────────────────────────────────
  for (let size = 0; size <= 3; size++) {
    if (state.stock[color][size] <= 0) continue;
    for (let cell = 0; cell < 16; cell++) {
      if (canPlace(size, cell, color)) {
        moves.push({ from: { type: 'stock', cell: null, size }, to: { cell }, color, timestamp: 0 });
      }
    }
  }

  // ── Board moves ──────────────────────────────────────────────
  for (let fromCell = 0; fromCell < 16; fromCell++) {
    const stack = state.board[fromCell];
    if (stack.length === 0) continue;
    const top = stack[stack.length - 1];
    if (top.color !== color) continue;
    for (let toCell = 0; toCell < 16; toCell++) {
      if (fromCell === toCell) continue;
      if (canPlace(top.size, toCell, color)) {
        moves.push({ from: { type: 'board', cell: fromCell, size: top.size }, to: { cell: toCell }, color, timestamp: 0 });
      }
    }
  }

  return moves;
}

/**
 * Apply a move. Mutates board, stock, bitboards, surface masks, moveLog, currentTurn.
 * Set move._searchMode = true to skip moveLog append (for AI search).
 * Stores move._gobbled (the top piece of the destination stack before this move, or null)
 * for undoMove. Do NOT reuse the same move object across apply/undo cycles without a
 * paired undo — _gobbled would be overwritten.
 */
export function applyMove(move) {
  const { from, to, color } = move;
  let piece;

  if (from.type === 'stock') {
    state.stock[color][from.size]--;
    piece = { color, size: from.size };
  } else {
    // Lift piece off source cell
    piece = state.board[from.cell].pop();
    const fromBit = 1n << BigInt(piece.size * BIT_STRIDE + from.cell);
    if (piece.color === 'red') state.redMask    &= ~fromBit;
    else                        state.yellowMask &= ~fromBit;
    updateSurfaceCell(from.cell);
  }

  // Save gobbled piece for undoMove
  const toStack = state.board[to.cell];
  move._gobbled = toStack.length > 0 ? toStack[toStack.length - 1] : null;

  // Place on destination
  toStack.push(piece);
  const toBit = 1n << BigInt(piece.size * BIT_STRIDE + to.cell);
  if (piece.color === 'red') state.redMask    |= toBit;
  else                        state.yellowMask |= toBit;
  updateSurfaceCell(to.cell);

  state.currentTurn = color === 'red' ? 'yellow' : 'red';

  if (!move._searchMode) {
    move.timestamp = Date.now() - state.gameStartTime;
    state.moveLog.push(move);
  }
}

/**
 * Undo a move previously applied with applyMove.
 * Requires move._gobbled to be set by applyMove (undefined means applyMove was never called).
 * Does NOT pop from moveLog — callers that need UI undo must pop moveLog themselves.
 * The gobbled piece stays in the destination stack; only its bitboard bit is restored.
 */
export function undoMove(move) {
  const { from, to, color } = move;

  // Remove piece from destination
  const toStack = state.board[to.cell];
  const piece   = toStack.pop();
  const toBit   = 1n << BigInt(piece.size * BIT_STRIDE + to.cell);
  if (piece.color === 'red') state.redMask    &= ~toBit;
  else                        state.yellowMask &= ~toBit;

  // Restore bitboard bit for the gobbled piece now re-exposed (it stays in the stack)
  if (move._gobbled) {
    const gobBit = 1n << BigInt(move._gobbled.size * BIT_STRIDE + to.cell);
    if (move._gobbled.color === 'red') state.redMask    |= gobBit;
    else                                state.yellowMask |= gobBit;
  }
  updateSurfaceCell(to.cell);

  // Restore source
  if (from.type === 'stock') {
    state.stock[color][from.size]++;
  } else {
    state.board[from.cell].push(piece);
    const fromBit = 1n << BigInt(piece.size * BIT_STRIDE + from.cell);
    if (piece.color === 'red') state.redMask    |= fromBit;
    else                        state.yellowMask |= fromBit;
    updateSurfaceCell(from.cell);
  }

  state.currentTurn = color;
}
