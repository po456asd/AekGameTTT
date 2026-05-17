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

// Additional mask coverage (rows 1-2, cols 1-2)
assert.equal(WIN_MASKS[1], 0x00F0n, 'row 1 mask = 0x00F0');
assert.equal(WIN_MASKS[2], 0x0F00n, 'row 2 mask = 0x0F00');
assert.equal(WIN_MASKS[5], 0x2222n, 'col 1 mask = 0x2222');
assert.equal(WIN_MASKS[6], 0x4444n, 'col 2 mask = 0x4444');

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
assert.deepEqual(state.moveLog, [], 'moveLog empty after initGame');
assert.ok(typeof state.gameStartTime === 'number' && state.gameStartTime > 0, 'gameStartTime set');

console.log('✓ Task 2 passed');

import { canPlace, updateSurfaceCell, popcount16 } from '../js/engine.js';

// popcount16
assert.equal(popcount16(0x000Fn), 4, 'row 0 mask has 4 bits');
assert.equal(popcount16(0x0000n), 0, 'zero has 0 bits');
assert.equal(popcount16(0x8421n), 4, 'diag1 mask has 4 bits');
assert.equal(popcount16(0xFFFFn),  16, 'full 16-bit set');
assert.equal(popcount16(0x8000n),   1, 'high bit only');
assert.equal(popcount16(0x1FFFFn), 16, 'bits above 15 are truncated');

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
