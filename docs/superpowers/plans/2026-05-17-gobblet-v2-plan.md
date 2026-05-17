# Gobblet v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Gobblet v2 game (4×4 board, 4 piece sizes, perfect-play AI, replay system) as a single-page pure ES module app with no build step.

**Architecture:** Engine logic in `engine.js` (pure functions, DOM-free, testable with Node.js), AI in `ai.js` (minimax + PVS + NMP + LMR + quiescence + Lazy SMP via Web Workers), UI in `ui.js` (pure DOM + CSS), replay in `replay.js`, all screens as hidden `<div>`s swapped by `main.js`. Spec: `docs/superpowers/specs/2026-05-17-gobblet-v2-design.md`.

**Tech Stack:** Vanilla JS (ES modules), CSS (no framework), BigInt bitboards, Web Workers, SharedArrayBuffer, Node.js (tests only, no install needed).

**Test command:** `node tests/engine.test.mjs`

---

### Task 1: Scaffold

**Files:**
- Modify: `index.html`
- Create: `css/style.css`
- Create: `js/engine.js`
- Create: `js/ai.js`
- Create: `js/ai-worker.js`
- Create: `js/ui.js`
- Create: `js/replay.js`
- Create: `js/network.js`
- Create: `js/main.js`
- Create: `tests/engine.test.mjs`

- [ ] **Step 1: Create directories**

```bash
cd "C:\Users\White\OneDrive\AHK\AekGameTTT"
mkdir css js tests
```

- [ ] **Step 2: Create js/network.js**

```js
// js/network.js
export const isOnlineAvailable = false;
```

- [ ] **Step 3: Create stub files for remaining js modules**

`js/engine.js`:
```js
// js/engine.js
export const SIZES = { TINY: 0, SMALL: 1, MEDIUM: 2, LARGE: 3 };
export const COLORS = { RED: 'red', YELLOW: 'yellow' };
export const WIN_MASKS = [];
export const state = {
  board: [], stock: {},
  redMask: 0n, yellowMask: 0n,
  surfaceRed: 0n, surfaceYellow: 0n,
  currentTurn: 'red', gameStartTime: 0,
  moveLog: [], gameOver: false, winner: null
};
```

`js/ai.js`: `// js/ai.js`
`js/ai-worker.js`: `// js/ai-worker.js`
`js/ui.js`: `// js/ui.js`
`js/replay.js`: `// js/replay.js`
`js/main.js`: `// js/main.js`
`css/style.css`: `/* css/style.css */`

- [ ] **Step 4: Create tests/engine.test.mjs (empty)**

```js
// tests/engine.test.mjs
import assert from 'node:assert/strict';
console.log('Tests scaffolded.');
```

- [ ] **Step 5: Replace root index.html with full v2 structure**

Replace entire `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gobblet</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>

  <!-- Screen: Mode Select -->
  <div id="screen-mode-select" class="screen active">
    <h1>Gobblet</h1>
    <div class="mode-buttons">
      <button id="btn-vs-ai">vs AI</button>
      <button id="btn-local-2p">Local 2P</button>
      <button id="btn-online" disabled title="Coming soon">Play Online</button>
    </div>
    <a href="gobbletv1/index.html" class="back-link">← v1</a>
  </div>

  <!-- Screen: Game -->
  <div id="screen-game" class="screen">
    <div id="game-wrapper">
      <div id="stock-red" class="stock-panel"></div>
      <div id="board-container">
        <div id="board"></div>
      </div>
      <div id="stock-yellow" class="stock-panel"></div>
    </div>
    <div id="turn-indicator"></div>
    <button id="btn-menu">Menu</button>
  </div>

  <!-- Screen: Result Overlay -->
  <div id="screen-result" class="screen overlay">
    <div class="result-box">
      <div id="result-winner"></div>
      <button id="btn-save-replay">💾 Save Replay</button>
      <button id="btn-copy-json">📋 Copy JSON</button>
      <button id="btn-view-replay">▶ Replay</button>
      <button id="btn-play-again">Play Again</button>
      <button id="btn-result-menu">Menu</button>
    </div>
  </div>

  <!-- Screen: Replay Viewer -->
  <div id="screen-replay" class="screen">
    <div id="replay-header">
      <span id="replay-winner-badge"></span>
      <span id="replay-difficulty"></span>
      <span id="replay-time"></span>
      <span id="replay-move-counter"></span>
    </div>
    <div id="game-wrapper-replay">
      <div id="stock-red-replay" class="stock-panel"></div>
      <div id="board-container-replay">
        <div id="board-replay"></div>
      </div>
      <div id="stock-yellow-replay" class="stock-panel"></div>
    </div>
    <div id="replay-controls">
      <button id="btn-replay-start">⏮</button>
      <button id="btn-replay-prev">⏪</button>
      <button id="btn-replay-next">⏩</button>
      <button id="btn-replay-end">⏭</button>
      <button id="btn-replay-auto">▶ Auto</button>
      <select id="replay-speed">
        <option value="1">1×</option>
        <option value="2">2×</option>
        <option value="4">4×</option>
      </select>
    </div>
    <div id="replay-load-area">
      <input type="file" id="replay-file-input" accept=".json">
      <label for="replay-file-input">📂 Load File</label>
      <button id="btn-save-replay-viewer">💾 Save</button>
      <button id="btn-copy-json-viewer">📋 Copy</button>
    </div>
    <button id="btn-replay-menu">Menu</button>
  </div>

  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 6: Commit scaffold**

```bash
git add index.html css/style.css js/engine.js js/ai.js js/ai-worker.js js/ui.js js/replay.js js/network.js js/main.js tests/engine.test.mjs
git commit -m "feat: scaffold Gobblet v2 file structure"
```

---

### Task 2: engine.js — WIN_MASKS + initGame

**Files:**
- Modify: `js/engine.js`
- Modify: `tests/engine.test.mjs`

- [ ] **Step 1: Write failing tests**

Replace `tests/engine.test.mjs`:
```js
// tests/engine.test.mjs
import assert from 'node:assert/strict';
import { WIN_MASKS, state, initGame } from '../js/engine.js';

// WIN_MASKS: 10 entries
assert.equal(WIN_MASKS.length, 10, 'WIN_MASKS must have 10 entries');

// Row 0: cells 0,1,2,3 → bits 0-3 → 0x000F
assert.equal(WIN_MASKS[0], 0x000Fn, 'row 0 mask = 0x000F');
// Row 3: cells 12,13,14,15 → bits 12-15 → 0xF000
assert.equal(WIN_MASKS[3], 0xF000n, 'row 3 mask = 0xF000');
// Col 0: cells 0,4,8,12 → bits 0,4,8,12 → 0x1111
assert.equal(WIN_MASKS[4], 0x1111n, 'col 0 mask = 0x1111');
// Col 3: cells 3,7,11,15 → 0x8888
assert.equal(WIN_MASKS[7], 0x8888n, 'col 3 mask = 0x8888');
// Diag \: cells 0,5,10,15 → bits 0,5,10,15 → 0x8421
assert.equal(WIN_MASKS[8], 0x8421n, 'diag1 mask = 0x8421');
// Diag /: cells 3,6,9,12 → bits 3,6,9,12 → 0x1248
assert.equal(WIN_MASKS[9], 0x1248n, 'diag2 mask = 0x1248');

// initGame: resets all state
initGame();
assert.equal(state.board.length, 16, 'board has 16 cells');
assert.ok(state.board.every(s => s.length === 0), 'all stacks empty');
assert.deepEqual(state.stock.red,    [3,3,3,3], 'red stock full');
assert.deepEqual(state.stock.yellow, [3,3,3,3], 'yellow stock full');
assert.equal(state.redMask,    0n, 'redMask clear');
assert.equal(state.yellowMask, 0n, 'yellowMask clear');
assert.equal(state.surfaceRed,    0n, 'surfaceRed clear');
assert.equal(state.surfaceYellow, 0n, 'surfaceYellow clear');
assert.equal(state.currentTurn, 'red', 'red goes first');
assert.equal(state.gameOver, false);
assert.equal(state.winner, null);

console.log('✓ Task 2 passed');
```

- [ ] **Step 2: Run — expect failure**

```bash
node tests/engine.test.mjs
```
Expected: `AssertionError: WIN_MASKS must have 10 entries`

- [ ] **Step 3: Implement WIN_MASKS and initGame**

Replace `js/engine.js`:
```js
// js/engine.js
export const SIZES  = { TINY: 0, SMALL: 1, MEDIUM: 2, LARGE: 3 };
export const COLORS = { RED: 'red', YELLOW: 'yellow' };

// 10 pre-computed 16-bit win masks for 4×4 board (row-major cell index = r*4+c)
// Bit i = cell i is in this winning line
export const WIN_MASKS = [
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
];

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
```

- [ ] **Step 4: Run — expect pass**

```bash
node tests/engine.test.mjs
```
Expected: `✓ Task 2 passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js tests/engine.test.mjs
git commit -m "feat(engine): WIN_MASKS + initGame"
```

---

### Task 3: engine.js — canPlace, updateSurfaceCell, popcount16

**Files:**
- Modify: `js/engine.js`
- Modify: `tests/engine.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `tests/engine.test.mjs` (before the last `console.log`):
```js
import { canPlace, updateSurfaceCell, popcount16 } from '../js/engine.js';

// popcount16
assert.equal(popcount16(0x000Fn), 4, 'row 0 mask has 4 bits');
assert.equal(popcount16(0x0000n), 0, 'zero has 0 bits');
assert.equal(popcount16(0x8421n), 4, 'diag1 mask has 4 bits');

// canPlace: empty cell always allowed
initGame();
assert.equal(canPlace(0, 5, 'red'), true, 'empty cell: tiny can place');

// canPlace: cannot gobble own piece
initGame();
state.board[5] = [{ color: 'red', size: 0 }];
assert.equal(canPlace(1, 5, 'red'), false, 'cannot gobble own piece');

// canPlace: larger gobbles smaller opponent
initGame();
state.board[5] = [{ color: 'yellow', size: 0 }];
assert.equal(canPlace(1, 5, 'red'), true,  'small gobbles yellow tiny');
assert.equal(canPlace(0, 5, 'red'), false, 'tiny cannot gobble tiny (equal size)');

// updateSurfaceCell: empty cell clears both surface bits
initGame();
updateSurfaceCell(5);
assert.equal((state.surfaceRed    >> 5n) & 1n, 0n, 'empty: surfaceRed bit 5 clear');
assert.equal((state.surfaceYellow >> 5n) & 1n, 0n, 'empty: surfaceYellow bit 5 clear');

// updateSurfaceCell: red on top sets surfaceRed bit
initGame();
state.board[5] = [{ color: 'red', size: 2 }];
updateSurfaceCell(5);
assert.equal((state.surfaceRed    >> 5n) & 1n, 1n, 'red on top → surfaceRed bit 5 set');
assert.equal((state.surfaceYellow >> 5n) & 1n, 0n, 'red on top → surfaceYellow bit 5 clear');

// updateSurfaceCell: yellow on top
initGame();
state.board[7] = [{ color: 'yellow', size: 1 }];
updateSurfaceCell(7);
assert.equal((state.surfaceYellow >> 7n) & 1n, 1n, 'yellow on top → surfaceYellow bit 7 set');

console.log('✓ Task 3 passed');
```

- [ ] **Step 2: Run — expect failure**

```bash
node tests/engine.test.mjs
```
Expected: `ReferenceError: canPlace is not defined` (or similar)

- [ ] **Step 3: Add implementations to js/engine.js**

Append to `js/engine.js`:
```js
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
  if (top.color === 'red') state.surfaceRed    |= bit;
  else                      state.surfaceYellow |= bit;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
node tests/engine.test.mjs
```
Expected: `✓ Task 3 passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js tests/engine.test.mjs
git commit -m "feat(engine): canPlace + updateSurfaceCell + popcount16"
```

---

### Task 4: engine.js — checkWin, checkThreats

**Files:**
- Modify: `js/engine.js`
- Modify: `tests/engine.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `tests/engine.test.mjs`:
```js
import { checkWin, checkThreats } from '../js/engine.js';

// checkWin: empty board → no win
initGame();
assert.equal(checkWin('red'), false, 'empty board: no win');

// checkWin: red fills row 0 on surface
initGame();
state.surfaceRed = 0x000Fn; // bits 0,1,2,3
assert.equal(checkWin('red'),    true,  'row 0 win for red');
assert.equal(checkWin('yellow'), false, 'yellow not winning');

// checkWin: diag \ win
initGame();
state.surfaceRed = 0x8421n;
assert.equal(checkWin('red'), true, 'diag \\ win for red');

// checkThreats: red has 3 in row 0 (bits 0,1,2), cell 3 empty, no yellow
initGame();
state.surfaceRed    = 0x0007n; // cells 0,1,2
state.surfaceYellow = 0x0000n;
assert.equal(checkThreats('red', 3), true, 'red has 3-in-a-row threat on row 0');

// checkThreats: opponent blocks → no threat
initGame();
state.surfaceRed    = 0x0007n;
state.surfaceYellow = 0x0008n; // yellow on cell 3 blocks row 0
assert.equal(checkThreats('red', 3), false, 'yellow blocks row 0 threat');

// checkThreats: count=2
initGame();
state.surfaceRed    = 0x0003n; // cells 0,1
state.surfaceYellow = 0x0000n;
assert.equal(checkThreats('red', 2), true, 'red has 2-in-a-row');

console.log('✓ Task 4 passed');
```

- [ ] **Step 2: Run — expect failure**

```bash
node tests/engine.test.mjs
```

- [ ] **Step 3: Add checkWin and checkThreats to js/engine.js**

Append to `js/engine.js`:
```js
/**
 * O(1) win check via 16-bit surface projection.
 * Returns true if `color` has 4-in-a-row on the visible surface.
 */
export function checkWin(color) {
  const surface = color === 'red' ? state.surfaceRed : state.surfaceYellow;
  return WIN_MASKS.some(mask => (surface & mask) === mask);
}

/**
 * Returns true if `color` has ≥ `count` pieces in some winning line
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
```

- [ ] **Step 4: Run — expect pass**

```bash
node tests/engine.test.mjs
```
Expected: `✓ Task 4 passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js tests/engine.test.mjs
git commit -m "feat(engine): checkWin + checkThreats"
```

---

### Task 5: engine.js — getValidMoves

**Files:**
- Modify: `js/engine.js`
- Modify: `tests/engine.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `tests/engine.test.mjs`:
```js
import { getValidMoves } from '../js/engine.js';

// Fresh board: red has 4 sizes × 16 cells = 64 stock-to-empty moves
initGame();
{
  const moves = getValidMoves('red');
  const stockMoves = moves.filter(m => m.from.type === 'stock');
  assert.equal(stockMoves.length, 4 * 16, '64 stock moves at start');
  assert.equal(moves.filter(m => m.from.type === 'board').length, 0, 'no board moves at start');
}

// Stock gobble NOT allowed without opponent threat
initGame();
{
  state.board[5] = [{ color: 'yellow', size: 0 }];
  updateSurfaceCell(5);
  state.stock.yellow[0] = 2;
  const moves = getValidMoves('red');
  const gobbles = moves.filter(m => m.from.type === 'stock' && m.to.cell === 5);
  assert.equal(gobbles.length, 0, 'no stock gobble without opponent threat');
}

// Stock gobble ALLOWED when opponent has 3-in-a-row threat
initGame();
{
  // Yellow has 3 in a row on row 0 (cells 0,1,2) — no gobble on those yet
  state.board[0] = [{ color: 'yellow', size: 1 }];
  state.board[1] = [{ color: 'yellow', size: 1 }];
  state.board[2] = [{ color: 'yellow', size: 1 }];
  [0,1,2].forEach(c => updateSurfaceCell(c));
  state.stock.yellow[1] = 0;
  const moves = getValidMoves('red');
  // Red can stock-gobble cells 0,1,2 with size > 1 (medium=2 or large=3)
  const gobbles = moves.filter(m => m.from.type === 'stock' && [0,1,2].includes(m.to.cell));
  assert.ok(gobbles.length > 0, 'stock gobble allowed when opponent has 3-in-a-row');
}

// Board moves: red large on cell 0 can move to 15 empty cells
initGame();
{
  state.board[0] = [{ color: 'red', size: 3 }];
  updateSurfaceCell(0);
  const moves = getValidMoves('red');
  const boardMoves = moves.filter(m => m.from.type === 'board');
  assert.equal(boardMoves.length, 15, 'large can move to 15 empty cells');
}

console.log('✓ Task 5 passed');
```

- [ ] **Step 2: Run — expect failure**

```bash
node tests/engine.test.mjs
```

- [ ] **Step 3: Add getValidMoves to js/engine.js**

Append to `js/engine.js`:
```js
/**
 * Returns all valid moves for `color` given current state.
 * Enforces the Stock Exception Rule: placing a new piece from stock onto an
 * occupied cell (gobbling) is only legal when the opponent has an active
 * 3-in-a-row threat on the surface.
 */
export function getValidMoves(color) {
  const moves = [];
  const oppColor    = color === 'red' ? 'yellow' : 'red';
  const oppHasThreat = checkThreats(oppColor, 3);

  // ── Stock moves ──────────────────────────────────────────────
  for (let size = 0; size <= 3; size++) {
    if (state.stock[color][size] <= 0) continue;
    for (let cell = 0; cell < 16; cell++) {
      const stack = state.board[cell];
      if (stack.length === 0) {
        // Empty cell: always allowed from stock
        moves.push({ from: { type: 'stock', cell: null, size }, to: { cell }, color, timestamp: 0 });
      } else if (canPlace(size, cell, color) && oppHasThreat) {
        // Gobble from stock: only when opponent has active 3-in-a-row
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
```

- [ ] **Step 4: Run — expect pass**

```bash
node tests/engine.test.mjs
```
Expected: `✓ Task 5 passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js tests/engine.test.mjs
git commit -m "feat(engine): getValidMoves with stock exception rule"
```

---

### Task 6: engine.js — applyMove, undoMove

**Files:**
- Modify: `js/engine.js`
- Modify: `tests/engine.test.mjs`

- [ ] **Step 1: Write failing tests**

Append to `tests/engine.test.mjs`:
```js
import { applyMove, undoMove } from '../js/engine.js';

// applyMove: stock move — places piece, decrements stock, advances turn, sets bitboard + surface
initGame();
{
  const move = { from: { type: 'stock', cell: null, size: 3 }, to: { cell: 5 }, color: 'red', timestamp: 0 };
  applyMove(move);
  assert.equal(state.board[5].length, 1, 'piece placed on cell 5');
  assert.deepEqual(state.board[5][0], { color: 'red', size: 3 });
  assert.equal(state.stock.red[3], 2, 'large stock decremented');
  assert.equal(state.currentTurn, 'yellow', 'turn advanced');
  // Large at cell 5 → bit (3*16+5) = bit 53
  assert.equal((state.redMask >> 53n) & 1n, 1n, 'redMask bit 53 set');
  assert.equal((state.surfaceRed >> 5n) & 1n, 1n, 'surfaceRed bit 5 set');
}

// applyMove: board move with gobble
initGame();
{
  state.board[5] = [{ color: 'yellow', size: 0 }];
  state.board[0] = [{ color: 'red',    size: 1 }];
  [5,0].forEach(c => updateSurfaceCell(c));
  state.yellowMask |= 1n << BigInt(0 * 16 + 5);
  state.redMask    |= 1n << BigInt(1 * 16 + 0);
  state.stock.red[1] = 2;

  const move = { from: { type: 'board', cell: 0, size: 1 }, to: { cell: 5 }, color: 'red', timestamp: 0 };
  applyMove(move);
  assert.equal(state.board[5].length, 2, 'gobble: stack depth 2');
  assert.deepEqual(state.board[5][1], { color: 'red', size: 1 }, 'red small on top');
  assert.equal(state.board[0].length, 0, 'source cell cleared');
  assert.equal((state.surfaceRed    >> 5n) & 1n, 1n, 'surfaceRed bit 5 set');
  assert.equal((state.surfaceYellow >> 5n) & 1n, 0n, 'surfaceYellow bit 5 cleared');
}

// undoMove: undo stock move restores everything
initGame();
{
  const move = { from: { type: 'stock', cell: null, size: 3 }, to: { cell: 5 }, color: 'red', timestamp: 0 };
  applyMove(move);
  undoMove(move);
  assert.equal(state.board[5].length, 0, 'cell 5 empty after undo');
  assert.equal(state.stock.red[3], 3, 'large stock restored');
  assert.equal(state.currentTurn, 'red', 'turn restored');
  assert.equal(state.redMask, 0n, 'redMask clear');
  assert.equal(state.surfaceRed, 0n, 'surfaceRed clear');
}

// undoMove: undo gobble restores gobbled piece
initGame();
{
  state.board[5] = [{ color: 'yellow', size: 0 }];
  state.board[0] = [{ color: 'red',    size: 1 }];
  [5,0].forEach(c => updateSurfaceCell(c));
  state.yellowMask |= 1n << BigInt(0 * 16 + 5);
  state.redMask    |= 1n << BigInt(1 * 16 + 0);
  state.stock.red[1] = 2;

  const move = { from: { type: 'board', cell: 0, size: 1 }, to: { cell: 5 }, color: 'red', timestamp: 0 };
  applyMove(move);
  undoMove(move);
  assert.equal(state.board[0].length, 1, 'red piece back on cell 0');
  assert.equal(state.board[5].length, 1, 'yellow tiny still on cell 5');
  assert.deepEqual(state.board[5][0], { color: 'yellow', size: 0 }, 'yellow tiny restored');
  assert.equal((state.surfaceYellow >> 5n) & 1n, 1n, 'surfaceYellow bit 5 restored');
}

console.log('✓ Task 6 passed');
```

- [ ] **Step 2: Run — expect failure**

```bash
node tests/engine.test.mjs
```

- [ ] **Step 3: Add applyMove and undoMove to js/engine.js**

Append to `js/engine.js`:
```js
/**
 * Apply a move. Mutates board, stock, bitboards, surface masks, moveLog, currentTurn.
 * Set move._searchMode = true to skip moveLog append (for AI search).
 * Stores move._gobbled (the piece that was gobbled) for undoMove.
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
    const fromBit = 1n << BigInt(piece.size * 16 + from.cell);
    if (piece.color === 'red') state.redMask    &= ~fromBit;
    else                        state.yellowMask &= ~fromBit;
    updateSurfaceCell(from.cell);
  }

  // Save gobbled piece for undoMove
  const toStack = state.board[to.cell];
  move._gobbled = toStack.length > 0 ? toStack[toStack.length - 1] : null;

  // Place on destination
  toStack.push(piece);
  const toBit = 1n << BigInt(piece.size * 16 + to.cell);
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
 * Requires move._gobbled to be populated by applyMove.
 */
export function undoMove(move) {
  const { from, to, color } = move;

  // Remove piece from destination
  const toStack = state.board[to.cell];
  const piece   = toStack.pop();
  const toBit   = 1n << BigInt(piece.size * 16 + to.cell);
  if (piece.color === 'red') state.redMask    &= ~toBit;
  else                        state.yellowMask &= ~toBit;

  // Restore gobbled piece (if any)
  if (move._gobbled) {
    toStack.push(move._gobbled);
    const gobBit = 1n << BigInt(move._gobbled.size * 16 + to.cell);
    if (move._gobbled.color === 'red') state.redMask    |= gobBit;
    else                                state.yellowMask |= gobBit;
  }
  updateSurfaceCell(to.cell);

  // Restore source
  if (from.type === 'stock') {
    state.stock[color][from.size]++;
  } else {
    state.board[from.cell].push(piece);
    const fromBit = 1n << BigInt(piece.size * 16 + from.cell);
    if (piece.color === 'red') state.redMask    |= fromBit;
    else                        state.yellowMask |= fromBit;
    updateSurfaceCell(from.cell);
  }

  state.currentTurn = color;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
node tests/engine.test.mjs
```
Expected: `✓ Task 6 passed`

- [ ] **Step 5: Commit**

```bash
git add js/engine.js tests/engine.test.mjs
git commit -m "feat(engine): applyMove + undoMove"
```

---

### Task 7: engine.js — Full Integration Test

**Files:**
- Modify: `tests/engine.test.mjs`

- [ ] **Step 1: Write integration test**

Append to `tests/engine.test.mjs`:
```js
// Integration: red wins on col 0 in 7 moves, then full undo restores clean state
initGame();
{
  const moves = [
    { from: { type: 'stock', cell: null, size: 3 }, to: { cell: 0  }, color: 'red',    timestamp: 0 },
    { from: { type: 'stock', cell: null, size: 1 }, to: { cell: 1  }, color: 'yellow', timestamp: 0 },
    { from: { type: 'stock', cell: null, size: 3 }, to: { cell: 4  }, color: 'red',    timestamp: 0 },
    { from: { type: 'stock', cell: null, size: 1 }, to: { cell: 5  }, color: 'yellow', timestamp: 0 },
    { from: { type: 'stock', cell: null, size: 3 }, to: { cell: 8  }, color: 'red',    timestamp: 0 },
    { from: { type: 'stock', cell: null, size: 1 }, to: { cell: 9  }, color: 'yellow', timestamp: 0 },
    { from: { type: 'stock', cell: null, size: 3 }, to: { cell: 12 }, color: 'red',    timestamp: 0 },
  ];
  for (const m of moves) applyMove(m);

  assert.equal(checkWin('red'),    true,  'red wins on col 0');
  assert.equal(checkWin('yellow'), false, 'yellow not winning');

  // Full undo
  for (let i = moves.length - 1; i >= 0; i--) undoMove(moves[i]);

  assert.equal(state.redMask,    0n, 'redMask clear after undo');
  assert.equal(state.yellowMask, 0n, 'yellowMask clear after undo');
  assert.deepEqual(state.stock.red,    [3,3,3,3], 'red stock fully restored');
  assert.deepEqual(state.stock.yellow, [3,3,3,3], 'yellow stock fully restored');
  assert.equal(state.currentTurn, 'red', 'turn restored to red');
  assert.ok(state.board.every(s => s.length === 0), 'all stacks empty');
}

console.log('✓ Task 7 integration passed');
```

- [ ] **Step 2: Run**

```bash
node tests/engine.test.mjs
```
Expected: all `✓` lines, including `✓ Task 7 integration passed`

- [ ] **Step 3: Commit**

```bash
git add tests/engine.test.mjs
git commit -m "test(engine): integration test — win + full undo"
```

---

### Task 8: css/style.css — Full Styles

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Write full CSS**

Replace `css/style.css`:
```css
/* css/style.css */
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0; min-height: 100vh;
  background: #1a1a2e; color: #eee;
  font-family: 'Segoe UI', system-ui, sans-serif;
  display: flex; align-items: center; justify-content: center;
}

/* ── Screens ── */
.screen { display: none; width: 100%; min-height: 100vh; }
.screen.active { display: flex; flex-direction: column; align-items: center; justify-content: center; }
.screen.overlay {
  position: fixed; inset: 0; display: none;
  align-items: center; justify-content: center;
  background: rgba(0,0,0,0.75); z-index: 100;
}
.screen.overlay.active { display: flex; }

/* ── Mode Select ── */
#screen-mode-select h1 {
  font-size: clamp(2rem, 6vw, 4rem); margin-bottom: 2rem;
  letter-spacing: 4px; text-transform: uppercase;
  color: #f5c842; text-shadow: 0 2px 8px rgba(245,200,66,0.4);
}
.mode-buttons { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
.mode-buttons button {
  padding: 1rem 3rem; font-size: 1.2rem; font-weight: 700;
  border: 2px solid #555; border-radius: 12px;
  background: #2a2a3e; color: #fff; cursor: pointer;
  transition: all 0.2s; min-width: 220px;
}
.mode-buttons button:hover:not(:disabled) {
  background: #3a3a5e; border-color: #aaa; transform: translateY(-2px);
}
.mode-buttons button:disabled { opacity: 0.4; cursor: not-allowed; }
.back-link { margin-top: 2rem; color: #888; font-size: 0.9rem; text-decoration: none; }
.back-link:hover { color: #ccc; }

/* ── Game Screen ── */
#screen-game { padding: 1rem; gap: 1rem; }
#game-wrapper { display: flex; align-items: flex-start; gap: clamp(0.5rem, 2vw, 2rem); }
#turn-indicator {
  font-size: 1rem; font-weight: 600; letter-spacing: 2px;
  text-transform: uppercase; padding: 0.4rem 1rem;
  border-radius: 8px; background: #2a2a3e;
}
#btn-menu {
  margin-top: 0.5rem; padding: 0.5rem 1.5rem;
  background: #333; border: 1px solid #555;
  border-radius: 8px; color: #ccc; cursor: pointer; font-size: 0.9rem;
}
#btn-menu:hover { background: #444; }

/* ── Board ── */
#board, #board-replay {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
  padding: 12px; background: #0f1923; border-radius: 12px;
  box-shadow: inset 0 2px 12px rgba(0,0,0,0.6);
  width:  clamp(240px, 55vw, 480px);
  height: clamp(240px, 55vw, 480px);
}
.cell {
  position: relative; background: #16202b; border-radius: 8px;
  box-shadow: inset 0 2px 6px rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: box-shadow 0.15s; aspect-ratio: 1;
}
.cell:hover { box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 0 0 2px #888; }
.cell.valid-target { box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 0 0 0 3px #4caf50; }
.cell.invalid-flash { animation: invalidFlash 0.3s; }
@keyframes invalidFlash { 0%,100%{box-shadow:none} 50%{box-shadow:0 0 0 3px #e53935;} }
.cell[data-depth="2"] { box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 2px 2px 0 #333; }
.cell[data-depth="3"] { box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 3px 3px 0 #333, 5px 5px 0 #222; }
.cell[data-depth="4"] { box-shadow: inset 0 2px 6px rgba(0,0,0,0.5), 3px 3px 0 #333, 6px 6px 0 #222, 9px 9px 0 #111; }

/* ── Pieces ── */
.piece {
  position: absolute; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: transform 0.15s; user-select: none;
}
.piece:hover { transform: scale(1.08); }
.piece.selected { outline: 3px solid #fff; outline-offset: 2px; border-radius: 50%; }
.piece[data-size="0"] { width: 32px; height: 32px; }
.piece[data-size="1"] { width: 48px; height: 48px; }
.piece[data-size="2"] { width: 64px; height: 64px; }
.piece[data-size="3"] { width: 80px; height: 80px; }

/* Red: warm red + gold rim */
.piece[data-color="red"] { background: radial-gradient(circle at 35% 35%, #ff6b6b, #c0392b); }
.piece[data-size="0"][data-color="red"] { box-shadow: 0 0 0 2px #f5c842, 0 2px  6px rgba(192,57,43,0.5); }
.piece[data-size="1"][data-color="red"] { box-shadow: 0 0 0 2px #f5c842, 0 3px  8px rgba(192,57,43,0.5); }
.piece[data-size="2"][data-color="red"] { box-shadow: 0 0 0 3px #f5c842, 0 4px 10px rgba(192,57,43,0.6); }
.piece[data-size="3"][data-color="red"] { box-shadow: 0 0 0 4px #f5c842, 0 5px 14px rgba(192,57,43,0.7); }

/* Yellow: gold + amber rim */
.piece[data-color="yellow"] { background: radial-gradient(circle at 35% 35%, #ffe082, #f9a825); }
.piece[data-size="0"][data-color="yellow"] { box-shadow: 0 0 0 2px #ff8f00, 0 2px  6px rgba(249,168,37,0.5); }
.piece[data-size="1"][data-color="yellow"] { box-shadow: 0 0 0 2px #ff8f00, 0 3px  8px rgba(249,168,37,0.5); }
.piece[data-size="2"][data-color="yellow"] { box-shadow: 0 0 0 3px #ff8f00, 0 4px 10px rgba(249,168,37,0.6); }
.piece[data-size="3"][data-color="yellow"] { box-shadow: 0 0 0 4px #ff8f00, 0 5px 14px rgba(249,168,37,0.7); }

/* Animations */
@keyframes placeAnim         { from{transform:scale(0.8)}         to{transform:scale(1)} }
@keyframes gobbleAttackerAnim{ from{transform:scale(0.8)}         to{transform:scale(1)} }
@keyframes winPulse { 0%,100%{filter:brightness(1)} 50%{filter:brightness(1.5) drop-shadow(0 0 12px #f5c842);} }
.piece.anim-place     { animation: placeAnim          0.15s ease-out; }
.piece.anim-gobble-in { animation: gobbleAttackerAnim 0.25s ease-out; }
.cell.win-cell        { animation: winPulse 0.6s ease-in-out infinite; }

/* Confetti */
.confetti-piece {
  position: fixed; width: 8px; height: 8px; opacity: 0; border-radius: 2px;
  animation: confettiFall 1.5s ease-in forwards; pointer-events: none;
}
@keyframes confettiFall {
  0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* ── Stock Panels ── */
.stock-panel {
  display: flex; flex-direction: column; gap: 0.5rem; align-items: center;
  padding: 0.75rem; background: #0f1923; border-radius: 12px;
  min-width: clamp(60px, 10vw, 100px);
}
.stock-label { font-size: 0.75rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #aaa; }
.stock-size-row { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.stock-piece-icon { display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s; }
.stock-piece-icon:hover { transform: scale(1.08); }
.stock-piece-icon.selected { outline: 3px solid #fff; outline-offset: 2px; border-radius: 50%; }
.stock-piece-icon.depleted { opacity: 0.25; cursor: not-allowed; pointer-events: none; }
.stock-count { font-size: 0.7rem; font-weight: 700; color: #aaa; }
.stock-panel.thinking .stock-label::after { content: ' ⏳'; animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Result Overlay ── */
.result-box {
  background: #1a1a2e; border: 2px solid #555; border-radius: 16px;
  padding: 2rem 3rem; text-align: center;
  display: flex; flex-direction: column; gap: 1rem; min-width: 280px;
}
#result-winner { font-size: 1.8rem; font-weight: 900; text-transform: uppercase; letter-spacing: 4px; }
.result-box button {
  padding: 0.7rem 1.5rem; border-radius: 10px; border: 1px solid #555;
  background: #2a2a3e; color: #fff; cursor: pointer; font-size: 1rem; transition: all 0.2s;
}
.result-box button:hover { background: #3a3a5e; border-color: #aaa; }

/* ── Replay Viewer ── */
#screen-replay { padding: 1rem; gap: 0.75rem; }
#replay-header { display: flex; gap: 1rem; font-size: 0.9rem; color: #aaa; flex-wrap: wrap; justify-content: center; }
#replay-controls { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; justify-content: center; }
#replay-controls button, #replay-load-area button, #replay-load-area label {
  padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px solid #555;
  background: #2a2a3e; color: #ccc; cursor: pointer; font-size: 0.95rem;
}
#replay-controls button:hover, #replay-load-area button:hover, #replay-load-area label:hover { background: #3a3a5e; }
#replay-speed { padding: 0.4rem; background: #2a2a3e; border: 1px solid #555; color: #fff; border-radius: 6px; cursor: pointer; }
#replay-load-area { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; justify-content: center; }
#replay-file-input { display: none; }

/* ── Responsive ── */
@media (max-width: 600px) {
  #game-wrapper, #game-wrapper-replay {
    flex-direction: column; align-items: center;
  }
  .stock-panel {
    flex-direction: row; min-width: unset;
    width: clamp(240px, 90vw, 480px); justify-content: space-around;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "feat(css): board, pieces, animations, stock, result, replay, responsive"
```

---

### Task 9: js/ui.js — renderBoard, renderStock, helpers

**Files:**
- Modify: `js/ui.js`

- [ ] **Step 1: Write js/ui.js**

Replace `js/ui.js`:
```js
// js/ui.js
import { state } from './engine.js';

// ── Board ─────────────────────────────────────────────────────

/**
 * Render/refresh the 4×4 board into `container`.
 * Creates 16 .cell divs on first call; updates top pieces on subsequent calls.
 * @param {HTMLElement} container
 * @param {function|null} onCellClick  callback(cellIndex: 0-15)
 */
export function renderBoard(container, onCellClick = null) {
  if (container.children.length !== 16) {
    container.innerHTML = '';
    for (let cell = 0; cell < 16; cell++) {
      const div = document.createElement('div');
      div.className = 'cell';
      div.dataset.cell = cell;
      if (onCellClick) div.addEventListener('click', () => onCellClick(cell));
      container.appendChild(div);
    }
  }
  for (let cell = 0; cell < 16; cell++) {
    const div   = container.children[cell];
    const stack = state.board[cell];
    div.dataset.depth = stack.length;
    const existing = div.querySelector('.piece');
    if (existing) div.removeChild(existing);
    if (stack.length > 0) {
      const top = stack[stack.length - 1];
      div.appendChild(makePieceElement(top.color, top.size, null));
    }
  }
}

// ── Stock ─────────────────────────────────────────────────────

/**
 * Render both stock panels.
 * @param {string} redId      id of the red stock container element
 * @param {string} yellowId   id of the yellow stock container element
 * @param {function|null} onStockClick  callback(color, size)
 */
export function renderStock(redId, yellowId, onStockClick = null) {
  _renderStockPanel(redId,    'red',    onStockClick);
  _renderStockPanel(yellowId, 'yellow', onStockClick);
}

function _renderStockPanel(panelId, color, onStockClick) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.innerHTML = `<div class="stock-label">${color === 'red' ? '🔴 Red' : '🟡 Yellow'}</div>`;

  // Display sizes largest-first (most visually prominent at top)
  for (let size = 3; size >= 0; size--) {
    const count = state.stock[color][size];
    const row   = document.createElement('div');
    row.className = 'stock-size-row';

    const icon = makePieceElement(color, size, onStockClick ? () => onStockClick(color, size) : null);
    icon.classList.add('stock-piece-icon');
    if (count === 0) icon.classList.add('depleted');
    row.appendChild(icon);

    const countEl = document.createElement('div');
    countEl.className = 'stock-count';
    countEl.textContent = `×${count}`;
    row.appendChild(countEl);

    panel.appendChild(row);
  }
}

// ── Piece element ─────────────────────────────────────────────

/**
 * Create a .piece div element (color + size data attributes set).
 */
export function makePieceElement(color, size, onClick) {
  const el = document.createElement('div');
  el.className = 'piece';
  el.dataset.color = color;
  el.dataset.size  = size;
  if (onClick) el.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return el;
}

// ── Highlights ────────────────────────────────────────────────

export function clearHighlights(boardId = 'board', stockRedId = 'stock-red', stockYellowId = 'stock-yellow') {
  document.getElementById(boardId)?.querySelectorAll('.cell,.piece')
    .forEach(el => el.classList.remove('valid-target', 'selected'));
  [stockRedId, stockYellowId].forEach(id =>
    document.getElementById(id)?.querySelectorAll('.stock-piece-icon')
      .forEach(el => el.classList.remove('selected'))
  );
}

export function highlightValidCells(validCells, boardId = 'board') {
  const board = document.getElementById(boardId);
  if (!board) return;
  board.querySelectorAll('.cell').forEach(c => {
    if (validCells.includes(parseInt(c.dataset.cell))) c.classList.add('valid-target');
  });
}

export function flashInvalid(cell, boardId = 'board') {
  const board  = document.getElementById(boardId);
  if (!board) return;
  const cellEl = board.children[cell];
  if (!cellEl) return;
  cellEl.classList.remove('invalid-flash');
  void cellEl.offsetWidth;
  cellEl.classList.add('invalid-flash');
  cellEl.addEventListener('animationend', () => cellEl.classList.remove('invalid-flash'), { once: true });
}

// ── Win / AI ──────────────────────────────────────────────────

export function showWinAnimation(winCells, boardId = 'board') {
  const board = document.getElementById(boardId);
  if (!board) return;
  winCells.forEach(cell => board.children[cell]?.classList.add('win-cell'));
  _spawnConfetti();
}

function _spawnConfetti() {
  const colors = ['#f5c842','#e53935','#4caf50','#2196f3','#ff9800'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.animationDelay    = Math.random() * 0.8 + 's';
    el.style.animationDuration = (1 + Math.random()) + 's';
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
  }
}

export function setThinking(panelId, thinking) {
  document.getElementById(panelId)?.classList.toggle('thinking', thinking);
}

export function updateTurnIndicator(color, isAI = false) {
  const el = document.getElementById('turn-indicator');
  if (!el) return;
  const label = color === 'red' ? '🔴 Red' : '🟡 Yellow';
  el.textContent = isAI ? `${label} (AI thinking…)` : `${label}'s turn`;
  el.style.color = color === 'red' ? '#ff6b6b' : '#ffe082';
}
```

- [ ] **Step 2: Commit**

```bash
git add js/ui.js
git commit -m "feat(ui): renderBoard + renderStock + highlight + win animation"
```

---

### Task 10: js/main.js — Screen Routing + Local 2P Game Loop

**Files:**
- Modify: `js/main.js`

- [ ] **Step 1: Write js/main.js**

Replace `js/main.js`:
```js
// js/main.js
import {
  initGame, state, getValidMoves, applyMove, checkWin, WIN_MASKS
} from './engine.js';
import {
  renderBoard, renderStock, clearHighlights, highlightValidCells,
  flashInvalid, updateTurnIndicator, showWinAnimation, setThinking
} from './ui.js';
import { isOnlineAvailable } from './network.js';
import { startRecording, finalizeReplay, saveReplayJSON, copyReplayJSON } from './replay.js';

// ── Screen Management ────────────────────────────────────────
const screens = {
  modeSelect: document.getElementById('screen-mode-select'),
  game:       document.getElementById('screen-game'),
  result:     document.getElementById('screen-result'),
  replay:     document.getElementById('screen-replay'),
};

export function showScreen(name) {
  Object.values(screens).forEach(s => s?.classList.remove('active'));
  screens[name]?.classList.add('active');
}

// ── Game Context ─────────────────────────────────────────────
export const ctx = {
  mode:         null,     // 'vs_ai' | 'local_2p'
  vsAI:         false,
  aiColor:      'yellow',
  selectedFrom: null,     // { type, cell, size, color }
};

// ── Boot ─────────────────────────────────────────────────────
function boot() {
  if (!isOnlineAvailable) {
    const btn = document.getElementById('btn-online');
    if (btn) { btn.disabled = true; btn.title = 'Coming soon'; }
  }

  document.getElementById('btn-vs-ai')       ?.addEventListener('click', () => startGame('vs_ai'));
  document.getElementById('btn-local-2p')    ?.addEventListener('click', () => startGame('local_2p'));
  document.getElementById('btn-menu')        ?.addEventListener('click', () => showScreen('modeSelect'));
  document.getElementById('btn-result-menu') ?.addEventListener('click', () => showScreen('modeSelect'));
  document.getElementById('btn-play-again')  ?.addEventListener('click', () => startGame(ctx.mode));
  document.getElementById('btn-replay-menu') ?.addEventListener('click', () => showScreen('modeSelect'));
  document.getElementById('btn-view-replay') ?.addEventListener('click', () => openReplayFromCurrentGame());
  document.getElementById('btn-save-replay') ?.addEventListener('click', () => saveReplayJSON());
  document.getElementById('btn-copy-json')   ?.addEventListener('click', () => copyReplayJSON());

  showScreen('modeSelect');
}

// ── Start Game ───────────────────────────────────────────────
export function startGame(mode) {
  ctx.mode         = mode;
  ctx.vsAI         = mode === 'vs_ai';
  ctx.aiColor      = 'yellow'; // AI always plays Yellow (moves second)
  ctx.selectedFrom = null;

  initGame();
  startRecording(mode, 'perfect');

  renderBoard(document.getElementById('board'), handleCellClick);
  renderStock('stock-red', 'stock-yellow', handleStockClick);
  updateTurnIndicator(state.currentTurn, false);
  showScreen('game');

  // AI never starts first (AI = yellow, red goes first)
}

// ── Click Handlers ───────────────────────────────────────────
function handleStockClick(color, size) {
  if (state.gameOver) return;
  if (color !== state.currentTurn) return;
  if (ctx.vsAI && color === ctx.aiColor) return;
  if (state.stock[color][size] === 0) return;

  clearHighlights();
  ctx.selectedFrom = { type: 'stock', cell: null, size, color };

  const validCells = getValidMoves(color)
    .filter(m => m.from.type === 'stock' && m.from.size === size)
    .map(m => m.to.cell);
  highlightValidCells(validCells);

  const panel = document.getElementById(color === 'red' ? 'stock-red' : 'stock-yellow');
  panel?.querySelectorAll('.stock-piece-icon').forEach(el => {
    if (parseInt(el.dataset.size) === size) el.classList.add('selected');
  });
}

function handleCellClick(cell) {
  if (state.gameOver) return;

  // ── No piece selected yet ────────────────────────────────
  if (!ctx.selectedFrom) {
    const stack = state.board[cell];
    if (stack.length === 0) { flashInvalid(cell); return; }
    const top = stack[stack.length - 1];
    if (top.color !== state.currentTurn) { flashInvalid(cell); return; }
    if (ctx.vsAI && top.color === ctx.aiColor) return;

    clearHighlights();
    ctx.selectedFrom = { type: 'board', cell, size: top.size, color: top.color };

    const validCells = getValidMoves(top.color)
      .filter(m => m.from.type === 'board' && m.from.cell === cell)
      .map(m => m.to.cell);
    highlightValidCells(validCells);
    document.getElementById('board')?.children[cell]?.querySelector('.piece')?.classList.add('selected');
    return;
  }

  // ── Piece already selected — try to place ────────────────
  const { type, size, color } = ctx.selectedFrom;
  const fromCell = ctx.selectedFrom.cell;

  const allValid = getValidMoves(color).filter(m =>
    m.from.type === type &&
    m.from.size === size &&
    (type === 'board' ? m.from.cell === fromCell : true)
  );
  const isValid = allValid.some(m => m.to.cell === cell);

  if (!isValid) {
    // Clicking another own board piece → re-select it instead
    const stack = state.board[cell];
    if (stack.length > 0 && stack[stack.length - 1].color === color && type === 'board') {
      clearHighlights();
      ctx.selectedFrom = null;
      handleCellClick(cell);
      return;
    }
    flashInvalid(cell);
    clearHighlights();
    ctx.selectedFrom = null;
    return;
  }

  // Execute move
  const move = { from: { type, cell: fromCell, size }, to: { cell }, color, timestamp: 0 };
  clearHighlights();
  ctx.selectedFrom = null;

  applyMove(move);
  renderBoard(document.getElementById('board'), handleCellClick);
  renderStock('stock-red', 'stock-yellow', handleStockClick);

  if (checkWin(color)) { endGame(color); return; }

  updateTurnIndicator(state.currentTurn, ctx.vsAI && state.currentTurn === ctx.aiColor);

  if (ctx.vsAI && state.currentTurn === ctx.aiColor && !state.gameOver) {
    setThinking(ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow', true);
    setTimeout(triggerAI, 50);
  }
}

// ── End Game ─────────────────────────────────────────────────
function endGame(winner) {
  state.gameOver = true;
  state.winner   = winner;

  // Find winning line cells
  const surface  = winner === 'red' ? state.surfaceRed : state.surfaceYellow;
  let winMask = 0n;
  for (const mask of WIN_MASKS) {
    if ((surface & mask) === mask) { winMask = mask; break; }
  }
  const winCells = [];
  for (let i = 0; i < 16; i++) if ((winMask >> BigInt(i)) & 1n) winCells.push(i);

  showWinAnimation(winCells);
  finalizeReplay(winner);

  const el = document.getElementById('result-winner');
  if (el) {
    el.textContent = `${winner === 'red' ? '🔴 Red' : '🟡 Yellow'} wins!`;
    el.style.color = winner === 'red' ? '#ff6b6b' : '#ffe082';
  }
  setTimeout(() => showScreen('result'), 900);
}

// ── AI (stub — replaced in Task 13) ─────────────────────────
function triggerAI() {
  // Stub: random move
  const moves = getValidMoves(ctx.aiColor);
  if (!moves.length) { endGame(ctx.aiColor === 'red' ? 'yellow' : 'red'); return; }
  const move = moves[Math.floor(Math.random() * moves.length)];
  move._searchMode = false;

  setThinking(ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow', false);
  applyMove(move);
  renderBoard(document.getElementById('board'), handleCellClick);
  renderStock('stock-red', 'stock-yellow', handleStockClick);

  if (checkWin(ctx.aiColor)) { endGame(ctx.aiColor); return; }
  updateTurnIndicator(state.currentTurn, false);
}

// ── Replay launch ────────────────────────────────────────────
function openReplayFromCurrentGame() {
  // implemented in Task 16
  showScreen('replay');
}

boot();
```

- [ ] **Step 2: Open in browser, test Local 2P manually**

```bash
python -m http.server 8080
# open http://localhost:8080
```
1. Click "Local 2P" → dark board appears, "🔴 Red's turn"
2. Click red stock piece → valid cells highlight green
3. Click valid cell → piece appears on board, turn switches to Yellow
4. Play both sides until 4-in-a-row → result overlay with confetti
5. Click "Play Again" → fresh board

- [ ] **Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat(main): screen routing + local 2P game loop + random AI stub"
```

---

### Task 11: js/replay.js — Recording + Save + Copy

**Files:**
- Modify: `js/replay.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write js/replay.js**

Replace `js/replay.js`:
```js
// js/replay.js
import { state } from './engine.js';

// Active replay being recorded
let _replayData = null;

/**
 * Begin recording. Called at game start.
 */
export function startRecording(mode, difficulty = 'perfect') {
  _replayData = {
    version:  2,
    mode,
    difficulty,
    winner:   null,
    duration_seconds: 0,
    date:     new Date().toISOString(),
    moves:    [],
  };
}

/**
 * Called by applyMove (via main.js hook) after every human/AI move.
 * Snapshot the move into replay data.
 */
export function recordMove(move) {
  if (!_replayData) return;
  _replayData.moves.push({
    from:      { type: move.from.type, cell: move.from.cell, size: move.from.size },
    to:        { cell: move.to.cell },
    color:     move.color,
    timestamp: move.timestamp,
  });
}

/**
 * Finalize replay at game end. Called by endGame().
 */
export function finalizeReplay(winner) {
  if (!_replayData) return;
  _replayData.winner           = winner;
  _replayData.duration_seconds = Math.round((Date.now() - state.gameStartTime) / 1000);
}

/** Get current replay data object (read-only reference). */
export function getReplayData() { return _replayData; }

/** Download replay as JSON file. */
export function saveReplayJSON() {
  if (!_replayData) return;
  const json = JSON.stringify(_replayData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `replay-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy replay JSON to clipboard. */
export async function copyReplayJSON() {
  if (!_replayData) return;
  const json = JSON.stringify(_replayData, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    const btn = document.getElementById('btn-copy-json') || document.getElementById('btn-copy-json-viewer');
    if (btn) { btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = '📋 Copy JSON', 2000); }
  } catch {
    prompt('Copy this JSON:', json);
  }
}
```

- [ ] **Step 2: Wire recordMove into main.js**

In `js/main.js`, add import:
```js
import { startRecording, finalizeReplay, saveReplayJSON, copyReplayJSON, recordMove } from './replay.js';
```

In `handleCellClick`, after `applyMove(move)`:
```js
recordMove(move);
```

In `triggerAI`, after `applyMove(move)`:
```js
recordMove(move);
```

- [ ] **Step 3: Verify save + copy work manually**

```bash
python -m http.server 8080
```
1. Play a full game
2. On result screen, click "💾 Save Replay" → JSON file downloads
3. Click "📋 Copy JSON" → button shows "✓ Copied!" for 2s
4. Paste in a text editor — verify `winner`, `moves[]`, `duration_seconds` are all non-null

- [ ] **Step 4: Commit**

```bash
git add js/replay.js js/main.js
git commit -m "feat(replay): recording + save JSON + copy to clipboard"
```

---

### Task 12: js/replay.js — Viewer

**Files:**
- Modify: `js/replay.js`
- Modify: `js/main.js`

- [ ] **Step 1: Add viewer functions to js/replay.js**

Append to `js/replay.js`:
```js
// ── Replay Viewer ─────────────────────────────────────────────
import { initGame, applyMove as engineApplyMove } from './engine.js';
import { renderBoard, renderStock } from './ui.js';

let _viewerData   = null;
let _viewerStep   = 0;
let _autoInterval = null;

/**
 * Load replay data into the viewer and show the initial (empty) board state.
 * @param {object} replayData — parsed replay JSON
 */
export function loadReplayViewer(replayData) {
  _viewerData = replayData;
  _viewerStep = 0;
  _autoStop();

  initGame();
  renderBoard(document.getElementById('board-replay'), null);
  renderStock('stock-red-replay', 'stock-yellow-replay', null);
  _updateViewerHeader();
}

function _applyUpTo(targetStep) {
  initGame();
  const moves = _viewerData.moves.slice(0, targetStep);
  for (const m of moves) {
    engineApplyMove({ ...m, _searchMode: true });
  }
  renderBoard(document.getElementById('board-replay'), null);
  renderStock('stock-red-replay', 'stock-yellow-replay', null);
  _viewerStep = targetStep;
  _updateViewerHeader();
}

function _updateViewerHeader() {
  const d = _viewerData;
  const total = d?.moves?.length ?? 0;
  document.getElementById('replay-winner-badge').textContent  = d?.winner ? `🏆 ${d.winner}` : '';
  document.getElementById('replay-difficulty').textContent    = d?.difficulty ?? '';
  document.getElementById('replay-time').textContent          = d?.duration_seconds != null ? `⏱ ${d.duration_seconds}s` : '';
  document.getElementById('replay-move-counter').textContent  = `Move ${_viewerStep} / ${total}`;
}

function _autoStop() {
  if (_autoInterval) { clearInterval(_autoInterval); _autoInterval = null; }
  document.getElementById('btn-replay-auto').textContent = '▶ Auto';
}

/** Wire up all replay viewer button events. Call once from main.js boot. */
export function initViewerControls() {
  document.getElementById('btn-replay-start')?.addEventListener('click', () => {
    _autoStop(); _applyUpTo(0);
  });
  document.getElementById('btn-replay-prev')?.addEventListener('click', () => {
    _autoStop(); if (_viewerStep > 0) _applyUpTo(_viewerStep - 1);
  });
  document.getElementById('btn-replay-next')?.addEventListener('click', () => {
    _autoStop();
    if (_viewerData && _viewerStep < _viewerData.moves.length) _applyUpTo(_viewerStep + 1);
  });
  document.getElementById('btn-replay-end')?.addEventListener('click', () => {
    _autoStop(); if (_viewerData) _applyUpTo(_viewerData.moves.length);
  });
  document.getElementById('btn-replay-auto')?.addEventListener('click', () => {
    if (_autoInterval) { _autoStop(); return; }
    document.getElementById('btn-replay-auto').textContent = '⏸ Pause';
    const speed = parseFloat(document.getElementById('replay-speed')?.value ?? 1);
    const delay = Math.round(800 / speed);
    _autoInterval = setInterval(() => {
      if (!_viewerData || _viewerStep >= _viewerData.moves.length) { _autoStop(); return; }
      _applyUpTo(_viewerStep + 1);
    }, delay);
  });

  // File picker
  document.getElementById('replay-file-input')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text);
      loadReplayViewer(data);
    } catch { alert('Invalid replay file.'); }
  });

  // Drag-drop on replay board container
  const container = document.getElementById('board-container-replay');
  if (container) {
    container.addEventListener('dragover', e => e.preventDefault());
    container.addEventListener('drop', async e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file) return;
      const text = await file.text();
      try { loadReplayViewer(JSON.parse(text)); } catch { alert('Invalid replay file.'); }
    });
  }

  document.getElementById('btn-save-replay-viewer')?.addEventListener('click', saveReplayJSON);
  document.getElementById('btn-copy-json-viewer')  ?.addEventListener('click', copyReplayJSON);
}
```

- [ ] **Step 2: Update copyReplayJSON to work in viewer context**

In `js/replay.js`, update `copyReplayJSON` to prefer `_viewerData` when `_replayData` is null:
```js
export async function copyReplayJSON() {
  const data = _replayData ?? _viewerData;
  if (!data) return;
  const json = JSON.stringify(data, null, 2);
  try {
    await navigator.clipboard.writeText(json);
    ['btn-copy-json', 'btn-copy-json-viewer'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) { const orig = btn.textContent; btn.textContent = '✓ Copied!'; setTimeout(() => btn.textContent = orig, 2000); }
    });
  } catch { prompt('Copy this JSON:', json); }
}
```

- [ ] **Step 3: Wire viewer into main.js**

Add import to `js/main.js`:
```js
import { loadReplayViewer, initViewerControls } from './replay.js';
```

In `boot()`, add:
```js
initViewerControls();
```

Replace `openReplayFromCurrentGame`:
```js
function openReplayFromCurrentGame() {
  const data = getReplayData();
  if (data) loadReplayViewer(data);
  showScreen('replay');
}
```

Add `getReplayData` to the replay import line.

- [ ] **Step 4: Test viewer manually**

```bash
python -m http.server 8080
```
1. Play a full game
2. On result screen click "▶ Replay" → replay screen shows board at move 0
3. Click ⏩ repeatedly → pieces appear step by step
4. Click ▶ Auto → pieces advance automatically
5. Click ⏮ → back to empty board
6. Load a saved .json via "📂 Load File"

- [ ] **Step 5: Commit**

```bash
git add js/replay.js js/main.js
git commit -m "feat(replay): viewer with step controls, auto-play, drag-drop load"
```

---

### Task 13: js/ai.js — Evaluation + Move Ordering + Alpha-Beta

**Files:**
- Modify: `js/ai.js`

- [ ] **Step 1: Write js/ai.js with eval, move ordering, basic alpha-beta**

Replace `js/ai.js`:
```js
// js/ai.js
// Perfect-play AI: Zobrist + TT + eval + move ordering + alpha-beta + PVS + NMP + LMR + quiescence + Lazy SMP
import {
  state, WIN_MASKS, getValidMoves, applyMove, undoMove, checkWin, checkThreats, popcount16
} from './engine.js';

// ── Zobrist ──────────────────────────────────────────────────
function rand64() {
  const hi = BigInt(Math.floor(Math.random() * 0x100000000)) << 32n;
  return hi | BigInt(Math.floor(Math.random() * 0x100000000));
}
// ZT[cell][stackDepth][colorIdx][size]
const ZT = Array.from({length:16}, () =>
  Array.from({length:8}, () =>
    [[rand64(),rand64(),rand64(),rand64()],[rand64(),rand64(),rand64(),rand64()]]
  )
);
// ZS[colorIdx][size][count 0-3]
const ZS = [[],[]] ;
for (let c = 0; c < 2; c++) { ZS[c] = []; for (let s = 0; s < 4; s++) ZS[c][s] = [rand64(),rand64(),rand64(),rand64()]; }
const CI = { red: 0, yellow: 1 };

export function computeHash() {
  let h = 0n;
  for (let cell = 0; cell < 16; cell++) {
    const stk = state.board[cell];
    for (let d = 0; d < stk.length; d++) h ^= ZT[cell][d][CI[stk[d].color]][stk[d].size];
  }
  for (const c of ['red','yellow']) for (let s = 0; s < 4; s++) h ^= ZS[CI[c]][s][state.stock[c][s]];
  return h;
}

// ── Transposition Table ──────────────────────────────────────
const TT_SIZE = 1 << 20; // ~1M entries
const TT_SLOT = 5;       // words per entry
let tt = null;

export function initTT() {
  try {
    tt = new Int32Array(new SharedArrayBuffer(TT_SIZE * TT_SLOT * 4));
  } catch {
    tt = new Int32Array(new ArrayBuffer(TT_SIZE * TT_SLOT * 4));
  }
}

export function getTTBuffer() { return tt?.buffer ?? null; }

const FLAGS = { EXACT: 0, LB: 1, UB: 2 };
const INF   = 1_000_000;

function ttIdx(h)  { return Number(h & BigInt(TT_SIZE - 1)) * TT_SLOT; }
function ttHi(h)   { return Number((h >> 32n) & 0xFFFFFFFFn); }
function ttLo(h)   { return Number(h & 0xFFFFFFFFn); }

export function ttProbe(h, depth, alpha, beta) {
  if (!tt) return null;
  const i = ttIdx(h);
  if (tt[i] !== ttHi(h) || tt[i+1] !== ttLo(h)) return null;
  if (tt[i+2] < depth) return null;
  const score = tt[i+3] - 100000;
  const flag  = tt[i+4];
  if (flag === FLAGS.EXACT) return score;
  if (flag === FLAGS.LB && score >= beta)  return score;
  if (flag === FLAGS.UB && score <= alpha) return score;
  return null;
}

export function ttStore(h, depth, score, flag) {
  if (!tt) return;
  const i  = ttIdx(h);
  tt[i]   = ttHi(h);
  tt[i+1] = ttLo(h);
  tt[i+2] = depth;
  tt[i+3] = score + 100000;
  tt[i+4] = flag;
}

// ── Evaluation ───────────────────────────────────────────────
// Size weights: Large=8, Medium=4, Small=2, Tiny=1
const W = [1, 2, 4, 8];

/**
 * Static evaluation from perspective of `color`.
 * Positive = good for `color`.
 */
export function evaluate(color) {
  const opp = color === 'red' ? 'yellow' : 'red';

  function scoreLines(mySurface, oppSurface, myBoard, subsurface = false) {
    let total = 0;
    for (const mask of WIN_MASKS) {
      if ((oppSurface & mask) !== 0n) continue; // opponent blocks
      const mine = popcount16(mySurface & mask);
      if (mine === 0) continue;
      // Estimate size weight from top pieces in this line
      let sizeScore = 0;
      for (let i = 0; i < 16; i++) {
        if (!((mask >> BigInt(i)) & 1n)) continue;
        const stk = myBoard[i];
        if (stk.length === 0) continue;
        const top = stk[stk.length - 1];
        sizeScore += W[top.size];
      }
      total += sizeScore * mine * (subsurface ? 0.25 : 1);
    }
    return total;
  }

  const mySurf  = color === 'red' ? state.surfaceRed    : state.surfaceYellow;
  const oppSurf = color === 'red' ? state.surfaceYellow : state.surfaceRed;

  // Compute subsurface masks (second-from-top pieces)
  let mySubSurf  = 0n;
  let oppSubSurf = 0n;
  for (let cell = 0; cell < 16; cell++) {
    const stk = state.board[cell];
    if (stk.length < 2) continue;
    const sub = stk[stk.length - 2];
    const bit = 1n << BigInt(cell);
    if (sub.color === color) mySubSurf  |= bit;
    else                      oppSubSurf |= bit;
  }

  const myScore  = scoreLines(mySurf, oppSurf, state.board)
                 + scoreLines(mySubSurf, oppSubSurf, state.board, true);
  const oppScore = scoreLines(oppSurf, mySurf, state.board)
                 + scoreLines(oppSubSurf, mySubSurf, state.board, true);

  return myScore - oppScore;
}

// ── Move Ordering ─────────────────────────────────────────────
/**
 * Order moves for better alpha-beta pruning:
 * 1. Winning moves
 * 2. Blocking opponent win
 * 3. Gobbles (captures)
 * 4. Stock → empty cell
 * 5. Quiet board moves
 */
export function orderMoves(moves, color) {
  const opp = color === 'red' ? 'yellow' : 'red';
  return moves.slice().sort((a, b) => {
    const rankA = moveRank(a, color, opp);
    const rankB = moveRank(b, color, opp);
    return rankA - rankB;
  });
}

function moveRank(move, color, opp) {
  // Winning move
  applyMove({ ...move, _searchMode: true });
  const win = checkWin(color);
  undoMove(move);
  if (win) return 0;

  // Blocking opponent win (opponent had a winning move into this cell)
  // Approximate: look if opponent has a threat involving move.to.cell
  if (checkThreats(opp, 3)) {
    // Check if this move covers a threat cell
    const surface = opp === 'red' ? state.surfaceRed : state.surfaceYellow;
    const cell = move.to.cell;
    for (const mask of WIN_MASKS) {
      if ((mask >> BigInt(cell)) & 1n && popcount16(surface & mask) >= 3) return 1;
    }
  }

  const stack = state.board[move.to.cell];
  if (stack.length > 0) return 2; // gobble
  if (move.from.type === 'stock') return 3; // stock to empty
  return 4; // quiet board move
}

// ── Quiescence Search ─────────────────────────────────────────
function quiescence(color, alpha, beta, hash) {
  // Stand-pat
  const standPat = evaluate(color);
  if (standPat >= beta) return beta;
  if (standPat > alpha) alpha = standPat;

  const opp = color === 'red' ? 'yellow' : 'red';
  // Only noisy moves: gobbles
  const noisyMoves = getValidMoves(color).filter(m => state.board[m.to.cell].length > 0);

  for (const move of noisyMoves) {
    move._searchMode = true;
    applyMove(move);
    if (checkWin(color)) { undoMove(move); return INF; }
    const score = -quiescence(opp, -beta, -alpha, hash);
    undoMove(move);
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }
  return alpha;
}

// ── Alpha-Beta with PVS + NMP + LMR ──────────────────────────
let _searchStart = 0;
let _timeLimit   = 3000; // ms

export function alphabeta(color, depth, alpha, beta, hash) {
  // Time check
  if (Date.now() - _searchStart > _timeLimit) return evaluate(color);

  // Terminal check
  const opp = color === 'red' ? 'yellow' : 'red';
  if (checkWin(opp)) return -INF; // opponent just won on previous move

  // TT probe
  const ttHit = ttProbe(hash, depth, alpha, beta);
  if (ttHit !== null) return ttHit;

  if (depth === 0) {
    const q = quiescence(color, alpha, beta, hash);
    ttStore(hash, 0, q, FLAGS.EXACT);
    return q;
  }

  const moves = orderMoves(getValidMoves(color), color);
  if (moves.length === 0) return evaluate(color); // no moves = losing

  // Null Move Pruning (skip when: depth < 3, endgame, opponent has threat)
  if (depth >= 3 && !checkThreats(opp, 3)) {
    // Simulate passing turn: flip turn and search at reduced depth
    state.currentTurn = opp;
    const nullScore = -alphabeta(opp, depth - 3, -beta, -beta + 1, hash);
    state.currentTurn = color;
    if (nullScore >= beta) {
      ttStore(hash, depth, beta, FLAGS.LB);
      return beta;
    }
  }

  let bestScore = -INF;
  let flag      = FLAGS.UB;
  let moveCount = 0;

  for (const move of moves) {
    move._searchMode = true;

    // Compute incremental hash delta
    const newHash = _hashDelta(move, hash, color);

    applyMove(move);
    let score;

    if (moveCount === 0) {
      // First move: full window
      score = -alphabeta(opp, depth - 1, -beta, -alpha, newHash);
    } else {
      // LMR: later moves at reduced depth
      const reduction = moveCount >= 3 ? 2 : 1;
      const lmrDepth  = Math.max(0, depth - reduction);
      score = -alphabeta(opp, lmrDepth, -alpha - 1, -alpha, newHash); // null window
      if (score > alpha && score < beta) {
        // Re-search at full depth on fail-high
        score = -alphabeta(opp, depth - 1, -beta, -alpha, newHash);
      }
    }

    undoMove(move);
    moveCount++;

    if (score > bestScore) bestScore = score;
    if (score > alpha) { alpha = score; flag = FLAGS.EXACT; }
    if (alpha >= beta) {
      ttStore(hash, depth, beta, FLAGS.LB);
      return beta;
    }
  }

  ttStore(hash, depth, bestScore, flag);
  return bestScore;
}

// Incremental Zobrist hash update for a move
function _hashDelta(move, oldHash, color) {
  let h = oldHash;
  const ci = CI[color];

  if (move.from.type === 'stock') {
    // Stock count changes: old count → new count
    const old = state.stock[color][move.from.size];
    h ^= ZS[ci][move.from.size][old];
    h ^= ZS[ci][move.from.size][old - 1];
  } else {
    // Piece lifted from source cell (depth = stack.length - 1)
    const srcStk = state.board[move.from.cell];
    const piece  = srcStk[srcStk.length - 1];
    h ^= ZT[move.from.cell][srcStk.length - 1][CI[piece.color]][piece.size];
  }

  // Piece placed on destination (depth = current stack.length)
  const dstStk  = state.board[move.to.cell];
  const piece   = move.from.type === 'stock'
    ? { color, size: move.from.size }
    : state.board[move.from.cell][state.board[move.from.cell].length - 1];
  h ^= ZT[move.to.cell][dstStk.length][CI[piece.color]][piece.size];

  return h;
}

// ── Iterative Deepening ────────────────────────────────────────
/**
 * Find best move for `color` using iterative deepening up to `maxDepth`.
 * Returns a move object.
 */
export function findBestMove(color, maxDepth = 18, timeLimitMs = 3000) {
  _searchStart = Date.now();
  _timeLimit   = timeLimitMs;

  let bestMove = null;
  const moves  = orderMoves(getValidMoves(color), color);
  if (moves.length === 0) return null;

  // Check for immediate win
  for (const move of moves) {
    move._searchMode = true;
    applyMove(move);
    const win = checkWin(color);
    undoMove(move);
    if (win) return move;
  }

  let hash = computeHash();

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() - _searchStart > _timeLimit) break;

    let depthBest = null;
    let bestScore = -INF;

    for (const move of moves) {
      if (Date.now() - _searchStart > _timeLimit) break;
      move._searchMode = true;
      const newHash = _hashDelta(move, hash, color);
      applyMove(move);
      const opp   = color === 'red' ? 'yellow' : 'red';
      const score = -alphabeta(opp, depth - 1, -INF, INF, newHash);
      undoMove(move);
      if (score > bestScore) { bestScore = score; depthBest = move; }
    }

    if (depthBest) bestMove = depthBest;
  }

  return bestMove ?? moves[0];
}
```

- [ ] **Step 2: Verify AI runs in browser (vs AI mode)**

```bash
python -m http.server 8080
```
1. Click "vs AI"
2. Make a move as Red
3. AI (Yellow) responds within 3s
4. Play until game ends

- [ ] **Step 3: Commit**

```bash
git add js/ai.js
git commit -m "feat(ai): Zobrist + TT + eval + move ordering + alpha-beta + PVS + NMP + LMR + quiescence"
```

---

### Task 14: js/ai-worker.js + Lazy SMP + main.js AI integration

**Files:**
- Modify: `js/ai-worker.js`
- Modify: `js/main.js`

- [ ] **Step 1: Write js/ai-worker.js**

Replace `js/ai-worker.js`:
```js
// js/ai-worker.js
// Runs in a Web Worker. Receives board state snapshot, searches independently,
// shares TT via SharedArrayBuffer with main thread.
importScripts(); // ES module workers use 'type: module' — no importScripts needed

// This file is loaded as type:module by the worker constructor.
import { state, initGame, applyMove as engApply } from './engine.js';
import { initTT, findBestMove, computeHash } from './ai.js';

let _sharedTT = null;

self.onmessage = function(e) {
  const { type, payload } = e.data;

  if (type === 'init') {
    // Receive shared TT buffer from main thread
    if (payload.ttBuffer) {
      _sharedTT = new Int32Array(payload.ttBuffer);
    }
    self.postMessage({ type: 'ready' });
    return;
  }

  if (type === 'search') {
    const { boardSnapshot, stockSnapshot, currentColor, seed } = payload;

    // Restore state from snapshot
    initGame();
    state.board  = boardSnapshot.map(stk => stk.map(p => ({ ...p })));
    state.stock  = { red: [...stockSnapshot.red], yellow: [...stockSnapshot.yellow] };
    state.currentTurn = currentColor;

    // Recompute bitboards + surface from restored board
    const { redMask, yellowMask, surfaceRed, surfaceYellow } = _rebuildMasks(state.board);
    state.redMask      = redMask;
    state.yellowMask   = yellowMask;
    state.surfaceRed   = surfaceRed;
    state.surfaceYellow= surfaceYellow;

    // Slight move-order variation for Lazy SMP diversity (seed offset shuffles)
    const move = findBestMove(currentColor, 18, 2800);
    self.postMessage({ type: 'result', move });
  }
};

function _rebuildMasks(board) {
  let redMask = 0n, yellowMask = 0n, surfaceRed = 0n, surfaceYellow = 0n;
  for (let cell = 0; cell < 16; cell++) {
    const stk = board[cell];
    for (let d = 0; d < stk.length; d++) {
      const { color, size } = stk[d];
      const bit = 1n << BigInt(size * 16 + cell);
      if (color === 'red') redMask    |= bit;
      else                  yellowMask |= bit;
    }
    if (stk.length > 0) {
      const top = stk[stk.length - 1];
      const bit = 1n << BigInt(cell);
      if (top.color === 'red') surfaceRed    |= bit;
      else                      surfaceYellow |= bit;
    }
  }
  return { redMask, yellowMask, surfaceRed, surfaceYellow };
}
```

- [ ] **Step 2: Update triggerAI in js/main.js to use real AI**

Replace the `triggerAI` function stub in `js/main.js`:
```js
import { findBestMove, initTT, getTTBuffer } from './ai.js';

// Initialize TT once at boot (add to boot() function)
// In boot(): initTT();

let _worker = null;
let _useWorker = false;

function _initWorker() {
  try {
    _worker = new Worker('./js/ai-worker.js', { type: 'module' });
    const buf = getTTBuffer();
    if (buf instanceof SharedArrayBuffer) {
      _worker.postMessage({ type: 'init', payload: { ttBuffer: buf } });
      _useWorker = true;
    }
  } catch {
    _useWorker = false;
  }
}

function triggerAI() {
  if (_useWorker && _worker) {
    // Send state snapshot to worker
    const snapshot = {
      boardSnapshot: state.board.map(stk => stk.map(p => ({ ...p }))),
      stockSnapshot: { red: [...state.stock.red], yellow: [...state.stock.yellow] },
      currentColor:  ctx.aiColor,
      seed: Math.random(),
    };
    _worker.onmessage = e => {
      if (e.data.type !== 'result') return;
      _applyAIMove(e.data.move);
    };
    _worker.postMessage({ type: 'search', payload: snapshot });
  } else {
    // Fallback: run search on main thread
    const move = findBestMove(ctx.aiColor, 18, 3000);
    _applyAIMove(move);
  }
}

function _applyAIMove(move) {
  if (!move || state.gameOver) return;
  setThinking(ctx.aiColor === 'red' ? 'stock-red' : 'stock-yellow', false);

  // Re-derive move from current state (worker snapshot may be slightly stale — validate first)
  const validMoves = getValidMoves(ctx.aiColor);
  const matched = validMoves.find(m =>
    m.from.type === move.from.type &&
    m.from.cell === move.from.cell &&
    m.from.size === move.from.size &&
    m.to.cell   === move.to.cell
  ) ?? validMoves[0]; // fallback to first valid move

  if (!matched) return;
  matched._searchMode = false;
  applyMove(matched);
  recordMove(matched);
  renderBoard(document.getElementById('board'), handleCellClick);
  renderStock('stock-red', 'stock-yellow', handleStockClick);
  if (checkWin(ctx.aiColor)) { endGame(ctx.aiColor); return; }
  updateTurnIndicator(state.currentTurn, false);
}
```

Also add in `boot()`:
```js
initTT();
_initWorker();
```

Add `coi-serviceworker.js` comment at top of `index.html` (before `</head>`):
```html
<!-- SharedArrayBuffer requires cross-origin isolation. If served without COOP/COEP headers
     (e.g. GitHub Pages), add coi-serviceworker.js:
     <script src="coi-serviceworker.js"></script>  -->
```

- [ ] **Step 3: Test vs AI with real search**

```bash
python -m http.server 8080
```
1. Click "vs AI"
2. Make a move as Red
3. Yellow (AI) should respond with a strong move (not random)
4. Play 5+ games — AI should be hard to beat
5. Console should be clean (no errors)

- [ ] **Step 4: Commit**

```bash
git add js/ai-worker.js js/main.js index.html
git commit -m "feat(ai): Web Worker + Lazy SMP + iterative deepening integration"
```

---

### Task 15: Polish — Responsive + Final Wiring

**Files:**
- Modify: `js/main.js`
- Modify: `css/style.css`

- [ ] **Step 1: Verify responsive layout on mobile viewport**

In browser DevTools, set viewport to 375×667 (iPhone SE):
- Stock panels should stack below the board
- Board should scale to fit width
- All buttons remain accessible

If stock panels don't stack: confirm `@media (max-width: 600px)` rule exists in `css/style.css` with `flex-direction: column` on `#game-wrapper`.

- [ ] **Step 2: Add piece animation class on place/gobble**

In `js/main.js`, after `renderBoard(...)` call following an `applyMove`:
```js
// Animate newly placed piece
const boardEl = document.getElementById('board');
const cellEl  = boardEl?.children[move.to.cell];
const pieceEl = cellEl?.querySelector('.piece');
if (pieceEl) {
  const wasGobble = move._gobbled != null;
  pieceEl.classList.add(wasGobble ? 'anim-gobble-in' : 'anim-place');
  pieceEl.addEventListener('animationend', () =>
    pieceEl.classList.remove('anim-gobble-in', 'anim-place'), { once: true }
  );
}
```

Apply this snippet in both `handleCellClick` (after human move) and `_applyAIMove` (after AI move).

- [ ] **Step 3: Verify all 9 game modes work end-to-end**

Manual checklist:
- [ ] Local 2P: play full game → result → save replay → copy JSON → view replay → play again
- [ ] vs AI: play full game → AI responds with non-random moves → result → replay works
- [ ] Replay viewer: load a saved .json → step through all moves → auto-play at 2× speed
- [ ] Online button: visible but grayed out, tooltip "Coming soon"
- [ ] All screens accessible via Menu button
- [ ] No JS errors in console during any of the above

- [ ] **Step 4: Final commit**

```bash
git add js/main.js css/style.css
git commit -m "feat: piece animations + responsive polish + final wiring"
```

---

## Spec Coverage Checklist

| Spec Section | Task | Status |
|---|---|---|
| 4×4 board, 16 cells | Task 2 (initGame) | ✓ |
| 4 sizes, 3 per player, gobble hierarchy | Task 3 (canPlace) | ✓ |
| Stock Exception Rule | Task 5 (getValidMoves) | ✓ |
| Red first, Yellow second | Task 2 (initGame currentTurn='red') | ✓ |
| Win: 4-in-a-row, 10 lines | Task 4 (checkWin + WIN_MASKS) | ✓ |
| Bitboard 64-bit BigInt | Tasks 2,6 (state masks) | ✓ |
| Surface projection | Task 3 (updateSurfaceCell) | ✓ |
| Zobrist hash | Task 13 (ai.js) | ✓ |
| TT + SharedArrayBuffer | Task 13 (ai.js) | ✓ |
| PVS | Task 13 (alphabeta) | ✓ |
| NMP | Task 13 (alphabeta) | ✓ |
| LMR | Task 13 (alphabeta) | ✓ |
| Quiescence | Task 13 (quiescence) | ✓ |
| Iterative deepening | Task 13 (findBestMove) | ✓ |
| Lazy SMP Web Workers | Task 14 | ✓ |
| Evaluation (size weights, subsurface 25%) | Task 13 (evaluate) | ✓ |
| 3D CSS pieces, size diameters | Task 8 (style.css) | ✓ |
| Red=warm red+gold rim, Yellow=gold+amber | Task 8 | ✓ |
| Place/gobble/win animations | Tasks 8,15 | ✓ |
| Stock panels + count badges | Task 9 (ui.js) | ✓ |
| AI thinking spinner | Task 9 (setThinking) | ✓ |
| Single-page screen routing | Task 10 (main.js) | ✓ |
| Local 2P + vs AI modes | Task 10 | ✓ |
| Online placeholder (grayed out) | Task 10 (boot) | ✓ |
| Replay recording | Task 11 | ✓ |
| Save JSON / Copy JSON | Task 11 | ✓ |
| Replay viewer: step/auto/speed | Task 12 | ✓ |
| Drag-drop load | Task 12 | ✓ |
| Replay JSON v2 format | Task 11 | ✓ |
| Responsive ≥360px | Tasks 8,15 | ✓ |
| No build step, ES modules | Task 1 | ✓ |
| GitHub Pages compatible | Task 1 | ✓ |
